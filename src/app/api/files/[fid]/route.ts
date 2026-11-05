import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(_: Request, { params }: { params: Promise<{ fid: string }> }) {
  if (!(await getUser())) return new Response('Unauthorized', { status: 401 })
  const { fid } = await params
  if (!/^[0-9a-f-]{36}$/i.test(fid)) return new Response('Not found', { status: 404 })
  const [doc] = await sql`select title, mime, data from documents where id = ${fid}`
  if (!doc) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(doc.data as Buffer), {
    headers: {
      'Content-Type': doc.mime,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.title)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
