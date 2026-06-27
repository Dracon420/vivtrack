import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../database'
import type { CareEvent } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function useCareEvents(animalId: string | undefined, limit = 50) {
  return useLiveQuery(
    () =>
      animalId
        ? db.careEvents
            .where('animalId')
            .equals(animalId)
            .reverse()
            .sortBy('occurredAt')
            .then(events => events.slice(0, limit))
        : [],
    [animalId, limit]
  )
}

export function useRecentCareEvents(animalId: string | undefined, type?: CareEvent['type']) {
  return useLiveQuery(
    () => {
      if (!animalId) return []
      let query = db.careEvents.where('animalId').equals(animalId)
      return query.reverse().sortBy('occurredAt').then(events => {
        const filtered = type ? events.filter(e => e.type === type) : events
        return filtered.slice(0, 10)
      })
    },
    [animalId, type]
  )
}

export function useLastCareEvent(animalId: string | undefined, type: CareEvent['type']) {
  return useLiveQuery(
    async () => {
      if (!animalId) return undefined
      const events = await db.careEvents
        .where('[animalId+type]')
        .equals([animalId, type])
        .reverse()
        .sortBy('occurredAt')
      return events[0] as CareEvent | undefined
    },
    [animalId, type]
  )
}

export async function addCareEvent(data: Omit<CareEvent, 'id' | 'createdAt'>) {
  const event: CareEvent = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  }
  await db.careEvents.add(event)

  if (data.type === 'weight' && data.weightGrams && data.animalId) {
    const { db: database } = await import('../database')
    await database.weightRecords.add({
      id: uuidv4(),
      animalId: data.animalId,
      weightGrams: data.weightGrams,
      measuredAt: data.occurredAt,
      createdAt: new Date().toISOString(),
    })
  }

  return event
}

export async function deleteCareEvent(id: string) {
  await db.careEvents.delete(id)
}
