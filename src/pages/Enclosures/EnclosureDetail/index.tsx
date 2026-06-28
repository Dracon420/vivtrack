import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, AlertTriangle, Printer, Zap, Layers, Wifi, Copy, CheckCheck, Smartphone } from 'lucide-react'
import { useEnclosure, updateEnclosure } from '@/db/hooks/useEnclosures'
import { useAnimals } from '@/db/hooks/useAnimals'
import { useUIStore } from '@/store/uiStore'
import { displayDims, displayTemp } from '@/utils/units'
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
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle')
  const [nfcError, setNfcError] = useState('')
  const [copied, setCopied] = useState(false)

  const { measurementUnit, tempUnit } = useUIStore()
  const occupants = animals?.filter(a => a.enclosureId === id) ?? []
  const primaryOccupant = occupants[0]
  const qrUrl = `${window.location.origin}/scan?token=${primaryOccupant?.qrCodeToken ?? ''}`

  // Android Chrome 89+ supports Web NFC API
  const canWriteNFC = 'NDEFReader' in window
  // iPad Pro reports as Macintosh with touch points — catch it alongside iPhone/iPod
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))

  const handleAddBulb = async (bulb: BulbRecord) => {
    if (!enc) return
    await updateEnclosure(enc.id, { bulbs: [...enc.bulbs, bulb] })
  }

  const aquatic = enc ? (enc.enclosureType === 'aquarium' || enc.enclosureType === 'pond') : false

  const handleLogClean = async () => {
    if (!enc) return
    if (aquatic) {
      await updateEnclosure(enc.id, { lastWaterChange: new Date().toISOString() })
    } else {
      await updateEnclosure(enc.id, { lastSubstrateClean: new Date().toISOString() })
    }
  }

  const handleWriteNFC = async () => {
    setNfcStatus('waiting')
    setNfcError('')
    try {
      const ndef = new (window as any).NDEFReader()
      await ndef.write({ records: [{ recordType: 'url', data: qrUrl }] })
      setNfcStatus('success')
    } catch (e: any) {
      setNfcError(e?.message ?? 'Failed to write tag')
      setNfcStatus('error')
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard API unavailable
    }
  }

  if (!enc) return null

  const dims = enc.volumeGallons
    ? `${enc.volumeGallons} gal${enc.tankShape ? ` · ${enc.tankShape}` : ''}`
    : displayDims(enc.dimensionsLWHcm, measurementUnit)

  return (
    <div className="min-h-full pb-24">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-200 p-1"><ArrowLeft size={22} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-100 truncate">{enc.name}</h1>
          <p className="text-sm text-gray-400">{dims}</p>
        </div>
      </div>

      {occupants.length > 0 && (
        <div className="mx-4 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
          <p className="text-xs text-emerald-700 font-medium uppercase tracking-wider mb-2">
            {occupants.length === 1 ? 'Occupant' : `${occupants.length} Occupants`}
          </p>
          <div className="flex flex-wrap gap-2">
            {occupants.map(a => (
              <button
                key={a.id}
                onClick={() => navigate(`/animals/${a.id}`)}
                className="flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200 transition-colors"
              >
                {a.thumbnailBase64
                  ? <img src={a.thumbnailBase64} className="w-6 h-6 rounded-full object-cover border border-emerald-500/40" />
                  : <span className="text-base">🐾</span>}
                <span className="font-medium">{a.name}</span>
                <span className="text-xs text-emerald-600">{a.species}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4">
        {(['overview', 'lighting', 'qr'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}>{t === 'qr' ? 'QR & NFC' : t}</button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {tab === 'overview' && (
          <>
            {/* Environment */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Environment</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {aquatic ? (
                  <>
                    {enc.volumeGallons && (
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Volume</p>
                        <p className="font-semibold text-gray-100">{enc.volumeGallons} gal</p>
                      </div>
                    )}
                    {enc.tankShape && (
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Shape</p>
                        <p className="font-semibold text-gray-100 capitalize">{enc.tankShape}</p>
                      </div>
                    )}
                    {enc.temperatureZones.map(z => (
                      <div key={z.name}>
                        <p className="text-gray-500 text-xs mb-0.5">Water Temp</p>
                        <p className="font-semibold text-gray-100">{displayTemp(z.targetMin, tempUnit)}–{displayTemp(z.targetMax, tempUnit)}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Humidity</p>
                      <p className="font-semibold text-gray-100">{enc.humidityMin}–{enc.humidityMax}%</p>
                    </div>
                    {enc.temperatureZones.map(z => (
                      <div key={z.name}>
                        <p className="text-gray-500 text-xs mb-0.5">{z.name}</p>
                        <p className="font-semibold text-gray-100">{displayTemp(z.targetMin, tempUnit)}–{displayTemp(z.targetMax, tempUnit)}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Substrate / Media */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-gray-500" />
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {aquatic ? 'Substrate / Media' : 'Substrate'}
                  </p>
                </div>
                <button onClick={handleLogClean} className="text-xs text-emerald-400 hover:text-emerald-300">
                  {aquatic ? 'Log water change' : 'Log clean'}
                </button>
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
              {aquatic
                ? enc.lastWaterChange && <p className="text-xs text-gray-600 mt-3">Last water change: {formatDate(enc.lastWaterChange)}</p>
                : enc.lastSubstrateClean && <p className="text-xs text-gray-600 mt-3">Last cleaned: {formatDate(enc.lastSubstrateClean)}</p>
              }
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
            {primaryOccupant ? (
              <>
                {/* ── NFC Tag ───────────────────────────────────────────── */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Wifi size={16} className="text-gray-500" />
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">NFC Tag</p>
                  </div>

                  {/* Android Chrome — write directly in-app */}
                  {canWriteNFC && (
                    <div className="space-y-3">
                      {nfcStatus === 'idle' && (
                        <>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Write this enclosure's scan URL to an NFC sticker. Once written, tapping the tag instantly opens Quick Log for <strong className="text-gray-400">{primaryOccupant.name}</strong> — no camera needed.
                          </p>
                          <button
                            onClick={handleWriteNFC}
                            className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                          >
                            <Wifi size={18} /> Write NFC Tag
                          </button>
                        </>
                      )}
                      {nfcStatus === 'waiting' && (
                        <div className="text-center py-7">
                          <p className="text-4xl animate-pulse mb-3">📱</p>
                          <p className="text-sm font-semibold text-gray-200">Hold an NFC sticker to the back of your phone…</p>
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">Keep it steady until you feel a vibration or see a confirmation.</p>
                        </div>
                      )}
                      {nfcStatus === 'success' && (
                        <div className="text-center py-5">
                          <p className="text-3xl mb-2">✅</p>
                          <p className="text-sm font-semibold text-emerald-400">Tag written!</p>
                          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                            Tap the sticker with your phone to open Quick Log for {primaryOccupant.name}.
                          </p>
                          <button onClick={() => setNfcStatus('idle')} className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline">
                            Write another tag
                          </button>
                        </div>
                      )}
                      {nfcStatus === 'error' && (
                        <div className="text-center py-5">
                          <p className="text-3xl mb-2">⚠️</p>
                          <p className="text-sm text-red-400 font-semibold">Write failed</p>
                          {nfcError && <p className="text-xs text-gray-500 mt-1">{nfcError}</p>}
                          <button onClick={() => setNfcStatus('idle')} className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline">
                            Try again
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* iOS — Safari can't write NFC, guide user to NFC Tools */}
                  {isIOS && (
                    <div className="space-y-4">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-3 items-start">
                        <Smartphone size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-amber-300">Safari can't write NFC tags</p>
                          <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
                            Apple restricts NFC writing in all iOS browsers. Use the free <strong className="text-amber-300">NFC Tools</strong> app instead — setup takes about 30 seconds.
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Step 1 — Download NFC Tools</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Open the <strong className="text-gray-200">App Store</strong> and search for <strong className="text-gray-200">NFC Tools</strong> by <strong className="text-gray-200">wakdev</strong>. It's free. Install it before continuing.
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Step 2 — Copy this scan URL</p>
                        <div className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-3 font-mono text-xs text-gray-300 break-all leading-relaxed select-all">
                          {qrUrl}
                        </div>
                        <button
                          onClick={handleCopy}
                          className={cn(
                            'mt-2.5 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                            copied
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                          )}
                        >
                          {copied ? <><CheckCheck size={16} /> Copied!</> : <><Copy size={16} /> Copy URL</>}
                        </button>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Step 3 — Write to your NFC sticker</p>
                        <ol className="space-y-2">
                          {[
                            'Open NFC Tools and tap Write',
                            'Tap Add a record → URL',
                            'Paste the URL you copied → OK',
                            'Tap Write / OK, then hold your phone to the NFC sticker',
                            "You'll feel a vibration when the write is complete",
                          ].map((step, i) => (
                            <li key={i} className="flex gap-3 text-xs text-gray-400">
                              <span className="w-4 h-4 rounded-full bg-gray-700 text-gray-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-500 leading-relaxed">
                        Any <strong className="text-gray-400">NTAG213</strong>, NTAG215, or NTAG216 sticker tag works — available on Amazon for ~$5–10 per 10-pack.
                      </div>
                    </div>
                  )}

                  {/* Desktop or unsupported browser */}
                  {!canWriteNFC && !isIOS && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        In-app NFC writing works on <strong className="text-gray-400">Android Chrome 89+</strong>. On iOS, use the free <strong className="text-gray-400">NFC Tools</strong> app by wakdev (search the App Store) with the URL below.
                      </p>
                      <div className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-3 font-mono text-xs text-gray-400 break-all leading-relaxed select-all">
                        {qrUrl}
                      </div>
                      <button
                        onClick={handleCopy}
                        className={cn(
                          'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                          copied
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                        )}
                      >
                        {copied ? <><CheckCheck size={16} /> Copied!</> : <><Copy size={16} /> Copy URL</>}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── QR Code ───────────────────────────────────────────── */}
                <div className="space-y-3">
                  <div className="bg-white p-6 rounded-2xl flex justify-center" id="qr-print-area">
                    <div className="text-center">
                      <QRCode value={qrUrl} size={180} />
                      <p className="text-gray-900 font-bold text-sm mt-3">{primaryOccupant.name}</p>
                      <p className="text-gray-500 text-xs">{enc.name}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Scan to quickly log care for {primaryOccupant.name}</p>
                  <button
                    onClick={() => window.print()}
                    className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Printer size={18} /> Print QR Label
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No animal assigned to this enclosure.</p>
                <p className="text-gray-600 text-sm mt-1">Assign an animal to generate a QR code and write NFC tags.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
