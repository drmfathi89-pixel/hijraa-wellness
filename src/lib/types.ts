export type Investigation = { name: string; result: string; unit: string; notes: string }
export type Diagnosis = { description: string; type: 'Primary' | 'Secondary' | 'Differential'; code: string }
export type Charge = { item: string; qty: number; price: number }
export type ChargeRow = { item: string; qty: string; price: string }
export type TreatmentRow = { id?: string; kind: string; name: string; dose: string; frequency: string; duration: string; instructions: string }

export type EncounterPayload = {
  encounter_at: string // YYYY-MM-DDTHH:mm local
  visit_type: string
  chief_complaint: string
  history: string
  examination: string
  notes: string
  vitals: Record<'bp_systolic' | 'bp_diastolic' | 'pulse' | 'resp_rate' | 'temperature' | 'spo2' | 'weight' | 'height' | 'glucose' | 'pain_score', string>
  investigation_notes: string
  imaging_notes: string
  diagnosis_list: string[]
  diagnosis_sensitive: boolean
  diagnosis_notifiable: boolean
  charges: ChargeRow[]
  plan: string
  treatments: TreatmentRow[]
  followup: { at: string; reason: string }
}

export type Encounter = {
  id: string; patient_id: string; encounter_at: Date; visit_type: string; status: 'open' | 'closed'
  chief_complaint: string | null; history: string | null; examination: string | null; notes: string | null
  bp_systolic: number | null; bp_diastolic: number | null; pulse: number | null; resp_rate: number | null
  temperature: number | null; spo2: number | null; weight: number | null; height: number | null
  glucose: number | null; pain_score: number | null
  investigations: Investigation[]; diagnoses: Diagnosis[]; plan: string | null
  investigation_notes: string | null; diagnosis_notes: string | null; imaging_notes: string | null
  diagnosis_sensitive: boolean; diagnosis_notifiable: boolean; charges: Charge[]
  doctor_id: string | null; doctor_name?: string | null; updated_at: Date
}

/** Investigation notes as text. Older encounters stored a structured list; show that as lines. */
export function investigationText(e: Pick<Encounter, 'investigation_notes' | 'investigations'>): string {
  if (e.investigation_notes) return e.investigation_notes
  return (e.investigations ?? []).map((i) => [i.name, [i.result, i.unit].filter(Boolean).join(' '), i.notes].filter(Boolean).join(': ')).join('\n')
}

/** Diagnosis as text (free text, or the older structured list joined into lines). */
export function diagnosisText(e: Pick<Encounter, 'diagnosis_notes' | 'diagnoses'>): string {
  if (e.diagnosis_notes) return e.diagnosis_notes
  return (e.diagnoses ?? []).map((d) => d.description + (d.code ? ` (${d.code})` : '')).join('\n')
}

/** First line of the diagnosis, for one-line lists. */
export function diagnosisLine(e: Pick<Encounter, 'diagnosis_notes' | 'diagnoses'> & { diagnosis_sensitive?: boolean }): string {
  if (e.diagnosis_sensitive) return 'Sensitive diagnosis (open the encounter to view)'
  return diagnosisText(e).split('\n').map((l) => l.trim()).filter(Boolean).join(', ')
}

export const chargesTotal = (c: { qty: number | string; price: number | string }[]) =>
  c.reduce((t, x) => t + (Number(x.qty) || 0) * (Number(x.price) || 0), 0)

export const rm = (n: number) => 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const CHARGE_KINDS = ['Consultation', 'Procedure', 'Medication', 'Injection', 'Laboratory', 'Imaging', 'Dressing', 'Medical certificate', 'Other']
export type PriceItem = { id: string; kind: string; name: string; price: number; active: boolean }
