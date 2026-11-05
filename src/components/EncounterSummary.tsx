import Link from 'next/link'
import { fmtDateTime, toLocalInput } from '@/lib/utils'
import { type Encounter, investigationText, diagnosisText, chargesTotal, rm } from '@/lib/types'
import type { Treatment, Appointment } from '@/lib/queries'


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
        <Block title="Presenting symptoms & complaints"><Text v={e.history || e.chief_complaint} /></Block>
        <Block title="On examination"><Text v={e.examination} /></Block>
        {e.notes && <Block title="Notes"><Text v={e.notes} /></Block>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Block title="Laboratory"><Text v={investigationText(e) || null} /></Block>
        <Block title="Imaging findings"><Text v={e.imaging_notes} /></Block>
      </div>
      <Block title="Diagnosis">
        {(e.diagnosis_sensitive || e.diagnosis_notifiable) && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {e.diagnosis_sensitive && <span className="badge bg-heart/10 text-heart-dark">Sensitive diagnosis</span>}
            {e.diagnosis_notifiable && <span className="badge bg-amber-100 text-amber-800">Notify Ministry of Health</span>}
          </div>
        )}
        <Text v={diagnosisText(e) || null} />
      </Block>
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
      {e.charges?.length > 0 && (
        <Block title="Charges">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {e.charges.map((c, k) => (
                  <tr key={k}><td className="px-3 py-2">{c.item}</td><td className="px-3 py-2 text-slate-500">{c.qty} × {rm(c.price)}</td><td className="px-3 py-2 text-right font-semibold">{rm(c.qty * c.price)}</td></tr>
                ))}
                <tr className="bg-slate-50"><td className="px-3 py-2 font-bold" colSpan={2}>Total</td><td className="px-3 py-2 text-right font-extrabold">{rm(chargesTotal(e.charges))}</td></tr>
              </tbody>
            </table>
          </div>
        </Block>
      )}
      {followup && (
        <Block title="Follow-up">
          <p className="text-[15px]">{fmtDateTime(followup.scheduled_at)} {followup.reason && <span className="text-slate-500">· {followup.reason}</span>}</p>
          <Link href={`/appointments?d=${toLocalInput(followup.scheduled_at).slice(0, 10)}`} className="text-sm font-semibold text-brand-700 print:hidden">View in appointment calendar →</Link>
        </Block>
      )}
      <p className="text-xs text-slate-400">Last updated {fmtDateTime(e.updated_at)}{e.doctor_name ? ` · ${e.doctor_name}` : ''}</p>
    </div>
  )
}
