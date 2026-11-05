import 'server-only'
import postgres from 'postgres'
import { parseEnv } from '@neon/env'
import neonConfig from '../../neon'

declare global {
  var __sql: ReturnType<typeof postgres> | undefined
}

function create() {
  // Validates the env injected by `neon env pull` / Vercel against neon.ts.
  // App traffic uses the pooled URL (PgBouncer); migrations use DATABASE_URL_UNPOOLED.
  const { postgres: pg } = parseEnv(neonConfig, ['DATABASE_URL'])
  return postgres(pg.databaseUrl, {
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

// Lazy: connect on first query, so `next build` never needs the database.
function db() {
  return (globalThis.__sql ??= create())
}

export const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  apply: (_t, _this, args) => Reflect.apply(db() as unknown as (...a: unknown[]) => unknown, undefined, args),
  get: (_t, prop) => {
    const v = Reflect.get(db(), prop)
    return typeof v === 'function' ? v.bind(db()) : v
  },
})
