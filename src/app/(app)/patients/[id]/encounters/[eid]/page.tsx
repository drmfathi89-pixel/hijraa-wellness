import { notFound } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { sql } from '@/lib/db'
import { getEncounter, type Treatment, type Appointment } from '@/lib/queries'
import { fmtDateTime, toLocalInput } from '@/lib/utils'
import { reopenEncounter, deleteEncounter } from '@/app/actions/encounters'
import EncounterEditor from '@/components/EncounterEditor'
import EncounterSummary from '@/components/EncounterSummary'
import ConfirmButton from '@/components/ConfirmButton'
import PrintButton from '@/components/PrintButton'
import { StatusBadge } from '@/components/ui'
import { type EncounterPayload, investigationText, diagnosisText } from '@/lib/types'
import { requireUser } from '@/lib/auth'

const s = (v: unknown) => (v == null ? '' : String(v))

export default async function EncounterPage({ params }: { params: Promise<{ id: string; eid: string }> }) {
  await requireUser()
  const { id, eid } = await params
  const e = await getEncounter(eid)
  if (!e || e.patient_id !== id) notFound()
  const treatments = await sql<Treatment[]>`select * from treatments where encounter_id = ${eid} order by created_at`
  const [followup] = await sql<Appointment[]>`select * from appointments where encounter_id = ${eid} limit 1`

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">{e.visit_type} <StatusBadge status={e.status} /></h2>
        <p className="text-sm text-slate-500">{fmtDateTime(e.encounter_at)}{e.doctor_name ? ` · ${e.doctor_name}` : ''}</p>
      </div>
      <div className="flex gap-2 print:hidden">
        {e.status === 'closed' && (
          <>
            <PrintButton />
            <form action={reopenEncounter.bind(null, eid)}><button className="btn-secondary btn-sm"><Pencil size={14} /> Edit</button></form>
          </>
        )}
        <ConfirmButton action={deleteEncounter.bind(null, eid)} message="Delete this encounter permanently?" className="btn-danger btn-sm"><Trash2 size={14} /> Delete</ConfirmButton>
      </div>
    </div>
  )

  if (e.status === 'closed') {
    return (
      <>
        {header}
        <div className="card card-pad"><EncounterSummary e={e} treatments={treatments} followup={followup} /></div>
      </>
    )
  }

  const initial: EncounterPayload = {
    encounter_at: toLocalInput(e.encounter_at),
    visit_type: e.visit_type,
    chief_complaint: s(e.chief_complaint), history: s(e.history), examination: s(e.examination), notes: s(e.notes),
    vitals: {
      bp_systolic: s(e.bp_systolic), bp_diastolic: s(e.bp_diastolic), pulse: s(e.pulse), resp_rate: s(e.resp_rate),
      temperature: s(e.temperature), spo2: s(e.spo2), weight: s(e.weight), height: s(e.height), glucose: s(e.glucose), pain_score: s(e.pain_score),
    },
    investigation_notes: investigationText(e), diagnosis_notes: diagnosisText(e), plan: s(e.plan),
    treatments: treatments.map((t) => ({ id: t.id, kind: t.kind, name: t.name, dose: s(t.dose), frequency: s(t.frequency), duration: s(t.duration), instructions: s(t.instructions) })),
    followup: followup ? { at: toLocalInput(followup.scheduled_at), reason: s(followup.reason) } : { at: '', reason: '' },
  }
  return (
    <>
      {header}
      <EncounterEditor id={eid} patientId={id} initial={initial} />
    </>
  )
}
