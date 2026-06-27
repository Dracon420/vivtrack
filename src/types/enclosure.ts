export type SubstrateType =
  | 'coconut_fiber'
  | 'topsoil'
  | 'sand'
  | 'bioactive_mix'
  | 'paper_towel'
  | 'reptile_carpet'
  | 'cypress_mulch'
  | 'orchid_bark'
  | 'sphagnum_moss'
  | 'calcium_sand'
  | 'play_sand'
  | 'excavator_clay'
  | 'bioshot'
  | 'custom';

export interface SubstrateLayer {
  type: SubstrateType;
  customName?: string;
  depthCm: number;
  ratioPercent?: number;
}

export interface BulbRecord {
  id: string;
  type: 'basking' | 'uvb' | 'heat_panel' | 'ceramic_heat_emitter' | 'led' | 'deep_heat_projector';
  brand?: string;
  wattage?: number;
  uvbRating?: string;
  installedDate: string;
  replacementDueDate?: string;
  lifespanMonths?: number;
  notes?: string;
}

export interface LightingSchedule {
  onTime: string;
  offTime: string;
  uvbOnTime?: string;
  uvbOffTime?: string;
  seasonalAdjust: boolean;
}

export interface TemperatureZone {
  name: string;
  targetMin: number;
  targetMax: number;
}

export type EnclosureType = 'terrarium' | 'aquarium' | 'paludarium' | 'vivarium' | 'pond' | 'other';

export interface Enclosure {
  id: string;
  name: string;
  enclosureType?: EnclosureType;
  animalId?: string;
  dimensionsLWHcm: [number, number, number];
  substrate: SubstrateLayer[];
  bulbs: BulbRecord[];
  lightingSchedule?: LightingSchedule;
  temperatureZones: TemperatureZone[];
  humidityMin: number;
  humidityMax: number;
  lastSubstrateClean?: string;
  lastFullClean?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
