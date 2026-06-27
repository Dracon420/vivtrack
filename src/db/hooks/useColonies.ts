import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../database'
import type { FeederColony, CUCCulture, ColonyLogEvent } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function useFeederColonies() {
  return useLiveQuery(() => db.feederColonies.orderBy('name').toArray(), [])
}

export function useCUCCultures() {
  return useLiveQuery(() => db.cucCultures.orderBy('name').toArray(), [])
}

export function useColonyLogEvents(colonyId: string | undefined) {
  return useLiveQuery(
    () =>
      colonyId
        ? db.colonyLogEvents.where('colonyId').equals(colonyId).reverse().sortBy('occurredAt')
        : [],
    [colonyId]
  )
}

export async function addFeederColony(data: Omit<FeederColony, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const colony: FeederColony = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  await db.feederColonies.add(colony)
  return colony
}

export async function updateFeederColony(id: string, changes: Partial<FeederColony>) {
  await db.feederColonies.update(id, { ...changes, updatedAt: new Date().toISOString() })
}

export async function addCUCCulture(data: Omit<CUCCulture, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const culture: CUCCulture = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  await db.cucCultures.add(culture)
  return culture
}

export async function updateCUCCulture(id: string, changes: Partial<CUCCulture>) {
  await db.cucCultures.update(id, { ...changes, updatedAt: new Date().toISOString() })
}

export async function addColonyLogEvent(data: Omit<ColonyLogEvent, 'id' | 'createdAt'>) {
  const event: ColonyLogEvent = { ...data, id: uuidv4(), createdAt: new Date().toISOString() }
  await db.colonyLogEvents.add(event)
  return event
}
