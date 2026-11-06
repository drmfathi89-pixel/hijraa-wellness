'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Trash2, KeyRound } from 'lucide-react'
import { deletePatient } from '@/app/actions/patients'

export default function DeletePatient({ id, name, hasPasskey }: { id: string; name: string; hasPasskey: boolean }) {
  const [open, setOpen] = useState(false)
  const [passkey, setPasskey] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  if (!open) return <button type="button" className="btn-danger w-full" onClick={() => setOpen(true)}><Trash2 size={16} /> Delete patient</button>
  return (
    <div className="card card-pad space-y-3 border-heart/40">
      <p className="text-sm font-semibold text-heart">Delete {name} and ALL their records permanently?</p>
      <p className="text-xs text-slate-500">This removes encounters, past records, files, treatments and appointments. It cannot be undone, and is recorded in the audit log.</p>
      {!hasPasskey ? (
        <p className="text-sm">You need a delete passkey first. <Link href="/settings" className="font-semibold text-brand-700">Set it in Settings</Link>.</p>
      ) : (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); setError(''); start(async () => { const r = await deletePatient(id, passkey); if (r?.error) setError(r.error) }) }}>
          <label className="label flex items-center gap-1"><KeyRound size={12} /> Superadmin passkey</label>
          <input type="password" className="input" value={passkey} onChange={(e) => setPasskey(e.target.value)} autoComplete="off" required autoFocus aria-label="Superadmin passkey" />
          {error && <p className="text-sm font-medium text-heart">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-danger" disabled={pending || !passkey}>{pending ? 'Deleting…' : 'Delete permanently'}</button>
            <button type="button" className="btn-secondary" onClick={() => { setOpen(false); setPasskey(''); setError('') }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
