import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, FolderInput, FileText, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

// ── Types ─────────────────────────────────────────────────────────────────────

type FrequencyType = 'daily' | 'every_x_days' | 'weekly' | 'biweekly' | 'monthly'
type SpeciesCategory = 'snake' | 'lizard' | 'chelonian' | 'amphibian' | 'tarantula' | 'spider' | 'scorpion' | 'insect' | 'fish' | 'mammal' | 'bird' | 'other'

interface CalcEntry {
  id: string
  appAnimalId?: string
  name: string
  species: string
  speciesType: SpeciesCategory
  feederKey: string
  feederSize?: string
  feederAmount: number
  feedingFrequency: FrequencyType
  feedingIntervalDays: number
  costPer: number
  costPerQty: number
}

// ── Feeder Catalog ────────────────────────────────────────────────────────────

interface FeederCatalogEntry {
  label: string
  sizes?: string[]
}

const FEEDER_CATALOG: Record<string, FeederCatalogEntry> = {
  // Rodents
  rat:        { label: 'Rat',                          sizes: ['Pinky', 'Fuzzy', 'Pup', 'Small', 'Medium', 'Large', 'Jumbo'] },
  mouse:      { label: 'Mouse',                        sizes: ['Pinky', 'Fuzzy', 'Pup', 'Small', 'Medium', 'Large', 'Jumbo'] },
  asf:        { label: 'African Soft Fur (ASF)',        sizes: ['Pinky', 'Fuzzy', 'Pup', 'Small', 'Medium', 'Large', 'Jumbo'] },
  rabbit:     { label: 'Rabbit',                       sizes: ['Kit', 'Small', 'Medium', 'Large'] },
  gerbil:     { label: 'Gerbil',                       sizes: ['Pinky', 'Fuzzy', 'Adult'] },
  hamster:    { label: 'Hamster',                      sizes: ['Pinky', 'Fuzzy', 'Adult'] },
  // Birds
  quail:      { label: 'Quail',                        sizes: ['Day-old Chick', 'Small', 'Medium', 'Large'] },
  chick:      { label: 'Domestic Chick',               sizes: ['Day-old', 'Small', 'Medium', 'Large'] },
  // Roaches
  dubia:          { label: 'Dubia Roach',              sizes: ['Small (¼")', 'Medium (½")', 'Large (¾")', 'Jumbo (1"+)'] },
  red_runner:     { label: 'Red Runner Roach',         sizes: ['Small', 'Medium', 'Large'] },
  shadow_roach:   { label: 'Shadow Roach',             sizes: ['Small', 'Medium', 'Large'] },
  ivory_roach:    { label: 'Ivory Head Roach',         sizes: ['Small', 'Medium', 'Large'] },
  deathshead:     { label: "Death's Head Roach",       sizes: ['Small', 'Medium', 'Large'] },
  hissing:        { label: 'Hissing Cockroach',        sizes: ['Small', 'Medium', 'Large'] },
  discoid:        { label: 'Discoid Roach',            sizes: ['Small', 'Medium', 'Large'] },
  turkistan:      { label: 'Turkistan Roach',          sizes: ['Small', 'Medium', 'Large'] },
  lobster_roach:  { label: 'Lobster Roach',            sizes: ['Small', 'Medium', 'Large'] },
  giant_cave:     { label: 'Giant Cave Roach',         sizes: ['Small', 'Medium', 'Large'] },
  // Worms
  mealworm:    { label: 'Mealworm',                    sizes: ['Small', 'Medium', 'Large'] },
  superworm:   { label: 'Superworm',                   sizes: ['Small', 'Medium', 'Large'] },
  waxworm:     { label: 'Waxworm' },
  butterworm:  { label: 'Butterworm' },
  hornworm:    { label: 'Hornworm',                    sizes: ['Small', 'Medium', 'Large'] },
  silkworm:    { label: 'Silkworm',                    sizes: ['Small', 'Medium', 'Large'] },
  bsfl:        { label: 'BSFL / Calci Worm',           sizes: ['Small', 'Medium', 'Large'] },
  earthworm:   { label: 'Earthworm',                   sizes: ['Small', 'Medium', 'Large'] },
  nightcrawler:{ label: 'Nightcrawler',                sizes: ['Small', 'Medium', 'Large'] },
  // Insects
  cricket:      { label: 'Cricket',                   sizes: ['Pinhead', 'Small (¼")', 'Medium (½")', 'Large (¾")', 'Adult'] },
  locust:       { label: 'Locust',                    sizes: ['Small', 'Medium', 'Large', 'Adult'] },
  grasshopper:  { label: 'Grasshopper',               sizes: ['Small', 'Medium', 'Large'] },
  fruit_fly:    { label: 'Fruit Fly',                 sizes: ['Melanogaster', 'Hydei'] },
  morio:        { label: 'Morio Worm (Giant Mealworm)' },
}

const FEEDER_GROUPS: { label: string; emoji: string; keys: string[] }[] = [
  { label: 'Rodents',  emoji: '🐭', keys: ['rat', 'mouse', 'asf', 'rabbit', 'gerbil', 'hamster'] },
  { label: 'Birds',    emoji: '🐦', keys: ['quail', 'chick'] },
  { label: 'Roaches',  emoji: '🪲', keys: ['dubia', 'red_runner', 'shadow_roach', 'ivory_roach', 'deathshead', 'hissing', 'discoid', 'turkistan', 'lobster_roach', 'giant_cave'] },
  { label: 'Worms',    emoji: '🪱', keys: ['mealworm', 'superworm', 'waxworm', 'butterworm', 'hornworm', 'silkworm', 'bsfl', 'earthworm', 'nightcrawler', 'morio'] },
  { label: 'Insects',  emoji: '🦗', keys: ['cricket', 'locust', 'grasshopper', 'fruit_fly'] },
]

function feederDisplayName(key: string, size?: string): string {
  const cat = FEEDER_CATALOG[key]
  if (!cat) return key
  if (!size || !cat.sizes?.length) return cat.label
  return `${size} ${cat.label}`
}

// ── Species constants ─────────────────────────────────────────────────────────

const SPECIES_ORDER: SpeciesCategory[] = [
  'snake', 'lizard', 'chelonian', 'amphibian', 'tarantula',
  'spider', 'scorpion', 'insect', 'fish', 'mammal', 'bird', 'other',
]
const SPECIES_LABEL: Record<SpeciesCategory, string> = {
  snake: 'Snakes', lizard: 'Lizards & Geckos', chelonian: 'Turtles & Tortoises',
  amphibian: 'Amphibians', tarantula: 'Tarantulas', spider: 'Spiders',
  scorpion: 'Scorpions', insect: 'Insects & Invertebrates', fish: 'Fish',
  mammal: 'Mammals', bird: 'Birds', other: 'Other',
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
  if (/tortoise|turtle|chelonian/.test(s)) return 'chelonian'
  if (/frog|toad|axolotl|salamander|newt|dart frog|tree frog|pacman|amphibian/.test(s)) return 'amphibian'
  if (/tarantula/.test(s)) return 'tarantula'
  if (/huntsman|spider/.test(s)) return 'spider'
  if (/scorpion/.test(s)) return 'scorpion'
  if (/mantis|cockroach|stick insect|millipede|hissing|insect/.test(s)) return 'insect'
  if (/fish|betta|tetra|guppy|oscar|cichlid|koi|goldfish|clownfish|angelfish|discus|pleco|corydoras/.test(s)) return 'fish'
  if (/hedgehog|sugar glider|chinchilla|ferret|prairie dog|opossum|degu|mammal|rodent/.test(s)) return 'mammal'
  if (/parrot|cockatiel|conure|budgerigar|bird|african grey/.test(s)) return 'bird'
  return 'other'
}

function monthlyFeedings(entry: CalcEntry): number {
  switch (entry.feedingFrequency) {
    case 'daily': return 30
    case 'every_x_days': return Math.max(1, Math.round(30 / Math.max(1, entry.feedingIntervalDays)))
    case 'weekly': return 4
    case 'biweekly': return 2
    case 'monthly': return 1
  }
}

function monthlyAmount(entry: CalcEntry): number {
  return entry.feederAmount * monthlyFeedings(entry)
}

function monthlyCost(entry: CalcEntry): number {
  if (!entry.costPer || !entry.costPerQty) return 0
  return (monthlyAmount(entry) / entry.costPerQty) * entry.costPer
}

function freqFromIntervalDays(days: number): { freq: FrequencyType; interval: number } {
  if (days <= 1) return { freq: 'daily', interval: 1 }
  if (days === 7) return { freq: 'weekly', interval: 7 }
  if (days >= 14 && days <= 16) return { freq: 'biweekly', interval: 14 }
  if (days >= 28) return { freq: 'monthly', interval: 30 }
  return { freq: 'every_x_days', interval: days }
}

const STORAGE_KEY = 'vivtrack-feeding-calc-v2'
const loadEntries = (): CalcEntry[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
const saveEntries = (e: CalcEntry[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(e))

// ── Feeder Picker ─────────────────────────────────────────────────────────────

interface FeederPickerProps {
  feederKey: string
  feederSize?: string
  onChange: (key: string, size?: string) => void
}

function FeederPicker({ feederKey, feederSize, onChange }: FeederPickerProps) {
  const cat = FEEDER_CATALOG[feederKey]

  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Feeder Type</label>
      <div className="space-y-2">
        {FEEDER_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <span>{group.emoji}</span> {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.keys.map(key => {
                const item = FEEDER_CATALOG[key]
                const active = feederKey === key
                return (
                  <button key={key} type="button"
                    onClick={() => onChange(key, undefined)}
                    className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                      active
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                    )}>
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Size selector */}
      {cat?.sizes?.length ? (
        <div>
          <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Size</label>
          <div className="flex flex-wrap gap-1.5">
            {cat.sizes.map(sz => (
              <button key={sz} type="button"
                onClick={() => onChange(feederKey, sz)}
                className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                  feederSize === sz
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                )}>
                {sz}
              </button>
            ))}
          </div>
          {!feederSize && (
            <p className="text-[11px] text-amber-400 mt-1.5">Select a size</p>
          )}
        </div>
      ) : null}

      {feederKey && (
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
          <Check size={13} className="text-emerald-400 shrink-0" />
          <span className="text-sm text-gray-200 font-medium">
            {feederDisplayName(feederKey, feederSize)}
          </span>
        </div>
      )}
    </div>
  )
}

// ── EntryForm Sheet ───────────────────────────────────────────────────────────

interface EntryFormState {
  name: string
  species: string
  speciesType: SpeciesCategory
  feederKey: string
  feederSize?: string
  feederAmount: number
  feedingFrequency: FrequencyType
  feedingIntervalDays: number
  costPer: number
  costPerQty: number
}

const BLANK: EntryFormState = {
  name: '', species: '', speciesType: 'other',
  feederKey: '', feederSize: undefined,
  feederAmount: 1, feedingFrequency: 'weekly', feedingIntervalDays: 7,
  costPer: 0, costPerQty: 1,
}

interface EntryFormProps {
  initial?: CalcEntry
  onSave: (entry: CalcEntry) => void
  onClose: () => void
}

function EntryForm({ initial, onSave, onClose }: EntryFormProps) {
  const [form, setForm] = useState<EntryFormState>(() =>
    initial
      ? {
          name: initial.name, species: initial.species, speciesType: initial.speciesType,
          feederKey: initial.feederKey, feederSize: initial.feederSize,
          feederAmount: initial.feederAmount, feedingFrequency: initial.feedingFrequency,
          feedingIntervalDays: initial.feedingIntervalDays,
          costPer: initial.costPer, costPerQty: initial.costPerQty,
        }
      : { ...BLANK }
  )

  const set = <K extends keyof EntryFormState>(k: K, v: EntryFormState[K]) =>
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'species') next.speciesType = detectSpeciesType(v as string)
      return next
    })

  const setFeeder = (key: string, size?: string) =>
    setForm(f => ({ ...f, feederKey: key, feederSize: size }))

  const cat = FEEDER_CATALOG[form.feederKey]
  const needsSize = !!cat?.sizes?.length
  const valid = form.name.trim() && form.feederKey && (!needsSize || !!form.feederSize)

  const handleSave = () => {
    if (!valid) return
    onSave({
      id: initial?.id ?? uuidv4(),
      appAnimalId: initial?.appAnimalId,
      ...form,
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl px-4 pt-4 pb-safe">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-100">{initial ? 'Edit Animal' : 'Add Animal'}</h2>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
        </div>

        <div className="space-y-4 max-h-[78vh] overflow-y-auto pb-2">
          {/* Name */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Animal Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Noodle"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
          </div>

          {/* Species */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Species</label>
            <input value={form.species} onChange={e => set('species', e.target.value)} placeholder="e.g. Ball Python"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500" />
          </div>

          {/* Species type */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">
              Group <span className="text-gray-600 normal-case font-normal">(auto-detected)</span>
            </label>
            <select value={form.speciesType} onChange={e => set('speciesType', e.target.value as SpeciesCategory)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500">
              {SPECIES_ORDER.map(t => (
                <option key={t} value={t}>{SPECIES_EMOJI[t]} {SPECIES_LABEL[t]}</option>
              ))}
            </select>
          </div>

          {/* Feeder picker */}
          <FeederPicker feederKey={form.feederKey} feederSize={form.feederSize} onChange={setFeeder} />

          {/* Amount per feeding */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">Amount Per Feeding</label>
            <input type="number" min="1" value={form.feederAmount}
              onChange={e => set('feederAmount', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 text-center focus:outline-none focus:border-emerald-500" />
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Feeding Frequency</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {FREQ_OPTIONS.map(f => (
                <button key={f} type="button" onClick={() => set('feedingFrequency', f)}
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
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-400">Every</span>
                <input type="number" min="2" max="365" value={form.feedingIntervalDays}
                  onChange={e => set('feedingIntervalDays', Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 text-center focus:outline-none focus:border-emerald-500" />
                <span className="text-sm text-gray-400">days</span>
              </div>
            )}
          </div>

          {/* Cost */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1">
              Cost <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">$</span>
              <input type="number" min="0" step="0.01" value={form.costPer || ''}
                onChange={e => set('costPer', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500" />
              <span className="text-gray-400 text-sm">for</span>
              <input type="number" min="1" value={form.costPerQty}
                onChange={e => set('costPerQty', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 text-center focus:outline-none focus:border-emerald-500" />
              <span className="text-gray-400 text-sm truncate">
                {feederDisplayName(form.feederKey, form.feederSize) || 'feeders'}
              </span>
            </div>
          </div>

          <button onClick={handleSave} disabled={!valid}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            <Check size={16} /> {initial ? 'Save Changes' : 'Add Animal'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Import From App Sheet ─────────────────────────────────────────────────────

interface AppAnimal { id: string; name: string; species: string; status: string }
interface AppSchedule { animalId: string; feedingIntervalDays?: number }

interface ImportSheetProps {
  existingIds: Set<string>
  onImport: (entries: CalcEntry[]) => void
  onClose: () => void
}

function ImportSheet({ existingIds, onImport, onClose }: ImportSheetProps) {
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
      const rawAnimals = (aRes.data ?? [])
        .map(r => r.data as AppAnimal)
        .filter(a => a.status === 'active' || a.status === 'quarantine')
        .sort((a, b) => a.name.localeCompare(b.name))
      setAnimals(rawAnimals)
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
      const sched = schedules.find(s => s.animalId === id)
      const days = sched?.feedingIntervalDays ?? 7
      const { freq, interval } = freqFromIntervalDays(days)
      entries.push({
        id: uuidv4(), appAnimalId: animal.id,
        name: animal.name, species: animal.species,
        speciesType: detectSpeciesType(animal.species),
        feederKey: '', feederSize: undefined,
        feederAmount: 1, feedingFrequency: freq, feedingIntervalDays: interval,
        costPer: 0, costPerQty: 1,
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
            <p className="text-xs text-gray-500 mt-0.5">Select animals to add to the calculator</p>
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
                const sched = schedules.find(s => s.animalId === animal.id)
                const speciesType = detectSpeciesType(animal.species)
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
                    <span className="text-lg shrink-0">{SPECIES_EMOJI[speciesType]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{animal.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {animal.species}
                        {sched?.feedingIntervalDays && <span className="text-gray-600"> · every {sched.feedingIntervalDays}d</span>}
                      </p>
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
          {selected.size > 0 && (
            <p className="text-center text-xs text-gray-600 mt-2">Feeder type and size can be set after import</p>
          )}
        </div>
      </div>
    </>
  )
}

// ── PDF Export ────────────────────────────────────────────────────────────────

async function exportPDF(entries: CalcEntry[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 14
  const rightEdge = pageW - margin
  let y = 22

  const emerald: [number, number, number] = [16, 185, 129]
  const dark: [number, number, number] = [17, 24, 39]
  const mid: [number, number, number] = [75, 85, 99]
  const light: [number, number, number] = [220, 220, 220]

  // Header bar
  doc.setFillColor(...dark)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setTextColor(...emerald)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('VivTrack', margin, 12)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Monthly Feeding Order', margin + 38, 12)
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.text(
    new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    margin, 22
  )
  y = 40

  // Build feeder totals (grouped by display name) for the order summary
  const feederTotals = new Map<string, { qty: number; cost: number }>()
  for (const e of entries) {
    if (!e.feederKey) continue
    const name = feederDisplayName(e.feederKey, e.feederSize)
    const cur = feederTotals.get(name) ?? { qty: 0, cost: 0 }
    feederTotals.set(name, { qty: cur.qty + monthlyAmount(e), cost: cur.cost + monthlyCost(e) })
  }

  // ── Per-species sections ──────────────────────────────────────────────────

  const grouped = new Map<SpeciesCategory, CalcEntry[]>()
  for (const e of entries) {
    const arr = grouped.get(e.speciesType) ?? []; arr.push(e); grouped.set(e.speciesType, arr)
  }

  for (const type of SPECIES_ORDER) {
    const items = grouped.get(type)
    if (!items?.length) continue
    if (y > 260) { doc.addPage(); y = 20 }

    // Section header
    doc.setFillColor(240, 253, 249)
    doc.rect(margin - 2, y - 4, rightEdge - margin + 4, 8, 'F')
    doc.setTextColor(...emerald)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(SPECIES_LABEL[type], margin, y)
    y += 7

    // Column headers
    const C = { name: margin, species: margin + 38, feeder: margin + 78, freq: margin + 118, qty: margin + 148, cost: margin + 168 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...mid)
    doc.text('Name', C.name, y)
    doc.text('Species', C.species, y)
    doc.text('Feeder', C.feeder, y)
    doc.text('Frequency', C.freq, y)
    doc.text('Mo. Qty', C.qty, y)
    doc.text('Mo. Cost', C.cost, y)
    y += 3.5
    doc.setDrawColor(...light)
    doc.line(margin, y, rightEdge, y)
    y += 4.5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)

    for (const item of items) {
      if (y > 270) { doc.addPage(); y = 20 }
      const cost = monthlyCost(item)
      const freqStr = item.feedingFrequency === 'every_x_days'
        ? `Every ${item.feedingIntervalDays}d`
        : FREQ_LABEL[item.feedingFrequency]
      const feederStr = feederDisplayName(item.feederKey, item.feederSize) || '(not set)'
      const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s

      doc.setTextColor(31, 41, 55)
      doc.text(trunc(item.name, 16), C.name, y)
      doc.text(trunc(item.species, 20), C.species, y)
      doc.text(trunc(`${item.feederAmount}× ${feederStr}`, 22), C.feeder, y)
      doc.text(freqStr, C.freq, y)
      doc.setFont('helvetica', 'bold')
      doc.text(monthlyAmount(item).toString(), C.qty, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(cost > 0 ? 16 : 156, cost > 0 ? 185 : 163, cost > 0 ? 129 : 175)
      doc.text(cost > 0 ? `$${cost.toFixed(2)}` : '—', C.cost, y)
      doc.setTextColor(31, 41, 55)
      y += 6
      doc.setDrawColor(243, 244, 246)
      doc.line(margin, y - 1.5, rightEdge, y - 1.5)
    }
    y += 5
  }

  // ── Order Summary (bundled by feeder type+size) ──────────────────────────

  if (y > 245) { doc.addPage(); y = 20 }
  doc.setDrawColor(...emerald)
  doc.setLineWidth(0.5)
  doc.line(margin, y, rightEdge, y)
  doc.setLineWidth(0.2)
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(31, 41, 55)
  doc.text('Monthly Order Summary', margin, y)
  y += 3
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...mid)
  doc.text('Same feeder type & size bundled together — copy this section to send to your supplier.', margin, y + 4)
  y += 10

  // Group feeder totals by category for PDF ordering
  const summaryLines: { label: string; qty: number; cost: number }[] = []
  for (const group of FEEDER_GROUPS) {
    for (const key of group.keys) {
      const cat = FEEDER_CATALOG[key]
      if (!cat) continue
      if (cat.sizes?.length) {
        for (const sz of cat.sizes) {
          const displayName = `${sz} ${cat.label}`
          const row = feederTotals.get(displayName)
          if (row) summaryLines.push({ label: displayName, qty: row.qty, cost: row.cost })
        }
      } else {
        const row = feederTotals.get(cat.label)
        if (row) summaryLines.push({ label: cat.label, qty: row.qty, cost: row.cost })
      }
    }
  }
  // Any remaining (shouldn't happen with catalog, but safety net)
  for (const [label, row] of feederTotals) {
    if (!summaryLines.find(l => l.label === label)) {
      summaryLines.push({ label, qty: row.qty, cost: row.cost })
    }
  }

  let totalCost = 0
  doc.setFontSize(9.5)

  for (const line of summaryLines) {
    if (y > 275) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text(line.label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...mid)
    doc.text(`${line.qty}`, margin + 90, y)
    doc.text('units', margin + 102, y)
    if (line.cost > 0) {
      doc.setTextColor(...emerald)
      doc.text(`$${line.cost.toFixed(2)}`, margin + 125, y)
      totalCost += line.cost
    }
    y += 7
  }

  if (totalCost > 0) {
    y += 2
    doc.setDrawColor(...light)
    doc.line(margin, y, margin + 140, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...emerald)
    doc.text(`Estimated Monthly Total: $${totalCost.toFixed(2)}`, margin, y)
  }

  doc.save(`vivtrack-feeding-order-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Sheet = null | 'add' | 'import'

export default function FeedingCalculator() {
  const [entries, setEntries] = useState<CalcEntry[]>(() => loadEntries())
  const [sheet, setSheet] = useState<Sheet>(null)
  const [editEntry, setEditEntry] = useState<CalcEntry | undefined>()
  const [exporting, setExporting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => { saveEntries(entries) }, [entries])

  const upsertEntry = useCallback((entry: CalcEntry) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id)
      return idx >= 0 ? prev.map(e => e.id === entry.id ? entry : e) : [...prev, entry]
    })
    setSheet(null)
    setEditEntry(undefined)
  }, [])

  const handleImport = useCallback((imported: CalcEntry[]) => {
    setEntries(prev => [...prev, ...imported])
    setSheet(null)
  }, [])

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    setDeleteId(null)
  }

  const handleExport = async () => {
    if (entries.length === 0) return
    setExporting(true)
    try { await exportPDF(entries) } finally { setExporting(false) }
  }

  const grouped = useMemo(() => {
    const map = new Map<SpeciesCategory, CalcEntry[]>()
    for (const e of entries) {
      const arr = map.get(e.speciesType) ?? []; arr.push(e); map.set(e.speciesType, arr)
    }
    return map
  }, [entries])

  // Summary: bundle same feeder+size across all animals
  const feederTotals = useMemo(() => {
    const map = new Map<string, { qty: number; cost: number }>()
    for (const e of entries) {
      if (!e.feederKey) continue
      const name = feederDisplayName(e.feederKey, e.feederSize)
      const cur = map.get(name) ?? { qty: 0, cost: 0 }
      map.set(name, { qty: cur.qty + monthlyAmount(e), cost: cur.cost + monthlyCost(e) })
    }
    return map
  }, [entries])

  const totalMonthlyCost = useMemo(() =>
    [...feederTotals.values()].reduce((s, v) => s + v.cost, 0), [feederTotals])

  const existingAppIds = useMemo(() =>
    new Set(entries.map(e => e.appAnimalId).filter(Boolean) as string[]), [entries])

  const needsFeederInfo = entries.filter(e => !e.feederKey || (FEEDER_CATALOG[e.feederKey]?.sizes?.length && !e.feederSize))

  return (
    <div className="min-h-full pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Feeding Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monthly feeder needs &amp; estimated costs</p>
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
            {needsFeederInfo.length} animal{needsFeederInfo.length !== 1 ? 's' : ''} need{needsFeederInfo.length === 1 ? 's' : ''} feeder info set — tap Edit.
          </p>
        </div>
      )}

      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <span className="text-5xl mb-4">🍖</span>
          <p className="text-gray-300 font-semibold text-lg">No animals yet</p>
          <p className="text-gray-500 text-sm mt-1">Add animals manually or import from the app.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="px-4 space-y-4 mb-4">
          {SPECIES_ORDER.filter(t => grouped.has(t)).map(type => {
            const items = grouped.get(type)!
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{SPECIES_EMOJI[type]}</span>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{SPECIES_LABEL[type]}</p>
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-xs text-gray-600">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(entry => {
                    const monthly = monthlyAmount(entry)
                    const cost = monthlyCost(entry)
                    const freqStr = entry.feedingFrequency === 'every_x_days'
                      ? `Every ${entry.feedingIntervalDays} days`
                      : FREQ_LABEL[entry.feedingFrequency]
                    const feederName = feederDisplayName(entry.feederKey, entry.feederSize)
                    const missingFeeder = !entry.feederKey
                    const missingSize = entry.feederKey && FEEDER_CATALOG[entry.feederKey]?.sizes?.length && !entry.feederSize
                    const missing = missingFeeder || missingSize

                    return (
                      <div key={entry.id}
                        className={cn('bg-gray-900 border rounded-xl px-4 py-3',
                          missing ? 'border-amber-500/30' : 'border-gray-800'
                        )}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-100 truncate">{entry.name}</p>
                              {missing && <AlertCircle size={13} className="text-amber-400 shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{entry.species}</p>
                            {missing ? (
                              <p className="text-xs text-amber-400 mt-1">
                                {missingFeeder ? 'Feeder type not set' : 'Feeder size not set'} — tap Edit
                              </p>
                            ) : (
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span className="text-xs text-gray-400">
                                  <span className="text-gray-600">Feeder:</span> {entry.feederAmount}× {feederName}
                                </span>
                                <span className="text-xs text-gray-400">
                                  <span className="text-gray-600">Freq:</span> {freqStr}
                                </span>
                              </div>
                            )}
                          </div>
                          {!missing && (
                            <div className="text-right shrink-0">
                              <p className="text-base font-bold text-emerald-400">{monthly}</p>
                              <p className="text-[10px] text-gray-600">/month</p>
                              {cost > 0 && <p className="text-xs text-gray-400 mt-0.5">${cost.toFixed(2)}</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-gray-800">
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
            )
          })}
        </div>
      )}

      {/* Monthly Summary */}
      {feederTotals.size > 0 && (
        <div className="mx-4 mb-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Monthly Order Summary</p>
          <p className="text-[11px] text-gray-600 mb-3 -mt-1">Same feeder &amp; size bundled together</p>
          <div className="space-y-2">
            {[...feederTotals.entries()].map(([feeder, { qty, cost }]) => (
              <div key={feeder} className="flex items-center justify-between">
                <span className="text-sm text-gray-200 truncate flex-1 mr-3">{feeder}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-emerald-400">{qty}</span>
                  {cost > 0 && <span className="text-xs text-gray-500">${cost.toFixed(2)}</span>}
                </div>
              </div>
            ))}
          </div>
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
              ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Generating PDF…</>
              : <><FileText size={16} /> Export Monthly Order PDF</>
            }
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setDeleteId(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl px-4 pt-4 pb-safe">
            <p className="text-base font-bold text-gray-100 mb-1">Remove animal?</p>
            <p className="text-sm text-gray-500 mb-4">This removes it from the calculator only.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 bg-gray-800 border border-gray-700 text-gray-300 font-semibold text-sm rounded-xl">Cancel</button>
              <button onClick={() => deleteEntry(deleteId)}
                className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white font-semibold text-sm rounded-xl">Remove</button>
            </div>
          </div>
        </>
      )}

      {sheet === 'add' && (
        <EntryForm
          initial={editEntry}
          onSave={upsertEntry}
          onClose={() => { setSheet(null); setEditEntry(undefined) }}
        />
      )}

      {sheet === 'import' && (
        <ImportSheet
          existingIds={existingAppIds}
          onImport={handleImport}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
