import { useState } from 'react'
import { Sun, Moon, Monitor, Scale, DollarSign, Info, LogOut, User, Thermometer, Ruler, Bell, BellOff, Mail } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'
import { requestNotificationPermission, currentPermission } from '@/utils/notifications'
import { subscribeToPush, unsubscribeFromPush } from '@/utils/webPush'
import { useUserPreferences } from '@/db/hooks/useUserPreferences'
import { cn } from '@/lib/utils'

const DIGEST_TIMEZONES = [
  { label: 'Pacific Time (PT)',   value: 'America/Los_Angeles' },
  { label: 'Mountain Time (MT)',  value: 'America/Denver' },
  { label: 'Arizona (no DST)',    value: 'America/Phoenix' },
  { label: 'Central Time (CT)',   value: 'America/Chicago' },
  { label: 'Eastern Time (ET)',   value: 'America/New_York' },
  { label: 'Alaska Time (AKT)',   value: 'America/Anchorage' },
  { label: 'Hawaii Time (HT)',    value: 'Pacific/Honolulu' },
  { label: 'UTC',                 value: 'UTC' },
]

const LEAD_OPTIONS = [
  { minutes: 0,    label: 'At the time' },
  { minutes: 15,   label: '15 min before' },
  { minutes: 30,   label: '30 min before' },
  { minutes: 60,   label: '1 hour before' },
  { minutes: 120,  label: '2 hours before' },
  { minutes: 1440, label: '1 day before' },
]

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const {
    weightUnit, setWeightUnit, currency, setCurrency,
    tempUnit, setTempUnit, measurementUnit, setMeasurementUnit,
    notificationsEnabled, setNotificationsEnabled,
    notificationLeadMinutes, setNotificationLeadMinutes,
  } = useUIStore()
  const { user, signOut } = useAuth()
  const { prefs, save: savePrefs } = useUserPreferences()
  const [permStatus, setPermStatus] = useState<NotificationPermission>(currentPermission())

  const handleEnableNotifications = async () => {
    if (permStatus === 'denied') return
    if (permStatus !== 'granted') {
      const result = await requestNotificationPermission()
      setPermStatus(result)
      if (result !== 'granted') return
    }
    const enabling = !notificationsEnabled
    setNotificationsEnabled(enabling)
    if (enabling && user) {
      await subscribeToPush(user.id)
    } else if (!enabling && user) {
      await unsubscribeFromPush(user.id)
    }
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

        {/* Notifications */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Notifications</p>
          </div>

          {permStatus === 'denied' ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 leading-relaxed">
              <BellOff size={14} className="inline mr-1.5 mb-0.5" />
              Notifications are blocked in your browser. Open your browser or OS settings and allow notifications for this site, then return here.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-200 font-medium">Task reminders</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {permStatus === 'granted' ? 'Browser notifications active' : 'Tap to grant permission'}
                  </p>
                </div>
                <button
                  onClick={handleEnableNotifications}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors shrink-0',
                    notificationsEnabled && permStatus === 'granted' ? 'bg-emerald-500' : 'bg-gray-700'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    notificationsEnabled && permStatus === 'granted' ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>

              {notificationsEnabled && permStatus === 'granted' && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Remind me</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAD_OPTIONS.map(opt => (
                      <button
                        key={opt.minutes}
                        onClick={() => {
                          setNotificationLeadMinutes(opt.minutes)
                          savePrefs({ notificationLeadMinutes: opt.minutes })
                        }}
                        className={cn(
                          'py-2 rounded-xl border text-xs font-semibold transition-colors text-center',
                          notificationLeadMinutes === opt.minutes
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-gray-700 bg-gray-800 text-gray-500 hover:bg-gray-700'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                    Push notifications work even when the app is closed — install VivTrack to your home screen for best results on iOS.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Email Digest */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={16} className="text-gray-500" />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Daily Email Digest</p>
          </div>

          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <p className="text-sm text-gray-200 font-medium">Morning summary</p>
              <p className="text-xs text-gray-500 mt-0.5">
                One email per day at 8:00 AM in your selected timezone.
              </p>
            </div>
            <button
              onClick={() => savePrefs({ emailDigestEnabled: !prefs.emailDigestEnabled })}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5',
                prefs.emailDigestEnabled ? 'bg-emerald-500' : 'bg-gray-700'
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                prefs.emailDigestEnabled ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>

          {prefs.emailDigestEnabled && user?.email && (
            <div className="bg-gray-800 rounded-xl px-3 py-2.5 mb-3">
              <p className="text-xs text-gray-500">Sending to</p>
              <p className="text-sm text-gray-300 font-medium mt-0.5 truncate">{user.email}</p>
            </div>
          )}

          {prefs.emailDigestEnabled && (
            <>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Your Timezone</p>
              <select
                value={prefs.digestTimezone ?? 'America/Los_Angeles'}
                onChange={e => savePrefs({ digestTimezone: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none mb-2.5"
              >
                {DIGEST_TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-600 leading-relaxed">
                Email sends at 8:00 AM in your timezone. Skips days with no tasks.
              </p>
            </>
          )}
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
