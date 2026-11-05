'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { num, TZ_OFFSET } from '@/lib/utils'
import type { EncounterPayload } from '@/lib/types'

const VITALS = ['bp_systolic', 'bp_diastolic', 'pulse', 'resp_rate', 'temperature', 'spo2', 'weight', 'height', 'glucose', 'pain_score'] as const
const t = (s?: string | null) => (s && s.trim() ? s.trim() : null)

export async function startEncounter(patientId: string) {
  const me = await requireUser()
  const [e] = await sql`insert into encounters (patient_id, doctor_id) values (${patientId}, ${me.id}) returning id`
  // mark today's scheduled appointment for this patient as completed
  await sql`update appointments set status='completed' where patient_id=${patientId} and status='scheduled'
    and (scheduled_at at time zone 'Asia/Kuala_Lumpur')::date = (now() at time zone 'Asia/Kuala_Lumpur')::date`
  redirect(`/patients/${patientId}/encounters/${e.id}`)
}

export async function saveEncounter(id: string, data: EncounterPayload, close: boolean): Promise<{ error?: string; ok?: boolean }> {
  const me = await requireUser()
  const [enc] = await sql`select patient_id from encounters where id=${id}`
  if (!enc) return { error: 'Encounter not found' }
  const pid = enc.patient_id as string
  const v = Object.fromEntries(VITALS.map((k) => [k, num(data.vitals?.[k])]))
  const dxList = (data.diagnosis_list ?? []).map((x) => x.trim()).filter(Boolean)
  if (close && dxList.length === 0) return { error: 'Please enter a diagnosis before completing the encounter' }
  const charges = (data.charges ?? [])
    .map((c) => ({ item: c.item.trim(), qty: Number(c.qty) || 1, price: Math.round((Number(c.price) || 0) * 100) / 100 }))
    .filter((c) => c.item)
  const at = data.encounter_at ? `${data.encounter_at}:00${TZ_OFFSET}` : new Date().toISOString()

  await sql.begin(async (tx) => {
    await tx`update encounters set
      encounter_at=${at}, visit_type=${data.visit_type || 'Consultation'},
      chief_complaint=${t((data.history ?? '').split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 200))}, history=${t(data.history)}, examination=${t(data.examination)}, notes=${t(data.notes)},
      bp_systolic=${v.bp_systolic}, bp_diastolic=${v.bp_diastolic}, pulse=${v.pulse}, resp_rate=${v.resp_rate},
      temperature=${v.temperature}, spo2=${v.spo2}, weight=${v.weight}, height=${v.height}, glucose=${v.glucose}, pain_score=${v.pain_score},
      investigation_notes=${t(data.investigation_notes)}, imaging_notes=${t(data.imaging_notes)}, diagnosis_notes=${t(dxList.join('\n'))},
      diagnosis_sensitive=${!!data.diagnosis_sensitive}, diagnosis_notifiable=${!!data.diagnosis_notifiable}, charges=${tx.json(charges)},
      investigations='[]'::jsonb, diagnoses='[]'::jsonb,
      plan=${t(data.plan)}, status=${close ? 'closed' : 'open'}, updated_at=now()
      where id=${id}`

    // treatments: update kept rows, insert new, delete removed
    const rows = (data.treatments ?? []).filter((r) => t(r.name))
    const keep = rows.filter((r) => r.id).map((r) => r.id as string)
    if (keep.length) await tx`delete from treatments where encounter_id=${id} and not (id = any(${keep}::uuid[]))`
    else await tx`delete from treatments where encounter_id=${id}`
    for (const r of rows) {
      if (r.id) {
        await tx`update treatments set kind=${r.kind || 'Medication'}, name=${r.name.trim()}, dose=${t(r.dose)}, frequency=${t(r.frequency)},
          duration=${t(r.duration)}, instructions=${t(r.instructions)} where id=${r.id} and encounter_id=${id}`
      } else {
        await tx`insert into treatments (patient_id, encounter_id, kind, name, dose, frequency, duration, instructions, created_by)
          values (${pid}, ${id}, ${r.kind || 'Medication'}, ${r.name.trim()}, ${t(r.dose)}, ${t(r.frequency)}, ${t(r.duration)}, ${t(r.instructions)}, ${me.id})`
      }
    }

    // follow-up appointment linked to this encounter
    const [appt] = await tx`select id from appointments where encounter_id=${id} limit 1`
    if (data.followup?.at) {
      const when = `${data.followup.at}:00${TZ_OFFSET}`
      if (appt) await tx`update appointments set scheduled_at=${when}, reason=${t(data.followup.reason)} where id=${appt.id}`
      else await tx`insert into appointments (patient_id, encounter_id, scheduled_at, reason, created_by) values (${pid}, ${id}, ${when}, ${t(data.followup.reason) ?? 'Follow-up'}, ${me.id})`
    } else if (appt) {
      await tx`delete from appointments where id=${appt.id} and status='scheduled'`
    }
  })
  revalidatePath(`/patients/${pid}`, 'layout')
  return { ok: true }
}

export async function reopenEncounter(id: string) {
  await requireUser()
  const [e] = await sql`update encounters set status='open', updated_at=now() where id=${id} returning patient_id`
  revalidatePath(`/patients/${e.patient_id}`, 'layout')
}

export async function deleteEncounter(id: string) {
  await requireUser()
  const [e] = await sql`delete from encounters where id=${id} returning patient_id`
  revalidatePath(`/patients/${e.patient_id}`, 'layout')
  redirect(`/patients/${e.patient_id}/encounters`)
}
