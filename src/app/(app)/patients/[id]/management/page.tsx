import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { sql } from '@/lib/db'
import type { Treatment, Appointment } from '@/lib/queries'
import { diagnosisLine } from '@/lib/types'
import { fmtDate, fmtDateTime, toLocalInput } from '@/lib/utils'
import { addAppointment, addTreatment, setAppointmentStatus, setTreatmentStatus, deleteAppointment, deleteTreatment } from '@/app/actions/management'
import MiniForm from '@/components/MiniForm'
import StatusSelect from '@/components/StatusSelect'
import ConfirmButton from '@/components/ConfirmButton'
import { Field } from '@/components/ui'
import { requireUser } from '@/lib/auth'

export default async function Management({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const [plans, treatments, appts] = await Promise.all([
    sql<{ id: string; encounter_at: Date; plan: string; diagnoses: { description: string; code: string; type: 'Primary' }[]; diagnosis_notes: string | null }[]>`select id, encounter_at, plan, diagnoses, diagnosis_notes from encounters where patient_id=${id} and plan is not null order by encounter_at desc limit 20`,
    sql<Treatment[]>`select * from treatments where patient_id=${id} order by (status='active') desc, created_at desc`,
    sql<Appointment[]>`select * from appointments where patient_id=${id} order by scheduled_at desc`,
  ])
  const now = Date.now()
  const upcoming = appts.filter((a) => +new Date(a.scheduled_at) >= now - 864e5 && a.status === 'scheduled').reverse()
  const past = appts.filter((a) => !upcoming.includes(a))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card card-pad lg:col-span-2">
        <h2 className="h-section mb-3">Patient plan</h2>
        {plans.length === 0 ? <p className="text-sm text-slate-400">No plans yet. Plans are written during an encounter.</p> : (
          <ul className="space-y-3">
            {plans.map((p, i) => (
              <li key={p.id} className={`rounded-xl p-3 ${i === 0 ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-slate-50'}`}>
                <Link href={`/patients/${id}/encounters/${p.id}`} className="text-xs font-semibold text-brand-700">{fmtDateTime(p.encounter_at)}{i === 0 ? ' · Current plan' : ''}{diagnosisLine(p) ? ` · ${diagnosisLine(p)}` : ''}</Link>
                <p className="mt-1 whitespace-pre-line text-[15px]">{p.plan}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="h-section">Appointments</h2>
          <MiniForm action={addAppointment.bind(null, id)} label="Book appointment" submit="Book">
            <Field label="Date & time"><input type="datetime-local" name="scheduled_at" className="input" required defaultValue={toLocalInput(new Date(Date.now() + 7 * 864e5)).slice(0, 11) + '09:00'} /></Field>
            <Field label="Duration (min)"><input type="number" name="duration_min" className="input" defaultValue={15} /></Field>
            <Field label="Reason" className="sm:col-span-2"><input name="reason" className="input" placeholder="e.g. Follow-up review" /></Field>
            <Field label="Notes" className="sm:col-span-2"><input name="notes" className="input" /></Field>
          </MiniForm>
        </div>
        <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming</h3>
        {upcoming.length === 0 ? <p className="text-sm text-slate-400">None scheduled.</p> : <ApptList list={upcoming} />}
        {past.length > 0 && (<><h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Past</h3><ApptList list={past} /></>)}
      </section>

      <section className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="h-section">Treatment</h2>
          <MiniForm action={addTreatment.bind(null, id)} label="Add treatment">
            <Field label="Type"><select name="kind" className="input">{['Medication', 'Procedure', 'Therapy', 'Injection', 'Dressing', 'Referral', 'Other'].map((k) => <option key={k}>{k}</option>)}</select></Field>
            <Field label="Name"><input name="name" className="input" required /></Field>
            <Field label="Dose"><input name="dose" className="input" /></Field>
            <Field label="Frequency"><input name="frequency" className="input" placeholder="OD / BD / TDS" /></Field>
            <Field label="Duration"><input name="duration" className="input" /></Field>
            <Field label="Instructions"><input name="instructions" className="input" /></Field>
          </MiniForm>
        </div>
        <div className="mt-4 space-y-2">
          {treatments.length === 0 ? <p className="text-sm text-slate-400">No treatment recorded.</p> : treatments.map((t) => (
            <div key={t.id} className={`flex items-start gap-2 rounded-xl p-3 ${t.status === 'active' ? 'bg-sky-50' : 'bg-slate-50 opacity-75'}`}>
              <div className="min-w-0 flex-1 text-sm">
                <div><span className="font-semibold">{t.name}</span> <span className="text-xs text-slate-400">{t.kind}</span></div>
                <div className="text-slate-600">{[t.dose, t.frequency, t.duration].filter(Boolean).join(' · ')}</div>
                {t.instructions && <div className="text-xs text-slate-500">{t.instructions}</div>}
                <div className="text-xs text-slate-400">Started {fmtDate(t.created_at)}</div>
              </div>
              <StatusSelect value={t.status} options={['active', 'completed', 'stopped']} onChange={setTreatmentStatus.bind(null, t.id)} />
              <ConfirmButton action={deleteTreatment.bind(null, t.id)} message="Delete this treatment?" className="btn-ghost p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></ConfirmButton>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ApptList({ list }: { list: Appointment[] }) {
  return (
    <ul className="space-y-2">
      {list.map((a) => (
        <li key={a.id} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{fmtDateTime(a.scheduled_at)} <span className="text-xs font-normal text-slate-400">{a.duration_min} min</span></div>
            {a.reason && <div className="text-slate-600">{a.reason}</div>}
            {a.notes && <div className="text-xs text-slate-500">{a.notes}</div>}
          </div>
          <StatusSelect value={a.status} options={['scheduled', 'completed', 'cancelled', 'no-show']} onChange={setAppointmentStatus.bind(null, a.id)} />
          <ConfirmButton action={deleteAppointment.bind(null, a.id)} message="Delete this appointment?" className="btn-ghost p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></ConfirmButton>
        </li>
      ))}
    </ul>
  )
}
