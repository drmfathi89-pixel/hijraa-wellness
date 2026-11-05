import 'server-only'
import { sql } from './db'
import { DEFAULT_TEMPLATES } from './whatsapp'

export type Templates = typeof DEFAULT_TEMPLATES

export async function getTemplates(): Promise<Templates> {
  const rows = await sql<{ key: string; value: string }[]>`select key, value from app_settings where key like 'wa_%'`
  const m = Object.fromEntries(rows.map((r) => [r.key.slice(3), r.value]))
  return { reminder: m.reminder ?? DEFAULT_TEMPLATES.reminder, blast: m.blast ?? DEFAULT_TEMPLATES.blast, clinic: m.clinic ?? DEFAULT_TEMPLATES.clinic }
}
