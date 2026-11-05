// Shared (client + server) helpers for mapping Excel rows to past medical records.
export type ImportRow = {
  ic?: string; name?: string; gender?: string; dob?: string; phone?: string; address?: string
  visit_date?: string; facility?: string; doctor?: string; complaint?: string; diagnosis?: string; treatment?: string; notes?: string
}

export const TEMPLATE_HEADERS = ['IC No', 'Patient Name', 'Visit Date', 'Facility', 'Doctor', 'Complaint', 'Diagnosis', 'Treatment', 'Notes', 'Gender', 'Date of Birth', 'Phone', 'Address']

const ALIASES: Record<keyof ImportRow, string[]> = {
  ic: ['ic', 'icno', 'icnumber', 'nric', 'mykad', 'passport', 'icpassport', 'icpassportno', 'idno', 'id'],
  name: ['name', 'patientname', 'patient', 'fullname', 'nama'],
  gender: ['gender', 'sex', 'jantina'],
  dob: ['dob', 'dateofbirth', 'birthdate', 'tarikhlahir'],
  phone: ['phone', 'phoneno', 'tel', 'telephone', 'mobile', 'contact', 'contactno', 'notel'],
  address: ['address', 'alamat'],
  visit_date: ['visitdate', 'date', 'encounterdate', 'tarikh', 'tarikhlawatan', 'dateofvisit', 'visit'],
  facility: ['facility', 'clinic', 'hospital', 'source', 'klinik', 'location'],
  doctor: ['doctor', 'dr', 'physician', 'attendingdoctor', 'doktor', 'provider'],
  complaint: ['complaint', 'chiefcomplaint', 'cc', 'presentingcomplaint', 'symptoms', 'aduan', 'reason'],
  diagnosis: ['diagnosis', 'dx', 'diagnoses', 'diagnosa', 'impression'],
  treatment: ['treatment', 'medication', 'medications', 'management', 'plan', 'rx', 'prescription', 'rawatan', 'ubat'],
  notes: ['notes', 'note', 'remarks', 'remark', 'comments', 'catatan', 'clinicalnotes'],
}

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '')

export function mapHeaders(headers: unknown[]): (keyof ImportRow | null)[] {
  const used = new Set<string>()
  return headers.map((h) => {
    const n = norm(h)
    for (const [field, aliases] of Object.entries(ALIASES)) {
      if (!used.has(field) && aliases.includes(n)) { used.add(field); return field as keyof ImportRow }
    }
    return null
  })
}

function pad(n: number) { return String(n).padStart(2, '0') }

/** Accepts Date, Excel serial number, 'DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', '12 Mar 2024'. Returns YYYY-MM-DD. */
export function toISODate(v: unknown): string | undefined {
  if (v == null || v === '') return undefined
  if (v instanceof Date && !isNaN(+v)) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
  if (typeof v === 'number' && v > 59 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]
    if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return `${y}-${pad(+m[2])}-${pad(+m[1])}` // day-first (Malaysia)
  }
  const d = new Date(s)
  if (!isNaN(+d)) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return undefined
}

export function rowsToRecords(sheet: unknown[][]): { rows: ImportRow[]; mapped: (keyof ImportRow | null)[]; headers: string[] } {
  const headerIdx = sheet.findIndex((r) => mapHeaders(r).filter(Boolean).length >= 2)
  if (headerIdx < 0) return { rows: [], mapped: [], headers: [] }
  const headers = sheet[headerIdx].map((h) => String(h ?? ''))
  const mapped = mapHeaders(sheet[headerIdx])
  const rows: ImportRow[] = []
  for (const r of sheet.slice(headerIdx + 1)) {
    if (!r || r.every((c) => c == null || String(c).trim() === '')) continue
    const o: ImportRow = {}
    mapped.forEach((f, i) => {
      if (!f) return
      const val = r[i]
      if (val == null || String(val).trim() === '') return
      if (f === 'visit_date' || f === 'dob') o[f] = toISODate(val)
      else o[f] = val instanceof Date ? toISODate(val) : String(val).trim()
    })
    rows.push(o)
  }
  return { rows, mapped, headers }
}
