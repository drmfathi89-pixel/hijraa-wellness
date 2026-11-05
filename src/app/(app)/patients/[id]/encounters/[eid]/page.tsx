import { notFound } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { sql } from '@/lib/db'
import { getEncounter, type Treatment, type Appointment } from '@/lib/queries'
import { fmtDate, fmtDateTime, toLocalInput } from '@/lib/utils'
import { reopenEncounter, deleteEncounter } from '@/app/actions/encounters'
import EncounterEditor from '@/components/EncounterEditor'
import EncounterSummary from '@/components/EncounterSummary'
import ConfirmButton from '@/components/ConfirmButton'
import PrintButton from '@/components/PrintButton'
import { StatusBadge } from '@/components/ui'
import { type EncounterPayload, type Encounter, type PriceItem, investigationText, diagnosisText } from '@/lib/types'
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

  const [prevEnc, prevPast, priceList] = await Promise.all([
    sql<Encounter[]>`select * from encounters where patient_id = ${id} and id <> ${eid} order by encounter_at desc limit 30`,
    sql<{ visit_date: string | null; diagnosis: string; facility: string | null }[]>`select visit_date, diagnosis, facility from past_records where patient_id = ${id} and diagnosis is not null order by visit_date desc nulls last limit 30`,
    sql<PriceItem[]>`select id, kind, name, price, active from charge_items where active order by kind, lower(name)`,
  ])
  const previousDx = [
    ...prevEnc.flatMap((p) => diagnosisText(p).split('\n').filter((x) => x.trim()).map((text) => ({ date: fmtDate(p.encounter_at), text: text.trim(), source: 'HIJRAA' }))),
    ...prevPast.map((p) => ({ date: fmtDate(p.visit_date), text: p.diagnosis, source: p.facility || 'Past record' })),
  ]

  const initial: EncounterPayload = {
    encounter_at: toLocalInput(e.encounter_at),
    visit_type: e.visit_type,
    chief_complaint: s(e.chief_complaint), history: s(e.history), examination: s(e.examination), notes: s(e.notes),
    vitals: {
      bp_systolic: s(e.bp_systolic), bp_diastolic: s(e.bp_diastolic), pulse: s(e.pulse), resp_rate: s(e.resp_rate),
      temperature: s(e.temperature), spo2: s(e.spo2), weight: s(e.weight), height: s(e.height), glucose: s(e.glucose), pain_score: s(e.pain_score),
    },
    investigation_notes: investigationText(e), imaging_notes: s(e.imaging_notes),
    diagnosis_list: diagnosisText(e).split('\n').map((x) => x.trim()).filter(Boolean).concat(diagnosisText(e).trim() ? [] : ['']),
    diagnosis_sensitive: e.diagnosis_sensitive, diagnosis_notifiable: e.diagnosis_notifiable,
    charges: (e.charges ?? []).map((c) => ({ item: c.item, qty: String(c.qty), price: c.price ? c.price.toFixed(2) : '' })),
    plan: s(e.plan),
    treatments: treatments.map((t) => ({ id: t.id, kind: t.kind, name: t.name, dose: s(t.dose), frequency: s(t.frequency), duration: s(t.duration), instructions: s(t.instructions) })),
    followup: followup ? { at: toLocalInput(followup.scheduled_at), reason: s(followup.reason) } : { at: '', reason: '' },
  }
  return (
    <>
      {header}
      <EncounterEditor id={eid} patientId={id} initial={initial} previousDx={previousDx} priceList={priceList} />
    </>
  )
}
