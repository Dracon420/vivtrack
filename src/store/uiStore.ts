import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light' | 'system'

interface UIState {
  theme: Theme
  setTheme: (theme: Theme) => void
  activeAnimalId: string | null
  setActiveAnimalId: (id: string | null) => void
  weightUnit: 'g' | 'oz'
  setWeightUnit: (unit: 'g' | 'oz') => void
  currency: string
  setCurrency: (currency: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      activeAnimalId: null,
      setActiveAnimalId: (id) => set({ activeAnimalId: id }),
      weightUnit: 'g',
      setWeightUnit: (unit) => set({ weightUnit: unit }),
      currency: 'USD',
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'vivtrack-ui' }
  )
)
