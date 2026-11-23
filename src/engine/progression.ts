import {
  AccessoryId,
  CharacterCustomization,
  CharacterModelId,
  HairStyleId,
  JumpAnimStyle,
  LandAnimStyle,
  ParkourSkills,
  ReplayFrame,
  RunSummary,
  SneakerStyleId,
} from '../types/game';

const PROFILE_STORAGE_KEY = 'pixy_dash_profile_v1';

export interface CosmeticItemDef {
  id: string;
  category: 'model' | 'hair' | 'sneaker' | 'accessory' | 'jumpStyle' | 'landStyle' | 'color';
  label: string;
  cost: number;
  unlockHint: string;
  value: string;
}

export const COSMETIC_SHOP_ITEMS: CosmeticItemDef[] = [
  // Character Models
  { id: 'model-pixy', category: 'model', label: 'Pixy (Apex Runner)', cost: 0, unlockHint: 'Starter', value: 'pixy' },
  { id: 'model-kuro', category: 'model', label: 'Kuro (Shadow Striker)', cost: 250, unlockHint: '250 Coins', value: 'kuro' },
  { id: 'model-nova', category: 'model', label: 'Nova (Neon Acrobat)', cost: 450, unlockHint: '450 Coins', value: 'nova' },
  { id: 'model-vex', category: 'model', label: 'Vex (Cyber Daredevil)', cost: 750, unlockHint: '750 Coins', value: 'vex' },
  { id: 'model-aria', category: 'model', label: 'Aria (Skyline Legend)', cost: 1200, unlockHint: '1,200 Coins', value: 'aria' },

  // Hairstyles
  { id: 'hair-spiky', category: 'hair', label: 'Spiky Runner', cost: 0, unlockHint: 'Starter', value: 'spiky' },
  { id: 'hair-ponytail', category: 'hair', label: 'Aero Ponytail', cost: 120, unlockHint: '120 Coins', value: 'ponytail' },
  { id: 'hair-hood', category: 'hair', label: 'Stealth Hood', cost: 220, unlockHint: '220 Coins', value: 'hood' },
  { id: 'hair-mohawk', category: 'hair', label: 'Cyber Mohawk', cost: 320, unlockHint: '320 Coins', value: 'mohawk' },
  { id: 'hair-swept', category: 'hair', label: 'Wind-Swept', cost: 180, unlockHint: '180 Coins', value: 'swept' },

  // Sneakers
  { id: 'sneaker-ember', category: 'sneaker', label: 'Ember Striders', cost: 0, unlockHint: 'Starter', value: 'ember' },
  { id: 'sneaker-cyanPulse', category: 'sneaker', label: 'Cyan Pulse', cost: 180, unlockHint: '180 Coins', value: 'cyanPulse' },
  { id: 'sneaker-volt', category: 'sneaker', label: 'Volt Neon', cost: 340, unlockHint: '340 Coins', value: 'volt' },
  { id: 'sneaker-obsidian', category: 'sneaker', label: 'Obsidian Ghost', cost: 520, unlockHint: '520 Coins', value: 'obsidian' },
  { id: 'sneaker-goldApex', category: 'sneaker', label: 'Gold Apex 500', cost: 900, unlockHint: '900 Coins', value: 'goldApex' },

  // Accessories
  { id: 'acc-none', category: 'accessory', label: 'None', cost: 0, unlockHint: 'Starter', value: 'none' },
  { id: 'acc-visor', category: 'accessory', label: 'Holo Visor', cost: 200, unlockHint: '200 Coins', value: 'visor' },
  { id: 'acc-halo', category: 'accessory', label: 'Skyline Halo', cost: 480, unlockHint: '480 Coins', value: 'halo' },
  { id: 'acc-wings', category: 'accessory', label: 'Aero Jet Fins', cost: 680, unlockHint: '680 Coins', value: 'wings' },
  { id: 'acc-crown', category: 'accessory', label: 'Apex Crown', cost: 1000, unlockHint: '1,000 Coins', value: 'crown' },

  // Jump Animations
  { id: 'jump-stride', category: 'jumpStyle', label: 'Classic Stride', cost: 0, unlockHint: 'Starter', value: 'stride' },
  { id: 'jump-flip', category: 'jumpStyle', label: 'Tuck Flip', cost: 240, unlockHint: '240 Coins', value: 'flip' },
  { id: 'jump-spin', category: 'jumpStyle', label: 'Aero Spin', cost: 360, unlockHint: '360 Coins', value: 'spin' },
  { id: 'jump-aerial', category: 'jumpStyle', label: 'Split Aerial', cost: 500, unlockHint: '500 Coins', value: 'aerial' },

  // Landing Animations
  { id: 'land-roll', category: 'landStyle', label: 'Parkour Roll', cost: 0, unlockHint: 'Starter', value: 'roll' },
  { id: 'land-slam', category: 'landStyle', label: 'Superhero Slam', cost: 260, unlockHint: '260 Coins', value: 'slam' },
  { id: 'land-balance', category: 'landStyle', label: 'Zero-G Balance', cost: 400, unlockHint: '400 Coins', value: 'balance' },
];

export const JACKET_SWATCHES = ['#0F172A', '#1E3A8A', '#7C2D12', '#4C1D95', '#064E3B', '#881337', '#F8FAFC'];
export const TROUSER_SWATCHES = ['#0F172A', '#1E293B', '#312E81', '#3F3F46', '#14532D', '#451A03'];
export const SCARF_SWATCHES = ['#F97316', '#22D3EE', '#F43F5E', '#A855F7', '#4ADE80', '#FACC15', '#E2E8F0'];

export interface SkillNodeMeta {
  key: keyof ParkourSkills;
  name: string;
  description: string;
  costs: [number, number, number];
  bonusSummary: string;
}

export const SKILL_TREE_NODES: SkillNodeMeta[] = [
  {
    key: 'sprintMastery',
    name: 'Sprint Mastery',
    description: 'Increases cruise velocity and sprint acceleration across long rooftop gaps.',
    costs: [120, 260, 480],
    bonusSummary: '+15 / +30 / +48 speed boost',
  },
  {
    key: 'airControl',
    name: 'Air Control & Glide',
    description: 'Extends coyote grace window and allows controlled mid-air steering.',
    costs: [110, 240, 440],
    bonusSummary: '+12% / +24% / +38% air control',
  },
  {
    key: 'wallRunGrip',
    name: 'Wall-Run Mastery',
    description: 'Run upward and forward along vertical skyscraper walls before launching off.',
    costs: [140, 300, 520],
    bonusSummary: 'Longer wall climb & stronger vault',
  },
  {
    key: 'doubleJumpBoost',
    name: 'Double-Jump Impulse',
    description: 'Powers up your mid-air Air Vault height and forward surge.',
    costs: [130, 280, 500],
    bonusSummary: '+6% / +12% / +18% Air Vault power',
  },
  {
    key: 'precisionLanding',
    name: 'Precision Landing',
    description: 'Widens timing window for Perfect Landings and converts impact into burst speed.',
    costs: [120, 260, 460],
    bonusSummary: '+50% Perfect Landing window & boost',
  },
  {
    key: 'fastRecovery',
    name: 'Fast Recovery',
    description: 'Reduces stumble recovery delay and boosts slide speed.',
    costs: [100, 220, 400],
    bonusSummary: 'Quick stumble recover & +slide momentum',
  },
];

export interface MissionProgressItem {
  id: string;
  period: 'daily' | 'weekly';
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
  metric: 'stagesCleared' | 'highPlaces' | 'takedowns' | 'perfectLandings' | 'secrets' | 'distanceKm' | 'rivalsBeaten';
}

export interface UnexpectedEvent {
  id: string;
  title: string;
  subtitle: string;
  levelNumber: number;
  bonusCoins: number;
  bonusXp: number;
}

export interface PlayerProfile {
  playerId: string;
  xp: number;
  playerLevel: number;
  coins: number;
  totalDistanceM: number;
  longestJumpM: number;
  totalPerfectLandings: number;
  totalKOs: number;
  totalHighPlaces: number;
  totalRacesWon: number;
  completedLevels: number[];
  bestTimesByLevel: Record<number, number>;
  personalBestGhosts: Record<number, ReplayFrame[]>;
  discoveredSecrets: string[];
  unlockedCosmetics: string[];
  unlockedBadges: string[];
  activeTitle: string;
  customization: CharacterCustomization;
  presets: Array<{ label: string; config: CharacterCustomization }>;
  skills: ParkourSkills;
  dailyLoginStreak: number;
  lastLoginDate: string;
  dailyRewardClaimedToday: boolean;
  dailyMissionDate: string;
  weeklyMissionKey: string;
  missions: MissionProgressItem[];
  cinematicSlowMoEnabled: boolean;
  rivalsEnabled: boolean;
  ghostEnabled: boolean;
}

export const DEFAULT_CUSTOMIZATION: CharacterCustomization = {
  name: 'Pixy',
  model: 'pixy',
  hairStyle: 'spiky',
  jacketColor: '#0F172A',
  trouserColor: '#1E293B',
  sneakerStyle: 'ember',
  scarfColor: '#F97316',
  accessory: 'none',
  jumpStyle: 'stride',
  landStyle: 'roll',
};

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekKey(): string {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function createDailyMissions(): MissionProgressItem[] {
  return [
    {
      id: 'd-stages',
      period: 'daily',
      title: 'Skyline Sprinter',
      description: 'Complete 3 rooftop stages',
      target: 3,
      progress: 0,
      rewardCoins: 180,
      rewardXp: 240,
      claimed: false,
      metric: 'stagesCleared',
    },
    {
      id: 'd-highplaces',
      period: 'daily',
      title: 'Apex Climber',
      description: 'Pass 10 High Places across rooftops',
      target: 10,
      progress: 0,
      rewardCoins: 150,
      rewardXp: 200,
      claimed: false,
      metric: 'highPlaces',
    },
    {
      id: 'd-perfect',
      period: 'daily',
      title: 'Precision Master',
      description: 'Land 4 Perfect Landings',
      target: 4,
      progress: 0,
      rewardCoins: 160,
      rewardXp: 210,
      claimed: false,
      metric: 'perfectLandings',
    },
  ];
}

function createWeeklyMissions(): MissionProgressItem[] {
  return [
    {
      id: 'w-kos',
      period: 'weekly',
      title: 'Rooftop Enforcer',
      description: 'Score 25 Parkour KOs on sentries or drones',
      target: 25,
      progress: 0,
      rewardCoins: 420,
      rewardXp: 650,
      claimed: false,
      metric: 'takedowns',
    },
    {
      id: 'w-secrets',
      period: 'weekly',
      title: 'Secret Pathfinder',
      description: 'Discover 2 secret rooftop locations',
      target: 2,
      progress: 0,
      rewardCoins: 500,
      rewardXp: 750,
      claimed: false,
      metric: 'secrets',
    },
    {
      id: 'w-rivals',
      period: 'weekly',
      title: 'Rival Conqueror',
      description: 'Beat 3 rival or online opponents in rooftop races',
      target: 3,
      progress: 0,
      rewardCoins: 550,
      rewardXp: 800,
      claimed: false,
      metric: 'rivalsBeaten',
    },
  ];
}

export function xpForNextLevel(level: number): number {
  return 250 + (level - 1) * 140;
}

export function createDefaultProfile(): PlayerProfile {
  const today = getTodayKey();
  const week = getWeekKey();
  const pid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `px-${crypto.randomUUID().slice(0, 8)}`
      : `px-${Math.random().toString(36).slice(2, 10)}`;

  return {
    playerId: pid,
    xp: 0,
    playerLevel: 1,
    coins: 250,
    totalDistanceM: 0,
    longestJumpM: 0,
    totalPerfectLandings: 0,
    totalKOs: 0,
    totalHighPlaces: 0,
    totalRacesWon: 0,
    completedLevels: [],
    bestTimesByLevel: {},
    personalBestGhosts: {},
    discoveredSecrets: [],
    unlockedCosmetics: [
      'model-pixy',
      'hair-spiky',
      'sneaker-ember',
      'acc-none',
      'jump-stride',
      'land-roll',
    ],
    unlockedBadges: ['Skyline Initiate'],
    activeTitle: 'Skyline Initiate',
    customization: { ...DEFAULT_CUSTOMIZATION },
    presets: [
      { label: 'Ember Classic', config: { ...DEFAULT_CUSTOMIZATION } },
      {
        label: 'Neon Striker',
        config: {
          ...DEFAULT_CUSTOMIZATION,
          name: 'Pixy',
          jacketColor: '#1E3A8A',
          scarfColor: '#22D3EE',
          hairStyle: 'swept',
        },
      },
    ],
    skills: {
      sprintMastery: 0,
      airControl: 0,
      wallRunGrip: 0,
      doubleJumpBoost: 0,
      precisionLanding: 0,
      fastRecovery: 0,
    },
    dailyLoginStreak: 1,
    lastLoginDate: today,
    dailyRewardClaimedToday: false,
    dailyMissionDate: today,
    weeklyMissionKey: week,
    missions: [...createDailyMissions(), ...createWeeklyMissions()],
    cinematicSlowMoEnabled: true,
    rivalsEnabled: true,
    ghostEnabled: true,
  };
}

export function loadPlayerProfile(): PlayerProfile {
  const fallback = createDefaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      savePlayerProfile(fallback);
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const today = getTodayKey();
    const week = getWeekKey();

    let missions = Array.isArray(parsed.missions) ? parsed.missions : fallback.missions;
    if (parsed.dailyMissionDate !== today) {
      const weeklyOnly = missions.filter((m) => m.period === 'weekly');
      missions = [...createDailyMissions(), ...(weeklyOnly.length ? weeklyOnly : createWeeklyMissions())];
    }
    if (parsed.weeklyMissionKey !== week) {
      const dailyOnly = missions.filter((m) => m.period === 'daily');
      missions = [...(dailyOnly.length ? dailyOnly : createDailyMissions()), ...createWeeklyMissions()];
    }

    const dailyRewardClaimedToday = parsed.lastLoginDate === today ? Boolean(parsed.dailyRewardClaimedToday) : false;
    let dailyLoginStreak = parsed.dailyLoginStreak ?? 1;
    if (parsed.lastLoginDate && parsed.lastLoginDate !== today) {
      dailyLoginStreak = Math.max(1, dailyLoginStreak + 1);
    }

    return {
      ...fallback,
      ...parsed,
      customization: { ...DEFAULT_CUSTOMIZATION, ...(parsed.customization ?? {}) },
      skills: { ...fallback.skills, ...(parsed.skills ?? {}) },
      missions,
      dailyMissionDate: today,
      weeklyMissionKey: week,
      lastLoginDate: today,
      dailyLoginStreak,
      dailyRewardClaimedToday,
    };
  } catch {
    return fallback;
  }
}

export function savePlayerProfile(profile: PlayerProfile) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Trim old ghosts if storage quota is tight
    try {
      const trimmed: PlayerProfile = {
        ...profile,
        personalBestGhosts: {},
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore unrecoverable storage errors
    }
  }
}

export function getActiveUnexpectedEvent(): UnexpectedEvent {
  const events: UnexpectedEvent[] = [
    {
      id: 'ev-skyline-rush',
      title: 'Skyline Rush',
      subtitle: 'High-speed Neon Corridor Trial — Stage 205 · Double Coins!',
      levelNumber: 205,
      bonusCoins: 180,
      bonusXp: 250,
    },
    {
      id: 'ev-wind-challenge',
      title: 'Solar Wind Challenge',
      subtitle: 'Updraft Canyons & Gale Gusts — Stage 115 · +200 Coins',
      levelNumber: 115,
      bonusCoins: 200,
      bonusXp: 280,
    },
    {
      id: 'ev-night-run',
      title: 'Night Storm Run',
      subtitle: 'Slick Wet Rooftops in Storm District — Stage 264 · +220 Coins',
      levelNumber: 264,
      bonusCoins: 220,
      bonusXp: 300,
    },
    {
      id: 'ev-golden-route',
      title: 'Golden Route',
      subtitle: 'Secret Penthouse Bridges — Stage 312 · +250 Coins',
      levelNumber: 312,
      bonusCoins: 250,
      bonusXp: 340,
    },
    {
      id: 'ev-champion',
      title: 'Champion Gauntlet',
      subtitle: 'Rooftop 500 Dress Rehearsal — Stage 490 · +400 Coins',
      levelNumber: 490,
      bonusCoins: 400,
      bonusXp: 500,
    },
  ];
  const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 6));
  return events[daySeed % events.length];
}

export function applyRunToProfile(profile: PlayerProfile, summary: RunSummary): PlayerProfile {
  let xp = profile.xp + summary.xpEarned;
  let playerLevel = profile.playerLevel;
  while (xp >= xpForNextLevel(playerLevel)) {
    xp -= xpForNextLevel(playerLevel);
    playerLevel += 1;
  }

  const completedSet = new Set(profile.completedLevels);
  const bestTimes = { ...profile.bestTimesByLevel };
  const ghosts = { ...profile.personalBestGhosts };

  if (summary.cleared && !summary.isEndless && summary.levelNumber >= 1) {
    completedSet.add(summary.levelNumber);
    const prevBest = bestTimes[summary.levelNumber];
    if (prevBest === undefined || summary.elapsedTime < prevBest) {
      bestTimes[summary.levelNumber] = Number(summary.elapsedTime.toFixed(2));
      // Keep up to 15 most recent personal best ghosts so storage stays compact
      const keys = Object.keys(ghosts).map(Number);
      if (keys.length >= 15 && ghosts[summary.levelNumber] === undefined) {
        delete ghosts[keys[0]];
      }
      ghosts[summary.levelNumber] = summary.replayFrames.filter((_, idx) => idx % 2 === 0).slice(0, 180);
    }
  }

  const secretSet = new Set(profile.discoveredSecrets);
  for (const s of summary.secretsDiscovered) {
    secretSet.add(s);
  }

  const badges = new Set(profile.unlockedBadges);
  if (completedSet.size >= 10) badges.add('Skyline Explorer');
  if (completedSet.size >= 50) badges.add('District Conqueror');
  if (completedSet.has(500)) badges.add('Rooftop 500 Champion');
  if (summary.longestJumpMeters >= 24) badges.add('Apex Leaper');
  if (secretSet.size >= 3) badges.add('Secret Pathfinder');
  if (profile.totalPerfectLandings + summary.perfectLandings >= 20) badges.add('Precision Striker');

  const wonRace = Boolean(summary.raceRank && summary.raceRank === 1);

  const missions = profile.missions.map((m) => {
    if (m.claimed) return m;
    let add = 0;
    if (m.metric === 'stagesCleared' && summary.cleared && !summary.isEndless) add = 1;
    else if (m.metric === 'highPlaces') add = summary.highPlacesPassed;
    else if (m.metric === 'takedowns') add = summary.takedownsCount;
    else if (m.metric === 'perfectLandings') add = summary.perfectLandings;
    else if (m.metric === 'secrets') add = summary.secretsDiscovered.length;
    else if (m.metric === 'rivalsBeaten' && wonRace) add = 1;
    return {
      ...m,
      progress: Math.min(m.target, m.progress + add),
    };
  });

  const next: PlayerProfile = {
    ...profile,
    xp,
    playerLevel,
    coins: profile.coins + summary.coinsEarned,
    totalDistanceM: profile.totalDistanceM + summary.distanceMeters,
    longestJumpM: Math.max(profile.longestJumpM, summary.longestJumpMeters),
    totalPerfectLandings: profile.totalPerfectLandings + summary.perfectLandings,
    totalKOs: profile.totalKOs + summary.takedownsCount,
    totalHighPlaces: profile.totalHighPlaces + summary.highPlacesPassed,
    totalRacesWon: profile.totalRacesWon + (wonRace ? 1 : 0),
    completedLevels: Array.from(completedSet).sort((a, b) => a - b),
    bestTimesByLevel: bestTimes,
    personalBestGhosts: ghosts,
    discoveredSecrets: Array.from(secretSet),
    unlockedBadges: Array.from(badges),
    activeTitle: completedSet.has(500) ? 'Rooftop 500 Champion' : profile.activeTitle,
    missions,
  };

  savePlayerProfile(next);
  return next;
}

export function isCosmeticUnlocked(profile: PlayerProfile, itemId: string): boolean {
  return profile.unlockedCosmetics.includes(itemId);
}

export function canEquipCustomization(
  profile: PlayerProfile,
  field: 'model' | 'hairStyle' | 'sneakerStyle' | 'accessory' | 'jumpStyle' | 'landStyle',
  val: string
): boolean {
  const prefix =
    field === 'model'
      ? 'model-'
      : field === 'hairStyle'
      ? 'hair-'
      : field === 'sneakerStyle'
      ? 'sneaker-'
      : field === 'accessory'
      ? 'acc-'
      : field === 'jumpStyle'
      ? 'jump-'
      : 'land-';
  return profile.unlockedCosmetics.includes(`${prefix}${val}`);
}

export type CosmeticValueMap = {
  model: CharacterModelId;
  hairStyle: HairStyleId;
  sneakerStyle: SneakerStyleId;
  accessory: AccessoryId;
  jumpStyle: JumpAnimStyle;
  landStyle: LandAnimStyle;
};
