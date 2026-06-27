import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Home, ArrowUpDown, Check, ScanLine } from 'lucide-react'
import { useAnimals } from '@/db/hooks/useAnimals'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { cn } from '@/lib/utils'
import type { Animal, Enclosure } from '@/types'

type FilterStatus = 'all' | Animal['status']
type FilterClass = 'all' | 'reptile' | 'fish' | 'amphibian' | 'invertebrate' | 'mammal' | 'bird'
type SortKey = 'name_asc' | 'name_desc' | 'acquired_newest' | 'acquired_oldest' | 'species'

const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'quarantine', label: 'Quarantine' },
  { key: 'brumation', label: 'Brumation' },
  { key: 'deceased', label: 'Deceased' },
  { key: 'rehomed', label: 'Rehomed' },
]

const CLASS_FILTERS: { key: FilterClass; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '' },
  { key: 'reptile', label: 'Reptile', emoji: '🦎' },
  { key: 'fish', label: 'Fish', emoji: '🐠' },
  { key: 'amphibian', label: 'Amphibian', emoji: '🐸' },
  { key: 'invertebrate', label: 'Invert', emoji: '🕷️' },
  { key: 'mammal', label: 'Mammal', emoji: '🐾' },
  { key: 'bird', label: 'Bird', emoji: '🦜' },
]

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name_asc', label: 'Name (A → Z)' },
  { key: 'name_desc', label: 'Name (Z → A)' },
  { key: 'acquired_newest', label: 'Date Added (Newest)' },
  { key: 'acquired_oldest', label: 'Date Added (Oldest)' },
  { key: 'species', label: 'Species (A → Z)' },
]

const statusColors: Record<Animal['status'], string> = {
  active: 'bg-emerald-500/20 text-emerald-300',
  quarantine: 'bg-amber-500/20 text-amber-300',
  brumation: 'bg-blue-500/20 text-blue-300',
  deceased: 'bg-gray-500/20 text-gray-400',
  rehomed: 'bg-purple-500/20 text-purple-300',
}

const classToOrder: Record<string, string[]> = {
  snake: ['python', 'boa', 'snake', 'corn', 'king', 'hognose', 'rosy', 'sand', 'carpet', 'blood'],
  lizard: ['gecko', 'dragon', 'skink', 'iguana', 'monitor', 'tegu', 'anole', 'uromastyx', 'chameleon', 'frilled'],
  chelonian: ['tortoise', 'turtle'],
  frog: ['frog', 'toad', 'axolotl', 'salamander'],
  fish: ['fish', 'betta', 'guppy', 'molly', 'platy', 'tetra', 'oscar', 'cichlid', 'pleco', 'corydoras', 'goldfish', 'koi', 'clownfish', 'tang', 'discus', 'angelfish'],
}

function guessClass(species: string): FilterClass {
  const low = species.toLowerCase()
  for (const [order, keywords] of Object.entries(classToOrder)) {
    if (keywords.some(k => low.includes(k))) {
      if (order === 'fish') return 'fish'
      if (order === 'snake' || order === 'lizard' || order === 'chelonian') return 'reptile'
      if (order === 'frog') return 'amphibian'
    }
  }
  if (low.includes('tarantula') || low.includes('scorpion') || low.includes('millipede') || low.includes('roach') || low.includes('mantis') || low.includes('snail')) return 'invertebrate'
  if (low.includes('hedgehog') || low.includes('chinchilla') || low.includes('ferret') || low.includes('sugar glider') || low.includes('degu') || low.includes('prairie')) return 'mammal'
  if (low.includes('parrot') || low.includes('conure') || low.includes('cockatiel') || low.includes('budgie') || low.includes('bird')) return 'bird'
  return 'reptile'
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
  if (low.includes('chinchilla') || low.includes('degu') || low.includes('prairie')) return '🐹'
  if (low.includes('ferret')) return '🦡'
  if (low.includes('parrot') || low.includes('conure') || low.includes('cockatiel')) return '🦜'
  if (low.includes('betta')) return '🐡'
  if (low.includes('fish') || low.includes('tetra') || low.includes('guppy') || low.includes('molly') || low.includes('platy') || low.includes('cichlid') || low.includes('pleco') || low.includes('corydoras') || low.includes('goldfish') || low.includes('koi') || low.includes('clownfish') || low.includes('tang') || low.includes('oscar') || low.includes('discus') || low.includes('angelfish')) return '🐠'
  return '🐾'
}

function sortAnimals(animals: Animal[], sort: SortKey): Animal[] {
  return [...animals].sort((a, b) => {
    switch (sort) {
      case 'name_asc':      return a.name.localeCompare(b.name)
      case 'name_desc':     return b.name.localeCompare(a.name)
      case 'acquired_newest': return new Date(b.acquisitionDate).getTime() - new Date(a.acquisitionDate).getTime()
      case 'acquired_oldest': return new Date(a.acquisitionDate).getTime() - new Date(b.acquisitionDate).getTime()
      case 'species':       return a.species.localeCompare(b.species)
      default:              return 0
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
  const current = SORT_OPTIONS.find(o => o.key === sort)!
  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
          open ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
        )}>
        <ArrowUpDown size={13} />
        <span className="hidden sm:inline">{current.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 min-w-[180px] py-1 overflow-hidden">
          {SORT_OPTIONS.map(o => (
            <button key={o.key} onClick={() => { setSort(o.key); setOpen(false) }}
              className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-800 transition-colors',
                sort === o.key ? 'text-emerald-400 font-medium' : 'text-gray-300'
              )}>
              {sort === o.key && <Check size={12} className="shrink-0" />}
              <span className={sort === o.key ? '' : 'pl-4'}>{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AnimalCard({ animal, enclosure, onClick }: { animal: Animal; enclosure?: Enclosure; onClick: () => void }) {
  const navigate = useNavigate()
  const emoji = getAnimalEmoji(animal.species)
  const age = animal.dateOfBirth
    ? Math.floor((Date.now() - new Date(animal.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left hover:border-emerald-500/40 hover:bg-gray-800 transition-all active:scale-95 cursor-pointer">
      <div className="w-full aspect-square bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center mb-3 text-4xl">
        {animal.thumbnailBase64
          ? <img src={animal.thumbnailBase64} className="w-full h-full object-cover" />
          : emoji}
      </div>
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-1">
          <p className="font-semibold text-gray-100 text-sm leading-tight truncate">{animal.name}</p>
          <span className={cn('shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium', statusColors[animal.status])}>
            {animal.status === 'active' ? '●' : animal.status[0].toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{animal.species}</p>
        {animal.morph && <p className="text-xs text-emerald-400 truncate">{animal.morph}</p>}
        {age !== null && <p className="text-xs text-gray-600">{age}y • {animal.sex}</p>}
        {enclosure && (
          <button onClick={e => { e.stopPropagation(); navigate(`/enclosures/${enclosure.id}`) }}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-0.5 max-w-full">
            <Home size={10} className="shrink-0" />
            <span className="truncate">{enclosure.name}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function AnimalList() {
  const navigate = useNavigate()
  const animals = useAnimals()
  const enclosures = useEnclosures()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterClass, setFilterClass] = useState<FilterClass>('all')
  const [sort, setSort] = useState<SortKey>('name_asc')

  const enclosureMap = new Map(enclosures?.map(e => [e.id, e]) ?? [])

  const filtered = sortAnimals(
    animals?.filter(a => {
      if (search) {
        const q = search.toLowerCase()
        if (!a.name.toLowerCase().includes(q) && !a.species.toLowerCase().includes(q) && !(a.morph?.toLowerCase().includes(q))) return false
      }
      if (filterStatus !== 'all' && a.status !== filterStatus) return false
      if (filterClass !== 'all' && guessClass(a.species) !== filterClass) return false
      return true
    }) ?? [],
    sort
  )

  const hasAnimals = (animals?.length ?? 0) > 0
  const resultCount = filtered.length

  return (
    <div className="min-h-full pb-24">
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Animals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{animals?.length ?? 0} total{resultCount !== (animals?.length ?? 0) ? ` · ${resultCount} shown` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <SortDropdown sort={sort} setSort={setSort} />
          <button onClick={() => navigate('/scanner')}
            className="w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-full flex items-center justify-center transition-colors"
            aria-label="Scan QR / NFC">
            <ScanLine size={18} />
          </button>
          <button onClick={() => navigate('/animals/add')}
            className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center transition-colors">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="search" placeholder="Search name, species, or morph…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      {/* Class filter */}
      <div className="flex gap-1.5 px-4 mb-2 overflow-x-auto pb-1">
        {CLASS_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilterClass(f.key)}
            className={cn('shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              filterClass === f.key ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}>
            {f.emoji && <span>{f.emoji}</span>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 px-4 mb-4 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={cn('shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              filterStatus === f.key ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4">
          {!hasAnimals ? (
            <>
              <p className="text-5xl mb-4">🦎</p>
              <p className="text-gray-200 font-semibold text-lg">No animals yet</p>
              <p className="text-gray-500 text-sm mt-1 mb-6">Start by adding your first animal.</p>
              <button onClick={() => navigate('/animals/add')}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
                Add Animal
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 font-medium">No animals match your filters.</p>
              <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterClass('all') }}
                className="text-emerald-400 text-sm mt-2">Clear filters</button>
            </>
          )}
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {filtered.map(animal => (
            <AnimalCard key={animal.id} animal={animal}
              enclosure={animal.enclosureId ? enclosureMap.get(animal.enclosureId) : undefined}
              onClick={() => navigate(`/animals/${animal.id}`)} />
          ))}
        </div>
      )}

      {hasAnimals && (
        <button onClick={() => navigate('/animals/add')}
          className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30">
          <Plus size={24} />
        </button>
      )}
    </div>
  )
}
