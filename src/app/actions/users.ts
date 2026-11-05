'use server'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { str } from '@/lib/utils'
import type { FormState } from './auth'

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin()
  const name = str(fd.get('name')), email = str(fd.get('email'))?.toLowerCase(), role = String(fd.get('role') ?? 'doctor')
  const password = String(fd.get('password') ?? '')
  if (!name || !email) return { error: 'Name and email are required' }
  if (!['admin', 'doctor', 'staff'].includes(role)) return { error: 'Invalid role' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }
  const [exists] = await sql`select 1 from users where email=${email}`
  if (exists) return { error: 'Email already in use' }
  await sql`insert into users (name, email, password_hash, role) values (${name}, ${email}, ${await bcrypt.hash(password, 10)}, ${role})`
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
