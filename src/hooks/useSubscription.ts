import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type SubscriptionTier = 'free' | 'pro'
export type PlanType = 'monthly' | 'annual' | 'lifetime'

export const FREE_ANIMAL_LIMIT = 5

export interface SubscriptionState {
  tier: SubscriptionTier
  isPro: boolean
  animalLimit: number
  planType: PlanType | null
  isTrialing: boolean
  loading: boolean
  redeemCode: (code: string) => Promise<{ success: boolean; error?: string }>
  openCheckout: (plan: PlanType) => Promise<void>
  openPortal: () => Promise<void>
  refresh: () => Promise<void>
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth()
  const [tier, setTier] = useState<SubscriptionTier>('free')
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [isTrialing, setIsTrialing] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      let { data } = await supabase
        .from('profiles')
        .select('subscription_tier, plan_type, is_trialing')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data) {
        await supabase.from('profiles').upsert({ user_id: user.id }, { onConflict: 'user_id' })
        data = { subscription_tier: 'free', plan_type: null, is_trialing: false }
      }

      setTier((data.subscription_tier as SubscriptionTier) ?? 'free')
      setPlanType((data.plan_type as PlanType) ?? null)
      setIsTrialing(data.is_trialing ?? false)
    } catch {
      setTier('free')
    }
    setLoading(false)
  }, [user?.id]) // eslint-disable-line

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const redeemCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('redeem_promo_code', { p_code: code.trim().toUpperCase() })
      if (error) return { success: false, error: error.message }
      const result = data as { success: boolean; error?: string; tier?: string }
      if (result.success) {
        setTier((result.tier as SubscriptionTier) ?? 'pro')
        setPlanType(null) // promo = no plan type
      }
      return { success: result.success, error: result.error }
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Unknown error' }
    }
  }

  const openCheckout = async (plan: PlanType) => {
    if (!user) return
    try {
      const res = await fetch('/api/lemonsqueezy/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, plan }),
      })
      if (!res.ok) throw new Error('Failed to create checkout session')
      const { url } = await res.json()
      window.location.href = url
    } catch {
      alert('Payment system not yet configured. Please use a promo code or contact support.')
    }
  }

  const openPortal = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/lemonsqueezy/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const body = await res.json()
      if (!res.ok) { alert(body.error ?? 'Failed to open billing portal'); return }
      window.location.href = body.url
    } catch {
      alert('Billing portal unavailable. Contact support.')
    }
  }

  return {
    tier,
    isPro: tier === 'pro',
    animalLimit: tier === 'pro' ? Infinity : FREE_ANIMAL_LIMIT,
    planType,
    isTrialing,
    loading,
    redeemCode,
    openCheckout,
    openPortal,
    refresh: fetchProfile,
  }
}
