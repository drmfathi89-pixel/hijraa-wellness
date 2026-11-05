// WhatsApp click-to-chat helpers (no API account needed; opens WhatsApp with the message ready).
import { TZ } from './utils'

/** Malaysian numbers to international digits: 012-345 6789 -> 60123456789. Returns null if unusable. */
export function waNumber(phone?: string | null): string | null {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '60' + d.slice(1)
  else if (d.startsWith('1') && d.length >= 9 && d.length <= 10) d = '60' + d
  return d.length >= 10 && d.length <= 15 ? d : null
}

export const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`

/** "SITI AMINAH BINTI ABDULLAH" -> "Siti Aminah binti Abdullah" */
export function niceName(n: string): string {
  return n.toLowerCase().split(/\s+/).map((w) => (['bin', 'binti', 'bt', 'a/l', 'a/p'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
}

export const DEFAULT_TEMPLATES = {
  reminder: 'Salam {name}, ini peringatan temu janji (TCA) anda di {clinic} pada {date}, jam {time}. Sila balas mesej ini untuk mengesahkan. Terima kasih.',
  blast: 'Salam {name}, ',
  clinic: 'Hijraa Wellness',
}

export function fill(tpl: string, v: { name?: string; date?: string; time?: string; clinic?: string }) {
  return tpl.replace(/\{(name|date|time|clinic)\}/g, (_, k: keyof typeof v) => v[k] ?? '')
}

export function apptWhen(at: Date | string) {
  const d = new Date(at)
  return {
    date: d.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }),
    time: d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }),
  }
}
