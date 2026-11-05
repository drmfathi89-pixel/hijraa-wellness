'use client'
import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'

type BIPEvent = Event & { prompt: () => Promise<void> }

export default function InstallHint() {
  const [evt, setEvt] = useState<BIPEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches)
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  return (
    <section className="card card-pad">
      <h2 className="h-section mb-2 flex items-center gap-2"><Smartphone size={18} /> Install on your phone</h2>
      {installed ? <p className="text-sm text-emerald-700">The app is installed on this device.</p> : (
        <>
          {evt && <button className="btn-primary mb-3" onClick={() => evt.prompt()}>Install HIJRAA app</button>}
          <ul className="space-y-1 text-sm text-slate-600">
            <li><b>Android (Chrome):</b> menu ⋮ → <i>Add to Home screen / Install app</i></li>
            <li><b>iPhone (Safari):</b> Share button → <i>Add to Home Screen</i></li>
          </ul>
        </>
      )}
    </section>
  )
}
