import writeExcelFile from 'write-excel-file/node'
import { getUser } from '@/lib/auth'
import { CHARGE_KINDS } from '@/lib/types'

export async function GET() {
  const me = await getUser()
  if (!me || me.role !== 'admin') return new Response('Forbidden', { status: 403 })
  const head = ['Type', 'Name', 'Price (RM)'].map((h) => ({ value: h, fontWeight: 'bold' as const, backgroundColor: '#dfe3fd' }))
  const rows = [['Consultation', 'General consultation', 35], ['Procedure', 'Wound toilet & dressing', 25], ['Medication', 'Paracetamol 500mg (10 tabs)', 5], ['Medical certificate', 'MC', 10]]
  const note = [{ value: `Type must be one of: ${CHARGE_KINDS.join(', ')}` }]
  const buffer = await writeExcelFile([head, ...rows, [], note], { columns: [{ width: 22 }, { width: 36 }, { width: 14 }] }).toBuffer()
  return new Response(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="hijraa-price-list-template.xlsx"' },
  })
}
