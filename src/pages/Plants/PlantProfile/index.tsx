import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2, Plus, Trash2, Star, Camera, X, RefreshCw, Check } from 'lucide-react'
import { usePlant, updatePlant, deletePlant } from '@/db/hooks/usePlants'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { timeAgo, formatDate, nowISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import CropModal from '@/components/CropModal'
import { v4 as uuidv4 } from 'uuid'
import type { Plant, PlantEvent, PlantEventType, PlantStatus, PlantType, LightNeeds, AppPhoto, Enclosure } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────
const EVENT_CONFIG: { type: PlantEventType; emoji: string; label: string; color: string }[] = [
  { type: 'watering',     emoji: '💧', label: 'Water',       color: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
  { type: 'fertilizing',  emoji: '🌿', label: 'Fertilize',   color: 'bg-green-500/20 border-green-500/40 text-green-300' },
  { type: 'pruning',      emoji: '✂️', label: 'Prune',       color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
  { type: 'repotting',    emoji: '🪴', label: 'Repot',       color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
  { type: 'propagation',  emoji: '🌱', label: 'Propagate',   color: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
  { type: 'health_check', emoji: '🏥', label: 'Health Check',color: 'bg-red-500/20 border-red-500/40 text-red-300' },
  { type: 'note',         emoji: '📝', label: 'Note',        color: 'bg-gray-500/20 border-gray-500/40 text-gray-300' },
]

const STATUS_COLORS: Record<PlantStatus, string> = {
  thriving:    'bg-emerald-500/20 text-emerald-300',
  stable:      'bg-blue-500/20 text-blue-300',
  struggling:  'bg-red-500/20 text-red-300',
  dormant:     'bg-gray-500/20 text-gray-400',
  propagating: 'bg-purple-500/20 text-purple-300',
  dead:        'bg-gray-700/50 text-gray-600',
}

const STATUS_OPTS: PlantStatus[] = ['thriving', 'stable', 'struggling', 'dormant', 'propagating', 'dead']
const LIGHT_OPTS: { value: LightNeeds; label: string }[] = [
  { value: 'low', label: 'Low light' },
  { value: 'medium', label: 'Medium' },
  { value: 'bright_indirect', label: 'Bright indirect' },
  { value: 'full_sun', label: 'Full sun' },
]
const TYPE_OPTS: { value: PlantType; label: string }[] = [
  { value: 'tropical', label: '🌿 Tropical' }, { value: 'succulent', label: '🪴 Succulent' },
  { value: 'bromeliad', label: '🌺 Bromeliad' }, { value: 'moss', label: '🌱 Moss' },
  { value: 'fern', label: '🌿 Fern' }, { value: 'carnivorous', label: '🪤 Carnivorous' },
  { value: 'aquatic', label: '💧 Aquatic' }, { value: 'epiphyte', label: '🌿 Epiphyte' },
  { value: 'vine', label: '🌿 Vine' }, { value: 'other', label: '🌱 Other' },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-500 font-medium shrink-0">{label}</span>
      {typeof value === 'string'
        ? <span className="text-sm text-gray-200 text-right capitalize">{value}</span>
        : value}
    </div>
  )
}

function daysUntilWatering(plant: Plant): number | null {
  if (!plant.wateringFrequencyDays) return null
  if (!plant.lastWatered) return 0
  const daysSince = (Date.now() - new Date(plant.lastWatered).getTime()) / 86400000
  return Math.round(plant.wateringFrequencyDays - daysSince)
}

function eventDetail(e: PlantEvent): string {
  if (e.type === 'watering' && e.soilMoisture) return `Soil was ${e.soilMoisture}`
  if (e.type === 'fertilizing' && e.fertilizerType) return e.fertilizerType
  if (e.type === 'repotting' && e.newPotSizeCm) return `${e.newPotSizeCm} cm pot`
  if (e.type === 'propagation') return `${e.propagationCount ?? 1}× ${e.propagationMethod ?? 'prop'}`
  if (e.type === 'health_check' && e.healthStatus) return e.healthStatus
  return e.notes?.slice(0, 60) ?? ''
}

// ── Log Modal ──────────────────────────────────────────────────────────────
function LogModal({ plant, onClose }: { plant: Plant; onClose: () => void }) {
  const [type, setType] = useState<PlantEventType>('watering')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [soilMoisture, setSoilMoisture] = useState<'dry' | 'moist' | 'wet' | ''>('')
  const [fertType, setFertType] = useState('')
  const [potSize, setPotSize] = useState('')
  const [propMethod, setPropMethod] = useState('')
  const [propCount, setPropCount] = useState('1')
  const [healthStatus, setHealthStatus] = useState<PlantStatus>('stable')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const newEvent: PlantEvent = {
      id: uuidv4(),
      type,
      occurredAt: new Date(date).toISOString(),
      createdAt: nowISO(),
      notes: notes || undefined,
      ...(type === 'watering' && soilMoisture ? { soilMoisture: soilMoisture as 'dry' | 'moist' | 'wet' } : {}),
      ...(type === 'fertilizing' && fertType ? { fertilizerType: fertType } : {}),
      ...(type === 'repotting' && potSize ? { newPotSizeCm: parseInt(potSize) } : {}),
      ...(type === 'propagation' ? {
        propagationMethod: propMethod as PlantEvent['propagationMethod'] || undefined,
        propagationCount: parseInt(propCount) || 1,
      } : {}),
      ...(type === 'health_check' ? { healthStatus } : {}),
    }
    const updates: Partial<Plant> = { events: [newEvent, ...(plant.events ?? [])] }
    if (type === 'watering') updates.lastWatered = newEvent.occurredAt
    if (type === 'propagation') updates.propagationsCount = (plant.propagationsCount ?? 0) + (parseInt(propCount) || 1)
    if (type === 'health_check') updates.status = healthStatus
    await updatePlant(plant.id, updates)
    onClose()
  }

  const inp = 'w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-gray-900 rounded-t-2xl border-t border-gray-800 p-4 pb-8 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-100">Log Care Event</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-4 gap-1.5">
          {EVENT_CONFIG.map(c => (
            <button key={c.type} onClick={() => setType(c.type)}
              className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all',
                type === c.type ? c.color : 'border-gray-700 text-gray-500 hover:border-gray-600'
              )}>
              <span className="text-lg">{c.emoji}</span>
              <span className="text-center leading-tight">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Date &amp; time</label>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className={inp} />
        </div>

        {/* Type-specific fields */}
        {type === 'watering' && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Soil before watering</label>
            <div className="flex gap-2">
              {(['dry', 'moist', 'wet'] as const).map(m => (
                <button key={m} onClick={() => setSoilMoisture(soilMoisture === m ? '' : m)}
                  className={cn('flex-1 py-1.5 rounded-lg text-sm capitalize border transition-all',
                    soilMoisture === m ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'border-gray-700 text-gray-500'
                  )}>{m}</button>
              ))}
            </div>
          </div>
        )}

        {type === 'fertilizing' && (
          <input value={fertType} onChange={e => setFertType(e.target.value)}
            placeholder="Fertilizer (e.g. 10-10-10, seaweed, fish emulsion)" className={inp} />
        )}

        {type === 'repotting' && (
          <input value={potSize} onChange={e => setPotSize(e.target.value)} type="number" min="1"
            placeholder="New pot diameter (cm)" className={inp} />
        )}

        {type === 'propagation' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Method</label>
              <div className="grid grid-cols-4 gap-1">
                {(['cutting', 'division', 'offset', 'seed'] as const).map(m => (
                  <button key={m} onClick={() => setPropMethod(propMethod === m ? '' : m)}
                    className={cn('py-1.5 rounded-lg text-xs capitalize border transition-all',
                      propMethod === m ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'border-gray-700 text-gray-500'
                    )}>{m}</button>
                ))}
              </div>
            </div>
            <input value={propCount} onChange={e => setPropCount(e.target.value)} type="number" min="1"
              placeholder="Number of props" className={inp} />
          </div>
        )}

        {type === 'health_check' && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Current health</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STATUS_OPTS.map(s => (
                <button key={s} onClick={() => setHealthStatus(s)}
                  className={cn('py-1.5 rounded-lg text-xs capitalize border transition-all',
                    healthStatus === s ? STATUS_COLORS[s] + ' border-current' : 'border-gray-700 text-gray-500'
                  )}>{s}</button>
              ))}
            </div>
          </div>
        )}

        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Notes (optional)"
          className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" />

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-800 text-gray-400 text-sm rounded-xl">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function EditModal({ plant, enclosures, onClose }: { plant: Plant; enclosures: Enclosure[]; onClose: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState(plant.name)
  const [species, setSpecies] = useState(plant.species)
  const [variety, setVariety] = useState(plant.variety ?? '')
  const [type, setType] = useState<PlantType>(plant.type)
  const [light, setLight] = useState<LightNeeds>(plant.lightNeeds)
  const [status, setStatus] = useState<PlantStatus>(plant.status)
  const [waterDays, setWaterDays] = useState(plant.wateringFrequencyDays?.toString() ?? '')
  const [enclosureId, setEnclosureId] = useState(plant.enclosureId ?? '')
  const [acquisitionDate, setAcquisitionDate] = useState(plant.acquisitionDate ?? '')
  const [animalSafe, setAnimalSafe] = useState(plant.animalSafe)
  const [notes, setNotes] = useState(plant.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const inp = 'w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none'

  const handleSave = async () => {
    if (!name) return
    setSaving(true)
    await updatePlant(plant.id, {
      name, species: species || name, variety: variety || undefined, type, lightNeeds: light,
      status, wateringFrequencyDays: waterDays ? parseInt(waterDays) : undefined,
      enclosureId: enclosureId || undefined, acquisitionDate: acquisitionDate || undefined,
      animalSafe, notes: notes || undefined,
    })
    onClose()
  }

  const handleDelete = async () => {
    await deletePlant(plant.id)
    navigate('/plants')
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-safe pt-6 pb-4 border-b border-gray-800">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
        <h2 className="font-semibold text-gray-100">Edit Plant</h2>
        <button onClick={handleSave} disabled={!name || saving}
          className="text-green-400 font-semibold text-sm disabled:opacity-40">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nickname" className={inp} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Botanical name</label>
          <input value={species} onChange={e => setSpecies(e.target.value)} placeholder="e.g. Epipremnum aureum" className={inp} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Variety / cultivar</label>
          <input value={variety} onChange={e => setVariety(e.target.value)} placeholder="Optional" className={inp} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Type</label>
            <select value={type} onChange={e => setType(e.target.value as PlantType)} className={inp}>
              {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Light</label>
            <select value={light} onChange={e => setLight(e.target.value as LightNeeds)} className={inp}>
              {LIGHT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <div className="grid grid-cols-3 gap-1.5">
            {STATUS_OPTS.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={cn('py-1.5 rounded-lg text-xs capitalize border transition-all flex items-center justify-center gap-1',
                  status === s ? STATUS_COLORS[s] + ' border-current' : 'border-gray-700 text-gray-500'
                )}>
                {status === s && <Check size={10} />}{s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Water every (days)</label>
          <input value={waterDays} onChange={e => setWaterDays(e.target.value)} type="number" min="1"
            placeholder="e.g. 7" className={inp} />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Enclosure</label>
          <select value={enclosureId} onChange={e => setEnclosureId(e.target.value)} className={inp}>
            <option value="">No enclosure</option>
            {enclosures.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Acquisition date</label>
          <input value={acquisitionDate} onChange={e => setAcquisitionDate(e.target.value)} type="date"
            className={inp} />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Animal safe</label>
          <div className="flex gap-2">
            {[{ val: true, label: '✓ Safe' }, { val: false, label: '✗ Caution' }, { val: undefined, label: 'Unknown' }].map(opt => (
              <button key={String(opt.val)} onClick={() => setAnimalSafe(opt.val)}
                className={cn('flex-1 py-1.5 rounded-lg text-xs border transition-all',
                  animalSafe === opt.val
                    ? opt.val === true ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : opt.val === false ? 'bg-red-500/20 border-red-500/40 text-red-300'
                      : 'bg-gray-500/20 border-gray-500/40 text-gray-300'
                    : 'border-gray-700 text-gray-500'
                )}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Optional" className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        </div>

        {/* Delete */}
        <div className="pt-4 border-t border-gray-800">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 border border-red-500/30 text-red-400 text-sm rounded-xl hover:bg-red-500/10 transition-colors">
              Delete Plant
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 text-center">This will permanently delete this plant and all its logs.</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl">
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-400 text-sm rounded-xl">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab({ plant, enclosures }: { plant: Plant; enclosures: Enclosure[] }) {
  const navigate = useNavigate()
  const enclosure = enclosures.find(e => e.id === plant.enclosureId)
  const due = daysUntilWatering(plant)
  const wateringEvents = (plant.events ?? []).filter(e => e.type === 'watering').length
  const fertilizingEvents = (plant.events ?? []).filter(e => e.type === 'fertilizing').length

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <Row label="Type" value={plant.type.replace(/_/g, ' ')} />
        {plant.variety && <Row label="Variety" value={plant.variety} />}
        <Row label="Light" value={plant.lightNeeds.replace(/_/g, ' ')} />
        {enclosure && (
          <Row label="Enclosure" value={
            <button onClick={() => navigate(`/enclosures/${enclosure.id}`)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              {enclosure.name}
            </button>
          } />
        )}
        {plant.acquisitionDate && <Row label="Acquired" value={formatDate(plant.acquisitionDate)} />}
        {plant.animalSafe !== undefined && (
          <Row label="Animal safe" value={
            <span className={plant.animalSafe ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>
              {plant.animalSafe ? '✓ Yes' : '✗ Caution'}
            </span>
          } />
        )}
      </div>

      {plant.wateringFrequencyDays && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Watering</p>
          <Row label="Last watered" value={plant.lastWatered ? timeAgo(plant.lastWatered) : 'Never'} />
          <Row label="Frequency" value={`Every ${plant.wateringFrequencyDays} days`} />
          {due !== null && (
            <Row label="Next due" value={
              <span className={cn('text-sm font-medium', due <= 0 ? 'text-blue-400' : 'text-gray-200')}>
                {due <= 0 ? 'Now!' : `in ${due} day${due === 1 ? '' : 's'}`}
              </span>
            } />
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{wateringEvents}</p>
          <p className="text-xs text-gray-500 mt-0.5">Waterings</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{fertilizingEvents}</p>
          <p className="text-xs text-gray-500 mt-0.5">Fertilized</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-400">{plant.propagationsCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Props</p>
        </div>
      </div>

      {plant.notes && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-gray-300 leading-relaxed">{plant.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Log Tab ────────────────────────────────────────────────────────────────
function LogTab({ plant, onAdd }: { plant: Plant; onAdd: () => void }) {
  const events = [...(plant.events ?? [])].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )

  const handleDelete = async (id: string) => {
    const remaining = (plant.events ?? []).filter(e => e.id !== id)
    await updatePlant(plant.id, { events: remaining })
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🌿</p>
        <p className="text-gray-400 font-medium">No care events yet</p>
        <p className="text-gray-600 text-sm mt-1">Track waterings, fertilizing, propagations &amp; more</p>
        <button onClick={onAdd}
          className="mt-6 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors">
          Log first event
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map(event => {
        const cfg = EVENT_CONFIG.find(c => c.type === event.type)
        const detail = eventDetail(event)
        const secondLine = event.notes && event.notes !== detail ? event.notes : undefined

        return (
          <div key={event.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">{cfg?.emoji ?? '📋'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-200 capitalize">
                  {event.type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-600 shrink-0">{timeAgo(event.occurredAt)}</p>
              </div>
              {detail && <p className="text-xs text-gray-500 mt-0.5 capitalize">{detail}</p>}
              {secondLine && <p className="text-xs text-gray-600 mt-0.5 truncate">{secondLine}</p>}
            </div>
            <button onClick={() => handleDelete(event.id)}
              className="text-gray-700 hover:text-red-400 shrink-0 transition-colors p-0.5">
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Photos Tab ─────────────────────────────────────────────────────────────
function PhotosTab({ plant }: { plant: Plant }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<'gallery' | 'thumbnail'>('gallery')
  const [viewPhoto, setViewPhoto] = useState<AppPhoto | 'thumbnail' | null>(null)

  const pickFile = (target: 'gallery' | 'thumbnail') => {
    setCropTarget(target)
    fileRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleCropConfirm = async (base64: string) => {
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    if (cropTarget === 'thumbnail') {
      await updatePlant(plant.id, { thumbnailBase64: base64 })
    } else {
      const photo: AppPhoto = { id: uuidv4(), base64, takenAt: nowISO(), createdAt: nowISO() }
      await updatePlant(plant.id, { photos: [...(plant.photos ?? []), photo] })
    }
  }

  const handleCropCancel = () => {
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  const handleDeletePhoto = async (id: string) => {
    await updatePlant(plant.id, { photos: (plant.photos ?? []).filter(p => p.id !== id) })
    setViewPhoto(null)
  }

  const handleDeleteThumb = async () => {
    await updatePlant(plant.id, { thumbnailBase64: undefined })
    setViewPhoto(null)
  }

  const handleRecropThumb = () => {
    if (!plant.thumbnailBase64) return
    setCropTarget('thumbnail')
    setCropSrc(plant.thumbnailBase64)
    setViewPhoto(null)
  }

  return (
    <div>
      {cropSrc && <CropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}

      {/* Photo viewer */}
      {viewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between p-4 pt-12">
            <button onClick={() => setViewPhoto(null)} className="text-white p-1"><X size={24} /></button>
            <div className="flex items-center gap-4">
              {viewPhoto === 'thumbnail' && (
                <button onClick={handleRecropThumb}
                  className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
                  <RefreshCw size={15} /> Recrop
                </button>
              )}
              <button
                onClick={() => viewPhoto === 'thumbnail' ? handleDeleteThumb() : handleDeletePhoto((viewPhoto as AppPhoto).id)}
                className="text-red-400 hover:text-red-300 p-1 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={viewPhoto === 'thumbnail' ? plant.thumbnailBase64! : (viewPhoto as AppPhoto).base64}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
          {viewPhoto === 'thumbnail' && (
            <p className="text-center text-xs text-yellow-400 pb-8">⭐ Profile photo</p>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div className="grid grid-cols-3 gap-1.5">
        {/* Add button */}
        <button onClick={() => pickFile('gallery')}
          className="aspect-square bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center text-gray-600 hover:text-green-500 hover:border-green-700 transition-colors">
          <Plus size={28} />
        </button>

        {/* Profile thumbnail */}
        {plant.thumbnailBase64 && (
          <button className="relative aspect-square rounded-xl overflow-hidden" onClick={() => setViewPhoto('thumbnail')}>
            <img src={plant.thumbnailBase64} className="w-full h-full object-cover" />
            <div className="absolute top-1 right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
              <Star size={10} className="text-white fill-white" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5">
              <p className="text-center text-[10px] text-white">Profile</p>
            </div>
          </button>
        )}

        {/* Gallery photos */}
        {(plant.photos ?? []).map(photo => (
          <button key={photo.id} className="relative aspect-square rounded-xl overflow-hidden" onClick={() => setViewPhoto(photo)}>
            <img src={photo.base64} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {!plant.thumbnailBase64 && (
        <button onClick={() => pickFile('thumbnail')}
          className="mt-3 w-full py-2.5 border border-dashed border-gray-700 text-gray-500 text-sm rounded-xl flex items-center justify-center gap-2 hover:border-gray-600 hover:text-gray-400 transition-colors">
          <Camera size={14} /> Set profile photo
        </button>
      )}
    </div>
  )
}

// ── Main Profile ───────────────────────────────────────────────────────────
export default function PlantProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const plant = usePlant(id)
  const enclosures = useEnclosures()

  const [activeTab, setActiveTab] = useState<'overview' | 'log' | 'photos'>('overview')
  const [showLog, setShowLog] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  if (plant === undefined) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const eventCount = (plant.events ?? []).length
  const photoCount = (plant.photos ?? []).length + (plant.thumbnailBase64 ? 1 : 0)

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'log' as const, label: `Log${eventCount > 0 ? ` (${eventCount})` : ''}` },
    { key: 'photos' as const, label: `Photos${photoCount > 0 ? ` (${photoCount})` : ''}` },
  ]

  return (
    <div className="min-h-full pb-28">
      {showLog && <LogModal plant={plant} onClose={() => setShowLog(false)} />}
      {showEdit && <EditModal plant={plant} enclosures={enclosures ?? []} onClose={() => setShowEdit(false)} />}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2">
        <button onClick={() => navigate('/plants')} className="text-gray-400 hover:text-gray-200 p-1 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-xl shrink-0 overflow-hidden">
            {plant.thumbnailBase64
              ? <img src={plant.thumbnailBase64} className="w-full h-full object-cover" />
              : '🌿'}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-100 truncate">{plant.name}</h1>
            <p className="text-sm text-gray-500 italic truncate">{plant.species !== plant.name ? plant.species : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowEdit(true)} className="text-gray-500 hover:text-gray-200 p-2 transition-colors">
          <Edit2 size={18} />
        </button>
      </div>

      {/* Status + variety */}
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLORS[plant.status])}>
          {plant.status}
        </span>
        {plant.variety && <span className="text-xs text-emerald-400">{plant.variety}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeTab === t.key ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4">
        {activeTab === 'overview' && <OverviewTab plant={plant} enclosures={enclosures ?? []} />}
        {activeTab === 'log' && <LogTab plant={plant} onAdd={() => setShowLog(true)} />}
        {activeTab === 'photos' && <PhotosTab plant={plant} />}
      </div>

      {/* FAB */}
      {activeTab !== 'photos' && (
        <button onClick={() => setShowLog(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30">
          <Plus size={24} />
        </button>
      )}
    </div>
  )
}
