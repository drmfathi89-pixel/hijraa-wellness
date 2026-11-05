'use client'
import { useActionState, startTransition } from 'react'
import type { FormState } from '@/app/actions/auth'

type Field = { name: string; label: string; type?: string; autoComplete?: string; optional?: boolean; hint?: string }

export default function AuthForm({ action, fields, submit }: { action: (s: FormState, fd: FormData) => Promise<FormState>; fields: Field[]; submit: string }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  return (
    <form onSubmit={keepValues(formAction)} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? 'text'} autoComplete={f.autoComplete} className="input" required={!f.optional}
            autoCapitalize={f.name === 'username' ? 'none' : undefined} autoCorrect={f.name === 'username' ? 'off' : undefined} spellCheck={false} />
          {f.hint && <p className="mt-1 text-xs text-slate-400">{f.hint}</p>}
        </div>
      ))}
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'Please wait…' : submit}</button>
    </form>
  )
}

// Submit without React's automatic form reset, so a validation error keeps what was typed.
function keepValues(dispatch: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => dispatch(fd))
  }
}
