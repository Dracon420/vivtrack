import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CareEvent } from '@/types'

let ch = 0

export function useCareEvents(animalId: string | undefined, limit = 50): CareEvent[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<CareEvent[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    if (!animalId) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('care_events').select('data').eq('animal_id', animalId).eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(limit)
      if (mounted) setData((rows ?? []).map(r => r.data as CareEvent))
    }
    fetch()
    const channel = supabase.channel(`care_events_${animalId}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'care_events', filter: `animal_id=eq.${animalId}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, animalId, limit])

  return data
}

export function useRecentCareEvents(animalId: string | undefined, type?: CareEvent['type']): CareEvent[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<CareEvent[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    if (!animalId) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('care_events').select('data').eq('animal_id', animalId).eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(20)
      if (mounted) {
        const events = (rows ?? []).map(r => r.data as CareEvent)
        setData(type ? events.filter(e => e.type === type).slice(0, 10) : events.slice(0, 10))
      }
    }
    fetch()
    const channel = supabase.channel(`recent_events_${animalId}_${type}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'care_events', filter: `animal_id=eq.${animalId}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, animalId, type])

  return data
}

export function useLastCareEvent(animalId: string | undefined, type: CareEvent['type']): CareEvent | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<CareEvent | undefined>()

  useEffect(() => {
    if (!user || !animalId) { setData(undefined); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('care_events').select('data').eq('animal_id', animalId).eq('type', type).eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(1)
      if (mounted) setData(rows?.[0]?.data as CareEvent | undefined)
    }
    fetch()
    const channel = supabase.channel(`last_event_${animalId}_${type}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'care_events', filter: `animal_id=eq.${animalId}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, animalId, type])

  return data
}

export function useAllRecentCareEvents(limit = 8): CareEvent[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<CareEvent[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('care_events').select('data').eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(limit)
      if (mounted) setData((rows ?? []).map(r => r.data as CareEvent))
    }
    fetch()
    const channel = supabase.channel(`all_recent_${++ch}`).on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'care_events' }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, limit])

  return data
}

export async function addCareEvent(data: Omit<CareEvent, 'id' | 'createdAt'>) {
  const userId = await getUserId()
  const event: CareEvent = { ...data, id: uuidv4(), createdAt: new Date().toISOString() }

  const { error } = await supabase.from('care_events').insert({
    id: event.id,
    user_id: userId,
    animal_id: event.animalId,
    type: event.type,
    occurred_at: event.occurredAt,
    data: event,
  })
  if (error) throw error

  if (data.type === 'weight' && data.weightGrams && data.animalId) {
    const weightRecord = {
      id: uuidv4(),
      animalId: data.animalId,
      weightGrams: data.weightGrams,
      measuredAt: data.occurredAt,
      createdAt: new Date().toISOString(),
    }
    await supabase.from('weight_records').insert({ id: weightRecord.id, user_id: userId, animal_id: data.animalId, data: weightRecord })
  }

  return event
}

export async function deleteCareEvent(id: string) {
  await supabase.from('care_events').delete().eq('id', id)
}
