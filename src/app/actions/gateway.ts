'use server'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAdmin, requireUser } from '@/lib/auth'
import { getGateway, gatewayStatus, gatewaySend, wahaStart, wahaQr, wahaLogout, type GwStatus } from '@/lib/wagateway'
import { waNumber } from '@/lib/whatsapp'
import type { FormState } from './auth'

async function put(key: string, value: string) {
  await sql`insert into app_settings (key, value) values (${'gw_' + key}, ${value}) on conflict (key) do update set value = excluded.value`
}

export async function saveGateway(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin()
  const provider = String(fd.get('provider') ?? 'none')
  if (!['none', 'waha', 'fonnte'].includes(provider)) return { error: 'Choose a gateway' }
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
  return st.state === 'qr' && g.provider === 'waha' ? { ...st, qr: await wahaQr(g) } : st
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
  const r = await gatewaySend(await getGateway(), n, `Test message from HIJRAA WELLNESS (sent by ${me.name}).`)
  return r.ok ? { ok: `Test message sent to +${n}` } : { error: r.error }
}

/** Send one queued message through the gateway. The number comes from the patient record. */
export async function sendViaGateway(input: { patientId: string; kind: 'reminder' | 'blast'; message: string; appointmentId?: string; campaign?: string }) {
  const me = await requireUser()
  const [p] = await sql`select phone from patients where id = ${input.patientId}`
  const n = waNumber(p?.phone)
  if (!n) return { ok: false, error: 'No usable phone number' }
  const r = await gatewaySend(await getGateway(), n, input.message)
  if (r.ok) {
    await sql`insert into message_logs (patient_id, appointment_id, kind, campaign, message, sent_by)
      values (${input.patientId}, ${input.appointmentId ?? null}, ${input.kind}, ${input.campaign ?? null}, ${input.message.slice(0, 4000)}, ${me.id})`
    if (input.appointmentId) await sql`update appointments set reminder_sent_at = now() where id = ${input.appointmentId}`
  }
  return r
}
