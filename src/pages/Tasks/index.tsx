import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { addCareEvent } from '@/db/hooks/useCareEvents'
import { useDashboardTasks } from '@/hooks/useDashboardTasks'
import { nextDueDate } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isToday, isBefore } from 'date-fns'
import type { AnimalCareSchedule, CareEventType, CustomTask } from '@/types'

type View = 'day' | 'week' | 'month'

interface ScheduledTask {
  id: string
  animalId?: string
  animalName: string
  species?: string
  type: CareEventType | 'colony_low_stock'
  label: string
  dueAt: Date
  done: boolean
  customTask?: CustomTask
}

const eventIcon: Record<string, string> = {
  feeding: '🍖', watering: '🫙', misting: '💧', substrate_clean: '🧹',
  substrate_change: '🪨', full_clean: '✨', shed: '🔄', handling: '🤝', weight: '⚖️',
  medication_dose: '💊', vet_visit: '🏥', note: '📝', custom_task: '✅',
  temperature_check: '🌡️', humidity_check: '☁️', colony_low_stock: '⚠️',
}

function toIntervalDays(value: number, unit: CustomTask['intervalUnit']): number {
  if (unit === 'hours')  return value / 24
  if (unit === 'weeks')  return value * 7
  if (unit === 'months') return value * 30
  return value
}

interface RecentEvent {
  animalId: string
  type: string
  occurredAt: string
  customTaskId?: string
}

function useAllScheduledTasks(from: Date, to: Date) {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<AnimalCareSchedule[]>([])
  const [animals, setAnimals] = useState<{ id: string; name: string; species: string }[]>([])
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [tick, setTick] = useState(0)

  const fetchData = useCallback(async () => {
    if (!user) return
    const [aRes, sRes, eRes] = await Promise.all([
      supabase.from('animals').select('data').eq('user_id', user.id),
      supabase.from('animal_care_schedules').select('data').eq('user_id', user.id),
      supabase.from('care_events').select('data').eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(500),
    ])
    setAnimals((aRes.data ?? []).map(r => r.data as any).filter((a: any) => a.status === 'active'))
    setSchedules((sRes.data ?? []).map(r => r.data as AnimalCareSchedule))
    setRecentEvents((eRes.data ?? []).map(r => r.data as RecentEvent))
  }, [user?.id])

  useEffect(() => { fetchData() }, [fetchData, tick])

  const refetch = useCallback(() => setTick(t => t + 1), [])

  const tasks = useMemo(() => {
    const result: ScheduledTask[] = []
    const fromMs = from.getTime()
    const toMs = to.getTime()

    for (const animal of animals) {
      const schedule = schedules.find(s => s.animalId === animal.id)
      if (!schedule) continue

      const animalEvents = recentEvents.filter(e => e.animalId === animal.id)
      const lastOf = (type: string) =>
        animalEvents.filter(e => e.type === type).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]

      // Built-in intervals
      const intervals: { type: CareEventType; label: string; intervalDays: number }[] = []

      if (schedule.feedingIntervalDays)
        intervals.push({ type: 'feeding', label: 'Feeding', intervalDays: schedule.feedingIntervalDays })
      if (schedule.substrateCleanIntervalDays)
        intervals.push({ type: 'substrate_clean', label: 'Substrate Clean', intervalDays: schedule.substrateCleanIntervalDays })
      if (schedule.substrateChangeIntervalDays)
        intervals.push({ type: 'substrate_change', label: 'Substrate Change', intervalDays: schedule.substrateChangeIntervalDays })
      if (schedule.mistingIntervalHours)
        intervals.push({ type: 'misting', label: 'Misting', intervalDays: schedule.mistingIntervalHours / 24 })
      if (schedule.waterChangeIntervalDays)
        intervals.push({ type: 'watering', label: 'Water Change', intervalDays: schedule.waterChangeIntervalDays })

      for (const { type, label, intervalDays } of intervals) {
        const last = type === 'substrate_clean'
          ? animalEvents.filter(e => e.type === 'substrate_clean' || e.type === 'full_clean').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
          : lastOf(type)
        if (!last) continue

        let due = nextDueDate(last.occurredAt, intervalDays)
        let iterations = 0
        while (due.getTime() <= toMs && iterations++ < 30) {
          if (due.getTime() >= fromMs - 86400000) {
            const doneToday = animalEvents.some(e => e.type === type && isSameDay(new Date(e.occurredAt), due))
            result.push({
              id: `${animal.id}-${type}-${due.getTime()}`,
              animalId: animal.id, animalName: animal.name, species: animal.species,
              type, label, dueAt: new Date(due), done: doneToday,
            })
          }
          due = nextDueDate(due.toISOString(), intervalDays)
        }
      }

      // Custom tasks
      for (const ct of schedule.customTasks ?? []) {
        const intervalDays = toIntervalDays(ct.intervalValue, ct.intervalUnit)
        const last = animalEvents
          .filter(e => e.type === 'custom_task' && e.customTaskId === ct.id)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
        if (!last) continue

        let due = nextDueDate(last.occurredAt, intervalDays)
        let iterations = 0
        while (due.getTime() <= toMs && iterations++ < 30) {
          if (due.getTime() >= fromMs - 86400000) {
            const doneToday = animalEvents.some(
              e => e.type === 'custom_task' && e.customTaskId === ct.id && isSameDay(new Date(e.occurredAt), due)
            )
            result.push({
              id: `${animal.id}-custom-${ct.id}-${due.getTime()}`,
              animalId: animal.id, animalName: animal.name, species: animal.species,
              type: 'custom_task', label: ct.name, dueAt: new Date(due), done: doneToday,
              customTask: ct,
            })
          }
          due = nextDueDate(due.toISOString(), intervalDays)
        }
      }
    }

    return result.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  }, [animals, schedules, recentEvents, from.getTime(), to.getTime()])

  return { tasks, refetch }
}

export default function TasksPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(new Date())
  const dashboardTasks = useDashboardTasks()
  const [loggingId, setLoggingId] = useState<string | null>(null)

  const { from, to, label: rangeLabel } = useMemo(() => {
    if (view === 'day') {
      const d = new Date(anchor); d.setHours(0, 0, 0, 0)
      const e = new Date(d); e.setHours(23, 59, 59)
      return { from: d, to: e, label: format(d, 'EEEE, MMMM d') }
    }
    if (view === 'week') {
      const s = startOfWeek(anchor, { weekStartsOn: 0 })
      const e = endOfWeek(anchor, { weekStartsOn: 0 })
      return { from: s, to: e, label: `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}` }
    }
    const s = startOfMonth(anchor)
    const e = endOfMonth(anchor)
    return { from: s, to: e, label: format(anchor, 'MMMM yyyy') }
  }, [view, anchor.toDateString()])

  const { tasks, refetch } = useAllScheduledTasks(from, to)

  const navigateRange = (dir: 1 | -1) => {
    const d = new Date(anchor)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir)
    else d.setMonth(d.getMonth() + dir)
    setAnchor(d)
  }

  const handleLog = async (task: ScheduledTask) => {
    if (!task.animalId) return

    if (task.type === 'custom_task' && task.customTask) {
      if (loggingId === task.id) return
      setLoggingId(task.id)
      try {
        await addCareEvent({
          animalId: task.animalId,
          type: 'custom_task',
          occurredAt: new Date().toISOString(),
          customTaskId: task.customTask.id,
          notes: task.customTask.name,
        })
        refetch()
      } finally {
        setLoggingId(null)
      }
      return
    }

    navigate(`/animals/${task.animalId}/log?type=${task.type}`)
  }

  // Group tasks by day
  const days = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>()
    tasks.forEach(t => {
      const key = format(t.dueAt, 'yyyy-MM-dd')
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    })
    const result: { date: Date; key: string; tasks: ScheduledTask[] }[] = []
    let cur = new Date(from); cur.setHours(0, 0, 0, 0)
    const end = new Date(to)
    while (cur <= end) {
      const key = format(cur, 'yyyy-MM-dd')
      if (view !== 'month' || (map.get(key)?.length ?? 0) > 0) {
        result.push({ date: new Date(cur), key, tasks: map.get(key) ?? [] })
      }
      cur.setDate(cur.getDate() + 1)
    }
    return result
  }, [tasks, from.getTime(), to.getTime(), view])

  const overdueCount = dashboardTasks?.filter(t => t.urgency === 'overdue').length ?? 0
  const todayCount = dashboardTasks?.filter(t => t.urgency === 'today').length ?? 0

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Tasks</h1>
        {overdueCount > 0 && (
          <p className="text-sm text-red-400 mt-0.5">{overdueCount} overdue · {todayCount} due today</p>
        )}
      </div>

      {/* View toggle */}
      <div className="px-4 mb-3 flex gap-1.5">
        {(['day', 'week', 'month'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={cn('px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors',
              view === v ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}>{v}</button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setAnchor(new Date())}
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700">
          Today
        </button>
      </div>

      {/* Range navigator */}
      <div className="px-4 mb-4 flex items-center justify-between gap-3">
        <button onClick={() => navigateRange(-1)} className="text-gray-400 hover:text-gray-200 p-1.5 bg-gray-800 rounded-lg">
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold text-gray-200 text-center flex-1">{rangeLabel}</p>
        <button onClick={() => navigateRange(1)} className="text-gray-400 hover:text-gray-200 p-1.5 bg-gray-800 rounded-lg">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Task list */}
      <div className="px-4 space-y-4">
        {days.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No tasks this {view}</p>
            <p className="text-gray-600 text-sm mt-1">Set schedules on your animals to see tasks here.</p>
          </div>
        )}
        {days.map(({ date, key, tasks: dayTasks }) => {
          const isPast = isBefore(date, new Date()) && !isToday(date)
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <p className={cn('text-xs font-semibold uppercase tracking-wider',
                  isToday(date) ? 'text-emerald-400' : isPast ? 'text-gray-600' : 'text-gray-400'
                )}>
                  {isToday(date) ? 'Today' : format(date, view === 'day' ? 'EEEE, MMMM d' : 'EEE, MMM d')}
                </p>
                <div className="flex-1 h-px bg-gray-800" />
                {dayTasks.length > 0 && (
                  <span className="text-xs text-gray-600">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="space-y-2">
                {dayTasks.length === 0 && view === 'day' && (
                  <p className="text-center text-sm text-gray-600 py-4">Nothing scheduled</p>
                )}
                {dayTasks.map(task => {
                  const past = isBefore(task.dueAt, new Date())
                  const urgent = past && !task.done
                  const isLogging = loggingId === task.id
                  return (
                    <div key={task.id}
                      className={cn('bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3',
                        task.done ? 'border-emerald-500/20 opacity-60' :
                        urgent ? 'border-red-500/40' : 'border-gray-800'
                      )}>
                      <span className="text-xl shrink-0">{eventIcon[task.type] ?? '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold truncate', task.done ? 'text-gray-500 line-through' : 'text-gray-100')}>
                          {task.animalName}
                        </p>
                        <p className="text-xs text-gray-500">{task.label}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.done ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Done</span>
                        ) : urgent ? (
                          <span className="text-xs text-red-400 flex items-center gap-1"><Clock size={13} /> Overdue</span>
                        ) : null}
                        {!task.done && task.animalId && task.type !== 'colony_low_stock' && (
                          <button
                            onClick={() => handleLog(task)}
                            disabled={isLogging}
                            className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white px-2.5 py-1.5 rounded-lg transition-colors">
                            {isLogging ? '…' : 'Log'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
