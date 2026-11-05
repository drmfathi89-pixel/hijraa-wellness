import 'server-only'
import { sql } from './db'

// WhatsApp gateway: sends from the clinic's own WhatsApp number, linked by QR like WhatsApp Web.
//  - waha:   WAHA (github.com/devlikeapro/waha), self-hosted; QR is shown inside this app.
//  - fonnte: fonnte.com, hosted; the phone is linked on Fonnte's dashboard.
//  - pc:     the clinic PC runs HIJRAA PC Gateway (pc-gateway/), which links WhatsApp by QR and
//            polls /api/pc-gateway/sync to collect queued messages. Nothing needs to reach the PC.
export type Provider = 'none' | 'waha' | 'fonnte' | 'pc'
export type Gateway = { provider: Provider; url: string; key: string; session: string; autoReminders: boolean }
export type GwStatus = { state: 'connected' | 'qr' | 'starting' | 'disconnected' | 'not_configured' | 'error'; me?: string; detail?: string }

export async function getGateway(): Promise<Gateway> {
  const rows = await sql<{ key: string; value: string }[]>`select key, value from app_settings where key like 'gw_%'`
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(3), r.value]))
  const provider = (['waha', 'fonnte', 'pc'].includes(m.provider) ? m.provider : 'none') as Provider
  return { provider, url: (m.url ?? '').replace(/\/+$/, ''), key: provider === 'pc' ? (m.pc_token_hash ?? '') : (m.key ?? ''), session: m.session || 'default', autoReminders: m.auto === 'on' }
}

async function call(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), init.timeoutMs ?? 15000)
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal, cache: 'no-store' })
    const text = await res.text()
    let json: unknown = null; try { json = JSON.parse(text) } catch {}
    return { ok: res.ok, status: res.status, json: json as Record<string, unknown> | null, text }
  } finally { clearTimeout(t) }
}

const wahaHeaders = (g: Gateway) => ({ 'X-Api-Key': g.key, 'Content-Type': 'application/json', Accept: 'application/json' })

export async function gatewayStatus(g?: Gateway): Promise<GwStatus> {
  g ??= await getGateway()
  if (g.provider === 'pc') return pcStatus()
  if (g.provider === 'none' || !g.key || (g.provider === 'waha' && !g.url)) return { state: 'not_configured' }
  try {
    if (g.provider === 'waha') {
      const r = await call(`${g.url}/api/sessions/${encodeURIComponent(g.session)}`, { headers: wahaHeaders(g) })
      if (r.status === 404) return { state: 'disconnected', detail: 'Session not started' }
      if (r.status === 401 || r.status === 403) return { state: 'error', detail: 'API key rejected by the gateway' }
      if (!r.ok) return { state: 'error', detail: `Gateway answered ${r.status}` }
      const s = String(r.json?.status ?? '')
      const me = (r.json?.me as { id?: string; pushName?: string } | null) ?? null
      if (s === 'WORKING') return { state: 'connected', me: [me?.pushName, me?.id?.split('@')[0]].filter(Boolean).join(' · ') }
      if (s === 'SCAN_QR_CODE') return { state: 'qr' }
      if (s === 'STARTING') return { state: 'starting' }
      return { state: 'disconnected', detail: s || 'Stopped' }
    }
    const r = await call('https://api.fonnte.com/device', { method: 'POST', headers: { Authorization: g.key } })
    const j = r.json ?? {}
    if (j.status === false) return { state: 'error', detail: String(j.reason ?? 'Token rejected') }
    return String(j.device_status ?? '').startsWith('connect') ? { state: 'connected', me: String(j.device ?? '') } : { state: 'disconnected', detail: 'Phone not linked on Fonnte' }
  } catch (e) {
    return { state: 'error', detail: e instanceof Error && e.name === 'AbortError' ? 'Gateway did not respond' : 'Cannot reach the gateway' }
  }
}

/** WAHA: start the session (if needed) so it produces a QR code. */
export async function wahaStart(g: Gateway) {
  const h = wahaHeaders(g)
  const r = await call(`${g.url}/api/sessions/${encodeURIComponent(g.session)}/start`, { method: 'POST', headers: h })
  if (r.status === 404) await call(`${g.url}/api/sessions`, { method: 'POST', headers: h, body: JSON.stringify({ name: g.session, start: true }) })
}

/** WAHA: QR code as a data: URL, or null. */
export async function wahaQr(g: Gateway): Promise<string | null> {
  const r = await call(`${g.url}/api/${encodeURIComponent(g.session)}/auth/qr?format=image`, { headers: wahaHeaders(g) })
  const data = r.json?.data, mime = r.json?.mimetype
  return r.ok && typeof data === 'string' ? `data:${typeof mime === 'string' ? mime : 'image/png'};base64,${data}` : null
}

export async function wahaLogout(g: Gateway) {
  await call(`${g.url}/api/sessions/${encodeURIComponent(g.session)}/logout`, { method: 'POST', headers: wahaHeaders(g) })
}

/** Send one text. `number` is international digits, e.g. 60123456789. */
export async function gatewaySend(g: Gateway, number: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (g.provider === 'waha') {
      const r = await call(`${g.url}/api/sendText`, { method: 'POST', headers: wahaHeaders(g), body: JSON.stringify({ session: g.session, chatId: `${number}@c.us`, text }) })
      return r.ok ? { ok: true } : { ok: false, error: `Gateway answered ${r.status}${r.text ? `: ${r.text.slice(0, 120)}` : ''}` }
    }
    if (g.provider === 'pc') return { ok: false, error: 'PC gateway messages are queued with deliver()' }
    if (g.provider === 'fonnte') {
      const body = new URLSearchParams({ target: number, message: text })
      const r = await call('https://api.fonnte.com/send', { method: 'POST', headers: { Authorization: g.key }, body })
      return r.json?.status === true ? { ok: true } : { ok: false, error: String(r.json?.reason ?? `Gateway answered ${r.status}`) }
    }
    return { ok: false, error: 'No gateway configured' }
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === 'AbortError' ? 'Gateway did not respond' : 'Cannot reach the gateway' }
  }
}

// ---------- PC gateway ----------
export type PcState = { state: 'qr' | 'connected' | 'starting'; qr?: string | null; me?: string; seenAt: string; version?: string }

export async function pcStatus(): Promise<GwStatus & { qr?: string | null; seenAt?: string }> {
  const [row] = await sql<{ value: string }[]>`select value from app_settings where key = 'gw_pc_status'`
  const [tok] = await sql<{ value: string }[]>`select value from app_settings where key = 'gw_pc_token_hash'`
  if (!tok) return { state: 'not_configured', detail: 'Create a PC token below, then start HIJRAA PC Gateway on the clinic PC.' }
  if (!row) return { state: 'disconnected', detail: 'The PC gateway has not connected yet. Start it on the clinic PC.' }
  const s = JSON.parse(row.value) as PcState
  const ageSec = (Date.now() - new Date(s.seenAt).getTime()) / 1000
  if (ageSec > 60) return { state: 'disconnected', detail: `PC offline (last seen ${Math.round(ageSec / 60)} min ago). Messages wait in the queue until it is back.`, seenAt: s.seenAt }
  if (s.state === 'connected') return { state: 'connected', me: s.me, seenAt: s.seenAt }
  if (s.state === 'qr') return { state: 'qr', qr: s.qr ?? null, detail: 'PC is online and waiting for the phone to be linked.', seenAt: s.seenAt }
  return { state: 'starting', detail: 'PC gateway is starting WhatsApp…', seenAt: s.seenAt }
}

/**
 * Deliver one message and log it. PC gateway: queued in wa_outbox for the PC to send (logged when the
 * PC reports success). WAHA / Fonnte: sent now and logged.
 */
export async function deliver(g: Gateway, m: { number: string; message: string; patientId: string; appointmentId?: string | null; kind: 'reminder' | 'blast'; campaign?: string | null; sentBy?: string | null }): Promise<{ ok: boolean; queued?: boolean; error?: string }> {
  if (g.provider === 'pc') {
    if (m.appointmentId) {
      const [dup] = await sql`select 1 from wa_outbox where appointment_id = ${m.appointmentId} and status in ('queued','sending')`
      if (dup) return { ok: true, queued: true }
    }
    await sql`insert into wa_outbox (patient_id, appointment_id, kind, campaign, number, message, sent_by)
      values (${m.patientId}, ${m.appointmentId ?? null}, ${m.kind}, ${m.campaign ?? null}, ${m.number}, ${m.message.slice(0, 4000)}, ${m.sentBy ?? null})`
    return { ok: true, queued: true }
  }
  const r = await gatewaySend(g, m.number, m.message)
  if (r.ok) await logSent(m)
  return r
}

export async function logSent(m: { patientId: string; appointmentId?: string | null; kind: string; campaign?: string | null; message: string; sentBy?: string | null }) {
  await sql`insert into message_logs (patient_id, appointment_id, kind, campaign, message, sent_by)
    values (${m.patientId}, ${m.appointmentId ?? null}, ${m.kind}, ${m.campaign ?? null}, ${m.message.slice(0, 4000)}, ${m.sentBy ?? null})`
  if (m.appointmentId) await sql`update appointments set reminder_sent_at = now() where id = ${m.appointmentId}`
}
