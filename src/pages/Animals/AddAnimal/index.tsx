import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Plus, X, Zap, Gift } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addAnimal, saveCareSchedule, useAnimals } from '@/db/hooks/useAnimals'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { useSubscription, FREE_ANIMAL_LIMIT } from '@/hooks/useSubscription'
import { loadSpecies } from '@/utils/species'
import { todayISO } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
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

import type { PlanType } from '@/hooks/useSubscription'

const GATE_PLANS: { key: PlanType; label: string; price: string; detail: string }[] = [
  { key: 'monthly',  label: 'Monthly',  price: '$4.99/mo', detail: '30-day free trial' },
  { key: 'annual',   label: 'Annual',   price: '$20/yr',   detail: '30-day free trial · Save 67%' },
  { key: 'lifetime', label: 'Lifetime', price: '$50',      detail: 'Pay once · Yours forever' },
]

function UpgradeGate({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const { openCheckout, redeemCode } = useSubscription()
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly')
  const [checkingOut, setCheckingOut] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  const handleCheckout = async () => {
    setCheckingOut(true)
    await openCheckout(selectedPlan)
    setCheckingOut(false)
  }

  const handleRedeem = async () => {
    if (!promoInput.trim()) return
    setRedeeming(true)
    setPromoError('')
    setPromoSuccess('')
    const result = await redeemCode(promoInput)
    setRedeeming(false)
    if (result.success) {
      setPromoSuccess('Code accepted! Pro unlocked — you can now add animals.')
    } else {
      setPromoError(result.error ?? 'Invalid code')
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-100">Add Animal</h1>
      </div>
      <div className="flex-1 px-4 flex flex-col items-center justify-center gap-5 pb-24">
        <div className="text-center">
          <p className="text-5xl mb-4">🔒</p>
          <p className="text-lg font-bold text-gray-100">Free limit reached</p>
          <p className="text-sm text-gray-400 mt-2 max-w-xs">
            You've added {FREE_ANIMAL_LIMIT} animals on the free tier. Upgrade for unlimited.
          </p>
        </div>

        {/* Plan picker */}
        <div className="w-full max-w-xs grid grid-cols-3 gap-2">
          {GATE_PLANS.map(p => (
            <button key={p.key} onClick={() => setSelectedPlan(p.key)}
              className={cn('flex flex-col items-center py-3 px-1 rounded-xl border text-center transition-all',
                selectedPlan === p.key
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              )}>
              <p className={cn('text-[11px] font-semibold', selectedPlan === p.key ? 'text-amber-300' : 'text-gray-400')}>{p.label}</p>
              <p className={cn('text-sm font-bold mt-0.5', selectedPlan === p.key ? 'text-amber-200' : 'text-gray-200')}>{p.price}</p>
              <p className="text-[10px] text-gray-600 mt-1 leading-tight">{p.detail}</p>
            </button>
          ))}
        </div>

        <button
          onClick={handleCheckout}
          disabled={checkingOut}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-bold rounded-2xl transition-colors"
        >
          <Zap size={16} />
          {checkingOut ? 'Loading…' : selectedPlan === 'lifetime' ? 'Buy Lifetime — $50' : 'Start 30-Day Free Trial'}
        </button>

        <div className="w-full max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <Gift size={13} className="text-gray-500" />
            <p className="text-xs text-gray-500">Have a promo code?</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={e => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              placeholder="ENTER CODE"
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={handleRedeem}
              disabled={redeeming || !promoInput.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {redeeming ? '…' : 'Redeem'}
            </button>
          </div>
          {promoError && <p className="text-xs text-red-400 mt-1.5">{promoError}</p>}
          {promoSuccess && <p className="text-xs text-emerald-400 mt-1.5">{promoSuccess}</p>}
        </div>

        <button onClick={() => navigate('/settings')} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Manage plan in Settings
        </button>
      </div>
    </div>
  )
}

export default function AddAnimal() {
  const navigate = useNavigate()
  const animals = useAnimals()
  const enclosures = useEnclosures()
  const { isPro, animalLimit } = useSubscription()

  const [step, setStep] = useState(1)
  const [allSpecies, setAllSpecies] = useState<SpeciesTemplate[]>([])
  const [selectedClass, setSelectedClass] = useState<AnimalClass | ''>('')
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesTemplate | null>(null)
  const [selectedEnclosureId, setSelectedEnclosureId] = useState('')
  const [saving, setSaving] = useState(false)

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
        morph: info.morph,
        sex: info.sex,
        dateOfBirth: info.dateOfBirth || undefined,
        acquisitionDate: info.acquisitionDate,
        acquisitionSource: info.acquisitionSource,
        enclosureId: selectedEnclosureId || undefined,
        photoIds: [],
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

  // Validate step 2 fields before advancing
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

  if (!isPro && (animals?.length ?? 0) >= animalLimit) {
    return <UpgradeGate onBack={() => navigate('/animals')} />
  }

  return (
    <div className="min-h-full pb-24">
      <style>{STYLES}</style>

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
          {/* Stage 1: pick class */}
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

          {/* Stage 2: pick species — appears after class selected */}
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

          {/* Preview card */}
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

          {/* Count + label — unnamed fish group */}
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

          {/* Name — non-fish or named fish individual */}
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

          {/* Feeding — always shown */}
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
            /* ── Fish-specific fields ──────────────── */
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

              {/* Additives & treatments */}
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
            /* ── Non-fish fields ──────────────────── */
            <>
              <div>
                <label className="label">Misting</label>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-3">
                  {/* Manual / Automatic */}
                  <div className="flex gap-2">
                    {(['manual', 'automatic'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMistingType(t)}
                        className={cn(
                          'flex-1 py-1.5 text-sm rounded-lg border capitalize transition-colors',
                          mistingType === t
                            ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                            : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Schedule type */}
                  <div className="flex gap-2">
                    {(['none', 'interval', 'times'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMistingSchedule(s)}
                        className={cn(
                          'flex-1 py-1.5 text-xs rounded-lg border capitalize transition-colors',
                          mistingSchedule === s
                            ? 'border-blue-500 text-blue-300 bg-blue-500/10'
                            : 'border-gray-700 text-gray-500 hover:bg-gray-800'
                        )}
                      >
                        {s === 'none' ? 'No schedule' : s === 'interval' ? 'Every X' : 'Set times'}
                      </button>
                    ))}
                  </div>

                  {/* Interval — number + unit side by side */}
                  {mistingSchedule === 'interval' && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Mist every:</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 12"
                          value={mistingInterval}
                          onChange={e => setMistingInterval(e.target.value)}
                          className="input-field flex-1"
                        />
                        <select
                          value={mistingUnit}
                          onChange={e => setMistingUnit(e.target.value as 'hours' | 'days')}
                          className="input-field w-28"
                        >
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
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
