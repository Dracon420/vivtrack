import { Dna } from 'lucide-react'

export default function Breeding() {
  return (
    <div className="min-h-full pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-100">Breeding</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pairings, clutches & incubation</p>
      </div>
      <div className="text-center py-16 px-4">
        <Dna size={40} className="text-gray-700 mx-auto mb-4" />
        <p className="text-gray-300 font-semibold">Breeding Records</p>
        <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
          Track pairings, clutch data, and incubation logs with daily temperature/humidity readings.
          Coming in Phase 6.
        </p>
      </div>
    </div>
  )
}
