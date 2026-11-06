export const TZ = 'Asia/Kuala_Lumpur'
export const TZ_OFFSET = '+08:00'

export function calcAge(dob?: string | null): string {
  if (!dob) return '-'
  const [y, m, d] = dob.split('-').map(Number)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  if (age < 0) return '-'
  if (age < 2) {
    const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) - (now.getDate() < d ? 1 : 0)
    return `${months} mo`
  }
  return `${age} y`
}

/** Malaysian MyKad: YYMMDD-PB-###G. Returns DOB + gender when parseable. */
export function parseIC(ic: string): { dob?: string; gender?: 'Male' | 'Female' } {
  const digits = ic.replace(/\D/g, '')
  if (digits.length !== 12) return {}
  const yy = Number(digits.slice(0, 2))
  const mm = Number(digits.slice(2, 4))
  const dd = Number(digits.slice(4, 6))
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return {}
  const currentYY = new Date().getFullYear() % 100
  const year = yy > currentYY ? 1900 + yy : 2000 + yy
  const dob = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  const gender = Number(digits[11]) % 2 === 1 ? 'Male' : 'Female'
  return { dob, gender }
}

export function formatIC(ic: string): string {
  const d = ic.replace(/\D/g, '')
  if (d.length === 12 && /^\d+$/.test(ic.replace(/-/g, ''))) return `${d.slice(0, 6)}-${d.slice(6, 8)}-${d.slice(8)}`
  return ic.trim().toUpperCase()
}

export function fmtDate(d?: string | Date | null): string {
  if (!d) return '-'
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ })
}

export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ })
}

export function fmtTime(d: string | Date): string {
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ })
}

/** 'YYYY-MM-DDTHH:mm' in clinic local time, for <input type="datetime-local"> */
export function toLocalInput(d: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(d))
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`
}

export function todayLocal(): string {
  return toLocalInput(new Date()).slice(0, 10)
}

export function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function bmi(weight?: number | null, height?: number | null): string | null {
  if (!weight || !height) return null
  const h = height / 100
  return (weight / (h * h)).toFixed(1)
}

export const ROLES = ['superadmin', 'admin', 'doctor', 'staff'] as const
export const ROLE_LABEL: Record<string, string> = { superadmin: 'Superadmin', admin: 'Admin', doctor: 'Doctor', staff: 'Staff' }
export const rolesText = (r: string[]) => r.map((x) => ROLE_LABEL[x] ?? x).join(' + ')

/** Roles ticked in a form (checkboxes named "roles"), in a fixed order. */
export function readRoles(fd: FormData): string[] {
  const picked = new Set(fd.getAll('roles').map(String))
  return ROLES.filter((r) => picked.has(r))
}

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/

/** Lower-cased username, or null if it isn't 3-32 letters, digits, dots, dashes or underscores. */
export function cleanUsername(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim().toLowerCase()
  return USERNAME_RE.test(s) ? s : null
}

export function str(v: FormDataEntryValue | null): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

export function num(v: FormDataEntryValue | null | undefined | string | number): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export type Flag = 'high' | 'low' | null
export function vitalFlag(key: string, v?: number | null, other?: number | null): Flag {
  if (v == null) return null
  switch (key) {
    case 'bp': return v >= 140 || (other ?? 0) >= 90 ? 'high' : v < 90 || (other != null && other < 60) ? 'low' : null
    case 'pulse': return v > 100 ? 'high' : v < 60 ? 'low' : null
    case 'resp_rate': return v > 20 ? 'high' : v < 12 ? 'low' : null
    case 'temperature': return v >= 37.5 ? 'high' : v < 35.5 ? 'low' : null
    case 'spo2': return v < 95 ? 'low' : null
    case 'glucose': return v > 11 ? 'high' : v < 4 ? 'low' : null
    case 'pain_score': return v >= 7 ? 'high' : null
    case 'bmi': return v >= 25 ? 'high' : v < 18.5 ? 'low' : null
  }
  return null
}
