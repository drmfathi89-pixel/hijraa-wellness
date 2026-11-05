'use server'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'
import type { FormState } from './auth'

/** Record that a WhatsApp message was opened for sending (called as the user taps Send). */
export async function logMessage(input: { patientId: string; kind: 'reminder' | 'blast' | 'single'; message: string; appointmentId?: string; campaign?: string }) {
  const me = await requireUser()
  if (!input.patientId || !input.message?.trim()) return
  await sql`insert into message_logs (patient_id, appointment_id, kind, campaign, message, sent_by)
    values (${input.patientId}, ${input.appointmentId ?? null}, ${input.kind}, ${input.campaign ?? null}, ${input.message.slice(0, 4000)}, ${me.id})`
  if (input.appointmentId) await sql`update appointments set reminder_sent_at = now() where id = ${input.appointmentId}`
  revalidatePath('/messages')
}

export async function saveTemplates(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin()
  const vals = { reminder: String(fd.get('reminder') ?? '').trim(), blast: String(fd.get('blast') ?? '').trim(), clinic: String(fd.get('clinic') ?? '').trim() }
  if (!vals.reminder || !vals.clinic) return { error: 'Reminder message and clinic name are required' }
  for (const [k, v] of Object.entries(vals)) {
    await sql`insert into app_settings (key, value) values (${'wa_' + k}, ${v}) on conflict (key) do update set value = excluded.value`
  }
  revalidatePath('/messages')
  return { ok: 'Templates saved' }
}
