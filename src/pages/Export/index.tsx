import { useState } from 'react'
import { FileText, FileSpreadsheet, Archive, Download, Check, Loader2 } from 'lucide-react'
import { useAnimals } from '@/db/hooks/useAnimals'
import { useEnclosures } from '@/db/hooks/useEnclosures'
import { usePlants } from '@/db/hooks/usePlants'
import { useExpenses } from '@/db/hooks/useExpenses'
import { useBreedingRecords } from '@/db/hooks/useBreeding'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Animal, Enclosure, Plant, CareEvent, WeightRecord, AnimalCareSchedule, Expense, BreedingRecord } from '@/types'

// ─── Download helpers ─────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escCSV(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadCSV(filename: string, headers: string[], rows: unknown[][]) {
  const lines = [headers, ...rows].map(r => r.map(escCSV).join(','))
  triggerDownload(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), filename)
}

function downloadJSON(filename: string, data: unknown) {
  triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const stamp = () => new Date().toISOString().slice(0, 10)

function fmtD(d: string | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtShort(d: string | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function age(dob?: string): string {
  if (!dob) return '—'
  const d = Math.floor((Date.now() - new Date(dob).getTime()) / 86400000)
  if (d < 30) return `${d}d`
  if (d < 365) return `${Math.floor(d / 30)}mo`
  const y = Math.floor(d / 365); const m = Math.floor((d % 365) / 30)
  return m > 0 ? `${y}y ${m}mo` : `${y}y`
}

const toF = (c: number) => Math.round(c * 9 / 5 + 32)

// ─── CSV builders ─────────────────────────────────────────────────────────────

function csvAnimals(animals: Animal[], enclosures: Enclosure[]) {
  const em = Object.fromEntries(enclosures.map(e => [e.id, e.name]))
  downloadCSV(`vivtrack-animals-${stamp()}.csv`, [
    'Name', 'Species', 'Morph', 'Sex', 'Date of Birth', 'Age', 'Status',
    'Acquisition Date', 'Source', 'Enclosure', 'Notes',
  ], animals.map(a => [
    a.name, a.species, a.morph ?? '', a.sex, a.dateOfBirth ?? '', age(a.dateOfBirth),
    a.status, a.acquisitionDate ?? '', a.acquisitionSource ?? '',
    em[a.enclosureId ?? ''] ?? '', a.notes ?? '',
  ]))
}

function csvEnclosures(enclosures: Enclosure[]) {
  downloadCSV(`vivtrack-enclosures-${stamp()}.csv`, [
    'Name', 'Type', 'Length (cm)', 'Width (cm)', 'Height (cm)',
    'Substrate', 'Temperature Zones', 'Humidity Min %', 'Humidity Max %', 'Notes',
  ], enclosures.map(e => {
    const [l, w, h] = e.dimensionsLWHcm ?? [0, 0, 0]
    const sub = (e.substrate ?? []).map(s => `${s.customName ?? s.type}${s.depthCm ? ` ${s.depthCm}cm` : ''}`).join(' + ')
    const zones = (e.temperatureZones ?? []).map(z => `${z.name}: ${toF(z.targetMin)}-${toF(z.targetMax)}°F`).join(' | ')
    return [e.name, e.enclosureType ?? '', l, w, h, sub, zones, e.humidityMin ?? '', e.humidityMax ?? '', e.notes ?? '']
  }))
}

function csvPlants(plants: Plant[], enclosures: Enclosure[]) {
  const em = Object.fromEntries(enclosures.map(e => [e.id, e.name]))
  downloadCSV(`vivtrack-plants-${stamp()}.csv`, [
    'Name', 'Species', 'Variety', 'Type', 'Status', 'Enclosure',
    'Light Needs', 'Watering (days)', 'Last Watered', 'Animal Safe', 'Notes',
  ], plants.map(p => [
    p.name, p.species, p.variety ?? '', p.type, p.status,
    em[p.enclosureId ?? ''] ?? '', p.lightNeeds, p.wateringFrequencyDays ?? '',
    p.lastWatered ? fmtD(p.lastWatered) : '', p.animalSafe ? 'Yes' : 'Unknown', p.notes ?? '',
  ]))
}

function csvCombined(animals: Animal[], enclosures: Enclosure[], plants: Plant[]) {
  const em = Object.fromEntries(enclosures.map(e => [e.id, e.name]))
  downloadCSV(`vivtrack-collection-${stamp()}.csv`, [
    'Record Type', 'Name', 'Species / Category', 'Morph / Variety', 'Sex / Status',
    'Status / Light', 'Enclosure', 'DOB / Acquired', 'Age',
  ], [
    ...animals.map(a => ['Animal', a.name, a.species, a.morph ?? '', a.sex, a.status, em[a.enclosureId ?? ''] ?? '', a.dateOfBirth ?? a.acquisitionDate ?? '', age(a.dateOfBirth)]),
    ...enclosures.map(e => ['Enclosure', e.name, e.enclosureType ?? '', '', '', '', '', '', '']),
    ...plants.map(p => ['Plant', p.name, p.species, p.variety ?? '', p.status, p.lightNeeds, em[p.enclosureId ?? ''] ?? '', '', '']),
  ])
}

function csvCareEvents(events: CareEvent[], animals: Animal[]) {
  const am = Object.fromEntries(animals.map(a => [a.id, a.name]))
  downloadCSV(`vivtrack-care-events-${stamp()}.csv`, [
    'Date', 'Animal', 'Event Type', 'Feeding Item', 'Feeding Result',
    'Feeding Qty', 'Weight (g)', 'Shed Result', 'Duration (min)', 'Humidity %', 'Notes',
  ], events.map(e => [
    fmtD(e.occurredAt), am[e.animalId] ?? '', e.type,
    e.feedingItem ?? '', e.feedingResult ?? '', e.feedingQuantity ?? '',
    e.weightGrams ?? '', e.shedResult ?? '', e.handlingDurationMinutes ?? '',
    e.humidityAfter ?? '', e.notes ?? '',
  ]))
}

function csvBreeding(records: BreedingRecord[], animals: Animal[]) {
  const am = Object.fromEntries(animals.map(a => [a.id, a.name]))
  downloadCSV(`vivtrack-breeding-${stamp()}.csv`, [
    'Season', 'Female', 'Male', 'Status', 'Pairing Events',
    'Ovulation Date', 'Lay Date', 'Clutch Size', 'Fertile Count',
    'Hatch Date', 'Hatch Count', 'Notes',
  ], records.map(r => [
    r.seasonYear, am[r.femaleAnimalId] ?? '', am[r.maleAnimalId] ?? '',
    r.status, r.pairingEvents.length, r.ovulationDate ? fmtD(r.ovulationDate) : '',
    r.layDate ? fmtD(r.layDate) : '', r.clutchSize ?? '', r.fertileCount ?? '',
    r.hatchDate ? fmtD(r.hatchDate) : '', r.hatchCount ?? '', r.notes ?? '',
  ]))
}

function csvExpenses(expenses: Expense[], animals: Animal[]) {
  const am = Object.fromEntries(animals.map(a => [a.id, a.name]))
  downloadCSV(`vivtrack-expenses-${stamp()}.csv`, [
    'Date', 'Category', 'Description', 'Amount (USD)', 'Animal', 'Auto Source', 'Notes',
  ], expenses.map(e => [
    e.date, e.category, e.description, (e.amountCents / 100).toFixed(2),
    e.animalId ? (am[e.animalId] ?? '') : '', e.autoSource ?? '', e.notes ?? '',
  ]))
}

// ─── PDF HTML builder ─────────────────────────────────────────────────────────

const EVT: Record<string, string> = {
  feeding: 'Feeding', misting: 'Misting', watering: 'Watering',
  substrate_clean: 'Spot Clean', substrate_change: 'Substrate Change',
  full_clean: 'Full Clean', shed: 'Shed', weight: 'Weight', handling: 'Handling',
  note: 'Note', temperature_check: 'Temp Check', humidity_check: 'Humidity Check',
  custom_task: 'Custom Task',
}

function buildPDFHtml(
  animals: Animal[],
  enclosures: Enclosure[],
  allEvents: CareEvent[],
  allWeights: WeightRecord[],
  allSchedules: AnimalCareSchedule[],
): string {
  const em = Object.fromEntries(enclosures.map(e => [e.id, e.name]))
  const now = fmtD(new Date().toISOString())

  const pages = animals.map(animal => {
    const events = allEvents
      .filter(e => e.animalId === animal.id)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    const weights = allWeights
      .filter(w => w.animalId === animal.id)
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    const sched = allSchedules.find(s => s.animalId === animal.id)

    const lastFeed = events.find(e => e.type === 'feeding')
    const lastWeight = weights[0]
    const lastShed = events.find(e => e.type === 'shed')
    const lastMist = events.find(e => e.type === 'misting')
    const lastClean = events.find(e => e.type === 'substrate_clean' || e.type === 'full_clean')

    const header = (subtitle: string) => `
      <div class="ph">
        <div>
          <div class="aname">${esc(animal.name)}</div>
          <div class="aspecies">${esc(animal.species)}${animal.morph ? ` · ${esc(animal.morph)}` : ''}</div>
          <div class="asub">${subtitle}</div>
        </div>
        <div class="brand"><strong>VivTrack</strong><br>${esc(subtitle === 'Care Sheet' ? 'Care Sheet' : subtitle)}<br><span style="color:#bbb">${now}</span></div>
      </div>`

    const footer = (label: string) => `
      <div class="foot">
        <span>VivTrack · vivtrack.app</span>
        <span>${esc(animal.name)} — ${esc(label)} — ${now}</span>
      </div>`

    // ── Page 1: Profile ──────────────────────────────────────────────────────
    const profilePage = `
<div class="page">
  ${header('Care Sheet')}
  <div class="two-col">
    <div>
      <div class="sec"><div class="st">Profile</div>
        <table class="it">
          <tr><td class="k">Name</td><td>${esc(animal.name)}</td></tr>
          <tr><td class="k">Species</td><td><em>${esc(animal.species)}</em></td></tr>
          ${animal.morph ? `<tr><td class="k">Morph</td><td>${esc(animal.morph)}</td></tr>` : ''}
          <tr><td class="k">Sex</td><td>${animal.sex}</td></tr>
          ${animal.dateOfBirth ? `<tr><td class="k">Date of Birth</td><td>${fmtD(animal.dateOfBirth)} (${age(animal.dateOfBirth)})</td></tr>` : ''}
          <tr><td class="k">Status</td><td>${animal.status}</td></tr>
          ${animal.acquisitionDate ? `<tr><td class="k">Acquired</td><td>${fmtD(animal.acquisitionDate)}</td></tr>` : ''}
          ${animal.acquisitionSource ? `<tr><td class="k">Source</td><td>${esc(animal.acquisitionSource)}</td></tr>` : ''}
          ${animal.enclosureId ? `<tr><td class="k">Enclosure</td><td>${esc(em[animal.enclosureId] ?? '—')}</td></tr>` : ''}
        </table>
      </div>
      ${sched ? `
      <div class="sec"><div class="st">Care Schedule</div>
        <table class="it">
          ${sched.feedingIntervalDays ? `<tr><td class="k">Feeding</td><td>Every ${sched.feedingIntervalDays} day${sched.feedingIntervalDays !== 1 ? 's' : ''}</td></tr>` : ''}
          ${sched.mistingIntervalHours ? `<tr><td class="k">Misting</td><td>Every ${sched.mistingIntervalHours >= 24 ? sched.mistingIntervalHours / 24 + 'd' : sched.mistingIntervalHours + 'h'}</td></tr>` : ''}
          ${sched.waterChangeIntervalDays ? `<tr><td class="k">Water Change</td><td>Every ${sched.waterChangeIntervalDays} days</td></tr>` : ''}
          ${sched.substrateCleanIntervalDays ? `<tr><td class="k">Spot Clean</td><td>Every ${sched.substrateCleanIntervalDays} days</td></tr>` : ''}
          ${sched.substrateChangeIntervalDays ? `<tr><td class="k">Full Substrate</td><td>Every ${sched.substrateChangeIntervalDays} days</td></tr>` : ''}
        </table>
      </div>` : ''}
      ${animal.notes ? `<div class="sec"><div class="st">Notes</div><p class="note-text">${esc(animal.notes)}</p></div>` : ''}
    </div>
    <div>
      <div class="sec"><div class="st">Last Recorded</div>
        <table class="it">
          <tr><td class="k">Last Fed</td><td>${lastFeed ? fmtShort(lastFeed.occurredAt) + (lastFeed.feedingItem ? ' — ' + esc(lastFeed.feedingItem) : '') : '—'}</td></tr>
          <tr><td class="k">Fed Result</td><td>${lastFeed?.feedingResult ? lastFeed.feedingResult.replace('_', ' ') : '—'}</td></tr>
          <tr><td class="k">Last Weight</td><td>${lastWeight ? lastWeight.weightGrams + 'g (' + fmtShort(lastWeight.measuredAt) + ')' : '—'}</td></tr>
          <tr><td class="k">Last Shed</td><td>${lastShed ? fmtShort(lastShed.occurredAt) : '—'}</td></tr>
          <tr><td class="k">Last Misted</td><td>${lastMist ? fmtShort(lastMist.occurredAt) : '—'}</td></tr>
          <tr><td class="k">Last Cleaned</td><td>${lastClean ? fmtShort(lastClean.occurredAt) : '—'}</td></tr>
        </table>
      </div>
      ${weights.length > 0 ? `
      <div class="sec"><div class="st">Weight History</div>
        <table>
          <thead><tr><th>Date</th><th>Weight</th><th>Change</th></tr></thead>
          <tbody>
            ${weights.slice(0, 8).map((w, i) => {
              const prev = weights[i + 1]
              const diff = prev != null ? w.weightGrams - prev.weightGrams : null
              const ds = diff != null ? (diff >= 0 ? `+${diff}g` : `${diff}g`) : ''
              const dc = diff != null ? (diff >= 0 ? '#276749' : '#c1440e') : '#999'
              return `<tr><td>${fmtShort(w.measuredAt)}</td><td>${w.weightGrams}g</td><td style="color:${dc}">${ds}</td></tr>`
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>
  </div>
  ${footer('Care Sheet')}
</div>`

    // ── Page 2: Care Log ─────────────────────────────────────────────────────
    const careLogPage = `
<div class="page">
  ${header('Care Log')}
  ${events.length === 0 ? '<p style="color:#999;font-style:italic;margin:20px 0">No care events recorded.</p>' : `
  <table>
    <thead>
      <tr><th style="width:90px">Date</th><th style="width:120px">Event</th><th>Details</th><th>Notes</th></tr>
    </thead>
    <tbody>
      ${events.slice(0, 80).map(e => {
        let det = ''
        if (e.type === 'feeding') det = [e.feedingItem, e.feedingResult?.replace('_', ' '), e.feedingQuantity ? `×${e.feedingQuantity}` : ''].filter(Boolean).join(' · ')
        else if (e.type === 'weight') det = e.weightGrams ? `${e.weightGrams}g` : ''
        else if (e.type === 'shed') det = e.shedResult?.replace('_', ' ') ?? ''
        else if (e.type === 'handling') det = e.handlingDurationMinutes ? `${e.handlingDurationMinutes} min` : ''
        else if (e.type === 'humidity_check') det = e.humidityAfter ? `${e.humidityAfter}%` : ''
        return `<tr><td>${fmtShort(e.occurredAt)}</td><td>${EVT[e.type] ?? e.type}</td><td>${esc(det)}</td><td>${esc(e.notes ?? '')}</td></tr>`
      }).join('')}
    </tbody>
  </table>`}
  ${footer('Care Log')}
</div>`

    // ── Page 3: Notes / Transport ────────────────────────────────────────────
    const notesPage = `
<div class="page">
  <div class="ph" style="margin-bottom:14px">
    <div>
      <div style="font-size:14pt;font-weight:bold">Transport / Veterinary / Rehoming Record</div>
      <div style="font-size:10pt;color:#555;margin-top:3px">
        ${esc(animal.name)} &nbsp;·&nbsp; <em>${esc(animal.species)}</em>
        ${animal.sex !== 'unknown' ? ` &nbsp;·&nbsp; ${animal.sex}` : ''}
        ${animal.dateOfBirth ? ` &nbsp;·&nbsp; ${age(animal.dateOfBirth)}` : ''}
      </div>
    </div>
    <div class="brand"><strong>VivTrack</strong><br>${now}</div>
  </div>

  <div class="sec"><div class="st">Purpose</div>
    <div style="display:flex;gap:24px;margin:8px 0;flex-wrap:wrap">
      <span class="cbi"><span class="cb"></span> Veterinary Visit</span>
      <span class="cbi"><span class="cb"></span> Transport</span>
      <span class="cbi"><span class="cb"></span> Rehoming</span>
      <span class="cbi"><span class="cb"></span> Other: ___________________________</span>
    </div>
    <div style="font-size:9pt;color:#666;margin-top:4px">Date of document: _______________________________</div>
  </div>

  <div class="fg"><div class="fl">Reason for Visit / Transport</div><div class="wl">${'<div class="ln"></div>'.repeat(3)}</div></div>
  <div class="fg"><div class="fl">Animal Condition on Departure</div><div class="wl">${'<div class="ln"></div>'.repeat(3)}</div></div>

  <div class="two-col">
    <div class="fg"><div class="fl">Special Handling Instructions</div><div class="wl">${'<div class="ln"></div>'.repeat(4)}</div></div>
    <div class="fg"><div class="fl">Known Health Concerns</div><div class="wl">${'<div class="ln"></div>'.repeat(4)}</div></div>
  </div>

  <div class="fg"><div class="fl">Care Instructions for New Handler / Owner</div><div class="wl">${'<div class="ln"></div>'.repeat(3)}</div></div>

  <div class="two-col" style="margin-top:14px">
    <div>
      <div class="fl">Veterinarian</div><div class="sl"></div>
      <div class="fl" style="margin-top:10px">Clinic / Practice</div><div class="sl"></div>
      <div class="fl" style="margin-top:10px">Phone</div><div class="sl"></div>
    </div>
    <div>
      <div class="fl">Emergency Contact</div><div class="sl"></div>
      <div class="fl" style="margin-top:10px">Phone</div><div class="sl"></div>
      <div class="fl" style="margin-top:10px">Email</div><div class="sl"></div>
    </div>
  </div>

  <div style="margin-top:20px;border-top:1pt solid #ddd;padding-top:12px">
    <div class="fl" style="margin-bottom:5px">Releasing Party (Current Owner / Handler)</div>
    <div class="two-col">
      <div><div class="fl">Name</div><div class="sl"></div></div>
      <div><div class="fl">Date</div><div class="sl"></div></div>
    </div>
    <div class="sl" style="margin-top:16px"></div>
    <div style="font-size:7pt;color:#aaa;margin-top:2px">Signature</div>
  </div>

  <div style="margin-top:16px;border-top:1pt solid #ddd;padding-top:12px">
    <div class="fl" style="margin-bottom:5px">Receiving Party &nbsp;<span style="font-weight:normal;text-transform:none;letter-spacing:normal;color:#777">— Vet &nbsp;/&nbsp; Transporter &nbsp;/&nbsp; Rescue &nbsp;/&nbsp; New Owner</span></div>
    <div class="two-col">
      <div><div class="fl">Name</div><div class="sl"></div></div>
      <div><div class="fl">Date</div><div class="sl"></div></div>
    </div>
    <div class="sl" style="margin-top:16px"></div>
    <div style="font-size:7pt;color:#aaa;margin-top:2px">Signature</div>
  </div>

  ${footer('Transport Record')}
</div>`

    return profilePage + careLogPage + notesPage
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>VivTrack Care Sheets</title>
<style>
  @page { margin: 0.6in 0.65in; size: letter; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; font-size: 10pt; color: #1a1a1a; background: #fff; }
  .page { min-height: 9.3in; page-break-after: always; display: flex; flex-direction: column; }
  .page:last-child { page-break-after: avoid; }
  .ph { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 14px; }
  .aname { font-size: 22pt; font-weight: bold; line-height: 1.1; }
  .aspecies { font-size: 11pt; font-style: italic; color: #555; margin-top: 2px; }
  .asub { font-size: 9pt; color: #888; margin-top: 2px; }
  .brand { font-size: 8pt; color: #999; text-align: right; line-height: 1.5; }
  .brand strong { color: #333; font-size: 10pt; display: block; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .sec { margin-bottom: 13px; }
  .st { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: .12em; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 7px; }
  .it { width: 100%; border-collapse: collapse; }
  .it td { padding: 2px 0; font-size: 9.5pt; vertical-align: top; }
  .it td.k { color: #777; width: 95px; font-size: 8.5pt; padding-right: 8px; padding-top: 3px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f4f4f4; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: .06em; text-align: left; padding: 4px 7px; color: #555; }
  td { font-size: 9pt; padding: 3px 7px; border-bottom: .5pt solid #eaeaea; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .note-text { font-size: 9.5pt; color: #333; line-height: 1.5; }
  .fg { margin: 9px 0; }
  .fl { font-size: 7.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: .1em; color: #555; margin-bottom: 3px; }
  .wl .ln { border-bottom: 1pt solid #c0c0c0; height: 21px; }
  .sl { border-bottom: 1pt solid #999; margin-top: 22px; }
  .cb { display: inline-block; width: 10px; height: 10px; border: 1.5px solid #333; margin-right: 4px; vertical-align: middle; }
  .cbi { display: inline-flex; align-items: center; font-size: 10pt; }
  .foot { margin-top: auto; padding-top: 8px; border-top: .5pt solid #ddd; display: flex; justify-content: space-between; font-size: 7.5pt; color: #aaa; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>${pages}</body>
</html>`
}

// ─── Export Page ──────────────────────────────────────────────────────────────

export default function Export() {
  const { user } = useAuth()
  const animals = useAnimals() ?? []
  const enclosures = useEnclosures() ?? []
  const plants = usePlants() ?? []
  const expenses = useExpenses() ?? []
  const breedingRecords = useBreedingRecords() ?? []

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [exportingCSV, setExportingCSV] = useState<string | null>(null)
  const [exportingJSON, setExportingJSON] = useState(false)

  const toggle = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleAll = () => setSelectedIds(prev =>
    prev.size === animals.length ? new Set() : new Set(animals.map(a => a.id))
  )

  const runCSV = async (key: string, fn: () => void | Promise<void>) => {
    setExportingCSV(key)
    try { await fn() } finally { setTimeout(() => setExportingCSV(null), 700) }
  }

  const handlePDF = async () => {
    if (!user || selectedIds.size === 0) return
    setGeneratingPDF(true)
    const ids = [...selectedIds]
    const [evtRes, wtRes, schedRes] = await Promise.all([
      supabase.from('care_events').select('data').eq('user_id', user.id).in('animal_id', ids).order('occurred_at', { ascending: false }),
      supabase.from('weight_records').select('data').eq('user_id', user.id),
      supabase.from('animal_care_schedules').select('data').eq('user_id', user.id),
    ])
    const selectedAnimals = animals.filter(a => selectedIds.has(a.id))
    const events = (evtRes.data ?? []).map(r => r.data as CareEvent)
    const weights = (wtRes.data ?? []).map(r => r.data as WeightRecord).filter(w => ids.includes(w.animalId))
    const schedules = (schedRes.data ?? []).map(r => r.data as AnimalCareSchedule)
    const html = buildPDFHtml(selectedAnimals, enclosures, events, weights, schedules)
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print() }, 700) }
    setGeneratingPDF(false)
  }

  const handleJSON = async () => {
    if (!user) return
    setExportingJSON(true)
    const uid = user.id
    const [a, e, ce, w, p, col, br, il, ex] = await Promise.all([
      supabase.from('animals').select('data').eq('user_id', uid),
      supabase.from('enclosures').select('data').eq('user_id', uid),
      supabase.from('care_events').select('data').eq('user_id', uid).order('occurred_at', { ascending: false }),
      supabase.from('weight_records').select('data').eq('user_id', uid),
      supabase.from('plants').select('data').eq('user_id', uid),
      supabase.from('feeder_colonies').select('data').eq('user_id', uid),
      supabase.from('breeding_records').select('data').eq('user_id', uid),
      supabase.from('incubation_logs').select('data').eq('user_id', uid),
      supabase.from('expenses').select('data').eq('user_id', uid),
    ])
    downloadJSON(`vivtrack-backup-${stamp()}.json`, {
      exportDate: new Date().toISOString(),
      version: '2.0',
      animals: (a.data ?? []).map(r => r.data),
      enclosures: (e.data ?? []).map(r => r.data),
      careEvents: (ce.data ?? []).map(r => r.data),
      weightRecords: (w.data ?? []).map(r => r.data),
      plants: (p.data ?? []).map(r => r.data),
      colonies: (col.data ?? []).map(r => r.data),
      breedingRecords: (br.data ?? []).map(r => r.data),
      incubationLogs: (il.data ?? []).map(r => r.data),
      expenses: (ex.data ?? []).map(r => r.data),
    })
    setExportingJSON(false)
  }

  type CSVBtn = { key: string; label: string; desc: string; emoji: string; fn: () => void | Promise<void> }
  const csvButtons: CSVBtn[] = [
    { key: 'animals',    label: 'Animal List',         emoji: '🐍', desc: `${animals.length} animals`,        fn: () => csvAnimals(animals, enclosures) },
    { key: 'enclosures', label: 'Enclosure List',      emoji: '🏠', desc: `${enclosures.length} enclosures`,  fn: () => csvEnclosures(enclosures) },
    { key: 'plants',     label: 'Plant List',          emoji: '🌿', desc: `${plants.length} plants`,          fn: () => csvPlants(plants, enclosures) },
    { key: 'combined',   label: 'Combined Collection', emoji: '📦', desc: 'Animals + plants + enclosures',    fn: () => csvCombined(animals, enclosures, plants) },
    { key: 'care_events',label: 'Care Events',         emoji: '📋', desc: 'Full event history',               fn: async () => {
      if (!user) return
      const { data: rows } = await supabase.from('care_events').select('data').eq('user_id', user.id).order('occurred_at', { ascending: false })
      csvCareEvents((rows ?? []).map(r => r.data as CareEvent), animals)
    }},
    { key: 'breeding',   label: 'Breeding Records',    emoji: '💞', desc: `${breedingRecords.length} records`, fn: () => csvBreeding(breedingRecords, animals) },
    { key: 'expenses',   label: 'Expense Report',      emoji: '💰', desc: `${expenses.length} entries`,       fn: () => csvExpenses(expenses, animals) },
  ]

  return (
    <div className="min-h-full pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Export &amp; Backup</h1>
        <p className="text-sm text-gray-500 mt-0.5">PDF care sheets, CSV data, JSON backup</p>
      </div>

      {/* ── PDF Care Sheets ────────────────────────────────────────────────── */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-red-400" />
          <h2 className="text-base font-semibold text-gray-100">PDF Care Sheets</h2>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <p className="text-sm text-gray-400">{selectedIds.size} of {animals.length} selected</p>
            <button onClick={toggleAll} className="text-xs text-emerald-400 font-medium">
              {selectedIds.size === animals.length && animals.length > 0 ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-gray-800/60">
            {animals.length === 0
              ? <p className="text-gray-600 text-sm px-4 py-3">No animals yet.</p>
              : animals.map(a => (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    selectedIds.has(a.id) ? 'bg-emerald-500/10' : 'hover:bg-gray-800/50'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    selectedIds.has(a.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'
                  )}>
                    {selectedIds.has(a.id) && <Check size={12} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{a.name}</p>
                    <p className="text-xs text-gray-500 truncate">{a.species}{a.morph ? ` · ${a.morph}` : ''} · {a.sex}</p>
                  </div>
                </button>
              ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-800 space-y-2">
            <p className="text-xs text-gray-600">Each animal: profile page · care log · transport/vet notes form</p>
            <button
              onClick={handlePDF}
              disabled={generatingPDF || selectedIds.size === 0}
              className="w-full py-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {generatingPDF
                ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
                : <><FileText size={15} /> Generate PDF ({selectedIds.size} animal{selectedIds.size !== 1 ? 's' : ''})</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── CSV Exports ────────────────────────────────────────────────────── */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileSpreadsheet size={18} className="text-emerald-400" />
          <h2 className="text-base font-semibold text-gray-100">CSV Exports</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {csvButtons.map(btn => {
            const loading = exportingCSV === btn.key
            return (
              <button
                key={btn.key}
                onClick={() => runCSV(btn.key, btn.fn)}
                disabled={exportingCSV !== null}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 text-left hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="text-xl">{btn.emoji}</span>
                  {loading
                    ? <Loader2 size={14} className="text-emerald-400 animate-spin" />
                    : <Download size={13} className="text-gray-600" />
                  }
                </div>
                <p className="text-sm font-semibold text-gray-200">{btn.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{btn.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── JSON Backup ────────────────────────────────────────────────────── */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <Archive size={18} className="text-blue-400" />
          <h2 className="text-base font-semibold text-gray-100">Full Backup</h2>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-1">
            Complete JSON backup — all animals, enclosures, care events, weight records, plants, colonies, breeding records, incubation logs, and expenses.
          </p>
          <p className="text-xs text-gray-600 mb-3">Use to restore or transfer data to another device.</p>
          <button
            onClick={handleJSON}
            disabled={exportingJSON}
            className="w-full py-2.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {exportingJSON
              ? <><Loader2 size={16} className="animate-spin" /> Exporting...</>
              : <><Archive size={16} /> Download JSON Backup</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
