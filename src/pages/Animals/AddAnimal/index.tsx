import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Plus, Search, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addAnimal, saveCareSchedule } from '@/db/hooks/useAnimals'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { loadSpecies } from '@/utils/species'
import { todayISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { SpeciesTemplate } from '@/types'

const infoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  morph: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']),
  dateOfBirth: z.string().optional(),
  acquisitionDate: z.string().min(1),
  acquisitionSource: z.string().optional(),
  notes: z.string().optional(),
})
const scheduleSchema = z.object({
  feedingIntervalDays: z.coerce.number().min(1),
  waterChangeIntervalDays: z.coerce.number().optional(),
  substrateCleanIntervalDays: z.coerce.number().min(1),
  soilRehydrationIntervalDays: z.coerce.number().optional(),
})

type InfoValues = z.infer<typeof infoSchema>
type ScheduleValues = z.infer<typeof scheduleSchema>

const classColors: Record<SpeciesTemplate['animalClass'], string> = {
  reptile: 'text-emerald-400', amphibian: 'text-blue-400',
  invertebrate: 'text-amber-400', mammal: 'text-pink-400', bird: 'text-purple-400',
}

function SpeciesCard({ s, selected, onClick }: { s: SpeciesTemplate; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-gray-900 border rounded-xl p-3 transition-all',
        selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-800 hover:border-gray-700'
      )}
    >
      <p className="font-medium text-sm text-gray-100">{s.commonName}</p>
      <p className="text-xs text-gray-500 italic">{s.scientificName}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className={cn('text-xs font-medium capitalize', classColors[s.animalClass])}>{s.animalClass}</span>
        <span className="text-gray-700">•</span>
        <span className="text-xs text-gray-600 capitalize">{s.careLevel}</span>
      </div>
    </button>
  )
}

export default function AddAnimal() {
  const navigate = useNavigate()
  const enclosures = useEnclosures()

  const [step, setStep] = useState(1)
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesTemplate | null>(null)
  const [allSpecies, setAllSpecies] = useState<SpeciesTemplate[]>([])
  const [search, setSearch] = useState('')
  const [selectedEnclosureId, setSelectedEnclosureId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Misting state
  const [mistingType, setMistingType] = useState<'manual' | 'automatic'>('manual')
  const [mistingSchedule, setMistingSchedule] = useState<'none' | 'interval' | 'times'>('none')
  const [mistingInterval, setMistingInterval] = useState('')
  const [mistingUnit, setMistingUnit] = useState<'hours' | 'days'>('hours')
  const [mistingTimes, setMistingTimes] = useState<string[]>([])
  const [newTime, setNewTime] = useState('08:00')

  const infoForm = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { sex: 'unknown', acquisitionDate: todayISO() },
  })

  const scheduleForm = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema) as any,
    defaultValues: { feedingIntervalDays: 7, substrateCleanIntervalDays: 30 },
  })

  useEffect(() => {
    loadSpecies().then(setAllSpecies)
  }, [])

  useEffect(() => {
    if (!selectedSpecies) return
    const s = selectedSpecies
    scheduleForm.setValue('feedingIntervalDays', s.feeding.frequencyDays)
    if (s.humidity.mistingFrequency) {
      setMistingSchedule('interval')
      setMistingInterval('12')
      setMistingUnit('hours')
    }
    if (s.wateringNeeds === 'bowl_always' || s.wateringNeeds === 'bowl_optional') {
      scheduleForm.setValue('waterChangeIntervalDays', 7)
    }
  }, [selectedSpecies, scheduleForm])

  const filtered = allSpecies.filter(s =>
    !search || s.commonName.toLowerCase().includes(search.toLowerCase()) ||
    s.scientificName.toLowerCase().includes(search.toLowerCase()) ||
    s.alternateNames?.some(n => n.toLowerCase().includes(search.toLowerCase()))
  )

  const buildMistingConfig = () => {
    if (mistingSchedule === 'interval' && mistingInterval) {
      const n = parseFloat(mistingInterval)
      return {
        mistingType,
        mistingScheduleType: 'interval' as const,
        mistingInterval: n,
        mistingIntervalUnit: mistingUnit,
        mistingIntervalHours: mistingUnit === 'hours' ? n : n * 24,
      }
    }
    if (mistingSchedule === 'times' && mistingTimes.length > 0) {
      return { mistingType, mistingScheduleType: 'times' as const, mistingTimes }
    }
    return {}
  }

  const onSubmit = async (info: InfoValues) => {
    const schedule = scheduleForm.getValues()
    setSaving(true)
    try {
      const animal = await addAnimal({
        name: info.name,
        species: selectedSpecies?.id ?? 'unknown',
        morph: info.morph,
        sex: info.sex,
        dateOfBirth: info.dateOfBirth || undefined,
        acquisitionDate: info.acquisitionDate,
        acquisitionSource: info.acquisitionSource,
        enclosureId: selectedEnclosureId || undefined,
        photoIds: [],
        status: 'active',
        notes: info.notes,
      })
      await saveCareSchedule({
        animalId: animal.id,
        feedingIntervalDays: schedule.feedingIntervalDays,
        waterChangeIntervalDays: schedule.waterChangeIntervalDays,
        substrateCleanIntervalDays: schedule.substrateCleanIntervalDays,
        soilRehydrationIntervalDays: schedule.soilRehydrationIntervalDays,
        medicationReminders: true,
        updatedAt: new Date().toISOString(),
        ...buildMistingConfig(),
      })
      navigate(`/animals/${animal.id}`)
    } finally {
      setSaving(false)
    }
  }

  const steps = ['Species', 'Details', 'Schedule', 'Enclosure']

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)} className="text-gray-400 hover:text-gray-200 p-1">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-100">Add Animal</h1>
          <p className="text-xs text-gray-500">Step {step} of {steps.length}: {steps[step - 1]}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-5">
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(step / steps.length) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Species */}
      {step === 1 && (
        <div className="px-4 space-y-3">
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
          <p className="text-xs text-gray-600">{filtered.length} species available</p>
          <div className="space-y-2">
            {filtered.map(s => (
              <SpeciesCard key={s.id} s={s} selected={selectedSpecies?.id === s.id} onClick={() => setSelectedSpecies(s)} />
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!selectedSpecies}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={18} />
          </button>
          <button onClick={() => { setSelectedSpecies(null); setStep(2) }} className="w-full py-2.5 text-gray-500 text-sm">
            Skip — enter species manually
          </button>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <form onSubmit={infoForm.handleSubmit(() => setStep(3))} className="px-4 space-y-4">
          {selectedSpecies && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-emerald-300">{selectedSpecies.commonName}</p>
              <p className="text-xs text-emerald-600 italic">{selectedSpecies.scientificName}</p>
            </div>
          )}

          <div>
            <label className="label">Name <span className="text-red-400">*</span></label>
            <input {...infoForm.register('name')} type="text" placeholder="e.g. Noodle" className="input-field" />
            {infoForm.formState.errors.name && <p className="text-red-400 text-xs mt-1">{infoForm.formState.errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Morph / Variety</label>
            <input {...infoForm.register('morph')} type="text" placeholder="e.g. Pastel, Albino, Normal" className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sex</label>
              <select {...infoForm.register('sex')} className="input-field">
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input {...infoForm.register('dateOfBirth')} type="date" className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Acquisition Date <span className="text-red-400">*</span></label>
            <input {...infoForm.register('acquisitionDate')} type="date" className="input-field" />
          </div>

          <div>
            <label className="label">Source</label>
            <input {...infoForm.register('acquisitionSource')} type="text" placeholder="e.g. Breeder, Rescue" className="input-field" />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...infoForm.register('notes')} rows={3} placeholder="Any notes..." className="input-field resize-none" />
          </div>

          <button type="submit" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            Continue <ArrowRight size={18} />
          </button>

          <style>{`.input-field { display: block; width: 100%; background: #111827; border: 1px solid #1f2937; color: #f3f4f6; border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem; outline: none; } .input-field:focus { border-color: rgba(16,185,129,0.5); } .label { display: block; font-size: 0.75rem; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.375rem; } select.input-field option { background: #111827; }`}</style>
        </form>
      )}

      {/* Step 3: Care Schedule */}
      {step === 3 && (
        <form onSubmit={scheduleForm.handleSubmit(() => setStep(4))} className="px-4 space-y-4">
          <p className="text-sm text-gray-400">
            {selectedSpecies ? 'Pre-filled from species data — adjust as needed.' : 'Set care intervals for reminders.'}
          </p>

          {selectedSpecies && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-xs">
              <p className="text-gray-500 font-medium uppercase tracking-wide mb-2">Species Care Requirements</p>
              <p className="text-gray-400">🌡️ Basking: {selectedSpecies.temperature.baskingCelsius?.[0] ?? selectedSpecies.temperature.warmSideCelsius[0]}–{selectedSpecies.temperature.baskingCelsius?.[1] ?? selectedSpecies.temperature.warmSideCelsius[1]}°C</p>
              <p className="text-gray-400">💧 Humidity: {selectedSpecies.humidity.min}–{selectedSpecies.humidity.max}%</p>
              <p className="text-gray-400">☀️ UVB: {selectedSpecies.lighting.uvbRequired ? `Yes (${selectedSpecies.lighting.uvbStrength ?? 'required'})` : 'Not required'}</p>
              <p className="text-gray-400">🍖 Feeding: every {selectedSpecies.feeding.frequencyDays} day(s)</p>
            </div>
          )}

          <div>
            <label className="label">Feeding Interval (days) <span className="text-red-400">*</span></label>
            <input {...scheduleForm.register('feedingIntervalDays')} type="number" min="1" className="input-field" />
          </div>

          {/* Misting */}
          <div>
            <label className="label">Misting</label>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-3">
              <div className="flex gap-2">
                {(['manual', 'automatic'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setMistingType(t)}
                    className={cn('flex-1 py-1.5 text-sm rounded-lg border capitalize transition-colors',
                      mistingType === t ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                    )}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {(['none', 'interval', 'times'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setMistingSchedule(s)}
                    className={cn('flex-1 py-1.5 text-xs rounded-lg border capitalize transition-colors',
                      mistingSchedule === s ? 'border-blue-500 text-blue-300 bg-blue-500/10' : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                    )}>
                    {s === 'none' ? 'No schedule' : s === 'interval' ? 'Every X' : 'Set times'}
                  </button>
                ))}
              </div>
              {mistingSchedule === 'interval' && (
                <div className="flex gap-2">
                  <input type="number" min="1" placeholder="e.g. 12" value={mistingInterval}
                    onChange={e => setMistingInterval(e.target.value)} className="input-field flex-1" />
                  <select value={mistingUnit} onChange={e => setMistingUnit(e.target.value as any)} className="input-field w-24">
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              )}
              {mistingSchedule === 'times' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {mistingTimes.map(t => (
                      <span key={t} className="flex items-center gap-1 bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                        {t}
                        <button type="button" onClick={() => setMistingTimes(prev => prev.filter(x => x !== t))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="input-field flex-1" />
                    <button type="button"
                      onClick={() => { if (newTime && !mistingTimes.includes(newTime)) { setMistingTimes(p => [...p, newTime].sort()); setNewTime('08:00') } }}
                      className="px-3 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Water Change (days)</label>
              <input {...scheduleForm.register('waterChangeIntervalDays')} type="number" min="1" placeholder="N/A" className="input-field" />
            </div>
            <div>
              <label className="label">Soil Rehydration (days)</label>
              <input {...scheduleForm.register('soilRehydrationIntervalDays')} type="number" min="1" placeholder="N/A" className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Substrate Clean Interval (days) <span className="text-red-400">*</span></label>
            <input {...scheduleForm.register('substrateCleanIntervalDays')} type="number" min="1" className="input-field" />
          </div>

          <button type="submit" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            Continue <ArrowRight size={18} />
          </button>

          <style>{`.input-field { display: block; width: 100%; background: #111827; border: 1px solid #1f2937; color: #f3f4f6; border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem; outline: none; } .label { display: block; font-size: 0.75rem; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.375rem; } select.input-field option { background: #111827; }`}</style>
        </form>
      )}

      {/* Step 4: Enclosure */}
      {step === 4 && (
        <div className="px-4 space-y-3">
          <p className="text-sm text-gray-400">Link to an existing enclosure or skip to add one later.</p>

          <div className="space-y-2">
            {enclosures?.map(enc => (
              <button
                key={enc.id}
                onClick={() => setSelectedEnclosureId(enc.id)}
                className={cn(
                  'w-full text-left bg-gray-900 border rounded-xl p-4 transition-all',
                  selectedEnclosureId === enc.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-800 hover:border-gray-700'
                )}
              >
                <p className="font-medium text-gray-200">{enc.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{enc.dimensionsLWHcm.join(' × ')} cm</p>
              </button>
            ))}
          </div>

          {!enclosures?.length && (
            <p className="text-gray-600 text-sm text-center py-4">No enclosures added yet. You can add one after saving the animal.</p>
          )}

          <button
            onClick={() => infoForm.handleSubmit(onSubmit)()}
            disabled={saving}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : <><Check size={18} /> Save Animal</>}
          </button>
          <button onClick={() => infoForm.handleSubmit(onSubmit)()} disabled={saving} className="w-full py-2.5 text-gray-500 text-sm">
            Skip enclosure for now
          </button>
        </div>
      )}
    </div>
  )
}
