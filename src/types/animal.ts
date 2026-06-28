export type AnimalStatus = 'active' | 'deceased' | 'rehomed' | 'quarantine' | 'brumation';
export type Sex = 'male' | 'female' | 'unknown';

export interface Animal {
  id: string;
  name: string;
  species: string;
  speciesId?: string;
  morph?: string;
  photos?: import('./photo').AppPhoto[];
  sex: Sex;
  dateOfBirth?: string;
  acquisitionDate: string;
  acquisitionSource?: string;
  enclosureId?: string;
  photoIds: string[];
  primaryPhotoId?: string;
  thumbnailBase64?: string;
  rfidTag?: string;
  qrCodeToken: string;
  status: AnimalStatus;
  quarantineStartDate?: string;
  quarantineEndDate?: string;
  brumationStartDate?: string;
  brumationEndDate?: string;
  notes?: string;
  groupCount?: number;
  isGroup?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnimalPhoto {
  id: string;
  animalId: string;
  blob: Blob;
  caption?: string;
  takenAt: string;
  createdAt: string;
}

export interface CustomTask {
  id: string;
  name: string;
  intervalValue: number;
  intervalUnit: 'hours' | 'days' | 'weeks' | 'months';
  startDate?: string;
}

export interface AnimalCareSchedule {
  id: string;
  animalId: string;
  feedingIntervalDays: number;
  // Misting (expanded)
  mistingType?: 'manual' | 'automatic';
  mistingScheduleType?: 'none' | 'interval' | 'times';
  mistingInterval?: number;
  mistingIntervalUnit?: 'hours' | 'days';
  mistingTimes?: string[];
  mistingIntervalHours?: number; // legacy / computed for dashboard
  // Water
  waterChangeIntervalDays?: number;
  // Soil
  soilRehydrationIntervalDays?: number;
  substrateCleanIntervalDays: number;
  substrateChangeIntervalDays?: number;
  scheduleStartDate?: string;
  medicationReminders: boolean;
  additives?: string[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  customTasks?: CustomTask[];
  updatedAt: string;
}
