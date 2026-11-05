import { getUser } from '@/lib/auth'
import { searchPatients } from '@/lib/queries'

export async function GET(req: Request) {
  if (!(await getUser())) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const rows = await searchPatients(q, 10)
  return Response.json(rows.map((p) => ({ id: p.id, name: p.name, ic: p.ic })))
}
