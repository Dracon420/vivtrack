import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEnclosure, updateEnclosure, deleteEnclosure } from '@/db/hooks/useEnclosures'

const schema = z.object({
  name: z.string().min(1),
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

const S = `.input-field{display:block;width:100%;background:#111827;border:1px solid #1f2937;color:#f3f4f6;border-radius:.75rem;padding:.75rem 1rem;font-size:.875rem;outline:none}.input-field:focus{border-color:rgba(16,185,129,.5)}.label{display:block;font-size:.75rem;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.375rem}`

export default function EditEnclosure() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const enclosure = useEnclosure(id)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [seeded, setSeeded] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { humidityMin: 40, humidityMax: 60 },
  })

  useEffect(() => {
    if (!enclosure || seeded) return
    const basking = enclosure.temperatureZones.find(z => z.name === 'Basking')
    const ambient = enclosure.temperatureZones.find(z => z.name === 'Ambient')
    reset({
      name: enclosure.name,
      lengthCm: enclosure.dimensionsLWHcm[0],
      widthCm: enclosure.dimensionsLWHcm[1],
      heightCm: enclosure.dimensionsLWHcm[2],
      humidityMin: enclosure.humidityMin,
      humidityMax: enclosure.humidityMax,
      baskingMin: basking?.targetMin,
      baskingMax: basking?.targetMax,
      ambientMin: ambient?.targetMin,
      ambientMax: ambient?.targetMax,
      notes: enclosure.notes ?? '',
    })
    setSeeded(true)
  }, [enclosure, reset, seeded])

  const onSubmit = async (data: FormValues) => {
    if (!id) return
    setSaving(true)
    try {
      const zones = []
      if (data.baskingMin && data.baskingMax) {
        zones.push({ name: 'Basking', targetMin: data.baskingMin, targetMax: data.baskingMax })
      }
      if (data.ambientMin && data.ambientMax) {
        zones.push({ name: 'Ambient', targetMin: data.ambientMin, targetMax: data.ambientMax })
      }
      await updateEnclosure(id, {
        name: data.name,
        dimensionsLWHcm: [data.lengthCm, data.widthCm, data.heightCm],
        temperatureZones: zones,
        humidityMin: data.humidityMin,
        humidityMax: data.humidityMax,
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

        <div>
          <label className="label">Dimensions (cm)</label>
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
          <label className="label">Basking Zone (°C)</label>
          <div className="grid grid-cols-2 gap-2">
            <input {...register('baskingMin')} type="number" placeholder="Min" className="input-field" />
            <input {...register('baskingMax')} type="number" placeholder="Max" className="input-field" />
          </div>
        </div>

        <div>
          <label className="label">Ambient Zone (°C)</label>
          <div className="grid grid-cols-2 gap-2">
            <input {...register('ambientMin')} type="number" placeholder="Min" className="input-field" />
            <input {...register('ambientMax')} type="number" placeholder="Max" className="input-field" />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea {...register('notes')} rows={3} placeholder="Any notes..." className="input-field resize-none" />
        </div>

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
