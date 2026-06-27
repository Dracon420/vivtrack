import { DollarSign } from 'lucide-react'

export default function Expenses() {
  return (
    <div className="min-h-full pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Expenses</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track costs per animal</p>
      </div>
      <div className="text-center py-16 px-4">
        <DollarSign size={40} className="text-gray-700 mx-auto mb-4" />
        <p className="text-gray-300 font-semibold">Expense Tracking</p>
        <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
          Log and categorize expenses — food, vet visits, substrate, equipment — with per-animal breakdowns and monthly totals.
          Coming in Phase 6.
        </p>
      </div>
    </div>
  )
}
