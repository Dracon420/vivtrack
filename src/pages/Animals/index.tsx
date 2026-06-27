import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Home } from 'lucide-react'
import { useAnimals } from '@/db/hooks/useAnimals'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { timeAgo } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { Animal, Enclosure } from '@/types'

const statusColors: Record<Animal['status'], string> = {
  active: 'bg-emerald-500/20 text-emerald-300',
  quarantine: 'bg-amber-500/20 text-amber-300',
  brumation: 'bg-blue-500/20 text-blue-300',
  deceased: 'bg-gray-500/20 text-gray-400',
  rehomed: 'bg-purple-500/20 text-purple-300',
}

const classEmoji: Record<string, string> = {
  snake: '🐍', lizard: '🦎', chelonian: '🐢', frog: '🐸',
  salamander: '🦎', tarantula: '🕷️', scorpion: '🦂', myriapod: '🐛',
  insect: '🦗', marsupial: '🦔', rodent: '🐹', mustelid: '🦡',
  psittacine: '🦜', softbill: '🐦', gastropod: '🐌',
}

function getAnimalEmoji(species: string): string {
  const low = species.toLowerCase()
  for (const [key, emoji] of Object.entries(classEmoji)) {
    if (low.includes(key)) return emoji
  }
  if (low.includes('python') || low.includes('boa') || low.includes('snake') || low.includes('corn') || low.includes('king')) return '🐍'
  if (low.includes('gecko') || low.includes('dragon') || low.includes('skink') || low.includes('iguana') || low.includes('monitor') || low.includes('tegu')) return '🦎'
  if (low.includes('tortoise') || low.includes('turtle')) return '🐢'
  if (low.includes('frog') || low.includes('toad')) return '🐸'
  if (low.includes('tarantula')) return '🕷️'
  if (low.includes('scorpion')) return '🦂'
  if (low.includes('hedgehog')) return '🦔'
  if (low.includes('chinchilla') || low.includes('degu') || low.includes('prairie')) return '🐹'
  if (low.includes('ferret')) return '🦡'
  if (low.includes('parrot') || low.includes('conure') || low.includes('cockatiel')) return '🦜'
  return '🐾'
}

type FilterStatus = 'all' | Animal['status']

function AnimalCard({ animal, enclosure, onClick }: { animal: Animal; enclosure?: Enclosure; onClick: () => void }) {
  const navigate = useNavigate()
  const emoji = getAnimalEmoji(animal.species)
  const age = animal.dateOfBirth
    ? Math.floor((Date.now() - new Date(animal.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left hover:border-emerald-500/40 hover:bg-gray-800 transition-all active:scale-95 cursor-pointer"
    >
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
          <button
            onClick={e => { e.stopPropagation(); navigate(`/enclosures/${enclosure.id}`) }}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-0.5 max-w-full"
          >
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

  const enclosureMap = new Map(enclosures?.map(e => [e.id, e]) ?? [])

  const filtered = animals?.filter(a => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.species.toLowerCase().includes(search.toLowerCase()) ||
      (a.morph?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  }) ?? []

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'quarantine', label: 'Quarantine' },
    { key: 'brumation', label: 'Brumation' },
  ]

  return (
    <div className="min-h-full pb-4">
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Animals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{animals?.length ?? 0} total</p>
        </div>
        <button
          onClick={() => navigate('/animals/add')}
          className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="px-4 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            placeholder="Search by name, species, or morph..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      <div className="px-4 flex gap-2 mb-4 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors',
              filterStatus === f.key ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4">
          {animals?.length === 0 ? (
            <>
              <p className="text-5xl mb-4">🦎</p>
              <p className="text-gray-200 font-semibold text-lg">No animals yet</p>
              <p className="text-gray-500 text-sm mt-1 mb-6">Start by adding your first animal.</p>
              <button
                onClick={() => navigate('/animals/add')}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                Add Animal
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 font-medium">No animals match your search.</p>
              <button onClick={() => { setSearch(''); setFilterStatus('all') }} className="text-emerald-400 text-sm mt-2">Clear filters</button>
            </>
          )}
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {filtered.map(animal => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              enclosure={animal.enclosureId ? enclosureMap.get(animal.enclosureId) : undefined}
              onClick={() => navigate(`/animals/${animal.id}`)}
            />
          ))}
        </div>
      )}

      {(animals?.length ?? 0) > 0 && (
        <button
          onClick={() => navigate('/animals/add')}
          className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  )
}
