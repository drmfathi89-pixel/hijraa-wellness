import postgres from 'postgres'

declare global {
  var __sql: ReturnType<typeof postgres> | undefined
}

function create() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return postgres(url, {
    max: 5,
    prepare: false, // compatible with Neon's pooled (pgbouncer) connection string
    idle_timeout: 20,
    onnotice: () => {},
    types: {
      // keep `date` columns as plain 'YYYY-MM-DD' strings (no timezone shifting)
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
      // numeric -> JS number
      numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
    },
  })
}

export const sql = globalThis.__sql ?? create()
if (process.env.NODE_ENV !== 'production') globalThis.__sql = sql
