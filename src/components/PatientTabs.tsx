'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function PatientTabs({ id }: { id: string }) {
  const path = usePathname()
  const base = `/patients/${id}`
  const tabs = [
    { href: base, label: 'Overview' },
    { href: `${base}/encounters`, label: 'Encounters' },
    { href: `${base}/history`, label: 'Past Records' },
    { href: `${base}/files`, label: 'Files' },
    { href: `${base}/management`, label: 'Management' },
  ]
  return (
    <div className="-mx-4 mb-5 overflow-x-auto border-b border-slate-200 px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <div className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const active = t.href === base ? path === base || path === `${base}/edit` : path.startsWith(t.href)
          return (
            <Link key={t.href} href={t.href} className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition ${active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
