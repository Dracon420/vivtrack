import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Animal, AnimalCareSchedule } from '@/types'

let ch = 0

export function useAnimals(): Animal[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Animal[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('animals').select('data').eq('user_id', user.id)
      if (mounted) setData((rows ?? []).map(r => r.data as Animal).sort((a, b) => a.name.localeCompare(b.name)))
    }
    fetch()
    const channel = supabase.channel(`animals_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'animals' }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id])

  return data
}

export function useAnimal(id: string | undefined): Animal | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Animal | undefined>()

  useEffect(() => {
    if (!user || !id) { setData(undefined); return }
    let mounted = true
    const fetch = async () => {
      const { data: row } = await supabase.from('animals').select('data').eq('id', id).single()
      if (mounted) setData(row?.data as Animal | undefined)
    }
    fetch()
    const channel = supabase.channel(`animal_${id}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'animals', filter: `id=eq.${id}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, id])

  return data
}

export function useAnimalsByStatus(status: Animal['status']): Animal[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Animal[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('animals').select('data').eq('user_id', user.id)
      if (mounted) setData((rows ?? []).map(r => r.data as Animal).filter(a => a.status === status))
    }
    fetch()
    const channel = supabase.channel(`animals_status_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'animals' }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, status])

  return data
}

export function useCareSchedule(animalId: string | undefined): AnimalCareSchedule | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<AnimalCareSchedule | undefined>()

  useEffect(() => {
    if (!user || !animalId) { setData(undefined); return }
    let mounted = true
    const fetch = async () => {
      const { data: row } = await supabase.from('animal_care_schedules').select('data').eq('animal_id', animalId).maybeSingle()
      if (mounted) setData(row?.data as AnimalCareSchedule | undefined)
    }
    fetch()
    const channel = supabase.channel(`schedule_${animalId}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'animal_care_schedules', filter: `animal_id=eq.${animalId}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, animalId])

  return data
}

export async function addAnimal(data: Omit<Animal, 'id' | 'qrCodeToken' | 'createdAt' | 'updatedAt'>) {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const animal: Animal = { ...data, id: uuidv4(), qrCodeToken: uuidv4(), createdAt: now, updatedAt: now }
  const { error } = await supabase.from('animals').insert({ id: animal.id, user_id: userId, qr_code_token: animal.qrCodeToken, data: animal })
  if (error) throw error
  return animal
}

export async function updateAnimal(id: string, changes: Partial<Animal>) {
  const { data: row } = await supabase.from('animals').select('data').eq('id', id).single()
  const updated = { ...row!.data as Animal, ...changes, updatedAt: new Date().toISOString() }
  await supabase.from('animals').update({ data: updated }).eq('id', id)
}

export async function deleteAnimal(id: string) {
  await Promise.all([
    supabase.from('care_events').delete().eq('animal_id', id),
    supabase.from('weight_records').delete().eq('animal_id', id),
    supabase.from('animal_care_schedules').delete().eq('animal_id', id),
    supabase.from('medications').delete().eq('animal_id', id),
  ])
  await supabase.from('animals').delete().eq('id', id)
}

export async function saveCareSchedule(schedule: Omit<AnimalCareSchedule, 'id'> & { id?: string }) {
  const userId = await getUserId()
  const id = schedule.id || uuidv4()
  const full: AnimalCareSchedule = { ...schedule, id, updatedAt: new Date().toISOString() } as AnimalCareSchedule
  await supabase.from('animal_care_schedules').upsert(
    { id, user_id: userId, animal_id: schedule.animalId, data: full },
    { onConflict: 'animal_id' }
  )
}
