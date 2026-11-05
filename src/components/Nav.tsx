'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CalendarDays, FileSpreadsheet, Settings, UserPlus, LogOut } from 'lucide-react'
import { Logo } from './Logo'
import { logout } from '@/app/actions/auth'

const items = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays },
  { href: '/import', label: 'Import Excel', icon: FileSpreadsheet },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path.startsWith(href)
}

export function Sidebar({ user }: { user: { name: string; role: string } }) {
  const path = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
      <Link href="/" className="px-2"><Logo /></Link>
      <Link href="/patients/new" className="btn-primary mt-6"><UserPlus size={16} /> New patient</Link>
      <nav className="mt-6 flex-1 space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive(path, href) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="text-xs capitalize text-slate-500">{user.role}</div>
        </div>
        <form action={logout}><button className="btn-ghost p-2" title="Log out"><LogOut size={16} /></button></form>
      </div>
    </aside>
  )
}

const mobile = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/patients/new', label: 'New', icon: UserPlus, primary: true },
  { href: '/appointments', label: 'Appts', icon: CalendarDays },
  { href: '/settings', label: 'More', icon: Settings },
]

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {mobile.map(({ href, label, icon: Icon, primary }) => {
          const active = href === '/patients' ? path.startsWith('/patients') && path !== '/patients/new' : isActive(path, href)
          return primary ? (
            <Link key={href} href={href} className="flex flex-col items-center justify-center py-1.5">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-md"><Icon size={20} /></span>
            </Link>
          ) : (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? 'text-brand-700' : 'text-slate-500'}`}>
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} /> {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur lg:hidden">
      <Link href="/"><Logo /></Link>
      <Link href="/import" className="btn-ghost p-2" aria-label="Import Excel"><FileSpreadsheet size={20} /></Link>
    </header>
  )
}
