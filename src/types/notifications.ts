import type { CareEventType } from './careEvent'

export interface ScheduledNotification {
  id: string;
  animalId?: string;
  colonyId?: string;
  type: CareEventType | 'colony_low_stock' | 'bulb_replacement' | 'vet_followup' | 'medication';
  dueAt: string;
  title: string;
  body: string;
  url: string;
  fired: boolean;
  createdAt: string;
}
