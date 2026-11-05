'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, CheckCircle2 } from 'lucide-react'
import { readSpreadsheet } from '@/lib/spreadsheet'
import { importPrices, type PriceImportResult } from '@/app/actions/prices'

type Row = { kind: string; name: string; price: string }
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const COLS: Record<keyof Row, string[]> = {
  kind: ['type', 'kind', 'category', 'jenis'],
  name: ['name', 'item', 'description', 'service', 'nama', 'perkara'],
  price: ['price', 'pricerm', 'amount', 'fee', 'cost', 'harga', 'rm'],
}

function toRows(sheet: unknown[][]): Row[] {
  const hi = sheet.findIndex((r) => r.some((c) => COLS.name.includes(norm(c))) && r.some((c) => COLS.price.includes(norm(c))))
  if (hi < 0) throw new Error('Could not find "Name" and "Price" columns. Use the template.')
  const idx = Object.fromEntries(Object.entries(COLS).map(([k, al]) => [k, sheet[hi].findIndex((c) => al.includes(norm(c)))])) as Record<keyof Row, number>
  return sheet.slice(hi + 1)
    .filter((r) => r && r[idx.name] != null && String(r[idx.name]).trim() !== '')
    .map((r) => ({ kind: idx.kind >= 0 ? String(r[idx.kind] ?? '') : '', name: String(r[idx.name]).trim(), price: String(r[idx.price] ?? '') }))
}

export default function PriceImport() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PriceImportResult | null>(null)
  const [pending, start] = useTransition()

  async function onFile(f?: File) {
    setError(''); setResult(null); setRows(null)
    if (!f) return
    try { const r = toRows(await readSpreadsheet(f)); if (!r.length) throw new Error('No items found in the file'); setRows(r) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not read file') }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <label className="btn-secondary btn-sm cursor-pointer"><Upload size={14} /> Upload Excel
          <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <a href="/api/prices/template" className="btn-ghost btn-sm"><Download size={14} /> Template</a>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {result && (
        <p className="flex items-center gap-2 rounded-lg bg-leaf/25 px-3 py-2 text-sm font-medium text-leaf-dark">
          <CheckCircle2 size={16} /> {result.added} added, {result.updated} price(s) updated{result.skipped.length ? `, ${result.skipped.length} skipped (${result.skipped.slice(0, 3).map((s) => `row ${s.row}: ${s.reason}`).join('; ')})` : ''}
        </p>
      )}
      {rows && (
        <div className="rounded-xl border border-slate-200">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Name</th><th className="px-3 py-2 text-right">Price</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{rows.map((r, i) => <tr key={i}><td className="px-3 py-1.5">{r.kind || 'Other'}</td><td className="px-3 py-1.5">{r.name}</td><td className="px-3 py-1.5 text-right">{r.price}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 p-2">
            <button className="btn-secondary btn-sm" onClick={() => setRows(null)}>Cancel</button>
            <button className="btn-primary btn-sm" disabled={pending} onClick={() => start(async () => {
              try { setResult(await importPrices(rows)); setRows(null); router.refresh() } catch (e) { setError(e instanceof Error ? e.message : 'Import failed') }
            })}>{pending ? 'Importing…' : `Import ${rows.length} item(s)`}</button>
          </div>
        </div>
      )}
    </div>
  )
}
