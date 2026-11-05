'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload } from 'lucide-react'

export const CATEGORIES = ['Lab result', 'Imaging', 'Referral letter', 'Discharge summary', 'Medical certificate', 'Prescription', 'Consent form', 'ID / Insurance', 'Other']

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const needsConvert = !/^image\/(jpeg|png|webp)$/.test(file.type) // e.g. HEIC from iPhone
  if (!needsConvert && file.size < 1.5 * 1024 * 1024) return file
  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return file
  const max = 2400
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
  if (!blob) return file
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

export default function FileUpload({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Lab result')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(f?: File) {
    setError('')
    if (!f) return
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.\w+$/, ''))
  }

  async function upload() {
    if (!file) return
    setBusy(true); setError('')
    try {
      const f = await compressImage(file)
      if (f.size > 4 * 1024 * 1024) throw new Error('File is larger than 4 MB. Please compress the PDF or take a smaller photo.')
      const fd = new FormData()
      fd.set('file', f); fd.set('patientId', patientId); fd.set('title', title); fd.set('category', category)
      const res = await fetch('/api/files', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Upload failed')
      setFile(null); setTitle('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card card-pad space-y-3">
      <h2 className="h-section">Upload medical document</h2>
      <div className="flex flex-wrap gap-2">
        <label className="btn-secondary cursor-pointer"><Upload size={16} /> Choose file
          <input type="file" accept="application/pdf,image/*,text/plain" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <label className="btn-secondary cursor-pointer"><Camera size={16} /> Take photo
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>
      {file && (
        <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
          <div className="text-sm text-slate-600 sm:col-span-2">Selected: <b>{file.name}</b></div>
          <div><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload'}</button>
            <button className="btn-secondary" disabled={busy} onClick={() => setFile(null)}>Cancel</button>
          </div>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <p className="text-xs text-slate-400">PDF, JPG, PNG or text · max 4 MB · large photos are compressed automatically</p>
    </div>
  )
}
