import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check } from 'lucide-react'
import { useAnimal } from '@/db/hooks/useAnimals'
import { addCareEvent } from '@/db/hooks/useCareEvents'
import { useFeederColonies, updateFeederColony, addColonyLogEvent } from '@/db/hooks/useColonies'
import { nowISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { CareEventType, FeedingResult, ShedResult } from '@/types'

const EVENT_TYPES: { type: CareEventType; label: string; emoji: string; color: string }[] = [
  { type: 'feeding',       label: 'Feeding',   emoji: '🍖', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
  { type: 'misting',       label: 'Misting',   emoji: '💧', color: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
  { type: 'watering',      label: 'Watering',  emoji: '🫙', color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' },
  { type: 'substrate_clean', label: 'Spot Clean', emoji: '🧹', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
  { type: 'full_clean',    label: 'Full Clean', emoji: '✨', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
  { type: 'shed',          label: 'Shed',      emoji: '🔄', color: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
  { type: 'weight',        label: 'Weight',    emoji: '⚖️', color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
  { type: 'handling',      label: 'Handling',  emoji: '🤝', color: 'bg-pink-500/20 border-pink-500/40 text-pink-300' },
  { type: 'note',          label: 'Note',      emoji: '📝', color: 'bg-gray-500/20 border-gray-500/40 text-gray-300' },
  { type: 'temperature_check', label: 'Temp Check', emoji: '🌡️', color: 'bg-red-500/20 border-red-500/40 text-red-300' },
  { type: 'humidity_check', label: 'Humidity', emoji: '☁️', color: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
]

const schema = z.object({
  occurredAt: z.string().min(1),
  notes: z.string().optional(),
  feedingItem: z.string().optional(),
  feedingResult: z.enum(['accepted','refused','partial','regurgitated']).optional(),
  feedingPreyFrozenThawed: z.boolean().optional(),
  feedingQuantity: z.coerce.number().optional(),
  weightGrams: z.coerce.number().positive().optional(),
  shedResult: z.enum(['complete','partial','stuck_shed','assisted']).optional(),
  handlingDurationMinutes: z.coerce.number().optional(),
  humidityAfter: z.coerce.number().optional(),
})

type FormValues = z.infer<typeof schema>

export default function QuickLog() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const animal = useAnimal(id)

  const defaultType = (searchParams.get('type') as CareEventType) ?? 'feeding'
  const [eventType, setEventType] = useState<CareEventType>(defaultType)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedColonyId, setSelectedColonyId] = useState('')

  const feeders = useFeederColonies()
  const liveColonies = feeders?.filter(c => c.type !== 'frozen_prey') ?? []
  const frozenItems = feeders?.filter(c => c.type === 'frozen_prey') ?? []

  const now = new Date()
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { occurredAt: localNow },
  })

  const onSubmit = async (data: FormValues) => {
    if (!id) return
    setSaving(true)
    try {
      await addCareEvent({
        animalId: id,
        type: eventType,
        occurredAt: new Date(data.occurredAt).toISOString(),
        notes: data.notes,
        feedingItem: data.feedingItem,
        feedingResult: data.feedingResult as FeedingResult | undefined,
        feedingPreyFrozenThawed: data.feedingPreyFrozenThawed,
        feedingQuantity: data.feedingQuantity,
        weightGrams: data.weightGrams,
        shedResult: data.shedResult as ShedResult | undefined,
        handlingDurationMinutes: data.handlingDurationMinutes,
        humidityAfter: data.humidityAfter,
      })

      if (eventType === 'feeding' && selectedColonyId) {
        const colony = feeders?.find(c => c.id === selectedColonyId)
        if (colony) {
          const qty = data.feedingQuantity ?? 1
          const newCount = Math.max(0, (colony.estimatedCount ?? 0) - qty)
          await updateFeederColony(selectedColonyId, { estimatedCount: newCount })
          await addColonyLogEvent({
            colonyId: selectedColonyId,
            colonyType: 'feeder',
            eventType: 'harvest',
            occurredAt: new Date(data.occurredAt).toISOString(),
            harvestQuantity: qty,
            countAfter: newCount,
          })
        }
      }

      setSaved(true)
      setTimeout(() => navigate(`/animals/${id}`), 600)
    } finally {
      setSaving(false)
    }
  }

  if (!animal) return null

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-200 p-1">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-100">Log Event</h1>
          <p className="text-sm text-gray-400">{animal.name}</p>
        </div>
      </div>

      {/* Event type selector */}
      <div className="px-4 mb-5">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Event Type</p>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_TYPES.map(et => (
            <button
              key={et.type}
              onClick={() => setEventType(et.type)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all',
                eventType === et.type
                  ? et.color + ' ring-1 ring-current'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'
              )}
            >
              <span className="text-lg">{et.emoji}</span>
              <span>{et.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-4">
        {/* Date/time */}
        <div>
          <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">When</label>
          <input
            type="datetime-local"
            {...register('occurredAt')}
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Feeding fields */}
        {eventType === 'feeding' && (
          <>
            {(liveColonies.length > 0 || frozenItems.length > 0) && (
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">From Colony</label>
                <select
                  value={selectedColonyId}
                  onChange={e => {
                    const cid = e.target.value
                    setSelectedColonyId(cid)
                    if (cid) {
                      const colony = feeders?.find(c => c.id === cid)
                      if (colony) setValue('feedingItem', colony.name)
                    }
                  }}
                  className="input-field"
                >
                  <option value="">None (manual entry)</option>
                  {liveColonies.length > 0 && (
                    <optgroup label="Live Feeders">
                      {liveColonies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.estimatedCount !== undefined ? ` (${c.estimatedCount})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {frozenItems.length > 0 && (
                    <optgroup label="Frozen Prey">
                      {frozenItems.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.estimatedCount !== undefined ? ` (${c.estimatedCount})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {selectedColonyId && (() => {
                  const col = feeders?.find(c => c.id === selectedColonyId)
                  return col ? <p className="text-xs text-emerald-400 mt-1">Stock will be reduced by the quantity logged.</p> : null
                })()}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">Prey / Food Item</label>
              <input type="text" placeholder="e.g. Medium rat, Large dubia x5" {...register('feedingItem')} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">Quantity</label>
                <input type="number" min="1" placeholder="1" {...register('feedingQuantity')} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">Result</label>
                <select {...register('feedingResult')} className="input-field">
                  <option value="">Select...</option>
                  <option value="accepted">✅ Accepted</option>
                  <option value="refused">❌ Refused</option>
                  <option value="partial">🔶 Partial</option>
                  <option value="regurgitated">⚠️ Regurgitated</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" {...register('feedingPreyFrozenThawed')} className="w-4 h-4 rounded accent-emerald-500" />
              Frozen/thawed prey
            </label>
          </>
        )}

        {/* Weight fields */}
        {eventType === 'weight' && (
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">Weight (grams)</label>
            <input type="number" min="0.1" step="0.1" placeholder="0.0" {...register('weightGrams')} className="input-field text-lg font-semibold" />
            {errors.weightGrams && <p className="text-red-400 text-xs mt-1">Enter a valid weight</p>}
          </div>
        )}

        {/* Shed fields */}
        {eventType === 'shed' && (
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">Shed Result</label>
            <select {...register('shedResult')} className="input-field">
              <option value="">Select...</option>
              <option value="complete">✅ Complete shed</option>
              <option value="partial">🔶 Partial shed</option>
              <option value="stuck_shed">⚠️ Stuck shed</option>
              <option value="assisted">🤝 Assisted</option>
            </select>
          </div>
        )}

        {/* Handling fields */}
        {eventType === 'handling' && (
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">Duration (minutes)</label>
            <input type="number" min="1" placeholder="15" {...register('handlingDurationMinutes')} className="input-field" />
          </div>
        )}

        {/* Humidity check */}
        {eventType === 'humidity_check' && (
          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">Humidity (%)</label>
            <input type="number" min="0" max="100" placeholder="65" {...register('humidityAfter')} className="input-field" />
          </div>
        )}

        {/* Notes (always shown) */}
        <div>
          <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1.5">Notes</label>
          <textarea
            rows={3}
            placeholder="Optional notes..."
            {...register('notes')}
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || saved}
          className={cn(
            'w-full py-3.5 rounded-xl font-semibold text-sm transition-all',
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-60'
          )}
        >
          {saved ? (
            <span className="flex items-center justify-center gap-2"><Check size={18} /> Logged!</span>
          ) : saving ? 'Saving...' : 'Save Log Entry'}
        </button>
      </form>

      <style>{`.input-field { width: 100%; background: #111827; border: 1px solid #1f2937; color: #f3f4f6; border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem; outline: none; } .input-field:focus { border-color: rgba(16,185,129,0.5); } select.input-field option { background: #111827; }`}</style>
    </div>
  )
}
