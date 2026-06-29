import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useUIStore } from '@/store/uiStore'
import { nextDueDate, urgencyLevel } from '@/utils/dateHelpers'
import { scheduleTaskNotifications } from '@/utils/notifications'
import type { Animal, AnimalCareSchedule, CareEvent, FeederColony, CareEventType } from '@/types'

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

let ch = 0

export function useDashboardTasks(): DashboardTask[] | undefined {
  const { user } = useAuth()
  const { notificationsEnabled, notificationLeadMinutes } = useUIStore()
  const [tasks, setTasks] = useState<DashboardTask[] | undefined>()

  const compute = useCallback(async () => {
    if (!user) { setTasks([]); return }

    const [animalsRes, schedulesRes, eventsRes, coloniesRes] = await Promise.all([
      supabase.from('animals').select('data').eq('user_id', user.id),
      supabase.from('animal_care_schedules').select('data').eq('user_id', user.id),
      supabase.from('care_events').select('data').eq('user_id', user.id),
      supabase.from('feeder_colonies').select('data').eq('user_id', user.id),
    ])

    const animals = (animalsRes.data ?? []).map(r => r.data as Animal)
      .filter(a => a.status === 'active' || a.status === 'quarantine')
    const schedules = (schedulesRes.data ?? []).map(r => r.data as AnimalCareSchedule)
    const allEvents = (eventsRes.data ?? []).map(r => r.data as CareEvent)
    const colonies = (coloniesRes.data ?? []).map(r => r.data as FeederColony)

    const result: DashboardTask[] = []

    for (const animal of animals) {
      const schedule = schedules.find(s => s.animalId === animal.id)
      if (!schedule) continue

      const animalEvents = allEvents.filter(e => e.animalId === animal.id)
      const lastOfType = (type: CareEventType) =>
        animalEvents.filter(e => e.type === type).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]

      const start = schedule.scheduleStartDate

      if (schedule.feedingIntervalDays) {
        const anchor = lastOfType('feeding')?.occurredAt ?? start
        if (anchor) {
          const due = nextDueDate(anchor, schedule.feedingIntervalDays)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') result.push({ id: `${animal.id}-feeding`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'feeding', label: 'Feeding', dueAt: due, urgency })
        }
      }

      if (schedule.substrateCleanIntervalDays) {
        const anchor = animalEvents.filter(e => e.type === 'substrate_clean' || e.type === 'full_clean').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt ?? start
        if (anchor) {
          const due = nextDueDate(anchor, schedule.substrateCleanIntervalDays)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') result.push({ id: `${animal.id}-clean`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'substrate_clean', label: 'Substrate Clean', dueAt: due, urgency })
        }
      }

      if (schedule.substrateChangeIntervalDays) {
        const anchor = lastOfType('substrate_change')?.occurredAt ?? start
        if (anchor) {
          const due = nextDueDate(anchor, schedule.substrateChangeIntervalDays)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') result.push({ id: `${animal.id}-substrate-change`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'substrate_change', label: 'Substrate Change', dueAt: due, urgency })
        }
      }

      if (schedule.mistingIntervalHours) {
        const anchor = lastOfType('misting')?.occurredAt ?? start
        if (anchor) {
          const due = nextDueDate(anchor, schedule.mistingIntervalHours / 24)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') result.push({ id: `${animal.id}-misting`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'misting', label: 'Misting', dueAt: due, urgency })
        }
      }

      if (schedule.waterChangeIntervalDays) {
        const anchor = lastOfType('watering')?.occurredAt ?? start
        if (anchor) {
          const due = nextDueDate(anchor, schedule.waterChangeIntervalDays)
          const urgency = urgencyLevel(due)
          if (urgency !== 'ok') result.push({ id: `${animal.id}-watering`, animalId: animal.id, animalName: animal.name, species: animal.species, type: 'watering', label: 'Water Change', dueAt: due, urgency })
        }
      }
    }

    for (const colony of colonies) {
      if (colony.lowStockThreshold && colony.estimatedCount !== undefined && colony.estimatedCount < colony.lowStockThreshold) {
        result.push({ id: `colony-${colony.id}`, animalId: '', animalName: colony.name, species: colony.species, type: 'colony_low_stock', label: 'Low Stock', dueAt: new Date(), urgency: 'today' })
      }
    }

    const order = { overdue: 0, today: 1, soon: 2, ok: 3 }
    setTasks(result.sort((a, b) => order[a.urgency] - order[b.urgency] || a.dueAt.getTime() - b.dueAt.getTime()))
  }, [user?.id])

  // Schedule push notifications whenever tasks or notification settings change
  useEffect(() => {
    if (tasks && notificationsEnabled) {
      scheduleTaskNotifications(tasks, notificationLeadMinutes)
    }
  }, [tasks, notificationsEnabled, notificationLeadMinutes])

  useEffect(() => {
    compute()
    const n = ++ch
    const delayedCompute = () => setTimeout(compute, 600)
    const channel = supabase.channel(`dashboard_${n}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'animals' }, compute)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'care_events' }, delayedCompute)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'animal_care_schedules' }, compute)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'feeder_colonies' }, compute)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [compute])

  return tasks
}
