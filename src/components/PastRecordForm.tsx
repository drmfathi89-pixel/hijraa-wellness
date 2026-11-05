'use client'
import { useActionState, startTransition, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { FormState } from '@/app/actions/auth'

export default function PastRecordForm({ action }: { action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setOpen(false) } }, [state])
  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add past record</button>
  return (
    <form ref={ref} onSubmit={keepValues(formAction)} className="card card-pad grid gap-3 sm:grid-cols-3">
      <div><label className="label">Visit date</label><input type="date" name="visit_date" className="input" required /></div>
      <div><label className="label">Facility / clinic</label><input name="facility" className="input" /></div>
      <div><label className="label">Doctor</label><input name="doctor" className="input" /></div>
      <div className="sm:col-span-3"><label className="label">Complaint</label><input name="complaint" className="input" /></div>
      <div className="sm:col-span-3"><label className="label">Diagnosis</label><input name="diagnosis" className="input" /></div>
      <div className="sm:col-span-3"><label className="label">Treatment</label><textarea name="treatment" className="input" rows={2} /></div>
      <div className="sm:col-span-3"><label className="label">Notes</label><textarea name="notes" className="input" rows={2} /></div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-3">
        <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save record'}</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
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
