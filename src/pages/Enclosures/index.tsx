import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, Thermometer } from 'lucide-react'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { useAnimals } from '@/db/hooks/useAnimals'
import { daysAgo } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { Enclosure } from '@/types'

function daysSinceLabel(dateStr?: string): { label: string; urgency: string } {
  if (!dateStr) return { label: 'Never', urgency: 'text-red-400' }
  const days = daysAgo(dateStr)
  if (days < 14) return { label: `${days}d ago`, urgency: 'text-emerald-400' }
  if (days < 30) return { label: `${days}d ago`, urgency: 'text-amber-400' }
  return { label: `${days}d ago`, urgency: 'text-red-400' }
}

function bulbWarnings(enc: Enclosure): number {
  const today = new Date()
  return enc.bulbs.filter(b => {
    if (!b.replacementDueDate) return false
    return new Date(b.replacementDueDate) <= today
  }).length
}

function EnclosureCard({ enc, animalName, onClick }: { enc: Enclosure; animalName?: string; onClick: () => void }) {
  const clean = daysSinceLabel(enc.lastSubstrateClean)
  const warnings = bulbWarnings(enc)
  const dims = `${enc.dimensionsLWHcm[0]}×${enc.dimensionsLWHcm[1]}×${enc.dimensionsLWHcm[2]}cm`

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-emerald-500/40 hover:bg-gray-800 transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-100 truncate">{enc.name}</p>
          {animalName && <p className="text-xs text-emerald-400 mt-0.5">🐾 {animalName}</p>}
          {!animalName && <p className="text-xs text-gray-600 mt-0.5">Unoccupied</p>}
        </div>
        {warnings > 0 && (
          <span className="shrink-0 flex items-center gap-1 text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
            <AlertTriangle size={12} /> {warnings} bulb{warnings > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600 mb-3">{dims}</p>

      <div className="flex gap-4 text-xs">
        <div>
          <p className="text-gray-600 mb-0.5">Last clean</p>
          <p className={cn('font-medium', clean.urgency)}>{clean.label}</p>
        </div>
        {enc.temperatureZones[0] && (
          <div className="flex items-start gap-1">
            <Thermometer size={12} className="text-gray-600 mt-0.5" />
            <div>
              <p className="text-gray-600 mb-0.5">Basking</p>
              <p className="font-medium text-gray-300">{enc.temperatureZones[0].targetMax}°C</p>
            </div>
          </div>
        )}
        <div>
          <p className="text-gray-600 mb-0.5">Humidity</p>
          <p className="font-medium text-gray-300">{enc.humidityMin}–{enc.humidityMax}%</p>
        </div>
      </div>
    </button>
  )
}

export default function EnclosureList() {
  const navigate = useNavigate()
  const enclosures = useEnclosures()
  const animals = useAnimals()

  const animalMap = new Map(animals?.map(a => [a.enclosureId ?? '', a.name]) ?? [])

  return (
    <div className="min-h-full pb-4">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Enclosures</h1>
          <p className="text-sm text-gray-500 mt-0.5">{enclosures?.length ?? 0} total</p>
        </div>
        <button
          onClick={() => navigate('/enclosures/add')}
          className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {!enclosures?.length ? (
        <div className="text-center py-16 px-4">
          <p className="text-5xl mb-4">🏠</p>
          <p className="text-gray-200 font-semibold text-lg">No enclosures yet</p>
          <p className="text-gray-500 text-sm mt-1 mb-6">Add your first enclosure to track husbandry.</p>
          <button
            onClick={() => navigate('/enclosures/add')}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Add Enclosure
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {enclosures.map(enc => (
            <EnclosureCard
              key={enc.id}
              enc={enc}
              animalName={animalMap.get(enc.id)}
              onClick={() => navigate(`/enclosures/${enc.id}`)}
            />
          ))}
        </div>
      )}

      {(enclosures?.length ?? 0) > 0 && (
        <button
          onClick={() => navigate('/enclosures/add')}
          className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  )
}
