import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Enclosure } from '@/types'

let ch = 0

export function useEnclosures(): Enclosure[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Enclosure[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase.from('enclosures').select('data').eq('user_id', user.id)
      if (mounted) setData((rows ?? []).map(r => r.data as Enclosure).sort((a, b) => a.name.localeCompare(b.name)))
    }
    fetch()
    const channel = supabase.channel(`enclosures_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'enclosures' }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id])

  return data
}

export function useEnclosure(id: string | undefined): Enclosure | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Enclosure | undefined>()

  useEffect(() => {
    if (!user || !id) { setData(undefined); return }
    let mounted = true
    const fetch = async () => {
      const { data: row } = await supabase.from('enclosures').select('data').eq('id', id).single()
      if (mounted) setData(row?.data as Enclosure | undefined)
    }
    fetch()
    const channel = supabase.channel(`enclosure_${id}_${++ch}`).on('postgres_changes' as any, { event: '*', schema: 'public', table: 'enclosures', filter: `id=eq.${id}` }, fetch).subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id, id])

  return data
}

export async function addEnclosure(data: Omit<Enclosure, 'id' | 'createdAt' | 'updatedAt'>) {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const enclosure: Enclosure = { ...data, id: uuidv4(), createdAt: now, updatedAt: now }
  const { error } = await supabase.from('enclosures').insert({ id: enclosure.id, user_id: userId, data: enclosure })
  if (error) throw error
  return enclosure
}

export async function updateEnclosure(id: string, changes: Partial<Enclosure>) {
  const { data: row } = await supabase.from('enclosures').select('data').eq('id', id).single()
  const updated = { ...row!.data as Enclosure, ...changes, updatedAt: new Date().toISOString() }
  await supabase.from('enclosures').update({ data: updated }).eq('id', id)
}

export async function deleteEnclosure(id: string) {
  await supabase.from('enclosures').delete().eq('id', id)
}
