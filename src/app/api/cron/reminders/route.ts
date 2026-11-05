// Daily job (vercel.json crons, 12:00 UTC = 8 pm Malaysia): WhatsApp reminders for tomorrow's appointments.
import { sql } from '@/lib/db'
import { TZ } from '@/lib/utils'
import { getGateway, deliver } from '@/lib/wagateway'
import { getTemplates } from '@/lib/settings'
import { waNumber, niceName, fill, apptWhen } from '@/lib/whatsapp'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const g = await getGateway()
  if (g.provider === 'none' || !g.key || !g.autoReminders) return Response.json({ skipped: 'Automatic reminders are off' })
  const tpl = await getTemplates()
  const rows = await sql<{ id: string; patient_id: string; scheduled_at: Date; name: string; phone: string | null }[]>`
    select a.id, a.patient_id, a.scheduled_at, p.name, p.phone from appointments a join patients p on p.id = a.patient_id
    where a.status = 'scheduled' and a.reminder_sent_at is null
      and (a.scheduled_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date + 1
    order by a.scheduled_at limit 80`

  const delay = Number(process.env.WA_SEND_DELAY_MS) || 3000
  const result = { sent: 0, failed: 0, noPhone: 0, errors: [] as string[] }
  for (const [k, r] of rows.entries()) {
    const n = waNumber(r.phone)
    if (!n) { result.noPhone++; continue }
    const w = apptWhen(r.scheduled_at)
    const message = fill(tpl.reminder, { name: niceName(r.name), date: w.date, time: w.time, clinic: tpl.clinic })
    const s = await deliver(g, { number: n, message, patientId: r.patient_id, appointmentId: r.id, kind: 'reminder' })
    if (s.ok) result.sent++
    else { result.failed++; if (result.errors.length < 5) result.errors.push(s.error ?? 'failed') }
    // PC gateway only queues (the PC paces sending); direct gateways need a pause between sends
    if (g.provider !== 'pc' && k < rows.length - 1) await new Promise((res) => setTimeout(res, delay))
  }
  return Response.json({ appointments: rows.length, ...result })
}
