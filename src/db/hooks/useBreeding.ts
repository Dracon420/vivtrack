import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { BreedingRecord, IncubationLog } from '@/types'

let ch = 0

export function useBreedingRecords(): BreedingRecord[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<BreedingRecord[] | undefined>()
  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('breeding_records').select('data').eq('user_id', user.id).order('created_at', { ascending: false })
      if (mounted) setData((rows ?? []).map(r => r.data as BreedingRecord))
    }
    fetch()
    const chan = supabase.channel(`breeding_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'breeding_records' }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(chan) }
  }, [user?.id])
  return data
}

export async function addBreedingRecord(data: Omit<BreedingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BreedingRecord> {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const record: BreedingRecord = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  const { error } = await supabase.from('breeding_records').insert({ id: record.id, user_id: userId, data: record })
  if (error) throw error
  return record
}

export async function updateBreedingRecord(id: string, changes: Partial<BreedingRecord>): Promise<void> {
  const { data: row } = await supabase.from('breeding_records').select('data').eq('id', id).single()
  const updated = { ...row!.data as BreedingRecord, ...changes, updatedAt: new Date().toISOString() }
  await supabase.from('breeding_records').update({ data: updated }).eq('id', id)
}

export async function deleteBreedingRecord(id: string): Promise<void> {
  await supabase.from('breeding_records').delete().eq('id', id)
}

export function useIncubationLog(breedingRecordId: string | undefined): IncubationLog | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<IncubationLog | undefined>()
  useEffect(() => {
    if (!user || !breedingRecordId) { setData(undefined); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('incubation_logs').select('data').eq('user_id', user.id)
      if (mounted) setData(((rows ?? []).map(r => r.data as IncubationLog)).find(l => l.breedingRecordId === breedingRecordId))
    }
    fetch()
    const chan = supabase.channel(`incub_${breedingRecordId}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'incubation_logs' }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(chan) }
  }, [user?.id, breedingRecordId])
  return data
}

export async function addIncubationLog(data: Omit<IncubationLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<IncubationLog> {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const log: IncubationLog = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  const { error } = await supabase.from('incubation_logs').insert({ id: log.id, user_id: userId, data: log })
  if (error) throw error
  return log
}

export async function updateIncubationLog(id: string, changes: Partial<IncubationLog>): Promise<void> {
  const { data: row } = await supabase.from('incubation_logs').select('data').eq('id', id).single()
  const updated = { ...row!.data as IncubationLog, ...changes, updatedAt: new Date().toISOString() }
  await supabase.from('incubation_logs').update({ data: updated }).eq('id', id)
}

export async function deleteIncubationLog(id: string): Promise<void> {
  await supabase.from('incubation_logs').delete().eq('id', id)
}
