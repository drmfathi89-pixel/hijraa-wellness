'use client'
import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { parseIC, calcAge } from '@/lib/utils'

type P = { id: string; name: string; ic: string }

/**
 * Pick a registered patient, or register a new one in place ("+ New patient").
 * Submits patient_id, or new_patient=1 with new_name / new_ic / new_phone.
 */
export default function PatientPicker({ name = 'patient_id' }: { name?: string }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<P[]>([])
  const [searched, setSearched] = useState(false)
  const [sel, setSel] = useState<P | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [ic, setIc] = useState('')
  useEffect(() => {
    if (sel || isNew || q.trim().length < 2) { setList([]); setSearched(false); return }
    const t = setTimeout(() => fetch(`/api/patients/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((r) => { setList(r); setSearched(true) }).catch(() => {}), 250)
    return () => clearTimeout(t)
  }, [q, sel, isNew])

  function startNew() {
    // carry over what was typed: digits look like an IC, anything else like a name
    if (/\d{6}/.test(q)) setIc(q)
    setIsNew(true); setList([])
  }

  if (isNew) {
    const info = parseIC(ic)
    return (
      <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
        <input type="hidden" name="new_patient" value="1" />
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-800"><UserPlus size={15} /> New patient</span>
          <button type="button" className="text-xs font-semibold text-brand-700" onClick={() => { setIsNew(false); setIc('') }}>Search instead</button>
        </div>
        <input name="new_name" className="input uppercase" placeholder="Full name *" required defaultValue={/\d{6}/.test(q) ? '' : q} autoComplete="off" />
        <input name="new_ic" className="input" placeholder="IC / Passport No. *" required value={ic} onChange={(e) => setIc(e.target.value)} autoComplete="off" />
        {info.dob && <p className="text-xs text-slate-500">From IC: {info.gender}, born {info.dob} ({calcAge(info.dob)})</p>}
        <input name="new_phone" type="tel" inputMode="tel" className="input" placeholder="Phone (for WhatsApp reminders)" autoComplete="off" />
      </div>
    )
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={sel?.id ?? ''} />
      {sel ? (
        <div className="input flex items-center justify-between bg-brand-50">
          <span className="truncate"><b>{sel.name}</b> <span className="text-slate-500">{sel.ic}</span></span>
          <button type="button" className="text-xs font-semibold text-brand-700" onClick={() => { setSel(null); setQ('') }}>Change</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input className="input" placeholder="Search patient name or IC…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="btn-secondary shrink-0" onClick={startNew}><UserPlus size={15} /> New patient</button>
        </div>
      )}
      {!sel && (list.length > 0 || (searched && q.trim().length >= 2)) && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {list.map((p) => (
            <li key={p.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => setSel(p)}><b>{p.name}</b> <span className="text-slate-500">{p.ic}</span></button></li>
          ))}
          <li className="border-t border-slate-100">
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50" onClick={startNew}>
              <UserPlus size={15} /> {list.length ? 'Not listed? Register new patient' : `No match. Register "${q.trim()}" as a new patient`}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
