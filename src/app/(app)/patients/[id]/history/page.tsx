import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { sql } from '@/lib/db'
import { fmtDate, toLocalInput } from '@/lib/utils'
import { type Encounter, diagnosisLine } from '@/lib/types'
import { addPastRecord, deletePastRecord } from '@/app/actions/records'
import PastRecordForm from '@/components/PastRecordForm'
import ExcelImport from '@/components/ExcelImport'
import ConfirmButton from '@/components/ConfirmButton'
import { Empty } from '@/components/ui'
import { requireUser } from '@/lib/auth'

type PR = { id: string; visit_date: string | null; facility: string | null; doctor: string | null; complaint: string | null; diagnosis: string | null; treatment: string | null; notes: string | null; source: string }
type Item = { kind: 'past'; date: string; r: PR } | { kind: 'enc'; date: string; e: Encounter }

export default async function History({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const [past, encs] = await Promise.all([
    sql<PR[]>`select * from past_records where patient_id=${id}`,
    sql<Encounter[]>`select * from encounters where patient_id=${id} and status='closed'`,
  ])
  const items: Item[] = [
    ...past.map((r) => ({ kind: 'past' as const, date: r.visit_date ?? '', r })),
    ...encs.map((e) => ({ kind: 'enc' as const, date: toLocalInput(e.encounter_at).slice(0, 10), e })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <PastRecordForm action={addPastRecord.bind(null, id)} />
      </div>
      <details className="card card-pad">
        <summary className="cursor-pointer font-semibold text-slate-700">Import past records from Excel</summary>
        <p className="mb-3 mt-2 text-sm text-slate-500">Upload visit history from another clinic or system. Columns are matched by header name (Visit Date, Facility, Doctor, Complaint, Diagnosis, Treatment, Notes). Every row will be added to this patient.</p>
        <ExcelImport patientId={id} />
      </details>

      {items.length === 0 ? <Empty title="No past medical records">Add a record manually or import from Excel.</Empty> : (
        <ol className="relative space-y-3 border-l-2 border-brand-100 pl-5">
          {items.map((it) => (
            <li key={it.kind === 'past' ? it.r.id : it.e.id} className="relative">
              <span className={`absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ring-[#f4f7f6] ${it.kind === 'enc' ? 'bg-brand-600' : 'bg-amber-500'}`} />
              {it.kind === 'past' ? (
                <div className="card card-pad">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{fmtDate(it.r.visit_date)}</span>
                      <span className="badge bg-amber-100 text-amber-800">{it.r.source === 'excel' ? 'Imported' : 'External'}</span>
                      {it.r.facility && <span className="text-sm text-slate-500">{it.r.facility}</span>}
                      {it.r.doctor && <span className="text-sm text-slate-400">· {it.r.doctor}</span>}
                    </div>
                    <ConfirmButton action={deletePastRecord.bind(null, it.r.id)} message="Delete this record?" className="btn-ghost p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={15} /></ConfirmButton>
                  </div>
                  <dl className="grid gap-1 text-sm">
                    {it.r.complaint && <div><dt className="inline font-semibold text-slate-500">Complaint: </dt><dd className="inline">{it.r.complaint}</dd></div>}
                    {it.r.diagnosis && <div><dt className="inline font-semibold text-slate-500">Diagnosis: </dt><dd className="inline font-semibold text-brand-800">{it.r.diagnosis}</dd></div>}
                    {it.r.treatment && <div><dt className="inline font-semibold text-slate-500">Treatment: </dt><dd className="inline whitespace-pre-line">{it.r.treatment}</dd></div>}
                    {it.r.notes && <div><dt className="inline font-semibold text-slate-500">Notes: </dt><dd className="inline whitespace-pre-line">{it.r.notes}</dd></div>}
                  </dl>
                </div>
              ) : (
                <Link href={`/patients/${id}/encounters/${it.e.id}`} className="card card-pad block hover:border-brand-300">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-bold">{fmtDate(it.date)}</span>
                    <span className="badge bg-brand-100 text-brand-800">HIJRAA · {it.e.visit_type}</span>
                  </div>
                  <div className="text-sm">{it.e.chief_complaint}</div>
                  {diagnosisLine(it.e) && <div className="text-sm font-semibold text-brand-800">Dx: {diagnosisLine(it.e)}</div>}
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
