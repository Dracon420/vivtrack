import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEnclosure, updateEnclosure, deleteEnclosure } from '@/db/hooks/useEnclosures'
import { useUIStore } from '@/store/uiStore'
import { cmToIn, inToCm, cToF, fToC } from '@/utils/units'
import type { TankShape } from '@/types'

const TANK_SHAPE_OPTS: { value: TankShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'bowfront', label: 'Bowfront' },
  { value: 'cube', label: 'Cube' },
  { value: 'corner', label: 'Corner / Pentagon' },
  { value: 'other', label: 'Other' },
]

const schema = z.object({
  name: z.string().min(1),
  tankShape: z.string().optional(),
  volumeGallons: z.coerce.number().positive().optional().or(z.literal('')),
  lengthCm: z.coerce.number().optional().or(z.literal('')),
  widthCm: z.coerce.number().optional().or(z.literal('')),
  heightCm: z.coerce.number().optional().or(z.literal('')),
  humidityMin: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  humidityMax: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  waterTempMin: z.coerce.number().optional().or(z.literal('')),
  waterTempMax: z.coerce.number().optional().or(z.literal('')),
  baskingMin: z.coerce.number().optional().or(z.literal('')),
  baskingMax: z.coerce.number().optional().or(z.literal('')),
  ambientMin: z.coerce.number().optional().or(z.literal('')),
  ambientMax: z.coerce.number().optional().or(z.literal('')),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const S = `.input-field{display:block;width:100%;background:#111827;border:1px solid #1f2937;color:#f3f4f6;border-radius:.75rem;padding:.75rem 1rem;font-size:.875rem;outline:none}.input-field:focus{border-color:rgba(16,185,129,.5)}.label{display:block;font-size:.75rem;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.375rem}select.input-field option{background:#111827}`

const isAquatic = (t?: string) => t === 'aquarium' || t === 'pond'

export default function EditEnclosure() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const enclosure = useEnclosure(id)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const { measurementUnit, tempUnit } = useUIStore()
  const fromCm = (v: number) => measurementUnit === 'in' ? cmToIn(v) : v
  const fromC = (v: number) => tempUnit === 'F' ? cToF(v) : v
  const toCm = (v: number | string | undefined) => {
    if (!v || v === '') return 0
    return measurementUnit === 'in' ? inToCm(Number(v)) : Number(v)
  }
  const toC = (v: number | string | undefined) => {
    if (!v || v === '') return 0
    return tempUnit === 'F' ? fToC(Number(v)) : Number(v)
  }

  const aquatic = isAquatic(enclosure?.enclosureType)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
  })

  // True when an aquatic enclosure still carries old terrarium-style data
  const needsMigration = seeded && aquatic && (
    (enclosure?.humidityMin ?? 0) > 0 ||
    (enclosure?.humidityMax ?? 0) > 0 ||
    (enclosure?.temperatureZones ?? []).some(z => z.name !== 'Water')
  )

  const handleMigrate = () => {
    if (!enclosure) return
    // Pull the first existing zone (Basking or Ambient) as a reasonable water temp
    const oldZone = enclosure.temperatureZones[0]
    setValue('humidityMin', '')
    setValue('humidityMax', '')
    if (oldZone) {
      setValue('waterTempMin', fromC(oldZone.targetMin))
      setValue('waterTempMax', fromC(oldZone.targetMax))
    }
  }

  useEffect(() => {
    if (!enclosure || seeded) return
    const basking = enclosure.temperatureZones.find(z => z.name === 'Basking')
    const ambient = enclosure.temperatureZones.find(z => z.name === 'Ambient')
    const water = enclosure.temperatureZones.find(z => z.name === 'Water')
    reset({
      name: enclosure.name,
      tankShape: enclosure.tankShape ?? '',
      volumeGallons: enclosure.volumeGallons ?? '',
      lengthCm: enclosure.dimensionsLWHcm[0] ? fromCm(enclosure.dimensionsLWHcm[0]) : '',
      widthCm: enclosure.dimensionsLWHcm[1] ? fromCm(enclosure.dimensionsLWHcm[1]) : '',
      heightCm: enclosure.dimensionsLWHcm[2] ? fromCm(enclosure.dimensionsLWHcm[2]) : '',
      humidityMin: enclosure.humidityMin || '',
      humidityMax: enclosure.humidityMax || '',
      waterTempMin: water ? fromC(water.targetMin) : '',
      waterTempMax: water ? fromC(water.targetMax) : '',
      baskingMin: basking ? fromC(basking.targetMin) : '',
      baskingMax: basking ? fromC(basking.targetMax) : '',
      ambientMin: ambient ? fromC(ambient.targetMin) : '',
      ambientMax: ambient ? fromC(ambient.targetMax) : '',
      notes: enclosure.notes ?? '',
    })
    setSeeded(true)
  }, [enclosure, reset, seeded]) // eslint-disable-line

  const onSubmit = async (data: FormValues) => {
    if (!id) return
    setSaving(true)
    try {
      const zones = []
      if (aquatic) {
        if (data.waterTempMin && data.waterTempMax) {
          zones.push({ name: 'Water', targetMin: toC(data.waterTempMin), targetMax: toC(data.waterTempMax) })
        }
      } else {
        if (data.baskingMin && data.baskingMax) {
          zones.push({ name: 'Basking', targetMin: toC(data.baskingMin), targetMax: toC(data.baskingMax) })
        }
        if (data.ambientMin && data.ambientMax) {
          zones.push({ name: 'Ambient', targetMin: toC(data.ambientMin), targetMax: toC(data.ambientMax) })
        }
      }
      await updateEnclosure(id, {
        name: data.name,
        tankShape: aquatic ? (data.tankShape as TankShape | undefined) : undefined,
        volumeGallons: aquatic && data.volumeGallons ? Number(data.volumeGallons) : undefined,
        dimensionsLWHcm: [toCm(data.lengthCm), toCm(data.widthCm), toCm(data.heightCm)],
        temperatureZones: zones,
        humidityMin: aquatic ? 0 : Number(data.humidityMin ?? 0),
        humidityMax: aquatic ? 0 : Number(data.humidityMax ?? 0),
        notes: data.notes,
      })
      navigate(`/enclosures/${id}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    await deleteEnclosure(id)
    navigate('/enclosures', { replace: true })
  }

  if (!enclosure) return (
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
        <h1 className="text-lg font-bold text-gray-100 flex-1 truncate">Edit {enclosure.name}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-4">
        <div>
          <label className="label">Enclosure Name *</label>
          <input {...register('name')} type="text" className="input-field" />
          {errors.name && <p className="text-red-400 text-xs mt-1">Name is required</p>}
        </div>

        {aquatic ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Volume (gallons)</label>
                <input {...register('volumeGallons')} type="number" step="0.5" placeholder="75" className="input-field" />
              </div>
              <div>
                <label className="label">Tank Shape</label>
                <select {...register('tankShape')} className="input-field">
                  <option value="">Select…</option>
                  {TANK_SHAPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Water Temperature (°{tempUnit})</label>
              <div className="grid grid-cols-2 gap-2">
                <input {...register('waterTempMin')} type="number" placeholder="Min" className="input-field" />
                <input {...register('waterTempMax')} type="number" placeholder="Max" className="input-field" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="label">Dimensions ({measurementUnit})</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input {...register('lengthCm')} type="number" placeholder="L" className="input-field text-center" />
                  <p className="text-xs text-gray-600 text-center mt-1">Length</p>
                </div>
                <div>
                  <input {...register('widthCm')} type="number" placeholder="W" className="input-field text-center" />
                  <p className="text-xs text-gray-600 text-center mt-1">Width</p>
                </div>
                <div>
                  <input {...register('heightCm')} type="number" placeholder="H" className="input-field text-center" />
                  <p className="text-xs text-gray-600 text-center mt-1">Height</p>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Humidity Range (%)</label>
              <div className="grid grid-cols-2 gap-2">
                <input {...register('humidityMin')} type="number" placeholder="Min" className="input-field" />
                <input {...register('humidityMax')} type="number" placeholder="Max" className="input-field" />
              </div>
            </div>

            <div>
              <label className="label">Basking Zone (°{tempUnit})</label>
              <div className="grid grid-cols-2 gap-2">
                <input {...register('baskingMin')} type="number" placeholder="Min" className="input-field" />
                <input {...register('baskingMax')} type="number" placeholder="Max" className="input-field" />
              </div>
            </div>

            <div>
              <label className="label">Ambient Zone (°{tempUnit})</label>
              <div className="grid grid-cols-2 gap-2">
                <input {...register('ambientMin')} type="number" placeholder="Min" className="input-field" />
                <input {...register('ambientMax')} type="number" placeholder="Max" className="input-field" />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="label">Notes</label>
          <textarea {...register('notes')} rows={3} placeholder="Any notes..." className="input-field resize-none" />
        </div>

        {needsMigration && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2.5">
            <p className="text-sm font-semibold text-amber-300">Old format detected</p>
            <p className="text-xs text-amber-400/70 leading-snug">
              This aquarium was created before aquatic fields existed. Click below to convert
              existing temperature data to Water Temp and clear the humidity values, then save.
            </p>
            <button type="button" onClick={handleMigrate}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors">
              Convert to aquarium format
            </button>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
          {saving ? 'Saving...' : <><Check size={18} /> Save Changes</>}
        </button>

        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)}
            className="w-full py-2.5 text-red-500 hover:text-red-400 text-sm flex items-center justify-center gap-2 transition-colors">
            <Trash2 size={14} /> Delete Enclosure
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-300 text-center font-medium">
              Delete {enclosure.name}? This can't be undone.
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
