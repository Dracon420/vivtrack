import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../database'
import type { Animal, AnimalCareSchedule } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function useAnimals() {
  return useLiveQuery(() => db.animals.orderBy('name').toArray(), [])
}

export function useAnimal(id: string | undefined) {
  return useLiveQuery(() => (id ? db.animals.get(id) : undefined), [id])
}

export function useAnimalsByStatus(status: Animal['status']) {
  return useLiveQuery(() => db.animals.where('status').equals(status).toArray(), [status])
}

export function useCareSchedule(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.animalCareSchedules.where('animalId').equals(animalId).first() : undefined),
    [animalId]
  )
}

export async function addAnimal(data: Omit<Animal, 'id' | 'qrCodeToken' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()
  const animal: Animal = {
    ...data,
    id: uuidv4(),
    qrCodeToken: uuidv4(),
    createdAt: now,
    updatedAt: now,
  }
  await db.animals.add(animal)
  return animal
}

export async function updateAnimal(id: string, changes: Partial<Animal>) {
  await db.animals.update(id, { ...changes, updatedAt: new Date().toISOString() })
}

export async function deleteAnimal(id: string) {
  await db.transaction('rw', [db.animals, db.careEvents, db.weightRecords, db.animalPhotos, db.animalCareSchedules], async () => {
    await db.animals.delete(id)
    await db.careEvents.where('animalId').equals(id).delete()
    await db.weightRecords.where('animalId').equals(id).delete()
    await db.animalPhotos.where('animalId').equals(id).delete()
    await db.animalCareSchedules.where('animalId').equals(id).delete()
  })
}

export async function saveCareSchedule(schedule: Omit<AnimalCareSchedule, 'id'> & { id?: string }) {
  const now = new Date().toISOString()
  if (schedule.id) {
    await db.animalCareSchedules.put({ ...schedule, id: schedule.id, updatedAt: now } as AnimalCareSchedule)
  } else {
    await db.animalCareSchedules.add({ ...schedule, id: uuidv4(), updatedAt: now } as AnimalCareSchedule)
  }
}
