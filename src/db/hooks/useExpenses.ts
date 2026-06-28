import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase, getUserId } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Expense } from '@/types'

let ch = 0

export function useExpenses(): Expense[] | undefined {
  const { user } = useAuth()
  const [data, setData] = useState<Expense[] | undefined>()

  useEffect(() => {
    if (!user) { setData([]); return }
    let mounted = true
    const fetch = async () => {
      const { data: rows } = await supabase
        .from('expenses')
        .select('data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (mounted) setData((rows ?? []).map(r => r.data as Expense))
    }
    fetch()
    const channel = supabase.channel(`expenses_${++ch}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'expenses' }, fetch)
      .subscribe()
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [user?.id])

  return data
}

export async function addExpense(data: Omit<Expense, 'id' | 'createdAt'>) {
  const userId = await getUserId()
  const now = new Date().toISOString()
  const expense: Expense = { ...data, id: uuidv4(), createdAt: now }
  const { error } = await supabase.from('expenses').insert({
    id: expense.id,
    user_id: userId,
    data: expense,
  })
  if (error) throw error
  return expense
}

export async function deleteExpense(id: string) {
  await supabase.from('expenses').delete().eq('id', id)
}
