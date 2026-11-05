'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, CheckCircle2, FlaskConical, ClipboardList, Pill, CalendarPlus, NotebookPen, Stethoscope, Receipt, History } from 'lucide-react'
import { saveEncounter } from '@/app/actions/encounters'
import { type EncounterPayload, type TreatmentRow, type ChargeRow, type PriceItem, chargesTotal, rm } from '@/lib/types'

const VISIT_TYPES = ['Consultation', 'Follow-up', 'Walk-in', 'Emergency', 'Telemedicine', 'Procedure', 'Health screening']
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

export type PrevDx = { date: string; text: string; source: string }

export default function EncounterEditor({ id, patientId, initial, previousDx = [], priceList = [] }: { id: string; patientId: string; initial: EncounterPayload; previousDx?: PrevDx[]; priceList?: PriceItem[] }) {
  const router = useRouter()
  const [d, setD] = useState<EncounterPayload>(initial)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [showPrev, setShowPrev] = useState(false)

  const set = <K extends keyof EncounterPayload>(k: K, v: EncounterPayload[K]) => setD((s) => ({ ...s, [k]: v }))
  function updRow<T extends TreatmentRow>(key: 'treatments', i: number, patch: Partial<T>) {
    setD((s) => ({ ...s, [key]: s[key].map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
  }
  function delRow(key: 'treatments', i: number) {
    setD((s) => ({ ...s, [key]: s[key].filter((_, j) => j !== i) }))
  }
  const setDx = (i: number, v: string) => setD((s) => ({ ...s, diagnosis_list: s.diagnosis_list.map((x, j) => (j === i ? v : x)) }))
  const addDx = (v = '') => setD((s) => ({ ...s, diagnosis_list: s.diagnosis_list.length === 1 && !s.diagnosis_list[0] && v ? [v] : [...s.diagnosis_list, v] }))
  const delDx = (i: number) => setD((s) => ({ ...s, diagnosis_list: s.diagnosis_list.length > 1 ? s.diagnosis_list.filter((_, j) => j !== i) : [''] }))
  const setCh = (i: number, p: Partial<ChargeRow>) => setD((s) => ({ ...s, charges: s.charges.map((c, j) => (j === i ? { ...c, ...p } : c)) }))
  const addCh = (item = '', price = '') => setD((s) => ({ ...s, charges: [...s.charges, { item, qty: '1', price }] }))
  const delCh = (i: number) => setD((s) => ({ ...s, charges: s.charges.filter((_, j) => j !== i) }))

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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Section icon={NotebookPen} title="Presenting Symptoms & Complaints">
            <label className="label">Symptoms details</label>
            <textarea className="input min-h-[220px]" rows={9} value={d.history} onChange={(e) => set('history', e.target.value)}
              placeholder={'e.g. feverish today\nhistory of sick contact\nURTI symptoms'} />
          </Section>
          <Section icon={Stethoscope} title="Physical & Mental Health Examination">
            <label className="label">On examination</label>
            <textarea className="input min-h-[220px]" rows={9} value={d.examination} onChange={(e) => set('examination', e.target.value)}
              placeholder={'e.g. alert, not tachypnoeic\nlungs: clear'} />
          </Section>
        </div>
        <div className="space-y-4">
          <Section icon={FlaskConical} title="Laboratory & Imaging">
            <label className="label">Laboratory</label>
            <textarea className="input mb-3 min-h-[110px]" rows={4} value={d.investigation_notes} onChange={(e) => set('investigation_notes', e.target.value)} />
            <label className="label">Imaging findings</label>
            <textarea className="input min-h-[110px]" rows={4} value={d.imaging_notes} onChange={(e) => set('imaging_notes', e.target.value)} />
          </Section>
          <Section icon={ClipboardList} title="Diagnosis">
            {previousDx.length > 0 && (
              <div className="mb-3">
                <button type="button" className="btn-sm btn bg-leaf/40 text-leaf-dark hover:bg-leaf/60" onClick={() => setShowPrev(!showPrev)}>
                  <History size={14} /> {showPrev ? 'Hide' : 'See'} previous diagnosis
                </button>
                {showPrev && (
                  <ul className="mt-2 max-h-48 space-y-1 overflow-auto rounded-xl bg-slate-50 p-2 text-sm">
                    {previousDx.map((p, i) => (
                      <li key={i} className="flex items-start justify-between gap-2">
                        <span><span className="text-xs text-slate-400">{p.date} · {p.source}</span><span className="block text-slate-800">{p.text}</span></span>
                        <button type="button" className="text-xs font-semibold text-brand-700" onClick={() => addDx(p.text)}>Use</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-heart">
              <input type="checkbox" checked={d.diagnosis_sensitive} onChange={(e) => set('diagnosis_sensitive', e.target.checked)} />
              Sensitive diagnosis <span className="text-xs font-normal text-slate-400">(hidden from lists; visible only inside the encounter)</span>
            </label>
            <label className="label">Description <span className="text-heart">*</span></label>
            <div className="space-y-2">
              {d.diagnosis_list.map((x, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" value={x} onChange={(e) => setDx(i, e.target.value)} placeholder="e.g. URTI" aria-label={`Diagnosis ${i + 1}`} />
                  {i === d.diagnosis_list.length - 1
                    ? <button type="button" className="btn-primary px-3" onClick={() => addDx()} aria-label="Add diagnosis"><Plus size={16} /></button>
                    : <button type="button" className="btn-ghost px-3 text-red-500" onClick={() => delDx(i)} aria-label="Remove diagnosis"><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={d.diagnosis_notifiable} onChange={(e) => set('diagnosis_notifiable', e.target.checked)} />
              To be notified to Ministry of Health
            </label>
          </Section>
        </div>
      </div>

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

      <Section icon={Receipt} title="Charges" right={<button type="button" className="btn-secondary btn-sm" onClick={() => addCh()}><Plus size={14} /> Item</button>}>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {priceList.length > 0 ? (
            <select className="input max-w-sm" value="" aria-label="Add from price list"
              onChange={(e) => { const p = priceList.find((x) => x.id === e.target.value); if (p) addCh(p.name, p.price.toFixed(2)) }}>
              <option value="">+ Add from price list…</option>
              {[...new Set(priceList.map((p) => p.kind))].map((k) => (
                <optgroup key={k} label={k}>
                  {priceList.filter((p) => p.kind === k).map((p) => <option key={p.id} value={p.id}>{p.name}: {rm(p.price)}</option>)}
                </optgroup>
              ))}
            </select>
          ) : <p className="text-xs text-slate-400">Tip: an admin can set up consultation types and prices in Settings → Price list.</p>}
          {d.treatments.some((t) => t.name.trim()) && (
            <button type="button" className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
              onClick={() => setD((s) => ({ ...s, charges: [...s.charges, ...s.treatments.filter((t) => t.name.trim() && !s.charges.some((c) => c.item === t.name.trim())).map((t) => ({ item: t.name.trim(), qty: '1', price: '' }))] }))}>
              + Add treatments
            </button>
          )}
        </div>
        {d.charges.length === 0 ? <p className="text-sm text-slate-400">No chargeable items.</p> : (
          <div className="space-y-2">
            <div className="hidden grid-cols-12 gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
              <span className="col-span-6">Item</span><span className="col-span-2">Qty</span><span className="col-span-2">Price (RM)</span><span className="col-span-2 text-right">Amount</span>
            </div>
            {d.charges.map((c, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-xl bg-slate-50 p-2">
                <input className="input col-span-12 sm:col-span-6" placeholder="Item" value={c.item} onChange={(e) => setCh(i, { item: e.target.value })} />
                <input className="input col-span-3 sm:col-span-2" type="number" inputMode="numeric" min="1" placeholder="Qty" value={c.qty} onChange={(e) => setCh(i, { qty: e.target.value })} />
                <input className="input col-span-4 sm:col-span-2" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={c.price} onChange={(e) => setCh(i, { price: e.target.value })} />
                <span className="col-span-3 text-right text-sm font-semibold sm:col-span-1">{rm((Number(c.qty) || 0) * (Number(c.price) || 0)).replace('RM ', '')}</span>
                <button type="button" className="btn-ghost col-span-2 p-2 text-red-500 sm:col-span-1" onClick={() => delCh(i)} aria-label="Remove"><Trash2 size={16} /></button>
              </div>
            ))}
            <div className="flex justify-end px-2 pt-1 text-base font-extrabold text-slate-900">Total: {rm(chargesTotal(d.charges))}</div>
          </div>
        )}
      </Section>

      <Section icon={CalendarPlus} title="Follow-up appointment">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Date &amp; time</label><input type="datetime-local" className="input" value={d.followup.at} onChange={(e) => set('followup', { ...d.followup, at: e.target.value })} /></div>
          <div><label className="label">Reason</label><input className="input" value={d.followup.reason} placeholder="e.g. Review blood results" onChange={(e) => set('followup', { ...d.followup, reason: e.target.value })} /></div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Saved to the appointment calendar when you tap Save draft or Complete.</p>
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
