import { useState, useRef, useEffect } from 'react'
import { Plus, AlertTriangle, Bug, Leaf, Snowflake, Search, ArrowUpDown, Check } from 'lucide-react'
import { useFeederColonies, useCUCCultures, addFeederColony, updateFeederColony, addColonyLogEvent, addCUCCulture, updateCUCCulture } from '@/db/hooks/useColonies'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { timeAgo, nowISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { FeederColony, CUCCulture, CUCHealth, CUCType, CUCLocation } from '@/types'

type Tab = 'feeders' | 'frozen' | 'cuc'

const HEALTH_COLORS: Record<CUCHealth, string> = {
  thriving:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  stable:    'bg-blue-500/20 text-blue-400 border-blue-500/40',
  declining: 'bg-red-500/20 text-red-400 border-red-500/40',
  unknown:   'bg-gray-700/50 text-gray-500 border-gray-700',
}

const HEALTH_CYCLE: CUCHealth[] = ['unknown', 'thriving', 'stable', 'declining']

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

// ── Feeder Cards ───────────────────────────────────────────────────────────
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

// ── CUC Card ───────────────────────────────────────────────────────────────
function CUCCard({ culture, enclosureName, onMarkFed, onUpdateCount, onCycleHealth }: {
  culture: CUCCulture
  enclosureName?: string
  onMarkFed: (id: string) => void
  onUpdateCount: (id: string, delta: number) => void
  onCycleHealth: (id: string, current: CUCHealth) => void
}) {
  const qty = culture.estimatedCount ?? 0
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-100 truncate">{culture.name}</p>
          <p className="text-xs text-gray-500 italic truncate">{culture.species}</p>
        </div>
        <button
          onClick={() => onCycleHealth(culture.id, culture.reproductionHealth)}
          className={cn('shrink-0 text-xs font-semibold capitalize px-2 py-0.5 rounded-full border transition-colors', HEALTH_COLORS[culture.reproductionHealth])}>
          {culture.reproductionHealth}
        </button>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        <div>
          <p className="text-gray-600 mb-0.5">Type</p>
          <p className="text-gray-300 capitalize">{culture.type}</p>
        </div>
        <div>
          <p className="text-gray-600 mb-0.5">Location</p>
          <p className="text-gray-300">{enclosureName ?? culture.location.replace(/_/g, ' ')}</p>
        </div>
        {culture.lastFedDate && (
          <div>
            <p className="text-gray-600 mb-0.5">Last fed</p>
            <p className="text-gray-300">{timeAgo(culture.lastFedDate)}</p>
          </div>
        )}
      </div>

      {culture.substrateNotes && (
        <p className="text-xs text-gray-600 italic truncate">Substrate: {culture.substrateNotes}</p>
      )}

      {/* Count + actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1">
          <button onClick={() => onUpdateCount(culture.id, -1)} disabled={qty <= 0}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-200 disabled:opacity-40 font-bold text-lg">−</button>
          <span className="w-10 text-center text-sm font-semibold text-gray-100">{qty}</span>
          <button onClick={() => onUpdateCount(culture.id, 1)}
            className="w-6 h-6 flex items-center justify-center text-emerald-400 hover:text-emerald-300 font-bold text-lg">+</button>
        </div>
        <p className="text-xs text-gray-600">est. count</p>
        <button onClick={() => onMarkFed(culture.id)}
          className="ml-auto px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-lg transition-colors">
          Mark Fed
        </button>
      </div>
    </div>
  )
}

// ── Add Forms ──────────────────────────────────────────────────────────────
const STYLE = `.f-input { display:block; width:100%; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.8125rem; outline:none; } select.f-input option { background:#1f2937; }`

function AddCUCForm({ onClose }: { onClose: () => void }) {
  const enclosures = useEnclosures()
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [type, setType] = useState<CUCType>('isopod')
  const [location, setLocation] = useState<CUCLocation>('standalone_culture')
  const [enclosureId, setEnclosureId] = useState('')
  const [count, setCount] = useState('')
  const [health, setHealth] = useState<CUCHealth>('unknown')
  const [substrateNotes, setSubstrateNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name) return
    setSaving(true)
    setError(null)
    try {
      await addCUCCulture({
        name, species: species || name, type, location,
        enclosureId: location === 'in_enclosure' ? enclosureId || undefined : undefined,
        estimatedCount: count ? parseInt(count) : undefined,
        reproductionHealth: health,
        substrateNotes: substrateNotes || undefined,
        notes: notes || undefined,
        lastFedDate: undefined, feedingNotes: undefined,
        lastCountDate: undefined, introductionDate: undefined,
      })
      onClose()
    } catch (err: any) {
      setError(`Save failed: ${err?.message || err?.details || JSON.stringify(err)}`)
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-200">Add CUC Culture</p>

      <input value={name} onChange={e => setName(e.target.value)} placeholder="Culture name (e.g. Powder Blue Isopods)" className="f-input" />
      <input value={species} onChange={e => setSpecies(e.target.value)} placeholder="Species (e.g. Porcellionides pruinosus)" className="f-input" />

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Type</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(['isopod', 'springtail', 'other'] as CUCType[]).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={cn('py-1.5 rounded-lg text-xs capitalize border transition-all',
                type === t ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'border-gray-700 text-gray-500'
              )}>{t}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Location</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => setLocation('standalone_culture')}
            className={cn('py-1.5 rounded-lg text-xs border transition-all',
              location === 'standalone_culture' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'border-gray-700 text-gray-500'
            )}>Standalone culture</button>
          <button onClick={() => setLocation('in_enclosure')}
            className={cn('py-1.5 rounded-lg text-xs border transition-all',
              location === 'in_enclosure' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'border-gray-700 text-gray-500'
            )}>In enclosure</button>
        </div>
      </div>

      {location === 'in_enclosure' && (enclosures?.length ?? 0) > 0 && (
        <select value={enclosureId} onChange={e => setEnclosureId(e.target.value)} className="f-input">
          <option value="">Select enclosure (optional)</option>
          {enclosures!.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      )}

      <input value={count} onChange={e => setCount(e.target.value)} type="number" min="0"
        placeholder="Estimated count (optional)" className="f-input" />

      <div>
        <p className="text-xs text-gray-500 mb-1.5">Health status</p>
        <div className="grid grid-cols-4 gap-1">
          {(['thriving', 'stable', 'declining', 'unknown'] as CUCHealth[]).map(h => (
            <button key={h} onClick={() => setHealth(h)}
              className={cn('py-1.5 rounded-lg text-xs capitalize border transition-all',
                health === h ? HEALTH_COLORS[h] : 'border-gray-700 text-gray-500'
              )}>{h}</button>
          ))}
        </div>
      </div>

      <input value={substrateNotes} onChange={e => setSubstrateNotes(e.target.value)}
        placeholder="Substrate / moisture notes (optional)" className="f-input" />
      <input value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)" className="f-input" />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!name || saving}
          className="flex-1 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg disabled:opacity-40">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} className="px-3 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg">Cancel</button>
      </div>
      <style>{STYLE}</style>
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
      <style>{STYLE}</style>
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
      <style>{STYLE}</style>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Colonies() {
  const [tab, setTab] = useState<Tab>('feeders')
  const [showAddFeeder, setShowAddFeeder] = useState(false)
  const [showAddFrozen, setShowAddFrozen] = useState(false)
  const [showAddCUC, setShowAddCUC] = useState(false)

  const [feederSearch, setFeederSearch] = useState('')
  const [feederLowOnly, setFeederLowOnly] = useState(false)
  const [feederSort, setFeederSort] = useState<'name' | 'count_low' | 'count_high'>('name')

  const [frozenLowOnly, setFrozenLowOnly] = useState(false)
  const [frozenSort, setFrozenSort] = useState<'name' | 'count_low' | 'count_high'>('name')

  const [cucSearch, setCucSearch] = useState('')
  const [cucFilter, setCucFilter] = useState<'all' | CUCHealth>('all')
  const [cucSort, setCucSort] = useState<'name' | 'count_low' | 'count_high'>('name')

  const feeders = useFeederColonies()
  const cucs = useCUCCultures()
  const enclosures = useEnclosures()

  const enclosureMap = new Map(enclosures?.map(e => [e.id, e]) ?? [])
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

  const handleCUCMarkFed = async (id: string) => {
    await updateCUCCulture(id, { lastFedDate: nowISO() })
  }

  const handleCUCUpdateCount = async (id: string, delta: number) => {
    const c = cucs?.find(x => x.id === id)
    if (!c) return
    const newCount = Math.max(0, (c.estimatedCount ?? 0) + delta)
    await updateCUCCulture(id, { estimatedCount: newCount, lastCountDate: nowISO() })
  }

  const handleCUCCycleHealth = async (id: string, current: CUCHealth) => {
    const idx = HEALTH_CYCLE.indexOf(current)
    const next = HEALTH_CYCLE[(idx + 1) % HEALTH_CYCLE.length]
    await updateCUCCulture(id, { reproductionHealth: next })
  }

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

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Colonies</h1>
          <p className="text-sm text-gray-500 mt-0.5">Feeders · Frozen · CUC</p>
        </div>
        <div>
          {tab === 'feeders' && (
            <button onClick={() => setShowAddFeeder(true)} className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center"><Plus size={20} /></button>
          )}
          {tab === 'frozen' && (
            <button onClick={() => setShowAddFrozen(true)} className="w-10 h-10 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center"><Plus size={20} /></button>
          )}
          {tab === 'cuc' && (
            <button onClick={() => setShowAddCUC(true)} className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center"><Plus size={20} /></button>
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
            {showAddCUC && <AddCUCForm onClose={() => setShowAddCUC(false)} />}
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
              {(['all', 'thriving', 'stable', 'declining', 'unknown'] as const).map(f => (
                <button key={f} onClick={() => setCucFilter(f)}
                  className={cn('shrink-0 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors',
                    cucFilter === f ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}>{f}</button>
              ))}
            </div>
            {filteredCUC.length === 0 && !showAddCUC ? (
              <div className="text-center py-12">
                <Leaf size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">{(cucs?.length ?? 0) === 0 ? 'No CUC cultures yet' : 'No cultures match'}</p>
                {(cucs?.length ?? 0) === 0 && (
                  <>
                    <p className="text-gray-600 text-sm mt-1">Track isopods and springtails for bioactive enclosures.</p>
                    <button onClick={() => setShowAddCUC(true)}
                      className="mt-4 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl">
                      Add First Culture
                    </button>
                  </>
                )}
              </div>
            ) : filteredCUC.map(c => (
              <CUCCard key={c.id} culture={c}
                enclosureName={c.enclosureId ? enclosureMap.get(c.enclosureId)?.name : undefined}
                onMarkFed={handleCUCMarkFed}
                onUpdateCount={handleCUCUpdateCount}
                onCycleHealth={handleCUCCycleHealth}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
