import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface UserPreferences {
  emailDigestEnabled?: boolean
}

export function useUserPreferences() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<UserPreferences>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('user_preferences')
      .select('data')
      .eq('user_id', user.id)
      .single()
    if (data) setPrefs(data.data as UserPreferences)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user) return
    const merged = { ...prefs, ...updates }
    setPrefs(merged)
    await supabase.from('user_preferences').upsert(
      { user_id: user.id, data: merged, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }, [user?.id, prefs])

  return { prefs, loading, save }
}
