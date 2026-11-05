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
  // month grid (Monday-first), padded to whole weeks
  const first = `${date.slice(0, 7)}-01`
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
  const gridStart = shift(first, -lead)
  const nextMonth = (() => { const x = new Date(`${first}T00:00:00Z`); x.setUTCMonth(x.getUTCMonth() + 1); return x.toISOString().slice(0, 10) })()
  const prevMonth = (() => { const x = new Date(`${first}T00:00:00Z`); x.setUTCMonth(x.getUTCMonth() - 1); return x.toISOString().slice(0, 10) })()
  const daysInGrid = Math.ceil((lead + (Date.parse(nextMonth) - Date.parse(first)) / 864e5) / 7) * 7
  const grid = Array.from({ length: daysInGrid }, (_, i) => shift(gridStart, i))
  const [list, counts, upcoming] = await Promise.all([
    sql<Appointment[]>`select a.*, p.name as patient_name, p.ic as patient_ic, p.phone as patient_phone from appointments a join patients p on p.id = a.patient_id
      where (a.scheduled_at at time zone ${TZ})::date = ${date}::date order by a.scheduled_at`,
    sql<{ day: string; n: number; names: string[] }[]>`
      select to_char((a.scheduled_at at time zone ${TZ})::date, 'YYYY-MM-DD') as day, count(*)::int as n,
        (array_agg(split_part(p.name, ' ', 1) order by a.scheduled_at))[1:3] as names
      from appointments a join patients p on p.id = a.patient_id
      where a.status <> 'cancelled' and (a.scheduled_at at time zone ${TZ})::date between ${grid[0]}::date and ${grid[grid.length - 1]}::date group by 1`,
    sql<Appointment[]>`select a.*, p.name as patient_name, p.ic as patient_ic, p.phone as patient_phone from appointments a join patients p on p.id = a.patient_id
      where a.status = 'scheduled' and (a.scheduled_at at time zone ${TZ})::date between ${today}::date and ${today}::date + 30
      order by a.scheduled_at limit 100`,
  ])
  const cmap = Object.fromEntries(counts.map((c) => [c.day, c]))
  const monthLabel = new Date(`${first}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const monthTotal = counts.filter((c) => c.day.startsWith(date.slice(0, 7))).reduce((t, c) => t + c.n, 0)
  const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <>
      <PageHeader title="Appointments" subtitle={label} actions={date !== today && <Link href="/appointments" className="btn-secondary btn-sm">Today</Link>} />
      <div className="card mb-4 p-2 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <Link href={`/appointments?d=${prevMonth}`} className="btn-ghost p-2" aria-label="Previous month"><ChevronLeft size={18} /></Link>
          <div className="text-center">
            <div className="text-base font-bold text-slate-900">{monthLabel}</div>
            <div className="text-xs text-slate-500">{monthTotal} appointment{monthTotal === 1 ? '' : 's'}</div>
          </div>
          <Link href={`/appointments?d=${nextMonth}`} className="btn-ghost p-2" aria-label="Next month"><ChevronRight size={18} /></Link>
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => <div key={w} className="bg-slate-50 py-1.5 text-center text-[11px] font-semibold uppercase text-slate-500">{w}</div>)}
          {grid.map((g) => {
            const c = cmap[g]
            const inMonth = g.slice(0, 7) === date.slice(0, 7)
            const active = g === date
            return (
              <Link key={g} href={`/appointments?d=${g}`} aria-label={`${g}: ${c?.n ?? 0} appointment(s)`}
                className={`flex min-h-14 flex-col gap-0.5 p-1 text-left sm:min-h-24 sm:p-1.5 ${active ? 'bg-brand-50 ring-2 ring-inset ring-brand-600' : 'bg-white hover:bg-slate-50'} ${inMonth ? '' : 'opacity-40'}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${g === today ? 'bg-brand-600 text-white' : 'text-slate-700'}`}>{Number(g.slice(8))}</span>
                {c && (
                  <>
                    <span className="rounded bg-brand-600 px-1 text-center text-[10px] font-bold leading-4 text-white sm:hidden">{c.n}</span>
                    <span className="hidden flex-col gap-0.5 sm:flex">
                      {c.names.map((n, i) => <span key={i} className="truncate rounded bg-brand-50 px-1 text-[11px] leading-4 text-brand-800">{n}</span>)}
                      {c.n > c.names.length && <span className="text-[11px] font-semibold text-slate-500">+{c.n - c.names.length} more</span>}
                    </span>
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </div>
      <h2 className="h-section mb-2">{label}</h2>

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
