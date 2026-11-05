'use client'
import { useActionState, startTransition, useState } from 'react'
import type { FormState } from '@/app/actions/auth'
import { parseIC, calcAge } from '@/lib/utils'

type P = { name?: string; ic?: string; gender?: string | null; dob?: string | null; phone?: string | null; address?: string | null }

export default function PatientForm({ action, initial = {}, submit }: { action: (s: FormState, fd: FormData) => Promise<FormState>; initial?: P; submit: string }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [ic, setIc] = useState(initial.ic ?? '')
  const [dob, setDob] = useState(initial.dob ?? '')
  const [gender, setGender] = useState(initial.gender ?? '')

  function onIc(v: string) {
    setIc(v)
    const parsed = parseIC(v)
    if (parsed.dob) setDob(parsed.dob)
    if (parsed.gender) setGender(parsed.gender)
  }

  return (
    <form onSubmit={keepValues(formAction)} className="card card-pad grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Full name *</label>
        <input name="name" defaultValue={initial.name} className="input uppercase" required autoComplete="off" />
      </div>
      <div>
        <label className="label">IC / Passport No. *</label>
        <input name="ic" value={ic} onChange={(e) => onIc(e.target.value)} className="input" placeholder="e.g. 900101-14-5678" required inputMode="text" autoComplete="off" />
        <p className="mt-1 text-xs text-slate-400">Malaysian IC auto-fills date of birth &amp; gender</p>
      </div>
      <div>
        <label className="label">Gender</label>
        <div className="grid grid-cols-2 gap-2">
          {['Male', 'Female'].map((g) => (
            <label key={g} className={`btn cursor-pointer border ${gender === g ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600'}`}>
              <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} className="sr-only" /> {g}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Date of birth</label>
        <input type="date" name="dob" value={dob} onChange={(e) => setDob(e.target.value)} className="input" />
      </div>
      <div>
        <label className="label">Age</label>
        <div className="input bg-slate-50 text-slate-600">{calcAge(dob)}</div>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Phone No.</label>
        <input name="phone" type="tel" inputMode="tel" defaultValue={initial.phone ?? ''} className="input" placeholder="e.g. 012-345 6789" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Address</label>
        <textarea name="address" defaultValue={initial.address ?? ''} className="input" rows={3} />
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary w-full sm:w-auto" disabled={pending}>{pending ? 'Saving…' : submit}</button>
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
