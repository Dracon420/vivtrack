import { Sun, Moon, Monitor, Scale, DollarSign, Info } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { weightUnit, setWeightUnit, currency, setCurrency } = useUIStore()

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
        {/* Theme */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Appearance</p>
          <div className="flex gap-2">
            {themes.map(t => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-colors',
                  theme === t.key
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700'
                )}
              >
                {t.icon}
                {t.label}
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
              <button
                key={u}
                onClick={() => setWeightUnit(u)}
                className={cn(
                  'flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors',
                  weightUnit === u
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700'
                )}
              >
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
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          >
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
            <div className="flex justify-between">
              <span className="text-gray-500">App</span>
              <span className="text-gray-300">VivTrack</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="text-gray-300">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Storage</span>
              <span className="text-gray-300">Local (IndexedDB)</span>
            </div>
          </div>
        </div>

        {/* PWA install note */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-300 font-medium">Install VivTrack</p>
          <p className="text-xs text-blue-400/70 mt-1">
            <strong>iPhone/iPad:</strong> Tap Share → "Add to Home Screen" in Safari for offline use and push notifications.<br />
            <strong>Android:</strong> Chrome will show an install prompt automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
