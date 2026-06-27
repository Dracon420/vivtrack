import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Medication } from '@/types'

let ch = 0

export function useMedications(animalId: string | undefined): Medication[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Medication[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    if (!animalId) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('medications').select('data').eq('animal_id', animalId).eq('user_id', user.id)
      if (mounted) setData((rows ?? []).map(r => r.data as Medication))
    }
    fetch()
    const channel = supabase.channel(`meds_${animalId}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'medications', filter: `animal_id=eq.${animalId}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, animalId])

  return data
}

export function useActiveMedications(animalId: string | undefined): Medication[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Medication[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    if (!animalId) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('medications').select('data').eq('animal_id', animalId).eq('user_id', user.id)
      if (mounted) setData((rows ?? []).map(r => r.data as Medication).filter(m => m.status === 'active'))
    }
    fetch()
    const channel = supabase.channel(`active_meds_${animalId}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'medications', filter: `animal_id=eq.${animalId}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, animalId])

  return data
}

export async function addMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const med: Medication = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  const { error } = await supabase.from('medications').insert({ id: med.id, user_id: userId, animal_id: data.animalId, data: med })
  if (error) throw error
  return med
}

export async function updateMedication(id: string, changes: Partial<Medication>) {
  const { data: row } = await supabase.from('medications').select('data').eq('id', id).single()
  const updated = { ...row!.data as Medication, ...changes, updatedAt: new Date().toISOString() }
  await supabase.from('medications').update({ data: updated }).eq('id', id)
}
