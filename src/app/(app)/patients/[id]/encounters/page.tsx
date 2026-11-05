import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { listEncounters } from '@/lib/queries'
import { fmtDateTime } from '@/lib/utils'
import { Empty, StatusBadge } from '@/components/ui'
import { diagnosisLine } from '@/lib/types'
import { requireUser } from '@/lib/auth'

export default async function Encounters({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const list = await listEncounters(id)
  if (list.length === 0) return <Empty title="No encounters yet">Tap “Start encounter” above when seeing the patient.</Empty>
  return (
    <div className="card divide-y divide-slate-100 overflow-hidden">
      {list.map((e) => (
        <Link key={e.id} href={`/patients/${id}/encounters/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{fmtDateTime(e.encounter_at)}</span>
              <StatusBadge status={e.status === 'open' ? 'open' : 'closed'} />
              <span className="text-xs text-slate-500">{e.visit_type}</span>
            </div>
            <div className="truncate text-sm text-slate-600">{e.chief_complaint || <span className="text-slate-400">No complaint recorded</span>}</div>
            {diagnosisLine(e) && <div className="truncate text-xs font-medium text-brand-700">Dx: {diagnosisLine(e)}</div>}
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </Link>
      ))}
    </div>
  )
}
