export type CareEventType =
  | 'feeding'
  | 'watering'
  | 'misting'
  | 'substrate_clean'
  | 'full_clean'
  | 'shed'
  | 'handling'
  | 'weight'
  | 'medication_dose'
  | 'vet_visit'
  | 'note'
  | 'brumation_check'
  | 'egg_turning'
  | 'temperature_check'
  | 'humidity_check'
  | 'photo'
  | 'soil_rehydration';

export type FeedingResult = 'accepted' | 'refused' | 'partial' | 'regurgitated';
export type ShedResult = 'complete' | 'partial' | 'stuck_shed' | 'assisted';

export interface CareEvent {
  id: string;
  animalId: string;
  enclosureId?: string;
  type: CareEventType;
  occurredAt: string;
  createdAt: string;

  feedingItem?: string;
  feedingResult?: FeedingResult;
  feedingWeightGrams?: number;
  feedingPreyFrozenThawed?: boolean;
  feedingQuantity?: number;

  weightGrams?: number;
  weightUnit?: 'g' | 'kg' | 'oz' | 'lb';

  shedResult?: ShedResult;
  shedAssistedDescription?: string;

  handlingDurationMinutes?: number;

  mistingDurationSeconds?: number;
  humidityAfter?: number;

  temperatureReadings?: { zone: string; tempC: number }[];

  medicationId?: string;
  medicationDoseGiven?: string;

  notes?: string;
  photoIds?: string[];
}
