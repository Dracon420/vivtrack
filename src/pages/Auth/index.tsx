import { useState } from 'react'
import { Eye, EyeOff, Leaf } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

type Tab = 'signin' | 'signup'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (tab === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error)
      } else {
        setSuccess('Account created! You can now sign in.')
        setTab('signin')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Leaf size={20} className="text-emerald-400" />
        </div>
        <div>
          <span className="text-xl font-bold text-gray-100">VivTrack</span>
          <p className="text-xs text-gray-500 -mt-0.5">Exotic Pet Tracker</p>
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Tabs */}
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setTab('signin'); setError(null); setSuccess(null) }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === 'signin'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(null); setSuccess(null) }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === 'signup'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-medium mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading
              ? 'Please wait...'
              : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {tab === 'signup' && (
          <p className="mt-4 text-center text-xs text-gray-600">
            Your data is stored securely in the cloud and syncs across all your devices.
          </p>
        )}
      </div>
    </div>
  )
}
