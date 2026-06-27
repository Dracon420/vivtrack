import type { SpeciesTemplate } from '@/types'

let cachedSpecies: SpeciesTemplate[] | null = null

export async function loadSpecies(): Promise<SpeciesTemplate[]> {
  if (cachedSpecies) return cachedSpecies
  const response = await fetch('/data/species.json')
  cachedSpecies = await response.json() as SpeciesTemplate[]
  return cachedSpecies
}

export async function getSpeciesById(id: string): Promise<SpeciesTemplate | undefined> {
  const species = await loadSpecies()
  return species.find(s => s.id === id)
}

export async function searchSpecies(query: string): Promise<SpeciesTemplate[]> {
  const species = await loadSpecies()
  const q = query.toLowerCase()
  return species.filter(s =>
    s.commonName.toLowerCase().includes(q) ||
    s.scientificName.toLowerCase().includes(q) ||
    s.alternateNames?.some(n => n.toLowerCase().includes(q))
  )
}

export function getSpeciesByClass(species: SpeciesTemplate[], cls: SpeciesTemplate['animalClass']) {
  return species.filter(s => s.animalClass === cls)
}

export function careLevelColor(level: SpeciesTemplate['careLevel']): string {
  switch (level) {
    case 'beginner': return 'text-emerald-400'
    case 'intermediate': return 'text-yellow-400'
    case 'advanced': return 'text-orange-400'
    case 'expert': return 'text-red-400'
  }
}
