'use client'
import { useActionState } from 'react'
import type { FormState } from '@/app/actions/auth'

type Field = { name: string; label: string; type?: string; autoComplete?: string }

export default function AuthForm({ action, fields, submit }: { action: (s: FormState, fd: FormData) => Promise<FormState>; fields: Field[]; submit: string }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? 'text'} autoComplete={f.autoComplete} className="input" required />
        </div>
      ))}
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'Please wait…' : submit}</button>
    </form>
  )
}
