import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { v4 as uuidv4 } from 'uuid'
import type { AnimalCareSchedule, CareEvent } from '@/types'

// Runs once on mount. For animals with mistingType === 'automatic' and mistingTimes set,
// checks if any scheduled mist times have passed since the last logged misting and
// auto-inserts misting events for each missed slot.
export function useAutoMisting() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const run = async () => {
      const userId = user.id
      const [animalsRes, schedulesRes, eventsRes] = await Promise.all([
        supabase.from('animals').select('data').eq('user_id', userId),
        supabase.from('animal_care_schedules').select('data').eq('user_id', userId),
        supabase.from('care_events').select('data').eq('user_id', userId).eq('type', 'misting').order('occurred_at', { ascending: false }).limit(200),
      ])
      if (cancelled) return

      const animals = (animalsRes.data ?? []).map(r => r.data as any).filter((a: any) => a.status === 'active')
      const schedules = (schedulesRes.data ?? []).map(r => r.data as AnimalCareSchedule)
      const mistingEvents = (eventsRes.data ?? []).map(r => r.data as CareEvent)

      const now = new Date()
      const toInsert: { id: string; user_id: string; animal_id: string; type: string; occurred_at: string; data: CareEvent }[] = []

      for (const animal of animals) {
        const schedule = schedules.find(s => s.animalId === animal.id)
        if (!schedule) continue
        if (schedule.mistingType !== 'automatic') continue
        if (schedule.mistingScheduleType !== 'times') continue
        if (!schedule.mistingTimes || schedule.mistingTimes.length === 0) continue

        const lastMist = mistingEvents
          .filter(e => e.animalId === animal.id)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]

        // Look back at most 48 hours for missed misting slots
        const lookbackMs = 48 * 60 * 60 * 1000
        const lookbackFrom = lastMist
          ? new Date(Math.max(new Date(lastMist.occurredAt).getTime(), now.getTime() - lookbackMs))
          : new Date(now.getTime() - lookbackMs)

        for (const timeStr of schedule.mistingTimes) {
          const [hh, mm] = timeStr.split(':').map(Number)
          if (isNaN(hh) || isNaN(mm)) continue

          // Check yesterday and today for this time slot
          for (const daysBack of [1, 0]) {
            const slotDate = new Date(now)
            slotDate.setDate(slotDate.getDate() - daysBack)
            slotDate.setHours(hh, mm, 0, 0)

            if (slotDate <= lookbackFrom) continue  // before our lookback window
            if (slotDate >= now) continue           // hasn't happened yet

            // Check if we already have a misting event within 30 min of this slot
            const thirtyMin = 30 * 60 * 1000
            const alreadyLogged = mistingEvents.some(
              e => e.animalId === animal.id &&
                   Math.abs(new Date(e.occurredAt).getTime() - slotDate.getTime()) < thirtyMin
            )
            if (alreadyLogged) continue

            const event: CareEvent = {
              id: uuidv4(),
              animalId: animal.id,
              type: 'misting',
              occurredAt: slotDate.toISOString(),
              notes: 'Auto-logged (automatic misting)',
              createdAt: now.toISOString(),
            }
            toInsert.push({
              id: event.id, user_id: userId, animal_id: animal.id,
              type: 'misting', occurred_at: event.occurredAt, data: event,
            })
          }
        }
      }

      if (toInsert.length > 0 && !cancelled) {
        await supabase.from('care_events').insert(toInsert)
      }
    }

    run()
    return () => { cancelled = true }
  }, [user?.id])
}
