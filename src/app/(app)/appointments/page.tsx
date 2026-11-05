import Link from 'next/link'
import { ChevronLeft, ChevronRight, Phone } from 'lucide-react'
import { sql } from '@/lib/db'
import type { Appointment } from '@/lib/queries'
import { fmtTime, fmtDate, toLocalInput, todayLocal, TZ } from '@/lib/utils'
import { addAppointment, setAppointmentStatus } from '@/app/actions/management'
import { PageHeader, Empty, Field } from '@/components/ui'
import MiniForm from '@/components/MiniForm'
import StatusSelect from '@/components/StatusSelect'
import PatientPicker from '@/components/PatientPicker'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'Appointments' }

function shift(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async function Appointments({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  await requireUser()
  const { d } = await searchParams
  const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayLocal()
  const today = todayLocal()
  const week = Array.from({ length: 7 }, (_, i) => shift(date, i - 3))
  const [list, counts, upcoming] = await Promise.all([
    sql<Appointment[]>`select a.*, p.name as patient_name, p.ic as patient_ic, p.phone as patient_phone from appointments a join patients p on p.id = a.patient_id
      where (a.scheduled_at at time zone ${TZ})::date = ${date}::date order by a.scheduled_at`,
    sql<{ day: string; n: number }[]>`select to_char((scheduled_at at time zone ${TZ})::date, 'YYYY-MM-DD') as day, count(*)::int as n from appointments
      where status <> 'cancelled' and (scheduled_at at time zone ${TZ})::date between ${week[0]}::date and ${week[6]}::date group by 1`,
    sql<Appointment[]>`select a.*, p.name as patient_name, p.ic as patient_ic, p.phone as patient_phone from appointments a join patients p on p.id = a.patient_id
      where a.status = 'scheduled' and (a.scheduled_at at time zone ${TZ})::date between ${today}::date and ${today}::date + 30
      order by a.scheduled_at limit 100`,
  ])
  const cmap = Object.fromEntries(counts.map((c) => [c.day, c.n]))
  const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <>
      <PageHeader title="Appointments" subtitle={label} actions={date !== today && <Link href="/appointments" className="btn-secondary btn-sm">Today</Link>} />
      <div className="card mb-4 flex items-center gap-1 p-2">
        <Link href={`/appointments?d=${shift(date, -7)}`} className="btn-ghost p-2" aria-label="Previous week"><ChevronLeft size={18} /></Link>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map((w) => {
            const dt = new Date(`${w}T00:00:00Z`)
            const active = w === date
            return (
              <Link key={w} href={`/appointments?d=${w}`} className={`flex flex-col items-center rounded-xl py-1.5 text-xs ${active ? 'bg-brand-600 text-white' : w === today ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className="font-medium opacity-80">{dt.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}</span>
                <span className="text-base font-bold">{dt.getUTCDate()}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${cmap[w] ? (active ? 'bg-white' : 'bg-brand-500') : 'bg-transparent'}`} />
              </Link>
            )
          })}
        </div>
        <Link href={`/appointments?d=${shift(date, 7)}`} className="btn-ghost p-2" aria-label="Next week"><ChevronRight size={18} /></Link>
      </div>

      <div className="mb-4">
        <MiniForm action={addAppointment.bind(null, null)} label="Book appointment" submit="Book">
          <Field label="Patient" className="sm:col-span-2"><PatientPicker /></Field>
          <Field label="Date & time"><input type="datetime-local" name="scheduled_at" className="input" required defaultValue={`${date}T09:00`} /></Field>
          <Field label="Duration (min)"><input type="number" name="duration_min" className="input" defaultValue={15} /></Field>
          <Field label="Reason" className="sm:col-span-2"><input name="reason" className="input" /></Field>
        </MiniForm>
      </div>

      {list.length === 0 ? <Empty title="No appointments on this day" /> : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {list.map((a) => (
            <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${a.status === 'cancelled' ? 'opacity-50' : ''}`}>
              <div className="w-16 shrink-0 text-center"><div className="text-sm font-bold text-brand-700">{fmtTime(a.scheduled_at)}</div><div className="text-[11px] text-slate-400">{a.duration_min} min</div></div>
              <Link href={`/patients/${a.patient_id}/management`} className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5"><span className="truncate font-semibold">{a.patient_name}</span>{a.encounter_id && <FollowUpBadge />}</div>
                <div className="truncate text-xs text-slate-500">{a.patient_ic}{a.reason ? ` · ${a.reason}` : ''}</div>
              </Link>
              {a.patient_phone && <a href={`tel:${a.patient_phone.replace(/[^\d+]/g, '')}`} className="btn-ghost p-2 text-brand-700" aria-label="Call"><Phone size={16} /></a>}
              <StatusSelect value={a.status} options={['scheduled', 'completed', 'cancelled', 'no-show']} onChange={setAppointmentStatus.bind(null, a.id)} />
            </div>
          ))}
        </div>
      )}

      <h2 className="h-section mb-2 mt-6">Upcoming (next 30 days)</h2>
      {upcoming.length === 0 ? <Empty title="No upcoming appointments" /> : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {upcoming.map((a) => {
            const day = toLocalInput(a.scheduled_at).slice(0, 10)
            return (
              <Link key={a.id} href={`/appointments?d=${day}`} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 ${day === date ? 'bg-brand-50/60' : ''}`}>
                <div className="w-24 shrink-0 text-xs"><div className="font-bold text-slate-800">{fmtDate(a.scheduled_at)}</div><div className="text-brand-700">{fmtTime(a.scheduled_at)}</div></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="truncate text-sm font-semibold">{a.patient_name}</span>{a.encounter_id && <FollowUpBadge />}</div>
                  {a.reason && <div className="truncate text-xs text-slate-500">{a.reason}</div>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

function FollowUpBadge() {
  return <span className="badge shrink-0 bg-leaf/30 text-leaf-dark">Follow-up</span>
}
