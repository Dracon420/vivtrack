import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import { loadSpecies, careLevelColor } from '@/utils/species'
import type { SpeciesTemplate } from '@/types'
import { cn } from '@/lib/utils'

const classEmoji: Record<SpeciesTemplate['animalClass'], string> = {
  reptile: '🦎', amphibian: '🐸', invertebrate: '🕷️', mammal: '🐹', bird: '🦜', fish: '🐠',
}

export default function SpeciesBrowser() {
  const navigate = useNavigate()
  const [species, setSpecies] = useState<SpeciesTemplate[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<SpeciesTemplate['animalClass'] | 'all'>('all')

  useEffect(() => { loadSpecies().then(setSpecies) }, [])

  const filtered = species.filter(s => {
    const matchSearch = !search ||
      s.commonName.toLowerCase().includes(search.toLowerCase()) ||
      s.scientificName.toLowerCase().includes(search.toLowerCase()) ||
      s.alternateNames?.some(n => n.toLowerCase().includes(search.toLowerCase()))
    const matchFilter = filter === 'all' || s.animalClass === filter
    return matchSearch && matchFilter
  })

  const classes: { key: SpeciesTemplate['animalClass'] | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'reptile', label: '🦎 Reptile' },
    { key: 'amphibian', label: '🐸 Amphibian' },
    { key: 'invertebrate', label: '🕷️ Invert' },
    { key: 'mammal', label: '🐹 Mammal' },
    { key: 'bird', label: '🦜 Bird' },
  ]

  return (
    <div className="min-h-full pb-4">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-gray-100">Species Browser</h1>
        <p className="text-sm text-gray-500 mt-0.5">{species.length} species with care data</p>
      </div>

      <div className="px-4 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            placeholder="Search species..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <div className="px-4 flex gap-2 mb-4 overflow-x-auto pb-1">
        {classes.map(c => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors',
              filter === c.key ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-2">
        {filtered.map(s => (
          <button
            key={s.id}
            onClick={() => navigate(`/species/${s.id}`)}
            className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:border-emerald-500/40 hover:bg-gray-800 transition-all"
          >
            <span className="text-2xl shrink-0">{classEmoji[s.animalClass]}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-100 truncate">{s.commonName}</p>
              <p className="text-xs text-gray-500 italic truncate">{s.scientificName}</p>
              <div className="flex gap-2 mt-1">
                <span className={cn('text-xs font-medium capitalize', careLevelColor(s.careLevel))}>{s.careLevel}</span>
                <span className="text-gray-700 text-xs">•</span>
                <span className="text-xs text-gray-600">{s.lifespanYears[0]}–{s.lifespanYears[1]}y lifespan</span>
              </div>
            </div>
            <ArrowRight size={16} className="text-gray-600 shrink-0" />
          </button>
        ))}
        {filtered.length === 0 && species.length > 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No species match your search.</p>
        )}
        {species.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
