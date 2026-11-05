import writeExcelFile from 'write-excel-file/node'
import { getUser } from '@/lib/auth'
import { TEMPLATE_HEADERS } from '@/lib/excel'

export async function GET() {
  if (!(await getUser())) return new Response('Unauthorized', { status: 401 })
  const header = TEMPLATE_HEADERS.map((h) => ({ value: h, fontWeight: 'bold' as const, backgroundColor: '#d5f4ea' }))
  const sample = ['900101-14-5678', 'AHMAD BIN ALI', '15/03/2024', 'Klinik Kesihatan Ampang', 'Dr. Siti', 'Fever x 3 days', 'Acute viral fever', 'Paracetamol 1g TDS x 3/7', 'Advised hydration', 'Male', '01/01/1990', '012-3456789', 'Ampang, Selangor']
  const buffer = await writeExcelFile([header, sample], { columns: TEMPLATE_HEADERS.map(() => ({ width: 22 })) }).toBuffer()
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="hijraa-past-records-template.xlsx"',
    },
  })
}
