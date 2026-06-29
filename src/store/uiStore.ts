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
  tempUnit: 'C' | 'F'
  setTempUnit: (unit: 'C' | 'F') => void
  measurementUnit: 'cm' | 'in'
  setMeasurementUnit: (unit: 'cm' | 'in') => void
  dashboardWidgets: { animalQuickAccess: boolean; enclosureList: boolean; plantQuickAccess: boolean; speciesGuides: boolean; recentActivity: boolean; colonyAlerts: boolean }
  setDashboardWidget: (key: keyof UIState['dashboardWidgets'], value: boolean) => void
  notificationsEnabled: boolean
  setNotificationsEnabled: (v: boolean) => void
  notificationLeadMinutes: number
  setNotificationLeadMinutes: (v: number) => void
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
      tempUnit: 'C',
      setTempUnit: (unit) => set({ tempUnit: unit }),
      measurementUnit: 'cm',
      setMeasurementUnit: (unit) => set({ measurementUnit: unit }),
      dashboardWidgets: { animalQuickAccess: true, enclosureList: true, plantQuickAccess: true, speciesGuides: true, recentActivity: true, colonyAlerts: true },
      setDashboardWidget: (key, value) => set(s => ({ dashboardWidgets: { ...s.dashboardWidgets, [key]: value } })),
      notificationsEnabled: false,
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
      notificationLeadMinutes: 60,
      setNotificationLeadMinutes: (v) => set({ notificationLeadMinutes: v }),
    }),
    { name: 'vivtrack-ui' }
  )
)
