import { Logo } from './Logo'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center bg-gradient-to-br from-brand-50 via-white to-pulse/10 px-4">
      <div className="brand-stripe absolute inset-x-0 top-0 h-1" />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-32 w-auto" />
          <h1 className="sr-only">HIJRAA WELLNESS</h1>
          <p className="text-sm text-slate-500">Clinic Management System</p>
        </div>
        <div className="card card-pad">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  )
}
