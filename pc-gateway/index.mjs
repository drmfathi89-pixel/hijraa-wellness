// HIJRAA PC Gateway: runs on the clinic PC.
// - Links the clinic's WhatsApp as a "linked device" (scan the QR once; the link is saved in ./whatsapp-session).
// - Every few seconds asks HIJRAA WELLNESS for queued messages and sends them, with pauses in between.
// - Only makes outbound HTTPS requests to the app; nothing on the internet needs to reach this PC.
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, argv } from 'node:process'

const VERSION = '1.0.0'
const CONFIG = new URL('./config.json', import.meta.url)
const SESSION_DIR = new URL('./whatsapp-session/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const MOCK = argv.includes('--mock') // test mode: pretends to be WhatsApp, sends nothing
const SYNC_MS = 5000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a)

async function loadConfig() {
  let cfg = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf8')) : {}
  const arg = (k) => { const i = argv.indexOf(`--${k}`); return i > 0 ? argv[i + 1] : undefined }
  cfg.appUrl = arg('url') ?? cfg.appUrl
  cfg.token = arg('token') ?? cfg.token
  cfg.minDelaySec ??= 4; cfg.maxDelaySec ??= 9
  if (!cfg.appUrl || !cfg.token) {
    const rl = createInterface({ input: stdin, output: stdout })
    console.log('\n=== HIJRAA PC Gateway: first-time setup ===')
    cfg.appUrl = ((await rl.question('App address [https://hijraa-wellness.vercel.app]: ')).trim() || 'https://hijraa-wellness.vercel.app')
    cfg.token = (await rl.question('PC token (from the app: WhatsApp > Gateway > PC): ')).trim()
    rl.close()
  }
  cfg.appUrl = cfg.appUrl.replace(/\/+$/, '')
  if (!MOCK) writeFileSync(CONFIG, JSON.stringify(cfg, null, 2))
  return cfg
}

// ---- WhatsApp connection (Baileys) -------------------------------------------------------
const wa = { state: 'starting', qr: null, me: '', sock: null }

async function startWhatsApp() {
  if (MOCK) {
    wa.state = 'qr'; wa.qr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    log('[mock] showing QR; pretending the phone scans it in 4 s')
    setTimeout(() => { wa.state = 'connected'; wa.qr = null; wa.me = 'Mock Clinic · 60111222333'; log('[mock] WhatsApp connected') }, 4000)
    wa.send = async (number, text) => { log(`[mock] -> +${number}: ${text.slice(0, 60)}`); writeFileSync(new URL('./mock-sent.log', import.meta.url), `${number}\t${text.replace(/\n/g, ' ')}\n`, { flag: 'a' }) }
    wa.logout = async () => { wa.state = 'qr'; log('[mock] logged out') }
    return
  }
  const baileys = await import('@whiskeysockets/baileys')
  const makeWASocket = baileys.default?.default ?? baileys.default ?? baileys.makeWASocket
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys
  const QRCode = (await import('qrcode')).default
  const qrTerminal = (await import('qrcode-terminal')).default
  const pino = (await import('pino')).default

  const connect = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))
    const sock = makeWASocket({ auth: state, version, logger: pino({ level: 'silent' }), browser: Browsers.windows('HIJRAA Gateway'), markOnlineOnConnect: false, syncFullHistory: false })
    wa.sock = sock
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        wa.state = 'qr'; wa.qr = await QRCode.toDataURL(qr, { margin: 1, width: 280 })
        console.log('\nScan this with WhatsApp on the clinic phone: Linked devices > Link a device (also shown in the app):')
        qrTerminal.generate(qr, { small: true })
      }
      if (connection === 'open') {
        wa.state = 'connected'; wa.qr = null
        wa.me = [sock.user?.name, sock.user?.id?.split(':')[0]?.split('@')[0]].filter(Boolean).join(' · ')
        log('WhatsApp connected as', wa.me)
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode
        wa.state = 'starting'
        if (code === DisconnectReason.loggedOut) {
          log('WhatsApp was unlinked. Clearing the saved link; a new QR code will appear.')
          rmSync(SESSION_DIR, { recursive: true, force: true })
        } else log('WhatsApp connection closed (' + (code ?? 'network') + '), reconnecting…')
        setTimeout(connect, 3000)
      }
    })
  }
  wa.send = async (number, text) => {
    const jid = `${number}@s.whatsapp.net`
    const [hit] = (await wa.sock.onWhatsApp(jid)) ?? []
    if (!hit?.exists) throw new Error('This number is not on WhatsApp')
    await wa.sock.sendMessage(hit.jid ?? jid, { text })
  }
  wa.logout = async () => { await wa.sock?.logout().catch(() => {}) }
  await connect()
}

// ---- Sync loop with the app ---------------------------------------------------------------
async function main() {
  const cfg = await loadConfig()
  console.log(`\nHIJRAA PC Gateway ${VERSION}${MOCK ? ' (MOCK MODE)' : ''}\nApp: ${cfg.appUrl}\nKeep this window open. Close it to stop sending.\n`)
  await startWhatsApp()
  let results = []
  let warned = false
  for (;;) {
    try {
      const res = await fetch(`${cfg.appUrl}/api/pc-gateway/sync`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.token}` },
        body: JSON.stringify({ state: wa.state, qr: wa.qr, me: wa.me, version: VERSION, results }),
      })
      if (res.status === 401) { log('The app rejected the PC token. Create a new one in the app and delete config.json here.'); await sleep(30000); continue }
      if (!res.ok) throw new Error('App answered ' + res.status)
      results = []; warned = false
      const { messages = [], command } = await res.json()
      if (command === 'logout') { log('The app asked to unlink WhatsApp.'); await wa.logout() }
      for (const [i, m] of messages.entries()) {
        try { await wa.send(m.number, m.message); results.push({ id: m.id, ok: true }); log('Sent to +' + m.number) }
        catch (e) { results.push({ id: m.id, ok: false, error: String(e?.message ?? e) }); log('Failed +' + m.number + ':', e?.message ?? e) }
        if (i < messages.length - 1) await sleep(1000 * (cfg.minDelaySec + Math.random() * (cfg.maxDelaySec - cfg.minDelaySec)))
      }
      if (messages.length) continue // more may be waiting; report results right away
    } catch (e) {
      if (!warned) { log('Cannot reach the app (' + (e?.message ?? e) + '). Will keep trying.'); warned = true }
    }
    await sleep(SYNC_MS)
  }
}
main()
