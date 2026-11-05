'use server'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { str } from '@/lib/utils'
import type { FormState } from './auth'
import { CHARGE_KINDS } from '@/lib/types'


function read(fd: FormData) {
  const kind = String(fd.get('kind') ?? 'Other')
  const price = Number(fd.get('price'))
  return { kind: CHARGE_KINDS.includes(kind) ? kind : 'Other', name: str(fd.get('name')), price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : null }
}

export async function addPrice(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin()
  const p = read(fd)
  if (!p.name) return { error: 'Name is required' }
  if (p.price === null) return { error: 'Enter a valid price' }
  const [dup] = await sql`select 1 from charge_items where lower(kind)=lower(${p.kind}) and lower(name)=lower(${p.name})`
  if (dup) return { error: `${p.name} is already in the price list` }
  await sql`insert into charge_items (kind, name, price) values (${p.kind}, ${p.name}, ${p.price})`
  revalidatePath('/settings')
  return { ok: `${p.name} added` }
}

export async function updatePrice(id: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin()
  const p = read(fd)
  if (!p.name) return { error: 'Name is required' }
  if (p.price === null) return { error: 'Enter a valid price' }
  const [dup] = await sql`select 1 from charge_items where lower(kind)=lower(${p.kind}) and lower(name)=lower(${p.name}) and id <> ${id}`
  if (dup) return { error: `${p.name} is already in the price list` }
  await sql`update charge_items set kind=${p.kind}, name=${p.name}, price=${p.price} where id=${id}`
  revalidatePath('/settings')
  return { ok: 'Saved' }
}

export async function togglePrice(id: string) {
  await requireAdmin()
  await sql`update charge_items set active = not active where id=${id}`
  revalidatePath('/settings')
}
