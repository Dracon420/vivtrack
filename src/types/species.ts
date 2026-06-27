import type { SubstrateType } from './enclosure'

export type CareLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type AnimalClass = 'reptile' | 'amphibian' | 'invertebrate' | 'mammal' | 'bird';
export type AnimalOrder =
  | 'snake'
  | 'lizard'
  | 'chelonian'
  | 'frog'
  | 'salamander'
  | 'tarantula'
  | 'scorpion'
  | 'myriapod'
  | 'insect'
  | 'marsupial'
  | 'rodent'
  | 'mustelid'
  | 'psittacine'
  | 'softbill'
  | 'gastropod';

export interface SpeciesTemplate {
  id: string;
  commonName: string;
  scientificName: string;
  alternateNames?: string[];
  animalClass: AnimalClass;
  order: AnimalOrder;
  careLevel: CareLevel;
  lifespanYears: [number, number];
  adultSizeCm: [number, number];
  adultWeightGrams: [number, number];
  temperature: {
    coolSideCelsius: [number, number];
    warmSideCelsius: [number, number];
    baskingCelsius?: [number, number];
    nightDropCelsius?: number;
    notes?: string;
  };
  humidity: {
    min: number;
    max: number;
    mistingFrequency?: string;
  };
  lighting: {
    uvbRequired: boolean;
    uvbStrength?: '2.0' | '5.0' | '10.0' | '12';
    uvbBulbType?: 'T8' | 'T5 HO' | 'compact' | 'mercury_vapor';
    photoperiodHours: number;
    seasonalVariation: boolean;
    basking: boolean;
  };
  enclosure: {
    minimumSizeCm: [number, number, number];
    preferredStyle: 'terrestrial' | 'arboreal' | 'semi_aquatic' | 'aquatic' | 'fossorial';
    ventilation: 'top' | 'front' | 'screen_top' | 'full_screen';
  };
  substrateOptions: { type: SubstrateType; notes?: string }[];
  feeding: {
    itemsTypical: string[];
    frequencyDays: number;
    juvenileFrequencyDays?: number;
    feedingNotes?: string;
  };
  wateringNeeds: 'bowl_always' | 'bowl_optional' | 'drip_only' | 'misting_only' | 'none';
  handlingTemperament: 'docile' | 'skittish' | 'defensive' | 'variable';
  brumationCapable: boolean;
  brumationMonths?: [number, number];
  commonHealthIssues?: string[];
  specialNotes?: string[];
  incubationDaysRange?: [number, number];
  avgClutchSize?: [number, number];
}
