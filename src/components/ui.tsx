import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export function PageHeader({ title, subtitle, back, actions }: { title: string; subtitle?: React.ReactNode; back?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && <Link href={back} className="mb-1 inline-flex items-center text-sm font-medium text-brand-700"><ChevronLeft size={16} /> Back</Link>}
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-10 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  )
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700',
  completed: 'bg-leaf/30 text-leaf-dark',
  cancelled: 'bg-slate-200 text-slate-600',
  'no-show': 'bg-amber-100 text-amber-700',
  open: 'bg-amber-100 text-amber-700',
  closed: 'bg-leaf/30 text-leaf-dark',
  active: 'bg-sky-100 text-sky-700',
  stopped: 'bg-heart/10 text-heart-dark',
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge capitalize ${statusColors[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}</span>
}

export function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 whitespace-pre-line text-[15px] text-slate-800">{value || '-'}</div>
    </div>
  )
}
