import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, Clock, CheckCircle2, Bug, Flame } from 'lucide-react'
import { useDashboardTasks } from '@/hooks/useDashboardTasks'
import { useAnimals } from '@/db/hooks/useAnimals'
import { addCareEvent } from '@/db/hooks/useCareEvents'
import { formatDate, timeAgo } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { DashboardTask } from '@/hooks/useDashboardTasks'

const urgencyConfig = {
  overdue: { icon: <AlertTriangle size={14} />, label: 'OVERDUE', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  today: { icon: <Clock size={14} />, label: 'DUE TODAY', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  soon: { icon: <Clock size={14} />, label: 'DUE SOON', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  ok: { icon: <CheckCircle2 size={14} />, label: 'OK', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
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
          {task.urgency === 'overdue'
            ? `Due ${timeAgo(task.dueAt.toISOString())}`
            : task.urgency === 'today'
            ? 'Due today'
            : `Due ${formatDate(task.dueAt.toISOString())}`}
        </p>
      </div>
      {!isColony && (
        <button
          onClick={onLog}
          className="shrink-0 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
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

export default function Dashboard() {
  const navigate = useNavigate()
  const tasks = useDashboardTasks()
  const animals = useAnimals()

  const activeAnimals = animals?.filter(a => a.status === 'active') ?? []
  const overdueCount = tasks?.filter(t => t.urgency === 'overdue').length ?? 0
  const todayCount = tasks?.filter(t => t.urgency === 'today').length ?? 0

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const handleLog = async (task: DashboardTask) => {
    if (task.type === 'colony_low_stock') return
    navigate(`/animals/${task.animalId}/log?type=${task.type}`)
  }

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{today}</p>
        <h1 className="text-2xl font-bold text-gray-100 mt-1">Dashboard</h1>
      </div>

      {/* Stats row */}
      <div className="px-4 flex gap-3 mb-6">
        <StatCard label="Active Animals" value={activeAnimals.length} />
        <StatCard label="Tasks Due" value={overdueCount + todayCount} sub={overdueCount > 0 ? `${overdueCount} overdue` : undefined} />
      </div>

      {/* Tasks */}
      <div className="px-4">
        {!tasks ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
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

        {/* Empty state CTA */}
        {animals?.length === 0 && (
          <div className="mt-8 bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-8 text-center">
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
