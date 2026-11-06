import { requireUser } from '@/lib/auth'
import { Sidebar, BottomNav, MobileHeader } from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <div className="min-h-dvh" data-theme={user.theme ?? 'blue'}>
      <Sidebar user={user} />
      <MobileHeader />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
