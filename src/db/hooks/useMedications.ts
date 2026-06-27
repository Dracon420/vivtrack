import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../database'
import type { Medication } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function useMedications(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.medications.where('animalId').equals(animalId).toArray() : []),
    [animalId]
  )
}

export function useActiveMedications(animalId: string | undefined) {
  return useLiveQuery(
    () =>
      animalId
        ? db.medications.where('animalId').equals(animalId).filter(m => m.status === 'active').toArray()
        : [],
    [animalId]
  )
}

export async function addMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const med: Medication = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  await db.medications.add(med)
  return med
}

export async function updateMedication(id: string, changes: Partial<Medication>) {
  await db.medications.update(id, { ...changes, updatedAt: new Date().toISOString() })
}
