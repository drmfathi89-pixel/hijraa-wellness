'use server'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { str, formatIC, parseIC } from '@/lib/utils'
import type { ImportRow } from '@/lib/excel'
import type { FormState } from './auth'

export async function addPastRecord(patientId: string, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser()
  const r = {
    visit_date: str(fd.get('visit_date')), facility: str(fd.get('facility')), doctor: str(fd.get('doctor')),
    complaint: str(fd.get('complaint')), diagnosis: str(fd.get('diagnosis')), treatment: str(fd.get('treatment')), notes: str(fd.get('notes')),
  }
  if (!r.visit_date && !r.diagnosis && !r.complaint && !r.notes) return { error: 'Please fill in at least the visit date and one detail' }
  await sql`insert into past_records (patient_id, visit_date, facility, doctor, complaint, diagnosis, treatment, notes, source, created_by)
    values (${patientId}, ${r.visit_date}, ${r.facility}, ${r.doctor}, ${r.complaint}, ${r.diagnosis}, ${r.treatment}, ${r.notes}, 'manual', ${me.id})`
  revalidatePath(`/patients/${patientId}`, 'layout')
  return { ok: 'Record added' }
}

export async function deletePastRecord(id: string) {
  await requireUser()
  const [r] = await sql`delete from past_records where id=${id} returning patient_id`
  if (r) revalidatePath(`/patients/${r.patient_id}`, 'layout')
}

export type ImportResult = { inserted: number; createdPatients: number; skipped: { row: number; reason: string }[] }

/**
 * Import past records. If patientId is given, every row goes to that patient.
 * Otherwise rows are matched to patients by IC; unknown ICs create a new patient when createMissing and a name is present.
 */
export async function importPastRecords(patientId: string | null, rows: ImportRow[], createMissing: boolean): Promise<ImportResult> {
  const me = await requireUser()
  const res: ImportResult = { inserted: 0, createdPatients: 0, skipped: [] }
  if (!Array.isArray(rows) || rows.length > 5000) throw new Error('Too many rows (max 5000 per import)')
  const cache = new Map<string, string>()

  await sql.begin(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      let pid = patientId
      if (!pid) {
        if (!r.ic) { res.skipped.push({ row: i + 2, reason: 'Missing IC' }); continue }
        const key = r.ic.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
        pid = cache.get(key) ?? null
        if (!pid) {
          const [p] = await tx`select id from patients where upper(regexp_replace(ic, '[^0-9A-Za-z]', '', 'g')) = ${key}`
          if (p) pid = p.id
          else if (createMissing && r.name) {
            const parsed = parseIC(r.ic)
            const g = /^(m|male|lelaki|l)$/i.test(r.gender ?? '') ? 'Male' : /^(f|female|perempuan|p)$/i.test(r.gender ?? '') ? 'Female' : parsed.gender ?? null
            const [np] = await tx`insert into patients (name, ic, gender, dob, phone, address, created_by)
              values (${r.name.toUpperCase()}, ${formatIC(r.ic)}, ${g}, ${r.dob ?? parsed.dob ?? null}, ${r.phone ?? null}, ${r.address ?? null}, ${me.id}) returning id`
            pid = np.id
            res.createdPatients++
          } else {
            res.skipped.push({ row: i + 2, reason: r.name ? `Patient with IC ${r.ic} not found` : `IC ${r.ic} not found (no name to create patient)` })
            continue
          }
          cache.set(key, pid!)
        }
      }
      const hasVisit = r.visit_date || r.complaint || r.diagnosis || r.treatment || r.notes
      if (!hasVisit) continue // patient-only row
      await tx`insert into past_records (patient_id, visit_date, facility, doctor, complaint, diagnosis, treatment, notes, source, created_by)
        values (${pid}, ${r.visit_date ?? null}, ${r.facility ?? null}, ${r.doctor ?? null}, ${r.complaint ?? null}, ${r.diagnosis ?? null}, ${r.treatment ?? null}, ${r.notes ?? null}, 'excel', ${me.id})`
      res.inserted++
    }
  })
  revalidatePath('/patients', 'layout')
  return res
}
