import Link from 'next/link'
import { FileText, Image as ImageIcon, FileType2, ChevronRight } from 'lucide-react'
import { sql } from '@/lib/db'
import { fmtDateTime, fmtSize } from '@/lib/utils'
import FileUpload from '@/components/FileUpload'
import { Empty } from '@/components/ui'

type Doc = { id: string; title: string; category: string; mime: string; size: number; created_at: Date; uploader: string | null }

export default async function Files({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string }> }) {
  const { id } = await params
  const { c } = await searchParams
  const docs = await sql<Doc[]>`select d.id, d.title, d.category, d.mime, d.size, d.created_at, u.name as uploader
    from documents d left join users u on u.id = d.uploaded_by where d.patient_id = ${id} order by d.created_at desc`
  const cats = [...new Set(docs.map((d) => d.category))]
  const shown = c ? docs.filter((d) => d.category === c) : docs
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:order-2"><FileUpload patientId={id} /></div>
      <div className="space-y-3 lg:col-span-2">
        {cats.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Link href={`/patients/${id}/files`} className={`badge px-3 py-1 ${!c ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>All ({docs.length})</Link>
            {cats.map((k) => <Link key={k} href={`/patients/${id}/files?c=${encodeURIComponent(k)}`} className={`badge px-3 py-1 ${c === k ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{k}</Link>)}
          </div>
        )}
        {shown.length === 0 ? <Empty title="No documents yet">Upload lab results, referral letters, scans and more.</Empty> : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {shown.map((d) => {
              const Icon = d.mime === 'application/pdf' ? FileText : d.mime.startsWith('image/') ? ImageIcon : FileType2
              return (
                <Link key={d.id} href={`/patients/${id}/files/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${d.mime === 'application/pdf' ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-600'}`}><Icon size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{d.title}</div>
                    <div className="truncate text-xs text-slate-500">{d.category} · {fmtSize(d.size)} · {fmtDateTime(d.created_at)}{d.uploader ? ` · ${d.uploader}` : ''}</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
