import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, Clock, CheckCircle2, Bug, Flame, Settings, X, Snowflake } from 'lucide-react'
import { useDashboardTasks } from '@/hooks/useDashboardTasks'
import { useAnimals } from '@/db/hooks/useAnimals'
import { useFeederColonies } from '@/db/hooks/useColonies'
import { useAllRecentCareEvents } from '@/db/hooks/useCareEvents'
import { useUIStore } from '@/store/uiStore'
import { addCareEvent } from '@/db/hooks/useCareEvents'
import { formatDate, timeAgo } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { DashboardTask } from '@/hooks/useDashboardTasks'

const urgencyConfig = {
  overdue: { icon: <AlertTriangle size={14} />, label: 'OVERDUE', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  today:   { icon: <Clock size={14} />,         label: 'DUE TODAY', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  soon:    { icon: <Clock size={14} />,         label: 'DUE SOON', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  ok:      { icon: <CheckCircle2 size={14} />,  label: 'OK', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
}

const eventIcon: Record<string, string> = {
  feeding: '🍖', watering: '🫙', misting: '💧', substrate_clean: '🧹',
  full_clean: '✨', shed: '🔄', handling: '🤝', weight: '⚖️',
  medication_dose: '💊', vet_visit: '🏥', note: '📝',
  brumation_check: '❄️', temperature_check: '🌡️', humidity_check: '☁️',
  soil_rehydration: '🌱', photo: '📷',
}

function TaskCard({ task, onLog }: { task: DashboardTask; onLog: () => void }) {
  const cfg = urgencyConfig[task.urgency]
  const isColony = task.type === 'colony_low_stock'
  return (
    <div className={cn('rounded-xl border p-4 flex items-start gap-3', cfg.bg)}>
      <div className={cn('mt-0.5', cfg.text)}>
        {isColony ? <Bug size={18} /> : <Flame size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-xs font-bold tracking-wide', cfg.text)}>{cfg.label}</span>
          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', cfg.badge)}>{task.label}</span>
        </div>
        <p className="text-sm font-semibold text-gray-100 truncate">{task.animalName}</p>
        <p className="text-xs text-gray-400">{task.species}</p>
        <p className={cn('text-xs mt-1', cfg.text)}>
          {task.urgency === 'overdue' ? `Due ${timeAgo(task.dueAt.toISOString())}`
            : task.urgency === 'today' ? 'Due today'
            : `Due ${formatDate(task.dueAt.toISOString())}`}
        </p>
      </div>
      {!isColony && (
        <button onClick={onLog}
          className="shrink-0 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg transition-colors">
          Log
        </button>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-1">
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-emerald-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function getAnimalEmoji(species: string): string {
  const low = species.toLowerCase()
  if (low.includes('python') || low.includes('boa') || low.includes('snake') || low.includes('corn') || low.includes('king')) return '🐍'
  if (low.includes('gecko') || low.includes('dragon') || low.includes('skink') || low.includes('iguana') || low.includes('monitor') || low.includes('tegu')) return '🦎'
  if (low.includes('tortoise') || low.includes('turtle')) return '🐢'
  if (low.includes('frog') || low.includes('toad')) return '🐸'
  if (low.includes('tarantula')) return '🕷️'
  if (low.includes('scorpion')) return '🦂'
  if (low.includes('hedgehog')) return '🦔'
  if (low.includes('ferret')) return '🦡'
  if (low.includes('parrot') || low.includes('conure') || low.includes('cockatiel')) return '🦜'
  return '🐾'
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn('w-11 h-6 rounded-full transition-colors relative shrink-0', value ? 'bg-emerald-500' : 'bg-gray-600')}
    >
      <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', value ? 'left-6' : 'left-1')} />
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const tasks = useDashboardTasks()
  const animals = useAnimals()
  const feeders = useFeederColonies()
  const recentEvents = useAllRecentCareEvents(8)
  const { dashboardWidgets, setDashboardWidget } = useUIStore()
  const [customizing, setCustomizing] = useState(false)

  const activeAnimals = animals?.filter(a => a.status === 'active') ?? []
  const overdueCount = tasks?.filter(t => t.urgency === 'overdue').length ?? 0
  const todayCount = tasks?.filter(t => t.urgency === 'today').length ?? 0

  const animalMap = new Map(animals?.map(a => [a.id, a]) ?? [])

  const lowStockItems = feeders?.filter(f =>
    f.lowStockThreshold !== undefined && (f.estimatedCount ?? 0) < f.lowStockThreshold
  ) ?? []

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const handleLog = (task: DashboardTask) => {
    if (task.type === 'colony_low_stock') return
    navigate(`/animals/${task.animalId}/log?type=${task.type}`)
  }

  const widgetDefs = [
    { key: 'animalQuickAccess' as const, label: 'Animal Quick Access', desc: 'Tap-to-profile grid of your animals' },
    { key: 'recentActivity' as const, label: 'Recent Activity', desc: 'Last 8 care events across all animals' },
    { key: 'colonyAlerts' as const, label: 'Colony & Frozen Alerts', desc: 'Low stock warnings for feeders' },
  ]

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{today}</p>
          <h1 className="text-2xl font-bold text-gray-100 mt-1">Dashboard</h1>
        </div>
        <button
          onClick={() => setCustomizing(c => !c)}
          className={cn('p-2 rounded-xl transition-colors', customizing ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800')}
        >
          {customizing ? <X size={18} /> : <Settings size={18} />}
        </button>
      </div>

      {/* Customize panel */}
      {customizing && (
        <div className="mx-4 mb-4 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Customize Dashboard</p>
          {widgetDefs.map(w => (
            <div key={w.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-200 font-medium">{w.label}</p>
                <p className="text-xs text-gray-500">{w.desc}</p>
              </div>
              <ToggleSwitch value={dashboardWidgets[w.key]} onChange={v => setDashboardWidget(w.key, v)} />
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="px-4 flex gap-3 mb-6">
        <StatCard label="Active Animals" value={activeAnimals.length} />
        <StatCard label="Tasks Due" value={overdueCount + todayCount} sub={overdueCount > 0 ? `${overdueCount} overdue` : undefined} />
      </div>

      {/* Animal Quick Access */}
      {dashboardWidgets.animalQuickAccess && activeAnimals.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-4 mb-3">Animals</p>
          <div className="flex gap-3 px-4 overflow-x-auto pb-2">
            {activeAnimals.map(a => (
              <button
                key={a.id}
                onClick={() => navigate(`/animals/${a.id}`)}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 group-hover:border-emerald-500/60 transition-colors flex items-center justify-center text-2xl">
                  {a.thumbnailBase64
                    ? <img src={a.thumbnailBase64} className="w-full h-full object-cover" />
                    : getAnimalEmoji(a.species)}
                </div>
                <p className="text-xs text-gray-400 max-w-[64px] truncate text-center group-hover:text-gray-200">{a.name}</p>
              </button>
            ))}
            <button
              onClick={() => navigate('/animals/add')}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 hover:border-emerald-500/60 transition-colors flex items-center justify-center text-gray-600 hover:text-emerald-400">
                <Plus size={22} />
              </div>
              <p className="text-xs text-gray-600">Add</p>
            </button>
          </div>
        </div>
      )}

      {/* Care Tasks */}
      <div className="px-4 mb-6">
        {!tasks ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-gray-300 font-semibold">All caught up!</p>
            <p className="text-gray-500 text-sm mt-1">No care tasks due right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Care Tasks</h2>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} onLog={() => handleLog(task)} />
            ))}
          </div>
        )}

        {animals?.length === 0 && (
          <div className="mt-4 bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">🦎</p>
            <p className="text-gray-200 font-semibold text-lg">No animals yet</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">Add your first animal to start tracking care.</p>
            <button
              onClick={() => navigate('/animals/add')}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Add First Animal
            </button>
          </div>
        )}
      </div>

      {/* Colony / Frozen Alerts */}
      {dashboardWidgets.colonyAlerts && lowStockItems.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Low Stock Alerts</h2>
          <div className="space-y-2">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                {item.type === 'frozen_prey'
                  ? <Snowflake size={16} className="text-blue-400 shrink-0" />
                  : <Bug size={16} className="text-amber-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">{item.name}</p>
                  <p className="text-xs text-red-400">{item.estimatedCount ?? 0} remaining (alert at {item.lowStockThreshold})</p>
                </div>
                <button onClick={() => navigate('/colonies')} className="text-xs text-red-300 hover:text-red-200 shrink-0">View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {dashboardWidgets.recentActivity && (recentEvents?.length ?? 0) > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Activity</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
            {recentEvents!.map(event => {
              const animal = animalMap.get(event.animalId)
              const icon = eventIcon[event.type] ?? '📋'
              const label = event.type.replace(/_/g, ' ')
              return (
                <button
                  key={event.id}
                  onClick={() => animal && navigate(`/animals/${animal.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left"
                >
                  <span className="text-lg shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 capitalize">{label}</p>
                    <p className="text-xs text-gray-500 truncate">{animal?.name ?? '—'} • {animal?.species}</p>
                  </div>
                  <p className="text-xs text-gray-600 shrink-0">{timeAgo(event.occurredAt)}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/animals/add')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30"
        aria-label="Add animal"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
