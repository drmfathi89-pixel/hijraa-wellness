'use server'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAdmin, requireUser } from '@/lib/auth'
import { randomBytes, createHash } from 'node:crypto'
import { getGateway, gatewayStatus, gatewaySend, wahaStart, wahaQr, wahaLogout, deliver, type GwStatus } from '@/lib/wagateway'
import { waNumber } from '@/lib/whatsapp'
import type { FormState } from './auth'

async function put(key: string, value: string) {
  await sql`insert into app_settings (key, value) values (${'gw_' + key}, ${value}) on conflict (key) do update set value = excluded.value`
}

export async function saveGateway(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin()
  const provider = String(fd.get('provider') ?? 'none')
  if (!['none', 'waha', 'fonnte', 'pc'].includes(provider)) return { error: 'Choose a gateway' }
  const url = String(fd.get('url') ?? '').trim().replace(/\/+$/, '')
  if (provider === 'waha' && !/^https?:\/\/\S+$/.test(url)) return { error: 'Enter the WAHA server address, e.g. https://waha.example.com' }
  await put('provider', provider)
  await put('url', url)
  await put('session', String(fd.get('session') ?? '').trim() || 'default')
  await put('auto', fd.get('auto') ? 'on' : 'off')
  const key = String(fd.get('key') ?? '').trim()
  if (key) await put('key', key) // blank keeps the saved key
  revalidatePath('/messages')
  return { ok: 'Gateway settings saved' }
}

export async function gwCheck(): Promise<GwStatus & { qr?: string | null }> {
  await requireAdmin()
  const g = await getGateway()
  const st = await gatewayStatus(g)
  return st.state === 'qr' && g.provider === 'waha' ? { ...st, qr: await wahaQr(g) } : st // PC status already carries its QR
}

export async function gwConnect(): Promise<GwStatus & { qr?: string | null }> {
  await requireAdmin()
  const g = await getGateway()
  if (g.provider !== 'waha') return gatewayStatus(g)
  const st = await gatewayStatus(g)
  if (st.state === 'disconnected') await wahaStart(g)
  return gwCheck()
}

export async function gwLogout() {
  await requireAdmin()
  const g = await getGateway()
  if (g.provider === 'waha') await wahaLogout(g)
}

export async function gwTest(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin()
  const n = waNumber(String(fd.get('phone') ?? ''))
  if (!n) return { error: 'Enter a valid phone number' }
  const g = await getGateway()
  const text = `Test message from HIJRAA WELLNESS (sent by ${me.name}).`
  if (g.provider === 'pc') {
    await sql`insert into wa_outbox (kind, number, message, sent_by) values ('test', ${n}, ${text}, ${me.id})`
    return { ok: `Test message queued for +${n}. The PC sends it within a few seconds.` }
  }
  const r = await gatewaySend(g, n, text)
  return r.ok ? { ok: `Test message sent to +${n}` } : { error: r.error }
}

/** Send one message through the gateway (PC gateway: queue it). The number comes from the patient record. */
export async function sendViaGateway(input: { patientId: string; kind: 'reminder' | 'blast'; message: string; appointmentId?: string; campaign?: string }) {
  const me = await requireUser()
  const [p] = await sql`select phone from patients where id = ${input.patientId}`
  const n = waNumber(p?.phone)
  if (!n) return { ok: false, error: 'No usable phone number' }
  return deliver(await getGateway(), { ...input, number: n, sentBy: me.id })
}

/** PC gateway: create a new token (shown once). The old token stops working. */
export async function createPcToken(): Promise<string> {
  await requireAdmin()
  const token = 'hwpc_' + randomBytes(24).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  await put('pc_token_hash', hash)
  return token
}

/** PC gateway: ask the PC to unlink WhatsApp on its next sync. */
export async function pcLogout() {
  await requireAdmin()
  await put('pc_cmd', 'logout')
}

export async function outboxSummary() {
  await requireAdmin()
  const [c] = await sql<{ queued: number; sent_today: number; failed: number }[]>`select
    count(*) filter (where status in ('queued','sending'))::int as queued,
    count(*) filter (where status = 'sent' and sent_at > now() - interval '24 hours')::int as sent_today,
    count(*) filter (where status = 'failed' and created_at > now() - interval '7 days')::int as failed
    from wa_outbox`
  const recent = await sql<{ number: string; error: string | null; created_at: Date }[]>`select number, error, created_at from wa_outbox where status = 'failed' order by created_at desc limit 5`
  return { ...c, recentFailures: recent.map((r) => ({ number: r.number, error: r.error ?? 'failed', at: r.created_at.toISOString() })) }
}
