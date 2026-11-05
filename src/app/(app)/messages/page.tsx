import Link from 'next/link'
import { sql } from '@/lib/db'
import { requireUser, isAdmin } from '@/lib/auth'
import { getTemplates } from '@/lib/settings'
import { saveTemplates } from '@/app/actions/messages'
import { TZ, todayLocal, fmtDateTime } from '@/lib/utils'
import { waNumber, niceName, fill, apptWhen } from '@/lib/whatsapp'
import { PageHeader, Empty, Field } from '@/components/ui'
import SendQueue, { type QueueItem } from '@/components/SendQueue'
import MiniForm from '@/components/MiniForm'

export const metadata = { title: 'WhatsApp' }

type SP = { tab?: string; d?: string; campaign?: string; msg?: string; gender?: string; amin?: string; amax?: string; dx?: string; seen?: string }

function addDays(date: string, n: number) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const sentLabel = (d: Date | null) => (d ? fmtDateTime(d) : null)

export default async function Messages({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireUser()
  const sp = await searchParams
  const tab = sp.tab === 'blast' || sp.tab === 'templates' ? sp.tab : 'reminders'
  const tpl = await getTemplates()
  const tabs = [['reminders', 'TCA reminders'], ['blast', 'Blast message'], ...(isAdmin(me) ? [['templates', 'Templates']] : [])]

  return (
    <>
      <PageHeader title="WhatsApp" subtitle="Customer service: appointment (TCA) reminders and message blasts" />
      <div className="mb-4 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/messages?tab=${k}`} className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold ${tab === k ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</Link>
        ))}
      </div>
      {tab === 'reminders' && <Reminders date={sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : addDays(todayLocal(), 1)} tpl={tpl} />}
      {tab === 'blast' && <Blast sp={sp} tpl={tpl} />}
      {tab === 'templates' && isAdmin(me) && (
        <section className="card card-pad">
          <p className="mb-3 text-sm text-slate-600">Placeholders: <code>{'{name}'}</code> patient name, <code>{'{date}'}</code> and <code>{'{time}'}</code> appointment, <code>{'{clinic}'}</code> clinic name.</p>
          <MiniForm action={saveTemplates} label="Edit" submit="Save templates" defaultOpen>
            <Field label="Clinic name" className="sm:col-span-2"><input name="clinic" className="input" defaultValue={tpl.clinic} required /></Field>
            <Field label="TCA reminder message" className="sm:col-span-2"><textarea name="reminder" className="input" rows={4} defaultValue={tpl.reminder} required /></Field>
            <Field label="Default blast message" className="sm:col-span-2"><textarea name="blast" className="input" rows={3} defaultValue={tpl.blast} /></Field>
          </MiniForm>
        </section>
      )}
    </>
  )
}

async function Reminders({ date, tpl }: { date: string; tpl: { reminder: string; clinic: string } }) {
  const rows = await sql<{ id: string; patient_id: string; scheduled_at: Date; reason: string | null; reminder_sent_at: Date | null; name: string; phone: string | null }[]>`
    select a.id, a.patient_id, a.scheduled_at, a.reason, a.reminder_sent_at, p.name, p.phone from appointments a join patients p on p.id = a.patient_id
    where a.status = 'scheduled' and (a.scheduled_at at time zone ${TZ})::date = ${date}::date order by a.scheduled_at`
  const items: QueueItem[] = rows.map((r) => {
    const w = apptWhen(r.scheduled_at)
    return { key: r.id, patientId: r.patient_id, appointmentId: r.id, name: r.name, sub: `${w.time}${r.reason ? ` · ${r.reason}` : ''}${r.phone ? ` · ${r.phone}` : ''}`,
      number: waNumber(r.phone), message: fill(tpl.reminder, { name: niceName(r.name), date: w.date, time: w.time, clinic: tpl.clinic }), sentAt: sentLabel(r.reminder_sent_at) }
  })
  const label = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return (
    <div className="space-y-3">
      <form className="card card-pad flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="reminders" />
        <Field label="Appointments on"><input type="date" name="d" defaultValue={date} className="input" /></Field>
        <button className="btn-secondary">Show</button>
        <Link className="btn-ghost" href={`/messages?tab=reminders&d=${addDays(todayLocal(), 1)}`}>Tomorrow</Link>
        <Link className="btn-ghost" href={`/messages?tab=reminders&d=${todayLocal()}`}>Today</Link>
      </form>
      <h2 className="h-section">{label}: {rows.length} appointment{rows.length === 1 ? '' : 's'}</h2>
      {rows.length === 0 ? <Empty title="No scheduled appointments on this day" /> : <SendQueue items={items} kind="reminder" />}
    </div>
  )
}

async function Blast({ sp, tpl }: { sp: SP; tpl: { blast: string; clinic: string } }) {
  const gender = sp.gender === 'Male' || sp.gender === 'Female' ? sp.gender : ''
  const amin = Number(sp.amin) || null, amax = Number(sp.amax) || null
  const dx = (sp.dx ?? '').trim().toLowerCase(), seen = Number(sp.seen) || 0
  const msg = sp.msg ?? tpl.blast
  const campaign = (sp.campaign ?? '').trim()
  const ready = !!campaign && !!msg.trim()

  const recipients = await sql<{ id: string; name: string; phone: string | null }[]>`
    select p.id, p.name, p.phone from patients p
    where p.phone is not null and p.phone <> ''
      ${gender ? sql`and p.gender = ${gender}` : sql``}
      ${amin ? sql`and p.dob is not null and date_part('year', age(p.dob)) >= ${amin}` : sql``}
      ${amax ? sql`and p.dob is not null and date_part('year', age(p.dob)) <= ${amax}` : sql``}
      ${dx ? sql`and (exists (select 1 from encounters e where e.patient_id = p.id and not e.diagnosis_sensitive and lower(coalesce(e.diagnosis_notes, '')) like ${'%' + dx + '%'})
                  or exists (select 1 from past_records r where r.patient_id = p.id and lower(coalesce(r.diagnosis, '')) like ${'%' + dx + '%'}))` : sql``}
      ${seen ? sql`and exists (select 1 from encounters e where e.patient_id = p.id and e.encounter_at >= now() - make_interval(days => ${seen}))` : sql``}
    order by p.name limit 1000`
  const sent = ready ? await sql<{ patient_id: string; at: Date }[]>`select patient_id, max(created_at) as at from message_logs where campaign = ${campaign} group by patient_id` : []
  const sentMap = new Map(sent.map((s) => [s.patient_id, s.at]))
  const items: QueueItem[] = recipients.map((r) => ({ key: r.id, patientId: r.id, name: r.name, sub: r.phone ?? '', number: waNumber(r.phone),
    message: fill(msg, { name: niceName(r.name), clinic: tpl.clinic }), sentAt: sentLabel(sentMap.get(r.id) ?? null) }))

  return (
    <div className="space-y-3">
      <form className="card card-pad grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="tab" value="blast" />
        <Field label="Campaign name" className="sm:col-span-2"><input name="campaign" className="input" required defaultValue={campaign || `Blast ${todayLocal()}`} /></Field>
        <Field label="Gender"><select name="gender" className="input" defaultValue={gender}><option value="">All</option><option>Male</option><option>Female</option></select></Field>
        <Field label="Visited in last"><select name="seen" className="input" defaultValue={String(seen)}><option value="0">Any time</option><option value="30">30 days</option><option value="90">3 months</option><option value="180">6 months</option><option value="365">12 months</option></select></Field>
        <Field label="Age from"><input name="amin" type="number" min="0" className="input" defaultValue={amin ?? ''} /></Field>
        <Field label="Age to"><input name="amax" type="number" min="0" className="input" defaultValue={amax ?? ''} /></Field>
        <Field label="Diagnosis contains" className="sm:col-span-2"><input name="dx" className="input" defaultValue={sp.dx ?? ''} placeholder="e.g. diabetes" /></Field>
        <Field label="Message" className="sm:col-span-4">
          <textarea name="msg" className="input" rows={4} required defaultValue={msg} placeholder="Use {name} for the patient's name" />
        </Field>
        <div className="sm:col-span-4"><button className="btn-primary">Preview recipients</button></div>
      </form>
      <p className="text-xs text-slate-500">Send only to patients who expect messages from the clinic. Sending many messages quickly from one number can get it blocked by WhatsApp, so space them out.</p>
      {!ready ? null : recipients.length === 0 ? <Empty title="No patients match these filters" /> : (
        <>
          <h2 className="h-section">{recipients.length} recipient{recipients.length === 1 ? '' : 's'} · campaign “{campaign}”</h2>
          <SendQueue items={items} kind="blast" campaign={campaign} />
        </>
      )}
    </div>
  )
}
