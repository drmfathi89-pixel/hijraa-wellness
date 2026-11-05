import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { sql } from '@/lib/db'
import { getPatient, type Treatment, type Appointment } from '@/lib/queries'
import { requireUser, isAdmin } from '@/lib/auth'
import { calcAge, fmtDate, fmtDateTime } from '@/lib/utils'
import { type Encounter, diagnosisLine } from '@/lib/types'
import { Info, StatusBadge } from '@/components/ui'
import ConfirmButton from '@/components/ConfirmButton'
import { deletePatient } from '@/app/actions/patients'

export default async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await requireUser()
  const p = await getPatient(id)
  if (!p) return null
  const [recent, active, upcoming, [counts]] = await Promise.all([
    sql<Encounter[]>`select * from encounters where patient_id=${id} order by encounter_at desc limit 3`,
    sql<Treatment[]>`select * from treatments where patient_id=${id} and status='active' order by created_at desc limit 10`,
    sql<Appointment[]>`select * from appointments where patient_id=${id} and status='scheduled' and scheduled_at >= now() - interval '1 day' order by scheduled_at limit 3`,
    sql`select (select count(*)::int from encounters where patient_id=${id}) as enc,
               (select count(*)::int from past_records where patient_id=${id}) as past,
               (select count(*)::int from documents where patient_id=${id}) as docs`,
  ])
  const dx = recent.map((e) => ({ id: e.id, at: e.encounter_at, text: diagnosisLine(e) })).filter((x) => x.text)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="card card-pad">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h-section">Patient biodata</h2>
            <Link href={`/patients/${id}/edit`} className="btn-secondary btn-sm"><Pencil size={14} /> Edit</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-3"><Info label="Name" value={p.name} /></div>
            <Info label="IC / Passport" value={<span className="font-mono">{p.ic}</span>} />
            <Info label="Gender" value={p.gender} />
            <Info label="Date of birth" value={fmtDate(p.dob)} />
            <Info label="Age" value={calcAge(p.dob)} />
            <Info label="Phone" value={p.phone} />
            <div className="col-span-2 sm:col-span-3"><Info label="Address" value={p.address} /></div>
          </div>
        </section>


        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h-section">Recent encounters</h2>
            <Link href={`/patients/${id}/encounters`} className="text-sm font-semibold text-brand-700">View all ({counts.enc})</Link>
          </div>
          {recent.length === 0 ? <p className="text-sm text-slate-400">No encounters yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {recent.map((e) => (
                <li key={e.id}>
                  <Link href={`/patients/${id}/encounters/${e.id}`} className="block py-2.5">
                    <div className="flex items-center gap-2 text-sm"><span className="font-semibold">{fmtDateTime(e.encounter_at)}</span><StatusBadge status={e.status} /></div>
                    <div className="truncate text-sm text-slate-600">{e.chief_complaint || '-'}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="card card-pad">
          <h2 className="h-section mb-3">Recent diagnoses</h2>
          {dx.length === 0 ? <p className="text-sm text-slate-400">None recorded.</p> : (
            <ul className="space-y-2 text-sm">{dx.map((d) => <li key={d.id}><Link href={`/patients/${id}/encounters/${d.id}`} className="block"><span className="text-xs text-slate-400">{fmtDate(d.at)}</span><span className="block font-medium text-slate-800">{d.text}</span></Link></li>)}</ul>
          )}
        </section>
        <section className="card card-pad">
          <h2 className="h-section mb-3">Active treatment</h2>
          {active.length === 0 ? <p className="text-sm text-slate-400">None.</p> : (
            <ul className="space-y-1.5 text-sm">{active.map((t) => <li key={t.id}><span className="font-semibold">{t.name}</span> <span className="text-slate-500">{[t.dose, t.frequency].filter(Boolean).join(' ')}</span></li>)}</ul>
          )}
        </section>
        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h-section">Upcoming appointments</h2>
            <Link href={`/patients/${id}/management`} className="text-sm font-semibold text-brand-700">Manage</Link>
          </div>
          {upcoming.length === 0 ? <p className="text-sm text-slate-400">None scheduled.</p> : (
            <ul className="space-y-2 text-sm">{upcoming.map((a) => <li key={a.id}><div className="font-semibold">{fmtDateTime(a.scheduled_at)}</div><div className="text-slate-500">{a.reason}</div></li>)}</ul>
          )}
        </section>
        <section className="card card-pad grid grid-cols-3 gap-2 text-center">
          <Link href={`/patients/${id}/encounters`}><div className="text-2xl font-extrabold text-brand-700">{counts.enc}</div><div className="text-xs text-slate-500">Encounters</div></Link>
          <Link href={`/patients/${id}/history`}><div className="text-2xl font-extrabold text-brand-700">{counts.past}</div><div className="text-xs text-slate-500">Past records</div></Link>
          <Link href={`/patients/${id}/files`}><div className="text-2xl font-extrabold text-brand-700">{counts.docs}</div><div className="text-xs text-slate-500">Files</div></Link>
        </section>
        {isAdmin(me) && (
          <ConfirmButton action={deletePatient.bind(null, id)} message={`Delete ${p.name} and ALL their records permanently?`} className="btn-danger w-full"><Trash2 size={16} /> Delete patient</ConfirmButton>
        )}
      </div>
    </div>
  )
}
