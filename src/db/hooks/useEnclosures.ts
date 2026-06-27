import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../database'
import type { Enclosure } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function useEnclosures() {
  return useLiveQuery(() => db.enclosures.orderBy('name').toArray(), [])
}

export function useEnclosure(id: string | undefined) {
  return useLiveQuery(() => (id ? db.enclosures.get(id) : undefined), [id])
}

export async function addEnclosure(data: Omit<Enclosure, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const enclosure: Enclosure = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  await db.enclosures.add(enclosure)
  return enclosure
}

export async function updateEnclosure(id: string, changes: Partial<Enclosure>) {
  await db.enclosures.update(id, { ...changes, updatedAt: new Date().toISOString() })
}

export async function deleteEnclosure(id: string) {
  await db.enclosures.delete(id)
}
