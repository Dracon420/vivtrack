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
  acquisitionDate?: string;
  createdAt: string;
  updatedAt: string;
}
