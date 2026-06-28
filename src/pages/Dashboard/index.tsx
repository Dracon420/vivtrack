import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle2, Bug, Flame, Settings, X, Snowflake, ChevronRight, ArrowLeft } from 'lucide-react'
import { useDashboardTasks } from '@/hooks/useDashboardTasks'
import { useAnimals } from '@/db/hooks/useAnimals'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { useFeederColonies } from '@/db/hooks/useColonies'
import { useAllRecentCareEvents } from '@/db/hooks/useCareEvents'
import { usePlants } from '@/db/hooks/usePlants'
import { useUIStore } from '@/store/uiStore'
import { displayTemp } from '@/utils/units'
import { loadSpecies } from '@/utils/species'
import { formatDate, timeAgo } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { DashboardTask } from '@/hooks/useDashboardTasks'
import type { SpeciesTemplate, Plant, Enclosure } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────
const urgencyConfig = {
  overdue: { label: 'OVERDUE', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  today:   { label: 'DUE TODAY', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  soon:    { label: 'DUE SOON', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  ok:      { label: 'OK', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
}

const eventIcon: Record<string, string> = {
  feeding: '🍖', watering: '🫙', misting: '💧', substrate_clean: '🧹',
  full_clean: '✨', shed: '🔄', handling: '🤝', weight: '⚖️',
  medication_dose: '💊', vet_visit: '🏥', note: '📝',
  brumation_check: '❄️', temperature_check: '🌡️', humidity_check: '☁️',
  soil_rehydration: '🌱', photo: '📷',
}

const PLANT_TYPE_EMOJI: Record<string, string> = {
  tropical: '🌿', succulent: '🪴', bromeliad: '🌺', moss: '🌱',
  fern: '🌿', carnivorous: '🪤', aquatic: '💧', epiphyte: '🌿',
  vine: '🌿', other: '🌱',
}

const ENCLOSURE_EMOJI: Record<string, string> = {
  aquarium: '🐠', paludarium: '🌿', vivarium: '🌿',
  pond: '💧', terrarium: '🏠', other: '🏠',
}

function getAnimalEmoji(species: string): string {
  const low = species.toLowerCase()
  if (low.includes('python') || low.includes('boa') || low.includes('snake') || low.includes('corn') || low.includes('king')) return '🐍'
  if (low.includes('gecko') || low.includes('dragon') || low.includes('skink') || low.includes('iguana') || low.includes('monitor') || low.includes('tegu')) return '🦎'
  if (low.includes('tortoise') || low.includes('turtle')) return '🐢'
  if (low.includes('frog') || low.includes('toad') || low.includes('axolotl') || low.includes('salamander')) return '🐸'
  if (low.includes('tarantula')) return '🕷️'
  if (low.includes('scorpion')) return '🦂'
  if (low.includes('hedgehog')) return '🦔'
  if (low.includes('ferret')) return '🦡'
  if (low.includes('parrot') || low.includes('conure') || low.includes('cockatiel')) return '🦜'
  if (low.includes('betta') || low.includes('fish') || low.includes('tetra') || low.includes('guppy') || low.includes('oscar') || low.includes('cichlid') || low.includes('pleco') || low.includes('goldfish') || low.includes('koi') || low.includes('clownfish')) return '🐠'
  return '🐾'
}

function isWateringDue(plant: Plant): boolean {
  if (!plant.wateringFrequencyDays) return false
  if (!plant.lastWatered) return true
  return (Date.now() - new Date(plant.lastWatered).getTime()) / 86400000 >= plant.wateringFrequencyDays
}

// ── Sub-components ─────────────────────────────────────────────────────────
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

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={cn('w-11 h-6 rounded-full transition-colors relative shrink-0', value ? 'bg-emerald-500' : 'bg-gray-600')}>
      <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all', value ? 'left-6' : 'left-1')} />
    </button>
  )
}

function SectionHeader({ title, linkTo, linkLabel }: { title: string; linkTo?: string; linkLabel?: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between mb-3 px-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      {linkTo && (
        <button onClick={() => navigate(linkTo)} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
          {linkLabel ?? 'See all'} <ChevronRight size={12} />
        </button>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const tasks = useDashboardTasks()
  const animals = useAnimals()
  const enclosures = useEnclosures()
  const feeders = useFeederColonies()
  const recentEvents = useAllRecentCareEvents(8)
  const plants = usePlants()
  const { dashboardWidgets, setDashboardWidget, tempUnit } = useUIStore()
  const [customizing, setCustomizing] = useState(false)
  const [allSpecies, setAllSpecies] = useState<SpeciesTemplate[]>([])
  const [fabOpen, setFabOpen] = useState(false)
  // null = main menu, 'choose_type' = picking entity type for log task,
  // 'animal'|'plant'|'enclosure' = picking specific entity
  const [logTaskMode, setLogTaskMode] = useState<null | 'choose_type' | 'animal' | 'plant' | 'enclosure'>(null)

  const closeMenu = () => { setFabOpen(false); setLogTaskMode(null) }
  const handleBack = () => setLogTaskMode(logTaskMode === 'choose_type' ? null : 'choose_type')

  useEffect(() => { loadSpecies().then(setAllSpecies) }, [])

  const activeAnimals = animals?.filter(a => a.status === 'active') ?? []
  const overdueCount = tasks?.filter(t => t.urgency === 'overdue').length ?? 0
  const todayCount = tasks?.filter(t => t.urgency === 'today').length ?? 0
  const animalMap = new Map(animals?.map(a => [a.id, a]) ?? [])
  const plantsDue = (plants ?? []).filter(isWateringDue).length

  const lowStockItems = feeders?.filter(f =>
    f.lowStockThreshold !== undefined && (f.estimatedCount ?? 0) < f.lowStockThreshold
  ) ?? []

  // Group animals by enclosureId
  const enclosureAnimalsMap = new Map<string, typeof activeAnimals>()
  animals?.forEach(a => {
    if (!a.enclosureId) return
    const arr = enclosureAnimalsMap.get(a.enclosureId) ?? []
    arr.push(a)
    enclosureAnimalsMap.set(a.enclosureId, arr)
  })

  // Unique species for active animals
  const uniqueSpeciesIds = [...new Set(activeAnimals.map(a => a.species))]
  const matchedSpecies = uniqueSpeciesIds
    .map(id => allSpecies.find(s => s.id === id))
    .filter((s): s is SpeciesTemplate => Boolean(s))

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const handleLog = (task: DashboardTask) => {
    if (task.type === 'colony_low_stock') return
    navigate(`/animals/${task.animalId}/log?type=${task.type}`)
  }

  const widgetDefs = [
    { key: 'animalQuickAccess' as const, label: 'Animal Quick Access', desc: 'Tap-to-profile row of your animals' },
    { key: 'enclosureList' as const, label: 'Enclosure Quick Access', desc: 'Side-scroll row of your enclosures' },
    { key: 'plantQuickAccess' as const, label: 'Plant Quick Access', desc: 'Side-scroll row of your plants' },
    { key: 'speciesGuides' as const, label: 'Species Care Guides', desc: 'Quick care reference for active species' },
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
        <button onClick={() => setCustomizing(c => !c)}
          className={cn('p-2 rounded-xl transition-colors', customizing ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800')}>
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
      <div className="px-4 grid grid-cols-3 gap-2 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-xl font-bold text-gray-100">{activeAnimals.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Animals</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-xl font-bold text-gray-100">{enclosures?.length ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Enclosures</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className={cn('text-xl font-bold', overdueCount > 0 ? 'text-red-400' : 'text-gray-100')}>
            {overdueCount + todayCount}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Tasks Due</p>
          {overdueCount > 0 && <p className="text-xs text-red-400">{overdueCount} overdue</p>}
        </div>
      </div>

      {/* ── Animal Quick Access ── */}
      {dashboardWidgets.animalQuickAccess && activeAnimals.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="Animals" linkTo="/animals" linkLabel="All animals" />
          <div className="flex gap-3 px-4 overflow-x-auto pb-2 no-scrollbar">
            {activeAnimals.map(a => (
              <button key={a.id} onClick={() => navigate(`/animals/${a.id}`)}
                className="flex flex-col items-center gap-1.5 shrink-0 group">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 group-hover:border-emerald-500/60 transition-colors flex items-center justify-center text-2xl">
                  {a.thumbnailBase64
                    ? <img src={a.thumbnailBase64} className="w-full h-full object-cover" />
                    : getAnimalEmoji(a.species)}
                </div>
                <p className="text-xs text-gray-400 max-w-[64px] truncate text-center group-hover:text-gray-200">{a.name}</p>
              </button>
            ))}
            <button onClick={() => navigate('/animals/add')} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 hover:border-emerald-500/60 transition-colors flex items-center justify-center text-gray-600 hover:text-emerald-400">
                <Plus size={22} />
              </div>
              <p className="text-xs text-gray-600">Add</p>
            </button>
          </div>
        </div>
      )}

      {/* ── Enclosure Quick Access ── */}
      {dashboardWidgets.enclosureList && (enclosures?.length ?? 0) > 0 && (
        <div className="mb-6">
          <SectionHeader title="Enclosures" linkTo="/enclosures" linkLabel="Manage" />
          <div className="flex gap-3 px-4 overflow-x-auto pb-2 no-scrollbar">
            {enclosures!.map(enc => {
              const occupants = enclosureAnimalsMap.get(enc.id) ?? []
              const emoji = enc.enclosureType ? (ENCLOSURE_EMOJI[enc.enclosureType] ?? '🏠') : '🏠'
              return (
                <button key={enc.id} onClick={() => navigate(`/enclosures/${enc.id}`)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group">
                  <div className="relative w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 group-hover:border-emerald-500/60 transition-colors flex items-center justify-center text-2xl">
                    {emoji}
                    {occupants.length > 0 && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-gray-950">
                        {occupants.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 max-w-[64px] truncate text-center group-hover:text-gray-200">{enc.name}</p>
                </button>
              )
            })}
            <button onClick={() => navigate('/enclosures/add')} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 hover:border-emerald-500/60 transition-colors flex items-center justify-center text-gray-600 hover:text-emerald-400">
                <Plus size={22} />
              </div>
              <p className="text-xs text-gray-600">Add</p>
            </button>
          </div>
        </div>
      )}

      {/* ── Plant Quick Access ── */}
      {dashboardWidgets.plantQuickAccess && (plants?.length ?? 0) > 0 && (
        <div className="mb-6">
          <SectionHeader title="Plants"
            linkTo="/plants"
            linkLabel={plantsDue > 0 ? `${plantsDue} due` : 'All plants'} />
          <div className="flex gap-3 px-4 overflow-x-auto pb-2 no-scrollbar">
            {(plants ?? []).map(p => {
              const due = isWateringDue(p)
              return (
                <button key={p.id} onClick={() => navigate('/plants')}
                  className="flex flex-col items-center gap-1.5 shrink-0 group">
                  <div className={cn('relative w-16 h-16 rounded-full bg-gray-800 border-2 transition-colors flex items-center justify-center text-2xl overflow-hidden',
                    due ? 'border-blue-500/60' : 'border-gray-700 group-hover:border-green-600/60'
                  )}>
                    {p.thumbnailBase64
                      ? <img src={p.thumbnailBase64} className="w-full h-full object-cover" />
                      : PLANT_TYPE_EMOJI[p.type] ?? '🌱'}
                    {due && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 text-white flex items-center justify-center rounded-full border border-gray-950 text-[10px]">💧</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 max-w-[64px] truncate text-center group-hover:text-gray-200">{p.name}</p>
                </button>
              )
            })}
            <button onClick={() => navigate('/plants')} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 hover:border-green-600/60 transition-colors flex items-center justify-center text-gray-600 hover:text-green-400">
                <Plus size={22} />
              </div>
              <p className="text-xs text-gray-600">Add</p>
            </button>
          </div>
        </div>
      )}

      {/* ── Species Care Guides ── */}
      {dashboardWidgets.speciesGuides && matchedSpecies.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="Care Guides" linkTo="/species" linkLabel="Browse all" />
          <div className="flex gap-3 px-4 overflow-x-auto pb-2 no-scrollbar">
            {matchedSpecies.map(s => (
              <button key={s.id} onClick={() => navigate(`/species/${s.id}`)}
                className="shrink-0 w-44 bg-gray-900 border border-gray-800 rounded-xl p-3 text-left hover:border-emerald-500/40 hover:bg-gray-800 transition-all">
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize mb-2 inline-block',
                  s.careLevel === 'beginner' ? 'bg-emerald-500/20 text-emerald-300'
                  : s.careLevel === 'intermediate' ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-amber-500/20 text-amber-300'
                )}>{s.careLevel}</span>
                <p className="text-sm font-semibold text-gray-100 leading-tight">{s.commonName}</p>
                <p className="text-[10px] text-gray-500 italic mb-2 truncate">{s.scientificName}</p>
                <div className="space-y-1 text-[10px] text-gray-400">
                  <p>🌡️ {displayTemp(s.temperature.warmSideCelsius[0], tempUnit)}–{displayTemp((s.temperature.baskingCelsius ?? s.temperature.warmSideCelsius)[1], tempUnit)}</p>
                  <p>💧 {s.humidity.min}–{s.humidity.max}%</p>
                  <p>🍖 Every {s.feeding.frequencyDays}d · {s.lighting.uvbRequired ? `UVB ${s.lighting.uvbStrength ?? ''}` : 'No UVB'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Care Tasks ── */}
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
            <SectionHeader title="Care Tasks" />
            {tasks.map(task => <TaskCard key={task.id} task={task} onLog={() => handleLog(task)} />)}
          </div>
        )}

        {animals?.length === 0 && (
          <div className="mt-4 bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">🦎</p>
            <p className="text-gray-200 font-semibold text-lg">No animals yet</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">Add your first animal to start tracking care.</p>
            <button onClick={() => navigate('/animals/add')}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
              Add First Animal
            </button>
          </div>
        )}
      </div>

      {/* ── Colony / Frozen Alerts ── */}
      {dashboardWidgets.colonyAlerts && lowStockItems.length > 0 && (
        <div className="px-4 mb-6">
          <SectionHeader title="Low Stock Alerts" />
          <div className="space-y-2">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                {item.type === 'frozen_prey'
                  ? <Snowflake size={16} className="text-blue-400 shrink-0" />
                  : <Bug size={16} className="text-amber-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">{item.name}</p>
                  <p className="text-xs text-red-400">{item.estimatedCount ?? 0} left (alert at {item.lowStockThreshold})</p>
                </div>
                <button onClick={() => navigate('/colonies')} className="text-xs text-red-300 hover:text-red-200 shrink-0">View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Activity ── */}
      {dashboardWidgets.recentActivity && (recentEvents?.length ?? 0) > 0 && (
        <div className="px-4 mb-6">
          <SectionHeader title="Recent Activity" />
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
            {recentEvents!.map(event => {
              const animal = animalMap.get(event.animalId)
              const icon = eventIcon[event.type] ?? '📋'
              const label = event.type.replace(/_/g, ' ')
              return (
                <button key={event.id} onClick={() => animal && navigate(`/animals/${animal.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left">
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
      <button onClick={() => setFabOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30"
        aria-label="Quick add">
        <Plus size={24} />
      </button>

      {/* ── Quick Add Overlay ── */}
      {fabOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={closeMenu} />
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 rounded-t-2xl z-50 pb-10">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3">
              {logTaskMode !== null && (
                <button onClick={handleBack} className="text-gray-400 hover:text-gray-200 p-1 -ml-1">
                  <ArrowLeft size={20} />
                </button>
              )}
              <p className="text-base font-semibold text-gray-100 flex-1">
                {logTaskMode === null ? 'Quick Add'
                  : logTaskMode === 'choose_type' ? 'Log task for…'
                  : logTaskMode === 'animal' ? 'Pick animal'
                  : logTaskMode === 'plant' ? 'Pick plant'
                  : 'Pick enclosure'}
              </p>
              <button onClick={closeMenu} className="text-gray-500 hover:text-gray-300 p-1">
                <X size={20} />
              </button>
            </div>

            {/* ── Main menu ── */}
            {logTaskMode === null && (
              <div className="px-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { emoji: '🦎', label: 'Animal',    action: () => { navigate('/animals/add'); closeMenu() } },
                    { emoji: '🏠', label: 'Enclosure', action: () => { navigate('/enclosures/add'); closeMenu() } },
                    { emoji: '🌿', label: 'Plant',     action: () => { navigate('/plants'); closeMenu() } },
                    { emoji: '🐛', label: 'Colony',    action: () => { navigate('/colonies'); closeMenu() } },
                  ] as const).map(item => (
                    <button key={item.label} onClick={item.action}
                      className="flex items-center gap-3 px-4 py-3.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-left transition-colors">
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-sm font-medium text-gray-200">{item.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setLogTaskMode('choose_type')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 rounded-xl text-left transition-colors">
                  <span className="text-2xl">📋</span>
                  <span className="text-sm font-medium text-emerald-300">Log a Task…</span>
                  <ChevronRight size={16} className="text-emerald-500 ml-auto" />
                </button>
              </div>
            )}

            {/* ── Entity type picker ── */}
            {logTaskMode === 'choose_type' && (
              <div className="px-4 grid grid-cols-2 gap-2">
                {([
                  { type: 'animal' as const,    emoji: '🦎', label: 'Animal' },
                  { type: 'plant' as const,     emoji: '🌿', label: 'Plant' },
                  { type: 'enclosure' as const, emoji: '🏠', label: 'Enclosure' },
                  { type: 'colony' as const,    emoji: '🐛', label: 'Colony' },
                ]).map(item => (
                  <button key={item.type}
                    onClick={() => {
                      if (item.type === 'colony') { navigate('/colonies'); closeMenu() }
                      else setLogTaskMode(item.type)
                    }}
                    className="flex flex-col items-center gap-2 p-5 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
                    <span className="text-3xl">{item.emoji}</span>
                    <span className="text-sm font-medium text-gray-300">{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ── Animal picker ── */}
            {logTaskMode === 'animal' && (
              <div className="px-4 space-y-1.5 max-h-72 overflow-y-auto">
                {activeAnimals.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-8">No active animals</p>
                )}
                {activeAnimals.map(a => (
                  <button key={a.id} onClick={() => { navigate(`/animals/${a.id}/log`); closeMenu() }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-left transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl overflow-hidden shrink-0">
                      {a.thumbnailBase64
                        ? <img src={a.thumbnailBase64} className="w-full h-full object-cover" />
                        : getAnimalEmoji(a.species)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-100 truncate">{a.name}</p>
                      <p className="text-xs text-gray-500 truncate">{a.species}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Plant picker ── */}
            {logTaskMode === 'plant' && (
              <div className="px-4 space-y-1.5 max-h-72 overflow-y-auto">
                {(plants ?? []).length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-8">No plants added yet</p>
                )}
                {(plants ?? []).map(p => (
                  <button key={p.id} onClick={() => { navigate(`/plants/${p.id}`); closeMenu() }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-left transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl overflow-hidden shrink-0">
                      {p.thumbnailBase64
                        ? <img src={p.thumbnailBase64} className="w-full h-full object-cover" />
                        : (PLANT_TYPE_EMOJI[p.type] ?? '🌱')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-100 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 truncate capitalize">{p.type}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Enclosure picker ── */}
            {logTaskMode === 'enclosure' && (
              <div className="px-4 space-y-1.5 max-h-72 overflow-y-auto">
                {(enclosures ?? []).length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-8">No enclosures added yet</p>
                )}
                {(enclosures ?? []).map(enc => (
                  <button key={enc.id} onClick={() => { navigate(`/enclosures/${enc.id}`); closeMenu() }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-left transition-colors">
                    <span className="text-2xl shrink-0">
                      {ENCLOSURE_EMOJI[enc.enclosureType ?? ''] ?? '🏠'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-100 truncate">{enc.name}</p>
                      <p className="text-xs text-gray-500 truncate capitalize">{enc.enclosureType ?? 'enclosure'}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
