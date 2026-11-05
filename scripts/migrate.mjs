// Applies db/schema.sql. Runs automatically before `next build` (e.g. on Vercel).
import postgres from 'postgres'
import { readFileSync } from 'node:fs'

const url = process.env.DATABASE_URL
if (!url) {
  console.warn('[migrate] DATABASE_URL not set - skipping migration')
  process.exit(0)
}
const sql = postgres(url, { max: 1, onnotice: () => {} })
try {
  await sql.unsafe(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
  console.log('[migrate] schema up to date')
} finally {
  await sql.end()
}
