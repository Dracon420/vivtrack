import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { FeederColony, CUCCulture, ColonyLogEvent } from '@/types'

let ch = 0

export function useFeederColonies(): FeederColony[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<FeederColony[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('feeder_colonies').select('data').eq('user_id', user.id)
      if (mounted) setData((rows ?? []).map(r => r.data as FeederColony).sort((a, b) => a.name.localeCompare(b.name)))
    }
    fetch()
    const channel = supabase.channel(`feeders_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'feeder_colonies' }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id])

  return data
}

export function useCUCCultures(): CUCCulture[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<CUCCulture[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('cuc_cultures').select('data').eq('user_id', user.id)
      if (mounted) setData((rows ?? []).map(r => r.data as CUCCulture).sort((a, b) => a.name.localeCompare(b.name)))
    }
    fetch()
    const channel = supabase.channel(`cucs_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'cuc_cultures' }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id])

  return data
}

export function useColonyLogEvents(colonyId: string | undefined): ColonyLogEvent[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<ColonyLogEvent[] | undefined>()

  useEffect(() => {
    if (!user || !colonyId) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('colony_log_events').select('data').eq('colony_id', colonyId).eq('user_id', user.id).order('created_at', { ascending: false })
      if (mounted) setData((rows ?? []).map(r => r.data as ColonyLogEvent))
    }
    fetch()
    const channel = supabase.channel(`colony_events_${colonyId}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'colony_log_events', filter: `colony_id=eq.${colonyId}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, colonyId])

  return data
}

export async function addFeederColony(data: Omit<FeederColony, 'id' | 'createdAt' | 'updatedAt'>) {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const colony: FeederColony = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  const { error } = await supabase.from('feeder_colonies').insert({ id: colony.id, user_id: userId, data: colony })
  if (error) throw error
  return colony
}

export async function updateFeederColony(id: string, changes: Partial<FeederColony>) {
  const { data: row } = await supabase.from('feeder_colonies').select('data').eq('id', id).single()
  const updated = { ...row!.data as FeederColony, ...changes, updatedAt: new Date().toISOString() }
  await supabase.from('feeder_colonies').update({ data: updated }).eq('id', id)
}

export async function deleteFeederColony(id: string) {
  await supabase.from('feeder_colonies').delete().eq('id', id)
}

export async function deleteCUCCulture(id: string) {
  await supabase.from('cuc_cultures').delete().eq('id', id)
}

export async function addCUCCulture(data: Omit<CUCCulture, 'id' | 'createdAt' | 'updatedAt'>) {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const culture: CUCCulture = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  const { error } = await supabase.from('cuc_cultures').insert({ id: culture.id, user_id: userId, data: culture })
  if (error) throw error
  return culture
}

export async function updateCUCCulture(id: string, changes: Partial<CUCCulture>) {
  const { data: row } = await supabase.from('cuc_cultures').select('data').eq('id', id).single()
  const updated = { ...row!.data as CUCCulture, ...changes, updatedAt: new Date().toISOString() }
  await supabase.from('cuc_cultures').update({ data: updated }).eq('id', id)
}

export async function addColonyLogEvent(data: Omit<ColonyLogEvent, 'id' | 'createdAt'>) {
  const userId = await getUserId()
  const event: ColonyLogEvent = { ...data, id: uuidv4(), createdAt: new Date().toISOString() }
  const { error } = await supabase.from('colony_log_events').insert({ id: event.id, user_id: userId, colony_id: data.colonyId, data: event })
  if (error) throw error
  return event
}
