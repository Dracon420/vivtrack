import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, Thermometer, Pencil, Search, ArrowUpDown, Check } from 'lucide-react'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { useAnimals } from '@/db/hooks/useAnimals'
import { useUIStore } from '@/store/uiStore'
import { displayDims, displayTemp } from '@/utils/units'
import { daysAgo } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { Animal, Enclosure } from '@/types'

type FilterOccupancy = 'all' | 'occupied' | 'unoccupied' | 'needs_clean'
type FilterType = 'all' | 'terrarium' | 'aquarium' | 'paludarium' | 'vivarium' | 'pond'
type SortKey = 'name_asc' | 'name_desc' | 'last_cleaned' | 'newest'

const OCCUPANCY_FILTERS: { key: FilterOccupancy; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'occupied', label: 'Occupied' },
  { key: 'unoccupied', label: 'Unoccupied' },
  { key: 'needs_clean', label: 'Needs Clean' },
]

const TYPE_FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Types' },
  { key: 'terrarium', label: '🏠 Terrarium' },
  { key: 'aquarium', label: '🐠 Aquarium' },
  { key: 'paludarium', label: '🌿 Paludarium' },
  { key: 'vivarium', label: '🌿 Vivarium' },
  { key: 'pond', label: '💧 Pond' },
]

const ENCLOSURE_EMOJI: Record<string, string> = {
  aquarium: '🐠', paludarium: '🌿', vivarium: '🌿', pond: '💧', terrarium: '🏠', other: '🏠',
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name_asc', label: 'Name (A → Z)' },
  { key: 'name_desc', label: 'Name (Z → A)' },
  { key: 'last_cleaned', label: 'Last Cleaned (Oldest)' },
  { key: 'newest', label: 'Newest First' },
]

function daysSinceLabel(dateStr?: string): { label: string; urgency: string } {
  if (!dateStr) return { label: 'Never', urgency: 'text-red-400' }
  const days = daysAgo(dateStr)
  if (days < 14) return { label: `${days}d ago`, urgency: 'text-emerald-400' }
  if (days < 30) return { label: `${days}d ago`, urgency: 'text-amber-400' }
  return { label: `${days}d ago`, urgency: 'text-red-400' }
}

function bulbWarnings(enc: Enclosure): number {
  const today = new Date()
  return enc.bulbs.filter(b => b.replacementDueDate && new Date(b.replacementDueDate) <= today).length
}

const isAquatic = (enc: Enclosure) => enc.enclosureType === 'aquarium' || enc.enclosureType === 'pond'

function needsClean(enc: Enclosure): boolean {
  if (isAquatic(enc)) {
    if (!enc.lastWaterChange) return true
    return daysAgo(enc.lastWaterChange) >= 7
  }
  if (!enc.lastSubstrateClean) return true
  return daysAgo(enc.lastSubstrateClean) >= 30
}

function sortEnclosures(encs: Enclosure[], sort: SortKey): Enclosure[] {
  return [...encs].sort((a, b) => {
    switch (sort) {
      case 'name_asc':  return a.name.localeCompare(b.name)
      case 'name_desc': return b.name.localeCompare(a.name)
      case 'last_cleaned': {
        const da = a.lastSubstrateClean ? new Date(a.lastSubstrateClean).getTime() : 0
        const db_ = b.lastSubstrateClean ? new Date(b.lastSubstrateClean).getTime() : 0
        return da - db_
      }
      case 'newest': return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      default: return 0
    }
  })
}

function SortDropdown({ sort, setSort }: { sort: SortKey; setSort: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
          open ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
        )}>
        <ArrowUpDown size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 min-w-[200px] py-1 overflow-hidden">
          {SORT_OPTIONS.map(o => (
            <button key={o.key} onClick={() => { setSort(o.key); setOpen(false) }}
              className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-800 transition-colors',
                sort === o.key ? 'text-emerald-400 font-medium' : 'text-gray-300'
              )}>
              {sort === o.key ? <Check size={12} className="shrink-0" /> : <span className="w-3" />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EnclosureCard({ enc, animals, onClick, onEdit }: {
  enc: Enclosure; animals: Animal[]; onClick: () => void; onEdit: () => void
}) {
  const navigate = useNavigate()
  const aquatic = isAquatic(enc)
  const cleanDate = aquatic ? enc.lastWaterChange : enc.lastSubstrateClean
  const clean = daysSinceLabel(cleanDate)
  const warnings = bulbWarnings(enc)
  const { measurementUnit, tempUnit } = useUIStore()
  const dims = enc.volumeGallons
    ? `${enc.volumeGallons} gal${enc.tankShape ? ` · ${enc.tankShape}` : ''}`
    : displayDims(enc.dimensionsLWHcm, measurementUnit)

  return (
    <div onClick={onClick}
      className="w-full text-left bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-emerald-500/40 hover:bg-gray-800 transition-all active:scale-[0.98] cursor-pointer">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg shrink-0">{enc.enclosureType ? ENCLOSURE_EMOJI[enc.enclosureType] : '🏠'}</span>
          <p className="font-semibold text-gray-100 truncate">{enc.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {warnings > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
              <AlertTriangle size={12} /> {warnings} bulb{warnings > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); onEdit() }}
            className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors">
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {animals.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {animals.map(a => (
            <button key={a.id} onClick={e => { e.stopPropagation(); navigate(`/animals/${a.id}`) }}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full transition-colors">
              {a.thumbnailBase64
                ? <img src={a.thumbnailBase64} className="w-3.5 h-3.5 rounded-full object-cover" />
                : <span>🐾</span>}
              {a.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-600 mb-3">Unoccupied</p>
      )}

      <p className="text-xs text-gray-600 mb-3">{dims}</p>

      <div className="flex gap-4 text-xs">
        <div>
          <p className="text-gray-600 mb-0.5">{aquatic ? 'Water change' : 'Last clean'}</p>
          <p className={cn('font-medium', clean.urgency)}>{clean.label}</p>
        </div>
        {enc.temperatureZones[0] && (
          <div className="flex items-start gap-1">
            <Thermometer size={12} className="text-gray-600 mt-0.5" />
            <div>
              <p className="text-gray-600 mb-0.5">{aquatic ? 'Water' : 'Basking'}</p>
              <p className="font-medium text-gray-300">{displayTemp(enc.temperatureZones[0].targetMax, tempUnit)}</p>
            </div>
          </div>
        )}
        {aquatic ? (
          enc.volumeGallons ? (
            <div>
              <p className="text-gray-600 mb-0.5">Volume</p>
              <p className="font-medium text-gray-300">{enc.volumeGallons}gal</p>
            </div>
          ) : null
        ) : (
          <div>
            <p className="text-gray-600 mb-0.5">Humidity</p>
            <p className="font-medium text-gray-300">{enc.humidityMin}–{enc.humidityMax}%</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EnclosureList() {
  const navigate = useNavigate()
  const enclosures = useEnclosures()
  const animals = useAnimals()
  const [search, setSearch] = useState('')
  const [filterOccupancy, setFilterOccupancy] = useState<FilterOccupancy>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortKey>('name_asc')

  const enclosureAnimalsMap = new Map<string, Animal[]>()
  animals?.forEach(a => {
    if (!a.enclosureId) return
    const arr = enclosureAnimalsMap.get(a.enclosureId) ?? []
    arr.push(a)
    enclosureAnimalsMap.set(a.enclosureId, arr)
  })

  const filtered = sortEnclosures(
    enclosures?.filter(enc => {
      if (search && !enc.name.toLowerCase().includes(search.toLowerCase())) return false
      const occupants = enclosureAnimalsMap.get(enc.id) ?? []
      if (filterOccupancy === 'occupied' && occupants.length === 0) return false
      if (filterOccupancy === 'unoccupied' && occupants.length > 0) return false
      if (filterOccupancy === 'needs_clean' && !needsClean(enc)) return false
      if (filterType !== 'all' && enc.enclosureType !== filterType) return false
      return true
    }) ?? [],
    sort
  )

  const hasEnclosures = (enclosures?.length ?? 0) > 0

  return (
    <div className="min-h-full pb-24">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Enclosures</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {enclosures?.length ?? 0} total{filtered.length !== (enclosures?.length ?? 0) ? ` · ${filtered.length} shown` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SortDropdown sort={sort} setSort={setSort} />
          <button onClick={() => navigate('/enclosures/add')}
            className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center transition-colors">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {hasEnclosures && (
        <>
          {/* Search */}
          <div className="px-4 mb-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="search" placeholder="Search enclosures…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>

          {/* Type filter */}
          <div className="flex gap-1.5 px-4 mb-2 overflow-x-auto pb-1">
            {TYPE_FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilterType(f.key)}
                className={cn('shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  filterType === f.key ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}>
                {f.label}
              </button>
            ))}
          </div>
          {/* Occupancy filter */}
          <div className="flex gap-1.5 px-4 mb-4 overflow-x-auto pb-1">
            {OCCUPANCY_FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilterOccupancy(f.key)}
                className={cn('shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  filterOccupancy === f.key ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}>
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}

      {!hasEnclosures ? (
        <div className="text-center py-16 px-4">
          <p className="text-5xl mb-4">🏠</p>
          <p className="text-gray-200 font-semibold text-lg">No enclosures yet</p>
          <p className="text-gray-500 text-sm mt-1 mb-6">Add your first enclosure to track husbandry.</p>
          <button onClick={() => navigate('/enclosures/add')}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
            Add Enclosure
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-gray-400 font-medium">No enclosures match your filters.</p>
          <button onClick={() => { setSearch(''); setFilterOccupancy('all') }}
            className="text-emerald-400 text-sm mt-2">Clear filters</button>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {filtered.map(enc => (
            <EnclosureCard key={enc.id} enc={enc}
              animals={enclosureAnimalsMap.get(enc.id) ?? []}
              onClick={() => navigate(`/enclosures/${enc.id}`)}
              onEdit={() => navigate(`/enclosures/${enc.id}/edit`)} />
          ))}
        </div>
      )}

      {hasEnclosures && (
        <button onClick={() => navigate('/enclosures/add')}
          className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30">
          <Plus size={24} />
        </button>
      )}
    </div>
  )
}
