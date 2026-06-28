import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Plus, Pencil, X, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { addCareEvent } from '@/db/hooks/useCareEvents'
import { saveCareSchedule } from '@/db/hooks/useAnimals'
import { useDashboardTasks } from '@/hooks/useDashboardTasks'
import { nextDueDate } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
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

const BUILTIN_TYPES = [
  { type: 'feeding' as CareEventType,         label: 'Feeding',          emoji: '🍖' },
  { type: 'misting' as CareEventType,         label: 'Misting',          emoji: '💧' },
  { type: 'watering' as CareEventType,        label: 'Water Change',     emoji: '🫙' },
  { type: 'substrate_clean' as CareEventType, label: 'Substrate Clean',  emoji: '🧹' },
  { type: 'substrate_change' as CareEventType,label: 'Substrate Change', emoji: '🪨' },
]

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
    setAnimals((aRes.data ?? []).map(r => r.data as any).filter((a: any) => a.status === 'active').sort((a: any, b: any) => a.name.localeCompare(b.name)))
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

      const start = schedule.scheduleStartDate
      const intervals: { type: CareEventType; label: string; intervalDays: number; anchor: string | undefined }[] = []

      if (schedule.feedingIntervalDays)
        intervals.push({ type: 'feeding', label: 'Feeding', intervalDays: schedule.feedingIntervalDays, anchor: lastOf('feeding')?.occurredAt ?? start })
      if (schedule.substrateCleanIntervalDays)
        intervals.push({ type: 'substrate_clean', label: 'Substrate Clean', intervalDays: schedule.substrateCleanIntervalDays,
          anchor: animalEvents.filter(e => e.type === 'substrate_clean' || e.type === 'full_clean').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt ?? start })
      if (schedule.substrateChangeIntervalDays)
        intervals.push({ type: 'substrate_change', label: 'Substrate Change', intervalDays: schedule.substrateChangeIntervalDays, anchor: lastOf('substrate_change')?.occurredAt ?? start })
      if (schedule.mistingIntervalHours)
        intervals.push({ type: 'misting', label: 'Misting', intervalDays: schedule.mistingIntervalHours / 24, anchor: lastOf('misting')?.occurredAt ?? start })
      if (schedule.waterChangeIntervalDays)
        intervals.push({ type: 'watering', label: 'Water Change', intervalDays: schedule.waterChangeIntervalDays, anchor: lastOf('watering')?.occurredAt ?? start })

      for (const { type, label, intervalDays, anchor } of intervals) {
        if (!anchor) continue
        let due = nextDueDate(anchor, intervalDays)
        let iterations = 0
        while (due.getTime() <= toMs && iterations++ < 60) {
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

      for (const ct of schedule.customTasks ?? []) {
        const intervalDays = toIntervalDays(ct.intervalValue, ct.intervalUnit)
        const last = animalEvents.filter(e => e.type === 'custom_task' && e.customTaskId === ct.id)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
        const anchor = last?.occurredAt ?? ct.startDate
        if (!anchor) continue

        let due = nextDueDate(anchor, intervalDays)
        let iterations = 0
        while (due.getTime() <= toMs && iterations++ < 60) {
          if (due.getTime() >= fromMs - 86400000) {
            const doneToday = animalEvents.some(
              e => e.type === 'custom_task' && e.customTaskId === ct.id && isSameDay(new Date(e.occurredAt), due)
            )
            result.push({
              id: `${animal.id}-custom-${ct.id}-${due.getTime()}`,
              animalId: animal.id, animalName: animal.name, species: animal.species,
              type: 'custom_task', label: ct.name, dueAt: new Date(due), done: doneToday, customTask: ct,
            })
          }
          due = nextDueDate(due.toISOString(), intervalDays)
        }
      }
    }

    return result.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  }, [animals, schedules, recentEvents, from.getTime(), to.getTime()])

  return { tasks, refetch, animals, schedules }
}

// ── Add / Edit Task Sheet ────────────────────────────────────────────────────
type BuiltinType = typeof BUILTIN_TYPES[number]['type']

interface TaskSheetProps {
  animals: { id: string; name: string }[]
  schedules: AnimalCareSchedule[]
  editTask?: ScheduledTask        // if set, we're editing
  onClose: () => void
  onSaved: () => void
}

function TaskSheet({ animals, schedules, editTask, onClose, onSaved }: TaskSheetProps) {
  const todayStr = new Date().toISOString().split('T')[0]
  const isCustomEdit = editTask?.type === 'custom_task'

  const [animalId, setAnimalId] = useState(editTask?.animalId ?? (animals[0]?.id ?? ''))
  const [taskType, setTaskType] = useState<BuiltinType | 'custom'>(
    editTask ? (editTask.type === 'custom_task' ? 'custom' : editTask.type as BuiltinType) : 'feeding'
  )
  const [customName, setCustomName] = useState(isCustomEdit ? editTask!.label : '')
  const [intervalVal, setIntervalVal] = useState(() => {
    if (!editTask) return ''
    const s = schedules.find(s => s.animalId === editTask.animalId)
    if (!s) return ''
    if (editTask.type === 'feeding') return s.feedingIntervalDays?.toString() ?? ''
    if (editTask.type === 'misting') return (s.mistingInterval ?? s.mistingIntervalHours)?.toString() ?? ''
    if (editTask.type === 'watering') return s.waterChangeIntervalDays?.toString() ?? ''
    if (editTask.type === 'substrate_clean') return s.substrateCleanIntervalDays?.toString() ?? ''
    if (editTask.type === 'substrate_change') return s.substrateChangeIntervalDays?.toString() ?? ''
    if (editTask.type === 'custom_task' && editTask.customTask) return editTask.customTask.intervalValue.toString()
    return ''
  })
  const [intervalUnit, setIntervalUnit] = useState<CustomTask['intervalUnit']>(() => {
    if (!editTask) return 'days'
    if (editTask.type === 'misting') {
      const s = schedules.find(s => s.animalId === editTask.animalId)
      return s?.mistingIntervalUnit ?? 'hours'
    }
    if (editTask.type === 'custom_task' && editTask.customTask) return editTask.customTask.intervalUnit
    return 'days'
  })
  const [startDate, setStartDate] = useState(() => {
    if (editTask) {
      const s = schedules.find(s => s.animalId === editTask.animalId)
      if (editTask.type === 'custom_task' && editTask.customTask?.startDate)
        return editTask.customTask.startDate.split('T')[0]
      return s?.scheduleStartDate?.split('T')[0] ?? todayStr
    }
    return todayStr
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!animalId || !intervalVal) return
    setSaving(true)
    try {
      const n = parseInt(intervalVal)
      if (!n || n < 1) return
      const existing = schedules.find(s => s.animalId === animalId)
      const base: Omit<AnimalCareSchedule, 'id'> & { id?: string } = {
        ...(existing ?? {
          medicationReminders: false,
          feedingIntervalDays: 7,
          substrateCleanIntervalDays: 30,
        }),
        id: existing?.id,
        animalId,
        updatedAt: new Date().toISOString(),
      }

      if (taskType === 'custom') {
        if (!customName.trim()) return
        const customTasks = [...(existing?.customTasks ?? [])]
        if (editTask?.customTask) {
          // update existing
          const idx = customTasks.findIndex(t => t.id === editTask.customTask!.id)
          if (idx >= 0) customTasks[idx] = { ...customTasks[idx], intervalValue: n, intervalUnit, startDate: new Date(startDate).toISOString() }
        } else {
          customTasks.push({ id: uuidv4(), name: customName.trim(), intervalValue: n, intervalUnit, startDate: new Date(startDate).toISOString() })
        }
        await saveCareSchedule({ ...base, customTasks })
      } else {
        const updates: Partial<AnimalCareSchedule> = { scheduleStartDate: new Date(startDate).toISOString() }
        if (taskType === 'feeding')          updates.feedingIntervalDays = n
        if (taskType === 'misting')          { updates.mistingInterval = n; updates.mistingIntervalUnit = intervalUnit as 'hours' | 'days'; updates.mistingIntervalHours = intervalUnit === 'hours' ? n : n * 24 }
        if (taskType === 'watering')         updates.waterChangeIntervalDays = n
        if (taskType === 'substrate_clean')  updates.substrateCleanIntervalDays = n
        if (taskType === 'substrate_change') updates.substrateChangeIntervalDays = n
        await saveCareSchedule({ ...base, ...updates })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const unitOpts: { value: string; label: string }[] =
    taskType === 'misting'
      ? [{ value: 'hours', label: 'hours' }, { value: 'days', label: 'days' }]
      : taskType === 'custom'
        ? [{ value: 'hours', label: 'hours' }, { value: 'days', label: 'days' }, { value: 'weeks', label: 'weeks' }, { value: 'months', label: 'months' }]
        : []

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl px-4 pt-4 pb-safe">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-100">{editTask ? 'Edit Task' : 'Add Task'}</h2>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pb-2">
          {/* Animal picker (hidden when editing) */}
          {!editTask && (
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Animal</label>
              <select value={animalId} onChange={e => setAnimalId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-100 focus:outline-none focus:border-emerald-500">
                {animals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          {editTask && (
            <div className="bg-gray-800 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-500">Animal</p>
              <p className="text-sm text-gray-200 font-semibold">{editTask.animalName}</p>
            </div>
          )}

          {/* Task type (hidden when editing) */}
          {!editTask && (
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Task Type</label>
              <div className="grid grid-cols-3 gap-2">
                {BUILTIN_TYPES.map(bt => (
                  <button key={bt.type} onClick={() => setTaskType(bt.type)}
                    className={cn('py-2.5 rounded-xl text-xs font-semibold border transition-colors',
                      taskType === bt.type ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                    )}>
                    {bt.emoji} {bt.label}
                  </button>
                ))}
                <button onClick={() => setTaskType('custom')}
                  className={cn('py-2.5 rounded-xl text-xs font-semibold border transition-colors',
                    taskType === 'custom' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                  )}>
                  ✅ Custom
                </button>
              </div>
            </div>
          )}
          {editTask && (
            <div className="bg-gray-800 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-500">Task</p>
              <p className="text-sm text-gray-200 font-semibold">{eventIcon[editTask.type] ?? '📋'} {editTask.label}</p>
            </div>
          )}

          {/* Custom name */}
          {taskType === 'custom' && !isCustomEdit && (
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Task Name</label>
              <input value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Vitamin supplement"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Interval */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Repeat Every</label>
            <div className="flex gap-2">
              <input type="number" min="1" value={intervalVal} onChange={e => setIntervalVal(e.target.value)}
                placeholder="1"
                className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-100 text-center focus:outline-none focus:border-emerald-500"
              />
              {unitOpts.length > 0 ? (
                <select value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as CustomTask['intervalUnit'])}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-300 focus:outline-none focus:border-emerald-500">
                  {unitOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-500 flex items-center">days</div>
              )}
            </div>
          </div>

          {/* Start date */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Start Date</label>
            <p className="text-xs text-gray-600 mb-1.5">First task appears one interval after this date.</p>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button onClick={handleSave} disabled={saving || !intervalVal}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? 'Saving…' : <><Check size={16} /> {editTask ? 'Save Changes' : 'Add Task'}</>}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Tasks Page ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(new Date())
  const dashboardTasks = useDashboardTasks()
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTask, setEditTask] = useState<ScheduledTask | undefined>()

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

  const { tasks, refetch, animals, schedules } = useAllScheduledTasks(from, to)

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
      } finally { setLoggingId(null) }
      return
    }
    navigate(`/animals/${task.animalId}/log?type=${task.type}`)
  }

  const openEdit = (task: ScheduledTask) => { setEditTask(task); setSheetOpen(true) }
  const closeSheet = () => { setSheetOpen(false); setEditTask(undefined) }
  const onSaved = () => { closeSheet(); refetch() }

  const days = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>()
    tasks.forEach(t => {
      const key = format(t.dueAt, 'yyyy-MM-dd')
      const arr = map.get(key) ?? []; arr.push(t); map.set(key, arr)
    })
    const result: { date: Date; key: string; tasks: ScheduledTask[] }[] = []
    let cur = new Date(from); cur.setHours(0, 0, 0, 0)
    const end = new Date(to)
    while (cur <= end) {
      const key = format(cur, 'yyyy-MM-dd')
      if (view !== 'month' || (map.get(key)?.length ?? 0) > 0)
        result.push({ date: new Date(cur), key, tasks: map.get(key) ?? [] })
      cur.setDate(cur.getDate() + 1)
    }
    return result
  }, [tasks, from.getTime(), to.getTime(), view])

  const overdueCount = dashboardTasks?.filter(t => t.urgency === 'overdue').length ?? 0
  const todayCount   = dashboardTasks?.filter(t => t.urgency === 'today').length ?? 0

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
            <p className="text-gray-600 text-sm mt-1">Tap + to add a task, or set a schedule start date on an animal.</p>
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.done ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Done</span>
                        ) : urgent ? (
                          <span className="text-xs text-red-400 flex items-center gap-1"><Clock size={13} /> Overdue</span>
                        ) : null}
                        {/* Edit */}
                        {task.animalId && task.type !== 'colony_low_stock' && (
                          <button onClick={() => openEdit(task)}
                            className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors">
                            <Pencil size={14} />
                          </button>
                        )}
                        {/* Log */}
                        {!task.done && task.animalId && task.type !== 'colony_low_stock' && (
                          <button onClick={() => handleLog(task)} disabled={isLogging}
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

      {/* FAB */}
      <button onClick={() => { setEditTask(undefined); setSheetOpen(true) }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30">
        <Plus size={26} />
      </button>

      {/* Add / Edit sheet */}
      {sheetOpen && (
        <TaskSheet
          animals={animals}
          schedules={schedules}
          editTask={editTask}
          onClose={closeSheet}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
