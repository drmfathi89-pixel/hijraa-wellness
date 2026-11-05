import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { calcAge } from '@/lib/utils'

export function Avatar({ name, gender, size = 'h-10 w-10 text-sm' }: { name: string; gender?: string | null; size?: string }) {
  const initials = name.split(/\s+/).filter((w) => !/^(BIN|BINTI|A\/L|A\/P|BT|B\.?)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('')
  const color = gender === 'Female' ? 'bg-pink-100 text-pink-700' : gender === 'Male' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
  return <div className={`grid shrink-0 place-items-center rounded-full font-bold ${size} ${color}`}>{initials}</div>
}

export default function PatientRow({ p, right }: { p: { id: string; name: string; ic: string; gender: string | null; dob: string | null; phone?: string | null }; right?: React.ReactNode }) {
  return (
    <Link href={`/patients/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
      <Avatar name={p.name} gender={p.gender} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-slate-900">{p.name}</div>
        <div className="truncate text-xs text-slate-500">{p.ic} · {p.gender ?? '-'} · {calcAge(p.dob)}{p.phone ? ` · ${p.phone}` : ''}</div>
      </div>
      {right ?? <ChevronRight size={18} className="text-slate-300" />}
    </Link>
  )
}
