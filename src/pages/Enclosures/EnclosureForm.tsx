import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addEnclosure } from '@/db/hooks/useEnclosures'
import { useUIStore } from '@/store/uiStore'
import { inToCm, fToC } from '@/utils/units'
import { useState } from 'react'
import type { EnclosureType } from '@/types'

const ENCLOSURE_TYPE_OPTS: { value: EnclosureType; label: string }[] = [
  { value: 'terrarium', label: '🏠 Terrarium' },
  { value: 'aquarium', label: '🐠 Aquarium' },
  { value: 'paludarium', label: '🌿 Paludarium' },
  { value: 'vivarium', label: '🌿 Vivarium' },
  { value: 'pond', label: '💧 Pond' },
  { value: 'other', label: '📦 Other' },
]

const schema = z.object({
  name: z.string().min(1),
  enclosureType: z.string().optional(),
  lengthCm: z.coerce.number().min(1),
  widthCm: z.coerce.number().min(1),
  heightCm: z.coerce.number().min(1),
  humidityMin: z.coerce.number().min(0).max(100),
  humidityMax: z.coerce.number().min(0).max(100),
  baskingMin: z.coerce.number().optional(),
  baskingMax: z.coerce.number().optional(),
  ambientMin: z.coerce.number().optional(),
  ambientMax: z.coerce.number().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function EnclosureForm() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const { measurementUnit, tempUnit } = useUIStore()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { humidityMin: 40, humidityMax: 60 },
  })

  const toCm = (v: number) => measurementUnit === 'in' ? inToCm(v) : v
  const toC = (v: number) => tempUnit === 'F' ? fToC(v) : v

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    try {
      const zones = []
      if (data.baskingMin && data.baskingMax) {
        zones.push({ name: 'Basking', targetMin: toC(data.baskingMin), targetMax: toC(data.baskingMax) })
      }
      if (data.ambientMin && data.ambientMax) {
        zones.push({ name: 'Ambient', targetMin: toC(data.ambientMin), targetMax: toC(data.ambientMax) })
      }

      const enc = await addEnclosure({
        name: data.name,
        enclosureType: data.enclosureType as EnclosureType | undefined,
        dimensionsLWHcm: [toCm(data.lengthCm), toCm(data.widthCm), toCm(data.heightCm)],
        substrate: [],
        bulbs: [],
        temperatureZones: zones,
        humidityMin: data.humidityMin,
        humidityMax: data.humidityMax,
        notes: data.notes,
      })
      navigate(`/enclosures/${enc.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full pb-24">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-200 p-1"><ArrowLeft size={22} /></button>
        <h1 className="text-lg font-bold text-gray-100">New Enclosure</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-4">
        <div>
          <label className="label">Enclosure Name *</label>
          <input {...register('name')} type="text" placeholder="e.g. Ball Python 4x2" className="input-field" />
          {errors.name && <p className="text-red-400 text-xs mt-1">Name is required</p>}
        </div>

        <div>
          <label className="label">Type</label>
          <select {...register('enclosureType')} className="input-field">
            <option value="">Select type…</option>
            {ENCLOSURE_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Dimensions ({measurementUnit})</label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input {...register('lengthCm')} type="number" placeholder="Length" className="input-field text-center" />
              <p className="text-xs text-gray-600 text-center mt-1">L</p>
            </div>
            <div>
              <input {...register('widthCm')} type="number" placeholder="Width" className="input-field text-center" />
              <p className="text-xs text-gray-600 text-center mt-1">W</p>
            </div>
            <div>
              <input {...register('heightCm')} type="number" placeholder="Height" className="input-field text-center" />
              <p className="text-xs text-gray-600 text-center mt-1">H</p>
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

        <div>
          <label className="label">Notes</label>
          <textarea {...register('notes')} rows={3} placeholder="Any notes..." className="input-field resize-none" />
        </div>

        <button type="submit" disabled={saving} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
          {saving ? 'Saving...' : 'Save Enclosure'}
        </button>

        <style>{`.input-field { display: block; width: 100%; background: #111827; border: 1px solid #1f2937; color: #f3f4f6; border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem; outline: none; } .label { display: block; font-size: 0.75rem; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.375rem; }`}</style>
      </form>
    </div>
  )
}
