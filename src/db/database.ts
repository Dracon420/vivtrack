import Dexie, { type EntityTable } from 'dexie'
import type {
  Animal,
  AnimalPhoto,
  AnimalCareSchedule,
  Enclosure,
  CareEvent,
  WeightRecord,
  VetVisit,
  Medication,
  Expense,
  BreedingRecord,
  IncubationLog,
  FeederColony,
  CUCCulture,
  ColonyLogEvent,
  ScheduledNotification,
} from '@/types'

class VivTrackDB extends Dexie {
  animals!: EntityTable<Animal, 'id'>
  animalPhotos!: EntityTable<AnimalPhoto, 'id'>
  animalCareSchedules!: EntityTable<AnimalCareSchedule, 'id'>
  enclosures!: EntityTable<Enclosure, 'id'>
  careEvents!: EntityTable<CareEvent, 'id'>
  weightRecords!: EntityTable<WeightRecord, 'id'>
  vetVisits!: EntityTable<VetVisit, 'id'>
  medications!: EntityTable<Medication, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  breedingRecords!: EntityTable<BreedingRecord, 'id'>
  incubationLogs!: EntityTable<IncubationLog, 'id'>
  feederColonies!: EntityTable<FeederColony, 'id'>
  cucCultures!: EntityTable<CUCCulture, 'id'>
  colonyLogEvents!: EntityTable<ColonyLogEvent, 'id'>
  scheduledNotifications!: EntityTable<ScheduledNotification, 'id'>

  constructor() {
    super('VivTrackDB')

    this.version(1).stores({
      animals: 'id, species, status, enclosureId, qrCodeToken, rfidTag, createdAt, updatedAt',
      animalPhotos: 'id, animalId, takenAt, createdAt',
      animalCareSchedules: 'id, animalId',
      enclosures: 'id, animalId, createdAt, updatedAt',
      careEvents: 'id, animalId, enclosureId, type, occurredAt, createdAt, [animalId+type]',
      weightRecords: 'id, animalId, measuredAt, createdAt',
      vetVisits: 'id, animalId, visitDate, followUpDate, createdAt',
      medications: 'id, animalId, vetVisitId, status, startDate, endDate, createdAt',
      expenses: 'id, animalId, enclosureId, category, date, createdAt',
      breedingRecords: 'id, femaleAnimalId, maleAnimalId, status, seasonYear, createdAt',
      incubationLogs: 'id, breedingRecordId, animalId, createdAt',
      feederColonies: 'id, type, createdAt, updatedAt',
      cucCultures: 'id, type, enclosureId, createdAt, updatedAt',
      colonyLogEvents: 'id, colonyId, colonyType, eventType, occurredAt, createdAt',
      scheduledNotifications: 'id, animalId, type, dueAt, fired',
    })

    this.version(2).stores({
      animals: 'id, name, species, status, enclosureId, qrCodeToken, rfidTag, createdAt, updatedAt',
      animalPhotos: 'id, animalId, takenAt, createdAt',
      animalCareSchedules: 'id, animalId',
      enclosures: 'id, name, animalId, createdAt, updatedAt',
      careEvents: 'id, animalId, enclosureId, type, occurredAt, createdAt, [animalId+type]',
      weightRecords: 'id, animalId, measuredAt, createdAt',
      vetVisits: 'id, animalId, visitDate, followUpDate, createdAt',
      medications: 'id, animalId, vetVisitId, status, startDate, endDate, createdAt',
      expenses: 'id, animalId, enclosureId, category, date, createdAt',
      breedingRecords: 'id, femaleAnimalId, maleAnimalId, status, seasonYear, createdAt',
      incubationLogs: 'id, breedingRecordId, animalId, createdAt',
      feederColonies: 'id, name, type, createdAt, updatedAt',
      cucCultures: 'id, name, type, enclosureId, createdAt, updatedAt',
      colonyLogEvents: 'id, colonyId, colonyType, eventType, occurredAt, createdAt',
      scheduledNotifications: 'id, animalId, type, dueAt, fired',
    })
  }
}

export const db = new VivTrackDB()
