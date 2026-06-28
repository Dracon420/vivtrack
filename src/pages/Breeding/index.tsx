import { useState } from 'react'
import { Plus, Trash2, ChevronRight, X, Thermometer, Droplets, Dna } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import {
  useBreedingRecords, addBreedingRecord, updateBreedingRecord, deleteBreedingRecord,
  useIncubationLog, addIncubationLog, updateIncubationLog, deleteIncubationLog,
} from '@/db/hooks/useBreeding'
import { useAnimals } from '@/db/hooks/useAnimals'
import { cn } from '@/lib/utils'
import type { Animal } from '@/types'
import type { BreedingRecord, IncubationLog, PairingResult, ClutchStatus, IncubationReading, EggStatus } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ClutchStatus, { label: string; color: string; emoji: string }> = {
  pairing:    { label: 'Pairing',    color: 'bg-blue-500/20 border-blue-500/40 text-blue-300',       emoji: '💞' },
  gravid:     { label: 'Gravid',     color: 'bg-purple-500/20 border-purple-500/40 text-purple-300', emoji: '🫄' },
  incubating: { label: 'Incubating', color: 'bg-amber-500/20 border-amber-500/40 text-amber-300',    emoji: '🥚' },
  hatched:    { label: 'Hatched',    color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', emoji: '🐣' },
  infertile:  { label: 'Infertile',  color: 'bg-gray-500/20 border-gray-500/40 text-gray-400',       emoji: '❌' },
  failed:     { label: 'Failed',     color: 'bg-red-500/20 border-red-500/40 text-red-300',          emoji: '💔' },
}

const PAIRING_RESULTS: { value: PairingResult; label: string }[] = [
  { value: 'copulation_observed', label: 'Copulation Observed' },
  { value: 'locked',              label: 'Locked Up' },
  { value: 'no_interest',         label: 'No Interest' },
  { value: 'unknown',             label: 'Unknown' },
]

const EGG_CYCLE: EggStatus['status'][] = ['unknown', 'viable', 'infertile', 'collapsed', 'hatched']
const EGG_CFG: Record<EggStatus['status'], { label: string; color: string }> = {
  unknown:   { label: '?',  color: 'bg-gray-800 text-gray-500' },
  viable:    { label: '✓',  color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  infertile: { label: '○',  color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  collapsed: { label: '✕',  color: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  hatched:   { label: '🐣', color: 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toF = (c: number) => (c * 9 / 5 + 32).toFixed(1)
const toC = (f: number) => (f - 32) * 5 / 9
const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const resultLabel = (r: PairingResult) => PAIRING_RESULTS.find(p => p.value === r)?.label ?? r

function StatusBadge({ status }: { status: ClutchStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', cfg.color)}>
      {cfg.emoji} {cfg.label}
    </span>
  )
}

// ─── Add Breeding Sheet ───────────────────────────────────────────────────────

function AddBreedingSheet({ animals, onClose }: { animals: Animal[]; onClose: () => void }) {
  const [femaleId, setFemaleId] = useState('')
  const [maleId, setMaleId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const sexIcon = (s: string) => s === 'female' ? '♀' : s === 'male' ? '♂' : '?'
  const active = animals.filter(a => a.status === 'active')

  const save = async () => {
    if (!femaleId || !maleId) return
    setSaving(true)
    try {
      await addBreedingRecord({
        femaleAnimalId: femaleId,
        maleAnimalId: maleId,
        seasonYear: year,
        pairingEvents: [],
        status: 'pairing',
        notes: notes || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div className="bg-gray-950 rounded-t-2xl p-5 pb-8 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-100">New Pairing</h2>
          <button onClick={onClose} className="text-gray-500"><X size={20} /></button>
        </div>
        <div>
          <label className="breeding-label">♀ Female</label>
          <select value={femaleId} onChange={e => setFemaleId(e.target.value)} className="breeding-input">
            <option value="">Select animal...</option>
            {active.map(a => <option key={a.id} value={a.id}>{a.name} ({sexIcon(a.sex)})</option>)}
          </select>
        </div>
        <div>
          <label className="breeding-label">♂ Male</label>
          <select value={maleId} onChange={e => setMaleId(e.target.value)} className="breeding-input">
            <option value="">Select animal...</option>
            {active.map(a => <option key={a.id} value={a.id}>{a.name} ({sexIcon(a.sex)})</option>)}
          </select>
        </div>
        <div>
          <label className="breeding-label">Season Year</label>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="breeding-input" />
        </div>
        <div>
          <label className="breeding-label">Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. morph goals, pair history..." className="breeding-input resize-none" />
        </div>
        <button
          onClick={save}
          disabled={saving || !femaleId || !maleId}
          className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Pairing'}
        </button>
      </div>
    </div>
  )
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function DetailSheet({ record, animals, onClose }: {
  record: BreedingRecord
  animals: Animal[]
  onClose: () => void
}) {
  const incubation = useIncubationLog(record.id)

  const female = animals.find(a => a.id === record.femaleAnimalId)
  const male = animals.find(a => a.id === record.maleAnimalId)

  // Pairing event form
  const [showPairingForm, setShowPairingForm] = useState(false)
  const [pairingDate, setPairingDate] = useState(new Date().toISOString().split('T')[0])
  const [pairingResult, setPairingResult] = useState<PairingResult>('copulation_observed')
  const [pairingNotes, setPairingNotes] = useState('')
  const [savingPairing, setSavingPairing] = useState(false)

  // Clutch form
  const [ovulationDate, setOvulationDate] = useState(record.ovulationDate ?? '')
  const [preLaySheds, setPreLaySheds] = useState(record.preLaySheds?.toString() ?? '')
  const [layDate, setLayDate] = useState(record.layDate ?? '')
  const [clutchSize, setClutchSize] = useState(record.clutchSize?.toString() ?? '')
  const [fertileCount, setFertileCount] = useState(record.fertileCount?.toString() ?? '')
  const [savingClutch, setSavingClutch] = useState(false)

  // Incubation setup
  const [targetTempF, setTargetTempF] = useState('88')
  const [targetHumidity, setTargetHumidity] = useState('85')
  const [incubMedium, setIncubMedium] = useState('')
  const [expectedHatch, setExpectedHatch] = useState('')
  const [creatingIncub, setCreatingIncub] = useState(false)

  // Reading form
  const [showReadingForm, setShowReadingForm] = useState(false)
  const [readTempF, setReadTempF] = useState('')
  const [readHumidity, setReadHumidity] = useState('')
  const [readNotes, setReadNotes] = useState('')
  const [savingReading, setSavingReading] = useState(false)

  // Hatch form
  const [hatchDate, setHatchDate] = useState(record.hatchDate ?? '')
  const [hatchCount, setHatchCount] = useState(record.hatchCount?.toString() ?? '')
  const [savingHatch, setSavingHatch] = useState(false)

  // Notes
  const [notes, setNotes] = useState(record.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)

  const setStatus = (status: ClutchStatus) => updateBreedingRecord(record.id, { status })

  const logPairingEvent = async () => {
    setSavingPairing(true)
    const event = { id: uuidv4(), date: pairingDate, result: pairingResult, notes: pairingNotes || undefined }
    const updated = [...record.pairingEvents, event].sort((a, b) => b.date.localeCompare(a.date))
    await updateBreedingRecord(record.id, { pairingEvents: updated })
    setPairingNotes('')
    setShowPairingForm(false)
    setSavingPairing(false)
  }

  const removePairingEvent = (id: string) =>
    updateBreedingRecord(record.id, { pairingEvents: record.pairingEvents.filter(e => e.id !== id) })

  const saveClutch = async () => {
    setSavingClutch(true)
    await updateBreedingRecord(record.id, {
      ovulationDate: ovulationDate || undefined,
      preLaySheds: preLaySheds ? parseInt(preLaySheds) : undefined,
      layDate: layDate || undefined,
      clutchSize: clutchSize ? parseInt(clutchSize) : undefined,
      fertileCount: fertileCount ? parseInt(fertileCount) : undefined,
    })
    setSavingClutch(false)
  }

  const startIncubation = async () => {
    const start = record.layDate ?? layDate
    if (!start) return
    setCreatingIncub(true)
    const eggs: EggStatus[] = Array.from({ length: record.clutchSize ?? parseInt(clutchSize) ?? 0 }, (_, i) => ({
      eggNumber: i + 1,
      status: 'unknown' as const,
    }))
    const log = await addIncubationLog({
      breedingRecordId: record.id,
      animalId: record.femaleAnimalId,
      startDate: start,
      expectedHatchDate: expectedHatch || undefined,
      incubationMedium: incubMedium || undefined,
      targetTempC: toC(parseFloat(targetTempF)),
      targetHumidityPercent: parseFloat(targetHumidity),
      readings: [],
      eggs,
    })
    await updateBreedingRecord(record.id, { incubationRecordId: log.id, status: 'incubating' })
    setCreatingIncub(false)
  }

  const addReading = async () => {
    if (!incubation || !readTempF || !readHumidity) return
    setSavingReading(true)
    const reading: IncubationReading = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      temperatureC: toC(parseFloat(readTempF)),
      humidityPercent: parseFloat(readHumidity),
      notes: readNotes || undefined,
    }
    await updateIncubationLog(incubation.id, { readings: [...incubation.readings, reading] })
    setReadTempF(''); setReadHumidity(''); setReadNotes('')
    setShowReadingForm(false)
    setSavingReading(false)
  }

  const cycleEgg = async (eggNum: number) => {
    if (!incubation) return
    const egg = incubation.eggs.find(e => e.eggNumber === eggNum)
    const idx = EGG_CYCLE.indexOf(egg?.status ?? 'unknown')
    const next = EGG_CYCLE[(idx + 1) % EGG_CYCLE.length]
    await updateIncubationLog(incubation.id, {
      eggs: incubation.eggs.map(e => e.eggNumber === eggNum ? { ...e, status: next } : e),
    })
  }

  const saveHatch = async () => {
    setSavingHatch(true)
    await updateBreedingRecord(record.id, {
      hatchDate: hatchDate || undefined,
      hatchCount: hatchCount ? parseInt(hatchCount) : undefined,
      status: 'hatched',
    })
    setSavingHatch(false)
  }

  const deleteRecord = async () => {
    if (incubation) await deleteIncubationLog(incubation.id)
    await deleteBreedingRecord(record.id)
    onClose()
  }

  const showIncub = ['incubating', 'hatched', 'infertile', 'failed'].includes(record.status)
  const incubDays = incubation ? daysSince(incubation.startDate) : 0
  const expectedDays = incubation?.expectedHatchDate
    ? Math.floor((new Date(incubation.expectedHatchDate).getTime() - new Date(incubation.startDate).getTime()) / 86400000)
    : null
  const progress = expectedDays ? Math.min(100, Math.round((incubDays / expectedDays) * 100)) : null
  const lastReading = incubation?.readings.at(-1)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div className="bg-gray-950 rounded-t-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-3 pb-3 border-b border-gray-800 shrink-0">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-3" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-100 font-bold text-base leading-tight">
                ♀ {female?.name ?? '?'} × ♂ {male?.name ?? '?'}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">{female?.species ?? '—'} · {record.seasonYear}</p>
              <div className="mt-2"><StatusBadge status={record.status} /></div>
            </div>
            <button onClick={onClose} className="text-gray-500 p-1 shrink-0"><X size={20} /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6 pb-8">

          {/* Status */}
          <section>
            <p className="bsec">Status</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_CFG) as [ClutchStatus, typeof STATUS_CFG[ClutchStatus]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    record.status === key ? cfg.color + ' ring-1 ring-current' : 'bg-gray-900 border-gray-800 text-gray-500'
                  )}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </section>

          {/* Pairing Events */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="bsec">Pairing Events</p>
              <button onClick={() => setShowPairingForm(v => !v)} className="text-xs text-emerald-400 flex items-center gap-1">
                <Plus size={13} /> Log Event
              </button>
            </div>
            {showPairingForm && (
              <div className="bg-gray-900 rounded-xl p-3 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="breeding-label">Date</label>
                    <input type="date" value={pairingDate} onChange={e => setPairingDate(e.target.value)} className="breeding-input text-sm" />
                  </div>
                  <div>
                    <label className="breeding-label">Result</label>
                    <select value={pairingResult} onChange={e => setPairingResult(e.target.value as PairingResult)} className="breeding-input text-sm">
                      {PAIRING_RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <input type="text" value={pairingNotes} onChange={e => setPairingNotes(e.target.value)} placeholder="Notes (optional)" className="breeding-input text-sm" />
                <button onClick={logPairingEvent} disabled={savingPairing} className="w-full py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {savingPairing ? 'Saving...' : 'Save Event'}
                </button>
              </div>
            )}
            {record.pairingEvents.length === 0 && !showPairingForm && (
              <p className="text-gray-600 text-sm">No pairing events yet.</p>
            )}
            <div className="space-y-2">
              {record.pairingEvents.map(ev => (
                <div key={ev.id} className="flex items-start justify-between bg-gray-900 rounded-xl px-3 py-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-200 text-sm font-medium">{fmtDate(ev.date)}</span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{resultLabel(ev.result)}</span>
                    </div>
                    {ev.notes && <p className="text-gray-500 text-xs mt-0.5">{ev.notes}</p>}
                  </div>
                  <button onClick={() => removePairingEvent(ev.id)} className="text-gray-700 hover:text-red-400 p-1 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Clutch Details */}
          <section>
            <p className="bsec">Clutch Details</p>
            <div className="bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="breeding-label">Ovulation Date</label>
                  <input type="date" value={ovulationDate} onChange={e => setOvulationDate(e.target.value)} className="breeding-input text-sm" />
                </div>
                <div>
                  <label className="breeding-label">Pre-lay Sheds</label>
                  <input type="number" min="0" value={preLaySheds} onChange={e => setPreLaySheds(e.target.value)} placeholder="0" className="breeding-input text-sm" />
                </div>
                <div>
                  <label className="breeding-label">Lay Date</label>
                  <input type="date" value={layDate} onChange={e => setLayDate(e.target.value)} className="breeding-input text-sm" />
                </div>
                <div>
                  <label className="breeding-label">Clutch Size</label>
                  <input type="number" min="1" value={clutchSize} onChange={e => setClutchSize(e.target.value)} placeholder="0" className="breeding-input text-sm" />
                </div>
              </div>
              <div>
                <label className="breeding-label">Fertile Count</label>
                <input type="number" min="0" value={fertileCount} onChange={e => setFertileCount(e.target.value)} placeholder="0" className="breeding-input text-sm" />
              </div>
              <button onClick={saveClutch} disabled={savingClutch} className="w-full py-2 bg-gray-800 text-gray-200 text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-gray-700">
                {savingClutch ? 'Saving...' : 'Save Clutch Details'}
              </button>
            </div>
          </section>

          {/* Incubation */}
          {showIncub && (
            <section>
              <p className="bsec">Incubation</p>
              {!incubation ? (
                <div className="bg-gray-900 rounded-xl p-4 space-y-3">
                  <p className="text-gray-500 text-sm">Set up an incubation log for this clutch.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="breeding-label">Target Temp (°F)</label>
                      <input type="number" step="0.1" value={targetTempF} onChange={e => setTargetTempF(e.target.value)} className="breeding-input text-sm" />
                    </div>
                    <div>
                      <label className="breeding-label">Humidity %</label>
                      <input type="number" min="0" max="100" value={targetHumidity} onChange={e => setTargetHumidity(e.target.value)} className="breeding-input text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="breeding-label">Incubation Medium</label>
                    <input type="text" value={incubMedium} onChange={e => setIncubMedium(e.target.value)} placeholder="e.g. Vermiculite 1:1, HatchRite" className="breeding-input text-sm" />
                  </div>
                  <div>
                    <label className="breeding-label">Expected Hatch Date</label>
                    <input type="date" value={expectedHatch} onChange={e => setExpectedHatch(e.target.value)} className="breeding-input text-sm" />
                  </div>
                  <button
                    onClick={startIncubation}
                    disabled={creatingIncub || (!record.layDate && !layDate)}
                    className="w-full py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-semibold rounded-xl disabled:opacity-40"
                  >
                    {creatingIncub ? 'Creating...' : '🥚 Start Incubation Log'}
                  </button>
                  {!record.layDate && !layDate && (
                    <p className="text-xs text-gray-600 text-center">Save a lay date above first</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-900 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{incubDays}</p>
                      <p className="text-xs text-gray-500">days in</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 text-center">
                      <p className="text-base font-bold text-orange-400">{toF(incubation.targetTempC)}°F</p>
                      <p className="text-xs text-gray-500">target</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 text-center">
                      <p className="text-base font-bold text-blue-400">{incubation.targetHumidityPercent}%</p>
                      <p className="text-xs text-gray-500">humidity</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {progress !== null && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Day {incubDays}</span>
                        <span>{progress}% · {expectedDays}d expected</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Last reading */}
                  {lastReading && (
                    <div className="bg-gray-900 rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1.5">Last reading · {fmtDate(lastReading.timestamp)}</p>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 text-orange-300 text-sm font-semibold">
                          <Thermometer size={14} />{toF(lastReading.temperatureC)}°F
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-300 text-sm font-semibold">
                          <Droplets size={14} />{lastReading.humidityPercent}%
                        </div>
                      </div>
                      {lastReading.notes && <p className="text-gray-500 text-xs mt-1">{lastReading.notes}</p>}
                    </div>
                  )}

                  {/* Log reading */}
                  <div>
                    <button onClick={() => setShowReadingForm(v => !v)} className="text-xs text-emerald-400 flex items-center gap-1 mb-2">
                      <Plus size={13} /> Log Reading
                    </button>
                    {showReadingForm && (
                      <div className="bg-gray-900 rounded-xl p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="breeding-label">Temp (°F)</label>
                            <input type="number" step="0.1" value={readTempF} onChange={e => setReadTempF(e.target.value)} placeholder="88.0" className="breeding-input text-sm" />
                          </div>
                          <div>
                            <label className="breeding-label">Humidity %</label>
                            <input type="number" min="0" max="100" value={readHumidity} onChange={e => setReadHumidity(e.target.value)} placeholder="85" className="breeding-input text-sm" />
                          </div>
                        </div>
                        <input type="text" value={readNotes} onChange={e => setReadNotes(e.target.value)} placeholder="Notes (optional)" className="breeding-input text-sm" />
                        <button onClick={addReading} disabled={savingReading || !readTempF || !readHumidity} className="w-full py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                          {savingReading ? 'Saving...' : 'Save Reading'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reading history */}
                  {incubation.readings.length > 1 && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-600 mb-1">Reading history ({incubation.readings.length} total)</p>
                      {[...incubation.readings].reverse().slice(0, 7).map(r => (
                        <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-900 last:border-0">
                          <span className="text-gray-500 text-xs">{fmtDate(r.timestamp)}</span>
                          <div className="flex gap-3 text-xs">
                            <span className="text-orange-300">{toF(r.temperatureC)}°F</span>
                            <span className="text-blue-300">{r.humidityPercent}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Egg grid */}
                  {incubation.eggs.length > 0 && (
                    <div>
                      <p className="bsec mb-2">Egg Status <span className="text-gray-600 normal-case font-normal">(tap to update)</span></p>
                      <div className="grid grid-cols-6 gap-1.5 mb-2">
                        {incubation.eggs.map(egg => {
                          const cfg = EGG_CFG[egg.status]
                          return (
                            <button
                              key={egg.eggNumber}
                              onClick={() => cycleEgg(egg.eggNumber)}
                              className={cn('flex flex-col items-center justify-center rounded-lg aspect-square text-xs font-bold', cfg.color)}
                            >
                              <span>{cfg.label}</span>
                              <span className="text-[9px] opacity-50">#{egg.eggNumber}</span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {EGG_CYCLE.map(s => (
                          <span key={s} className={cn('text-[10px] px-2 py-0.5 rounded-full', EGG_CFG[s].color)}>
                            {EGG_CFG[s].label} {s}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        {(['viable', 'infertile', 'collapsed', 'hatched'] as const).map(s => {
                          const count = incubation.eggs.filter(e => e.status === s).length
                          return count > 0 ? (
                            <div key={s} className={cn('rounded-lg py-1.5', EGG_CFG[s].color)}>
                              <p className="text-lg font-bold">{count}</p>
                              <p className="text-[10px] opacity-70 capitalize">{s}</p>
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Hatch Record */}
          {(record.status === 'incubating' || record.status === 'hatched') && (
            <section>
              <p className="bsec">Hatch Record</p>
              <div className="bg-gray-900 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="breeding-label">Hatch Date</label>
                    <input type="date" value={hatchDate} onChange={e => setHatchDate(e.target.value)} className="breeding-input text-sm" />
                  </div>
                  <div>
                    <label className="breeding-label">Hatch Count</label>
                    <input type="number" min="0" value={hatchCount} onChange={e => setHatchCount(e.target.value)} placeholder="0" className="breeding-input text-sm" />
                  </div>
                </div>
                <button onClick={saveHatch} disabled={savingHatch} className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold rounded-xl disabled:opacity-50">
                  {savingHatch ? 'Saving...' : '🐣 Save Hatch Record'}
                </button>
              </div>
            </section>
          )}

          {/* Notes */}
          <section>
            <p className="bsec">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="General notes about this pairing..."
              className="breeding-input resize-none text-sm mb-2"
            />
            <button
              onClick={async () => { setSavingNotes(true); await updateBreedingRecord(record.id, { notes: notes || undefined }); setSavingNotes(false) }}
              disabled={savingNotes}
              className="w-full py-2 bg-gray-800 text-gray-300 text-sm rounded-lg disabled:opacity-50 hover:bg-gray-700"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </section>

          {/* Delete */}
          <section>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="text-red-400/70 text-sm flex items-center gap-1.5">
                <Trash2 size={14} /> Delete Record
              </button>
            ) : (
              <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 flex items-center gap-3">
                <p className="text-red-300 text-sm flex-1">Delete this breeding record?</p>
                <button onClick={deleteRecord} className="text-red-400 font-semibold text-sm">Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="text-gray-500 text-sm">Cancel</button>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}

// ─── Breeding Card ────────────────────────────────────────────────────────────

function BreedingCard({ record, animals, onClick }: {
  record: BreedingRecord
  animals: Animal[]
  onClick: () => void
}) {
  const female = animals.find(a => a.id === record.femaleAnimalId)
  const male = animals.find(a => a.id === record.maleAnimalId)
  const last = record.pairingEvents[0]

  return (
    <button onClick={onClick} className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-left hover:bg-gray-800/80 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-gray-100 font-semibold text-sm truncate">
            ♀ {female?.name ?? '?'} × ♂ {male?.name ?? '?'}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{female?.species ?? '—'} · {record.seasonYear}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      {record.status === 'incubating' && record.layDate && (
        <div className="mt-2.5 flex items-center gap-3 text-xs text-gray-500">
          <span>Day {daysSince(record.layDate)}</span>
          {record.clutchSize && <span>· {record.clutchSize} eggs</span>}
          {record.fertileCount !== undefined && <span>· {record.fertileCount} fertile</span>}
        </div>
      )}

      {record.status === 'hatched' && (
        <p className="text-xs text-emerald-400 mt-2">
          🐣 {record.hatchCount ?? '?'} hatched{record.hatchDate ? ` · ${fmtDate(record.hatchDate)}` : ''}
        </p>
      )}

      {['pairing', 'gravid'].includes(record.status) && last && (
        <p className="text-xs text-gray-500 mt-2">
          Last paired {fmtDate(last.date)} · {resultLabel(last.result)}
        </p>
      )}

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-800">
        <span className="text-xs text-gray-600">{record.pairingEvents.length} event{record.pairingEvents.length !== 1 ? 's' : ''}</span>
        <ChevronRight size={14} className="text-gray-600" />
      </div>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'active' | 'incubating' | 'all'

export default function Breeding() {
  const records = useBreedingRecords()
  const animals = useAnimals() ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('active')

  const selectedRecord = records?.find(r => r.id === selectedId)

  const filtered = tab === 'all'
    ? (records ?? [])
    : tab === 'incubating'
    ? (records ?? []).filter(r => r.status === 'incubating')
    : (records ?? []).filter(r => ['pairing', 'gravid'].includes(r.status))

  const tabs: [Tab, string][] = [['active', 'Active'], ['incubating', '🥚 Incubating'], ['all', 'All']]

  return (
    <div className="min-h-full pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Breeding</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pairings, clutches &amp; incubation</p>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-all', tab === key ? 'bg-gray-800 text-gray-100' : 'text-gray-500')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {records === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Dna size={40} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">No {tab !== 'all' ? tab + ' ' : ''}records</p>
            <p className="text-gray-600 text-sm mt-1">Tap + to add a pairing</p>
          </div>
        ) : (
          filtered.map(r => (
            <BreedingCard key={r.id} record={r} animals={animals} onClick={() => setSelectedId(r.id)} />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 z-40"
      >
        <Plus size={24} className="text-white" />
      </button>

      {showAdd && <AddBreedingSheet animals={animals} onClose={() => setShowAdd(false)} />}
      {selectedRecord && <DetailSheet record={selectedRecord} animals={animals} onClose={() => setSelectedId(null)} />}

      <style>{`
        .breeding-label { display:block; font-size:0.7rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem; }
        .breeding-input { width:100%; background:#111827; border:1px solid #1f2937; color:#f3f4f6; border-radius:0.625rem; padding:0.5rem 0.625rem; outline:none; }
        .breeding-input:focus { border-color:rgba(16,185,129,0.5); }
        select.breeding-input option { background:#111827; }
        .bsec { font-size:0.7rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
      `}</style>
    </div>
  )
}
