'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { FormState } from '@/app/actions/auth'

/** Collapsible form wrapper around a server action; resets + collapses on success. */
export default function MiniForm({ action, label, children, submit = 'Save', defaultOpen = false }: { action: (s: FormState, fd: FormData) => Promise<FormState>; label: string; children: React.ReactNode; submit?: string; defaultOpen?: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [open, setOpen] = useState(defaultOpen)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) { ref.current?.reset(); if (!defaultOpen) setOpen(false) } }, [state, defaultOpen])
  if (!open) return <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(true)}><Plus size={14} /> {label}</button>
  return (
    <form ref={ref} action={formAction} className="mt-3 grid w-full gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
      {children}
      {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      {state?.ok && defaultOpen && <p className="text-sm text-emerald-600 sm:col-span-2">{state.ok}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary btn-sm" disabled={pending}>{pending ? 'Saving…' : submit}</button>
        {!defaultOpen && <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(false)}>Cancel</button>}
      </div>
    </form>
  )
}
