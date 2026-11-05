export type Investigation = { name: string; result: string; unit: string; notes: string }
export type Diagnosis = { description: string; type: 'Primary' | 'Secondary' | 'Differential'; code: string }
export type TreatmentRow = { id?: string; kind: string; name: string; dose: string; frequency: string; duration: string; instructions: string }

export type EncounterPayload = {
  encounter_at: string // YYYY-MM-DDTHH:mm local
  visit_type: string
  chief_complaint: string
  history: string
  examination: string
  notes: string
  vitals: Record<'bp_systolic' | 'bp_diastolic' | 'pulse' | 'resp_rate' | 'temperature' | 'spo2' | 'weight' | 'height' | 'glucose' | 'pain_score', string>
  investigations: Investigation[]
  diagnoses: Diagnosis[]
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
  doctor_id: string | null; doctor_name?: string | null; updated_at: Date
}
