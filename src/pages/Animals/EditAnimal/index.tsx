import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, Check, Plus, Trash2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAnimal, useCareSchedule, updateAnimal, saveCareSchedule, deleteAnimal } from '@/db/hooks/useAnimals'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  morph: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']),
  status: z.enum(['active', 'quarantine', 'brumation', 'deceased', 'rehomed']),
  dateOfBirth: z.string().optional(),
  acquisitionDate: z.string().min(1),
  acquisitionSource: z.string().optional(),
  enclosureId: z.string().optional(),
  notes: z.string().optional(),
  feedingIntervalDays: z.coerce.number().min(1),
  waterChangeIntervalDays: z.coerce.number().optional(),
  substrateCleanIntervalDays: z.coerce.number().min(1),
  soilRehydrationIntervalDays: z.coerce.number().optional(),
})
type FormValues = z.infer<typeof schema>

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

const S = `.input-field{display:block;width:100%;background:#111827;border:1px solid #1f2937;color:#f3f4f6;border-radius:.75rem;padding:.75rem 1rem;font-size:.875rem;outline:none}.input-field:focus{border-color:rgba(16,185,129,.5)}.label{display:block;font-size:.75rem;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.375rem}select.input-field option{background:#111827}`

export default function EditAnimal() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const animal = useAnimal(id)
  const schedule = useCareSchedule(id)
  const enclosures = useEnclosures()
  const photoRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [thumbnail, setThumbnail] = useState<string | null>(null)

  // Misting state (separate from react-hook-form)
  const [mistingType, setMistingType] = useState<'manual' | 'automatic'>('manual')
  const [mistingSchedule, setMistingSchedule] = useState<'none' | 'interval' | 'times'>('none')
  const [mistingInterval, setMistingInterval] = useState('')
  const [mistingUnit, setMistingUnit] = useState<'hours' | 'days'>('hours')
  const [mistingTimes, setMistingTimes] = useState<string[]>([])
  const [newTime, setNewTime] = useState('08:00')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { sex: 'unknown', status: 'active', feedingIntervalDays: 7, substrateCleanIntervalDays: 30 },
  })

  // Seed form + misting state once data loads
  useEffect(() => {
    if (!animal || seeded) return
    reset({
      name: animal.name,
      morph: animal.morph ?? '',
      sex: animal.sex,
      status: animal.status,
      dateOfBirth: animal.dateOfBirth ?? '',
      acquisitionDate: animal.acquisitionDate,
      acquisitionSource: animal.acquisitionSource ?? '',
      enclosureId: animal.enclosureId ?? '',
      notes: animal.notes ?? '',
      feedingIntervalDays: schedule?.feedingIntervalDays ?? 7,
      waterChangeIntervalDays: schedule?.waterChangeIntervalDays ?? ('' as any),
      substrateCleanIntervalDays: schedule?.substrateCleanIntervalDays ?? 30,
      soilRehydrationIntervalDays: schedule?.soilRehydrationIntervalDays ?? ('' as any),
    })
    setThumbnail(animal.thumbnailBase64 ?? null)
    if (schedule) {
      setMistingType(schedule.mistingType ?? 'manual')
      setMistingSchedule(schedule.mistingScheduleType ?? (schedule.mistingIntervalHours ? 'interval' : 'none'))
      setMistingInterval(
        schedule.mistingInterval?.toString() ??
        (schedule.mistingIntervalHours ? schedule.mistingIntervalHours.toString() : '')
      )
      setMistingUnit(schedule.mistingIntervalUnit ?? 'hours')
      setMistingTimes(schedule.mistingTimes ?? [])
      setSeeded(true)
    }
  }, [animal, schedule, reset, seeded])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await compressImage(file)
    setThumbnail(base64)
  }

  const buildMistingConfig = () => {
    if (mistingSchedule === 'none') return {}
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
    return { mistingType }
  }

  const onSubmit = async (values: FormValues) => {
    if (!id) return
    setSaving(true)
    try {
      await updateAnimal(id, {
        name: values.name,
        morph: values.morph || undefined,
        sex: values.sex,
        status: values.status,
        dateOfBirth: values.dateOfBirth || undefined,
        acquisitionDate: values.acquisitionDate,
        acquisitionSource: values.acquisitionSource || undefined,
        enclosureId: values.enclosureId || undefined,
        notes: values.notes || undefined,
        thumbnailBase64: thumbnail ?? undefined,
      })
      await saveCareSchedule({
        id: schedule?.id,
        animalId: id,
        feedingIntervalDays: values.feedingIntervalDays,
        waterChangeIntervalDays: values.waterChangeIntervalDays || undefined,
        substrateCleanIntervalDays: values.substrateCleanIntervalDays,
        soilRehydrationIntervalDays: values.soilRehydrationIntervalDays || undefined,
        medicationReminders: schedule?.medicationReminders ?? true,
        updatedAt: new Date().toISOString(),
        ...buildMistingConfig(),
      })
      navigate(`/animals/${id}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    await deleteAnimal(id)
    navigate('/animals', { replace: true })
  }

  if (!animal) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full pb-24">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-200 p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-100 flex-1 truncate">Edit {animal.name}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-4">
        {/* Photo */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            {thumbnail ? (
              <img src={thumbnail} className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500/50" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center">
                <span className="text-3xl">🐾</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-lg"
            >
              <Camera size={14} />
            </button>
            {thumbnail && (
              <button
                type="button"
                onClick={() => setThumbnail(null)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full flex items-center justify-center"
              >
                <X size={10} />
              </button>
            )}
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <p className="text-xs text-gray-600">Tap camera icon to add/change photo</p>
        </div>

        {/* Species read-only */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-0.5">Species</p>
          <p className="text-sm text-gray-300">{animal.species}</p>
        </div>

        <div>
          <label className="label">Name *</label>
          <input {...register('name')} type="text" className="input-field" />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">Morph / Variety</label>
          <input {...register('morph')} type="text" placeholder="e.g. Pastel, Albino, Normal" className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sex</label>
            <select {...register('sex')} className="input-field">
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input-field">
              <option value="active">Active</option>
              <option value="quarantine">Quarantine</option>
              <option value="brumation">Brumation</option>
              <option value="deceased">Deceased</option>
              <option value="rehomed">Rehomed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date of Birth</label>
            <input {...register('dateOfBirth')} type="date" className="input-field" />
          </div>
          <div>
            <label className="label">Acquisition Date *</label>
            <input {...register('acquisitionDate')} type="date" className="input-field" />
          </div>
        </div>

        <div>
          <label className="label">Source</label>
          <input {...register('acquisitionSource')} type="text" placeholder="e.g. Breeder, Rescue, Pet store" className="input-field" />
        </div>

        <div>
          <label className="label">Enclosure</label>
          <select {...register('enclosureId')} className="input-field">
            <option value="">— Not assigned —</option>
            {enclosures?.map(enc => (
              <option key={enc.id} value={enc.id}>{enc.name}</option>
            ))}
          </select>
          {!enclosures?.length && (
            <p className="text-xs text-gray-600 mt-1">No enclosures yet — add one from the Enclosures tab first.</p>
          )}
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea {...register('notes')} rows={3} placeholder="Any notes about this animal..." className="input-field resize-none" />
        </div>

        {/* ── Care Schedule ── */}
        <div className="pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-4">Care Schedule</p>

          <div className="space-y-4">
            <div>
              <label className="label">Feeding Every (days) *</label>
              <input {...register('feedingIntervalDays')} type="number" min="1" className="input-field" />
            </div>

            {/* Misting */}
            <div>
              <label className="label">Misting</label>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-3">
                {/* Manual / Automatic */}
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

                {/* Schedule type */}
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

                {/* Interval fields */}
                {mistingSchedule === 'interval' && (
                  <div className="flex gap-2">
                    <input
                      type="number" min="1" placeholder="e.g. 12"
                      value={mistingInterval}
                      onChange={e => setMistingInterval(e.target.value)}
                      className="input-field flex-1"
                    />
                    <select value={mistingUnit} onChange={e => setMistingUnit(e.target.value as any)} className="input-field w-24">
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                )}

                {/* Set times */}
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
                      <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                        className="input-field flex-1" />
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
                <input {...register('waterChangeIntervalDays')} type="number" min="1" placeholder="N/A" className="input-field" />
              </div>
              <div>
                <label className="label">Soil Rehydration (days)</label>
                <input {...register('soilRehydrationIntervalDays')} type="number" min="1" placeholder="N/A" className="input-field" />
              </div>
            </div>

            <div>
              <label className="label">Substrate Clean Every (days) *</label>
              <input {...register('substrateCleanIntervalDays')} type="number" min="1" className="input-field" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
          {saving ? 'Saving...' : <><Check size={18} /> Save Changes</>}
        </button>

        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)}
            className="w-full py-2.5 text-red-500 hover:text-red-400 text-sm flex items-center justify-center gap-2 transition-colors">
            <Trash2 size={14} /> Delete Animal
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-300 text-center font-medium">
              Delete {animal.name} and all care records? This can't be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 text-gray-400 border border-gray-700 rounded-xl text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        )}

        <style>{S}</style>
      </form>
    </div>
  )
}
