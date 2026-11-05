import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = /^(application\/pdf|image\/(jpeg|png|webp|gif)|text\/plain)$/

export async function POST(req: Request) {
  const me = await getUser()
  if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const fd = await req.formData()
  const file = fd.get('file')
  const patientId = String(fd.get('patientId') ?? '')
  const title = String(fd.get('title') ?? '').trim()
  const category = String(fd.get('category') ?? 'Other')
  const encounterId = String(fd.get('encounterId') ?? '') || null
  if (!(file instanceof File) || !patientId) return Response.json({ error: 'File and patient are required' }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: 'File too large (max 4 MB). Please compress or split the PDF.' }, { status: 413 })
  if (!ALLOWED.test(file.type)) return Response.json({ error: 'Only PDF, images (JPG/PNG/WebP) and text files are supported' }, { status: 415 })
  const [p] = await sql`select id from patients where id = ${patientId}`
  if (!p) return Response.json({ error: 'Patient not found' }, { status: 404 })
  const data = Buffer.from(await file.arrayBuffer())
  const [doc] = await sql`insert into documents (patient_id, encounter_id, title, category, mime, size, data, uploaded_by)
    values (${patientId}, ${encounterId}, ${title || file.name}, ${category}, ${file.type}, ${file.size}, ${data}, ${me.id}) returning id`
  revalidatePath(`/patients/${patientId}`, 'layout')
  return Response.json({ id: doc.id })
}
