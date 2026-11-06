'use client'
import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { setTheme } from '@/app/actions/auth'

export const THEMES = [
  { id: 'blue', label: 'Hijraa Blue', swatch: '#0017e4', light: '#eef0fe' },
  { id: 'red', label: 'Hijraa Red', swatch: '#d82b05', light: '#fef2ee' },
  { id: 'teal', label: 'Hijraa Teal', swatch: '#007f7a', light: '#e6fefd' },
  { id: 'green', label: 'Hijraa Green', swatch: '#437d0c', light: '#f4fde8' },
] as const

export default function ThemePicker({ value }: { value: string }) {
  const [cur, setCur] = useState(value)
  const [pending, start] = useTransition()
  function pick(id: string) {
    setCur(id)
    document.querySelector('[data-theme]')?.setAttribute('data-theme', id) // instant preview
    start(() => setTheme(id))
  }
  return (
    <section className="card card-pad">
      <h2 className="h-section mb-1">Colour theme</h2>
      <p className="mb-3 text-xs text-slate-500">From the Hijraa logo colours. Saved to your account, on every device.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Colour theme">
        {THEMES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={cur === t.id} disabled={pending} onClick={() => pick(t.id)}
            className={`rounded-xl border-2 p-2 text-left transition ${cur === t.id ? 'border-slate-900' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="mb-2 flex h-10 overflow-hidden rounded-lg">
              <span className="flex-[2]" style={{ background: t.swatch }} />
              <span className="flex-1" style={{ background: t.light }} />
            </div>
            <span className="flex items-center justify-between text-xs font-semibold text-slate-700">{t.label}{cur === t.id && <Check size={14} />}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
