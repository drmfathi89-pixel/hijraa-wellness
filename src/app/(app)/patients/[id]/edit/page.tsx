import { notFound } from 'next/navigation'
import { getPatient } from '@/lib/queries'
import { updatePatient } from '@/app/actions/patients'
import PatientForm from '@/components/PatientForm'
import { requireUser } from '@/lib/auth'

export default async function EditPatient({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const p = await getPatient(id)
  if (!p) notFound()
  return (
    <>
      <h2 className="h-section mb-3">Edit biodata</h2>
      <PatientForm action={updatePatient.bind(null, id)} initial={p} submit="Save changes" />
    </>
  )
}
