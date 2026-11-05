'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'
import { str, formatIC } from '@/lib/utils'
import type { FormState } from './auth'

function readPatient(fd: FormData) {
  const gender = str(fd.get('gender'))
  return {
    name: str(fd.get('name'))?.toUpperCase() ?? null,
    ic: str(fd.get('ic')) ? formatIC(String(fd.get('ic'))) : null,
    gender: gender === 'Male' || gender === 'Female' ? gender : null,
    dob: str(fd.get('dob')),
    phone: str(fd.get('phone')),
    address: str(fd.get('address')),
  }
}

async function icTaken(ic: string, exceptId?: string) {
  const rows = await sql`select id, name from patients
    where upper(regexp_replace(ic, '[^0-9A-Za-z]', '', 'g')) = upper(regexp_replace(${ic}, '[^0-9A-Za-z]', '', 'g'))
    ${exceptId ? sql`and id <> ${exceptId}` : sql``}`
  return rows[0] as { id: string; name: string } | undefined
}

export async function createPatient(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser()
  const p = readPatient(fd)
  if (!p.name || !p.ic) return { error: 'Name and IC / Passport No. are required' }
  const dup = await icTaken(p.ic)
  if (dup) return { error: `IC already registered to ${dup.name}` }
  const [row] = await sql`insert into patients (name, ic, gender, dob, phone, address, created_by)
    values (${p.name}, ${p.ic}, ${p.gender}, ${p.dob}, ${p.phone}, ${p.address}, ${me.id}) returning id`
  revalidatePath('/patients')
  redirect(`/patients/${row.id}`)
}

export async function updatePatient(id: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const p = readPatient(fd)
  if (!p.name || !p.ic) return { error: 'Name and IC / Passport No. are required' }
  const dup = await icTaken(p.ic, id)
  if (dup) return { error: `IC already registered to ${dup.name}` }
  await sql`update patients set name=${p.name}, ic=${p.ic}, gender=${p.gender}, dob=${p.dob}, phone=${p.phone}, address=${p.address}, updated_at=now() where id=${id}`
  revalidatePath(`/patients/${id}`)
  redirect(`/patients/${id}`)
}

export async function deletePatient(id: string) {
  await requireAdmin()
  await sql`delete from patients where id=${id}`
  revalidatePath('/patients')
  redirect('/patients')
}
