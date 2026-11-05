'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Upload, Download, CheckCircle2 } from 'lucide-react'
import { rowsToRecords, type ImportRow } from '@/lib/excel'
import { importPastRecords, type ImportResult } from '@/app/actions/records'

const LABELS: Record<string, string> = { ic: 'IC', name: 'Name', gender: 'Gender', dob: 'DOB', phone: 'Phone', address: 'Address', visit_date: 'Visit date', facility: 'Facility', doctor: 'Doctor', complaint: 'Complaint', diagnosis: 'Diagnosis', treatment: 'Treatment', notes: 'Notes' }

function parseCSV(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); out.push(row) }
  return out
}

export default function ExcelImport({ patientId }: { patientId?: string }) {
  const router = useRouter()
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [cols, setCols] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [createMissing, setCreateMissing] = useState(true)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [pending, start] = useTransition()

  async function onFile(f: File | undefined) {
    setError(''); setResult(null); setRows(null)
    if (!f) return
    setFileName(f.name)
    try {
      let sheet: unknown[][]
      if (/\.csv$/i.test(f.name)) sheet = parseCSV(await f.text())
      else if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import('read-excel-file/browser')
        sheet = (await readSheet(f)) as unknown[][]
      } else throw new Error('Please choose an .xlsx or .csv file (in Excel: File > Save As > Excel Workbook .xlsx)')
      const { rows, mapped } = rowsToRecords(sheet)
      if (rows.length === 0) throw new Error('No recognisable columns found. Use the template headers (e.g. "IC No", "Visit Date", "Diagnosis").')
      if (!patientId && !mapped.includes('ic')) throw new Error('An "IC No" column is required to match rows to patients.')
      setCols([...new Set(mapped.filter(Boolean) as string[])])
      setRows(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file')
    }
  }

  function doImport() {
    if (!rows) return
    start(async () => {
      try {
        const r = await importPastRecords(patientId ?? null, rows, createMissing)
        setResult(r); setRows(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Import failed')
      }
    })
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="btn-primary cursor-pointer">
          <Upload size={16} /> Choose Excel file
          <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <a href="/api/import/template" className="btn-secondary"><Download size={16} /> Download template</a>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {result && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Imported {result.inserted} record(s){result.createdPatients ? `, created ${result.createdPatients} new patient(s)` : ''}.</p>
          {result.skipped.length > 0 && (
            <details className="mt-1 text-amber-800"><summary>{result.skipped.length} row(s) skipped</summary>
              <ul className="ml-4 list-disc">{result.skipped.slice(0, 50).map((s) => <li key={s.row}>Row {s.row}: {s.reason}</li>)}</ul>
            </details>
          )}
        </div>
      )}
      {rows && (
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 font-semibold"><FileSpreadsheet size={16} className="text-emerald-600" /> {fileName}: {rows.length} row(s)</span>
            {!patientId && (
              <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} /> Create patients not yet registered</label>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white"><tr>{cols.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold text-slate-500">{LABELS[c]}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 100).map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} className="max-w-[220px] truncate px-3 py-1.5">{r[c as keyof ImportRow] ?? ''}</td>)}</tr>)}
              </tbody>
            </table>
            {rows.length > 100 && <p className="px-3 py-2 text-xs text-slate-400">Showing first 100 rows…</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 p-3">
            <button className="btn-secondary" onClick={() => setRows(null)}>Cancel</button>
            <button className="btn-primary" disabled={pending} onClick={doImport}>{pending ? 'Importing…' : `Import ${rows.length} row(s)`}</button>
          </div>
        </div>
      )}
    </div>
  )
}
