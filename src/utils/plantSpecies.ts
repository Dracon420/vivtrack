import type { PlantSpeciesTemplate } from '@/types'

let cache: PlantSpeciesTemplate[] | null = null

export async function loadPlantSpecies(): Promise<PlantSpeciesTemplate[]> {
  if (cache) return cache
  const res = await fetch('/data/plant-species.json')
  cache = await res.json()
  return cache!
}

export function getPlantSpeciesById(id: string, list: PlantSpeciesTemplate[]): PlantSpeciesTemplate | undefined {
  return list.find(s => s.id === id)
}

export function searchPlantSpecies(query: string, list: PlantSpeciesTemplate[]): PlantSpeciesTemplate[] {
  const q = query.toLowerCase()
  return list.filter(s =>
    s.commonName.toLowerCase().includes(q) ||
    s.scientificName.toLowerCase().includes(q) ||
    s.alternateNames?.some(n => n.toLowerCase().includes(q))
  )
}

export function getPlantsByType(type: string, list: PlantSpeciesTemplate[]): PlantSpeciesTemplate[] {
  return list.filter(s => s.plantType === type)
}

export function careLevelColor(level: string): string {
  if (level === 'beginner') return 'text-emerald-400'
  if (level === 'intermediate') return 'text-amber-400'
  return 'text-red-400'
}

export function toxicityLabel(t: PlantSpeciesTemplate['toxicity']): { label: string; color: 'emerald' | 'amber' | 'red' } {
  if (t.animalSafe) return { label: 'Animal Safe', color: 'emerald' }
  if (t.safeFor && t.safeFor.length > 0) return { label: 'Partially Safe', color: 'amber' }
  return { label: 'Toxic', color: 'red' }
}

export function lightLabel(light: string): string {
  const map: Record<string, string> = {
    low: '🌑 Low', medium: '🌤 Medium', high: '☀️ High',
    very_high: '🔆 Very High', bright_indirect: '🌤 Bright Indirect',
  }
  return map[light] ?? light
}
