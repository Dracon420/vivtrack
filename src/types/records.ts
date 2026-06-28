/* WeightRecord */
export interface WeightRecord {
  id: string;
  animalId: string;
  weightGrams: number;
  measuredAt: string;
  method?: 'scale' | 'estimated';
  notes?: string;
  createdAt: string;
}

/* VetVisit */
export interface VetMedication {
  drugName: string;
  dose: string;
  frequency: string;
  durationDays?: number;
}

export interface VetVisit {
  id: string;
  animalId: string;
  vetName: string;
  clinicName?: string;
  visitDate: string;
  reason: string;
  diagnosis?: string;
  treatmentDescription?: string;
  medications: VetMedication[];
  costCents?: number;
  currency?: string;
  followUpDate?: string;
  followUpReason?: string;
  notes?: string;
  createdAt: string;
}

/* Medication */
export type MedicationStatus = 'active' | 'completed' | 'discontinued';
export type MedicationRoute = 'oral' | 'injection' | 'topical' | 'nebulized' | 'other';

export interface Medication {
  id: string;
  animalId: string;
  vetVisitId?: string;
  drugName: string;
  concentration?: string;
  doseAmount: number;
  doseUnit: string;
  route: MedicationRoute;
  frequency: string;
  frequencyHours?: number;
  startDate: string;
  endDate?: string;
  status: MedicationStatus;
  administeredDates: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* Expense */
export type ExpenseCategory =
  | 'food'
  | 'substrate'
  | 'equipment'
  | 'enclosure'
  | 'veterinary'
  | 'medication'
  | 'electricity'
  | 'supplements'
  | 'decor'
  | 'animal_purchase'
  | 'shipping'
  | 'other';

export interface Expense {
  id: string;
  animalId?: string;
  enclosureId?: string;
  category: ExpenseCategory;
  description: string;
  amountCents: number;
  currency: string;
  date: string;
  autoSource?: 'feeder_harvest';
  colonyEventId?: string;
  notes?: string;
  createdAt: string;
}

/* BreedingRecord */
export type PairingResult = 'no_interest' | 'locked' | 'copulation_observed' | 'unknown';
export type ClutchStatus = 'pairing' | 'gravid' | 'incubating' | 'hatched' | 'failed' | 'infertile';

export interface PairingEvent {
  id: string;
  date: string;
  result: PairingResult;
  notes?: string;
}

export interface BreedingRecord {
  id: string;
  femaleAnimalId: string;
  maleAnimalId: string;
  seasonYear: number;
  pairingEvents: PairingEvent[];
  ovulationDate?: string;
  preLaySheds?: number;
  layDate?: string;
  clutchSize?: number;
  fertileCount?: number;
  status: ClutchStatus;
  incubationRecordId?: string;
  hatchCount?: number;
  hatchDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* IncubationLog */
export interface IncubationReading {
  id: string;
  timestamp: string;
  temperatureC: number;
  humidityPercent: number;
  notes?: string;
}

export interface EggStatus {
  eggNumber: number;
  status: 'viable' | 'infertile' | 'collapsed' | 'hatched' | 'unknown';
  candledDate?: string;
  notes?: string;
}

export interface IncubationLog {
  id: string;
  breedingRecordId: string;
  animalId: string;
  startDate: string;
  expectedHatchDate?: string;
  incubationMedium?: string;
  containerDescription?: string;
  targetTempC: number;
  targetHumidityPercent: number;
  readings: IncubationReading[];
  eggs: EggStatus[];
  hatchDate?: string;
  hatchCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
