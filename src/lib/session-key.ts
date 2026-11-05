// Key that signs login sessions (HS256). Shared by src/proxy.ts and src/lib/auth.ts.
//
// AUTH_SECRET is used when set. Otherwise the key is derived from DATABASE_URL, so a
// deploy only needs the Neon connection string. Anyone who can read DATABASE_URL can
// already read the whole database, so this grants nothing extra. Changing the database
// password (or setting AUTH_SECRET) signs everyone out.
const enc = new TextEncoder()
let derived: { from: string; key: Promise<Uint8Array> } | undefined

async function derive(dbUrl: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', enc.encode(dbUrl), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode('hijraa-wellness/session/v1')))
}

export async function sessionKey(): Promise<Uint8Array> {
  const secret = process.env.AUTH_SECRET
  if (secret) {
    if (secret.length < 16) throw new Error('AUTH_SECRET must be at least 16 characters')
    return enc.encode(secret)
  }
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL is not set')
  if (derived?.from !== dbUrl) derived = { from: dbUrl, key: derive(dbUrl) }
  return derived.key
}
