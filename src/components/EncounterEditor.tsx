'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, CheckCircle2, Activity, FlaskConical, ClipboardList, Pill, CalendarPlus, NotebookPen } from 'lucide-react'
import { saveEncounter } from '@/app/actions/encounters'
import type { EncounterPayload, Investigation, Diagnosis, TreatmentRow } from '@/lib/types'
import { bmi, vitalFlag, type Flag } from '@/lib/utils'

const VISIT_TYPES = ['Consultation', 'Follow-up', 'Walk-in', 'Emergency', 'Telemedicine', 'Procedure', 'Health screening']
const QUICK_INV = ['FBC', 'Renal profile', 'LFT', 'Lipid profile', 'HbA1c', 'FBS', 'UFEME', 'Urine pregnancy test', 'ECG', 'Chest X-ray', 'Dextrostix', 'TFT']
const KINDS = ['Medication', 'Procedure', 'Therapy', 'Injection', 'Dressing', 'Referral', 'Other']
const FREQ = ['OD', 'BD', 'TDS', 'QID', 'ON', 'PRN', 'STAT', 'Q4H', 'Q6H', 'Q8H']

function Section({ icon: Icon, title, children, right }: { icon: React.ElementType; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="card card-pad">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon size={17} /></span>
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function FlagTag({ f }: { f: Flag }) {
  if (!f) return null
  return <span className={`ml-1 rounded px-1 text-[10px] font-bold ${f === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f === 'high' ? 'H' : 'L'}</span>
}

export default function EncounterEditor({ id, patientId, initial }: { id: string; patientId: string; initial: EncounterPayload }) {
  const router = useRouter()
  const [d, setD] = useState<EncounterPayload>(initial)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const set = <K extends keyof EncounterPayload>(k: K, v: EncounterPayload[K]) => setD((s) => ({ ...s, [k]: v }))
  const setV = (k: keyof EncounterPayload['vitals'], v: string) => setD((s) => ({ ...s, vitals: { ...s.vitals, [k]: v } }))
  const n = (k: keyof EncounterPayload['vitals']) => (d.vitals[k] === '' ? null : Number(d.vitals[k]))

  function updRow<T>(key: 'investigations' | 'diagnoses' | 'treatments', i: number, patch: Partial<T>) {
    setD((s) => ({ ...s, [key]: (s[key] as T[]).map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
  }
  function delRow(key: 'investigations' | 'diagnoses' | 'treatments', i: number) {
    setD((s) => ({ ...s, [key]: (s[key] as unknown[]).filter((_, j) => j !== i) }))
  }

  function submit(close: boolean) {
    setMsg(null)
    start(async () => {
      const res = await saveEncounter(id, d, close)
      if (res.error) return setMsg({ type: 'error', text: res.error })
      if (close) router.push(`/patients/${patientId}/encounters/${id}`)
      else setMsg({ type: 'ok', text: 'Draft saved' })
      router.refresh()
    })
  }

  const bmiVal = bmi(n('weight'), n('height'))
  const vit: { k: keyof EncounterPayload['vitals']; label: string; unit: string; step?: string; flag?: Flag }[] = [
    { k: 'pulse', label: 'Pulse', unit: 'bpm', flag: vitalFlag('pulse', n('pulse')) },
    { k: 'resp_rate', label: 'Resp. rate', unit: '/min', flag: vitalFlag('resp_rate', n('resp_rate')) },
    { k: 'temperature', label: 'Temp', unit: '°C', step: '0.1', flag: vitalFlag('temperature', n('temperature')) },
    { k: 'spo2', label: 'SpO₂', unit: '%', flag: vitalFlag('spo2', n('spo2')) },
    { k: 'weight', label: 'Weight', unit: 'kg', step: '0.1' },
    { k: 'height', label: 'Height', unit: 'cm', step: '0.1' },
    { k: 'glucose', label: 'Glucose', unit: 'mmol/L', step: '0.1', flag: vitalFlag('glucose', n('glucose')) },
    { k: 'pain_score', label: 'Pain score', unit: '/10', flag: vitalFlag('pain_score', n('pain_score')) },
  ]

  return (
    <div className="space-y-4 pb-24">
      <div className="card card-pad grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Date &amp; time</label>
          <input type="datetime-local" className="input" value={d.encounter_at} onChange={(e) => set('encounter_at', e.target.value)} />
        </div>
        <div>
          <label className="label">Visit type</label>
          <select className="input" value={d.visit_type} onChange={(e) => set('visit_type', e.target.value)}>
            {VISIT_TYPES.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <Section icon={NotebookPen} title="Patient notes">
        <div className="grid gap-3">
          <div><label className="label">Chief complaint</label><input className="input" value={d.chief_complaint} onChange={(e) => set('chief_complaint', e.target.value)} placeholder="e.g. Fever and cough x 3 days" /></div>
          <div><label className="label">History of presenting illness</label><textarea className="input" rows={4} value={d.history} onChange={(e) => set('history', e.target.value)} /></div>
          <div><label className="label">Physical examination</label><textarea className="input" rows={4} value={d.examination} onChange={(e) => set('examination', e.target.value)} /></div>
          <div><label className="label">Additional notes</label><textarea className="input" rows={3} value={d.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
      </Section>

      <Section icon={Activity} title="Vital signs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <label className="label">Blood pressure (mmHg)<FlagTag f={vitalFlag('bp', n('bp_systolic'), n('bp_diastolic'))} /></label>
            <div className="flex items-center gap-2">
              <input className="input" inputMode="numeric" type="number" placeholder="Sys" value={d.vitals.bp_systolic} onChange={(e) => setV('bp_systolic', e.target.value)} />
              <span className="text-xl text-slate-400">/</span>
              <input className="input" inputMode="numeric" type="number" placeholder="Dia" value={d.vitals.bp_diastolic} onChange={(e) => setV('bp_diastolic', e.target.value)} />
            </div>
          </div>
          {vit.map((x) => (
            <div key={x.k}>
              <label className="label">{x.label} <span className="normal-case text-slate-400">({x.unit})</span><FlagTag f={x.flag ?? null} /></label>
              <input className="input" type="number" inputMode="decimal" step={x.step ?? '1'} value={d.vitals[x.k]} onChange={(e) => setV(x.k, e.target.value)} />
            </div>
          ))}
          <div>
            <label className="label">BMI<FlagTag f={vitalFlag('bmi', bmiVal ? Number(bmiVal) : null)} /></label>
            <div className="input bg-slate-50 text-slate-600">{bmiVal ?? '-'}</div>
          </div>
        </div>
      </Section>

      <Section icon={FlaskConical} title="Investigations" right={<button type="button" className="btn-secondary btn-sm" onClick={() => set('investigations', [...d.investigations, { name: '', result: '', unit: '', notes: '' }])}><Plus size={14} /> Add</button>}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {QUICK_INV.map((q) => (
            <button key={q} type="button" className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50"
              onClick={() => set('investigations', [...d.investigations, { name: q, result: '', unit: '', notes: '' }])}>+ {q}</button>
          ))}
        </div>
        <div className="space-y-2">
          {d.investigations.length === 0 && <p className="text-sm text-slate-400">No investigations added.</p>}
          {d.investigations.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-xl bg-slate-50 p-2">
              <input className="input col-span-12 sm:col-span-4" placeholder="Test" value={r.name} onChange={(e) => updRow<Investigation>('investigations', i, { name: e.target.value })} />
              <input className="input col-span-7 sm:col-span-3" placeholder="Result" value={r.result} onChange={(e) => updRow<Investigation>('investigations', i, { result: e.target.value })} />
              <input className="input col-span-5 sm:col-span-2" placeholder="Unit" value={r.unit} onChange={(e) => updRow<Investigation>('investigations', i, { unit: e.target.value })} />
              <input className="input col-span-10 sm:col-span-2" placeholder="Remark" value={r.notes} onChange={(e) => updRow<Investigation>('investigations', i, { notes: e.target.value })} />
              <button type="button" className="btn-ghost col-span-2 p-2 text-red-500 sm:col-span-1" onClick={() => delRow('investigations', i)} aria-label="Remove"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={ClipboardList} title="Diagnosis" right={<button type="button" className="btn-secondary btn-sm" onClick={() => set('diagnoses', [...d.diagnoses, { description: '', type: d.diagnoses.length ? 'Secondary' : 'Primary', code: '' }])}><Plus size={14} /> Add</button>}>
        <div className="space-y-2">
          {d.diagnoses.length === 0 && <p className="text-sm text-slate-400">No diagnosis added.</p>}
          {d.diagnoses.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-xl bg-slate-50 p-2">
              <input className="input col-span-12 sm:col-span-6" placeholder="Diagnosis" value={r.description} onChange={(e) => updRow<Diagnosis>('diagnoses', i, { description: e.target.value })} />
              <select className="input col-span-6 sm:col-span-3" value={r.type} onChange={(e) => updRow<Diagnosis>('diagnoses', i, { type: e.target.value as Diagnosis['type'] })}>
                <option>Primary</option><option>Secondary</option><option>Differential</option>
              </select>
              <input className="input col-span-4 sm:col-span-2" placeholder="ICD-10" value={r.code} onChange={(e) => updRow<Diagnosis>('diagnoses', i, { code: e.target.value.toUpperCase() })} />
              <button type="button" className="btn-ghost col-span-2 p-2 text-red-500 sm:col-span-1" onClick={() => delRow('diagnoses', i)} aria-label="Remove"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Pill} title="Management: plan & treatment" right={<button type="button" className="btn-secondary btn-sm" onClick={() => set('treatments', [...d.treatments, { kind: 'Medication', name: '', dose: '', frequency: '', duration: '', instructions: '' }])}><Plus size={14} /> Treatment</button>}>
        <div className="mb-4"><label className="label">Patient plan</label><textarea className="input" rows={4} value={d.plan} onChange={(e) => set('plan', e.target.value)} placeholder="Management plan, advice, referrals…" /></div>
        <label className="label">Treatment / prescription</label>
        <div className="space-y-2">
          {d.treatments.length === 0 && <p className="text-sm text-slate-400">No treatment added.</p>}
          {d.treatments.map((r, i) => (
            <div key={r.id ?? `n${i}`} className="grid grid-cols-12 gap-2 rounded-xl bg-slate-50 p-2">
              <select className="input col-span-5 sm:col-span-2" value={r.kind} onChange={(e) => updRow<TreatmentRow>('treatments', i, { kind: e.target.value })}>
                {KINDS.map((k) => <option key={k}>{k}</option>)}
              </select>
              <input className="input col-span-7 sm:col-span-4" placeholder="Name e.g. Paracetamol 500mg" value={r.name} onChange={(e) => updRow<TreatmentRow>('treatments', i, { name: e.target.value })} />
              <input className="input col-span-4 sm:col-span-2" placeholder="Dose" value={r.dose} onChange={(e) => updRow<TreatmentRow>('treatments', i, { dose: e.target.value })} />
              <input className="input col-span-4 sm:col-span-2" list="freq" placeholder="Freq" value={r.frequency} onChange={(e) => updRow<TreatmentRow>('treatments', i, { frequency: e.target.value })} />
              <input className="input col-span-4 sm:col-span-2" placeholder="Duration" value={r.duration} onChange={(e) => updRow<TreatmentRow>('treatments', i, { duration: e.target.value })} />
              <input className="input col-span-10 sm:col-span-11" placeholder="Instructions" value={r.instructions} onChange={(e) => updRow<TreatmentRow>('treatments', i, { instructions: e.target.value })} />
              <button type="button" className="btn-ghost col-span-2 p-2 text-red-500 sm:col-span-1" onClick={() => delRow('treatments', i)} aria-label="Remove"><Trash2 size={16} /></button>
            </div>
          ))}
          <datalist id="freq">{FREQ.map((f) => <option key={f} value={f} />)}</datalist>
        </div>
      </Section>

      <Section icon={CalendarPlus} title="Follow-up appointment">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Date &amp; time</label><input type="datetime-local" className="input" value={d.followup.at} onChange={(e) => set('followup', { ...d.followup, at: e.target.value })} /></div>
          <div><label className="label">Reason</label><input className="input" value={d.followup.reason} placeholder="e.g. Review blood results" onChange={(e) => set('followup', { ...d.followup, reason: e.target.value })} /></div>
        </div>
        {d.followup.at && <button type="button" className="mt-2 text-xs font-semibold text-red-600" onClick={() => set('followup', { at: '', reason: '' })}>Remove follow-up</button>}
      </Section>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          {msg && <span className={`mr-auto text-sm font-medium ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</span>}
          <button type="button" className="btn-secondary ml-auto flex-1 sm:flex-none" disabled={pending} onClick={() => submit(false)}><Save size={16} /> Save draft</button>
          <button type="button" className="btn-primary flex-1 sm:flex-none" disabled={pending} onClick={() => submit(true)}><CheckCircle2 size={16} /> {pending ? 'Saving…' : 'Complete'}</button>
        </div>
      </div>
    </div>
  )
}
