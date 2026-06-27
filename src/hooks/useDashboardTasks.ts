import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { nextDueDate, urgencyLevel } from '@/utils/dateHelpers'
import type { CareEventType } from '@/types'

export interface DashboardTask {
  id: string
  animalId: string
  animalName: string
  species: string
  type: CareEventType | 'colony_low_stock'
  label: string
  dueAt: Date
  urgency: 'overdue' | 'today' | 'soon' | 'ok'
}

export function useDashboardTasks() {
  return useLiveQuery(async () => {
    const animals = await db.animals
      .filter(a => a.status === 'active' || a.status === 'quarantine')
      .toArray()

    const tasks: DashboardTask[] = []

    for (const animal of animals) {
      const schedule = await db.animalCareSchedules
        .where('animalId').equals(animal.id).first()

      if (!schedule) continue

      const allEvents = await db.careEvents
        .where('animalId').equals(animal.id)
        .toArray()

      const lastOfType = (type: CareEventType) =>
        allEvents
          .filter(e => e.type === type)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]

      // Feeding
      if (schedule.feedingIntervalDays) {
        const last = lastOfType('feeding')
        if (last) {
          const due = nextDueDate(last.occurredAt, schedule.feedingIntervalDays)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') {
            tasks.push({ id: `${animal.id}-feeding`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'feeding', label: 'Feeding', dueAt: due, urgency })
          }
        }
      }

      // Substrate clean
      if (schedule.substrateCleanIntervalDays) {
        const last = allEvents
          .filter(e => e.type === 'substrate_clean' || e.type === 'full_clean')
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
        if (last) {
          const due = nextDueDate(last.occurredAt, schedule.substrateCleanIntervalDays)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') {
            tasks.push({ id: `${animal.id}-clean`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'substrate_clean', label: 'Enclosure Clean', dueAt: due, urgency })
          }
        }
      }

      // Misting
      if (schedule.mistingIntervalHours) {
        const last = lastOfType('misting')
        if (last) {
          const intervalDays = schedule.mistingIntervalHours / 24
          const due = nextDueDate(last.occurredAt, intervalDays)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') {
            tasks.push({ id: `${animal.id}-misting`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'misting', label: 'Misting', dueAt: due, urgency })
          }
        }
      }

      // Water change
      if (schedule.waterChangeIntervalDays) {
        const last = lastOfType('watering')
        if (last) {
          const due = nextDueDate(last.occurredAt, schedule.waterChangeIntervalDays)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') {
            tasks.push({ id: `${animal.id}-watering`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'watering', label: 'Water Change', dueAt: due, urgency })
          }
        }
      }
    }

    // Colony low-stock alerts
    const colonies = await db.feederColonies.toArray()
    for (const colony of colonies) {
      if (colony.lowStockThreshold && colony.estimatedCount !== undefined && colony.estimatedCount < colony.lowStockThreshold) {
        tasks.push({
          id: `colony-${colony.id}`,
          animalId: '',
          animalName: colony.name,
          species: colony.species,
          type: 'colony_low_stock',
          label: 'Low Stock',
          dueAt: new Date(),
          urgency: 'today',
        })
      }
    }

    return tasks.sort((a, b) => {
      const order = { overdue: 0, today: 1, soon: 2, ok: 3 }
      return order[a.urgency] - order[b.urgency] || a.dueAt.getTime() - b.dueAt.getTime()
    })
  }, [])
}
