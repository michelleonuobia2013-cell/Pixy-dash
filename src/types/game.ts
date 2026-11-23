export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'ROUND_SUMMARY' | 'REPLAY_MODE';

export type CourseId = string;

export type CameraZoom = 1 | 2 | 3;

export type RunnerAction =
  | 'idle'
  | 'run'
  | 'jump'
  | 'doubleJump'
  | 'fall'
  | 'wallSlide'
  | 'wallRun'
  | 'slide'
  | 'roll'
  | 'grind'
  | 'hangGlide'
  | 'mantle';

export type CharacterModelId = 'pixy' | 'kuro' | 'nova' | 'vex' | 'aria';
export type HairStyleId = 'spiky' | 'ponytail' | 'hood' | 'mohawk' | 'swept';
export type SneakerStyleId = 'ember' | 'cyanPulse' | 'volt' | 'obsidian' | 'goldApex';
export type AccessoryId = 'none' | 'visor' | 'halo' | 'wings' | 'crown';
export type JumpAnimStyle = 'stride' | 'flip' | 'spin' | 'aerial';
export type LandAnimStyle = 'roll' | 'slam' | 'balance';

export interface CharacterCustomization {
  name: string;
  model: CharacterModelId;
  hairStyle: HairStyleId;
  jacketColor: string;
  trouserColor: string;
  sneakerStyle: SneakerStyleId;
  scarfColor: string;
  accessory: AccessoryId;
  jumpStyle: JumpAnimStyle;
  landStyle: LandAnimStyle;
}

export interface ParkourSkills {
  sprintMastery: number; // 0..3
  airControl: number; // 0..3
  wallRunGrip: number; // 0..3
  doubleJumpBoost: number; // 0..3
  precisionLanding: number; // 0..3
  fastRecovery: number; // 0..3
}

export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'heavyRain' | 'fog' | 'wind' | 'storm';
export type TimeOfDay = 'sunrise' | 'day' | 'sunset' | 'night';

export type ChallengeTag =
  | 'standard'
  | 'perfectLanding'
  | 'speedDemon'
  | 'noMistake'
  | 'skylineMarathon'
  | 'vanishing'
  | 'movingCity'
  | 'extremeHeights'
  | 'finalLeap';

export interface Platform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: 'building' | 'bridge' | 'overhead' | 'box' | 'upperBuilding';
  accentEdge?: 'top' | 'none';
  supportDrop?: number;
  tankViewHole?: boolean;
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  movePhase?: number;
  prop?: 'antenna' | 'hvac' | 'watertower' | 'billboard' | 'garden';
  collapseTriggered?: boolean;
  collapseProgress?: number;
  collapsed?: boolean;
  collapseFallY?: number;
  collapseFallVy?: number;
  collapseStepPulses?: number;
  isHighPlace?: boolean;
  vanishPeriod?: number;
  vanishDuty?: number;
  vanishPhase?: number;
  routeTag?: 'main' | 'expert' | 'secret';
  precisionPad?: boolean;
}

export interface GrindRail {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind?: 'rail' | 'glider';
  isHighPlace?: boolean;
}

export interface ThermalVent {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  powerVy?: number;
}

export interface RotatingObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  armCount: 2 | 3 | 4;
  speed: number;
  phase: number;
  thickness: number;
}

export interface TimedGate {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cycleSec: number;
  openRatio: number;
  phase: number;
}

export interface WindZone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  forceX: number;
  forceY: number;
}

export interface SecretDiscovery {
  id: string;
  title: string;
  districtIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  coinBonus: number;
  xpBonus: number;
}

export interface AirBooster {
  id: string;
  x: number;
  y: number;
  radius: number;
  dir: 'forward' | 'up-forward' | 'up';
  powerVx?: number;
  powerVy?: number;
  triggered?: boolean;
}

export interface GlassShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  w: number;
  h: number;
  alpha: number;
}

export interface GlassWall {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shattered?: boolean;
  shards?: GlassShard[];
}

export interface SpringPad {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  power?: number;
}

export interface BoostStrip {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hazard {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'laser' | 'steam' | 'hotground';
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  index: number;
}

export interface Shard {
  id: string;
  x: number;
  y: number;
  collected?: boolean;
  isRareToken?: boolean;
}

export type PowerUpType = 'surge' | 'shield' | 'magnet';

export interface PowerUpItem {
  id: string;
  x: number;
  y: number;
  kind: PowerUpType;
  collected?: boolean;
}

export interface EnemyEntity {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'sentry' | 'drone';
  baseX: number;
  patrolRange: number;
  phase: number;
  defeated?: boolean;
  defeatTimer?: number;
  defeatVx?: number;
  defeatVy?: number;
}

export interface CourseTheme {
  name: string;
  skyTop: string;
  skyBottom: string;
  sunColor: string;
  farCity: string;
  midCity: string;
  buildingFill: string;
  buildingStroke: string;
  ledgeHighlight: string;
  isNight?: boolean;
  weather?: 'mist' | 'clear' | 'wind' | 'rain' | 'storm';
}

export interface CourseDefinition {
  id: CourseId;
  levelNumber?: number;
  title: string;
  subtitle: string;
  difficulty: string;
  districtId?: string;
  districtName?: string;
  biomeIndex?: number;
  challengeTag?: ChallengeTag;
  weatherOverride?: WeatherCondition;
  timeOfDayOverride?: TimeOfDay;
  speedTargetSec?: number;
  noMistakeAllowed?: boolean;
  baseSpeed: number;
  timeLimitSec: number;
  goldTimeSec: number;
  silverTimeSec: number;
  isEndless?: boolean;
  fallLimitY: number;
  startX: number;
  startY: number;
  finishX: number;
  finishY: number;
  theme: CourseTheme;
  platforms: Platform[];
  rails: GrindRail[];
  springs: SpringPad[];
  boosts: BoostStrip[];
  airBoosters?: AirBooster[];
  glassWalls?: GlassWall[];
  thermalVents?: ThermalVent[];
  rotatingObstacles?: RotatingObstacle[];
  timedGates?: TimedGate[];
  windZones?: WindZone[];
  secretDiscoveries?: SecretDiscovery[];
  hazards: Hazard[];
  checkpoints: Checkpoint[];
  shards: Shard[];
  powerUps?: PowerUpItem[];
  enemies?: EnemyEntity[];
}

export interface ScarfNode {
  x: number;
  y: number;
}

export interface Afterimage {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: 1 | -1;
  action: RunnerAction;
  animTime: number;
  alpha: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'dust' | 'spark' | 'ring' | 'streak' | 'confetti';
}

export interface FloatingCallout {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface ReplayFrame {
  t: number;
  x: number;
  y: number;
  h: number;
  action: RunnerAction;
  facing: 1 | -1;
  vx: number;
}

export interface GhostParticipant {
  id: string;
  name: string;
  label: string;
  kind: 'personal' | 'rival' | 'leaderboard';
  appearance: CharacterCustomization;
  frames: ReplayFrame[];
}

export interface RivalRunnerState {
  id: string;
  name: string;
  personality: string;
  appearance: CharacterCustomization;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  grounded: boolean;
  action: RunnerAction;
  animTime: number;
  skillFactor: number;
  riskBias: number;
  jumpCooldown: number;
  finished: boolean;
  finishTime?: number;
}

export interface MultiplayerRemotePlayer {
  playerId: string;
  name: string;
  x: number;
  y: number;
  h: number;
  vx: number;
  vy: number;
  action: RunnerAction;
  facing: 1 | -1;
  progressPct: number;
  distanceMeters: number;
  finished: boolean;
  finishTime?: number;
  appearance: CharacterCustomization;
}

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  action: RunnerAction;
  grounded: boolean;
  onWall: boolean;
  wallRunTimer: number;
  wallRunCooldown: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  doubleJumpAvailable: boolean;
  slideTimer: number;
  rollTimer: number;
  grindingRailId: string | null;
  mantleTimer: number;
  mantleTargetX: number;
  mantleTargetY: number;
  animTime: number;
  squashX: number;
  squashY: number;
  scarf: ScarfNode[];
  afterimages: Afterimage[];
  lastFootstepPhase: number;
  highFallArmed: boolean;
  takeoffX: number;
  longestJumpM: number;
}

export type TutorialStepId =
  | 'jump-box'
  | 'hotground-jump'
  | 'hotground-double'
  | 'slide-duct'
  | 'complete';

export interface TutorialHudState {
  active: boolean;
  step: TutorialStepId;
  waitingAction: 'jump' | 'doubleJump' | 'slide' | null;
  bannerTimer: number;
}

export interface MysteryChaserState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  variant: 0 | 1 | 2 | 3;
  surgeTimer: number;
  bumpCooldown: number;
  afterimages: Array<{ x: number; y: number; alpha: number }>;
}

export interface ActivePowerUpTimers {
  surge: number;
  shield: number;
  magnet: number;
}

export interface HudSnapshot {
  levelNumber: number;
  runLevel: number;
  isEndless: boolean;
  elapsedTime: number;
  timeRemaining: number;
  distanceMeters: number;
  progressPct: number;
  shardsCollected: number;
  totalShards: number;
  takedownsCount: number;
  score: number;
  lastTrickLabel: string;
  chaserDistanceMeters: number;
  highPlaceStreak: number;
  highPlacesPassed: number;
  levelUpsEarned: number;
  comboMultiplier: number;
  coinsEarned: number;
  xpEarned: number;
  perfectLandings: number;
  secretsFoundInRun: number;
  sprintActive: boolean;
  wallRunActive: boolean;
  districtName: string;
  weatherLabel: string;
  timeOfDayLabel: string;
  challengeTag: ChallengeTag;
  racePosition: number;
  totalRacers: number;
  activeEventTitle?: string;
  activePowerUps: ActivePowerUpTimers;
  tutorial: TutorialHudState;
}

export interface RunSummary {
  courseId: CourseId;
  courseTitle: string;
  levelNumber: number;
  isEndless: boolean;
  cleared: boolean;
  onTime: boolean;
  caughtByChaser?: boolean;
  fellInLava?: boolean;
  noMistakeBroken?: boolean;
  elapsedTime: number;
  timeRemaining: number;
  distanceMeters: number;
  shardsCollected: number;
  totalShards: number;
  takedownsCount: number;
  highPlacesPassed: number;
  levelUpsEarned: number;
  coinsEarned: number;
  xpEarned: number;
  perfectLandings: number;
  longestJumpMeters: number;
  secretsDiscovered: string[];
  challengeTag: ChallengeTag;
  challengeCompleted: boolean;
  raceRank?: number;
  totalRacers?: number;
  tournamentId?: string;
  score: number;
  medal: 'Gold' | 'Silver' | 'Bronze' | 'None';
  isNewBest: boolean;
  replayFrames: ReplayFrame[];
}

export interface BestRecord {
  bestTimeSec?: number;
  bestDistanceM?: number;
  bestScore: number;
  medal?: 'Gold' | 'Silver' | 'Bronze';
}

export interface InputState {
  left: boolean;
  right: boolean;
  sprintHeld: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  slideHeld: boolean;
  slidePressed: boolean;
}

export interface SavedRunSnapshot {
  key: string;
  courseId: CourseId;
  levelNumber?: number;
  isEndless?: boolean;
  elapsedTime: number;
  simTime: number;
  score: number;
  shardsCollected: number;
  collectedShardIds: string[];
  activeCheckpointIndex: number;
  respawnX: number;
  respawnY: number;
  cameraX: number;
  cameraY: number;
  progressPct: number;
  distanceMeters: number;
  timeRemaining: number;
  player: {
    x: number;
    y: number;
    h: number;
    vx: number;
    vy: number;
    grounded: boolean;
    onWall: boolean;
    doubleJumpAvailable: boolean;
    highFallArmed: boolean;
  };
  endlessState?: {
    endlessChunkCount: number;
    endlessTailX: number;
    endlessTailY: number;
    platforms: Platform[];
    rails: GrindRail[];
    springs: SpringPad[];
    boosts: BoostStrip[];
    airBoosters?: AirBooster[];
    glassWalls?: GlassWall[];
    thermalVents?: ThermalVent[];
    rotatingObstacles?: RotatingObstacle[];
    timedGates?: TimedGate[];
    windZones?: WindZone[];
    hazards: Hazard[];
    shards: Shard[];
    powerUps?: PowerUpItem[];
    enemies?: EnemyEntity[];
  };
  powerUpTimers?: ActivePowerUpTimers;
  takedownsCount?: number;
  highPlaceStreak?: number;
  highPlacesPassed?: number;
  levelUpsEarned?: number;
  runLevel?: number;
  comboCount?: number;
  visitedHighPlaceIds?: string[];
  biomeIndex?: number;
  prevBiomeIndex?: number;
  chaser?: {
    x: number;
    y: number;
    vx: number;
    variant: 0 | 1 | 2 | 3;
    surgeTimer: number;
  };
  savedAt: number;
}
