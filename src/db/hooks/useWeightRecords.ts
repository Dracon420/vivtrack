import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../database'
import type { WeightRecord } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function useWeightRecords(animalId: string | undefined) {
  return useLiveQuery(
    () =>
      animalId
        ? db.weightRecords.where('animalId').equals(animalId).sortBy('measuredAt')
        : [],
    [animalId]
  )
}

export async function addWeightRecord(data: Omit<WeightRecord, 'id' | 'createdAt'>) {
  const record: WeightRecord = { ...data, id: uuidv4(), createdAt: new Date().toISOString() }
  await db.weightRecords.add(record)
  return record
}
