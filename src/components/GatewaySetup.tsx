'use client'
import { useActionState, useCallback, useEffect, useState, startTransition } from 'react'
import { Smartphone, RefreshCw, LogOut, CheckCircle2, AlertTriangle, QrCode, Monitor, Download, KeyRound, Copy } from 'lucide-react'
import { saveGateway, gwCheck, gwConnect, gwLogout, gwTest, createPcToken, pcLogout, outboxSummary } from '@/app/actions/gateway'
import type { GwStatus } from '@/lib/wagateway'

type St = GwStatus & { qr?: string | null; seenAt?: string }
const LABEL: Record<GwStatus['state'], string> = {
  connected: 'Connected', qr: 'Scan the QR code with your phone', starting: 'Starting…', disconnected: 'Not connected', not_configured: 'Not set up yet', error: 'Problem',
}

function submit(dispatch: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => dispatch(fd)) }
}

export default function GatewaySetup({ initial }: { initial: { provider: string; url: string; session: string; hasKey: boolean; autoReminders: boolean; cronReady: boolean } }) {
  const [provider, setProvider] = useState(initial.provider)
  const [saveState, save, saving] = useActionState(saveGateway, undefined)
  const [testState, test, testing] = useActionState(gwTest, undefined)
  const [st, setSt] = useState<St | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (connect = false) => {
    setBusy(true)
    try { setSt(await (connect ? gwConnect() : gwCheck())) } catch { setSt({ state: 'error', detail: 'Could not check the gateway' }) } finally { setBusy(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh, saveState])
  // PC gateway: keep the status (and its QR) fresh while this page is open
  useEffect(() => {
    if (initial.provider !== 'pc') return
    const t = setInterval(() => gwCheck().then(setSt).catch(() => {}), 4000)
    return () => clearInterval(t)
  }, [initial.provider])
  // while waiting for a scan, poll so the page flips to "Connected" by itself
  useEffect(() => {
    if (st?.state !== 'qr' && st?.state !== 'starting') return
    const t = setInterval(() => gwCheck().then(setSt).catch(() => {}), 3000)
    return () => clearInterval(t)
  }, [st?.state])

  const ok = st?.state === 'connected'
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card card-pad">
        <h2 className="h-section mb-1">Gateway</h2>
        <p className="mb-3 text-xs text-slate-500">Sends from your clinic&apos;s own WhatsApp number, linked like WhatsApp Web.</p>
        <form onSubmit={submit(save)} className="grid gap-3">
          <div className="grid grid-cols-4 gap-2">
            {[['pc', 'This PC'], ['waha', 'WAHA'], ['fonnte', 'Fonnte'], ['none', 'Off']].map(([v, l]) => (
              <label key={v} className={`btn cursor-pointer border ${provider === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600'}`}>
                <input type="radio" name="provider" value={v} checked={provider === v} onChange={() => setProvider(v)} className="sr-only" />{l}
              </label>
            ))}
          </div>
          {provider === 'waha' && (
            <>
              <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">WAHA is free and open source (<b>devlikeapro/waha</b>). Run it on an always-on server (Railway, a VPS, …) with an API key, then enter its address here. The QR code will appear on this page.</p>
              <div><label className="label">WAHA server address</label><input name="url" className="input" defaultValue={initial.url} placeholder="https://waha.yourclinic.com" required /></div>
              <div><label className="label">Session name</label><input name="session" className="input" defaultValue={initial.session} /></div>
            </>
          )}
          {provider === 'pc' && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-semibold"><Monitor size={16} /> Use the clinic PC as the gateway</p>
              <ol className="ml-4 list-decimal space-y-1 text-xs">
                <li>Install <b>Node.js LTS</b> on the clinic PC from nodejs.org (one time).</li>
                <li>Download <a className="font-semibold text-brand-700 underline" href="/downloads/hijraa-pc-gateway.zip">HIJRAA PC Gateway</a>. <b>Right-click the zip → Extract All</b>, then double-click <b>start.bat</b> in the extracted folder (not inside the zip).</li>
                <li>When it asks, paste the <b>PC token</b> (create it below, after saving).</li>
                <li>Scan the QR code that appears (on the PC and on this page) with WhatsApp on the clinic phone.</li>
              </ol>
              <p className="text-xs text-slate-500">Keep the window open while messages should go out. Messages queue here while the PC is off.</p>
            </div>
          )}
          {provider === 'fonnte' && (
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Sign up at <b>fonnte.com</b>, add a device, and scan its QR code with your phone there. Then copy the device <b>token</b> below.</p>
          )}
          {(provider === 'waha' || provider === 'fonnte') && (
            <div><label className="label">{provider === 'waha' ? 'API key' : 'Device token'}</label>
              <input name="key" type="password" className="input" autoComplete="off" placeholder={initial.hasKey ? '•••••••• saved (leave blank to keep)' : ''} required={!initial.hasKey} /></div>
          )}
          {provider !== 'none' && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="auto" defaultChecked={initial.autoReminders} className="mt-1" />
              <span>Send TCA reminders automatically every evening (about 8 pm) for the next day&apos;s appointments
                {!initial.cronReady && <span className="block text-xs text-amber-700">Needs one more setting in Vercel: add an environment variable <b>CRON_SECRET</b> (any long random text), then redeploy.</span>}</span>
            </label>
          )}
          {provider === 'none' && <input type="hidden" name="url" value="" />}
          {saveState?.error && <p className="text-sm text-red-600">{saveState.error}</p>}
          {saveState?.ok && <p className="text-sm text-emerald-600">{saveState.ok}</p>}
          <div><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
        </form>
        {initial.provider === 'pc' && <PcToken hasToken={initial.hasKey} />}
      </section>

      <section className="card card-pad">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="h-section flex items-center gap-2"><Smartphone size={18} /> Phone connection</h2>
          <button className="btn-ghost btn-sm" onClick={() => refresh()} disabled={busy}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Refresh</button>
        </div>
        {!st ? <p className="text-sm text-slate-400">Checking…</p> : (
          <div className="space-y-3">
            <p className={`flex items-center gap-2 font-semibold ${ok ? 'text-leaf-dark' : st.state === 'error' ? 'text-heart' : 'text-slate-700'}`}>
              {ok ? <CheckCircle2 size={18} /> : st.state === 'error' ? <AlertTriangle size={18} /> : <QrCode size={18} />} {LABEL[st.state]}{st.me ? `: ${st.me}` : ''}
            </p>
            {st.detail && <p className="text-xs text-slate-500">{st.detail}</p>}
            {st.qr && (
              <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={st.qr} alt="WhatsApp QR code" className="mx-auto h-56 w-56" />
                <p className="mt-2 text-xs text-slate-500">On your phone: WhatsApp → ⋮ / Settings → <b>Linked devices</b> → <b>Link a device</b>, then scan this code.</p>
              </div>
            )}
            {initial.provider === 'waha' && !ok && st.state !== 'not_configured' && st.state !== 'qr' && (
              <button className="btn-primary" disabled={busy} onClick={() => refresh(true)}><QrCode size={16} /> Connect phone</button>
            )}
            {initial.provider === 'pc' && ok && <button className="btn-danger btn-sm" onClick={() => pcLogout().then(() => refresh())}><LogOut size={14} /> Disconnect phone</button>}
            {initial.provider === 'waha' && ok && <button className="btn-danger btn-sm" onClick={() => gwLogout().then(() => refresh())}><LogOut size={14} /> Disconnect phone</button>}
            {ok && (
              <form onSubmit={submit(test)} className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <input name="phone" type="tel" className="input max-w-[14rem]" placeholder="Test to e.g. 012-345 6789" required />
                <button className="btn-secondary" disabled={testing}>{testing ? 'Sending…' : 'Send test'}</button>
                {testState?.ok && <p className="w-full text-sm text-emerald-600">{testState.ok}</p>}
                {testState?.error && <p className="w-full text-sm text-red-600">{testState.error}</p>}
              </form>
            )}
          </div>
        )}
        {initial.provider === 'pc' && <Outbox key={st?.seenAt ?? 'o'} />}
      </section>
    </div>
  )
}

function PcToken({ hasToken }: { hasToken: boolean }) {
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function make() {
    if (hasToken && !confirm('Create a new PC token? The PC gateway using the old token will stop until you enter the new one.')) return
    setBusy(true); try { setToken(await createPcToken()) } finally { setBusy(false) }
  }
  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <label className="label">PC token</label>
      {token ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input readOnly value={token} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="PC token" />
            <button type="button" className="btn-secondary" onClick={() => navigator.clipboard?.writeText(token)}><Copy size={14} /> Copy</button>
          </div>
          <p className="text-xs text-amber-700">Copy it now: it is shown only once. Paste it into HIJRAA PC Gateway when it asks.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={make} disabled={busy}><KeyRound size={14} /> {hasToken ? 'Create new token' : 'Create PC token'}</button>
          {hasToken && <span className="text-xs text-slate-500">A token is already set.</span>}
          <a href="/downloads/hijraa-pc-gateway.zip" className="btn-ghost"><Download size={14} /> Download PC Gateway</a>
        </div>
      )}
    </div>
  )
}

function Outbox() {
  const [o, setO] = useState<Awaited<ReturnType<typeof outboxSummary>> | null>(null)
  useEffect(() => { outboxSummary().then(setO).catch(() => {}) }, [])
  if (!o) return null
  return (
    <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><div className="text-xl font-extrabold">{o.queued}</div><div className="text-xs text-slate-500">waiting</div></div>
        <div><div className="text-xl font-extrabold">{o.sent_today}</div><div className="text-xs text-slate-500">sent (24 h)</div></div>
        <div><div className="text-xl font-extrabold">{o.failed}</div><div className="text-xs text-slate-500">failed (7 d)</div></div>
      </div>
      {o.recentFailures.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{o.recentFailures.map((f, i) => <li key={i}>+{f.number}: {f.error}</li>)}</ul>
      )}
    </div>
  )
}
