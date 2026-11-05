import { LogoMark } from './Logo'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-16 w-16 drop-shadow" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-wide text-brand-800">HIJRAA WELLNESS</h1>
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
