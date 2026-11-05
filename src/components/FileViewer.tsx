'use client'
import { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'

function PdfViewer({ src }: { src: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [state, setState] = useState<{ pages: number; error?: string }>({ pages: 0 })

  useEffect(() => {
    let cancelled = false
    const el = wrap.current!
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const data = await fetch(src).then((r) => { if (!r.ok) throw new Error('Could not load file'); return r.arrayBuffer() })
        const pdf = await pdfjs.getDocument({ data }).promise
        if (cancelled) return
        el.innerHTML = ''
        setState({ pages: pdf.numPages })
        const width = el.clientWidth
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const scale = (width / base.width) * zoom
          const vp = page.getViewport({ scale: scale * dpr })
          const canvas = document.createElement('canvas')
          canvas.width = vp.width; canvas.height = vp.height
          canvas.style.width = `${vp.width / dpr}px`
          canvas.className = 'mx-auto mb-3 block rounded bg-white shadow'
          el.appendChild(canvas)
          await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
        }
      } catch (e) {
        if (!cancelled) setState({ pages: 0, error: e instanceof Error ? e.message : 'Unable to display PDF' })
      }
    })()
    return () => { cancelled = true }
  }, [src, zoom])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
        <span>{state.pages ? `${state.pages} page(s)` : 'Loading…'}</span>
        <div className="flex gap-1">
          <button className="btn-secondary btn-sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label="Zoom out"><ZoomOut size={14} /></button>
          <button className="btn-secondary btn-sm" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button className="btn-secondary btn-sm" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoom in"><ZoomIn size={14} /></button>
        </div>
      </div>
      {state.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <div className="overflow-auto rounded-xl bg-slate-200 p-2" style={{ maxHeight: '75dvh' }}>
        <div ref={wrap} />
      </div>
    </div>
  )
}

function TextViewer({ src }: { src: string }) {
  const [text, setText] = useState('Loading…')
  useEffect(() => { fetch(src).then((r) => r.text()).then(setText).catch(() => setText('Unable to load file')) }, [src])
  return <pre className="max-h-[75dvh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm">{text}</pre>
}

function ImageViewer({ src, title }: { src: string; title: string }) {
  const [zoom, setZoom] = useState(false)
  return (
    <div className={`rounded-xl bg-slate-900/95 p-2 ${zoom ? 'overflow-auto' : ''}`} style={{ maxHeight: '78dvh' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={title} onClick={() => setZoom(!zoom)} className={`mx-auto ${zoom ? 'max-w-none cursor-zoom-out' : 'max-h-[75dvh] w-auto max-w-full cursor-zoom-in object-contain'}`} />
      <p className="mt-1 text-center text-xs text-slate-400">Tap image to {zoom ? 'fit' : 'zoom'} · pinch to zoom on phone</p>
    </div>
  )
}

export default function FileViewer({ id, mime, title }: { id: string; mime: string; title: string }) {
  const src = `/api/files/${id}`
  if (mime === 'application/pdf') return <PdfViewer src={src} />
  if (mime.startsWith('image/')) return <ImageViewer src={src} title={title} />
  if (mime.startsWith('text/')) return <TextViewer src={src} />
  return <p className="text-sm text-slate-500">Preview is not available for this file type.</p>
}
