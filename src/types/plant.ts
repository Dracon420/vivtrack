export type LightLevel = 'low' | 'medium' | 'high' | 'very_high' | 'bright_indirect'
export type WaterNeeds = 'low' | 'moderate' | 'high' | 'aquatic'

export interface PlantSpeciesTemplate {
  id: string
  commonName: string
  scientificName: string
  alternateNames?: string[]
  plantType: PlantType
  careLevel: 'beginner' | 'intermediate' | 'advanced'
  light: LightLevel
  water: WaterNeeds
  humidity: 'low' | 'medium' | 'high'
  temperatureC: [number, number]
  toxicity: {
    animalSafe: boolean
    safeFor?: string[]
    toxicTo?: string[]
    notes?: string
  }
  enclosureTypes?: string[]
  propagation?: string[]
  specialNotes?: string[]
  wateringFrequencyDays: [number, number] | null
}

export type PlantType =
  | 'tropical'
  | 'succulent'
  | 'bromeliad'
  | 'moss'
  | 'fern'
  | 'carnivorous'
  | 'aquatic'
  | 'epiphyte'
  | 'vine'
  | 'other';

export type PlantStatus = 'thriving' | 'stable' | 'struggling' | 'dormant' | 'propagating' | 'dead';
export type LightNeeds = 'low' | 'medium' | 'bright_indirect' | 'full_sun';

export interface Plant {
  id: string;
  name: string;               // common name or nickname
  species: string;            // botanical name
  variety?: string;           // cultivar / variety
  type: PlantType;
  status: PlantStatus;
  enclosureId?: string;       // if planted in a bioactive enclosure
  lightNeeds: LightNeeds;
  wateringFrequencyDays?: number;
  lastWatered?: string;
  lastFertilized?: string;
  propagationsCount: number;
  notes?: string;
  thumbnailBase64?: string;
  photos?: import('./photo').AppPhoto[];
  acquisitionDate?: string;
  speciesId?: string;
  animalSafe?: boolean;
  createdAt: string;
  updatedAt: string;
}
