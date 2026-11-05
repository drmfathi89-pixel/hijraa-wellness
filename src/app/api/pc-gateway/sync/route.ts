// Called every few seconds by HIJRAA PC Gateway on the clinic PC (pc-gateway/). Outbound from the PC only.
import { createHash } from 'node:crypto'
import { sql } from '@/lib/db'
import { getGateway, logSent } from '@/lib/wagateway'

export const dynamic = 'force-dynamic'

type Body = { state?: string; qr?: string | null; me?: string; version?: string; results?: { id: string; ok: boolean; error?: string }[] }

async function setting(key: string, value: string) {
  await sql`insert into app_settings (key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value`
}

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const [row] = await sql<{ value: string }[]>`select value from app_settings where key = 'gw_pc_token_hash'`
  if (!token || !row || createHash('sha256').update(token).digest('hex') !== row.value) return Response.json({ error: 'Invalid PC token' }, { status: 401 })

  const g = await getGateway()
  const body = (await req.json().catch(() => ({}))) as Body
  const state = body.state === 'connected' || body.state === 'qr' ? body.state : 'starting'
  const qr = typeof body.qr === 'string' && body.qr.startsWith('data:image/') && body.qr.length < 20000 ? body.qr : null
  await setting('gw_pc_status', JSON.stringify({ state, qr: state === 'qr' ? qr : null, me: String(body.me ?? '').slice(0, 80), version: String(body.version ?? '').slice(0, 20), seenAt: new Date().toISOString() }))

  // results of messages the PC tried to send
  for (const r of (body.results ?? []).slice(0, 50)) {
    if (typeof r?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(r.id)) continue
    const [m] = await sql<{ patient_id: string | null; appointment_id: string | null; kind: string; campaign: string | null; message: string; sent_by: string | null; status: string }[]>`
      update wa_outbox set status = ${r.ok ? 'sent' : 'failed'}, error = ${r.ok ? null : String(r.error ?? 'failed').slice(0, 300)}, sent_at = ${r.ok ? new Date().toISOString() : null}
      where id = ${r.id} and status = 'sending' returning patient_id, appointment_id, kind, campaign, message, sent_by, status`
    if (m && r.ok && m.patient_id) await logSent({ patientId: m.patient_id, appointmentId: m.appointment_id, kind: m.kind, campaign: m.campaign, message: m.message, sentBy: m.sent_by })
  }

  // one-off command for the PC (e.g. unlink WhatsApp)
  const [cmd] = await sql<{ value: string }[]>`delete from app_settings where key = 'gw_pc_cmd' returning value`

  // nothing to hand out unless the PC gateway is the active gateway and WhatsApp is linked
  if (g.provider !== 'pc' || state !== 'connected') return Response.json({ messages: [], command: cmd?.value ?? null })

  // drop stale work: reminders for appointments already past/cancelled, anything older than 3 days
  await sql`update wa_outbox o set status = 'failed', error = 'Expired: appointment already passed or no longer scheduled'
    from appointments a where o.appointment_id = a.id and o.status = 'queued' and (a.scheduled_at < now() or a.status <> 'scheduled')`
  await sql`update wa_outbox set status = 'failed', error = 'Expired: queued for more than 3 days' where status = 'queued' and created_at < now() - interval '3 days'`

  // hand out a few at a time; re-offer ones a PC claimed but never reported (e.g. it was switched off mid-send)
  const messages = await sql<{ id: string; number: string; message: string }[]>`
    update wa_outbox set status = 'sending', claimed_at = now(), attempts = attempts + 1
    where id in (
      select id from wa_outbox
      where (status = 'queued' or (status = 'sending' and claimed_at < now() - interval '5 minutes')) and attempts < 3
      order by created_at limit 5 for update skip locked)
    returning id, number, message`
  return Response.json({ messages, command: cmd?.value ?? null })
}
