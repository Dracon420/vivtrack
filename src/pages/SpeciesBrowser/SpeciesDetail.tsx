import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { getSpeciesById, careLevelColor } from '@/utils/species'
import type { SpeciesTemplate } from '@/types'
import { cn } from '@/lib/utils'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 font-medium shrink-0">{label}</span>
      {typeof value === 'string'
        ? <span className="text-sm text-gray-200 text-right">{value}</span>
        : <div className="text-right">{value}</div>}
    </div>
  )
}

export default function SpeciesDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [species, setSpecies] = useState<SpeciesTemplate | null>(null)

  useEffect(() => {
    if (id) getSpeciesById(id).then(s => setSpecies(s ?? null))
  }, [id])

  if (!species) return <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>

  const { temperature: t, humidity: h, lighting: l, enclosure: e, feeding: f } = species

  return (
    <div className="min-h-full pb-24">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-200 p-1"><ArrowLeft size={22} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-100 truncate">{species.commonName}</h1>
          <p className="text-xs text-gray-500 italic">{species.scientificName}</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Overview */}
        <div className="flex gap-3">
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className={cn('text-sm font-bold capitalize', careLevelColor(species.careLevel))}>{species.careLevel}</p>
            <p className="text-xs text-gray-600 mt-0.5">Care level</p>
          </div>
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-gray-100">{species.lifespanYears[0]}–{species.lifespanYears[1]}y</p>
            <p className="text-xs text-gray-600 mt-0.5">Lifespan</p>
          </div>
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-gray-100 capitalize">{species.handlingTemperament}</p>
            <p className="text-xs text-gray-600 mt-0.5">Temperament</p>
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">🌡️ Temperature Requirements</p>
          <InfoRow label="Cool Side" value={`${t.coolSideCelsius[0]}–${t.coolSideCelsius[1]}°C`} />
          <InfoRow label="Warm Side" value={`${t.warmSideCelsius[0]}–${t.warmSideCelsius[1]}°C`} />
          {t.baskingCelsius && <InfoRow label="Basking" value={`${t.baskingCelsius[0]}–${t.baskingCelsius[1]}°C`} />}
          {t.nightDropCelsius !== undefined && <InfoRow label="Night Drop" value={`${t.nightDropCelsius}°C lower`} />}
        </div>

        {/* Humidity */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">💧 Humidity</p>
          <InfoRow label="Range" value={`${h.min}–${h.max}%`} />
          {h.mistingFrequency && <InfoRow label="Misting" value={h.mistingFrequency} />}
        </div>

        {/* Lighting */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">☀️ Lighting</p>
          <InfoRow label="UVB Required" value={l.uvbRequired ? `Yes — ${l.uvbStrength ?? ''} (${l.uvbBulbType ?? 'check spec'})` : 'Not required'} />
          <InfoRow label="Photoperiod" value={`${l.photoperiodHours} hours`} />
          <InfoRow label="Seasonal Variation" value={l.seasonalVariation ? 'Yes' : 'No'} />
          <InfoRow label="Basking Spot" value={l.basking ? 'Required' : 'Not required'} />
        </div>

        {/* Enclosure */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">🏠 Enclosure</p>
          <InfoRow label="Min Size" value={`${e.minimumSizeCm.join(' × ')} cm`} />
          <InfoRow label="Style" value={e.preferredStyle.replace(/_/g, ' ')} />
          <InfoRow label="Ventilation" value={e.ventilation.replace(/_/g, ' ')} />
        </div>

        {/* Feeding */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">🍖 Feeding</p>
          <InfoRow label="Frequency" value={`Every ${f.frequencyDays} day(s)`} />
          {f.juvenileFrequencyDays && <InfoRow label="Juvenile Frequency" value={`Every ${f.juvenileFrequencyDays} day(s)`} />}
          <div className="flex justify-between items-start gap-4 py-2">
            <span className="text-xs text-gray-500 font-medium shrink-0">Typical Foods</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {f.itemsTypical.map(item => (
                <span key={item} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{item}</span>
              ))}
            </div>
          </div>
          {f.feedingNotes && <p className="text-xs text-gray-600 mt-2 italic">{f.feedingNotes}</p>}
        </div>

        {/* Substrate options */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">🪵 Substrate Options</p>
          <div className="space-y-2">
            {species.substrateOptions.map((s, i) => (
              <div key={i} className="flex justify-between items-start gap-2">
                <span className="text-sm text-gray-300 capitalize">{s.type.replace(/_/g, ' ')}</span>
                {s.notes && <span className="text-xs text-gray-600 text-right">{s.notes}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Health issues */}
        {species.commonHealthIssues && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">🏥 Common Health Issues</p>
            <div className="flex flex-wrap gap-2">
              {species.commonHealthIssues.map(issue => (
                <span key={issue} className="text-xs bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded-full">{issue}</span>
              ))}
            </div>
          </div>
        )}

        {/* Special notes */}
        {species.specialNotes && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-2">⚠️ Special Notes</p>
            <ul className="space-y-1">
              {species.specialNotes.map((n, i) => <li key={i} className="text-sm text-amber-200/70">{n}</li>)}
            </ul>
          </div>
        )}

        <button
          onClick={() => navigate(`/animals/add`)}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} /> Add a {species.commonName}
        </button>
      </div>
    </div>
  )
}
