'use client'
import { useTransition } from 'react'

export default function StatusSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => Promise<void> }) {
  const [pending, start] = useTransition()
  return (
    <select disabled={pending} value={value} onChange={(e) => { const v = e.target.value; start(() => onChange(v)) }}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold capitalize text-slate-700">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
