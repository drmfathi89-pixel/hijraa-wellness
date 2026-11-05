'use server'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { createSession, destroySession, requireUser } from '@/lib/auth'
import { str, cleanUsername } from '@/lib/utils'

export type FormState = { error?: string; ok?: string } | undefined

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const login = str(fd.get('username'))?.toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!login || !password) return { error: 'Username and password are required' }
  // Username normally; older accounts can still type their email.
  const [u] = await sql`select id, password_hash, active from users where lower(username) = ${login} or lower(email) = ${login} order by (lower(username) = ${login}) desc limit 1`
  if (!u || !u.active || !(await bcrypt.compare(password, u.password_hash))) return { error: 'Invalid username or password' }
  await createSession(u.id)
  redirect('/')
}

export async function setupAdmin(_: FormState, fd: FormData): Promise<FormState> {
  const [{ count }] = await sql`select count(*)::int as count from users`
  if (count > 0) return { error: 'Setup already completed. Please log in.' }
  const name = str(fd.get('name'))
  const username = cleanUsername(fd.get('username'))
  const email = str(fd.get('email'))?.toLowerCase() ?? null
  const password = String(fd.get('password') ?? '')
  if (!name) return { error: 'Full name is required' }
  if (!username) return { error: 'Username must be 3-32 letters, numbers, dots, dashes or underscores' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }
  const hash = await bcrypt.hash(password, 10)
  const [u] = await sql`insert into users (name, username, email, password_hash, role, roles) values (${name}, ${username}, ${email}, ${hash}, 'admin', '{admin,doctor}') returning id`
  await createSession(u.id)
  redirect('/')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser()
  const current = String(fd.get('current') ?? '')
  const next = String(fd.get('next') ?? '')
  if (next.length < 8) return { error: 'New password must be at least 8 characters' }
  const [u] = await sql`select password_hash from users where id = ${me.id}`
  if (!(await bcrypt.compare(current, u.password_hash))) return { error: 'Current password is incorrect' }
  await sql`update users set password_hash = ${await bcrypt.hash(next, 10)} where id = ${me.id}`
  return { ok: 'Password updated' }
}
