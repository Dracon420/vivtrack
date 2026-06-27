import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, Thermometer, Droplets, Sun, Utensils, Scale } from 'lucide-react'
import { useAnimal } from '@/db/hooks/useAnimals'
import { useCareEvents } from '@/db/hooks/useCareEvents'
import { useWeightRecords } from '@/db/hooks/useWeightRecords'
import { useActiveMedications } from '@/db/hooks/useMedications'
import { formatDate, timeAgo } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'
import type { CareEvent, Animal } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const statusColors: Record<Animal['status'], string> = {
  active: 'bg-emerald-500/20 text-emerald-300',
  quarantine: 'bg-amber-500/20 text-amber-300',
  brumation: 'bg-blue-500/20 text-blue-300',
  deceased: 'bg-gray-500/20 text-gray-400',
  rehomed: 'bg-purple-500/20 text-purple-300',
}

const eventIcon: Record<string, string> = {
  feeding: '🍖', watering: '🫙', misting: '💧', substrate_clean: '🧹',
  full_clean: '✨', shed: '🔄', handling: '🤝', weight: '⚖️',
  medication_dose: '💊', vet_visit: '🏥', note: '📝',
  brumation_check: '❄️', temperature_check: '🌡️', humidity_check: '☁️',
}

type Tab = 'overview' | 'care_log' | 'weight' | 'medications' | 'notes'

function CareEventRow({ event }: { event: CareEvent }) {
  const icon = eventIcon[event.type] ?? '📋'
  const label = event.type.replace(/_/g, ' ')
  const detail = event.feedingItem
    ? `${event.feedingItem}${event.feedingResult ? ' — ' + event.feedingResult : ''}`
    : event.weightGrams
    ? `${event.weightGrams}g`
    : event.notes?.slice(0, 60) ?? ''

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-800 last:border-0">
      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-200 capitalize">{label}</p>
          <p className="text-xs text-gray-600 shrink-0">{timeAgo(event.occurredAt)}</p>
        </div>
        {detail && <p className="text-xs text-gray-500 mt-0.5 truncate">{detail}</p>}
      </div>
    </div>
  )
}

function OverviewTab({ animal }: { animal: Animal }) {
  const age = animal.dateOfBirth
    ? Math.floor((Date.now() - new Date(animal.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <Row label="Species" value={animal.species} />
        {animal.morph && <Row label="Morph" value={animal.morph} />}
        <Row label="Sex" value={animal.sex} />
        {age !== null && <Row label="Age" value={`${age} years old`} />}
        {animal.dateOfBirth && <Row label="Date of Birth" value={formatDate(animal.dateOfBirth)} />}
        <Row label="Acquired" value={formatDate(animal.acquisitionDate)} />
        {animal.acquisitionSource && <Row label="Source" value={animal.acquisitionSource} />}
        <Row label="Status" value={
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[animal.status])}>
            {animal.status}
          </span>
        } />
      </div>

      {/* NFC/QR token */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">QR Token</p>
        <p className="text-xs text-gray-600 font-mono break-all">{animal.qrCodeToken}</p>
        {animal.rfidTag && (
          <>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-3 mb-1">NFC Tag</p>
            <p className="text-xs text-gray-600 font-mono">{animal.rfidTag}</p>
          </>
        )}
      </div>

      {animal.notes && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{animal.notes}</p>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-500 font-medium shrink-0">{label}</span>
      {typeof value === 'string'
        ? <span className="text-sm text-gray-200 text-right capitalize">{value}</span>
        : value}
    </div>
  )
}

function WeightTab({ animalId }: { animalId: string }) {
  const records = useWeightRecords(animalId)

  if (!records?.length) {
    return (
      <div className="text-center py-12">
        <Scale size={36} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">No weight records yet</p>
        <p className="text-gray-600 text-sm mt-1">Log a weight entry to start tracking growth.</p>
      </div>
    )
  }

  const chartData = records.map(r => ({
    date: formatDate(r.measuredAt),
    weight: r.weightGrams,
  }))

  const latest = records[records.length - 1]
  const first = records[0]
  const gain = latest.weightGrams - first.weightGrams

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-100">{latest.weightGrams}g</p>
          <p className="text-xs text-gray-500 mt-0.5">Current weight</p>
        </div>
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className={cn('text-2xl font-bold', gain >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {gain >= 0 ? '+' : ''}{gain}g
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Total gain</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-4">Weight Over Time</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit="g" />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#10b981' }}
            />
            <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {[...records].reverse().map(r => (
          <div key={r.id} className="flex justify-between items-center bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-gray-100">{r.weightGrams}g</span>
            <span className="text-xs text-gray-500">{formatDate(r.measuredAt)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MedsTab({ animalId }: { animalId: string }) {
  const meds = useActiveMedications(animalId)

  if (!meds?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 font-medium">No active medications</p>
        <p className="text-gray-600 text-sm mt-1">Add a medication from a vet visit record.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {meds.map(med => (
        <div key={med.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <p className="font-semibold text-gray-100">{med.drugName}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Active</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">{med.doseAmount} {med.doseUnit} • {med.frequency}</p>
          {med.endDate && <p className="text-xs text-gray-600 mt-1">Until {formatDate(med.endDate)}</p>}
          <p className="text-xs text-gray-600 mt-1">{med.administeredDates.length} doses given</p>
        </div>
      ))}
    </div>
  )
}

export default function AnimalProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const animal = useAnimal(id)
  const events = useCareEvents(id, 30)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  if (!animal) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'care_log', label: 'Care Log' },
    { key: 'weight', label: 'Weight' },
    { key: 'medications', label: 'Meds' },
  ]

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-200 p-1">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-100 truncate">{animal.name}</h1>
          <p className="text-sm text-gray-400 truncate">{animal.species}{animal.morph ? ` — ${animal.morph}` : ''}</p>
        </div>
        <button onClick={() => navigate(`/animals/${animal.id}/edit`)} className="text-gray-400 hover:text-gray-200 p-1">
          <Edit2 size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4">
        {activeTab === 'overview' && <OverviewTab animal={animal} />}
        {activeTab === 'care_log' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
            {!events?.length ? (
              <p className="text-gray-500 text-sm text-center py-8">No care events yet. Tap + to log one.</p>
            ) : events.map(e => <CareEventRow key={e.id} event={e} />)}
          </div>
        )}
        {activeTab === 'weight' && <WeightTab animalId={animal.id} />}
        {activeTab === 'medications' && <MedsTab animalId={animal.id} />}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate(`/animals/${animal.id}/log`)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
