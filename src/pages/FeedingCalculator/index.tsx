import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, FolderInput, FileText, Pencil, Trash2, X, Check, AlertCircle, Download, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

// ── Types ─────────────────────────────────────────────────────────────────────

type FrequencyType = 'daily' | 'every_x_days' | 'weekly' | 'biweekly' | 'monthly'
type SpeciesCategory =
  | 'snake' | 'lizard' | 'chelonian' | 'amphibian'
  | 'tarantula' | 'spider' | 'scorpion' | 'insect'
  | 'fish' | 'mammal' | 'bird' | 'other'

interface FeederLine {
  id: string
  feederKey: string
  feederSize?: string
  feederAmount: number
  feedingFrequency: FrequencyType
  feedingIntervalDays: number
  costPer: number
  costPerQty: number
}

interface CalcEntry {
  id: string
  appAnimalId?: string
  name: string
  species: string
  speciesType: SpeciesCategory
  feeders: FeederLine[]
}

// ── Feeder Catalog ────────────────────────────────────────────────────────────

interface CatalogEntry { label: string; sizes?: string[] }

const FEEDER_CATALOG: Record<string, CatalogEntry> = {
  rat:          { label: 'Rat',                    sizes: ['Pinky', 'Fuzzy', 'Pup', 'Small', 'Medium', 'Large', 'Jumbo'] },
  mouse:        { label: 'Mouse',                  sizes: ['Pinky', 'Fuzzy', 'Pup', 'Small', 'Medium', 'Large', 'Jumbo'] },
  asf:          { label: 'African Soft Fur (ASF)', sizes: ['Pinky', 'Fuzzy', 'Pup', 'Small', 'Medium', 'Large', 'Jumbo'] },
  rabbit:       { label: 'Rabbit',                 sizes: ['Kit', 'Small', 'Medium', 'Large'] },
  gerbil:       { label: 'Gerbil',                 sizes: ['Pinky', 'Fuzzy', 'Adult'] },
  hamster:      { label: 'Hamster',                sizes: ['Pinky', 'Fuzzy', 'Adult'] },
  quail:        { label: 'Quail',                  sizes: ['Day-old Chick', 'Small', 'Medium', 'Large'] },
  chick:        { label: 'Domestic Chick',         sizes: ['Day-old', 'Small', 'Medium', 'Large'] },
  dubia:        { label: 'Dubia Roach',            sizes: ['Small (¼")', 'Medium (½")', 'Large (¾")', 'Jumbo (1"+)'] },
  red_runner:   { label: 'Red Runner Roach',       sizes: ['Small', 'Medium', 'Large'] },
  shadow_roach: { label: 'Shadow Roach',           sizes: ['Small', 'Medium', 'Large'] },
  ivory_roach:  { label: 'Ivory Head Roach',       sizes: ['Small', 'Medium', 'Large'] },
  deathshead:   { label: "Death's Head Roach",     sizes: ['Small', 'Medium', 'Large'] },
  hissing:      { label: 'Hissing Cockroach',      sizes: ['Small', 'Medium', 'Large'] },
  discoid:      { label: 'Discoid Roach',          sizes: ['Small', 'Medium', 'Large'] },
  turkistan:    { label: 'Turkistan Roach',        sizes: ['Small', 'Medium', 'Large'] },
  lobster_roach:{ label: 'Lobster Roach',          sizes: ['Small', 'Medium', 'Large'] },
  giant_cave:   { label: 'Giant Cave Roach',       sizes: ['Small', 'Medium', 'Large'] },
  mealworm:     { label: 'Mealworm',               sizes: ['Small', 'Medium', 'Large'] },
  superworm:    { label: 'Superworm',              sizes: ['Small', 'Medium', 'Large'] },
  morio:        { label: 'Giant Mealworm (Morio)' },
  waxworm:      { label: 'Waxworm' },
  butterworm:   { label: 'Butterworm' },
  hornworm:     { label: 'Hornworm',               sizes: ['Small', 'Medium', 'Large'] },
  silkworm:     { label: 'Silkworm',               sizes: ['Small', 'Medium', 'Large'] },
  bsfl:         { label: 'BSFL / Calci Worm',      sizes: ['Small', 'Medium', 'Large'] },
  earthworm:    { label: 'Earthworm',              sizes: ['Small', 'Medium', 'Large'] },
  nightcrawler: { label: 'Nightcrawler',           sizes: ['Small', 'Medium', 'Large'] },
  cricket:      { label: 'Cricket',                sizes: ['Pinhead', 'Small (¼")', 'Medium (½")', 'Large (¾")', 'Adult'] },
  locust:       { label: 'Locust',                 sizes: ['Small', 'Medium', 'Large', 'Adult'] },
  grasshopper:  { label: 'Grasshopper',            sizes: ['Small', 'Medium', 'Large'] },
  fruit_fly:    { label: 'Fruit Fly',              sizes: ['Melanogaster', 'Hydei'] },
}

const FEEDER_GROUPS: { label: string; emoji: string; keys: string[] }[] = [
  { label: 'Rodents',  emoji: '🐭', keys: ['rat', 'mouse', 'asf', 'rabbit', 'gerbil', 'hamster'] },
  { label: 'Birds',    emoji: '🐦', keys: ['quail', 'chick'] },
  { label: 'Roaches',  emoji: '🪲', keys: ['dubia', 'red_runner', 'shadow_roach', 'ivory_roach', 'deathshead', 'hissing', 'discoid', 'turkistan', 'lobster_roach', 'giant_cave'] },
  { label: 'Worms',    emoji: '🪱', keys: ['mealworm', 'superworm', 'morio', 'waxworm', 'butterworm', 'hornworm', 'silkworm', 'bsfl', 'earthworm', 'nightcrawler'] },
  { label: 'Insects',  emoji: '🦗', keys: ['cricket', 'locust', 'grasshopper', 'fruit_fly'] },
]

function feederLabel(key: string, size?: string): string {
  const cat = FEEDER_CATALOG[key]
  if (!cat) return key
  return size ? `${size} ${cat.label}` : cat.label
}

// ── Species constants ─────────────────────────────────────────────────────────

const SPECIES_ORDER: SpeciesCategory[] = [
  'snake', 'lizard', 'chelonian', 'amphibian',
  'tarantula', 'spider', 'scorpion', 'insect',
  'fish', 'mammal', 'bird', 'other',
]
const SPECIES_LABEL: Record<SpeciesCategory, string> = {
  snake: 'Snakes', lizard: 'Lizards & Geckos', chelonian: 'Turtles & Tortoises',
  amphibian: 'Amphibians', tarantula: 'Tarantulas', spider: 'Spiders',
  scorpion: 'Scorpions', insect: 'Insects & Invertebrates',
  fish: 'Fish', mammal: 'Mammals', bird: 'Birds', other: 'Other',
}
const SPECIES_EMOJI: Record<SpeciesCategory, string> = {
  snake: '🐍', lizard: '🦎', chelonian: '🐢', amphibian: '🐸',
  tarantula: '🕷️', spider: '🕷️', scorpion: '🦂', insect: '🐛',
  fish: '🐠', mammal: '🦡', bird: '🦜', other: '🐾',
}

const FREQ_LABEL: Record<FrequencyType, string> = {
  daily: 'Daily', every_x_days: 'Every X days',
  weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly',
}
const FREQ_OPTIONS: FrequencyType[] = ['daily', 'every_x_days', 'weekly', 'biweekly', 'monthly']

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectSpeciesType(species: string): SpeciesCategory {
  const s = (species ?? '').toLowerCase()
  if (/python|boa|snake|corn snake|king snake|hognose|milk snake|rosy boa|sand boa|carpet/.test(s)) return 'snake'
  if (/gecko|dragon|skink|iguana|monitor|tegu|chameleon|anole|uromastyx|frilled|water dragon|lizard/.test(s)) return 'lizard'
  if (/tortoise|turtle/.test(s)) return 'chelonian'
  if (/frog|toad|axolotl|salamander|newt|dart frog|tree frog|pacman|amphibian/.test(s)) return 'amphibian'
  if (/tarantula/.test(s)) return 'tarantula'
  if (/huntsman|spider/.test(s)) return 'spider'
  if (/scorpion/.test(s)) return 'scorpion'
  if (/mantis|cockroach|stick insect|millipede|hissing|insect/.test(s)) return 'insect'
  if (/fish|betta|tetra|guppy|oscar|cichlid|koi|goldfish|clownfish|angelfish|discus|pleco|corydoras/.test(s)) return 'fish'
  if (/hedgehog|sugar glider|chinchilla|ferret|prairie dog|opossum|degu/.test(s)) return 'mammal'
  if (/parrot|cockatiel|conure|budgerigar|bird|african grey/.test(s)) return 'bird'
  return 'other'
}

function lineFeedings(line: FeederLine): number {
  switch (line.feedingFrequency) {
    case 'daily': return 30
    case 'every_x_days': return Math.max(1, Math.round(30 / Math.max(1, line.feedingIntervalDays)))
    case 'weekly': return 4
    case 'biweekly': return 2
    case 'monthly': return 1
  }
}
function lineMonthlyQty(line: FeederLine): number { return line.feederAmount * lineFeedings(line) }
function lineMonthlyCost(line: FeederLine): number {
  if (!line.costPer || !line.costPerQty) return 0
  return (lineMonthlyQty(line) / line.costPerQty) * line.costPer
}
function entryMonthlyCost(entry: CalcEntry): number {
  return entry.feeders.reduce((s, f) => s + lineMonthlyCost(f), 0)
}

function freqFromDays(days: number): { freq: FrequencyType; interval: number } {
  if (days <= 1) return { freq: 'daily', interval: 1 }
  if (days === 7) return { freq: 'weekly', interval: 7 }
  if (days >= 14 && days <= 16) return { freq: 'biweekly', interval: 14 }
  if (days >= 28) return { freq: 'monthly', interval: 30 }
  return { freq: 'every_x_days', interval: days }
}

// Build summary lines sorted by catalog group + size order
interface SummaryLine { groupLabel: string; groupEmoji: string; label: string; qty: number; cost: number }
function buildSortedSummary(totals: Map<string, { qty: number; cost: number }>): SummaryLine[] {
  const result: SummaryLine[] = []
  for (const group of FEEDER_GROUPS) {
    for (const key of group.keys) {
      const cat = FEEDER_CATALOG[key]
      if (!cat) continue
      if (cat.sizes?.length) {
        for (const sz of cat.sizes) {
          const lbl = `${sz} ${cat.label}`
          const row = totals.get(lbl)
          if (row) result.push({ groupLabel: group.label, groupEmoji: group.emoji, label: lbl, ...row })
        }
      } else {
        const row = totals.get(cat.label)
        if (row) result.push({ groupLabel: group.label, groupEmoji: group.emoji, label: cat.label, ...row })
      }
    }
  }
  for (const [label, row] of totals) {
    if (!result.find(r => r.label === label))
      result.push({ groupLabel: 'Other', groupEmoji: '🐾', label, ...row })
  }
  return result
}

const STORAGE_KEY = 'vivtrack-feeding-calc-v3'
const loadEntries = (): CalcEntry[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
const saveEntries = (e: CalcEntry[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(e))

// ── Tap stepper ───────────────────────────────────────────────────────────────

function Stepper({ value, min = 1, max = 999, onChange }: {
  value: number; min?: number; max?: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-5">
      <button type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-11 h-11 rounded-full bg-gray-800 border border-gray-700 text-gray-200 text-2xl font-bold flex items-center justify-center hover:bg-gray-700 active:scale-95 disabled:opacity-40 transition-all select-none">
        −
      </button>
      <span className="text-3xl font-bold text-gray-100 w-14 text-center tabular-nums">{value}</span>
      <button type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-11 h-11 rounded-full bg-gray-800 border border-gray-700 text-gray-200 text-2xl font-bold flex items-center justify-center hover:bg-gray-700 active:scale-95 disabled:opacity-40 transition-all select-none">
        +
      </button>
    </div>
  )
}

// ── Feeder Picker ─────────────────────────────────────────────────────────────

function FeederPicker({ feederKey, feederSize, onChange }: {
  feederKey: string; feederSize?: string; onChange: (k: string, s?: string) => void
}) {
  const cat = FEEDER_CATALOG[feederKey]
  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Feeder Type</label>
      <div className="space-y-2.5">
        {FEEDER_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <span>{group.emoji}</span> {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.keys.map(k => (
                <button key={k} type="button" onClick={() => onChange(k, undefined)}
                  className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                    feederKey === k
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                  )}>
                  {FEEDER_CATALOG[k].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {cat?.sizes?.length ? (
        <div>
          <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Size</label>
          <div className="flex flex-wrap gap-1.5">
            {cat.sizes.map(sz => (
              <button key={sz} type="button" onClick={() => onChange(feederKey, sz)}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                  feederSize === sz
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                )}>
                {sz}
              </button>
            ))}
          </div>
          {!feederSize && <p className="text-[11px] text-amber-400 mt-1">Select a size</p>}
        </div>
      ) : null}

      {feederKey && (
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
          <Check size={13} className="text-emerald-400 shrink-0" />
          <span className="text-sm text-gray-200 font-medium">{feederLabel(feederKey, feederSize)}</span>
        </div>
      )}
    </div>
  )
}

// ── Feeder Sub-Sheet ──────────────────────────────────────────────────────────

const BLANK_LINE: Omit<FeederLine, 'id'> = {
  feederKey: '', feederSize: undefined, feederAmount: 1,
  feedingFrequency: 'weekly', feedingIntervalDays: 7, costPer: 0, costPerQty: 1,
}

function FeederSubSheet({ initial, onSave, onClose }: {
  initial?: FeederLine; onSave: (l: FeederLine) => void; onClose: () => void
}) {
  const [form, setForm] = useState<Omit<FeederLine, 'id'>>(() =>
    initial
      ? { feederKey: initial.feederKey, feederSize: initial.feederSize, feederAmount: initial.feederAmount, feedingFrequency: initial.feedingFrequency, feedingIntervalDays: initial.feedingIntervalDays, costPer: initial.costPer, costPerQty: initial.costPerQty }
      : { ...BLANK_LINE }
  )

  const cat = FEEDER_CATALOG[form.feederKey]
  const needsSize = !!cat?.sizes?.length
  const valid = form.feederKey && (!needsSize || !!form.feederSize)

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-gray-900 border-t border-gray-700 rounded-t-2xl px-4 pt-4 pb-safe">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-100">{initial ? 'Edit Feeder' : 'Add Feeder'}</h3>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
        </div>

        <div className="space-y-5 max-h-[75vh] overflow-y-auto pb-2">
          <FeederPicker
            feederKey={form.feederKey}
            feederSize={form.feederSize}
            onChange={(k, s) => setForm(f => ({ ...f, feederKey: k, feederSize: s }))}
          />

          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Amount Per Feeding</label>
            <Stepper value={form.feederAmount} min={1} max={999}
              onChange={v => setForm(f => ({ ...f, feederAmount: v }))} />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Frequency</label>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {FREQ_OPTIONS.map(f => (
                <button key={f} type="button" onClick={() => setForm(prev => ({ ...prev, feedingFrequency: f }))}
                  className={cn('py-2 rounded-xl text-xs font-semibold border transition-colors',
                    form.feedingFrequency === f
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  )}>
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>
            {form.feedingFrequency === 'every_x_days' && (
              <div>
                <p className="text-xs text-gray-500 text-center mb-2">Feed every how many days?</p>
                <Stepper value={form.feedingIntervalDays} min={2} max={365}
                  onChange={v => setForm(f => ({ ...f, feedingIntervalDays: v }))} />
                <p className="text-xs text-gray-600 text-center mt-1.5">
                  = approx. {Math.round(30 / form.feedingIntervalDays)} feedings/month
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">
              Cost <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">$</span>
              <input type="number" min="0" step="0.01" value={form.costPer || ''}
                onChange={e => setForm(f => ({ ...f, costPer: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500" />
              <span className="text-gray-400 text-sm">for</span>
              <input type="number" min="1" value={form.costPerQty}
                onChange={e => setForm(f => ({ ...f, costPerQty: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-20 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 text-center focus:outline-none focus:border-emerald-500" />
              <span className="text-gray-400 text-sm truncate">
                {feederLabel(form.feederKey, form.feederSize) || 'feeders'}
              </span>
            </div>
          </div>

          <button onClick={() => valid && onSave({ id: initial?.id ?? uuidv4(), ...form })} disabled={!valid}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            <Check size={16} /> {initial ? 'Update Feeder' : 'Add This Feeder'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Entry Form Sheet ──────────────────────────────────────────────────────────

function EntryForm({ initial, onSave, onClose }: {
  initial?: CalcEntry; onSave: (e: CalcEntry) => void; onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [species, setSpecies] = useState(initial?.species ?? '')
  const [speciesType, setSpeciesType] = useState<SpeciesCategory>(initial?.speciesType ?? 'other')
  const [feeders, setFeeders] = useState<FeederLine[]>(initial?.feeders ?? [])
  const [feederEdit, setFeederEdit] = useState<FeederLine | null>(null)
  const [addingFeeder, setAddingFeeder] = useState(false)

  const handleSpeciesChange = (val: string) => {
    setSpecies(val)
    setSpeciesType(detectSpeciesType(val))
  }

  const saveFeederLine = (line: FeederLine) => {
    setFeeders(prev => {
      const idx = prev.findIndex(f => f.id === line.id)
      return idx >= 0 ? prev.map(f => f.id === line.id ? line : f) : [...prev, line]
    })
    setFeederEdit(null)
    setAddingFeeder(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl px-4 pt-4 pb-safe">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-100">{initial ? 'Edit Animal' : 'Add Animal'}</h2>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
        </div>

        <div className="space-y-3 max-h-[75vh] overflow-y-auto pb-2">
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Animal Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Noodle"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Species</label>
            <input value={species} onChange={e => handleSpeciesChange(e.target.value)} placeholder="e.g. Ball Python"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">
              Group <span className="text-gray-600 normal-case font-normal">(auto-detected)</span>
            </label>
            <select value={speciesType} onChange={e => setSpeciesType(e.target.value as SpeciesCategory)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500">
              {SPECIES_ORDER.map(t => (
                <option key={t} value={t}>{SPECIES_EMOJI[t]} {SPECIES_LABEL[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Feeders</label>
              {feeders.length > 0 && <span className="text-[10px] text-gray-600">{feeders.length} added</span>}
            </div>
            {feeders.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-1.5">No feeders added yet</p>
            ) : (
              <div className="space-y-1.5 mb-2">
                {feeders.map(line => {
                  const freqStr = line.feedingFrequency === 'every_x_days'
                    ? `every ${line.feedingIntervalDays}d`
                    : FREQ_LABEL[line.feedingFrequency].toLowerCase()
                  return (
                    <div key={line.id} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 font-medium truncate">{feederLabel(line.feederKey, line.feederSize)}</p>
                        <p className="text-xs text-gray-500">{line.feederAmount}× · {freqStr} · {lineMonthlyQty(line)}/mo</p>
                      </div>
                      <button onClick={() => setFeederEdit(line)} className="text-gray-500 hover:text-gray-200 p-1 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setFeeders(prev => prev.filter(f => f.id !== line.id))} className="text-red-500 hover:text-red-400 p-1 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <button onClick={() => setAddingFeeder(true)}
              className="w-full py-2 border border-dashed border-gray-700 hover:border-emerald-600 text-gray-500 hover:text-emerald-400 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5">
              <Plus size={13} /> Add Feeder
            </button>
          </div>

          <button
            onClick={() => name.trim() && onSave({ id: initial?.id ?? uuidv4(), appAnimalId: initial?.appAnimalId, name, species, speciesType, feeders })}
            disabled={!name.trim()}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            <Check size={16} /> {initial ? 'Save Changes' : 'Add Animal'}
          </button>
        </div>
      </div>

      {(addingFeeder || feederEdit) && (
        <FeederSubSheet
          initial={feederEdit ?? undefined}
          onSave={saveFeederLine}
          onClose={() => { setFeederEdit(null); setAddingFeeder(false) }}
        />
      )}
    </>
  )
}

// ── Import Sheet ──────────────────────────────────────────────────────────────

interface AppAnimal { id: string; name: string; species: string; status: string }
interface AppSchedule { animalId: string; feedingIntervalDays?: number }

function ImportSheet({ existingIds, onImport, onClose }: {
  existingIds: Set<string>; onImport: (entries: CalcEntry[]) => void; onClose: () => void
}) {
  const { user } = useAuth()
  const [animals, setAnimals] = useState<AppAnimal[]>([])
  const [schedules, setSchedules] = useState<AppSchedule[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase.from('animals').select('data').eq('user_id', user.id),
      supabase.from('animal_care_schedules').select('data').eq('user_id', user.id),
    ]).then(([aRes, sRes]) => {
      setAnimals(
        (aRes.data ?? []).map(r => r.data as AppAnimal)
          .filter(a => a.status === 'active' || a.status === 'quarantine')
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setSchedules((sRes.data ?? []).map(r => r.data as AppSchedule))
      setLoading(false)
    })
  }, [user?.id])

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleImport = () => {
    const entries: CalcEntry[] = []
    for (const id of selected) {
      const animal = animals.find(a => a.id === id)
      if (!animal) continue
      entries.push({
        id: uuidv4(), appAnimalId: animal.id,
        name: animal.name, species: animal.species,
        speciesType: detectSpeciesType(animal.species),
        feeders: [],
      })
    }
    onImport(entries)
  }

  const available = animals.filter(a => !existingIds.has(a.id))

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-100">Import from App</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select animals — add feeders after import</p>
          </div>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : available.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">
              {animals.length === 0 ? 'No active animals in the app.' : 'All app animals are already in the calculator.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {available.map(animal => {
                const isSel = selected.has(animal.id)
                const st = detectSpeciesType(animal.species)
                return (
                  <button key={animal.id} onClick={() => toggle(animal.id)}
                    className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors text-left',
                      isSel ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-gray-800 border-gray-700'
                    )}>
                    <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      isSel ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'
                    )}>
                      {isSel && <Check size={11} className="text-white" />}
                    </div>
                    <span className="text-lg shrink-0">{SPECIES_EMOJI[st]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{animal.name}</p>
                      <p className="text-xs text-gray-500 truncate">{animal.species}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-800 shrink-0">
          <button onClick={handleImport} disabled={selected.size === 0}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-colors">
            {selected.size === 0 ? 'Select animals above' : `Import ${selected.size} animal${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </>
  )
}

// ── PDF Generation — two sections ─────────────────────────────────────────────

async function generatePDF(entries: CalcEntry[]): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 14
  const rightEdge = pageW - margin

  const C = {
    emerald: [16, 185, 129]  as [number,number,number],
    dark:    [17, 24, 39]    as [number,number,number],
    fg:      [31, 41, 55]    as [number,number,number],
    mid:     [75, 85, 99]    as [number,number,number],
    light:   [220, 220, 220] as [number,number,number],
    sub:     [156, 163, 175] as [number,number,number],
    stripe:  [245, 250, 247] as [number,number,number],
  }

  const dateStr = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const drawPageHeader = (title: string, subtitle: string) => {
    doc.setFillColor(...C.dark); doc.rect(0, 0, pageW, 32, 'F')
    doc.setTextColor(...C.emerald); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text('VivTrack', margin, 12)
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
    doc.text(title, margin + 36, 12)
    doc.setFontSize(8); doc.setTextColor(...C.sub)
    doc.text(subtitle, margin, 22)
    doc.text(dateStr, margin, 28)
    return 42
  }

  // ── SECTION 1: Animal Feeding Chart ────────────────────────────────────────
  let y = drawPageHeader('Animal Feeding Chart', 'Your personal feeding records — keep this copy for yourself')

  const grouped = new Map<SpeciesCategory, CalcEntry[]>()
  for (const e of entries) {
    const arr = grouped.get(e.speciesType) ?? []; arr.push(e); grouped.set(e.speciesType, arr)
  }

  for (const type of SPECIES_ORDER) {
    const items = grouped.get(type)
    if (!items?.length) continue
    if (y > 258) { doc.addPage(); y = 20 }

    // Species group header
    doc.setFillColor(...C.stripe)
    doc.rect(margin - 2, y - 4, rightEdge - margin + 4, 8, 'F')
    doc.setTextColor(...C.emerald); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text(SPECIES_LABEL[type], margin, y)
    y += 7

    // Column headers
    const cols = { animal: margin, feeder: margin + 44, freq: margin + 107, qty: margin + 143, cost: margin + 165 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.mid)
    doc.text('Animal / Species', cols.animal, y)
    doc.text('Feeder', cols.feeder, y)
    doc.text('Frequency', cols.freq, y)
    doc.text('Mo. Qty', cols.qty, y)
    doc.text('Mo. Cost', cols.cost, y)
    y += 3.5
    doc.setDrawColor(...C.light); doc.line(margin, y, rightEdge, y); y += 4

    for (const item of items) {
      const validFeeders = item.feeders.filter(f => f.feederKey)
      if (!validFeeders.length) continue
      if (y > 268) { doc.addPage(); y = 20 }

      for (let i = 0; i < validFeeders.length; i++) {
        const line = validFeeders[i]
        const freqStr = line.feedingFrequency === 'every_x_days'
          ? `Every ${line.feedingIntervalDays}d`
          : FREQ_LABEL[line.feedingFrequency]
        const cost = lineMonthlyCost(line)
        const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s

        if (i === 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.fg)
          doc.text(trunc(item.name, 18), cols.animal, y)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.mid)
          doc.text(trunc(item.species, 22), cols.animal, y + 4)
        }

        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.fg)
        doc.text(`${line.feederAmount}× ${trunc(feederLabel(line.feederKey, line.feederSize), 22)}`, cols.feeder, y)
        doc.text(freqStr, cols.freq, y)
        doc.setFont('helvetica', 'bold')
        doc.text(lineMonthlyQty(line).toString(), cols.qty, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(cost > 0 ? 16 : 156, cost > 0 ? 185 : 163, cost > 0 ? 129 : 175)
        doc.text(cost > 0 ? `$${cost.toFixed(2)}` : '—', cols.cost, y)
        doc.setTextColor(...C.fg)

        y += i === 0 ? 8 : 6
        if (y > 272) { doc.addPage(); y = 20 }
      }

      doc.setDrawColor(235, 235, 235); doc.line(margin, y - 1, rightEdge, y - 1)
      y += 2
    }
    y += 3
  }

  // ── SECTION 2: Monthly Supplier Order (new page) ───────────────────────────
  doc.addPage()
  y = drawPageHeader('Monthly Supplier Order', 'Forward this page to your feeder supplier as your monthly order')

  // Pre-build totals
  const totals = new Map<string, { qty: number; cost: number }>()
  for (const entry of entries) {
    for (const line of entry.feeders) {
      if (!line.feederKey) continue
      const lbl = feederLabel(line.feederKey, line.feederSize)
      const cur = totals.get(lbl) ?? { qty: 0, cost: 0 }
      totals.set(lbl, { qty: cur.qty + lineMonthlyQty(line), cost: cur.cost + lineMonthlyCost(line) })
    }
  }

  const summaryLines = buildSortedSummary(totals)
  const supplierGroups = [...new Set(summaryLines.map(l => l.groupLabel))]

  let grandTotal = 0
  const anyCosts = summaryLines.some(l => l.cost > 0)

  for (const groupName of supplierGroups) {
    const lines = summaryLines.filter(l => l.groupLabel === groupName)
    if (!lines.length) continue
    if (y > 255) { doc.addPage(); y = 20 }

    // Group header
    const groupEmoji = lines[0].groupEmoji
    doc.setFillColor(...C.dark)
    doc.rect(margin - 2, y - 4, rightEdge - margin + 4, 9, 'F')
    doc.setTextColor(...C.emerald); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5)
    doc.text(`${groupEmoji}  ${groupName.toUpperCase()}`, margin, y)
    y += 9

    // Column headers
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.mid)
    doc.text('Feeder', margin + 2, y)
    doc.text('Monthly Qty', margin + 120, y)
    if (anyCosts) doc.text('Est. Cost', margin + 155, y)
    y += 3.5
    doc.setDrawColor(...C.light); doc.line(margin, y, rightEdge, y); y += 5

    let groupCost = 0
    for (const line of lines) {
      if (y > 272) { doc.addPage(); y = 20 }

      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.fg)
      doc.text(line.label, margin + 2, y)

      // Large quantity display
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...C.emerald)
      doc.text(line.qty.toString(), margin + 120, y)
      doc.setFontSize(7.5); doc.setTextColor(...C.mid)
      doc.text('units', margin + 132, y)

      if (anyCosts && line.cost > 0) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.mid)
        doc.text(`$${line.cost.toFixed(2)}`, margin + 155, y)
        groupCost += line.cost
      }

      doc.setDrawColor(235, 235, 235); doc.line(margin, y + 3, rightEdge, y + 3)
      y += 9
    }

    if (anyCosts && groupCost > 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.mid)
      doc.text(`${groupName} subtotal: $${groupCost.toFixed(2)}`, rightEdge, y, { align: 'right' })
      grandTotal += groupCost
      y += 6
    }

    y += 4
  }

  // Grand total
  if (anyCosts && grandTotal > 0) {
    if (y > 265) { doc.addPage(); y = 20 }
    doc.setDrawColor(...C.emerald); doc.setLineWidth(0.5)
    doc.line(margin, y, rightEdge, y); doc.setLineWidth(0.2); y += 8
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...C.emerald)
    doc.text(`Estimated Monthly Total: $${grandTotal.toFixed(2)}`, margin, y)
  }

  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

// ── PDF Ready Overlay ─────────────────────────────────────────────────────────

function PdfReady({ blobUrl, onClose }: { blobUrl: string; onClose: () => void }) {
  const filename = `vivtrack-feeding-order-${new Date().toISOString().slice(0, 10)}.pdf`
  return (
    <div className="fixed inset-0 z-[80] bg-gray-950/95 flex flex-col items-center justify-center px-6">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 p-2">
        <X size={22} />
      </button>

      <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-5">
        <FileText size={32} className="text-emerald-400" />
      </div>

      <h2 className="text-xl font-bold text-gray-100 mb-1">PDF Ready</h2>
      <p className="text-sm text-gray-500 text-center mb-2">
        Two sections: your feeding chart + a clean supplier order form.
      </p>
      <p className="text-xs text-gray-600 text-center mb-8">
        Supplier order is sorted by feeder type so your supplier can pick each feeder together.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => window.open(blobUrl, '_blank')}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all text-sm">
          <ExternalLink size={18} /> Open PDF
        </button>
        <a href={blobUrl} download={filename}
          className="w-full py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
          <Download size={16} /> Download PDF
        </a>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Sheet = null | 'add' | 'import'

export default function FeedingCalculator() {
  const [entries, setEntries] = useState<CalcEntry[]>(() => loadEntries())
  const [sheet, setSheet] = useState<Sheet>(null)
  const [editEntry, setEditEntry] = useState<CalcEntry | undefined>()
  const [exporting, setExporting] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { saveEntries(entries) }, [entries])
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }, [pdfUrl])

  const upsertEntry = useCallback((entry: CalcEntry) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id)
      return idx >= 0 ? prev.map(e => e.id === entry.id ? entry : e) : [...prev, entry]
    })
    setSheet(null); setEditEntry(undefined)
  }, [])

  const handleImport = useCallback((imported: CalcEntry[]) => {
    setEntries(prev => [...prev, ...imported]); setSheet(null)
  }, [])

  const handleExport = async () => {
    if (entries.length === 0) return
    setExporting(true)
    try {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      setPdfUrl(await generatePDF(entries))
    } finally { setExporting(false) }
  }

  const grouped = useMemo(() => {
    const map = new Map<SpeciesCategory, CalcEntry[]>()
    for (const e of entries) {
      const arr = map.get(e.speciesType) ?? []; arr.push(e); map.set(e.speciesType, arr)
    }
    return map
  }, [entries])

  const feederTotals = useMemo(() => {
    const map = new Map<string, { qty: number; cost: number }>()
    for (const e of entries) {
      for (const line of e.feeders) {
        if (!line.feederKey) continue
        const key = feederLabel(line.feederKey, line.feederSize)
        const cur = map.get(key) ?? { qty: 0, cost: 0 }
        map.set(key, { qty: cur.qty + lineMonthlyQty(line), cost: cur.cost + lineMonthlyCost(line) })
      }
    }
    return map
  }, [entries])

  const sortedSummary = useMemo(() => buildSortedSummary(feederTotals), [feederTotals])
  const summaryGroups = useMemo(() => [...new Set(sortedSummary.map(l => l.groupLabel))], [sortedSummary])

  const totalMonthlyCost = useMemo(() =>
    sortedSummary.reduce((s, l) => s + l.cost, 0), [sortedSummary])

  const existingAppIds = useMemo(() =>
    new Set(entries.map(e => e.appAnimalId).filter(Boolean) as string[]), [entries])

  const needsFeederInfo = entries.filter(e =>
    e.feeders.length === 0 || e.feeders.some(f => !f.feederKey || (FEEDER_CATALOG[f.feederKey]?.sizes?.length && !f.feederSize))
  )

  return (
    <div className="min-h-full pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Feeding Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monthly feeder needs &amp; costs</p>
      </div>

      <div className="px-4 flex gap-2 mb-4">
        <button onClick={() => { setEditEntry(undefined); setSheet('add') }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={16} /> Add Animal
        </button>
        <button onClick={() => setSheet('import')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-xl border border-gray-700 transition-colors">
          <FolderInput size={16} /> Import from App
        </button>
      </div>

      {needsFeederInfo.length > 0 && (
        <div className="mx-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300">
            {needsFeederInfo.length} animal{needsFeederInfo.length !== 1 ? 's' : ''} need{needsFeederInfo.length === 1 ? 's' : ''} feeder info — tap Edit.
          </p>
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <span className="text-5xl mb-4">🍖</span>
          <p className="text-gray-300 font-semibold text-lg">No animals yet</p>
          <p className="text-gray-500 text-sm mt-1">Add animals or import from the app, then add as many feeders per animal as needed.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="px-4 space-y-4 mb-4">
          {SPECIES_ORDER.filter(t => grouped.has(t)).map(type => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{SPECIES_EMOJI[type]}</span>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{SPECIES_LABEL[type]}</p>
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-600">{grouped.get(type)!.length}</span>
              </div>
              <div className="space-y-2">
                {grouped.get(type)!.map(entry => {
                  const cost = entryMonthlyCost(entry)
                  const hasValid = entry.feeders.some(f => f.feederKey)
                  const missing = entry.feeders.length === 0 ||
                    entry.feeders.some(f => !f.feederKey || (FEEDER_CATALOG[f.feederKey]?.sizes?.length && !f.feederSize))

                  return (
                    <div key={entry.id} className={cn('bg-gray-900 border rounded-xl px-4 py-3', missing ? 'border-amber-500/30' : 'border-gray-800')}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-100 truncate">{entry.name}</p>
                            {missing && <AlertCircle size={13} className="text-amber-400 shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{entry.species}</p>
                        </div>
                        {hasValid && cost > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500">est./mo</p>
                            <p className="text-sm font-bold text-emerald-400">${cost.toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      {entry.feeders.length === 0 ? (
                        <p className="text-xs text-amber-400 mb-2">No feeders added — tap Edit</p>
                      ) : (
                        <div className="space-y-0.5 mb-2">
                          {entry.feeders.map(line => {
                            const lbl = line.feederKey ? feederLabel(line.feederKey, line.feederSize) : '(feeder not set)'
                            const missingSize = line.feederKey && FEEDER_CATALOG[line.feederKey]?.sizes?.length && !line.feederSize
                            const freqStr = line.feedingFrequency === 'every_x_days'
                              ? `every ${line.feedingIntervalDays}d`
                              : FREQ_LABEL[line.feedingFrequency].toLowerCase()
                            const bad = !line.feederKey || missingSize
                            return (
                              <div key={line.id} className="flex items-center justify-between">
                                <span className={cn('text-xs', bad ? 'text-amber-400' : 'text-gray-400')}>
                                  {line.feederKey ? `${line.feederAmount}× ` : ''}{lbl}
                                  {missingSize ? ' — size not set' : ''}
                                  {!bad && <span className="text-gray-600"> · {freqStr}</span>}
                                </span>
                                {!bad && (
                                  <span className="text-xs font-semibold text-emerald-400 ml-2 shrink-0">
                                    {lineMonthlyQty(line)}/mo
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                        <button onClick={() => { setEditEntry(entry); setSheet('add') }}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => setDeleteId(entry.id)}
                          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors ml-auto">
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly Summary — organized by catalog group */}
      {sortedSummary.length > 0 && (
        <div className="mx-4 mb-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monthly Order Summary</p>
          <p className="text-[11px] text-gray-600 mb-3">Sorted by feeder type — same as supplier order</p>

          {summaryGroups.map(groupName => {
            const lines = sortedSummary.filter(l => l.groupLabel === groupName)
            const emoji = lines[0].groupEmoji
            return (
              <div key={groupName} className="mb-3">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <span>{emoji}</span> {groupName}
                </p>
                <div className="space-y-1">
                  {lines.map(line => (
                    <div key={line.label} className="flex items-center justify-between pl-4">
                      <span className="text-sm text-gray-200 truncate flex-1 mr-3">{line.label}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-emerald-400">{line.qty}</span>
                        {line.cost > 0 && <span className="text-xs text-gray-500">${line.cost.toFixed(2)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {totalMonthlyCost > 0 && (
            <>
              <div className="h-px bg-gray-800 my-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-300">Est. Monthly Cost</span>
                <span className="text-lg font-bold text-emerald-400">${totalMonthlyCost.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div className="px-4">
          <button onClick={handleExport} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 border border-gray-700 text-gray-200 text-sm font-semibold rounded-xl transition-colors">
            {exporting
              ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Generating PDF…</>
              : <><FileText size={16} />Generate PDF</>
            }
          </button>
        </div>
      )}

      {deleteId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setDeleteId(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl px-4 pt-4 pb-safe">
            <p className="text-base font-bold text-gray-100 mb-1">Remove animal?</p>
            <p className="text-sm text-gray-500 mb-4">Removes from the calculator only.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 bg-gray-800 border border-gray-700 text-gray-300 font-semibold text-sm rounded-xl">Cancel</button>
              <button onClick={() => { setEntries(prev => prev.filter(e => e.id !== deleteId)); setDeleteId(null) }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white font-semibold text-sm rounded-xl">Remove</button>
            </div>
          </div>
        </>
      )}

      {sheet === 'add' && (
        <EntryForm initial={editEntry} onSave={upsertEntry} onClose={() => { setSheet(null); setEditEntry(undefined) }} />
      )}
      {sheet === 'import' && (
        <ImportSheet existingIds={existingAppIds} onImport={handleImport} onClose={() => setSheet(null)} />
      )}
      {pdfUrl && <PdfReady blobUrl={pdfUrl} onClose={() => { URL.revokeObjectURL(pdfUrl); setPdfUrl(null) }} />}
    </div>
  )
}
