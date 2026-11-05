import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { sessionKey } from '@/lib/session-key'

const PUBLIC = ['/login', '/setup', '/manifest.webmanifest', '/sw.js', '/offline']

// Fast first gate (signature + expiry). Every page, route handler and server action
// also calls getUser()/requireUser(), which checks the account is still active.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next()
  const token = req.cookies.get('hw_session')?.value
  let ok = false
  if (token) {
    try {
      await jwtVerify(token, await sessionKey())
      ok = true
    } catch {}
  }
  if (!ok) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|brand/|pdf.worker.min.mjs|.*\\.(?:png|svg)$).*)'],
}
