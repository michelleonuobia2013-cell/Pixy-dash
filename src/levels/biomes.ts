export type WorldBiomeStyle =
  | 'lava'
  | 'neon'
  | 'natural'
  | 'storm'
  | 'toxic'
  | 'aurora'
  | 'desert'
  | 'eclipse'
  | 'sakura';

export interface WorldBiomePalette {
  id: WorldBiomeStyle;
  label: string;
  calloutColor: string;
  skyTop: string;
  skyBottom: string;
  sunColor: string;
  farCity: string;
  midCity: string;
  buildingFill: string;
  buildingStroke: string;
  ledgeHighlight: string;
  horizonGlow: string;
  isNight: boolean;
  weather: 'mist' | 'clear' | 'wind' | 'rain' | 'storm';
}

export const WORLD_BIOMES: WorldBiomePalette[] = [
  {
    id: 'lava',
    label: 'LAVA ABYSS',
    calloutColor: '#F97316',
    skyTop: '#230A0D',
    skyBottom: '#EA580C',
    sunColor: '#FB923C',
    farCity: '#451A1C',
    midCity: '#2B1115',
    buildingFill: '#140B0F',
    buildingStroke: '#090406',
    ledgeHighlight: '#F97316',
    horizonGlow: '#EF4444',
    isNight: false,
    weather: 'wind',
  },
  {
    id: 'neon',
    label: 'NEON SKYLINE',
    calloutColor: '#22D3EE',
    skyTop: '#070B1E',
    skyBottom: '#4C1D95',
    sunColor: '#22D3EE',
    farCity: '#1E1B4B',
    midCity: '#151336',
    buildingFill: '#0B1026',
    buildingStroke: '#050714',
    ledgeHighlight: '#22D3EE',
    horizonGlow: '#EC4899',
    isNight: true,
    weather: 'clear',
  },
  {
    id: 'natural',
    label: 'NATURAL HORIZON',
    calloutColor: '#4ADE80',
    skyTop: '#0284C7',
    skyBottom: '#BAE6FD',
    sunColor: '#FEF08A',
    farCity: '#4B6B82',
    midCity: '#355368',
    buildingFill: '#1E293B',
    buildingStroke: '#0F172A',
    ledgeHighlight: '#22C55E',
    horizonGlow: '#38BDF8',
    isNight: false,
    weather: 'clear',
  },
  {
    id: 'storm',
    label: 'CYBER STORM',
    calloutColor: '#38BDF8',
    skyTop: '#0B132B',
    skyBottom: '#1E3A5F',
    sunColor: '#93C5FD',
    farCity: '#1B2A4A',
    midCity: '#111D35',
    buildingFill: '#091122',
    buildingStroke: '#040812',
    ledgeHighlight: '#38BDF8',
    horizonGlow: '#0EA5E9',
    isNight: true,
    weather: 'storm',
  },
  {
    id: 'toxic',
    label: 'TOXIC ACID',
    calloutColor: '#84CC16',
    skyTop: '#041B15',
    skyBottom: '#15803D',
    sunColor: '#BEF264',
    farCity: '#133A2A',
    midCity: '#0B261C',
    buildingFill: '#071711',
    buildingStroke: '#030B08',
    ledgeHighlight: '#84CC16',
    horizonGlow: '#4ADE80',
    isNight: true,
    weather: 'mist',
  },
  {
    id: 'aurora',
    label: 'ARCTIC AURORA',
    calloutColor: '#67E8F9',
    skyTop: '#041322',
    skyBottom: '#0E7490',
    sunColor: '#A5F3FC',
    farCity: '#16354D',
    midCity: '#0F2538',
    buildingFill: '#081726',
    buildingStroke: '#030B14',
    ledgeHighlight: '#67E8F9',
    horizonGlow: '#2DD4BF',
    isNight: true,
    weather: 'clear',
  },
  {
    id: 'desert',
    label: 'SOLAR MIRAGE',
    calloutColor: '#FBBF24',
    skyTop: '#451A03',
    skyBottom: '#F59E0B',
    sunColor: '#FEF08A',
    farCity: '#78350F',
    midCity: '#542409',
    buildingFill: '#291306',
    buildingStroke: '#140802',
    ledgeHighlight: '#FBBF24',
    horizonGlow: '#F59E0B',
    isNight: false,
    weather: 'wind',
  },
  {
    id: 'eclipse',
    label: 'BLOOD ECLIPSE',
    calloutColor: '#F43F5E',
    skyTop: '#140308',
    skyBottom: '#881337',
    sunColor: '#FB7185',
    farCity: '#3B0D19',
    midCity: '#260710',
    buildingFill: '#140509',
    buildingStroke: '#080204',
    ledgeHighlight: '#F43F5E',
    horizonGlow: '#E11D48',
    isNight: true,
    weather: 'wind',
  },
  {
    id: 'sakura',
    label: 'SAKURA DUSK',
    calloutColor: '#F472B6',
    skyTop: '#3B0764',
    skyBottom: '#F472B6',
    sunColor: '#FDE68A',
    farCity: '#5B2168',
    midCity: '#3E154A',
    buildingFill: '#1F0C29',
    buildingStroke: '#0F0514',
    ledgeHighlight: '#F472B6',
    horizonGlow: '#EC4899',
    isNight: false,
    weather: 'wind',
  },
];

export function pickRandomNextBiome(currentIdx: number, prevIdx: number): number {
  const candidates = WORLD_BIOMES.map((_, i) => i).filter((i) => i !== currentIdx && i !== prevIdx);
  const pool = candidates.length > 0 ? candidates : WORLD_BIOMES.map((_, i) => i).filter((i) => i !== currentIdx);
  return pool[Math.floor(Math.random() * pool.length)];
}
