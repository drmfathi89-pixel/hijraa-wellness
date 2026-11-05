import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Phone, Stethoscope, MessageCircle } from 'lucide-react'
import { waNumber } from '@/lib/whatsapp'
import { getPatient } from '@/lib/queries'
import { calcAge, fmtDate } from '@/lib/utils'
import { Avatar } from '@/components/PatientRow'
import PatientTabs from '@/components/PatientTabs'
import { startEncounter } from '@/app/actions/encounters'
import { requireUser } from '@/lib/auth'

export default async function PatientLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const p = await getPatient(id)
  if (!p) notFound()
  return (
    <>
      <Link href="/patients" className="mb-2 inline-flex items-center text-sm font-medium text-brand-700"><ChevronLeft size={16} /> Patients</Link>
      <div className="card card-pad mb-4 flex flex-wrap items-center gap-4">
        <Avatar name={p.name} gender={p.gender} size="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold leading-tight text-slate-900">{p.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="font-mono">{p.ic}</span>
            <span>{p.gender ?? '-'}</span>
            <span>{calcAge(p.dob)}{p.dob ? ` (${fmtDate(p.dob)})` : ''}</span>
            {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 text-brand-700"><Phone size={13} />{p.phone}</a>}
            {waNumber(p.phone) && <a href={`https://wa.me/${waNumber(p.phone)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-[#128c4a]"><MessageCircle size={13} />WhatsApp</a>}
          </div>
        </div>
        <form action={startEncounter.bind(null, p.id)} className="w-full sm:w-auto">
          <button className="btn-primary w-full"><Stethoscope size={16} /> Start encounter</button>
        </form>
      </div>
      <PatientTabs id={p.id} />
      {children}
    </>
  )
}
