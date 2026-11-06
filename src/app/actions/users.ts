'use server'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAdmin, requireSuper, isSuper, isAdmin, audit } from '@/lib/auth'
import { str, cleanUsername, readRoles } from '@/lib/utils'
import type { FormState } from './auth'

/** Only a superadmin may change a superadmin's account. */
async function guardTarget(me: { roles: string[] }, id: string): Promise<string | null> {
  const [t] = await sql<{ roles: string[] }[]>`select roles from users where id = ${id}`
  if (!t) return 'User not found'
  if (t.roles.includes('superadmin') && !isSuper(me)) return 'Only a superadmin can change a superadmin account'
  return null
}

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin()
  const name = str(fd.get('name')), username = cleanUsername(fd.get('username')), roles = readRoles(fd)
  const email = str(fd.get('email'))?.toLowerCase() ?? null
  const password = String(fd.get('password') ?? '')
  if (!name) return { error: 'Full name is required' }
  if (!username) return { error: 'Username must be 3-32 letters, numbers, dots, dashes or underscores' }
  if (roles.length === 0) return { error: 'Choose at least one role' }
  if (roles.includes('superadmin') && !isSuper(me)) return { error: 'Only a superadmin can create a superadmin' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }
  const [taken] = await sql`select 1 from users where lower(username) = ${username}`
  if (taken) return { error: 'That username is already taken' }
  if (email) {
    const [exists] = await sql`select 1 from users where lower(email) = ${email}`
    if (exists) return { error: 'Email already in use' }
  }
  await sql`insert into users (name, username, email, password_hash, role, roles) values (${name}, ${username}, ${email}, ${await bcrypt.hash(password, 10)}, ${roles[0]}, ${roles}::text[])`
  if (roles.includes('superadmin')) await audit(me, 'superadmin.added', `${name} (@${username})`)
  revalidatePath('/settings')
  return { ok: `User ${name} created` }
}

export async function toggleUser(id: string) {
  const me = await requireAdmin()
  if (id === me.id || (await guardTarget(me, id))) return
  await sql`update users set active = not active where id=${id}`
  revalidatePath('/settings')
}

export async function resetPassword(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin()
  const denied = await guardTarget(me, id)
  if (denied) return { error: denied }
  const password = String(fd.get('password') ?? '')
  if (password.length < 8) return { error: 'Min 8 characters' }
  await sql`update users set password_hash=${await bcrypt.hash(password, 10)} where id=${id}`
  return { ok: 'Password reset' }
}

export async function updateUser(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin()
  const name = str(fd.get('name')), username = cleanUsername(fd.get('username'))
  const email = str(fd.get('email'))?.toLowerCase() ?? null
  const roles = readRoles(fd)
  if (!name) return { error: 'Full name is required' }
  if (!username) return { error: 'Username must be 3-32 letters, numbers, dots, dashes or underscores' }
  if (roles.length === 0) return { error: 'Choose at least one role' }
  const denied = await guardTarget(me, id)
  if (denied) return { error: denied }
  if (roles.includes('superadmin') && !isSuper(me)) return { error: 'Only a superadmin can make someone a superadmin' }
  if (id === me.id && !isAdmin({ roles })) return { error: 'You cannot remove your own admin role' }
  if (id === me.id && isSuper(me) && !roles.includes('superadmin')) return { error: 'You cannot remove your own superadmin role. Ask another superadmin.' }
  const [before] = await sql<{ roles: string[] }[]>`select roles from users where id = ${id}`
  const [taken] = await sql`select 1 from users where lower(username) = ${username} and id <> ${id}`
  if (taken) return { error: 'That username is already taken' }
  if (email) {
    const [exists] = await sql`select 1 from users where lower(email) = ${email} and id <> ${id}`
    if (exists) return { error: 'Email already in use' }
  }
  await sql`update users set name=${name}, username=${username}, email=${email}, roles=${roles}::text[], role=${roles[0]} where id=${id}`
  if (before && before.roles.includes('superadmin') !== roles.includes('superadmin')) await audit(me, roles.includes('superadmin') ? 'superadmin.added' : 'superadmin.removed', `${name} (@${username})`)
  revalidatePath('/settings')
  return { ok: 'User updated' }
}

/** Superadmin: set or change the personal passkey that deleting a patient requires. */
export async function setDeletePasskey(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireSuper()
  const password = String(fd.get('password') ?? ''), passkey = String(fd.get('passkey') ?? ''), confirm = String(fd.get('confirm') ?? '')
  const [u] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${me.id}`
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return { error: 'Your login password is incorrect' }
  if (passkey.length < 6) return { error: 'The passkey must be at least 6 characters' }
  if (passkey !== confirm) return { error: 'The two passkeys do not match' }
  if (await bcrypt.compare(passkey, u.password_hash)) return { error: 'Use a passkey different from your login password' }
  await sql`update users set delete_passkey_hash = ${await bcrypt.hash(passkey, 10)} where id = ${me.id}`
  await audit(me, 'passkey.set', 'Delete passkey set or changed')
  revalidatePath('/settings')
  return { ok: 'Passkey saved' }
}
