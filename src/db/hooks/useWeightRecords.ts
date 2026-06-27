import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WeightRecord } from '@/types'

let ch = 0

export function useWeightRecords(animalId: string | undefined): WeightRecord[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<WeightRecord[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    if (!animalId) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('weight_records').select('data').eq('animal_id', animalId).eq('user_id', user.id).order('created_at', { ascending: true })
      if (mounted) setData((rows ?? []).map(r => r.data as WeightRecord))
    }
    fetch()
    const channel = supabase.channel(`weight_records_${animalId}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'weight_records', filter: `animal_id=eq.${animalId}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, animalId])

  return data
}

export async function addWeightRecord(data: Omit<WeightRecord, 'id' | 'createdAt'>) {
  const userId = await getUserId()
  const record: WeightRecord = { ...data, id: uuidv4(), createdAt: new Date().toISOString() }
  const { error } = await supabase.from('weight_records').insert({ id: record.id, user_id: userId, animal_id: data.animalId, data: record })
  if (error) throw error
  return record
}
