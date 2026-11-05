'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function deleteDocument(id: string) {
  await requireUser()
  const [d] = await sql`delete from documents where id=${id} returning patient_id`
  if (!d) return
  revalidatePath(`/patients/${d.patient_id}`, 'layout')
  redirect(`/patients/${d.patient_id}/files`)
}
