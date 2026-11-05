'use server'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { createSession, destroySession, requireUser } from '@/lib/auth'
import { str } from '@/lib/utils'

export type FormState = { error?: string; ok?: string } | undefined

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd.get('email'))?.toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!email || !password) return { error: 'Email and password are required' }
  const [u] = await sql`select id, password_hash, active from users where email = ${email}`
  if (!u || !u.active || !(await bcrypt.compare(password, u.password_hash))) return { error: 'Invalid email or password' }
  await createSession(u.id)
  redirect('/')
}

export async function setupAdmin(_: FormState, fd: FormData): Promise<FormState> {
  const [{ count }] = await sql`select count(*)::int as count from users`
  if (count > 0) return { error: 'Setup already completed. Please log in.' }
  const name = str(fd.get('name'))
  const email = str(fd.get('email'))?.toLowerCase()
  const password = String(fd.get('password') ?? '')
  if (!name || !email) return { error: 'Name and email are required' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }
  const hash = await bcrypt.hash(password, 10)
  const [u] = await sql`insert into users (name, email, password_hash, role) values (${name}, ${email}, ${hash}, 'admin') returning id`
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
