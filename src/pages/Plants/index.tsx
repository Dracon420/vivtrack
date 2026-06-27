import { useState, useRef, useEffect } from 'react'
import { Plus, Search, ArrowUpDown, Check, Droplets, Sprout, ShieldCheck, ShieldAlert } from 'lucide-react'
import { usePlants, addPlant, updatePlant } from '@/db/hooks/usePlants'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { loadPlantSpecies, toxicityLabel } from '@/utils/plantSpecies'
import { timeAgo, nowISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { Plant, PlantType, PlantStatus, PlantSpeciesTemplate } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────
const PLANT_TYPE_EMOJI: Record<PlantType, string> = {
  tropical: '🌿', succulent: '🪴', bromeliad: '🌺', moss: '🌱',
  fern: '🌿', carnivorous: '🪤', aquatic: '💧', epiphyte: '🌿',
  vine: '🌿', other: '🌱',
}

const PLANT_STATUS_COLORS: Record<PlantStatus, string> = {
  thriving:    'bg-emerald-500/20 text-emerald-300',
  stable:      'bg-blue-500/20 text-blue-300',
  struggling:  'bg-red-500/20 text-red-300',
  dormant:     'bg-gray-500/20 text-gray-400',
  propagating: 'bg-purple-500/20 text-purple-300',
  dead:        'bg-gray-700/50 text-gray-600',
}

const SORT_OPTS = [
  { key: 'name' as const, label: 'Name (A → Z)' },
  { key: 'watered' as const, label: 'Last Watered (Oldest)' },
  { key: 'status' as const, label: 'Status' },
]

const STATUS_FILTERS = [
  { key: 'all' as const, label: 'All' },
  { key: 'thriving' as const, label: 'Thriving' },
  { key: 'stable' as const, label: 'Stable' },
  { key: 'struggling' as const, label: 'Struggling' },
  { key: 'propagating' as const, label: 'Propagating' },
  { key: 'dormant' as const, label: 'Dormant' },
  { key: 'watering_due' as const, label: '💧 Water Due' },
]

// Map plant species light level → Plant lightNeeds
function mapLight(light: PlantSpeciesTemplate['light']): Plant['lightNeeds'] {
  if (light === 'very_high') return 'full_sun'
  if (light === 'high') return 'bright_indirect'
  if (light === 'bright_indirect') return 'bright_indirect'
  if (light === 'medium') return 'medium'
  return 'low'
}

// Map plant species plantType → PlantType
function mapType(plantType: string): PlantType {
  const map: Record<string, PlantType> = {
    aquatic: 'aquatic', tropical: 'tropical', succulent: 'succulent',
    moss: 'moss', carnivorous: 'carnivorous', fern: 'fern',
    bromeliad: 'bromeliad', epiphyte: 'epiphyte', vine: 'vine',
  }
  return map[plantType] ?? 'other'
}

// ── Helpers ────────────────────────────────────────────────────────────────
function isWateringDue(plant: Plant): boolean {
  if (!plant.wateringFrequencyDays) return false
  if (!plant.lastWatered) return true
  return (Date.now() - new Date(plant.lastWatered).getTime()) / 86400000 >= plant.wateringFrequencyDays
}

function sortPlants(list: Plant[], sort: 'name' | 'watered' | 'status'): Plant[] {
  return [...list].sort((a, b) => {
    if (sort === 'watered') {
      return (a.lastWatered ? new Date(a.lastWatered).getTime() : 0) - (b.lastWatered ? new Date(b.lastWatered).getTime() : 0)
    }
    if (sort === 'status') return a.status.localeCompare(b.status)
    return a.name.localeCompare(b.name)
  })
}

// ── Sort Dropdown ──────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }: { value: 'name' | 'watered' | 'status'; onChange: (k: typeof value) => void }) {
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
        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
          open ? 'bg-green-600/20 border-green-600/40 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
        )}>
        <ArrowUpDown size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
          {SORT_OPTS.map(o => (
            <button key={o.key} onClick={() => { onChange(o.key); setOpen(false) }}
              className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-800',
                value === o.key ? 'text-green-400 font-medium' : 'text-gray-300'
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

function animalSafeBadge(safe: boolean | undefined): { label: string; color: 'emerald' | 'red' } | null {
  if (safe === true)  return { label: 'Animal Safe', color: 'emerald' }
  if (safe === false) return { label: 'Caution', color: 'red' }
  return null
}

// ── Plant Card ─────────────────────────────────────────────────────────────
function PlantCard({ plant, enclosureName, onWater }: { plant: Plant; enclosureName?: string; onWater: () => void }) {
  const due = isWateringDue(plant)
  const tox = animalSafeBadge(plant.animalSafe)

  return (
    <div className={cn('bg-gray-900 border rounded-2xl p-4', due ? 'border-blue-500/40' : 'border-gray-800')}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-xl shrink-0 overflow-hidden">
          {plant.thumbnailBase64
            ? <img src={plant.thumbnailBase64} className="w-full h-full object-cover" />
            : PLANT_TYPE_EMOJI[plant.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-100 truncate">{plant.name}</p>
              <p className="text-xs text-gray-500 italic truncate">{plant.species}</p>
              {plant.variety && <p className="text-xs text-emerald-400 truncate">{plant.variety}</p>}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize', PLANT_STATUS_COLORS[plant.status])}>
                {plant.status}
              </span>
              {tox && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5',
                  tox.color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                )}>
                  {tox.color === 'emerald' ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                  {tox.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs mb-3">
        <div>
          <p className="text-gray-600 mb-0.5">Type</p>
          <p className="text-gray-300 capitalize">{plant.type.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className="text-gray-600 mb-0.5">Light</p>
          <p className="text-gray-300 capitalize">{plant.lightNeeds.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className="text-gray-600 mb-0.5">Last watered</p>
          <p className={cn('font-medium', due ? 'text-blue-400' : 'text-gray-300')}>
            {plant.lastWatered ? timeAgo(plant.lastWatered) : 'Never'}
          </p>
        </div>
        {plant.wateringFrequencyDays && (
          <div>
            <p className="text-gray-600 mb-0.5">Frequency</p>
            <p className="text-gray-300">Every {plant.wateringFrequencyDays}d</p>
          </div>
        )}
        {plant.propagationsCount > 0 && (
          <div>
            <p className="text-gray-600 mb-0.5">Propagations</p>
            <p className="text-purple-400">{plant.propagationsCount}</p>
          </div>
        )}
        {enclosureName && (
          <div>
            <p className="text-gray-600 mb-0.5">Enclosure</p>
            <p className="text-blue-400 truncate">{enclosureName}</p>
          </div>
        )}
      </div>

      {plant.notes && <p className="text-xs text-gray-600 mb-3 truncate">{plant.notes}</p>}

      {due && (
        <button onClick={onWater}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-sm font-semibold rounded-xl transition-colors">
          <Droplets size={14} /> Mark Watered
        </button>
      )}
    </div>
  )
}

// ── Add Plant Form ─────────────────────────────────────────────────────────
function AddPlantForm({ onClose }: { onClose: () => void }) {
  const [speciesList, setSpeciesList] = useState<PlantSpeciesTemplate[]>([])
  const [speciesSearch, setSpeciesSearch] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState<PlantSpeciesTemplate | null>(null)
  const [speciesDropOpen, setSpeciesDropOpen] = useState(false)
  const speciesRef = useRef<HTMLDivElement>(null)

  const [name, setName] = useState('')
  const [customSpecies, setCustomSpecies] = useState('')
  const [variety, setVariety] = useState('')
  const [type, setType] = useState<PlantType>('tropical')
  const [light, setLight] = useState<Plant['lightNeeds']>('medium')
  const [waterDays, setWaterDays] = useState('')
  const [animalSafe, setAnimalSafe] = useState<boolean | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => { loadPlantSpecies().then(setSpeciesList) }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (speciesRef.current && !speciesRef.current.contains(e.target as Node)) setSpeciesDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredSpecies = speciesSearch
    ? speciesList.filter(s =>
        s.commonName.toLowerCase().includes(speciesSearch.toLowerCase()) ||
        s.scientificName.toLowerCase().includes(speciesSearch.toLowerCase())
      )
    : speciesList

  const handleSelectSpecies = (s: PlantSpeciesTemplate) => {
    setSelectedSpecies(s)
    setCustomSpecies(s.scientificName)
    setType(mapType(s.plantType))
    setLight(mapLight(s.light))
    if (s.wateringFrequencyDays) setWaterDays(String(s.wateringFrequencyDays[0]))
    setAnimalSafe(s.toxicity.animalSafe)
    setSpeciesSearch('')
    setSpeciesDropOpen(false)
  }

  const handleClearSpecies = () => {
    setSelectedSpecies(null)
    setCustomSpecies('')
    setSpeciesSearch('')
    setAnimalSafe(undefined)
  }

  const handleSave = async () => {
    if (!name) return
    const speciesName = selectedSpecies ? selectedSpecies.scientificName : (customSpecies || name)
    setSaving(true)
    setSaveError(null)
    try {
      await addPlant({
        name, species: speciesName, variety: variety || undefined, type,
        status: 'stable', lightNeeds: light,
        wateringFrequencyDays: waterDays ? parseInt(waterDays) : undefined,
        lastWatered: undefined, lastFertilized: undefined,
        propagationsCount: 0, notes: notes || undefined,
        thumbnailBase64: undefined, acquisitionDate: undefined, enclosureId: undefined,
        speciesId: selectedSpecies?.id,
        animalSafe,
      })
      onClose()
    } catch (err: any) {
      const msg = err?.message || err?.details || err?.hint || JSON.stringify(err)
      setSaveError(`Save failed: ${msg}`)
      setSaving(false)
    }
  }

  const tox = animalSafe !== undefined ? toxicityLabel({ animalSafe }) : null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-200">Add Plant</p>

      {/* Species selector */}
      <div ref={speciesRef} className="relative">
        <p className="text-xs text-gray-500 mb-1">Select species (optional)</p>
        {selectedSpecies ? (
          <div className="flex items-center justify-between bg-gray-700 border border-gray-600 rounded-xl px-3 py-2">
            <div>
              <p className="text-sm text-gray-100 font-medium">{selectedSpecies.commonName}</p>
              <p className="text-xs text-gray-400 italic">{selectedSpecies.scientificName}</p>
            </div>
            <div className="flex items-center gap-2">
              {tox && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                  tox.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                  tox.color === 'amber'   ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-red-500/20 text-red-400'
                )}>
                  {tox.color === 'emerald' ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                  {tox.label}
                </span>
              )}
              <button onClick={handleClearSpecies} className="text-gray-500 hover:text-gray-300 transition-colors">✕</button>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={speciesSearch}
              onChange={e => { setSpeciesSearch(e.target.value); setSpeciesDropOpen(true) }}
              onFocus={() => setSpeciesDropOpen(true)}
              placeholder="Search species… (or skip for custom)"
              className="f-input"
            />
            {speciesDropOpen && filteredSpecies.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-600 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                {filteredSpecies.slice(0, 30).map(s => {
                  const t = toxicityLabel(s.toxicity)
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSpecies(s)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-700 text-left transition-colors border-b border-gray-700/50 last:border-0"
                    >
                      <div>
                        <p className="text-sm text-gray-100">{s.commonName}</p>
                        <p className="text-xs text-gray-500 italic">{s.scientificName}</p>
                      </div>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full shrink-0 ml-2',
                        t.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                        t.color === 'amber'   ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'
                      )}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <input value={name} onChange={e => setName(e.target.value)} type="text"
        placeholder="Name / nickname (e.g. Pothos #1) *" className="f-input" />

      {!selectedSpecies && (
        <input value={customSpecies} onChange={e => setCustomSpecies(e.target.value)} type="text"
          placeholder="Botanical name (e.g. Epipremnum aureum) — optional" className="f-input" />
      )}

      <input value={variety} onChange={e => setVariety(e.target.value)} type="text"
        placeholder="Variety / cultivar (optional)" className="f-input" />

      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={e => setType(e.target.value as PlantType)} className="f-input">
          <option value="tropical">🌿 Tropical</option>
          <option value="succulent">🪴 Succulent</option>
          <option value="bromeliad">🌺 Bromeliad</option>
          <option value="moss">🌱 Moss</option>
          <option value="fern">🌿 Fern</option>
          <option value="carnivorous">🪤 Carnivorous</option>
          <option value="aquatic">💧 Aquatic</option>
          <option value="epiphyte">🌿 Epiphyte</option>
          <option value="vine">🌿 Vine</option>
          <option value="other">🌱 Other</option>
        </select>
        <select value={light} onChange={e => setLight(e.target.value as Plant['lightNeeds'])} className="f-input">
          <option value="low">Low light</option>
          <option value="medium">Medium</option>
          <option value="bright_indirect">Bright indirect</option>
          <option value="full_sun">Full sun</option>
        </select>
      </div>

      <input value={waterDays} onChange={e => setWaterDays(e.target.value)} type="number" min="1"
        placeholder="Water every X days (optional)" className="f-input" />
      <input value={notes} onChange={e => setNotes(e.target.value)} type="text"
        placeholder="Notes (optional)" className="f-input" />

      {/* Care tip from selected species */}
      {selectedSpecies?.specialNotes && selectedSpecies.specialNotes.length > 0 && (
        <div className="bg-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-400 font-medium mb-1">Care tips</p>
          <ul className="text-xs text-gray-500 space-y-0.5">
            {selectedSpecies.specialNotes.slice(0, 3).map((n, i) => (
              <li key={i}>· {n}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && <p className="text-xs text-red-400">{saveError}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!name || saving}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors">
          {saving ? 'Saving…' : 'Save Plant'}
        </button>
        <button onClick={onClose} disabled={saving} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-colors disabled:opacity-40">
          Cancel
        </button>
      </div>
      <style>{`.f-input{display:block;width:100%;background:#1f2937;border:1px solid #374151;color:#f3f4f6;border-radius:0.75rem;padding:0.6rem 0.75rem;font-size:0.8125rem;outline:none;} select.f-input option{background:#1f2937;}`}</style>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PlantsPage() {
  const plants = usePlants()
  const enclosures = useEnclosures()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]['key']>('all')
  const [sort, setSort] = useState<'name' | 'watered' | 'status'>('name')
  const [showAdd, setShowAdd] = useState(false)

  const enclosureMap = new Map(enclosures?.map(e => [e.id, e]) ?? [])

  const dueCount = (plants ?? []).filter(isWateringDue).length

  const filtered = sortPlants(
    (plants ?? []).filter(p => {
      if (search) {
        const q = search.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.species.toLowerCase().includes(q)) return false
      }
      if (statusFilter === 'watering_due') return isWateringDue(p)
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      return true
    }),
    sort
  )

  const handleWater = (id: string) => updatePlant(id, { lastWatered: nowISO() })

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Plants</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {plants?.length ?? 0} total
            {dueCount > 0 && <span className="text-blue-400 ml-2">· {dueCount} need watering</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SortDropdown value={sort} onChange={setSort} />
          <button onClick={() => setShowAdd(true)}
            className="w-10 h-10 bg-green-600 hover:bg-green-500 text-white rounded-full flex items-center justify-center transition-colors">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="search" placeholder="Search plants…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-600/50" />
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-1.5 px-4 mb-4 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={cn('shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              statusFilter === f.key ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {showAdd && <AddPlantForm onClose={() => setShowAdd(false)} />}

        {filtered.length === 0 && !showAdd ? (
          <div className="text-center py-16">
            <Sprout size={48} className="text-gray-700 mx-auto mb-4" />
            {(plants?.length ?? 0) === 0 ? (
              <>
                <p className="text-gray-200 font-semibold text-lg">No plants yet</p>
                <p className="text-gray-500 text-sm mt-1 mb-6">Track plants for bioactive enclosures, aquariums, or propagation.</p>
                <button onClick={() => setShowAdd(true)}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors">
                  Add First Plant
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-400 font-medium">No plants match your filters.</p>
                <button onClick={() => { setSearch(''); setStatusFilter('all') }}
                  className="text-green-400 text-sm mt-2">Clear filters</button>
              </>
            )}
          </div>
        ) : (
          filtered.map(p => (
            <PlantCard key={p.id} plant={p}
              enclosureName={p.enclosureId ? enclosureMap.get(p.enclosureId)?.name : undefined}
              onWater={() => handleWater(p.id)} />
          ))
        )}
      </div>

      {(plants?.length ?? 0) > 0 && (
        <button onClick={() => setShowAdd(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30">
          <Plus size={24} />
        </button>
      )}
    </div>
  )
}
