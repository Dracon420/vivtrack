import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Plus, X, Camera } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addAnimal, saveCareSchedule, useAnimals } from '@/db/hooks/useAnimals'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { loadSpecies } from '@/utils/species'
import { todayISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import CropModal from '@/components/CropModal'
import type { SpeciesTemplate } from '@/types'

type AnimalClass = SpeciesTemplate['animalClass']

const CLASS_OPTIONS: { value: AnimalClass; label: string }[] = [
  { value: 'reptile',      label: '🦎 Reptile' },
  { value: 'fish',         label: '🐠 Fish' },
  { value: 'amphibian',    label: '🐸 Amphibian' },
  { value: 'invertebrate', label: '🕷️ Invertebrate' },
  { value: 'mammal',       label: '🐹 Mammal' },
  { value: 'bird',         label: '🦜 Bird' },
]

const PRESET_ADDITIVES = ['Prime', 'Stability', 'Flourish', 'Easy Green', 'Excel', 'Stress Coat', 'Ich-X', 'Melafix']

const STYLES = `.input-field{display:block;width:100%;background:#111827;border:1px solid #1f2937;color:#f3f4f6;border-radius:0.75rem;padding:0.75rem 1rem;font-size:0.875rem;outline:none}.input-field:focus{border-color:rgba(16,185,129,.5)}.label{display:block;font-size:.75rem;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.375rem}select.input-field option{background:#111827}`

const infoSchema = z.object({
  name: z.string().optional(),
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

async function compressImage(file: File, maxPx = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AddAnimal() {
  const navigate = useNavigate()
  const animals = useAnimals()
  const enclosures = useEnclosures()
  const photoRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [allSpecies, setAllSpecies] = useState<SpeciesTemplate[]>([])
  const [selectedClass, setSelectedClass] = useState<AnimalClass | ''>('')
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesTemplate | null>(null)
  const [selectedEnclosureId, setSelectedEnclosureId] = useState('')
  const [saving, setSaving] = useState(false)

  // Photo + crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  // Step 2 — fish naming mode
  const [fishNamingMode, setFishNamingMode] = useState<'named' | 'group'>('named')
  const [groupCount, setGroupCount] = useState('')
  const [groupLabel, setGroupLabel] = useState('')
  const [groupCountError, setGroupCountError] = useState('')

  // Step 3 — misting (non-fish)
  const [mistingType, setMistingType] = useState<'manual' | 'automatic'>('manual')
  const [mistingSchedule, setMistingSchedule] = useState<'none' | 'interval' | 'times'>('none')
  const [mistingInterval, setMistingInterval] = useState('')
  const [mistingUnit, setMistingUnit] = useState<'hours' | 'days'>('hours')
  const [mistingTimes, setMistingTimes] = useState<string[]>([])
  const [newTime, setNewTime] = useState('08:00')

  // Step 3 — fish additives
  const [additives, setAdditives] = useState<string[]>([])
  const [newAdditive, setNewAdditive] = useState('')

  const infoForm = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { sex: 'unknown', acquisitionDate: todayISO() },
  })

  const scheduleForm = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema) as any,
    defaultValues: { feedingIntervalDays: 7, substrateCleanIntervalDays: 30 },
  })

  useEffect(() => { loadSpecies().then(setAllSpecies) }, [])

  const isFish = selectedSpecies?.animalClass === 'fish'
  const isFishGroup = isFish && fishNamingMode === 'group'
  const speciesByClass = selectedClass ? allSpecies.filter(s => s.animalClass === selectedClass) : []

  useEffect(() => {
    if (!selectedSpecies) return
    scheduleForm.setValue('feedingIntervalDays', selectedSpecies.feeding.frequencyDays)
    if (selectedSpecies.animalClass === 'fish') {
      scheduleForm.setValue('waterChangeIntervalDays', 7)
    } else {
      if (selectedSpecies.humidity.mistingFrequency) {
        setMistingSchedule('interval')
        setMistingInterval('12')
        setMistingUnit('hours')
      }
      if (selectedSpecies.wateringNeeds === 'bowl_always' || selectedSpecies.wateringNeeds === 'bowl_optional') {
        scheduleForm.setValue('waterChangeIntervalDays', 7)
      }
    }
  }, [selectedSpecies]) // eslint-disable-line

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
    const finalName = isFishGroup
      ? `${parseInt(groupCount) || 1}× ${groupLabel.trim() || selectedSpecies?.commonName || 'Fish'}`
      : (info.name?.trim() || selectedSpecies?.commonName || 'Unknown')

    setSaving(true)
    try {
      const animal = await addAnimal({
        name: finalName,
        species: selectedSpecies?.id ?? 'unknown',
        speciesId: selectedSpecies?.id,
        morph: info.morph,
        sex: info.sex,
        dateOfBirth: info.dateOfBirth || undefined,
        acquisitionDate: info.acquisitionDate,
        acquisitionSource: info.acquisitionSource,
        enclosureId: selectedEnclosureId || undefined,
        photoIds: [],
        thumbnailBase64: thumbnail ?? undefined,
        status: 'active',
        notes: info.notes,
        ...(isFishGroup && { groupCount: parseInt(groupCount) || 1, isGroup: true }),
      })

      await saveCareSchedule({
        animalId: animal.id,
        feedingIntervalDays: schedule.feedingIntervalDays,
        waterChangeIntervalDays: schedule.waterChangeIntervalDays,
        substrateCleanIntervalDays: schedule.substrateCleanIntervalDays,
        soilRehydrationIntervalDays: isFish ? undefined : schedule.soilRehydrationIntervalDays,
        medicationReminders: true,
        updatedAt: new Date().toISOString(),
        ...(isFish
          ? (additives.length > 0 ? { additives } : {})
          : buildMistingConfig()
        ),
      })

      navigate(`/animals/${animal.id}`)
    } finally {
      setSaving(false)
    }
  }

  const handleStep2Continue = infoForm.handleSubmit((data) => {
    if (isFishGroup) {
      if (!groupCount || parseInt(groupCount) < 1) {
        setGroupCountError('Please enter the number of fish')
        return
      }
      setGroupCountError('')
      setStep(3)
      return
    }
    if (!data.name?.trim()) {
      infoForm.setError('name', { message: 'Name is required' })
      return
    }
    setStep(3)
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const url = URL.createObjectURL(file)
    setCropSrc(url)
  }

  const handleCropConfirm = (base64: string) => {
    // Also compress to 400px for thumbnail display
    const img = new Image()
    img.onload = () => {
      const size = Math.min(img.width, img.height, 400)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, size, size)
      setThumbnail(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = base64
    setThumbnail(base64)
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  const addCustomAdditive = () => {
    const v = newAdditive.trim()
    if (v && !additives.includes(v)) { setAdditives(p => [...p, v]); setNewAdditive('') }
  }

  const steps = ['Species', 'Details', 'Schedule', 'Enclosure']

  const SpeciesBanner = selectedSpecies ? (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
      <p className="text-sm font-medium text-emerald-300">{selectedSpecies.commonName}</p>
      <p className="text-xs text-emerald-600 italic">{selectedSpecies.scientificName}</p>
    </div>
  ) : null

  return (
    <div className="min-h-full pb-24">
      <style>{STYLES}</style>

      {cropSrc && (
        <CropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null) }}
        />
      )}

      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)}
          className="text-gray-400 hover:text-gray-200 p-1"
        >
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
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Step 1: Species ── */}
      {step === 1 && (
        <div className="px-4 space-y-4">
          <div>
            <label className="label">Animal Type</label>
            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value as AnimalClass); setSelectedSpecies(null) }}
              className="input-field"
            >
              <option value="">Select type…</option>
              {CLASS_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {selectedClass && (
            <div>
              <label className="label">
                Species
                <span className="normal-case font-normal text-gray-600 ml-1">({speciesByClass.length} available)</span>
              </label>
              <select
                value={selectedSpecies?.id ?? ''}
                onChange={e => setSelectedSpecies(speciesByClass.find(s => s.id === e.target.value) ?? null)}
                className="input-field"
              >
                <option value="">Select species…</option>
                {speciesByClass.map(s => (
                  <option key={s.id} value={s.id}>{s.commonName}</option>
                ))}
              </select>
            </div>
          )}

          {selectedSpecies && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-emerald-300">{selectedSpecies.commonName}</p>
              <p className="text-xs text-emerald-600 italic mb-2">{selectedSpecies.scientificName}</p>
              <div className="flex gap-4 text-xs">
                <span className="text-gray-500">
                  Care: <span className="text-gray-300 capitalize">{selectedSpecies.careLevel}</span>
                </span>
                <span className="text-gray-500">
                  Lifespan: <span className="text-gray-300">{selectedSpecies.lifespanYears[0]}–{selectedSpecies.lifespanYears[1]}y</span>
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!selectedSpecies}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={18} />
          </button>
          <button
            onClick={() => { setSelectedSpecies(null); setSelectedClass(''); setStep(2) }}
            className="w-full py-2.5 text-gray-500 text-sm"
          >
            Skip — enter species manually
          </button>
        </div>
      )}

      {/* ── Step 2: Details ── */}
      {step === 2 && (
        <form onSubmit={handleStep2Continue} className="px-4 space-y-4">
          {SpeciesBanner}

          {/* ── Profile Photo ── */}
          <div className="flex flex-col items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="relative group"
            >
              {thumbnail ? (
                <img
                  src={thumbnail}
                  className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500/50"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors">
                  <span className="text-3xl">🐾</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 group-hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-lg transition-colors">
                <Camera size={14} />
              </div>
            </button>
            <p className="text-xs text-gray-600">
              {thumbnail ? 'Tap to change photo' : 'Add a profile photo (optional)'}
            </p>
            {thumbnail && (
              <button
                type="button"
                onClick={() => setThumbnail(null)}
                className="text-xs text-red-500 hover:text-red-400 transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Fish: named individual vs unnamed group */}
          {isFish && (
            <div>
              <label className="label">Add as</label>
              <div className="flex gap-2">
                {(['named', 'group'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFishNamingMode(mode)}
                    className={cn(
                      'flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors',
                      fishNamingMode === mode
                        ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
                        : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                    )}
                  >
                    {mode === 'named' ? '🐟 Named individual' : '🐠 Unnamed group'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1.5">
                {fishNamingMode === 'group'
                  ? 'Track a shoal or batch together, e.g. "30 Guppies"'
                  : 'A single fish with its own name, e.g. a betta or angelfish'}
              </p>
            </div>
          )}

          {isFishGroup && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Count <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={groupCount}
                  onChange={e => { setGroupCount(e.target.value); setGroupCountError('') }}
                  placeholder="e.g. 30"
                  className="input-field"
                />
                {groupCountError && <p className="text-red-400 text-xs mt-1">{groupCountError}</p>}
              </div>
              <div>
                <label className="label">Label</label>
                <input
                  type="text"
                  value={groupLabel}
                  onChange={e => setGroupLabel(e.target.value)}
                  placeholder={selectedSpecies?.commonName ?? 'e.g. Guppies'}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {!isFishGroup && (
            <div>
              <label className="label">
                Name{' '}
                {!isFish
                  ? <span className="text-red-400">*</span>
                  : <span className="normal-case font-normal text-gray-600">(optional)</span>
                }
              </label>
              <input
                {...infoForm.register('name')}
                type="text"
                placeholder={isFish ? 'e.g. Nemo' : 'e.g. Noodle'}
                className="input-field"
              />
              {infoForm.formState.errors.name && (
                <p className="text-red-400 text-xs mt-1">{infoForm.formState.errors.name.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="label">Morph / Variety</label>
            <input
              {...infoForm.register('morph')}
              type="text"
              placeholder="e.g. Pastel, Albino, Normal"
              className="input-field"
            />
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
            <input
              {...infoForm.register('acquisitionSource')}
              type="text"
              placeholder="e.g. Breeder, Rescue, LFS"
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              {...infoForm.register('notes')}
              rows={3}
              placeholder="Any notes..."
              className="input-field resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={18} />
          </button>
        </form>
      )}

      {/* ── Step 3: Care Schedule ── */}
      {step === 3 && (
        <form onSubmit={scheduleForm.handleSubmit(() => setStep(4))} className="px-4 space-y-4">
          {SpeciesBanner}
          <p className="text-xs text-gray-500">
            {selectedSpecies ? 'Pre-filled from species data — adjust as needed.' : 'Set care intervals for reminders.'}
          </p>

          <div>
            <label className="label">Feeding Interval (days) <span className="text-red-400">*</span></label>
            <input
              {...scheduleForm.register('feedingIntervalDays')}
              type="number"
              min="1"
              className="input-field"
            />
          </div>

          {isFish ? (
            <>
              <div>
                <label className="label">Water Change Interval (days)</label>
                <input
                  {...scheduleForm.register('waterChangeIntervalDays')}
                  type="number"
                  min="1"
                  placeholder="e.g. 7"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Additives &amp; Treatments</label>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ADDITIVES.map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() =>
                          setAdditives(prev =>
                            prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
                          )
                        }
                        className={cn(
                          'px-3 py-1 rounded-full text-xs border transition-colors',
                          additives.includes(a)
                            ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
                            : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                        )}
                      >
                        {additives.includes(a) && '✓ '}{a}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAdditive}
                      onChange={e => setNewAdditive(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAdditive() } }}
                      placeholder="Add custom additive…"
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={addCustomAdditive}
                      className="px-3 bg-cyan-500/20 text-cyan-300 rounded-xl hover:bg-cyan-500/30 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {additives.filter(a => !PRESET_ADDITIVES.includes(a)).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                      {additives.filter(a => !PRESET_ADDITIVES.includes(a)).map(a => (
                        <span key={a} className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded-full">
                          {a}
                          <button type="button" onClick={() => setAdditives(p => p.filter(x => x !== a))}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Tank / Filter Clean Interval (days) <span className="text-red-400">*</span></label>
                <input
                  {...scheduleForm.register('substrateCleanIntervalDays')}
                  type="number"
                  min="1"
                  className="input-field"
                />
              </div>
            </>
          ) : (
            <>
              {/* ── Misting ── */}
              <div>
                <label className="label">Misting</label>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-3">
                  {/* Manual / Automatic toggle */}
                  <div className="flex gap-2">
                    {(['manual', 'automatic'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMistingType(t)}
                        className={cn(
                          'flex-1 py-2 text-sm rounded-lg border capitalize transition-colors',
                          mistingType === t
                            ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                            : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Schedule type selector */}
                  <div className="flex gap-2">
                    {(['none', 'interval', 'times'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMistingSchedule(s)}
                        className={cn(
                          'flex-1 py-2 text-xs rounded-lg border transition-colors',
                          mistingSchedule === s
                            ? 'border-blue-500 text-blue-300 bg-blue-500/10'
                            : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                        )}
                      >
                        {s === 'none' ? 'No schedule' : s === 'interval' ? 'Interval' : 'Set times'}
                      </button>
                    ))}
                  </div>

                  {/* Interval fields — 2-col grid so both are equal and visible */}
                  {mistingSchedule === 'interval' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label">Every</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="12"
                            value={mistingInterval}
                            onChange={e => setMistingInterval(e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Unit</label>
                          <select
                            value={mistingUnit}
                            onChange={e => setMistingUnit(e.target.value as 'hours' | 'days')}
                            className="input-field"
                          >
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                      </div>
                      {mistingInterval && (
                        <p className="text-xs text-blue-400">
                          Mist every {mistingInterval} {mistingUnit}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Specific times */}
                  {mistingSchedule === 'times' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {mistingTimes.map(t => (
                          <span key={t} className="flex items-center gap-1 bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                            {t}
                            <button type="button" onClick={() => setMistingTimes(prev => prev.filter(x => x !== t))}>
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="input-field flex-1" />
                        <button
                          type="button"
                          onClick={() => {
                            if (newTime && !mistingTimes.includes(newTime)) {
                              setMistingTimes(p => [...p, newTime].sort())
                              setNewTime('08:00')
                            }
                          }}
                          className="px-3 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
                        >
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
                  <input
                    {...scheduleForm.register('waterChangeIntervalDays')}
                    type="number"
                    min="1"
                    placeholder="N/A"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Soil Rehydration (days)</label>
                  <input
                    {...scheduleForm.register('soilRehydrationIntervalDays')}
                    type="number"
                    min="1"
                    placeholder="N/A"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label">Substrate Clean Interval (days) <span className="text-red-400">*</span></label>
                <input
                  {...scheduleForm.register('substrateCleanIntervalDays')}
                  type="number"
                  min="1"
                  className="input-field"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={18} />
          </button>
        </form>
      )}

      {/* ── Step 4: Enclosure ── */}
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
                  selectedEnclosureId === enc.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-800 hover:border-gray-700'
                )}
              >
                <p className="font-medium text-gray-200">{enc.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{enc.dimensionsLWHcm.join(' × ')} cm</p>
              </button>
            ))}
          </div>

          {!enclosures?.length && (
            <p className="text-gray-600 text-sm text-center py-4">
              No enclosures added yet. You can add one after saving the animal.
            </p>
          )}

          <button
            onClick={() => infoForm.handleSubmit(onSubmit)()}
            disabled={saving}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : <><Check size={18} /> Save Animal</>}
          </button>
          <button
            onClick={() => infoForm.handleSubmit(onSubmit)()}
            disabled={saving}
            className="w-full py-2.5 text-gray-500 text-sm"
          >
            Skip enclosure for now
          </button>
        </div>
      )}
    </div>
  )
}
