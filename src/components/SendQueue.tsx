'use client'
import { useRef, useState } from 'react'
import { Send, CheckCircle2, PhoneOff, Zap, Square } from 'lucide-react'
import { logMessage } from '@/app/actions/messages'
import { sendViaGateway } from '@/app/actions/gateway'
import { waLink } from '@/lib/whatsapp'

export type QueueItem = { key: string; patientId: string; appointmentId?: string; name: string; sub?: string; number: string | null; message: string; sentAt?: string | null }

/** Opens WhatsApp with each message ready; the user taps send in WhatsApp, then "Send next" here. */
export default function SendQueue({ items, kind, campaign, gateway }: { items: QueueItem[]; kind: 'reminder' | 'blast'; campaign?: string; gateway?: { delayMs: number } }) {
  const [sent, setSent] = useState<Record<string, boolean>>(() => Object.fromEntries(items.filter((i) => i.sentAt).map((i) => [i.key, true])))
  const sendable = items.filter((i) => i.number)
  const left = sendable.filter((i) => !sent[i.key])
  const [running, setRunning] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const stop = useRef(false)

  async function sendAll() {
    stop.current = false; setRunning(true)
    const todo = sendable.filter((i) => !sent[i.key])
    for (let k = 0; k < todo.length && !stop.current; k++) {
      const i = todo[k]
      const r = await sendViaGateway({ patientId: i.patientId, appointmentId: i.appointmentId, kind, campaign, message: i.message }).catch(() => ({ ok: false, error: 'Network error' }))
      if (r.ok) setSent((s) => ({ ...s, [i.key]: true }))
      else setErrors((e) => ({ ...e, [i.key]: r.error ?? 'Failed' }))
      // pause between messages (randomised) so the number is less likely to be flagged
      if (k < todo.length - 1 && !stop.current) await new Promise((res) => setTimeout(res, gateway!.delayMs * (0.7 + Math.random() * 0.6)))
    }
    setRunning(false)
  }

  function send(i: QueueItem) {
    if (!i.number) return
    window.open(waLink(i.number, i.message), '_blank', 'noopener') // must run in the tap itself, or the browser blocks it
    setSent((s) => ({ ...s, [i.key]: true }))
    logMessage({ patientId: i.patientId, appointmentId: i.appointmentId, kind, campaign, message: i.message }).catch(() => {})
  }

  return (
    <div className="space-y-3">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="text-2xl font-extrabold text-slate-900">{sendable.length - left.length}</span>
          <span className="text-slate-500"> / {sendable.length} sent</span>
          {items.length > sendable.length && <span className="ml-2 text-xs text-slate-400">({items.length - sendable.length} without a usable phone number)</span>}
        </div>
        {gateway && (
          running
            ? <button className="btn-danger" onClick={() => { stop.current = true }}><Square size={14} /> Stop</button>
            : <button className="btn-primary" disabled={left.length === 0} onClick={sendAll}><Zap size={16} /> Send all automatically ({left.length})</button>
        )}
        <button className={gateway ? 'btn-secondary' : 'btn-primary'} disabled={left.length === 0 || running} onClick={() => left[0] && send(left[0])}>
          <Send size={16} /> {left.length === 0 ? 'All sent' : `Send next${left[0] ? `: ${left[0].name.split(' ')[0]}` : ''}`}
        </button>
      </div>
      {running && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">Sending through the gateway… keep this page open.</p>}
      <p className="text-xs text-slate-500">{gateway ? 'Send all automatically uses your linked WhatsApp number. ' : ''}Each tap on Send opens WhatsApp with the message ready. Press send in WhatsApp, come back here, and tap <b>Send next</b>.</p>
      <ul className="card divide-y divide-slate-100 overflow-hidden">
        {items.map((i) => (
          <li key={i.key} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{i.name}</span>
                {sent[i.key] && <span className="badge bg-leaf/30 text-leaf-dark"><CheckCircle2 size={12} className="mr-1" />Sent{i.sentAt ? ` ${i.sentAt}` : ''}</span>}
              </div>
              {i.sub && <div className="text-xs text-slate-500">{i.sub}</div>}
              {errors[i.key] && !sent[i.key] && <div className="text-xs font-medium text-heart">Not sent: {errors[i.key]}</div>}
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-slate-500">{i.message}</p>
            </div>
            {i.number ? (
              <button className={sent[i.key] ? 'btn-secondary btn-sm' : 'btn-sm btn bg-[#25d366] text-white hover:bg-[#1ebe5b]'} onClick={() => send(i)} aria-label={`WhatsApp ${i.name}`}>
                <Send size={14} /> {sent[i.key] ? 'Again' : 'Send'}
              </button>
            ) : <span className="flex items-center gap-1 text-xs text-slate-400"><PhoneOff size={14} /> No phone</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
