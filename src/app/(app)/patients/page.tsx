import Link from 'next/link'
import { Suspense } from 'react'
import { UserPlus } from 'lucide-react'
import { searchPatients } from '@/lib/queries'
import { PageHeader, Empty } from '@/components/ui'
import SearchBox from '@/components/SearchBox'
import PatientRow from '@/components/PatientRow'

export const metadata = { title: 'Patients' }

export default async function Patients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const patients = await searchPatients(q, 100)
  return (
    <>
      <PageHeader title="Patients" subtitle={q ? `${patients.length} result(s)` : 'Recently updated'} actions={<Link href="/patients/new" className="btn-primary"><UserPlus size={16} /> New patient</Link>} />
      <div className="mb-4"><Suspense><SearchBox /></Suspense></div>
      {patients.length === 0 ? (
        <Empty title={q ? 'No patients found' : 'No patients yet'}>{!q && <Link className="font-semibold text-brand-700" href="/patients/new">Register your first patient</Link>}</Empty>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {patients.map((p) => <PatientRow key={p.id} p={p} />)}
        </div>
      )}
    </>
  )
}
