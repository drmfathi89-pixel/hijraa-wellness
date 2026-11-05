'use server'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { str, cleanUsername, readRoles } from '@/lib/utils'
import type { FormState } from './auth'

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin()
  const name = str(fd.get('name')), username = cleanUsername(fd.get('username')), roles = readRoles(fd)
  const email = str(fd.get('email'))?.toLowerCase() ?? null
  const password = String(fd.get('password') ?? '')
  if (!name) return { error: 'Full name is required' }
  if (!username) return { error: 'Username must be 3-32 letters, numbers, dots, dashes or underscores' }
  if (roles.length === 0) return { error: 'Choose at least one role' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }
  const [taken] = await sql`select 1 from users where lower(username) = ${username}`
  if (taken) return { error: 'That username is already taken' }
  if (email) {
    const [exists] = await sql`select 1 from users where lower(email) = ${email}`
    if (exists) return { error: 'Email already in use' }
  }
  await sql`insert into users (name, username, email, password_hash, role, roles) values (${name}, ${username}, ${email}, ${await bcrypt.hash(password, 10)}, ${roles[0]}, ${roles}::text[])`
  revalidatePath('/settings')
  return { ok: `User ${name} created` }
}

export async function toggleUser(id: string) {
  const me = await requireAdmin()
  if (id === me.id) return
  await sql`update users set active = not active where id=${id}`
  revalidatePath('/settings')
}

export async function resetPassword(id: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin()
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
  if (id === me.id && !roles.includes('admin')) return { error: 'You cannot remove your own admin role' }
  const [taken] = await sql`select 1 from users where lower(username) = ${username} and id <> ${id}`
  if (taken) return { error: 'That username is already taken' }
  if (email) {
    const [exists] = await sql`select 1 from users where lower(email) = ${email} and id <> ${id}`
    if (exists) return { error: 'Email already in use' }
  }
  await sql`update users set name=${name}, username=${username}, email=${email}, roles=${roles}::text[], role=${roles[0]} where id=${id}`
  revalidatePath('/settings')
  return { ok: 'User updated' }
}
