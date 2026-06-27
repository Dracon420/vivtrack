import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Plant } from '@/types'

let ch = 0

export function usePlants(): Plant[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Plant[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('plants').select('data').eq('user_id', user.id)
      if (mounted) setData((rows ?? []).map(r => r.data as Plant).sort((a, b) => a.name.localeCompare(b.name)))
    }
    fetch()
    const channel = supabase.channel(`plants_${++ch}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'plants' }, fetch)
      .subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id])

  return data
}

export async function addPlant(data: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>) {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const plant: Plant = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  const { error } = await supabase.from('plants').insert({ id: plant.id, user_id: userId, data: plant })
  if (error) throw error
  return plant
}

export async function updatePlant(id: string, changes: Partial<Plant>) {
  const { data: row } = await supabase.from('plants').select('data').eq('id', id).single()
  const updated = { ...row!.data as Plant, ...changes, updatedAt: new Date().toISOString() }
  await supabase.from('plants').update({ data: updated }).eq('id', id)
}

export async function deletePlant(id: string) {
  await supabase.from('plants').delete().eq('id', id)
}
