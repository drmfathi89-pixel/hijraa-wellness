import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { sql } from './db'

export const SESSION_COOKIE = 'hw_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export type SessionUser = { id: string; name: string; email: string; role: 'admin' | 'doctor' | 'staff' }

function key() {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 16) throw new Error('AUTH_SECRET must be set (min 16 chars)')
  return new TextEncoder().encode(s)
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key())
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX_AGE })
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key())
    const [u] = await sql<SessionUser[]>`select id, name, email, role from users where id = ${payload.sub as string} and active`
    return u ?? null
  } catch {
    return null
  }
})

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser()
  if (!u) redirect('/login')
  return u
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'admin') redirect('/')
  return u
}
