import { useState, useRef, useEffect } from 'react'
import { Plus, AlertTriangle, Bug, Leaf, Snowflake, Search, ArrowUpDown, Check, Sprout, Droplets } from 'lucide-react'
import { useFeederColonies, useCUCCultures, addFeederColony, updateFeederColony, addColonyLogEvent } from '@/db/hooks/useColonies'
import { usePlants, addPlant, updatePlant } from '@/db/hooks/usePlants'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { timeAgo, nowISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { FeederColony, CUCCulture, Plant, PlantType, PlantStatus } from '@/types'

type Tab = 'feeders' | 'frozen' | 'cuc' | 'plants'

// ── Shared Sort Dropdown ───────────────────────────────────────────────────
function SortDropdown<K extends string>({ value, options, onChange }: {
  value: K; options: { key: K; label: string }[]; onChange: (k: K) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
          open ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-gray-900 border-gray-700 text-gray-400'
        )}>
        <ArrowUpDown size={12} /> Sort
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
          {options.map(o => (
            <button key={o.key} onClick={() => { onChange(o.key); setOpen(false) }}
              className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-800',
                value === o.key ? 'text-emerald-400 font-medium' : 'text-gray-300'
              )}>
              {value === o.key ? <Check size={12} className="shrink-0" /> : <span className="w-3" />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Feeders ────────────────────────────────────────────────────────────────
const FROZEN_PRESETS = [
  'FT Pinky', 'FT Fuzzy', 'FT Hopper',
  'FT Small Mouse', 'FT Medium Mouse', 'FT Large Mouse',
  'FT Small Rat', 'FT Medium Rat', 'FT Large Rat', 'FT XL Rat',
  'FT ASF Small', 'FT ASF Adult',
]

const FEEDER_SORT_OPTS = [
  { key: 'name' as const, label: 'Name (A → Z)' },
  { key: 'count_low' as const, label: 'Count: Low → High' },
  { key: 'count_high' as const, label: 'Count: High → Low' },
]

function sortFeeders(list: FeederColony[], sort: string): FeederColony[] {
  return [...list].sort((a, b) => {
    if (sort === 'count_low') return (a.estimatedCount ?? 0) - (b.estimatedCount ?? 0)
    if (sort === 'count_high') return (b.estimatedCount ?? 0) - (a.estimatedCount ?? 0)
    return a.name.localeCompare(b.name)
  })
}

function FeederCard({ colony, onHarvest }: { colony: FeederColony; onHarvest: (id: string, qty: number) => void }) {
  const isLow = colony.lowStockThreshold !== undefined && colony.estimatedCount !== undefined && colony.estimatedCount < colony.lowStockThreshold
  const [harvestQty, setHarvestQty] = useState('')
  return (
    <div className={cn('bg-gray-900 border rounded-xl p-4', isLow ? 'border-red-500/40' : 'border-gray-800')}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-gray-100">{colony.name}</p>
          <p className="text-xs text-gray-500 italic">{colony.species}</p>
        </div>
        {isLow && <span className="flex items-center gap-1 text-xs text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full shrink-0"><AlertTriangle size={10} /> Low</span>}
      </div>
      <div className="flex gap-4 text-sm mb-3">
        <div>
          <p className="text-xs text-gray-600 mb-0.5">Est. count</p>
          <p className="font-semibold text-gray-100">{colony.estimatedCount ?? '—'}</p>
        </div>
        {colony.lastFedDate && (
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Last fed</p>
            <p className="text-gray-300">{timeAgo(colony.lastFedDate)}</p>
          </div>
        )}
        {colony.lowStockThreshold !== undefined && (
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Alert at</p>
            <p className="text-gray-300">{colony.lowStockThreshold}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input type="number" min="1" placeholder="Harvest qty" value={harvestQty}
          onChange={e => setHarvestQty(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
        <button onClick={() => { if (harvestQty) { onHarvest(colony.id, parseInt(harvestQty)); setHarvestQty('') } }}
          disabled={!harvestQty}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-medium rounded-lg">
          Harvest
        </button>
      </div>
    </div>
  )
}

function FrozenCard({ colony, onAdjust }: { colony: FeederColony; onAdjust: (id: string, delta: number) => void }) {
  const isLow = colony.lowStockThreshold !== undefined && (colony.estimatedCount ?? 0) < (colony.lowStockThreshold ?? 0)
  const qty = colony.estimatedCount ?? 0
  return (
    <div className={cn('bg-gray-900 border rounded-xl p-4', isLow ? 'border-red-500/40' : 'border-gray-800')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-100 truncate">{colony.name}</p>
          {isLow && (
            <span className="inline-flex items-center gap-1 text-xs text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full mt-0.5">
              <AlertTriangle size={10} /> Low stock
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAdjust(colony.id, -1)} disabled={qty <= 0}
            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 font-bold flex items-center justify-center text-lg">−</button>
          <span className="w-10 text-center font-bold text-gray-100 text-lg">{qty}</span>
          <button onClick={() => onAdjust(colony.id, 1)}
            className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center text-lg">+</button>
        </div>
      </div>
      {colony.lowStockThreshold !== undefined && (
        <p className="text-xs text-gray-600 mt-2">Alert below {colony.lowStockThreshold}</p>
      )}
    </div>
  )
}

function CUCCard({ culture }: { culture: CUCCulture }) {
  const healthColors = { thriving: 'text-emerald-400', stable: 'text-blue-400', declining: 'text-red-400', unknown: 'text-gray-500' }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-gray-100">{culture.name}</p>
          <p className="text-xs text-gray-500 italic">{culture.species}</p>
        </div>
        <span className={cn('text-xs font-semibold capitalize shrink-0', healthColors[culture.reproductionHealth])}>
          {culture.reproductionHealth}
        </span>
      </div>
      <div className="flex gap-4 text-sm">
        <div><p className="text-xs text-gray-600 mb-0.5">Est. count</p><p className="text-gray-300">{culture.estimatedCount ?? '—'}</p></div>
        <div><p className="text-xs text-gray-600 mb-0.5">Location</p><p className="text-gray-300 capitalize">{culture.location.replace(/_/g, ' ')}</p></div>
        {culture.lastFedDate && (
          <div><p className="text-xs text-gray-600 mb-0.5">Last fed</p><p className="text-gray-300">{timeAgo(culture.lastFedDate)}</p></div>
        )}
      </div>
    </div>
  )
}

// ── Plants ─────────────────────────────────────────────────────────────────
const PLANT_STATUS_COLORS: Record<PlantStatus, string> = {
  thriving:    'bg-emerald-500/20 text-emerald-300',
  stable:      'bg-blue-500/20 text-blue-300',
  struggling:  'bg-red-500/20 text-red-300',
  dormant:     'bg-gray-500/20 text-gray-400',
  propagating: 'bg-purple-500/20 text-purple-300',
  dead:        'bg-gray-700/50 text-gray-600',
}

const PLANT_TYPE_EMOJI: Record<PlantType, string> = {
  tropical: '🌿', succulent: '🪴', bromeliad: '🌺', moss: '🌱',
  fern: '🌿', carnivorous: '🪤', aquatic: '🌊', epiphyte: '🌿',
  vine: '🌿', other: '🌱',
}

const PLANT_SORT_OPTS = [
  { key: 'name' as const, label: 'Name (A → Z)' },
  { key: 'watered' as const, label: 'Last Watered (Oldest)' },
  { key: 'status' as const, label: 'Status' },
]

function sortPlants(list: Plant[], sort: string): Plant[] {
  return [...list].sort((a, b) => {
    if (sort === 'watered') {
      const da = a.lastWatered ? new Date(a.lastWatered).getTime() : 0
      const db_ = b.lastWatered ? new Date(b.lastWatered).getTime() : 0
      return da - db_
    }
    if (sort === 'status') return a.status.localeCompare(b.status)
    return a.name.localeCompare(b.name)
  })
}

function PlantCard({ plant, onWater }: { plant: Plant; onWater: (id: string) => void }) {
  const isDue = plant.wateringFrequencyDays && plant.lastWatered
    ? (Date.now() - new Date(plant.lastWatered).getTime()) / 86400000 >= plant.wateringFrequencyDays
    : !plant.lastWatered && !!plant.wateringFrequencyDays
  return (
    <div className={cn('bg-gray-900 border rounded-xl p-4', isDue ? 'border-blue-500/40' : 'border-gray-800')}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-lg shrink-0 overflow-hidden">
            {plant.thumbnailBase64
              ? <img src={plant.thumbnailBase64} className="w-full h-full object-cover" />
              : PLANT_TYPE_EMOJI[plant.type]}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-100 truncate">{plant.name}</p>
            <p className="text-xs text-gray-500 italic truncate">{plant.species}</p>
            {plant.variety && <p className="text-xs text-emerald-400 truncate">{plant.variety}</p>}
          </div>
        </div>
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize shrink-0', PLANT_STATUS_COLORS[plant.status])}>
          {plant.status}
        </span>
      </div>
      <div className="flex gap-3 text-xs mb-3">
        <div>
          <p className="text-gray-600 mb-0.5">Light</p>
          <p className="text-gray-300 capitalize">{plant.lightNeeds.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className="text-gray-600 mb-0.5">Last watered</p>
          <p className={cn('font-medium', isDue ? 'text-blue-400' : 'text-gray-300')}>
            {plant.lastWatered ? timeAgo(plant.lastWatered) : 'Never'}
          </p>
        </div>
        {plant.propagationsCount > 0 && (
          <div>
            <p className="text-gray-600 mb-0.5">Propagations</p>
            <p className="text-purple-400">{plant.propagationsCount}</p>
          </div>
        )}
      </div>
      {isDue && (
        <button onClick={() => onWater(plant.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-sm font-medium rounded-lg transition-colors">
          <Droplets size={14} /> Mark Watered
        </button>
      )}
    </div>
  )
}

function AddPlantForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [variety, setVariety] = useState('')
  const [type, setType] = useState<PlantType>('tropical')
  const [light, setLight] = useState<Plant['lightNeeds']>('medium')
  const [waterDays, setWaterDays] = useState('')
  const [notes, setNotes] = useState('')

  const handleSave = async () => {
    if (!name || !species) return
    await addPlant({
      name, species, variety: variety || undefined, type,
      status: 'stable', lightNeeds: light,
      wateringFrequencyDays: waterDays ? parseInt(waterDays) : undefined,
      lastWatered: undefined, lastFertilized: undefined,
      propagationsCount: 0, notes: notes || undefined,
      thumbnailBase64: undefined, acquisitionDate: undefined, enclosureId: undefined,
    })
    onClose()
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-200">Add Plant</p>
      <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Name / nickname" className="f-input" />
      <input value={species} onChange={e => setSpecies(e.target.value)} type="text" placeholder="Botanical name (e.g. Epipremnum aureum)" className="f-input" />
      <input value={variety} onChange={e => setVariety(e.target.value)} type="text" placeholder="Variety / cultivar (optional)" className="f-input" />
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={e => setType(e.target.value as PlantType)} className="f-input">
          <option value="tropical">Tropical</option>
          <option value="succulent">Succulent</option>
          <option value="bromeliad">Bromeliad</option>
          <option value="moss">Moss</option>
          <option value="fern">Fern</option>
          <option value="carnivorous">Carnivorous</option>
          <option value="aquatic">Aquatic</option>
          <option value="epiphyte">Epiphyte</option>
          <option value="vine">Vine</option>
          <option value="other">Other</option>
        </select>
        <select value={light} onChange={e => setLight(e.target.value as Plant['lightNeeds'])} className="f-input">
          <option value="low">Low light</option>
          <option value="medium">Medium</option>
          <option value="bright_indirect">Bright indirect</option>
          <option value="full_sun">Full sun</option>
        </select>
      </div>
      <input value={waterDays} onChange={e => setWaterDays(e.target.value)} type="number" min="1" placeholder="Water every X days (optional)" className="f-input" />
      <input value={notes} onChange={e => setNotes(e.target.value)} type="text" placeholder="Notes (optional)" className="f-input" />
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!name || !species}
          className="flex-1 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg disabled:opacity-40">Save</button>
        <button onClick={onClose} className="px-3 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg">Cancel</button>
      </div>
      <style>{`.f-input { display:block; width:100%; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.8125rem; outline:none; } select.f-input option { background:#1f2937; }`}</style>
    </div>
  )
}

function AddFeederForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [type, setType] = useState<FeederColony['type']>('roach')
  const [count, setCount] = useState('')
  const [threshold, setThreshold] = useState('')
  const handleSave = async () => {
    await addFeederColony({ name, species, type, estimatedCount: count ? parseInt(count) : undefined, lowStockThreshold: threshold ? parseInt(threshold) : undefined, linkedAnimalIds: [], lastFedDate: undefined, feedingNotes: undefined })
    onClose()
  }
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-200">Add Feeder Colony</p>
      <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Colony name" className="f-input" />
      <input value={species} onChange={e => setSpecies(e.target.value)} type="text" placeholder="Species" className="f-input" />
      <select value={type} onChange={e => setType(e.target.value as FeederColony['type'])} className="f-input">
        <option value="roach">Roach</option>
        <option value="cricket">Cricket</option>
        <option value="mealworm">Mealworm</option>
        <option value="superworm">Superworm</option>
        <option value="waxworm">Waxworm</option>
        <option value="bsfl">BSFL</option>
        <option value="hornworm">Hornworm</option>
        <option value="other">Other</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input value={count} onChange={e => setCount(e.target.value)} type="number" placeholder="Est. count" className="f-input" />
        <input value={threshold} onChange={e => setThreshold(e.target.value)} type="number" placeholder="Low stock alert" className="f-input" />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!name} className="flex-1 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg disabled:opacity-40">Save</button>
        <button onClick={onClose} className="px-3 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg">Cancel</button>
      </div>
      <style>{`.f-input { display:block; width:100%; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.8125rem; outline:none; } select.f-input option { background:#1f2937; }`}</style>
    </div>
  )
}

function AddFrozenForm({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState(FROZEN_PRESETS[0])
  const [customName, setCustomName] = useState('')
  const [qty, setQty] = useState('0')
  const [threshold, setThreshold] = useState('5')
  const isCustom = preset === '__custom__'
  const handleSave = async () => {
    const name = isCustom ? customName.trim() : preset
    if (!name) return
    await addFeederColony({ name, species: name, type: 'frozen_prey', estimatedCount: parseInt(qty) || 0, lowStockThreshold: threshold ? parseInt(threshold) : undefined, linkedAnimalIds: [], lastFedDate: undefined, feedingNotes: undefined })
    onClose()
  }
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-200">Add Frozen Item</p>
      <select value={preset} onChange={e => setPreset(e.target.value)} className="f-input">
        {FROZEN_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="__custom__">Custom…</option>
      </select>
      {isCustom && <input value={customName} onChange={e => setCustomName(e.target.value)} type="text" placeholder="Item name" className="f-input" />}
      <div className="grid grid-cols-2 gap-2">
        <div><p className="text-xs text-gray-500 mb-1">Starting qty</p><input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0" className="f-input" /></div>
        <div><p className="text-xs text-gray-500 mb-1">Low stock alert</p><input value={threshold} onChange={e => setThreshold(e.target.value)} type="number" min="0" className="f-input" /></div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isCustom && !customName} className="flex-1 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg disabled:opacity-40">Add Item</button>
        <button onClick={onClose} className="px-3 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg">Cancel</button>
      </div>
      <style>{`.f-input { display:block; width:100%; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.8125rem; outline:none; } select.f-input option { background:#1f2937; }`}</style>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Colonies() {
  const [tab, setTab] = useState<Tab>('feeders')
  const [showAddFeeder, setShowAddFeeder] = useState(false)
  const [showAddFrozen, setShowAddFrozen] = useState(false)
  const [showAddPlant, setShowAddPlant] = useState(false)

  // Feeders state
  const [feederSearch, setFeederSearch] = useState('')
  const [feederLowOnly, setFeederLowOnly] = useState(false)
  const [feederSort, setFeederSort] = useState<'name' | 'count_low' | 'count_high'>('name')

  // Frozen state
  const [frozenLowOnly, setFrozenLowOnly] = useState(false)
  const [frozenSort, setFrozenSort] = useState<'name' | 'count_low' | 'count_high'>('name')

  // CUC state
  const [cucSearch, setCucSearch] = useState('')
  const [cucFilter, setCucFilter] = useState<'all' | 'thriving' | 'stable' | 'declining'>('all')
  const [cucSort, setCucSort] = useState<'name' | 'count_low' | 'count_high'>('name')

  // Plants state
  const [plantSearch, setPlantSearch] = useState('')
  const [plantFilter, setPlantFilter] = useState<'all' | 'thriving' | 'stable' | 'struggling' | 'propagating' | 'watering_due'>('all')
  const [plantSort, setPlantSort] = useState<'name' | 'watered' | 'status'>('name')

  const feeders = useFeederColonies()
  const cucs = useCUCCultures()
  const plants = usePlants()

  const liveColonies = feeders?.filter(c => c.type !== 'frozen_prey') ?? []
  const frozenItems = feeders?.filter(c => c.type === 'frozen_prey') ?? []

  const handleHarvest = async (colonyId: string, qty: number) => {
    const colony = feeders?.find(c => c.id === colonyId)
    if (!colony) return
    const newCount = Math.max(0, (colony.estimatedCount ?? 0) - qty)
    await updateFeederColony(colonyId, { estimatedCount: newCount, updatedAt: nowISO() })
    await addColonyLogEvent({ colonyId, colonyType: 'feeder', eventType: 'harvest', occurredAt: nowISO(), harvestQuantity: qty, countAfter: newCount })
  }

  const handleFrozenAdjust = async (colonyId: string, delta: number) => {
    const item = frozenItems.find(c => c.id === colonyId)
    if (!item) return
    const newCount = Math.max(0, (item.estimatedCount ?? 0) + delta)
    await updateFeederColony(colonyId, { estimatedCount: newCount, updatedAt: nowISO() })
  }

  const handleWaterPlant = async (id: string) => {
    await updatePlant(id, { lastWatered: nowISO() })
  }

  // Filtered lists
  const filteredFeeders = sortFeeders(
    liveColonies.filter(c => {
      if (feederSearch && !c.name.toLowerCase().includes(feederSearch.toLowerCase())) return false
      if (feederLowOnly && !(c.lowStockThreshold !== undefined && (c.estimatedCount ?? 0) < c.lowStockThreshold)) return false
      return true
    }), feederSort)

  const filteredFrozen = sortFeeders(
    frozenItems.filter(c => {
      if (frozenLowOnly && !(c.lowStockThreshold !== undefined && (c.estimatedCount ?? 0) < c.lowStockThreshold)) return false
      return true
    }), frozenSort)

  const filteredCUC = [...(cucs ?? [])].sort((a, b) => {
    if (cucSort === 'count_low') return (a.estimatedCount ?? 0) - (b.estimatedCount ?? 0)
    if (cucSort === 'count_high') return (b.estimatedCount ?? 0) - (a.estimatedCount ?? 0)
    return a.name.localeCompare(b.name)
  }).filter(c => {
    if (cucSearch && !c.name.toLowerCase().includes(cucSearch.toLowerCase()) && !c.species.toLowerCase().includes(cucSearch.toLowerCase())) return false
    if (cucFilter !== 'all' && c.reproductionHealth !== cucFilter) return false
    return true
  })

  const filteredPlants = sortPlants(
    (plants ?? []).filter(p => {
      if (plantSearch && !p.name.toLowerCase().includes(plantSearch.toLowerCase()) && !p.species.toLowerCase().includes(plantSearch.toLowerCase())) return false
      if (plantFilter === 'watering_due') {
        const isDue = p.wateringFrequencyDays && p.lastWatered
          ? (Date.now() - new Date(p.lastWatered).getTime()) / 86400000 >= p.wateringFrequencyDays
          : !p.lastWatered && !!p.wateringFrequencyDays
        return !!isDue
      }
      if (plantFilter !== 'all' && p.status !== plantFilter) return false
      return true
    }), plantSort)

  const plantsDue = (plants ?? []).filter(p =>
    p.wateringFrequencyDays && ((p.lastWatered
      ? (Date.now() - new Date(p.lastWatered).getTime()) / 86400000 >= p.wateringFrequencyDays
      : true))
  ).length

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Colonies</h1>
          <p className="text-sm text-gray-500 mt-0.5">Feeders · Frozen · CUC · Plants</p>
        </div>
        <div>
          {tab === 'feeders' && (
            <button onClick={() => setShowAddFeeder(true)} className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center"><Plus size={20} /></button>
          )}
          {tab === 'frozen' && (
            <button onClick={() => setShowAddFrozen(true)} className="w-10 h-10 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center"><Plus size={20} /></button>
          )}
          {tab === 'plants' && (
            <button onClick={() => setShowAddPlant(true)} className="w-10 h-10 bg-green-600 hover:bg-green-500 text-white rounded-full flex items-center justify-center"><Plus size={20} /></button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setTab('feeders')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors',
            tab === 'feeders' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}><Bug size={14} /> Feeders</button>
        <button onClick={() => setTab('frozen')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors',
            tab === 'frozen' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}><Snowflake size={14} /> Frozen</button>
        <button onClick={() => setTab('cuc')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors',
            tab === 'cuc' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}><Leaf size={14} /> CUC</button>
        <button onClick={() => setTab('plants')}
          className={cn('relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 transition-colors',
            tab === 'plants' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}>
          <Sprout size={14} /> Plants
          {plantsDue > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{plantsDue}</span>
          )}
        </button>
      </div>

      <div className="px-4 space-y-3">
        {/* ── FEEDERS ── */}
        {tab === 'feeders' && (
          <>
            {showAddFeeder && <AddFeederForm onClose={() => setShowAddFeeder(false)} />}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="search" placeholder="Search colonies…" value={feederSearch}
                  onChange={e => setFeederSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none" />
              </div>
              <button onClick={() => setFeederLowOnly(v => !v)}
                className={cn('shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-colors',
                  feederLowOnly ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-gray-900 border-gray-700 text-gray-500'
                )}>Low only</button>
              <SortDropdown value={feederSort} options={FEEDER_SORT_OPTS} onChange={setFeederSort} />
            </div>
            {filteredFeeders.length === 0 && !showAddFeeder ? (
              <div className="text-center py-12">
                <Bug size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">{liveColonies.length === 0 ? 'No feeder colonies yet' : 'No colonies match'}</p>
                {liveColonies.length === 0 && <p className="text-gray-600 text-sm mt-1">Track roach colonies, crickets, and more.</p>}
              </div>
            ) : filteredFeeders.map(c => <FeederCard key={c.id} colony={c} onHarvest={handleHarvest} />)}
          </>
        )}

        {/* ── FROZEN ── */}
        {tab === 'frozen' && (
          <>
            {showAddFrozen && <AddFrozenForm onClose={() => setShowAddFrozen(false)} />}
            <div className="flex gap-2 items-center justify-between">
              <button onClick={() => setFrozenLowOnly(v => !v)}
                className={cn('shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-colors',
                  frozenLowOnly ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-gray-900 border-gray-700 text-gray-500'
                )}>Low stock only</button>
              <SortDropdown value={frozenSort} options={FEEDER_SORT_OPTS} onChange={setFrozenSort} />
            </div>
            {filteredFrozen.length === 0 && !showAddFrozen ? (
              <div className="text-center py-12">
                <Snowflake size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">{frozenItems.length === 0 ? 'No frozen items tracked' : 'No items match filter'}</p>
                {frozenItems.length === 0 && <p className="text-gray-600 text-sm mt-1">Track frozen mice, rats, ASF and other prey.</p>}
                {frozenItems.length === 0 && (
                  <button onClick={() => setShowAddFrozen(true)} className="mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold rounded-xl">Add Frozen Item</button>
                )}
              </div>
            ) : filteredFrozen.map(c => <FrozenCard key={c.id} colony={c} onAdjust={handleFrozenAdjust} />)}
          </>
        )}

        {/* ── CUC ── */}
        {tab === 'cuc' && (
          <>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="search" placeholder="Search CUC…" value={cucSearch}
                  onChange={e => setCucSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none" />
              </div>
              <SortDropdown value={cucSort} options={FEEDER_SORT_OPTS} onChange={setCucSort} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(['all', 'thriving', 'stable', 'declining'] as const).map(f => (
                <button key={f} onClick={() => setCucFilter(f)}
                  className={cn('shrink-0 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors',
                    cucFilter === f ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}>{f}</button>
              ))}
            </div>
            {filteredCUC.length === 0 ? (
              <div className="text-center py-12">
                <Leaf size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">{(cucs?.length ?? 0) === 0 ? 'No CUC cultures yet' : 'No cultures match'}</p>
                {(cucs?.length ?? 0) === 0 && <p className="text-gray-600 text-sm mt-1">Track isopods and springtails for bioactive enclosures.</p>}
              </div>
            ) : filteredCUC.map(c => <CUCCard key={c.id} culture={c} />)}
          </>
        )}

        {/* ── PLANTS ── */}
        {tab === 'plants' && (
          <>
            {showAddPlant && <AddPlantForm onClose={() => setShowAddPlant(false)} />}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="search" placeholder="Search plants…" value={plantSearch}
                  onChange={e => setPlantSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none" />
              </div>
              <SortDropdown value={plantSort} options={PLANT_SORT_OPTS} onChange={setPlantSort} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {([
                { key: 'all', label: 'All' },
                { key: 'thriving', label: 'Thriving' },
                { key: 'stable', label: 'Stable' },
                { key: 'struggling', label: 'Struggling' },
                { key: 'propagating', label: 'Propagating' },
                { key: 'watering_due', label: '💧 Due' },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setPlantFilter(f.key)}
                  className={cn('shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    plantFilter === f.key ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}>{f.label}</button>
              ))}
            </div>
            {filteredPlants.length === 0 && !showAddPlant ? (
              <div className="text-center py-12">
                <Sprout size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">{(plants?.length ?? 0) === 0 ? 'No plants yet' : 'No plants match'}</p>
                {(plants?.length ?? 0) === 0 && (
                  <>
                    <p className="text-gray-600 text-sm mt-1">Track plants for bioactive setups, aquariums, or propagation.</p>
                    <button onClick={() => setShowAddPlant(true)} className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl">Add Plant</button>
                  </>
                )}
              </div>
            ) : filteredPlants.map(p => <PlantCard key={p.id} plant={p} onWater={handleWaterPlant} />)}
          </>
        )}
      </div>
    </div>
  )
}
