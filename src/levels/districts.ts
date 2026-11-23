import { ChallengeTag, TimeOfDay, WeatherCondition } from '../types/game';

export interface RooftopDistrict {
  index: number;
  id: string;
  name: string;
  subtitle: string;
  rangeStart: number;
  rangeEnd: number;
  biomeIndex: number;
  defaultWeather: WeatherCondition;
  defaultTimeOfDay: TimeOfDay;
  signatureFeature: string;
  accentColor: string;
}

export const ROOFTOP_DISTRICTS: RooftopDistrict[] = [
  {
    index: 0,
    id: 'beginner-heights',
    name: 'Beginner Heights',
    subtitle: 'Modern Metropolitan Skyline',
    rangeStart: 1,
    rangeEnd: 50,
    biomeIndex: 2, // Natural Horizon
    defaultWeather: 'sunny',
    defaultTimeOfDay: 'day',
    signatureFeature: 'Wide rooftop decks, glass breaches & introductory skybridges',
    accentColor: '#4ADE80',
  },
  {
    index: 1,
    id: 'sky-runner',
    name: 'Sky Runner District',
    subtitle: 'Sunrise Promenade Towers',
    rangeStart: 51,
    rangeEnd: 100,
    biomeIndex: 8, // Sakura Dusk
    defaultWeather: 'wind',
    defaultTimeOfDay: 'sunrise',
    signatureFeature: 'High-speed glider cables & precision landing pads',
    accentColor: '#F472B6',
  },
  {
    index: 2,
    id: 'extreme-heights',
    name: 'Extreme Heights',
    subtitle: 'Luxury Skyscraper Spires',
    rangeStart: 101,
    rangeEnd: 150,
    biomeIndex: 6, // Solar Mirage
    defaultWeather: 'wind',
    defaultTimeOfDay: 'sunset',
    signatureFeature: 'Upper tank citadels, aerial boosters & long lava chasms',
    accentColor: '#FBBF24',
  },
  {
    index: 3,
    id: 'industrial-towers',
    name: 'Industrial Towers',
    subtitle: 'Foundry & Rotating Crane Works',
    rangeStart: 151,
    rangeEnd: 200,
    biomeIndex: 0, // Lava Abyss
    defaultWeather: 'cloudy',
    defaultTimeOfDay: 'sunset',
    signatureFeature: 'Spinning turbine hazards, thermal geysers & collapsing bridges',
    accentColor: '#F97316',
  },
  {
    index: 4,
    id: 'neon-skyline',
    name: 'Neon Skyline',
    subtitle: 'Cyberpunk Hologram District',
    rangeStart: 201,
    rangeEnd: 250,
    biomeIndex: 1, // Neon Skyline
    defaultWeather: 'sunny',
    defaultTimeOfDay: 'night',
    signatureFeature: 'Timed laser gates, nightlights & neon sprint corridors',
    accentColor: '#22D3EE',
  },
  {
    index: 5,
    id: 'storm-district',
    name: 'Storm District',
    subtitle: 'Rainy Skyscraper High-Rises',
    rangeStart: 251,
    rangeEnd: 300,
    biomeIndex: 3, // Cyber Storm
    defaultWeather: 'rain',
    defaultTimeOfDay: 'night',
    signatureFeature: 'Slick rain slides (+12% slide speed) & lightning storms',
    accentColor: '#38BDF8',
  },
  {
    index: 6,
    id: 'glass-tower',
    name: 'Glass Tower District',
    subtitle: 'Mirrored Penthouse Corridor',
    rangeStart: 301,
    rangeEnd: 350,
    biomeIndex: 5, // Arctic Aurora
    defaultWeather: 'fog',
    defaultTimeOfDay: 'night',
    signatureFeature: 'Multi-pane glass halls & hidden penthouse shortcuts',
    accentColor: '#67E8F9',
  },
  {
    index: 7,
    id: 'impossible-heights',
    name: 'Impossible Heights',
    subtitle: 'Abandoned Vanishing Sector',
    rangeStart: 351,
    rangeEnd: 400,
    biomeIndex: 4, // Toxic Acid
    defaultWeather: 'heavyRain',
    defaultTimeOfDay: 'night',
    signatureFeature: 'Vanishing skybridges, drone patrols & high-altitude gaps',
    accentColor: '#84CC16',
  },
  {
    index: 8,
    id: 'survival-skyline',
    name: 'Survival Skyline',
    subtitle: 'Solar Gale & Extreme Skybridges',
    rangeStart: 401,
    rangeEnd: 450,
    biomeIndex: 6, // Solar Mirage
    defaultWeather: 'storm',
    defaultTimeOfDay: 'sunset',
    signatureFeature: 'Updraft wind canyons, timed locks & rapid collapses',
    accentColor: '#F59E0B',
  },
  {
    index: 9,
    id: 'ultimate-rooftop',
    name: 'Ultimate Rooftop Challenge',
    subtitle: 'Blood Eclipse Volcanic Apex',
    rangeStart: 451,
    rangeEnd: 500,
    biomeIndex: 7, // Blood Eclipse
    defaultWeather: 'storm',
    defaultTimeOfDay: 'night',
    signatureFeature: 'All mastery mechanics culminating in Rooftop 500: The Final Leap',
    accentColor: '#F43F5E',
  },
];

export function getDistrictForLevel(level: number): RooftopDistrict {
  const clamped = Math.max(1, Math.min(500, Math.round(level)));
  const idx = Math.min(ROOFTOP_DISTRICTS.length - 1, Math.floor((clamped - 1) / 50));
  return ROOFTOP_DISTRICTS[idx] ?? ROOFTOP_DISTRICTS[0];
}

export function getChallengeTagForLevel(level: number): ChallengeTag {
  if (level === 500) return 'finalLeap';
  if (level % 50 === 0) return 'skylineMarathon';
  if (level >= 15 && level % 17 === 0) return 'noMistake';
  if (level >= 10 && level % 11 === 0) return 'speedDemon';
  if (level >= 8 && level % 9 === 0) return 'perfectLanding';
  if (level >= 20 && level % 13 === 0) return 'vanishing';
  if (level >= 14 && level % 10 === 0) return 'movingCity';
  if (level >= 25 && level % 15 === 0) return 'extremeHeights';
  return 'standard';
}

export function getChallengeLabel(tag: ChallengeTag): string {
  switch (tag) {
    case 'perfectLanding':
      return 'Perfect Landing';
    case 'speedDemon':
      return 'Speed Demon';
    case 'noMistake':
      return 'No-Mistake Run';
    case 'skylineMarathon':
      return 'Skyline Marathon';
    case 'vanishing':
      return 'Vanishing Rooftop';
    case 'movingCity':
      return 'The Moving City';
    case 'extremeHeights':
      return 'Extreme Heights';
    case 'finalLeap':
      return 'Rooftop 500: The Final Leap';
    default:
      return 'Standard Run';
  }
}

export function getWeatherDisplayName(w: WeatherCondition): string {
  switch (w) {
    case 'sunny':
      return 'Clear Skies';
    case 'cloudy':
      return 'Overcast';
    case 'rain':
      return 'Light Rain · Fast Slide';
    case 'heavyRain':
      return 'Heavy Rain · Wet Roofs';
    case 'fog':
      return 'High-Rise Fog';
    case 'wind':
      return 'Crosswinds';
    case 'storm':
      return 'Thunderstorm';
  }
}

export function getTimeOfDayLabel(t: TimeOfDay): string {
  switch (t) {
    case 'sunrise':
      return 'Sunrise';
    case 'day':
      return 'Daytime';
    case 'sunset':
      return 'Sunset';
    case 'night':
      return 'Night';
  }
}

export interface SecretCatalogEntry {
  id: string;
  title: string;
  districtIndex: number;
  description: string;
  coinBonus: number;
  xpBonus: number;
}

export const SECRET_CATALOG: SecretCatalogEntry[] = [
  { id: 'sec-garden-0', title: 'Sunken Sky Garden', districtIndex: 0, description: 'An overgrown rooftop greenhouse suspended above Beginner Heights.', coinBonus: 120, xpBonus: 180 },
  { id: 'sec-deck-1', title: 'Sunrise Observation Deck', districtIndex: 1, description: 'A glass lookout cantilevered off Sky Runner District.', coinBonus: 140, xpBonus: 200 },
  { id: 'sec-spire-2', title: 'Crown Penthouse Helipad', districtIndex: 2, description: 'VIP landing pad perched high above Luxury Spires.', coinBonus: 160, xpBonus: 240 },
  { id: 'sec-foundry-3', title: 'Old Steam Control Room', districtIndex: 3, description: 'Hidden catwalk overlooking the Industrial Foundry cranes.', coinBonus: 180, xpBonus: 260 },
  { id: 'sec-neon-4', title: 'Hologram Rooftop Lounge', districtIndex: 4, description: 'Secret neon terrace tucked behind billboard arrays.', coinBonus: 200, xpBonus: 300 },
  { id: 'sec-storm-5', title: 'Lightning Rod Spire', districtIndex: 5, description: 'Upper weather station towering through the Storm District.', coinBonus: 220, xpBonus: 320 },
  { id: 'sec-glass-6', title: 'Crystal Atrium Bridge', districtIndex: 6, description: 'Suspended prism walkway between mirrored glass towers.', coinBonus: 240, xpBonus: 350 },
  { id: 'sec-ghost-7', title: 'Abandoned Metro Overpass', districtIndex: 7, description: 'Forgotten high-altitude viaduct in Impossible Heights.', coinBonus: 275, xpBonus: 380 },
  { id: 'sec-wind-8', title: 'Solar Gale Observatory', districtIndex: 8, description: 'Updraft ridge soaring above the Survival Skyline canyons.', coinBonus: 300, xpBonus: 420 },
  { id: 'sec-apex-9', title: 'Citadel 500 Summit Vault', districtIndex: 9, description: 'The highest secret shrine perched directly above Rooftop 500.', coinBonus: 500, xpBonus: 800 },
];
