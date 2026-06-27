import { useState } from 'react'
import { Plus, AlertTriangle, Bug, Leaf, Snowflake } from 'lucide-react'
import { useFeederColonies, useCUCCultures, addFeederColony, updateFeederColony, addColonyLogEvent } from '@/db/hooks/useColonies'
import { timeAgo, nowISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { FeederColony, CUCCulture } from '@/types'

type Tab = 'feeders' | 'cuc' | 'frozen'

const FROZEN_PRESETS = [
  'FT Pinky', 'FT Fuzzy', 'FT Hopper',
  'FT Small Mouse', 'FT Medium Mouse', 'FT Large Mouse',
  'FT Small Rat', 'FT Medium Rat', 'FT Large Rat', 'FT XL Rat',
  'FT ASF Small', 'FT ASF Adult',
]

function FeederCard({ colony, onHarvest }: { colony: FeederColony; onHarvest: (id: string, qty: number) => void }) {
  const isLow = colony.lowStockThreshold && colony.estimatedCount !== undefined && colony.estimatedCount < colony.lowStockThreshold
  const [harvestQty, setHarvestQty] = useState('')

  return (
    <div className={cn('bg-gray-900 border rounded-xl p-4', isLow ? 'border-red-500/40' : 'border-gray-800')}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-gray-100">{colony.name}</p>
          <p className="text-xs text-gray-500 italic">{colony.species}</p>
        </div>
        {isLow && <span className="flex items-center gap-1 text-xs text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> Low stock</span>}
      </div>

      <div className="flex gap-4 text-sm mb-3">
        <div>
          <p className="text-xs text-gray-600 mb-0.5">Estimated count</p>
          <p className="font-semibold text-gray-100">{colony.estimatedCount ?? '—'}</p>
        </div>
        {colony.lastFedDate && (
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Last fed</p>
            <p className="text-gray-300">{timeAgo(colony.lastFedDate)}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="number" min="1" placeholder="Harvest qty" value={harvestQty}
          onChange={e => setHarvestQty(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
        />
        <button
          onClick={() => { if (harvestQty) { onHarvest(colony.id, parseInt(harvestQty)); setHarvestQty('') } }}
          disabled={!harvestQty}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
        >
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
          <button
            onClick={() => onAdjust(colony.id, -1)}
            disabled={qty <= 0}
            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 font-bold flex items-center justify-center transition-colors text-lg leading-none"
          >−</button>
          <span className="w-10 text-center font-bold text-gray-100 text-lg">{qty}</span>
          <button
            onClick={() => onAdjust(colony.id, 1)}
            className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center transition-colors text-lg leading-none"
          >+</button>
        </div>
      </div>
      {colony.lowStockThreshold !== undefined && (
        <p className="text-xs text-gray-600 mt-2">Alert below {colony.lowStockThreshold}</p>
      )}
    </div>
  )
}

function CUCCard({ culture }: { culture: CUCCulture }) {
  const healthColors = {
    thriving: 'text-emerald-400', stable: 'text-blue-400',
    declining: 'text-red-400', unknown: 'text-gray-500',
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-gray-100">{culture.name}</p>
          <p className="text-xs text-gray-500 italic">{culture.species}</p>
        </div>
        <span className={cn('text-xs font-semibold capitalize', healthColors[culture.reproductionHealth])}>
          {culture.reproductionHealth}
        </span>
      </div>
      <div className="flex gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-600 mb-0.5">Est. count</p>
          <p className="text-gray-300">{culture.estimatedCount ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-0.5">Location</p>
          <p className="text-gray-300 capitalize">{culture.location.replace(/_/g, ' ')}</p>
        </div>
        {culture.lastFedDate && (
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Last fed</p>
            <p className="text-gray-300">{timeAgo(culture.lastFedDate)}</p>
          </div>
        )}
      </div>
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
      <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Colony name (e.g. Main Dubia Colony)" className="f-input" />
      <input value={species} onChange={e => setSpecies(e.target.value)} type="text" placeholder="Species (e.g. Blaptica dubia)" className="f-input" />
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
      <style>{`.f-input { display: block; width: 100%; background: #1f2937; border: 1px solid #374151; color: #f3f4f6; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.8125rem; outline: none; } select.f-input option { background: #1f2937; }`}</style>
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
    await addFeederColony({
      name,
      species: name,
      type: 'frozen_prey',
      estimatedCount: parseInt(qty) || 0,
      lowStockThreshold: threshold ? parseInt(threshold) : undefined,
      linkedAnimalIds: [],
      lastFedDate: undefined,
      feedingNotes: undefined,
    })
    onClose()
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-200">Add Frozen Item</p>
      <select value={preset} onChange={e => setPreset(e.target.value)} className="f-input">
        {FROZEN_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="__custom__">Custom…</option>
      </select>
      {isCustom && (
        <input value={customName} onChange={e => setCustomName(e.target.value)} type="text" placeholder="Item name" className="f-input" />
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">Starting qty</p>
          <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0" className="f-input" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Low stock alert</p>
          <input value={threshold} onChange={e => setThreshold(e.target.value)} type="number" min="0" className="f-input" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isCustom && !customName} className="flex-1 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg disabled:opacity-40">Add Item</button>
        <button onClick={onClose} className="px-3 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg">Cancel</button>
      </div>
      <style>{`.f-input { display: block; width: 100%; background: #1f2937; border: 1px solid #374151; color: #f3f4f6; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.8125rem; outline: none; } select.f-input option { background: #1f2937; }`}</style>
    </div>
  )
}

export default function Colonies() {
  const [tab, setTab] = useState<Tab>('feeders')
  const [showAddFeeder, setShowAddFeeder] = useState(false)
  const [showAddFrozen, setShowAddFrozen] = useState(false)
  const feeders = useFeederColonies()
  const cucs = useCUCCultures()

  const liveColonies = feeders?.filter(c => c.type !== 'frozen_prey')
  const frozenItems = feeders?.filter(c => c.type === 'frozen_prey')

  const handleHarvest = async (colonyId: string, qty: number) => {
    const colony = feeders?.find(c => c.id === colonyId)
    if (!colony) return
    const newCount = Math.max(0, (colony.estimatedCount ?? 0) - qty)
    await updateFeederColony(colonyId, { estimatedCount: newCount, updatedAt: nowISO() })
    await addColonyLogEvent({ colonyId, colonyType: 'feeder', eventType: 'harvest', occurredAt: nowISO(), harvestQuantity: qty, countAfter: newCount })
  }

  const handleFrozenAdjust = async (colonyId: string, delta: number) => {
    const item = frozenItems?.find(c => c.id === colonyId)
    if (!item) return
    const newCount = Math.max(0, (item.estimatedCount ?? 0) + delta)
    await updateFeederColony(colonyId, { estimatedCount: newCount, updatedAt: nowISO() })
  }

  return (
    <div className="min-h-full pb-4">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Colonies</h1>
          <p className="text-sm text-gray-500 mt-0.5">Feeders, Frozen & Clean-Up Crew</p>
        </div>
        {tab === 'feeders' && (
          <button onClick={() => setShowAddFeeder(true)} className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center">
            <Plus size={20} />
          </button>
        )}
        {tab === 'frozen' && (
          <button onClick={() => setShowAddFrozen(true)} className="w-10 h-10 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center">
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setTab('feeders')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0',
            tab === 'feeders' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}>
          <Bug size={14} /> Feeders
        </button>
        <button onClick={() => setTab('frozen')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0',
            tab === 'frozen' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}>
          <Snowflake size={14} /> Frozen
        </button>
        <button onClick={() => setTab('cuc')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0',
            tab === 'cuc' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}>
          <Leaf size={14} /> CUC
        </button>
      </div>

      <div className="px-4 space-y-3">
        {tab === 'feeders' && (
          <>
            {showAddFeeder && <AddFeederForm onClose={() => setShowAddFeeder(false)} />}
            {liveColonies?.length === 0 && !showAddFeeder ? (
              <div className="text-center py-12">
                <Bug size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No feeder colonies yet</p>
                <p className="text-gray-600 text-sm mt-1">Track your roach colonies, crickets, and more.</p>
              </div>
            ) : liveColonies?.map(c => <FeederCard key={c.id} colony={c} onHarvest={handleHarvest} />)}
          </>
        )}

        {tab === 'frozen' && (
          <>
            {showAddFrozen && <AddFrozenForm onClose={() => setShowAddFrozen(false)} />}
            {frozenItems?.length === 0 && !showAddFrozen ? (
              <div className="text-center py-12">
                <Snowflake size={36} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No frozen items tracked</p>
                <p className="text-gray-600 text-sm mt-1">Track frozen mice, rats, ASF and other prey.</p>
                <button
                  onClick={() => setShowAddFrozen(true)}
                  className="mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Add Frozen Item
                </button>
              </div>
            ) : frozenItems?.map(c => (
              <FrozenCard key={c.id} colony={c} onAdjust={handleFrozenAdjust} />
            ))}
          </>
        )}

        {tab === 'cuc' && (
          cucs?.length === 0 ? (
            <div className="text-center py-12">
              <Leaf size={36} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No CUC cultures yet</p>
              <p className="text-gray-600 text-sm mt-1">Track isopods and springtail cultures for your bioactive enclosures.</p>
            </div>
          ) : cucs?.map(c => <CUCCard key={c.id} culture={c} />)
        )}
      </div>
    </div>
  )
}
