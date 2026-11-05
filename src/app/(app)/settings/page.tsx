import { LogOut } from 'lucide-react'
import { sql } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { logout, changePassword } from '@/app/actions/auth'
import { addUser, toggleUser, resetPassword } from '@/app/actions/users'
import { PageHeader, Field } from '@/components/ui'
import MiniForm from '@/components/MiniForm'
import InstallHint from '@/components/InstallHint'

export const metadata = { title: 'Settings' }

export default async function Settings() {
  const me = await requireUser()
  const users = me.role === 'admin' ? await sql<{ id: string; name: string; username: string | null; email: string | null; role: string; active: boolean }[]>`select id, name, username, email, role, active from users order by created_at` : []
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="h-section mb-1">My account</h2>
          <p className="text-sm text-slate-600">{me.name} · @{me.username}{me.email ? ` · ${me.email}` : ''} · <span className="capitalize">{me.role}</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MiniForm action={changePassword} label="Change password" submit="Update password">
              <Field label="Current password"><input type="password" name="current" className="input" required autoComplete="current-password" /></Field>
              <Field label="New password"><input type="password" name="next" className="input" required minLength={8} autoComplete="new-password" /></Field>
            </MiniForm>
          </div>
          <form action={logout} className="mt-4"><button className="btn-danger w-full sm:w-auto"><LogOut size={16} /> Log out</button></form>
        </section>
        <InstallHint />
        {me.role === 'admin' && (
          <section className="card card-pad lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="h-section">Clinic users</h2>
              <MiniForm action={addUser} label="Add user" submit="Create user">
                <Field label="Full name"><input name="name" className="input" required /></Field>
                <Field label="Username"><input name="username" className="input" required autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="e.g. drsiti" /></Field>
                <Field label="Email (optional)"><input type="email" name="email" className="input" /></Field>
                <Field label="Role"><select name="role" className="input"><option value="doctor">Doctor</option><option value="staff">Staff</option><option value="admin">Admin</option></select></Field>
                <Field label="Temporary password"><input type="text" name="password" className="input" required minLength={8} /></Field>
              </MiniForm>
            </div>
            <ul className="mt-4 divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{u.name} {!u.active && <span className="badge bg-slate-200 text-slate-600">disabled</span>}</div>
                    <div className="text-xs text-slate-500">@{u.username ?? '-'}{u.email ? ` · ${u.email}` : ''} · <span className="capitalize">{u.role}</span></div>
                  </div>
                  {u.id !== me.id && (
                    <>
                      <MiniForm action={resetPassword.bind(null, u.id)} label="Reset password" submit="Set">
                        <Field label="New password" className="sm:col-span-2"><input name="password" className="input" required minLength={8} /></Field>
                      </MiniForm>
                      <form action={toggleUser.bind(null, u.id)}><button className="btn-secondary btn-sm">{u.active ? 'Disable' : 'Enable'}</button></form>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
