import { LogOut } from 'lucide-react'
import { sql } from '@/lib/db'
import { requireUser, isAdmin } from '@/lib/auth'
import { rolesText } from '@/lib/utils'
import RolePicker from '@/components/RolePicker'
import { logout, changePassword } from '@/app/actions/auth'
import { addUser, toggleUser, resetPassword, updateUser } from '@/app/actions/users'
import { addPrice, updatePrice, togglePrice } from '@/app/actions/prices'
import { CHARGE_KINDS, rm, type PriceItem } from '@/lib/types'
import { PageHeader, Field } from '@/components/ui'
import MiniForm from '@/components/MiniForm'
import InstallHint from '@/components/InstallHint'
import PriceImport from '@/components/PriceImport'

export const metadata = { title: 'Settings' }

export default async function Settings() {
  const me = await requireUser()
  const users = isAdmin(me) ? await sql<{ id: string; name: string; username: string | null; email: string | null; roles: string[]; active: boolean }[]>`select id, name, username, email, roles, active from users order by created_at` : []
  const prices = isAdmin(me) ? await sql<PriceItem[]>`select id, kind, name, price, active from charge_items order by kind, lower(name)` : []
  const kinds = [...new Set(prices.map((p) => p.kind))]
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad">
          <h2 className="h-section mb-1">My account</h2>
          <p className="text-sm text-slate-600">{me.name} · @{me.username}{me.email ? ` · ${me.email}` : ''} · <span>{rolesText(me.roles)}</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MiniForm action={changePassword} label="Change password" submit="Update password">
              <Field label="Current password"><input type="password" name="current" className="input" required autoComplete="current-password" /></Field>
              <Field label="New password"><input type="password" name="next" className="input" required minLength={8} autoComplete="new-password" /></Field>
            </MiniForm>
          </div>
          <form action={logout} className="mt-4"><button className="btn-danger w-full sm:w-auto"><LogOut size={16} /> Log out</button></form>
        </section>
        <InstallHint />
        {isAdmin(me) && (
          <section className="card card-pad lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="h-section">Clinic users</h2>
              <MiniForm action={addUser} label="Add user" submit="Create user">
                <Field label="Full name"><input name="name" className="input" required /></Field>
                <Field label="Username"><input name="username" className="input" required autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="e.g. drsiti" /></Field>
                <Field label="Email (optional)"><input type="email" name="email" className="input" /></Field>
                <Field label="Roles"><RolePicker /></Field>
                <Field label="Temporary password"><input type="text" name="password" className="input" required minLength={8} /></Field>
              </MiniForm>
            </div>
            <ul className="mt-4 divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{u.name} {!u.active && <span className="badge bg-slate-200 text-slate-600">disabled</span>}</div>
                    <div className="text-xs text-slate-500">@{u.username ?? '-'}{u.email ? ` · ${u.email}` : ''} · <span>{rolesText(u.roles)}</span></div>
                  </div>
                  <MiniForm action={updateUser.bind(null, u.id)} label="Edit" submit="Save">
                    <Field label="Full name"><input name="name" className="input" required defaultValue={u.name} /></Field>
                    <Field label="Username"><input name="username" className="input" required defaultValue={u.username ?? ''} autoCapitalize="none" autoCorrect="off" spellCheck={false} /></Field>
                    <Field label="Email (optional)"><input type="email" name="email" className="input" defaultValue={u.email ?? ''} /></Field>
                    <Field label="Roles"><RolePicker value={u.roles} /></Field>
                  </MiniForm>
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
        {isAdmin(me) && (
          <section className="card card-pad lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="h-section">Price list</h2>
                <p className="text-xs text-slate-500">Consultation types, procedures, medications and other chargeable items. Doctors pick these in an encounter&apos;s Charges.</p>
                <PriceImport />
              </div>
              <MiniForm action={addPrice} label="Add item" submit="Add">
                <Field label="Type"><select name="kind" className="input">{CHARGE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
                <Field label="Name"><input name="name" className="input" required placeholder="e.g. General consultation" /></Field>
                <Field label="Price (RM)"><input name="price" type="number" inputMode="decimal" min="0" step="0.01" className="input" required placeholder="0.00" /></Field>
              </MiniForm>
            </div>
            {prices.length === 0 ? <p className="mt-4 text-sm text-slate-400">No items yet. Add your consultation fees, procedures and medications.</p> : kinds.map((k) => (
              <div key={k} className="mt-4">
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-700">{k}</h3>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {prices.filter((p) => p.kind === k).map((p) => (
                    <li key={p.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 ${p.active ? '' : 'opacity-50'}`}>
                      <span className="min-w-0 flex-1 font-medium">{p.name} {!p.active && <span className="badge bg-slate-200 text-slate-600">hidden</span>}</span>
                      <span className="font-semibold">{rm(p.price)}</span>
                      <MiniForm action={updatePrice.bind(null, p.id)} label="Edit" submit="Save">
                        <Field label="Type"><select name="kind" className="input" defaultValue={p.kind}>{CHARGE_KINDS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                        <Field label="Name"><input name="name" className="input" required defaultValue={p.name} /></Field>
                        <Field label="Price (RM)"><input name="price" type="number" inputMode="decimal" min="0" step="0.01" className="input" required defaultValue={p.price.toFixed(2)} /></Field>
                      </MiniForm>
                      <form action={togglePrice.bind(null, p.id)}><button className="btn-secondary btn-sm">{p.active ? 'Hide' : 'Show'}</button></form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  )
}
