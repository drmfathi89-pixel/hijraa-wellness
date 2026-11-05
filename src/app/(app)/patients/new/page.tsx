import { createPatient } from '@/app/actions/patients'
import PatientForm from '@/components/PatientForm'
import { PageHeader } from '@/components/ui'

export const metadata = { title: 'New patient' }

export default function NewPatient() {
  return (
    <>
      <PageHeader title="Register patient" subtitle="Patient biodata" back="/patients" />
      <PatientForm action={createPatient} submit="Register patient" />
    </>
  )
}
