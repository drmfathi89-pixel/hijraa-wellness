import { fmtDateTime, bmi, vitalFlag } from '@/lib/utils'
import { type Encounter, investigationText, diagnosisText } from '@/lib/types'
import type { Treatment, Appointment } from '@/lib/queries'


function V({ label, value, unit, flag }: { label: string; value: React.ReactNode; unit?: string; flag?: 'high' | 'low' | null }) {
  if (value == null || value === '') return null
  return (
    <div className={`rounded-xl px-3 py-2 ${flag === 'high' ? 'bg-red-50' : flag === 'low' ? 'bg-amber-50' : 'bg-slate-50'}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-base font-bold ${flag === 'high' ? 'text-red-700' : flag === 'low' ? 'text-amber-700' : 'text-slate-800'}`}>{value}<span className="ml-0.5 text-xs font-medium text-slate-400">{unit}</span></div>
    </div>
  )
}

export function VitalsGrid({ e }: { e: Encounter }) {
  const b = bmi(e.weight, e.height)
  const items = [
    e.bp_systolic != null && <V key="bp" label="BP" value={`${e.bp_systolic}/${e.bp_diastolic ?? '-'}`} unit="mmHg" flag={vitalFlag('bp', e.bp_systolic, e.bp_diastolic)} />,
    <V key="p" label="Pulse" value={e.pulse} unit="bpm" flag={vitalFlag('pulse', e.pulse)} />,
    <V key="rr" label="RR" value={e.resp_rate} unit="/min" flag={vitalFlag('resp_rate', e.resp_rate)} />,
    <V key="t" label="Temp" value={e.temperature} unit="°C" flag={vitalFlag('temperature', e.temperature)} />,
    <V key="s" label="SpO₂" value={e.spo2} unit="%" flag={vitalFlag('spo2', e.spo2)} />,
    <V key="w" label="Weight" value={e.weight} unit="kg" />,
    <V key="h" label="Height" value={e.height} unit="cm" />,
    b && <V key="b" label="BMI" value={b} flag={vitalFlag('bmi', Number(b))} />,
    <V key="g" label="Glucose" value={e.glucose} unit="mmol/L" flag={vitalFlag('glucose', e.glucose)} />,
    <V key="pain" label="Pain" value={e.pain_score} unit="/10" flag={vitalFlag('pain_score', e.pain_score)} />,
  ].filter(Boolean)
  const hasAny = [e.bp_systolic, e.pulse, e.resp_rate, e.temperature, e.spo2, e.weight, e.height, e.glucose, e.pain_score].some((x) => x != null)
  if (!hasAny) return <p className="text-sm text-slate-400">No vital signs recorded.</p>
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{items}</div>
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">{title}</h3>
      {children}
    </div>
  )
}

function Text({ v }: { v: string | null }) {
  return v ? <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-800">{v}</p> : <p className="text-sm text-slate-400">-</p>
}

export default function EncounterSummary({ e, treatments, followup }: { e: Encounter; treatments: Treatment[]; followup?: Appointment }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Block title="Chief complaint"><Text v={e.chief_complaint} /></Block>
        <Block title="History"><Text v={e.history} /></Block>
        <Block title="Examination"><Text v={e.examination} /></Block>
        {e.notes && <Block title="Notes"><Text v={e.notes} /></Block>}
      </div>
      <Block title="Vital signs"><VitalsGrid e={e} /></Block>
      <Block title="Investigations"><Text v={investigationText(e) || null} /></Block>
      <Block title="Diagnosis"><Text v={diagnosisText(e) || null} /></Block>
      <Block title="Plan"><Text v={e.plan} /></Block>
      <Block title="Treatment">
        {treatments.length === 0 ? <p className="text-sm text-slate-400">-</p> : (
          <ul className="space-y-1.5">
            {treatments.map((t) => (
              <li key={t.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">{t.name}</span> <span className="text-slate-500">{[t.dose, t.frequency, t.duration].filter(Boolean).join(' · ')}</span>
                <span className="ml-2 text-xs text-slate-400">{t.kind}</span>
                {t.instructions && <div className="text-xs text-slate-500">{t.instructions}</div>}
              </li>
            ))}
          </ul>
        )}
      </Block>
      {followup && <Block title="Follow-up"><p className="text-[15px]">{fmtDateTime(followup.scheduled_at)} {followup.reason && <span className="text-slate-500">· {followup.reason}</span>}</p></Block>}
      <p className="text-xs text-slate-400">Last updated {fmtDateTime(e.updated_at)}{e.doctor_name ? ` · ${e.doctor_name}` : ''}</p>
    </div>
  )
}
