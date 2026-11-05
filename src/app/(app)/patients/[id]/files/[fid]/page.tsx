import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { sql } from '@/lib/db'
import { fmtDateTime, fmtSize } from '@/lib/utils'
import FileViewer from '@/components/FileViewer'
import ConfirmButton from '@/components/ConfirmButton'
import { deleteDocument } from '@/app/actions/files'
import { requireUser } from '@/lib/auth'

export default async function ViewFile({ params }: { params: Promise<{ id: string; fid: string }> }) {
  await requireUser()
  const { id, fid } = await params
  if (!/^[0-9a-f-]{36}$/i.test(fid)) notFound()
  const [d] = await sql`select d.id, d.title, d.category, d.mime, d.size, d.created_at, u.name as uploader from documents d
    left join users u on u.id = d.uploaded_by where d.id = ${fid} and d.patient_id = ${id}`
  if (!d) notFound()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/patients/${id}/files`} className="inline-flex items-center text-sm font-medium text-brand-700"><ChevronLeft size={16} /> Files</Link>
          <h2 className="text-lg font-bold">{d.title}</h2>
          <p className="text-sm text-slate-500">{d.category} · {fmtSize(d.size)} · {fmtDateTime(d.created_at)}{d.uploader ? ` · ${d.uploader}` : ''}</p>
        </div>
        <ConfirmButton action={deleteDocument.bind(null, fid)} message="Delete this document?" className="btn-danger btn-sm"><Trash2 size={14} /> Delete</ConfirmButton>
      </div>
      <FileViewer id={d.id} mime={d.mime} title={d.title} />
    </div>
  )
}
