import 'server-only'
import { sql } from './db'

export type Patient = { id: string; name: string; ic: string; gender: string | null; dob: string | null; phone: string | null; address: string | null; created_at: Date; updated_at: Date }

export async function searchPatients(q: string, limit = 50) {
  const term = q.trim()
  if (!term) return sql<Patient[]>`select * from patients order by updated_at desc limit ${limit}`
  const like = `%${term.toLowerCase()}%`
  const norm = `%${term.replace(/[^0-9A-Za-z]/g, '').toUpperCase()}%`
  const phone = `%${term.replace(/\D/g, '')}%`
  return sql<Patient[]>`select * from patients
    where lower(name) like ${like}
      or (${norm} <> '%%' and upper(regexp_replace(ic, '[^0-9A-Za-z]', '', 'g')) like ${norm})
      or (${phone} <> '%%' and regexp_replace(coalesce(phone,''), '\\D', '', 'g') like ${phone})
    order by name limit ${limit}`
}

export async function getPatient(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined
  const [p] = await sql<Patient[]>`select * from patients where id = ${id}`
  return p
}

import type { Encounter } from './types'

export async function listEncounters(patientId: string) {
  return sql<Encounter[]>`select e.*, u.name as doctor_name from encounters e left join users u on u.id = e.doctor_id
    where e.patient_id = ${patientId} order by e.encounter_at desc`
}

export async function getEncounter(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined
  const [e] = await sql<Encounter[]>`select e.*, u.name as doctor_name from encounters e left join users u on u.id = e.doctor_id where e.id = ${id}`
  return e
}

export type Treatment = { id: string; patient_id: string; encounter_id: string | null; kind: string; name: string; dose: string | null; frequency: string | null; duration: string | null; instructions: string | null; status: string; created_at: Date }
export type Appointment = { id: string; patient_id: string; encounter_id: string | null; scheduled_at: Date; duration_min: number; reason: string | null; status: string; notes: string | null; patient_name?: string; patient_ic?: string; patient_phone?: string | null }
