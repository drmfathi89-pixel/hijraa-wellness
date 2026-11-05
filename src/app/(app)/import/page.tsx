import ExcelImport from '@/components/ExcelImport'
import { PageHeader } from '@/components/ui'
import { TEMPLATE_HEADERS } from '@/lib/excel'

export const metadata = { title: 'Import Excel' }

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Import from Excel" subtitle="Bring in past medical records (and patients) from another system" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2"><ExcelImport /></div>
        <div className="card card-pad text-sm text-slate-600">
          <h2 className="h-section mb-2">How it works</h2>
          <ol className="ml-4 list-decimal space-y-1.5">
            <li>Download the template, or use your own sheet with similar column headers.</li>
            <li>Each row is one visit. Rows are matched to patients by <b>IC No</b>.</li>
            <li>If the IC isn&apos;t registered and a <b>Patient Name</b> is given, the patient is created automatically (DOB &amp; gender derived from the IC).</li>
            <li>Dates can be <b>DD/MM/YYYY</b>, YYYY-MM-DD or Excel dates.</li>
            <li>Preview the rows, then confirm the import.</li>
          </ol>
          <h3 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Recognised columns</h3>
          <div className="flex flex-wrap gap-1">{TEMPLATE_HEADERS.map((h) => <span key={h} className="badge bg-slate-100 text-slate-600">{h}</span>)}</div>
        </div>
      </div>
    </>
  )
}
