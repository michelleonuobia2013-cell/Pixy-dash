import {
  AirBooster,
  BoostStrip,
  Checkpoint,
  CourseDefinition,
  EnemyEntity,
  GlassWall,
  GrindRail,
  Hazard,
  Platform,
  PowerUpItem,
  PowerUpType,
  RotatingObstacle,
  SecretDiscovery,
  Shard,
  SpringPad,
  ThermalVent,
  TimedGate,
  WindZone,
} from '../types/game';
import { WORLD_BIOMES } from './biomes';
import {
  getChallengeLabel,
  getChallengeTagForLevel,
  getDistrictForLevel,
  SECRET_CATALOG,
} from './districts';

export const MAX_LEVEL = 500;
export const LAVA_SURFACE_Y = 700;
export const HIGH_PLACE_Y_THRESHOLD = 385;

export function createSeededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const ENDLESS_COURSE: CourseDefinition = {
  id: 'endless-skyline',
  levelNumber: 0,
  title: 'Endless Run',
  subtitle: 'Infinite rooftop chase over boiling lava — pass 5 high places without falling to level up.',
  difficulty: 'Endless',
  baseSpeed: 385,
  timeLimitSec: 0,
  goldTimeSec: 1000,
  silverTimeSec: 500,
  isEndless: true,
  fallLimitY: LAVA_SURFACE_Y + 8,
  startX: 120,
  startY: 420,
  finishX: 9999999,
  finishY: 480,
  theme: {
    name: 'Amber Dusk',
    skyTop: '#1E293B',
    skyBottom: '#FDBA74',
    sunColor: '#FB923C',
    farCity: '#475569',
    midCity: '#334155',
    buildingFill: '#111827',
    buildingStroke: '#030712',
    ledgeHighlight: '#F97316',
    weather: 'wind',
  },
  platforms: [
    { id: 'e-start', x: 0, y: 480, w: 1020, h: 460, kind: 'building', accentEdge: 'top', prop: 'antenna' },
    { id: 'e-start-box', x: 420, y: 410, w: 80, h: 70, kind: 'box', accentEdge: 'top' },
    { id: 'e-start-high', x: 640, y: 345, w: 240, h: 32, kind: 'bridge', accentEdge: 'top', isHighPlace: true },
  ],
  rails: [
    { id: 'e-gl0', x1: 770, y1: 280, x2: 1015, y2: 280, kind: 'glider', isHighPlace: true },
  ],
  springs: [
    { id: 'e-sp0', x: 540, y: 464, w: 72, h: 16, power: 940 },
  ],
  boosts: [],
  airBoosters: [
    { id: 'e-ab0', x: 1075, y: 356, radius: 36, dir: 'up-forward' },
  ],
  glassWalls: [
    { id: 'e-gw0', x: 325, y: 270, w: 22, h: 210 },
  ],
  thermalVents: [
    { id: 'e-tv0', x: 1035, y: 360, w: 96, h: LAVA_SURFACE_Y - 360, powerVy: 840 },
  ],
  hazards: [
    { id: 'e-hg0', x: 650, y: 468, w: 96, h: 12, kind: 'hotground' },
  ],
  checkpoints: [],
  shards: [
    { id: 'e-sh0', x: 760, y: 306 },
    { id: 'e-sh1', x: 890, y: 250 },
  ],
  powerUps: [
    { id: 'e-pu0', x: 865, y: 428, kind: 'shield' },
  ],
  enemies: [],
};

export const TUTORIAL_COURSE: CourseDefinition = {
  ...ENDLESS_COURSE,
  id: 'tutorial-guide',
  levelNumber: 0,
  title: 'Runner Guide',
  subtitle: 'Quick rooftop warm-up — swipe up to vault, air-vault hot ground, and swipe down to slide.',
  baseSpeed: 360,
  isEndless: true,
  finishX: 9999999,
  finishY: 480,
  platforms: [
    { id: 'tut-start', x: 0, y: 480, w: 1920, h: 460, kind: 'building', accentEdge: 'top', prop: 'antenna' },
    { id: 'tut-box', x: 450, y: 412, w: 76, h: 68, kind: 'box', accentEdge: 'top' },
    { id: 'tut-ov', x: 1260, y: 256, w: 175, h: 188, kind: 'overhead', accentEdge: 'none' },
  ],
  rails: [],
  springs: [],
  boosts: [],
  airBoosters: [],
  glassWalls: [],
  thermalVents: [],
  hazards: [
    { id: 'tut-hg', x: 800, y: 468, w: 136, h: 12, kind: 'hotground' },
  ],
  checkpoints: [],
  shards: [
    { id: 'tut-sh1', x: 488, y: 374 },
    { id: 'tut-sh2', x: 875, y: 342 },
    { id: 'tut-sh3', x: 1345, y: 458 },
  ],
  powerUps: [],
  enemies: [],
};

export interface EndlessChunkResult {
  nextX: number;
  nextY: number;
  platforms: Platform[];
  rails: GrindRail[];
  springs: SpringPad[];
  boosts: BoostStrip[];
  airBoosters: AirBooster[];
  glassWalls: GlassWall[];
  thermalVents: ThermalVent[];
  rotatingObstacles: RotatingObstacle[];
  timedGates: TimedGate[];
  windZones: WindZone[];
  hazards: Hazard[];
  shards: Shard[];
  powerUps: PowerUpItem[];
  enemies: EnemyEntity[];
}

export function generateEndlessChunk(
  startX: number,
  prevY: number,
  chunkIndex: number,
  rng: () => number = Math.random,
  difficultyOverride?: number
): EndlessChunkResult {
  const platforms: Platform[] = [];
  const rails: GrindRail[] = [];
  const springs: SpringPad[] = [];
  const boosts: BoostStrip[] = [];
  const airBoosters: AirBooster[] = [];
  const glassWalls: GlassWall[] = [];
  const thermalVents: ThermalVent[] = [];
  const rotatingObstacles: RotatingObstacle[] = [];
  const timedGates: TimedGate[] = [];
  const windZones: WindZone[] = [];
  const hazards: Hazard[] = [];
  const shards: Shard[] = [];
  const powerUps: PowerUpItem[] = [];
  const enemies: EnemyEntity[] = [];

  const maxPatternCount =
    difficultyOverride === undefined
      ? 16
      : difficultyOverride >= 0.35
      ? 16
      : 14;

  const pattern =
    difficultyOverride === undefined && chunkIndex === 1
      ? 7
      : difficultyOverride === undefined && chunkIndex === 2
      ? 9
      : difficultyOverride === undefined && chunkIndex === 3
      ? 12
      : difficultyOverride === undefined && chunkIndex === 4
      ? 13
      : Math.floor(rng() * maxPatternCount);
  const clampY = (y: number) => Math.max(175, Math.min(495, y));
  const props: Platform['prop'][] = ['antenna', 'hvac', 'watertower', 'billboard', undefined];
  const pickProp = () => props[Math.floor(rng() * props.length)];
  const powerTypes: PowerUpType[] = ['surge', 'shield', 'magnet'];
  const pickPower = (): PowerUpType => powerTypes[Math.floor(rng() * powerTypes.length)];
  const pickGlassH = (base: number) => base + Math.round((rng() - 0.5) * 34);

  const ramp =
    difficultyOverride !== undefined
      ? Math.min(1, difficultyOverride * 0.72 + chunkIndex * 0.025)
      : Math.min(1, chunkIndex / 55);
  let curX = startX;
  let curY = prevY;

  if (pattern === 0) {
    // Bigger rooftop with overhead duct, high upper sky-deck, sentry, and glass wall
    const gap = Math.round(145 + ramp * 65);
    const y = clampY(curY + (rng() * 50 - 25));
    const w = Math.round(690 - ramp * 55 + rng() * 110);
    const rx = curX + gap;
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: rx, y, w, h: 560, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: y <= HIGH_PLACE_Y_THRESHOLD });
    platforms.push({ id: `ec-${chunkIndex}-ov`, x: rx + 165, y: y - 224, w: 155, h: 180, kind: 'overhead', accentEdge: 'none' });
    // High-altitude rooftop bridge accessible via spring/double-jump
    springs.push({ id: `ec-${chunkIndex}-sp`, x: rx + 70, y: y - 16, w: 72, h: 16, power: 930 });
    platforms.push({ id: `ec-${chunkIndex}-sky`, x: rx + 210, y: clampY(y - 165), w: 230, h: 30, kind: 'bridge', accentEdge: 'top', isHighPlace: true });
    enemies.push({
      id: `ec-${chunkIndex}-en1`,
      x: rx + 410,
      y: y - 52,
      w: 28,
      h: 52,
      kind: 'sentry',
      baseX: rx + 410,
      patrolRange: 22,
      phase: chunkIndex * 0.9,
    });
    boosts.push({ id: `ec-${chunkIndex}-b`, x: rx + Math.round(w * 0.72), y: y - 6, w: 130, h: 6 });
    const gwH0 = pickGlassH(215);
    glassWalls.push({ id: `ec-${chunkIndex}-gw1`, x: rx + Math.round(w * 0.85), y: y - gwH0, w: 22, h: gwH0 });
    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: rx + w + 54, y: y - 84, radius: 36, dir: rng() < 0.5 ? 'up-forward' : 'forward' });
    shards.push(
      { id: `ec-${chunkIndex}-s1`, x: rx + 245, y: y - 24 },
      { id: `ec-${chunkIndex}-s2`, x: rx + 325, y: clampY(y - 165) - 36 }
    );
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: rx + 245, y: y - 260, kind: pickPower() });
    curX = rx + w;
    curY = y;
  } else if (pattern === 1) {
    // Grand Bar Line Glider or Rooftop Grind Rail spanning wide boiling lava chasm
    const gap1 = Math.round(140 + ramp * 50);
    const y1 = clampY(curY - 18);
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: curX + gap1, y: y1, w: 380, h: 560, kind: 'building', accentEdge: 'top', isHighPlace: y1 <= HIGH_PLACE_Y_THRESHOLD });
    const railStartX = curX + gap1 + 330;
    const railEndX = railStartX + 540 + Math.round(ramp * 80);
    const y2 = clampY(y1 + 26);
    const isGlider = chunkIndex % 2 === 1;
    const lineOffset = isGlider ? -136 : -54;
    const isHighRail = y1 + lineOffset <= 360;
    rails.push({
      id: `ec-${chunkIndex}-r1`,
      x1: railStartX,
      y1: y1 + lineOffset,
      x2: railEndX,
      y2: y2 + lineOffset,
      kind: isGlider ? 'glider' : 'rail',
      isHighPlace: isHighRail,
    });
    // Thermal lava updraft beneath the mid-span in case the player drops low
    const ventX = Math.round((railStartX + railEndX) * 0.5 - 48);
    thermalVents.push({
      id: `ec-${chunkIndex}-tv1`,
      x: ventX,
      y: y1 + 40,
      w: 96,
      h: LAVA_SURFACE_Y - (y1 + 40),
      powerVy: 860,
    });
    shards.push({
      id: `ec-${chunkIndex}-s1`,
      x: (railStartX + railEndX) / 2,
      y: (y1 + y2) / 2 + (isGlider ? -88 : -90),
    });
    airBoosters.push({
      id: `ec-${chunkIndex}-ab1`,
      x: railEndX + 30,
      y: y2 + (isGlider ? -98 : -72),
      radius: 35,
      dir: 'up-forward',
    });
    powerUps.push({
      id: `ec-${chunkIndex}-pu`,
      x: (railStartX + railEndX) / 2 + 110,
      y: (y1 + y2) / 2 + (isGlider ? -86 : -94),
      kind: pickPower(),
    });
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: railEndX + 55, y: y2, w: 500, h: 560, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: y2 <= HIGH_PLACE_Y_THRESHOLD });
    enemies.push({
      id: `ec-${chunkIndex}-en1`,
      x: railEndX + 295,
      y: y2 - 52,
      w: 28,
      h: 52,
      kind: 'sentry',
      baseX: railEndX + 295,
      patrolRange: 28,
      phase: chunkIndex * 1.3,
    });
    curX = railEndX + 55 + 500;
    curY = y2;
  } else if (pattern === 2) {
    // Skyscraper Spring Vault to High-Altitude Tower
    const gap1 = Math.round(140 + ramp * 55);
    const y1 = clampY(curY + 35);
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: curX + gap1, y: y1, w: 370, h: 560, kind: 'building', accentEdge: 'top' });
    springs.push({ id: `ec-${chunkIndex}-sp`, x: curX + gap1 + 195, y: y1 - 16, w: 80, h: 16, power: 1020 });
    const y2 = clampY(y1 - 175);
    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: curX + gap1 + 320, y: y2 - 22, radius: 36, dir: 'up-forward' });
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: curX + gap1 + 425, y: y2, w: 570, h: 680, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: true });
    const gwH2 = pickGlassH(220);
    glassWalls.push({ id: `ec-${chunkIndex}-gw1`, x: curX + gap1 + 585, y: y2 - gwH2, w: 22, h: gwH2 });
    shards.push({ id: `ec-${chunkIndex}-s1`, x: curX + gap1 + 370, y: y2 - 74 });
    enemies.push({
      id: `ec-${chunkIndex}-en1`,
      x: curX + gap1 + 740,
      y: y2 - 90,
      w: 32,
      h: 26,
      kind: 'drone',
      baseX: curX + gap1 + 740,
      patrolRange: 32,
      phase: chunkIndex * 1.1,
    });
    if (chunkIndex % 2 === 1) {
      powerUps.push({ id: `ec-${chunkIndex}-pu`, x: curX + gap1 + 370, y: y2 - 126, kind: pickPower() });
    }
    curX = curX + gap1 + 425 + 570;
    curY = y2;
  } else if (pattern === 3) {
    // High-Altitude Collapsing Sky Bridges over Boiling Lava + Thermal Vent
    const gap1 = Math.round(145 + ramp * 50);
    const y1 = clampY(curY - 45);
    const bw = Math.round(270 - ramp * 30);
    platforms.push({ id: `ec-${chunkIndex}-b1`, x: curX + gap1, y: y1, w: bw, h: 32, kind: 'bridge', accentEdge: 'top', isHighPlace: true });
    const y2 = clampY(y1 - 32);
    platforms.push({ id: `ec-${chunkIndex}-b2`, x: curX + gap1 + bw + gap1, y: y2, w: bw, h: 32, kind: 'bridge', accentEdge: 'top', isHighPlace: true });
    thermalVents.push({
      id: `ec-${chunkIndex}-tv1`,
      x: curX + gap1 + bw + Math.round(gap1 * 0.5) - 44,
      y: y2 + 25,
      w: 88,
      h: LAVA_SURFACE_Y - (y2 + 25),
      powerVy: 840,
    });
    const y3 = clampY(y2 + 34);
    const landX = curX + gap1 + (bw + gap1) * 2;
    platforms.push({ id: `ec-${chunkIndex}-p3`, x: landX, y: y3, w: 560, h: 560, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: y3 <= HIGH_PLACE_Y_THRESHOLD });
    hazards.push({ id: `ec-${chunkIndex}-h`, x: landX + 225, y: y3 - 12, w: 105, h: 12, kind: 'hotground' });
    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: landX + 205, y: y3 - 74, radius: 34, dir: 'up' });
    shards.push({ id: `ec-${chunkIndex}-s1`, x: curX + gap1 + bw + Math.round(gap1 * 0.5), y: y2 - 58 });
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: landX + 278, y: y3 - 130, kind: pickPower() });
    curX = landX + 560;
    curY = y3;
  } else if (pattern === 4) {
    // Moving High Sky-Ferry + Tall Rooftop Glass Breach
    const gap1 = Math.round(145 + ramp * 50);
    const y1 = clampY(curY - 20);
    platforms.push({
      id: `ec-${chunkIndex}-m1`,
      x: curX + gap1 + 30,
      y: y1,
      w: 245,
      h: 30,
      kind: 'bridge',
      accentEdge: 'top',
      moveAxis: 'x',
      moveRange: 72,
      moveSpeed: 1.35 + ramp * 0.45,
      movePhase: chunkIndex,
      isHighPlace: y1 <= HIGH_PLACE_Y_THRESHOLD,
    });
    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: curX + gap1 + 345, y: y1 - 88, radius: 35, dir: 'forward' });
    const y2 = clampY(y1 - 24);
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: curX + gap1 + 455, y: y2, w: 600, h: 560, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: y2 <= HIGH_PLACE_Y_THRESHOLD });
    if (chunkIndex >= 4) {
      platforms.push({ id: `ec-${chunkIndex}-rbox`, x: curX + gap1 + 700, y: y2 - 70, w: 78, h: 70, kind: 'box', accentEdge: 'top', isHighPlace: y2 - 70 <= HIGH_PLACE_Y_THRESHOLD });
    }
    if (chunkIndex % 2 === 0) {
      glassWalls.push({ id: `ec-${chunkIndex}-gw1`, x: curX + gap1 + 575, y: y2 - 210, w: 22, h: 210 });
    }
    enemies.push({
      id: `ec-${chunkIndex}-en1`,
      x: curX + gap1 + 885,
      y: y2 - 52,
      w: 28,
      h: 52,
      kind: 'sentry',
      baseX: curX + gap1 + 885,
      patrolRange: 28,
      phase: chunkIndex * 0.7,
    });
    shards.push({ id: `ec-${chunkIndex}-s1`, x: curX + gap1 + 150, y: y1 - 58 });
    curX = curX + gap1 + 455 + 600;
    curY = y2;
  } else if (pattern === 5) {
    // Elevated Curved Stepping Towers over Boiling Lava with Thermal Recovery Vent
    const gap1 = Math.round(135 + ramp * 40);
    const boxSize = Math.round(98 - ramp * 8);
    const boxGap = Math.round(135 + ramp * 40);
    const y1 = clampY(curY - 30);
    const y2 = clampY(y1 - 36);
    const bx1 = curX + gap1;
    const bx2 = bx1 + boxSize + boxGap;
    const bx3 = bx2 + boxSize + boxGap;
    platforms.push(
      { id: `ec-${chunkIndex}-bx1`, x: bx1, y: y1, w: boxSize, h: boxSize, kind: 'box', accentEdge: 'top', isHighPlace: y1 <= HIGH_PLACE_Y_THRESHOLD },
      { id: `ec-${chunkIndex}-bx2`, x: bx2, y: y2, w: boxSize, h: boxSize, kind: 'box', accentEdge: 'top', isHighPlace: true },
      { id: `ec-${chunkIndex}-bx3`, x: bx3, y: y1, w: boxSize, h: boxSize, kind: 'box', accentEdge: 'top', isHighPlace: y1 <= HIGH_PLACE_Y_THRESHOLD }
    );
    thermalVents.push({
      id: `ec-${chunkIndex}-tv1`,
      x: bx2 + Math.round(boxSize * 0.5) - 48,
      y: y2 + boxSize + 10,
      w: 96,
      h: LAVA_SURFACE_Y - (y2 + boxSize + 10),
      powerVy: 860,
    });
    shards.push(
      { id: `ec-${chunkIndex}-bxs1`, x: bx1 + Math.round(boxSize / 2), y: y1 - 36 },
      { id: `ec-${chunkIndex}-bxs2`, x: bx2 + Math.round(boxSize / 2), y: y2 - 36 }
    );
    enemies.push({
      id: `ec-${chunkIndex}-en1`,
      x: bx2 + boxSize + Math.round(boxGap * 0.5),
      y: y2 - 22,
      w: 32,
      h: 26,
      kind: 'drone',
      baseX: bx2 + boxSize + Math.round(boxGap * 0.5),
      patrolRange: 22,
      phase: chunkIndex * 1.4,
    });
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: bx3 + Math.round(boxSize / 2), y: y1 - 46, kind: pickPower() });
    const landX = bx3 + boxSize + 150;
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: landX, y: y1 + 14, w: 510, h: 560, kind: 'building', accentEdge: 'top', prop: pickProp() });
    curX = landX + 510;
    curY = y1 + 14;
  } else if (pattern === 6) {
    // Hot Ground Molten Rooftop + High Bar Line Glider + Box Islands
    const gap1 = Math.round(140 + ramp * 45);
    const y1 = clampY(curY + (rng() * 32 - 16));
    const roofW = 820;
    const roofX = curX + gap1;
    platforms.push({
      id: `ec-${chunkIndex}-hgp`,
      x: roofX,
      y: y1,
      w: roofW,
      h: 560,
      kind: 'building',
      accentEdge: 'top',
      prop: pickProp(),
    });
    hazards.push({
      id: `ec-${chunkIndex}-hg1`,
      x: roofX + 165,
      y: y1 - 12,
      w: 340,
      h: 12,
      kind: 'hotground',
    });
    platforms.push(
      { id: `ec-${chunkIndex}-hgb1`, x: roofX + 215, y: y1 - 68, w: 82, h: 68, kind: 'box', accentEdge: 'top', isHighPlace: y1 - 68 <= HIGH_PLACE_Y_THRESHOLD },
      { id: `ec-${chunkIndex}-hgb2`, x: roofX + 385, y: y1 - 68, w: 82, h: 68, kind: 'box', accentEdge: 'top', isHighPlace: y1 - 68 <= HIGH_PLACE_Y_THRESHOLD }
    );
    rails.push({
      id: `ec-${chunkIndex}-hggl`,
      x1: roofX + 145,
      y1: y1 - 166,
      x2: roofX + 530,
      y2: y1 - 166,
      kind: 'glider',
      isHighPlace: true,
    });
    shards.push(
      { id: `ec-${chunkIndex}-hgs1`, x: roofX + 256, y: y1 - 104 },
      { id: `ec-${chunkIndex}-hgs2`, x: roofX + 426, y: y1 - 104 }
    );
    enemies.push({
      id: `ec-${chunkIndex}-en1`,
      x: roofX + 670,
      y: y1 - 52,
      w: 28,
      h: 52,
      kind: 'sentry',
      baseX: roofX + 670,
      patrolRange: 24,
      phase: chunkIndex * 1.7,
    });
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: roofX + 340, y: y1 - 142, kind: pickPower() });
    curX = roofX + roofW;
    curY = y1;
  } else if (pattern === 7) {
    // Twin High Overhead Bar Line Gliders linked by a Mid-Air Booster above Boiling Lava
    const gap1 = Math.round(125 + ramp * 35);
    const y1 = clampY(curY - 12);
    const roof1X = curX + gap1;
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: roof1X, y: y1, w: 330, h: 560, kind: 'building', accentEdge: 'top', prop: pickProp() });

    const gl1X1 = roof1X + 205;
    const gl1X2 = gl1X1 + 410;
    const gl1Y = y1 - 128;
    rails.push({ id: `ec-${chunkIndex}-gl1`, x1: gl1X1, y1: gl1Y, x2: gl1X2, y2: gl1Y - 16, kind: 'glider', isHighPlace: true });

    platforms.push({ id: `ec-${chunkIndex}-sb1`, x: roof1X + 380, y: y1 + 38, w: 245, h: 30, kind: 'bridge', accentEdge: 'top' });

    const boostX = gl1X2 + 58;
    const boostY = gl1Y - 12;
    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: boostX, y: boostY, radius: 38, dir: 'up-forward' });

    const gl2X1 = boostX + 92;
    const gl2X2 = gl2X1 + 400;
    const gl2Y = clampY(y1 - 44) - 130;
    rails.push({ id: `ec-${chunkIndex}-gl2`, x1: gl2X1, y1: gl2Y, x2: gl2X2, y2: gl2Y + 14, kind: 'glider', isHighPlace: true });

    const landY = clampY(y1 - 24);
    const landX = gl2X1 + 55;
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: landX, y: landY, w: 580, h: 560, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: landY <= HIGH_PLACE_Y_THRESHOLD });

    shards.push(
      { id: `ec-${chunkIndex}-s1`, x: (gl1X1 + gl1X2) * 0.5, y: gl1Y + 26 },
      { id: `ec-${chunkIndex}-s2`, x: (gl2X1 + gl2X2) * 0.5, y: gl2Y + 26 }
    );
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: boostX + 46, y: boostY - 40, kind: pickPower() });
    enemies.push({
      id: `ec-${chunkIndex}-en1`,
      x: gl2X2 + 16,
      y: landY - 84,
      w: 32,
      h: 26,
      kind: 'drone',
      baseX: gl2X2 + 16,
      patrolRange: 24,
      phase: chunkIndex * 1.2,
    });

    curX = landX + 580;
    curY = landY;
  } else if (pattern === 8) {
    // Aerial Air Booster Jet Highway + High Sky Bridges over Lava Sea
    const gap1 = Math.round(130 + ramp * 35);
    const y1 = clampY(curY);
    const roof1X = curX + gap1;
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: roof1X, y: y1, w: 310, h: 560, kind: 'building', accentEdge: 'top' });
    springs.push({ id: `ec-${chunkIndex}-sp`, x: roof1X + 205, y: y1 - 16, w: 76, h: 16, power: 950 });

    const ab1X = roof1X + 360;
    const ab1Y = y1 - 125;
    const ab2X = ab1X + 255;
    const ab2Y = y1 - 165;
    const ab3X = ab2X + 260;
    const ab3Y = y1 - 140;

    airBoosters.push(
      { id: `ec-${chunkIndex}-ab1`, x: ab1X, y: ab1Y, radius: 38, dir: 'up-forward' },
      { id: `ec-${chunkIndex}-ab2`, x: ab2X, y: ab2Y, radius: 38, dir: 'forward' },
      { id: `ec-${chunkIndex}-ab3`, x: ab3X, y: ab3Y, radius: 38, dir: 'up-forward' }
    );

    platforms.push(
      { id: `ec-${chunkIndex}-sb1`, x: roof1X + 400, y: clampY(y1 + 20), w: 230, h: 30, kind: 'bridge', accentEdge: 'top' },
      { id: `ec-${chunkIndex}-sb2`, x: roof1X + 730, y: clampY(y1 - 80), w: 230, h: 30, kind: 'bridge', accentEdge: 'top', isHighPlace: true }
    );
    thermalVents.push({
      id: `ec-${chunkIndex}-tv1`,
      x: roof1X + 645,
      y: y1 + 10,
      w: 84,
      h: LAVA_SURFACE_Y - (y1 + 10),
      powerVy: 860,
    });

    shards.push(
      { id: `ec-${chunkIndex}-s1`, x: ab1X + 128, y: ab1Y - 48 },
      { id: `ec-${chunkIndex}-s2`, x: ab2X + 130, y: ab2Y - 24 }
    );
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: ab2X + 130, y: ab2Y - 76, kind: pickPower() });

    const landX = ab3X + 145;
    const landY = clampY(y1 - 28);
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: landX, y: landY, w: 540, h: 560, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: landY <= HIGH_PLACE_Y_THRESHOLD });
    boosts.push({ id: `ec-${chunkIndex}-bs`, x: landX + 240, y: landY - 6, w: 130, h: 6 });
    curX = landX + 540;
    curY = landY;
  } else if (pattern === 9) {
    // Grand Skyscraper Glass Corridor + High Upper Roof Route
    const gap1 = Math.round(130 + ramp * 35);
    const y1 = clampY(curY - 12);
    const hallX = curX + gap1;
    const hallW = 940;
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: hallX, y: y1, w: hallW, h: 580, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: y1 <= HIGH_PLACE_Y_THRESHOLD });
    // High rooftop canopy bridge — playable as a high place if reached!
    platforms.push({ id: `ec-${chunkIndex}-canopy`, x: hallX + 120, y: y1 - 262, w: 690, h: 30, kind: 'bridge', accentEdge: 'top', isHighPlace: true });
    boosts.push({ id: `ec-${chunkIndex}-bs`, x: hallX + 60, y: y1 - 6, w: 130, h: 6 });

    const gw1X = hallX + 245;
    const gw2X = hallX + 505;
    const gw3X = hallX + 765;
    glassWalls.push(
      { id: `ec-${chunkIndex}-gw1`, x: gw1X, y: y1 - 232, w: 22, h: 232 },
      { id: `ec-${chunkIndex}-gw2`, x: gw2X, y: y1 - 232, w: 22, h: 232 },
      { id: `ec-${chunkIndex}-gw3`, x: gw3X, y: y1 - 232, w: 22, h: 232 }
    );

    shards.push(
      { id: `ec-${chunkIndex}-s1`, x: gw1X + 105, y: y1 - 44 },
      { id: `ec-${chunkIndex}-s2`, x: gw2X + 105, y: y1 - 44 }
    );
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: gw2X + 135, y: y1 - 115, kind: pickPower() });
    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: hallX + hallW + 58, y: y1 - 92, radius: 36, dir: 'up-forward' });

    curX = hallX + hallW;
    curY = y1;
  } else if (pattern === 10) {
    // Very Big Grounded Tank Building (Upper Roof is a High Place!)
    const gap1 = Math.round(130 + ramp * 30);
    const y1 = clampY(curY);
    const baseX = curX + gap1;
    const baseW = 1320;
    platforms.push({
      id: `ec-${chunkIndex}-p1`,
      x: baseX,
      y: y1,
      w: baseW,
      h: 580,
      kind: 'building',
      accentEdge: 'top',
      prop: 'antenna',
    });

    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: baseX + 215, y: y1 - 168, radius: 38, dir: 'up-forward', powerVy: -790 });

    const tankX = baseX + 315;
    const tankW = 760;
    const tankH = 256;
    const tankY = y1 - tankH;
    platforms.push({
      id: `ec-${chunkIndex}-tank`,
      x: tankX,
      y: tankY,
      w: tankW,
      h: tankH,
      kind: 'upperBuilding',
      accentEdge: 'top',
      tankViewHole: true,
      prop: 'hvac',
      isHighPlace: true,
    });

    boosts.push(
      { id: `ec-${chunkIndex}-bs-top`, x: tankX + tankW - 155, y: tankY - 6, w: 130, h: 6 },
      { id: `ec-${chunkIndex}-bs-in`, x: tankX + 175, y: y1 - 6, w: 150, h: 6 }
    );
    shards.push(
      { id: `ec-${chunkIndex}-ubs1`, x: tankX + 205, y: tankY - 40 },
      { id: `ec-${chunkIndex}-ubs2`, x: tankX + 390, y: tankY - 40 },
      { id: `ec-${chunkIndex}-ubs3`, x: tankX + 565, y: tankY - 40 },
      { id: `ec-${chunkIndex}-pass1`, x: tankX + 385, y: y1 - 36 },
      { id: `ec-${chunkIndex}-pass2`, x: tankX + 525, y: y1 - 36 }
    );
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: tankX + tankW * 0.5, y: tankY - 102, kind: pickPower() });
    enemies.push({
      id: `ec-${chunkIndex}-en1`,
      x: tankX + 460,
      y: tankY - 52,
      w: 28,
      h: 52,
      kind: 'sentry',
      baseX: tankX + 460,
      patrolRange: 30,
      phase: chunkIndex * 1.1,
    });

    curX = baseX + baseW;
    curY = y1;
  } else if (pattern === 11) {
    // Colossal Passable Grounded Tank Citadel with Glass Breaker & Overhead Glider
    const gap1 = Math.round(130 + ramp * 35);
    const y1 = clampY(curY);
    const baseX = curX + gap1;
    const baseW = 1420;
    platforms.push({
      id: `ec-${chunkIndex}-p1`,
      x: baseX,
      y: y1,
      w: baseW,
      h: 580,
      kind: 'building',
      accentEdge: 'top',
      prop: 'antenna',
    });

    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: baseX + 220, y: y1 - 170, radius: 38, dir: 'up-forward', powerVy: -800 });

    const tankX = baseX + 320;
    const tankW = 840;
    const tankH = 276;
    const tankY = y1 - tankH;
    platforms.push({
      id: `ec-${chunkIndex}-tank`,
      x: tankX,
      y: tankY,
      w: tankW,
      h: tankH,
      kind: 'upperBuilding',
      accentEdge: 'top',
      tankViewHole: true,
      prop: 'watertower',
      isHighPlace: true,
    });

    glassWalls.push({ id: `ec-${chunkIndex}-gw1`, x: tankX + 385, y: tankY - 205, w: 22, h: 205 });
    rails.push({
      id: `ec-${chunkIndex}-gl1`,
      x1: tankX + 470,
      y1: tankY - 122,
      x2: tankX + tankW + 75,
      y2: tankY - 122,
      kind: 'glider',
      isHighPlace: true,
    });
    boosts.push(
      { id: `ec-${chunkIndex}-bs-in`, x: tankX + 195, y: y1 - 6, w: 150, h: 6 },
      { id: `ec-${chunkIndex}-bs`, x: baseX + baseW - 170, y: y1 - 6, w: 130, h: 6 }
    );
    shards.push(
      { id: `ec-${chunkIndex}-s1`, x: tankX + 235, y: tankY - 40 },
      { id: `ec-${chunkIndex}-s2`, x: tankX + 615, y: tankY - 78 },
      { id: `ec-${chunkIndex}-pass1`, x: tankX + 445, y: y1 - 36 },
      { id: `ec-${chunkIndex}-pass2`, x: tankX + 595, y: y1 - 36 }
    );
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: tankX + 645, y: tankY - 168, kind: pickPower() });

    curX = baseX + baseW;
    curY = y1;
  } else if (pattern === 12) {
    // Pattern 12: Thermal Lava Geyser Canyon -> High Skyscraper Staircase
    const gap1 = Math.round(135 + ramp * 35);
    const y1 = clampY(curY);
    const launchX = curX + gap1;
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: launchX, y: y1, w: 280, h: 580, kind: 'building', accentEdge: 'top' });

    const tv1X = launchX + 335;
    thermalVents.push({
      id: `ec-${chunkIndex}-tv1`,
      x: tv1X,
      y: y1 - 190,
      w: 110,
      h: LAVA_SURFACE_Y - (y1 - 190),
      powerVy: 900,
    });

    const high1Y = clampY(y1 - 140);
    const high1X = tv1X + 150;
    platforms.push({ id: `ec-${chunkIndex}-hp1`, x: high1X, y: high1Y, w: 280, h: 32, kind: 'bridge', accentEdge: 'top', isHighPlace: true });

    const high2Y = clampY(high1Y - 48);
    const high2X = high1X + 390;
    airBoosters.push({ id: `ec-${chunkIndex}-ab1`, x: high1X + 330, y: high1Y - 58, radius: 36, dir: 'up-forward' });
    platforms.push({ id: `ec-${chunkIndex}-hp2`, x: high2X, y: high2Y, w: 320, h: 32, kind: 'bridge', accentEdge: 'top', isHighPlace: true });

    const landY = clampY(y1 - 24);
    const landX = high2X + 430;
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: landX, y: landY, w: 480, h: 580, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: landY <= HIGH_PLACE_Y_THRESHOLD });
    shards.push(
      { id: `ec-${chunkIndex}-s1`, x: tv1X + 55, y: high1Y - 36 },
      { id: `ec-${chunkIndex}-s2`, x: high1X + 140, y: high1Y - 38 },
      { id: `ec-${chunkIndex}-s3`, x: high2X + 160, y: high2Y - 38 }
    );
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: high2X + 250, y: high2Y - 46, kind: pickPower() });

    curX = landX + 480;
    curY = landY;
  } else if (pattern === 13) {
    // Pattern 13: Vanishing Rooftop Bridges + Rotating Skyline Turbine + Safe Under-Route
    const gap1 = Math.round(135 + ramp * 35);
    const y1 = clampY(curY);
    const roofX = curX + gap1;
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: roofX, y: y1, w: 340, h: 580, kind: 'building', accentEdge: 'top', prop: 'billboard' });

    const v1X = roofX + 440;
    const v1Y = clampY(y1 - 54);
    platforms.push({
      id: `ec-${chunkIndex}-van1`,
      x: v1X,
      y: v1Y,
      w: 220,
      h: 28,
      kind: 'bridge',
      accentEdge: 'top',
      vanishPeriod: 4.2,
      vanishDuty: 0.68,
      vanishPhase: chunkIndex * 0.7,
      routeTag: 'expert',
      isHighPlace: true,
    });
    // Safe main lower stepping bridge underneath vanishing bridge
    platforms.push({
      id: `ec-${chunkIndex}-safe1`,
      x: v1X + 35,
      y: clampY(y1 + 42),
      w: 245,
      h: 32,
      kind: 'bridge',
      accentEdge: 'top',
      routeTag: 'main',
    });

    const rotX = v1X + 365;
    const rotY = clampY(v1Y - 12);
    rotatingObstacles.push({
      id: `ec-${chunkIndex}-rot1`,
      x: rotX,
      y: rotY,
      radius: 56,
      armCount: 2,
      speed: 2.1 + ramp * 0.7,
      phase: chunkIndex * 0.8,
      thickness: 10,
    });

    const landX = rotX + 125;
    const landY = clampY(y1 - 14);
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: landX, y: landY, w: 560, h: 580, kind: 'building', accentEdge: 'top', prop: pickProp(), isHighPlace: landY <= HIGH_PLACE_Y_THRESHOLD });
    shards.push(
      { id: `ec-${chunkIndex}-vs1`, x: v1X + 110, y: v1Y - 40, isRareToken: true },
      { id: `ec-${chunkIndex}-vs2`, x: rotX, y: rotY - 82 }
    );
    curX = landX + 560;
    curY = landY;
  } else if (pattern === 14) {
    // Pattern 14: Precision Landing Bullseye Pads + Timed Laser Gate + Wind Canyon
    const gap1 = Math.round(130 + ramp * 35);
    const y1 = clampY(curY);
    const rx = curX + gap1;
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: rx, y: y1, w: 460, h: 580, kind: 'building', accentEdge: 'top', precisionPad: true });

    timedGates.push({
      id: `ec-${chunkIndex}-tg1`,
      x: rx + 290,
      y: y1 - 170,
      w: 18,
      h: 170,
      cycleSec: 3.2,
      openRatio: 0.62,
      phase: (chunkIndex * 0.9) % 3.2,
    });

    // Wind canyon across magma chasm
    const canyonX = rx + 510;
    windZones.push({
      id: `ec-${chunkIndex}-wz1`,
      x: canyonX,
      y: y1 - 240,
      w: 320,
      h: 340,
      forceX: 165,
      forceY: -540,
    });

    const padX = canyonX + 120;
    const padY = clampY(y1 - 65);
    platforms.push({
      id: `ec-${chunkIndex}-ppad`,
      x: padX,
      y: padY,
      w: 145,
      h: 28,
      kind: 'bridge',
      accentEdge: 'top',
      precisionPad: true,
      isHighPlace: true,
    });

    const landX = padX + 265;
    const landY = clampY(y1 - 10);
    platforms.push({ id: `ec-${chunkIndex}-p2`, x: landX, y: landY, w: 500, h: 580, kind: 'building', accentEdge: 'top', prop: pickProp(), precisionPad: true });
    shards.push(
      { id: `ec-${chunkIndex}-ps1`, x: padX + 72, y: padY - 42, isRareToken: true },
      { id: `ec-${chunkIndex}-ps2`, x: rx + 298, y: y1 - 36 }
    );
    curX = landX + 500;
    curY = landY;
  } else {
    // Pattern 15: Branching Dual-Route Skyline (Lower Safe vs. Upper Secret Garden / Observation Deck)
    const gap1 = Math.round(130 + ramp * 35);
    const y1 = clampY(curY);
    const rx = curX + gap1;
    platforms.push({ id: `ec-${chunkIndex}-p1`, x: rx, y: y1, w: 920, h: 580, kind: 'building', accentEdge: 'top', prop: 'garden', routeTag: 'main' });
    springs.push({ id: `ec-${chunkIndex}-sp`, x: rx + 120, y: y1 - 16, w: 74, h: 16, power: 980 });

    // Upper Secret Branch Deck
    const secY = clampY(y1 - 190);
    platforms.push({
      id: `ec-${chunkIndex}-secdeck`,
      x: rx + 260,
      y: secY,
      w: 440,
      h: 32,
      kind: 'bridge',
      accentEdge: 'top',
      prop: 'garden',
      routeTag: 'secret',
      isHighPlace: true,
    });
    shards.push(
      { id: `ec-${chunkIndex}-secs1`, x: rx + 400, y: secY - 38, isRareToken: true },
      { id: `ec-${chunkIndex}-secs2`, x: rx + 560, y: secY - 38, isRareToken: true }
    );
    powerUps.push({ id: `ec-${chunkIndex}-pu`, x: rx + 480, y: secY - 82, kind: pickPower() });
    boosts.push({ id: `ec-${chunkIndex}-bs`, x: rx + 620, y: y1 - 6, w: 140, h: 6 });

    curX = rx + 920;
    curY = y1;
  }

  return {
    nextX: curX,
    nextY: curY,
    platforms,
    rails,
    springs,
    boosts,
    airBoosters,
    glassWalls,
    thermalVents,
    rotatingObstacles,
    timedGates,
    windZones,
    hazards,
    shards,
    powerUps,
    enemies,
  };
}

export function buildLevelCourse(levelNumber: number): CourseDefinition {
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.round(levelNumber)));
  const district = getDistrictForLevel(level);
  const challengeTag = getChallengeTagForLevel(level);
  const biomePalette = WORLD_BIOMES[district.biomeIndex] ?? WORLD_BIOMES[0];

  const rng = createSeededRng((level * 2654435761 + 1013904223) >>> 0);
  const difficultyProgress = (level - 1) / (MAX_LEVEL - 1);
  const baseSpeed = Math.round(368 + Math.min(130, (level - 1) * 0.26) + (challengeTag === 'speedDemon' ? 24 : 0));
  const chunkCount = level === 500 ? 20 : Math.min(18, 5 + Math.floor((level - 1) / 30) + (challengeTag === 'skylineMarathon' ? 3 : 0));
  const tier =
    level <= 50
      ? 'Beginner'
      : level <= 150
      ? 'Runner'
      : level <= 300
      ? 'Pro'
      : level <= 425
      ? 'Elite'
      : 'Apex';

  const platforms: Platform[] = ENDLESS_COURSE.platforms.map((p) => ({ ...p }));
  const rails: GrindRail[] = ENDLESS_COURSE.rails.map((r) => ({ ...r }));
  const springs: SpringPad[] = ENDLESS_COURSE.springs.map((s) => ({ ...s }));
  const boosts: BoostStrip[] = ENDLESS_COURSE.boosts.map((b) => ({ ...b }));
  const airBoosters: AirBooster[] = (ENDLESS_COURSE.airBoosters ?? []).map((ab) => ({ ...ab }));
  const glassWalls: GlassWall[] = (ENDLESS_COURSE.glassWalls ?? []).map((gw) => ({ ...gw }));
  const thermalVents: ThermalVent[] = (ENDLESS_COURSE.thermalVents ?? []).map((tv) => ({ ...tv }));
  const rotatingObstacles: RotatingObstacle[] = [];
  const timedGates: TimedGate[] = [];
  const windZones: WindZone[] = [];
  const secretDiscoveries: SecretDiscovery[] = [];
  const hazards: Hazard[] = ENDLESS_COURSE.hazards.map((h) => ({ ...h }));
  const checkpoints: Checkpoint[] = [];
  const shards: Shard[] = ENDLESS_COURSE.shards.map((s) => ({ ...s }));
  const powerUps: PowerUpItem[] = (ENDLESS_COURSE.powerUps ?? []).map((pu) => ({ ...pu }));
  const enemies: EnemyEntity[] = (ENDLESS_COURSE.enemies ?? []).map((en) => ({ ...en }));

  let tailX = 1020;
  let tailY = 480;
  const midCheckpointChunk = Math.floor(chunkCount * 0.5);

  for (let i = 1; i <= chunkCount; i++) {
    const chunk = generateEndlessChunk(
      tailX,
      tailY,
      i,
      rng,
      level === 1 && i <= 4 ? undefined : difficultyProgress
    );
    platforms.push(...chunk.platforms);
    rails.push(...chunk.rails);
    springs.push(...chunk.springs);
    boosts.push(...chunk.boosts);
    airBoosters.push(...chunk.airBoosters);
    glassWalls.push(...chunk.glassWalls);
    thermalVents.push(...chunk.thermalVents);
    rotatingObstacles.push(...chunk.rotatingObstacles);
    timedGates.push(...chunk.timedGates);
    windZones.push(...chunk.windZones);
    hazards.push(...chunk.hazards);
    shards.push(...chunk.shards);
    powerUps.push(...chunk.powerUps);
    enemies.push(...chunk.enemies);
    tailX = chunk.nextX;
    tailY = chunk.nextY;

    // Place a mid-stage checkpoint on a solid building platform
    if (level >= 3 && i === midCheckpointChunk) {
      const solidPlat = chunk.platforms.find((p) => p.kind === 'building' && p.w >= 320);
      if (solidPlat) {
        checkpoints.push({
          id: `lvl-${level}-cp1`,
          x: solidPlat.x + Math.round(solidPlat.w * 0.5),
          y: solidPlat.y,
          index: 1,
        });
      }
    }
  }

  // Secret Discovery Portal placed on an elevated high-route platform in each district
  const catalogSecret = SECRET_CATALOG[district.index % SECRET_CATALOG.length];
  if (catalogSecret && (level % 2 === 0 || level === 1 || level === 500)) {
    const highPlat = platforms.find((p) => p.isHighPlace && p.x > 1600 && p.w >= 180) ?? platforms[platforms.length - 1];
    if (highPlat) {
      secretDiscoveries.push({
        id: catalogSecret.id,
        title: catalogSecret.title,
        districtIndex: district.index,
        x: highPlat.x + Math.round(highPlat.w * 0.5) - 24,
        y: highPlat.y - 68,
        w: 48,
        h: 64,
        coinBonus: catalogSecret.coinBonus,
        xpBonus: catalogSecret.xpBonus,
      });
    }
  }

  // Finish Rooftop & Finish Portal Gate
  const finishPlatX = tailX + 135;
  const finishPlatY = Math.max(240, Math.min(490, tailY));
  const finishPlatW = level === 500 ? 820 : 620;
  platforms.push({
    id: `lvl-${level}-finish-roof`,
    x: finishPlatX,
    y: finishPlatY,
    w: finishPlatW,
    h: 580,
    kind: 'building',
    accentEdge: 'top',
    prop: level === 500 ? 'billboard' : 'antenna',
    precisionPad: challengeTag === 'perfectLanding' || level === 500,
  });

  if (level === 500) {
    // Extra Rooftop 500 grand apex approach: twin glass crash + precision zenith pad before final gate
    glassWalls.push(
      { id: 'lvl-500-gw-final1', x: finishPlatX + 180, y: finishPlatY - 220, w: 22, h: 220 },
      { id: 'lvl-500-gw-final2', x: finishPlatX + 340, y: finishPlatY - 220, w: 22, h: 220 }
    );
    shards.push(
      { id: 'lvl-500-crown1', x: finishPlatX + 260, y: finishPlatY - 80, isRareToken: true },
      { id: 'lvl-500-crown2', x: finishPlatX + 420, y: finishPlatY - 80, isRareToken: true }
    );
  }

  const finishX = finishPlatX + (level === 500 ? 520 : 235);
  const finishY = finishPlatY;
  const estDistPx = Math.max(2000, finishX - 120);
  const goldTimeSec = Math.round(estDistPx / Math.max(320, baseSpeed * 1.08));
  const silverTimeSec = Math.round(goldTimeSec * 1.28);
  const speedTargetSec = challengeTag === 'speedDemon' || level === 500 ? Math.round(goldTimeSec * 1.12) : undefined;

  return {
    id: `level-${level}`,
    levelNumber: level,
    title: level === 500 ? 'Rooftop 500: The Final Leap' : `Rooftop ${level}`,
    subtitle: `${district.name} · ${getChallengeLabel(challengeTag)}`,
    difficulty: tier,
    districtId: district.id,
    districtName: district.name,
    biomeIndex: district.biomeIndex,
    challengeTag,
    weatherOverride: district.defaultWeather,
    timeOfDayOverride: district.defaultTimeOfDay,
    speedTargetSec,
    noMistakeAllowed: challengeTag === 'noMistake',
    baseSpeed,
    timeLimitSec: 0,
    goldTimeSec,
    silverTimeSec,
    isEndless: false,
    fallLimitY: LAVA_SURFACE_Y + 8,
    startX: 120,
    startY: 420,
    finishX,
    finishY,
    theme: {
      name: district.name,
      skyTop: biomePalette.skyTop,
      skyBottom: biomePalette.skyBottom,
      sunColor: biomePalette.sunColor,
      farCity: biomePalette.farCity,
      midCity: biomePalette.midCity,
      buildingFill: biomePalette.buildingFill,
      buildingStroke: biomePalette.buildingStroke,
      ledgeHighlight: biomePalette.ledgeHighlight,
      isNight: biomePalette.isNight,
      weather: biomePalette.weather,
    },
    platforms,
    rails,
    springs,
    boosts,
    airBoosters,
    glassWalls,
    thermalVents,
    rotatingObstacles,
    timedGates,
    windZones,
    secretDiscoveries,
    hazards,
    checkpoints,
    shards,
    powerUps,
    enemies,
  };
}


