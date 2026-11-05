'use client'
import { useEffect, useState } from 'react'

type P = { id: string; name: string; ic: string }

export default function PatientPicker({ name = 'patient_id' }: { name?: string }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<P[]>([])
  const [sel, setSel] = useState<P | null>(null)
  useEffect(() => {
    if (sel || q.trim().length < 2) { setList([]); return }
    const t = setTimeout(() => fetch(`/api/patients/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then(setList).catch(() => {}), 250)
    return () => clearTimeout(t)
  }, [q, sel])
  return (
    <div className="relative">
      <input type="hidden" name={name} value={sel?.id ?? ''} />
      {sel ? (
        <div className="input flex items-center justify-between bg-brand-50">
          <span className="truncate"><b>{sel.name}</b> <span className="text-slate-500">{sel.ic}</span></span>
          <button type="button" className="text-xs font-semibold text-brand-700" onClick={() => { setSel(null); setQ('') }}>Change</button>
        </div>
      ) : (
        <input className="input" placeholder="Search patient name or IC…" value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      {list.length > 0 && !sel && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {list.map((p) => (
            <li key={p.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => setSel(p)}><b>{p.name}</b> <span className="text-slate-500">{p.ic}</span></button></li>
          ))}
        </ul>
      )}
    </div>
  )
}
