import Link from 'next/link'
import { Suspense } from 'react'
import { Users, Stethoscope, CalendarDays, ClipboardEdit, ChevronRight } from 'lucide-react'
import { sql } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { fmtTime, fmtDateTime, TZ } from '@/lib/utils'
import SearchBox from '@/components/SearchBox'
import { StatusBadge } from '@/components/ui'
import PatientRow from '@/components/PatientRow'
import SalesPanel from '@/components/SalesPanel'
import { diagnosisLine } from '@/lib/types'
import { searchPatients } from '@/lib/queries'

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireUser()
  const { q = '' } = await searchParams
  const found = q.trim() ? await searchPatients(q, 8) : null
  const [[stats], today, open, recent] = await Promise.all([
    sql`select (select count(*)::int from patients) as patients,
      (select count(*)::int from encounters where (encounter_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date) as seen_today,
      (select count(*)::int from appointments where status='scheduled' and (scheduled_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date) as appts_today,
      (select count(*)::int from encounters where status='open') as open_enc`,
    sql`select a.id, a.scheduled_at, a.reason, a.status, a.patient_id, p.name from appointments a join patients p on p.id=a.patient_id
      where (a.scheduled_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date and a.status <> 'cancelled' order by a.scheduled_at`,
    sql`select e.id, e.patient_id, e.encounter_at, e.chief_complaint, p.name from encounters e join patients p on p.id=e.patient_id where e.status='open' order by e.encounter_at desc limit 10`,
    sql`select e.id, e.patient_id, e.encounter_at, e.diagnoses, e.diagnosis_notes, e.diagnosis_sensitive, p.name from encounters e join patients p on p.id=e.patient_id where e.status='closed' order by e.updated_at desc limit 6`,
  ])
  const hour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: TZ }))
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const tiles = [
    { label: 'Patients', value: stats.patients, icon: Users, href: '/patients' },
    { label: 'Seen today', value: stats.seen_today, icon: Stethoscope, href: '/patients' },
    { label: 'Appointments today', value: stats.appts_today, icon: CalendarDays, href: '/appointments' },
    { label: 'Open encounters', value: stats.open_enc, icon: ClipboardEdit, href: '#open' },
  ]
  return (
    <>
      <div className="mb-5">
        <p className="text-sm text-slate-500">{greet},</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{me.name}</h1>
      </div>
      <div className="mb-5"><Suspense><SearchBox placeholder="Find patient by name, IC or phone…" /></Suspense></div>
      {found && (
        <div className="card mb-5 divide-y divide-slate-100 overflow-hidden">
          {found.length === 0 ? <p className="p-4 text-sm text-slate-500">No patient found. <Link href="/patients/new" className="font-semibold text-brand-700">Register new patient</Link></p> : found.map((p) => <PatientRow key={p.id} p={p} />)}
        </div>
      )}
      {me.role === 'admin' && <SalesPanel />}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="card card-pad flex items-center gap-3 hover:border-brand-300">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon size={20} /></span>
            <div><div className="text-2xl font-extrabold leading-none">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between"><h2 className="h-section">Today&apos;s appointments</h2><Link href="/appointments" className="text-sm font-semibold text-brand-700">Calendar</Link></div>
          {today.length === 0 ? <p className="text-sm text-slate-400">No appointments today.</p> : (
            <ul className="divide-y divide-slate-100">
              {today.map((a) => (
                <li key={a.id}><Link href={`/patients/${a.patient_id}`} className="flex items-center gap-3 py-2.5">
                  <span className="w-16 text-sm font-bold text-brand-700">{fmtTime(a.scheduled_at)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{a.name}</span><span className="block truncate text-xs text-slate-500">{a.reason}</span></span>
                  <StatusBadge status={a.status} />
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section id="open" className="card card-pad">
          <h2 className="h-section mb-3">Open encounters</h2>
          {open.length === 0 ? <p className="text-sm text-slate-400">All encounters completed.</p> : (
            <ul className="divide-y divide-slate-100">
              {open.map((e) => (
                <li key={e.id}><Link href={`/patients/${e.patient_id}/encounters/${e.id}`} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{e.name}</span><span className="block truncate text-xs text-slate-500">{fmtDateTime(e.encounter_at)} · {e.chief_complaint || 'No complaint yet'}</span></span>
                  <ChevronRight size={18} className="text-slate-300" />
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section className="card card-pad lg:col-span-2">
          <h2 className="h-section mb-3">Recently completed</h2>
          {recent.length === 0 ? <p className="text-sm text-slate-400">Nothing yet.</p> : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {recent.map((e) => (
                <li key={e.id}><Link href={`/patients/${e.patient_id}/encounters/${e.id}`} className="block rounded-xl bg-slate-50 px-3 py-2 hover:bg-brand-50">
                  <div className="truncate font-semibold">{e.name}</div>
                  <div className="truncate text-xs text-slate-500">{fmtDateTime(e.encounter_at)}{diagnosisLine(e as never) ? ` · ${diagnosisLine(e as never)}` : ''}</div>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
