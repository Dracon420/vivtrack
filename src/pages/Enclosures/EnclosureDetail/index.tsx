import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, AlertTriangle, Printer, Zap, Layers } from 'lucide-react'
import { useEnclosure, updateEnclosure } from '@/db/hooks/useEnclosures'
import { useAnimals } from '@/db/hooks/useAnimals'
import { daysUntil, formatDate } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import QRCode from 'react-qr-code'
import type { BulbRecord } from '@/types'
import { v4 as uuidv4 } from 'uuid'

function BulbCard({ bulb }: { bulb: BulbRecord }) {
  const daysLeft = bulb.replacementDueDate ? daysUntil(bulb.replacementDueDate) : null
  const isExpired = daysLeft !== null && daysLeft <= 0
  const isSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30

  return (
    <div className={cn(
      'bg-gray-800 border rounded-xl p-3',
      isExpired ? 'border-red-500/40' : isSoon ? 'border-amber-500/30' : 'border-gray-700'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-200 capitalize">{bulb.type.replace(/_/g, ' ')}</p>
          {bulb.brand && <p className="text-xs text-gray-500">{bulb.brand}</p>}
        </div>
        {(isExpired || isSoon) && (
          <AlertTriangle size={14} className={isExpired ? 'text-red-400' : 'text-amber-400'} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {bulb.wattage && <span className="text-gray-400">{bulb.wattage}W</span>}
        {bulb.uvbRating && <span className="text-blue-400">UVB {bulb.uvbRating}</span>}
        {bulb.installedDate && <span className="text-gray-600">In: {formatDate(bulb.installedDate)}</span>}
        {daysLeft !== null && (
          <span className={cn('font-medium', isExpired ? 'text-red-400' : isSoon ? 'text-amber-400' : 'text-emerald-400')}>
            {isExpired ? `Expired ${Math.abs(daysLeft)}d ago` : `Replace in ${daysLeft}d`}
          </span>
        )}
      </div>
    </div>
  )
}

function AddBulbForm({ onAdd, onClose }: { onAdd: (bulb: BulbRecord) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    type: 'basking' as BulbRecord['type'],
    brand: '', wattage: '', uvbRating: '',
    installedDate: new Date().toISOString().split('T')[0],
    lifespanMonths: '', replacementDueDate: '',
  })

  const handle = () => {
    const lifespan = form.lifespanMonths ? parseInt(form.lifespanMonths) : undefined
    let replacementDueDate = form.replacementDueDate || undefined
    if (lifespan && form.installedDate && !replacementDueDate) {
      const d = new Date(form.installedDate)
      d.setMonth(d.getMonth() + lifespan)
      replacementDueDate = d.toISOString().split('T')[0]
    }
    onAdd({
      id: uuidv4(),
      type: form.type,
      brand: form.brand || undefined,
      wattage: form.wattage ? parseInt(form.wattage) : undefined,
      uvbRating: form.uvbRating || undefined,
      installedDate: form.installedDate,
      lifespanMonths: lifespan,
      replacementDueDate,
    })
    onClose()
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div>
        <label className="label">Bulb Type</label>
        <select value={form.type} onChange={f('type') as React.ChangeEventHandler<HTMLSelectElement>} className="input-field">
          <option value="basking">Basking</option>
          <option value="uvb">UVB</option>
          <option value="heat_panel">Heat Panel</option>
          <option value="ceramic_heat_emitter">Ceramic Heat Emitter</option>
          <option value="deep_heat_projector">Deep Heat Projector</option>
          <option value="led">LED</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Brand</label>
          <input type="text" value={form.brand} onChange={f('brand')} placeholder="Arcadia, Zoo Med..." className="input-field" />
        </div>
        <div>
          <label className="label">Wattage</label>
          <input type="number" value={form.wattage} onChange={f('wattage')} placeholder="100" className="input-field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">UVB Rating</label>
          <input type="text" value={form.uvbRating} onChange={f('uvbRating')} placeholder="10.0, 5.0..." className="input-field" />
        </div>
        <div>
          <label className="label">Lifespan (months)</label>
          <input type="number" value={form.lifespanMonths} onChange={f('lifespanMonths')} placeholder="6" className="input-field" />
        </div>
      </div>
      <div>
        <label className="label">Installed Date</label>
        <input type="date" value={form.installedDate} onChange={f('installedDate')} className="input-field" />
      </div>
      <div className="flex gap-2">
        <button onClick={handle} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl text-sm">Save Bulb</button>
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm">Cancel</button>
      </div>
      <style>{`.input-field { display: block; width: 100%; background: #1f2937; border: 1px solid #374151; color: #f3f4f6; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.8125rem; outline: none; } .label { display: block; font-size: 0.7rem; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }`}</style>
    </div>
  )
}

type Tab = 'overview' | 'lighting' | 'qr'

export default function EnclosureDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const enc = useEnclosure(id)
  const animals = useAnimals()
  const [tab, setTab] = useState<Tab>('overview')
  const [addingBulb, setAddingBulb] = useState(false)

  const occupant = animals?.find(a => a.enclosureId === id)
  const qrUrl = `${window.location.origin}/scan?token=${occupant?.qrCodeToken ?? ''}`

  const handleAddBulb = async (bulb: BulbRecord) => {
    if (!enc) return
    await updateEnclosure(enc.id, { bulbs: [...enc.bulbs, bulb] })
  }

  const handleLogClean = async () => {
    if (!enc) return
    await updateEnclosure(enc.id, { lastSubstrateClean: new Date().toISOString() })
  }

  if (!enc) return null

  const dims = `${enc.dimensionsLWHcm[0]} × ${enc.dimensionsLWHcm[1]} × ${enc.dimensionsLWHcm[2]} cm`

  return (
    <div className="min-h-full pb-24">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-200 p-1"><ArrowLeft size={22} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-100 truncate">{enc.name}</h1>
          <p className="text-sm text-gray-400">{dims}</p>
        </div>
      </div>

      {occupant && (
        <div className="mx-4 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-lg">🐾</span>
          <p className="text-sm text-emerald-300 font-medium">{occupant.name}</p>
          <p className="text-xs text-emerald-600 ml-auto">{occupant.species}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4">
        {(['overview', 'lighting', 'qr'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}>{t === 'qr' ? 'QR Label' : t}</button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {tab === 'overview' && (
          <>
            {/* Environment */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Environment</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Humidity</p>
                  <p className="font-semibold text-gray-100">{enc.humidityMin}–{enc.humidityMax}%</p>
                </div>
                {enc.temperatureZones.map(z => (
                  <div key={z.name}>
                    <p className="text-gray-500 text-xs mb-0.5">{z.name}</p>
                    <p className="font-semibold text-gray-100">{z.targetMin}–{z.targetMax}°C</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Substrate */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-gray-500" />
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Substrate</p>
                </div>
                <button onClick={handleLogClean} className="text-xs text-emerald-400 hover:text-emerald-300">Log clean</button>
              </div>
              {enc.substrate.length === 0 ? (
                <p className="text-sm text-gray-600">No substrate layers added yet.</p>
              ) : (
                <div className="space-y-2">
                  {enc.substrate.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize">{s.type.replace(/_/g, ' ')}{s.customName ? ` (${s.customName})` : ''}</span>
                      <span className="text-gray-500">{s.depthCm}cm{s.ratioPercent ? ` / ${s.ratioPercent}%` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
              {enc.lastSubstrateClean && (
                <p className="text-xs text-gray-600 mt-3">Last cleaned: {formatDate(enc.lastSubstrateClean)}</p>
              )}
            </div>

            {/* Bulbs */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-gray-500" />
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Lighting & Heating</p>
                </div>
                <button onClick={() => setAddingBulb(true)} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                  <Plus size={14} /> Add
                </button>
              </div>

              {addingBulb && <AddBulbForm onAdd={handleAddBulb} onClose={() => setAddingBulb(false)} />}

              {enc.bulbs.length === 0 && !addingBulb ? (
                <p className="text-sm text-gray-600">No bulbs tracked yet.</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {enc.bulbs.map(b => <BulbCard key={b.id} bulb={b} />)}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'lighting' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Lighting Schedule</p>
            {enc.lightingSchedule ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Lights ON</span>
                  <span className="text-gray-100">{enc.lightingSchedule.onTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lights OFF</span>
                  <span className="text-gray-100">{enc.lightingSchedule.offTime}</span>
                </div>
                {enc.lightingSchedule.uvbOnTime && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">UVB ON</span>
                      <span className="text-gray-100">{enc.lightingSchedule.uvbOnTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">UVB OFF</span>
                      <span className="text-gray-100">{enc.lightingSchedule.uvbOffTime}</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No lighting schedule set.</p>
            )}
          </div>
        )}

        {tab === 'qr' && (
          <div className="space-y-4">
            {occupant ? (
              <>
                <div className="bg-white p-6 rounded-2xl flex justify-center" id="qr-print-area">
                  <div className="text-center">
                    <QRCode value={qrUrl} size={180} />
                    <p className="text-gray-900 font-bold text-sm mt-3">{occupant.name}</p>
                    <p className="text-gray-500 text-xs">{enc.name}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">Scan to quickly log care for {occupant.name}</p>
                <button
                  onClick={() => window.print()}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer size={18} /> Print QR Label
                </button>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">QR URL</p>
                  <p className="text-xs text-gray-600 break-all font-mono">{qrUrl}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No animal assigned to this enclosure.</p>
                <p className="text-gray-600 text-sm mt-1">Assign an animal to generate a QR code.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
