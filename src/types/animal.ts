export type AnimalStatus = 'active' | 'deceased' | 'rehomed' | 'quarantine' | 'brumation';
export type Sex = 'male' | 'female' | 'unknown';

export interface Animal {
  id: string;
  name: string;
  species: string;
  morph?: string;
  sex: Sex;
  dateOfBirth?: string;
  acquisitionDate: string;
  acquisitionSource?: string;
  enclosureId?: string;
  photoIds: string[];
  primaryPhotoId?: string;
  rfidTag?: string;
  qrCodeToken: string;
  status: AnimalStatus;
  quarantineStartDate?: string;
  quarantineEndDate?: string;
  brumationStartDate?: string;
  brumationEndDate?: string;
  notes?: string;
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

export interface AnimalCareSchedule {
  id: string;
  animalId: string;
  feedingIntervalDays: number;
  mistingIntervalHours?: number;
  waterChangeIntervalDays?: number;
  substrateCleanIntervalDays: number;
  medicationReminders: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt: string;
}
