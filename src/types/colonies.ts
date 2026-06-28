export type FeederColonyType =
  | 'roach'
  | 'cricket'
  | 'mealworm'
  | 'superworm'
  | 'waxworm'
  | 'bsfl'
  | 'hornworm'
  | 'frozen_prey'
  | 'other';

export interface FeederColony {
  id: string;
  name: string;
  species: string;
  type: FeederColonyType;
  estimatedCount?: number;
  lastCountDate?: string;
  lastFedDate?: string;
  feedingNotes?: string;
  lowStockThreshold?: number;
  costPer?: number;
  costPerCount?: number;
  linkedAnimalIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CUCType = 'isopod' | 'springtail' | 'other';
export type CUCLocation = 'standalone_culture' | 'in_enclosure';
export type CUCHealth = 'thriving' | 'stable' | 'declining' | 'unknown';

export interface CUCCulture {
  id: string;
  name: string;
  species: string;
  type: CUCType;
  location: CUCLocation;
  enclosureId?: string;
  estimatedCount?: number;
  lastCountDate?: string;
  introductionDate?: string;
  substrateNotes?: string;
  lastFedDate?: string;
  feedingNotes?: string;
  reproductionHealth: CUCHealth;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColonyLogEvent {
  id: string;
  colonyId: string;
  colonyType: 'feeder' | 'cuc';
  eventType: 'count' | 'feed' | 'harvest' | 'restock' | 'health_check' | 'supplement' | 'split';
  occurredAt: string;
  countBefore?: number;
  countAfter?: number;
  harvestQuantity?: number;
  harvestForAnimalIds?: string[];
  notes?: string;
  createdAt: string;
}
