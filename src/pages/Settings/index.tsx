import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Sun, Moon, Monitor, Scale, DollarSign, Info, LogOut, User, Thermometer, Ruler, Crown, Gift, CreditCard, Zap, Check } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription, FREE_ANIMAL_LIMIT, type PlanType } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'

const PLANS: { key: PlanType; label: string; price: string; period: string; badge?: string; note: string }[] = [
  {
    key: 'monthly',
    label: 'Monthly',
    price: '$4.99',
    period: '/mo',
    note: '30-day free trial',
  },
  {
    key: 'annual',
    label: 'Annual',
    price: '$20',
    period: '/yr',
    badge: 'Save 67%',
    note: '30-day free trial',
  },
  {
    key: 'lifetime',
    label: 'Lifetime',
    price: '$50',
    period: ' once',
    note: 'Pay once, yours forever',
  },
]

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Pro · Monthly',
  annual: 'Pro · Annual',
  lifetime: 'Pro · Lifetime',
}

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { weightUnit, setWeightUnit, currency, setCurrency, tempUnit, setTempUnit, measurementUnit, setMeasurementUnit } = useUIStore()
  const { user, signOut } = useAuth()
  const { tier, isPro, planType, isTrialing, loading, redeemCode, openCheckout, openPortal, refresh } = useSubscription()

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly')
  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [planBanner, setPlanBanner] = useState<'success' | 'cancel' | null>(null)

  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const plan = params.get('plan')
    if (plan === 'success') { setPlanBanner('success'); refresh() }
    else if (plan === 'cancel') { setPlanBanner('cancel') }
  }, [location.search]) // eslint-disable-line

  const handleRedeem = async () => {
    if (!promoInput.trim()) return
    setRedeeming(true)
    setPromoError('')
    setPromoSuccess('')
    const result = await redeemCode(promoInput)
    setRedeeming(false)
    if (result.success) {
      setPromoSuccess('Code accepted — Pro tier activated!')
      setPromoInput('')
    } else {
      setPromoError(result.error ?? 'Invalid code')
    }
  }

  const handleCheckout = async () => {
    setCheckingOut(true)
    await openCheckout(selectedPlan)
    setCheckingOut(false)
  }

  const themes = [
    { key: 'dark' as const, label: 'Dark', icon: <Moon size={16} /> },
    { key: 'light' as const, label: 'Light', icon: <Sun size={16} /> },
    { key: 'system' as const, label: 'System', icon: <Monitor size={16} /> },
  ]

  return (
    <div className="min-h-full pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Plan banner */}
        {planBanner === 'success' && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-300">Welcome to Pro!</p>
            <p className="text-xs text-emerald-400/80 mt-0.5">Unlimited animals unlocked.</p>
          </div>
        )}
        {planBanner === 'cancel' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-sm text-amber-300">Checkout was cancelled — your plan hasn't changed.</p>
          </div>
        )}

        {/* Account */}
        {user && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-gray-500" />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Account</p>
            </div>
            <p className="text-sm text-gray-300 mb-3 truncate">{user.email}</p>
            <button onClick={signOut} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        )}

        {/* Subscription */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={16} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Subscription</p>
          </div>

          {loading ? (
            <div className="h-20 bg-gray-800 rounded-xl animate-pulse" />
          ) : isPro ? (
            /* ── Pro user ── */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-amber-300">
                      {planType ? PLAN_LABELS[planType] : 'Pro'}
                    </span>
                    <Zap size={14} className="text-amber-400" />
                  </div>
                  {isTrialing && (
                    <p className="text-xs text-emerald-400 mt-0.5">Free trial active</p>
                  )}
                </div>
                {planType !== 'lifetime' && (
                  <button onClick={openPortal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                    <CreditCard size={12} /> Manage
                  </button>
                )}
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <p className="flex items-center gap-1.5"><Check size={10} className="text-emerald-500" /> Unlimited animals</p>
                <p className="flex items-center gap-1.5"><Check size={10} className="text-emerald-500" /> All features included</p>
                {planType === 'lifetime' && (
                  <p className="flex items-center gap-1.5"><Check size={10} className="text-emerald-500" /> Lifetime access — no renewal</p>
                )}
              </div>
            </div>
          ) : (
            /* ── Free user ── */
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">
                  Free plan · <span className="text-gray-500">{FREE_ANIMAL_LIMIT} animals max</span>
                </p>
                <p className="text-xs text-gray-600">Upgrade for unlimited animals and all future features.</p>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map(plan => (
                  <button
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    className={cn(
                      'relative flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all',
                      selectedPlan === plan.key
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    )}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {plan.badge}
                      </span>
                    )}
                    <p className={cn('text-xs font-semibold mb-1', selectedPlan === plan.key ? 'text-amber-300' : 'text-gray-400')}>
                      {plan.label}
                    </p>
                    <p className={cn('font-bold leading-none', selectedPlan === plan.key ? 'text-amber-200' : 'text-gray-200')}>
                      {plan.price}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{plan.period}</p>
                    <p className={cn('text-[10px] mt-1.5 leading-tight', selectedPlan === plan.key ? 'text-emerald-400' : 'text-gray-600')}>
                      {plan.note}
                    </p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-bold text-sm rounded-xl transition-colors"
              >
                <Zap size={15} />
                {checkingOut ? 'Loading…' : selectedPlan === 'lifetime'
                  ? 'Buy Lifetime Access — $50'
                  : `Start 30-Day Free Trial`
                }
              </button>

              <p className="text-xs text-gray-600 text-center">
                {selectedPlan === 'lifetime'
                  ? 'One-time payment · No subscription'
                  : 'No charge during trial · Cancel anytime'}
              </p>

              {/* Promo code */}
              <div className="pt-1 border-t border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Gift size={13} className="text-gray-500" />
                  <p className="text-xs text-gray-500 font-medium">Have a promo code?</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                    placeholder="ENTER CODE"
                    className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    onClick={handleRedeem}
                    disabled={redeeming || !promoInput.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {redeeming ? '…' : 'Redeem'}
                  </button>
                </div>
                {promoError && <p className="text-xs text-red-400 mt-1.5">{promoError}</p>}
                {promoSuccess && <p className="text-xs text-emerald-400 mt-1.5">{promoSuccess}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Theme */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Appearance</p>
          <div className="flex gap-2">
            {themes.map(t => (
              <button key={t.key} onClick={() => setTheme(t.key)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-colors',
                  theme === t.key
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700'
                )}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weight unit */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale size={16} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Weight Unit</p>
          </div>
          <div className="flex gap-2">
            {(['g', 'oz'] as const).map(u => (
              <button key={u} onClick={() => setWeightUnit(u)}
                className={cn('flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors',
                  weightUnit === u ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700'
                )}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Temperature unit */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer size={16} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Temperature Unit</p>
          </div>
          <div className="flex gap-2">
            {(['C', 'F'] as const).map(u => (
              <button key={u} onClick={() => setTempUnit(u)}
                className={cn('flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors',
                  tempUnit === u ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700'
                )}>
                °{u}
              </button>
            ))}
          </div>
        </div>

        {/* Measurement unit */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ruler size={16} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Enclosure Dimensions</p>
          </div>
          <div className="flex gap-2">
            {(['cm', 'in'] as const).map(u => (
              <button key={u} onClick={() => setMeasurementUnit(u)}
                className={cn('flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors',
                  measurementUnit === u ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700'
                )}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Currency</p>
          </div>
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none">
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="CAD">CAD — Canadian Dollar</option>
            <option value="AUD">AUD — Australian Dollar</option>
            <option value="NZD">NZD — New Zealand Dollar</option>
          </select>
        </div>

        {/* About */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">About</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">App</span><span className="text-gray-300">VivTrack</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="text-gray-300">0.2.0</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Storage</span><span className="text-gray-300">Cloud (Supabase)</span></div>
          </div>
        </div>

        {/* PWA install */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-300 font-medium">Install VivTrack</p>
          <p className="text-xs text-blue-400/70 mt-1">
            <strong>iPhone/iPad:</strong> Tap Share → "Add to Home Screen" in Safari.<br />
            <strong>Android:</strong> Chrome will show an install prompt automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
