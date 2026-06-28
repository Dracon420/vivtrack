import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Check } from 'lucide-react'
import { useAnimals } from '@/db/hooks/useAnimals'
import { useExpenses, addExpense, deleteExpense } from '@/db/hooks/useExpenses'
import { cn } from '@/lib/utils'
import { format, isSameMonth, isSameYear } from 'date-fns'
import type { Expense, ExpenseCategory } from '@/types'

// ── Constants ────────────────────────────────────────────────────────────────
const CAT: Record<ExpenseCategory, { label: string; emoji: string; color: string; bar: string }> = {
  food:            { label: 'Food',            emoji: '🍖', color: 'text-orange-400', bar: 'bg-orange-500' },
  substrate:       { label: 'Substrate',       emoji: '🪨', color: 'text-stone-400',  bar: 'bg-stone-500' },
  equipment:       { label: 'Equipment',       emoji: '🔧', color: 'text-blue-400',   bar: 'bg-blue-500' },
  enclosure:       { label: 'Enclosure',       emoji: '🏠', color: 'text-indigo-400', bar: 'bg-indigo-500' },
  veterinary:      { label: 'Veterinary',      emoji: '🏥', color: 'text-red-400',    bar: 'bg-red-500' },
  medication:      { label: 'Medication',      emoji: '💊', color: 'text-purple-400', bar: 'bg-purple-500' },
  electricity:     { label: 'Electricity',     emoji: '⚡', color: 'text-yellow-400', bar: 'bg-yellow-500' },
  supplements:     { label: 'Supplements',     emoji: '🌿', color: 'text-emerald-400',bar: 'bg-emerald-500' },
  decor:           { label: 'Decor',           emoji: '✨', color: 'text-pink-400',   bar: 'bg-pink-500' },
  animal_purchase: { label: 'Animal',          emoji: '🐾', color: 'text-teal-400',   bar: 'bg-teal-500' },
  shipping:        { label: 'Shipping',        emoji: '📦', color: 'text-cyan-400',   bar: 'bg-cyan-500' },
  other:           { label: 'Other',           emoji: '📋', color: 'text-gray-400',   bar: 'bg-gray-500' },
}

function fmt(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

// ── Add Expense Sheet ────────────────────────────────────────────────────────
function AddExpenseSheet({ animals, onClose, onSaved }: {
  animals: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const todayStr = new Date().toISOString().split('T')[0]
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [description, setDescription] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [date, setDate] = useState(todayStr)
  const [animalId, setAnimalId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const cents = Math.round(parseFloat(amountStr) * 100)
    if (!description.trim() || !cents || cents <= 0) return
    setSaving(true)
    try {
      await addExpense({
        animalId: animalId || undefined,
        category,
        description: description.trim(),
        amountCents: cents,
        currency: 'USD',
        date: new Date(date).toISOString().split('T')[0],
        notes: notes.trim() || undefined,
      })
      onSaved()
    } finally { setSaving(false) }
  }

  const cats = Object.entries(CAT) as [ExpenseCategory, typeof CAT[ExpenseCategory]][]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 rounded-t-2xl px-4 pt-4 pb-safe">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-100">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
        </div>
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pb-2">

          {/* Category picker */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Category</label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {cats.map(([key, cfg]) => (
                <button key={key} onClick={() => setCategory(key)}
                  className={cn('shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
                    category === key ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                  )}>
                  <span className="text-base">{cfg.emoji}</span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 500 dubias, Annual vet visit…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" value={amountStr} onChange={e => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-7 pr-3 py-3 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Animal (optional) */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Animal (optional)</label>
            <select value={animalId} onChange={e => setAnimalId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-300 focus:outline-none focus:border-emerald-500">
              <option value="">— General / not animal-specific —</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional info…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button onClick={handleSave} disabled={saving || !description.trim() || !amountStr}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            {saving ? 'Saving…' : <><Check size={16} /> Save Expense</>}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Expense Row ──────────────────────────────────────────────────────────────
function ExpenseRow({ expense, animalName, onDelete }: {
  expense: Expense
  animalName?: string
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const cfg = CAT[expense.category]
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-800 last:border-0">
      <span className="text-xl shrink-0">{cfg.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-100 font-medium truncate">{expense.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
          {animalName && <><span className="text-gray-700">·</span><span className="text-xs text-gray-500">{animalName}</span></>}
          {expense.autoSource === 'feeder_harvest' && <span className="text-xs text-blue-400/70">auto</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <p className="text-sm font-semibold text-gray-100">{fmt(expense.amountCents)}</p>
        {confirming ? (
          <>
            <button onClick={() => onDelete(expense.id)} className="text-xs text-red-400 font-semibold px-2 py-1 bg-red-500/20 rounded-lg">Del</button>
            <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded-lg">×</button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-gray-700 hover:text-red-400 p-1 transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Expenses() {
  const allExpenses = useExpenses()
  const animals = useAnimals()
  const [anchor, setAnchor] = useState(new Date())
  const [showAdd, setShowAdd] = useState(false)

  const animalMap = useMemo(() => {
    const m = new Map<string, string>()
    animals?.forEach(a => m.set(a.id, a.name))
    return m
  }, [animals])

  const monthExpenses = useMemo(() =>
    (allExpenses ?? []).filter(e => isSameMonth(new Date(e.date), anchor))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [allExpenses, anchor.getMonth(), anchor.getFullYear()]
  )

  const yearExpenses = useMemo(() =>
    (allExpenses ?? []).filter(e => isSameYear(new Date(e.date), anchor)),
    [allExpenses, anchor.getFullYear()]
  )

  const monthTotal = monthExpenses.reduce((s, e) => s + e.amountCents, 0)
  const yearTotal  = yearExpenses.reduce((s, e) => s + e.amountCents, 0)

  // Category breakdown for this month
  const catBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, number>()
    monthExpenses.forEach(e => map.set(e.category, (map.get(e.category) ?? 0) + e.amountCents))
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const max = sorted[0]?.[1] ?? 1
    return sorted.map(([cat, cents]) => ({ cat, cents, pct: Math.round((cents / max) * 100) }))
  }, [monthExpenses])

  // Per-animal breakdown
  const animalBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    monthExpenses.forEach(e => { if (e.animalId) map.set(e.animalId, (map.get(e.animalId) ?? 0) + e.amountCents) })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([animalId, cents]) => ({ animalId, name: animalMap.get(animalId) ?? 'Unknown', cents }))
  }, [monthExpenses, animalMap])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>()
    monthExpenses.forEach(e => {
      const key = e.date.split('T')[0]
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [monthExpenses])

  const navigateMonth = (dir: 1 | -1) => {
    const d = new Date(anchor)
    d.setMonth(d.getMonth() + dir)
    setAnchor(d)
  }

  const handleDelete = async (id: string) => { await deleteExpense(id) }

  const animalList = useMemo(() => (animals ?? []).sort((a, b) => a.name.localeCompare(b.name)), [animals])

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-100">Expenses</h1>
      </div>

      {/* Month navigator */}
      <div className="px-4 mb-4 flex items-center gap-3">
        <button onClick={() => navigateMonth(-1)} className="text-gray-400 hover:text-gray-200 p-1.5 bg-gray-800 rounded-lg">
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold text-gray-200 flex-1 text-center">{format(anchor, 'MMMM yyyy')}</p>
        <button onClick={() => navigateMonth(1)} className="text-gray-400 hover:text-gray-200 p-1.5 bg-gray-800 rounded-lg">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Totals */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">This month</p>
          <p className="text-xl font-bold text-gray-100">{fmt(monthTotal)}</p>
          <p className="text-xs text-gray-600 mt-0.5">{monthExpenses.length} expense{monthExpenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{new Date(anchor).getFullYear()} total</p>
          <p className="text-xl font-bold text-gray-100">{fmt(yearTotal)}</p>
          <p className="text-xs text-gray-600 mt-0.5">{yearExpenses.length} expense{yearExpenses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Category breakdown */}
      {catBreakdown.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">By Category</p>
            <div className="space-y-2.5">
              {catBreakdown.map(({ cat, cents, pct }) => {
                const cfg = CAT[cat]
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-300 flex items-center gap-1.5">{cfg.emoji} {cfg.label}</span>
                      <span className="text-xs font-semibold text-gray-200">{fmt(cents)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', cfg.bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Per-animal breakdown */}
      {animalBreakdown.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">By Animal</p>
            <div className="space-y-2">
              {animalBreakdown.map(({ animalId, name, cents }) => (
                <div key={animalId} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 flex items-center gap-1.5">🐾 {name}</span>
                  <span className="text-sm font-semibold text-gray-200">{fmt(cents)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expense list */}
      <div className="px-4 space-y-4">
        {grouped.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 font-medium">No expenses this month</p>
            <p className="text-gray-600 text-sm mt-1">Tap + to log one, or set feeder colony pricing for automatic tracking.</p>
          </div>
        )}
        {grouped.map(([dateKey, expenses]) => (
          <div key={dateKey}>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {format(new Date(dateKey + 'T12:00:00'), 'MMM d')}
              </p>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4">
              {expenses.map(e => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  animalName={e.animalId ? animalMap.get(e.animalId) : undefined}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center transition-colors z-30">
        <Plus size={26} />
      </button>

      {showAdd && (
        <AddExpenseSheet
          animals={animalList}
          onClose={() => setShowAdd(false)}
          onSaved={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
