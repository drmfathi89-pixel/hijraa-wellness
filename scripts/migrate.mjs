// Applies db/schema.sql. Runs automatically before `next build` (e.g. on Vercel).
// Uses Neon's direct (unpooled) connection for DDL; falls back to DATABASE_URL.
import postgres from 'postgres'
import { readFileSync } from 'node:fs'

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!url) {
  console.warn('[migrate] DATABASE_URL_UNPOOLED / DATABASE_URL not set - skipping migration')
  process.exit(0)
}
const sql = postgres(url, { max: 1, onnotice: () => {} })
try {
  await sql.unsafe(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
  const host = new URL(url).hostname
  console.log(`[migrate] schema up to date on ${host}`)
} finally {
  await sql.end()
}
