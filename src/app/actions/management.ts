'use server'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { str, num, TZ_OFFSET, formatIC, parseIC } from '@/lib/utils'
import type { FormState } from './auth'

const APPT = ['scheduled', 'completed', 'cancelled', 'no-show']
const TREAT = ['active', 'completed', 'stopped']

function revalidateAll(pid: string) {
  revalidatePath(`/patients/${pid}`, 'layout')
  revalidatePath('/appointments')
  revalidatePath('/')
}

export async function addAppointment(patientId: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser()
  const at = str(fd.get('scheduled_at'))
  if (!at) return { error: 'Please choose date & time' }
  let pid = patientId ?? str(fd.get('patient_id'))
  let note = ''
  if (!pid && fd.get('new_patient') === '1') {
    // register the patient as part of the booking (same rules as the full registration form)
    const name = str(fd.get('new_name'))?.toUpperCase()
    const rawIc = str(fd.get('new_ic'))
    if (!name || !rawIc) return { error: 'Enter the new patient\'s name and IC / passport number' }
    const ic = formatIC(rawIc)
    const [existing] = await sql<{ id: string; name: string }[]>`select id, name from patients
      where upper(regexp_replace(ic, '[^0-9A-Za-z]', '', 'g')) = upper(regexp_replace(${ic}, '[^0-9A-Za-z]', '', 'g'))`
    if (existing) { pid = existing.id; note = ` for ${existing.name} (IC already registered)` }
    else {
      const info = parseIC(ic)
      const [p] = await sql<{ id: string }[]>`insert into patients (name, ic, gender, dob, phone, created_by)
        values (${name}, ${ic}, ${info.gender ?? null}, ${info.dob ?? null}, ${str(fd.get('new_phone'))}, ${me.id}) returning id`
      pid = p.id; note = ` and ${name} registered as a new patient`
      revalidatePath('/patients')
    }
  }
  if (!pid) return { error: 'Please select a patient, or tap New patient' }
  await sql`insert into appointments (patient_id, scheduled_at, duration_min, reason, notes, created_by)
    values (${pid}, ${`${at}:00${TZ_OFFSET}`}, ${num(fd.get('duration_min')) ?? 15}, ${str(fd.get('reason'))}, ${str(fd.get('notes'))}, ${me.id})`
  revalidateAll(pid)
  return { ok: `Appointment booked${note}` }
}

export async function setAppointmentStatus(id: string, status: string) {
  await requireUser()
  if (!APPT.includes(status)) return
  const [a] = await sql`update appointments set status=${status} where id=${id} returning patient_id`
  if (a) revalidateAll(a.patient_id)
}

export async function deleteAppointment(id: string) {
  await requireUser()
  const [a] = await sql`delete from appointments where id=${id} returning patient_id`
  if (a) revalidateAll(a.patient_id)
}

export async function addTreatment(patientId: string, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser()
  const name = str(fd.get('name'))
  if (!name) return { error: 'Treatment name is required' }
  await sql`insert into treatments (patient_id, kind, name, dose, frequency, duration, instructions, created_by)
    values (${patientId}, ${str(fd.get('kind')) ?? 'Medication'}, ${name}, ${str(fd.get('dose'))}, ${str(fd.get('frequency'))}, ${str(fd.get('duration'))}, ${str(fd.get('instructions'))}, ${me.id})`
  revalidateAll(patientId)
  return { ok: 'Treatment added' }
}

export async function setTreatmentStatus(id: string, status: string) {
  await requireUser()
  if (!TREAT.includes(status)) return
  const [t] = await sql`update treatments set status=${status} where id=${id} returning patient_id`
  if (t) revalidateAll(t.patient_id)
}

export async function deleteTreatment(id: string) {
  await requireUser()
  const [t] = await sql`delete from treatments where id=${id} returning patient_id`
  if (t) revalidateAll(t.patient_id)
}
