import {
  ActivePowerUpTimers,
  AirBooster,
  CameraZoom,
  CourseDefinition,
  EnemyEntity,
  FloatingCallout,
  GlassWall,
  GrindRail,
  HudSnapshot,
  InputState,
  MysteryChaserState,
  Particle,
  Platform,
  PlayerState,
  PowerUpItem,
  RunSummary,
  SavedRunSnapshot,
  ThermalVent,
  TutorialStepId,
} from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { haptics } from '../utils/haptics';
import {
  buildLevelCourse,
  ENDLESS_COURSE,
  generateEndlessChunk,
  HIGH_PLACE_Y_THRESHOLD,
  LAVA_SURFACE_Y,
  MAX_LEVEL,
} from '../levels/courses';
import { pickRandomNextBiome, WORLD_BIOMES } from '../levels/biomes';

export const PLAYER_W = 26;
export const PLAYER_H_STAND = 54;
export const PLAYER_H_SLIDE = 26;

const GRAVITY = 1780;
const JUMP_VEL = -700;
const DOUBLE_JUMP_VEL = -650;
const COYOTE_TIME = 0.18;
const JUMP_BUFFER = 0.18;

export interface WorldRuntime {
  course: CourseDefinition;
  platforms: Platform[];
  rails: GrindRail[];
  springs: CourseDefinition['springs'];
  boosts: CourseDefinition['boosts'];
  airBoosters: AirBooster[];
  glassWalls: GlassWall[];
  thermalVents: ThermalVent[];
  hazards: CourseDefinition['hazards'];
  checkpoints: CourseDefinition['checkpoints'];
  shards: CourseDefinition['shards'];
  powerUps: PowerUpItem[];
  enemies: EnemyEntity[];
  player: PlayerState;
  particles: Particle[];
  callouts: FloatingCallout[];
  elapsedTime: number;
  simTime: number;
  score: number;
  takedownsCount: number;
  highPlaceStreak: number;
  highPlacesPassed: number;
  levelUpsEarned: number;
  runLevel: number;
  comboCount: number;
  comboTimer: number;
  levelUpBannerTimer: number;
  visitedHighPlaceIds: Set<string>;
  lastTrickLabel: string;
  lastTrickTimer: number;
  shardsCollected: number;
  powerUpTimers: ActivePowerUpTimers;
  enemyHitCooldown: number;
  glassSlowTimer: number;
  respawnX: number;
  respawnY: number;
  activeCheckpointIndex: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  targetCameraZoom: CameraZoom;
  shakeTimer: number;
  shakeMagnitude: number;
  flashAlpha: number;
  flashColor: string;
  zoomPunch: number;
  speedLinesAlpha: number;
  afterimageCooldown: number;
  biomeIndex: number;
  prevBiomeIndex: number;
  biomeBlendElapsed: number;
  finished: boolean;
  levelCleared: boolean;
  caughtByChaser: boolean;
  fellInLava: boolean;
  chaser: MysteryChaserState;
  endlessChunkCount: number;
  endlessTailX: number;
  endlessTailY: number;
  tutorialActive: boolean;
  tutorialStep: TutorialStepId;
  tutorialWaitingAction: 'jump' | 'doubleJump' | 'slide' | null;
  tutorialCompleteBannerTimer: number;
  tutorialJumpBoxCleared: boolean;
  tutorialHotJumpDone: boolean;
  tutorialHotDoubleDone: boolean;
  tutorialSlideDone: boolean;
}

function createScarf(x: number, y: number) {
  return Array.from({ length: 8 }, (_, i) => ({
    x: x - i * 5,
    y: y + 10,
  }));
}

export function createWorldRuntime(
  course: CourseDefinition,
  options?: { tutorialMode?: boolean; cameraZoom?: CameraZoom }
): WorldRuntime {
  const platforms = course.platforms.map((p) => ({ ...p }));
  const rails = course.rails.map((r) => ({ ...r }));
  const springs = course.springs.map((s) => ({ ...s }));
  const boosts = course.boosts.map((b) => ({ ...b }));
  const airBoosters = (course.airBoosters ?? []).map((ab) => ({ ...ab, triggered: false }));
  const glassWalls = (course.glassWalls ?? []).map((gw) => ({ ...gw, shattered: false, shards: [] }));
  const thermalVents = (course.thermalVents ?? []).map((tv) => ({ ...tv }));
  const hazards = course.hazards.map((h) => ({ ...h }));
  const checkpoints = course.checkpoints.map((c) => ({ ...c }));
  const shards = course.shards.map((s) => ({ ...s, collected: false }));
  const powerUps = (course.powerUps ?? []).map((pu) => ({ ...pu, collected: false }));
  const enemies = (course.enemies ?? []).map((en) => ({ ...en, defeated: false }));
  const tutorialMode = Boolean(options?.tutorialMode);
  const initialZoom: CameraZoom = options?.cameraZoom ?? 1;
  const startPlatform = course.platforms[0];
  const initialTailX = startPlatform ? startPlatform.x + startPlatform.w : 1020;
  const initialTailY = startPlatform ? startPlatform.y : 480;

  const runtime: WorldRuntime = {
    course: { ...course },
    platforms,
    rails,
    springs,
    boosts,
    airBoosters,
    glassWalls,
    thermalVents,
    hazards,
    checkpoints,
    shards,
    powerUps,
    enemies,
    player: {
      x: course.startX,
      y: course.startY,
      w: PLAYER_W,
      h: PLAYER_H_STAND,
      vx: course.baseSpeed,
      vy: 0,
      facing: 1,
      action: 'run',
      grounded: false,
      onWall: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      doubleJumpAvailable: true,
      slideTimer: 0,
      rollTimer: 0,
      grindingRailId: null,
      mantleTimer: 0,
      mantleTargetX: 0,
      mantleTargetY: 0,
      animTime: 0,
      squashX: 1,
      squashY: 1,
      scarf: createScarf(course.startX + 13, course.startY),
      afterimages: [],
      lastFootstepPhase: 0,
      highFallArmed: false,
    },
    particles: [],
    callouts: [],
    elapsedTime: 0,
    simTime: 0,
    score: 0,
    takedownsCount: 0,
    highPlaceStreak: 0,
    highPlacesPassed: 0,
    levelUpsEarned: 0,
    runLevel: course.isEndless ? 1 : Math.max(1, course.levelNumber ?? 1),
    comboCount: 0,
    comboTimer: 0,
    levelUpBannerTimer: 0,
    visitedHighPlaceIds: new Set<string>(),
    lastTrickLabel: '',
    lastTrickTimer: 0,
    shardsCollected: 0,
    powerUpTimers: { surge: 0, shield: 0, magnet: 0 },
    enemyHitCooldown: 0,
    glassSlowTimer: 0,
    respawnX: course.startX,
    respawnY: course.startY,
    activeCheckpointIndex: 0,
    cameraX: Math.max(0, course.startX - 360),
    cameraY: course.startY - 680,
    cameraZoom: initialZoom,
    targetCameraZoom: initialZoom,
    shakeTimer: 0,
    shakeMagnitude: 0,
    flashAlpha: 0,
    flashColor: '#F97316',
    zoomPunch: 0,
    speedLinesAlpha: 0,
    afterimageCooldown: 0,
    biomeIndex: tutorialMode
      ? 0
      : course.levelNumber && course.levelNumber > 0
      ? (course.levelNumber - 1) % WORLD_BIOMES.length
      : Math.floor(Math.random() * WORLD_BIOMES.length),
    prevBiomeIndex: 0,
    biomeBlendElapsed: 2,
    finished: false,
    levelCleared: false,
    caughtByChaser: false,
    fellInLava: false,
    chaser: {
      x: course.startX - 360,
      y: course.startY - 22,
      vx: course.baseSpeed,
      vy: 0,
      variant: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
      surgeTimer: 0,
      bumpCooldown: 0,
      afterimages: [],
    },
    endlessChunkCount: 0,
    endlessTailX: initialTailX,
    endlessTailY: initialTailY,
    tutorialActive: tutorialMode,
    tutorialStep: tutorialMode ? 'jump-box' : 'complete',
    tutorialWaitingAction: null,
    tutorialCompleteBannerTimer: 0,
    tutorialJumpBoxCleared: false,
    tutorialHotJumpDone: false,
    tutorialHotDoubleDone: false,
    tutorialSlideDone: false,
  };

  runtime.prevBiomeIndex = runtime.biomeIndex;

  if (course.isEndless) {
    extendEndlessWorld(runtime, 5600);
  }

  return runtime;
}

function extendEndlessWorld(world: WorldRuntime, targetX: number) {
  while (world.endlessTailX < targetX) {
    world.endlessChunkCount += 1;
    const chunk = generateEndlessChunk(world.endlessTailX, world.endlessTailY, world.endlessChunkCount);
    world.platforms.push(...chunk.platforms);
    world.rails.push(...chunk.rails);
    world.springs.push(...chunk.springs);
    world.boosts.push(...chunk.boosts);
    world.airBoosters.push(...chunk.airBoosters.map((ab) => ({ ...ab, triggered: false })));
    world.glassWalls.push(...chunk.glassWalls.map((gw) => ({ ...gw, shattered: false, shards: [] })));
    world.thermalVents.push(...chunk.thermalVents.map((tv) => ({ ...tv })));
    world.hazards.push(...chunk.hazards);
    world.shards.push(...chunk.shards.map((s) => ({ ...s, collected: false })));
    world.powerUps.push(...chunk.powerUps.map((pu) => ({ ...pu, collected: false })));
    world.enemies.push(...chunk.enemies.map((en) => ({ ...en, defeated: false })));
    world.endlessTailX = chunk.nextX;
    world.endlessTailY = chunk.nextY;
  }
}

export function isCollapsibleBlock(p: Platform, tutorialActive: boolean): boolean {
  if (tutorialActive && p.id === 'tut-box') return false;
  return p.kind === 'box' || p.kind === 'bridge';
}

export function getPlatformBounds(p: Platform, simTime: number): { x: number; y: number; dx: number; dy: number } {
  const baseX = p.x;
  const baseY = p.y;
  const sinkOffset = p.collapsed
    ? p.collapseFallY ?? 16
    : p.collapseProgress && p.collapseProgress > 0
    ? Math.pow(p.collapseProgress, 1.5) * 16
    : 0;

  if (!p.moveAxis || !p.moveRange || !p.moveSpeed) {
    return { x: baseX, y: baseY + sinkOffset, dx: 0, dy: 0 };
  }
  const phase = p.movePhase ?? 0;
  const offset = Math.sin(simTime * p.moveSpeed + phase) * p.moveRange;
  const vel = Math.cos(simTime * p.moveSpeed + phase) * p.moveRange * p.moveSpeed;
  return {
    x: p.moveAxis === 'x' ? baseX + offset : baseX,
    y: (p.moveAxis === 'y' ? baseY + offset : baseY) + sinkOffset,
    dx: p.moveAxis === 'x' ? vel : 0,
    dy: p.moveAxis === 'y' ? vel : 0,
  };
}

function getComboMultiplier(comboCount: number): number {
  return 1 + Math.min(4, Math.floor(comboCount / 2));
}

function addTrick(world: WorldRuntime, label: string, points: number, x: number, y: number) {
  world.comboCount += 1;
  world.comboTimer = 4.2;
  const mult = getComboMultiplier(world.comboCount);
  const finalPoints = points * mult;
  world.score += finalPoints;
  world.lastTrickLabel = mult > 1 ? `${label} ×${mult}` : label;
  world.lastTrickTimer = 1.4;
  world.callouts.push({
    x,
    y: y - 16,
    vy: -40,
    text: `${label} +${finalPoints}`,
    color: mult >= 3 ? '#FDE047' : '#F97316',
    life: 0.9,
    maxLife: 0.9,
  });
}

function recordHighPlacePass(world: WorldRuntime, placeId: string, x: number, y: number) {
  if (world.tutorialActive || world.visitedHighPlaceIds.has(placeId)) return;
  world.visitedHighPlaceIds.add(placeId);
  world.highPlacesPassed += 1;
  world.highPlaceStreak += 1;
  world.comboCount += 1;
  world.comboTimer = 4.5;

  if (world.highPlaceStreak >= 5) {
    world.highPlaceStreak = 0;
    world.levelUpsEarned += 1;
    world.runLevel = world.course.isEndless ? world.runLevel + 1 : Math.min(MAX_LEVEL, world.runLevel + 1);
    if (!world.course.isEndless) {
      world.course.levelNumber = world.runLevel;
      world.course.title = `Level ${world.runLevel}`;
    }

    const p = world.player;
    world.score += 500;
    world.powerUpTimers.surge = Math.max(world.powerUpTimers.surge, 3.5);
    p.vx = Math.max(p.vx, 630);
    world.chaser.x = Math.max(p.x - 480, world.chaser.x - 115);
    world.levelUpBannerTimer = 2.6;
    world.lastTrickLabel = `LEVEL UP! LVL ${world.runLevel}`;
    world.lastTrickTimer = 2.0;

    // Fresh biome shift on level up
    const nextIdx = pickRandomNextBiome(world.biomeIndex, world.prevBiomeIndex);
    world.prevBiomeIndex = world.biomeIndex;
    world.biomeIndex = nextIdx;
    world.biomeBlendElapsed = 0;

    soundEngine.playLevelUp();
    haptics.pulse([20, 20, 45]);
    world.shakeTimer = 0.18;
    world.shakeMagnitude = 7;
    world.zoomPunch = -0.045;
    triggerFlash(world, '#FBBF24', 0.34);
    spawnParticles(world, x, y, 24, 'confetti', '#FBBF24', 300, -190);
    spawnParticles(world, x, y, 16, 'confetti', '#22D3EE', 280, -210);
    spawnParticles(world, x, y, 2, 'ring', '#FEF08A', 180, -20);
    world.callouts.push({
      x,
      y: y - 44,
      vy: -48,
      text: `5 HIGH PLACES! LEVEL ${world.runLevel}`,
      color: '#FDE047',
      life: 1.5,
      maxLife: 1.5,
    });
  } else {
    soundEngine.playHighPlace(world.highPlaceStreak);
    spawnParticles(world, x, y, 8, 'spark', '#FBBF24', 150, -70);
    addTrick(world, `HIGH PLACE ${world.highPlaceStreak}/5`, 75, x, y);
  }
}

function spawnParticles(
  world: WorldRuntime,
  x: number,
  y: number,
  count: number,
  kind: Particle['kind'],
  color: string,
  spreadVx = 140,
  baseVy = -80
) {
  for (let i = 0; i < count; i++) {
    const isRing = kind === 'ring';
    const isStreak = kind === 'streak';
    const isConfetti = kind === 'confetti';
    world.particles.push({
      x,
      y,
      vx: isStreak ? -(260 + Math.random() * 240) : (Math.random() - 0.5) * spreadVx,
      vy: isConfetti
        ? -240 - Math.random() * 260
        : isStreak
        ? (Math.random() - 0.5) * 45
        : baseVy + (Math.random() - 0.5) * 85,
      size: isRing ? 10 : isStreak ? 16 + Math.random() * 22 : isConfetti ? 5 + Math.random() * 4 : 2.8 + Math.random() * 4,
      life: isRing ? 0.34 : isStreak ? 0.22 + Math.random() * 0.14 : isConfetti ? 0.9 + Math.random() * 0.5 : 0.32 + Math.random() * 0.26,
      maxLife: isRing ? 0.34 : isStreak ? 0.34 : isConfetti ? 1.3 : 0.5,
      color,
      kind,
    });
  }
}

function triggerFlash(world: WorldRuntime, color: string, alpha: number) {
  world.flashColor = color;
  world.flashAlpha = Math.max(world.flashAlpha, alpha);
}

function pushAfterimage(p: PlayerState, alpha = 0.62) {
  p.afterimages.push({
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    facing: p.facing,
    action: p.action,
    animTime: p.animTime,
    alpha,
  });
  if (p.afterimages.length > 4) {
    p.afterimages.shift();
  }
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function canStandUp(world: WorldRuntime, x: number, bottomY: number): boolean {
  const standTop = bottomY - PLAYER_H_STAND;
  for (const p of world.platforms) {
    if (p.collapsed || p.kind === 'upperBuilding') continue;
    const b = getPlatformBounds(p, world.simTime);
    if (rectsOverlap(x + 2, standTop, PLAYER_W - 4, PLAYER_H_STAND - PLAYER_H_SLIDE, b.x, b.y, p.w, p.h)) {
      return false;
    }
  }
  return true;
}

function handleFail(world: WorldRuntime, inLava = false) {
  world.highPlaceStreak = 0;
  world.comboCount = 0;
  world.fellInLava = inLava;
  if (inLava) {
    soundEngine.playLavaSplash();
    const p = world.player;
    spawnParticles(world, p.x + p.w * 0.5, LAVA_SURFACE_Y, 26, 'spark', '#FEF08A', 280, -240);
    spawnParticles(world, p.x + p.w * 0.5, LAVA_SURFACE_Y, 18, 'spark', '#F97316', 240, -180);
    spawnParticles(world, p.x + p.w * 0.5, LAVA_SURFACE_Y, 2, 'ring', '#FB923C', 160, -20);
  } else {
    soundEngine.playFail();
  }
  haptics.pulse([45, 30, 75]);
  world.shakeTimer = 0.32;
  world.shakeMagnitude = 12;
  world.zoomPunch = 0.05;
  triggerFlash(world, inLava ? '#F97316' : '#EF4444', 0.42);
  world.finished = true;
}

function updateTutorialGuide(world: WorldRuntime, input: InputState, rawDt: number) {
  if (world.tutorialCompleteBannerTimer > 0) {
    world.tutorialCompleteBannerTimer = Math.max(0, world.tutorialCompleteBannerTimer - rawDt);
  }
  if (!world.tutorialActive) {
    world.tutorialWaitingAction = null;
    return;
  }

  const p = world.player;
  world.tutorialWaitingAction = null;

  if (world.tutorialStep === 'jump-box') {
    if (!world.tutorialJumpBoxCleared) {
      if (p.x >= 305 && p.x <= 440 && p.grounded) {
        if (input.jumpPressed) {
          world.tutorialJumpBoxCleared = true;
        } else {
          world.tutorialWaitingAction = 'jump';
        }
      } else if (p.x > 440 || !p.grounded) {
        world.tutorialJumpBoxCleared = true;
      }
    }
    if (p.x >= 560) {
      world.tutorialStep = 'hotground-jump';
    }
  } else if (world.tutorialStep === 'hotground-jump' || world.tutorialStep === 'hotground-double') {
    if (!world.tutorialHotJumpDone) {
      if (p.x >= 645 && p.x <= 785 && p.grounded) {
        if (input.jumpPressed) {
          world.tutorialHotJumpDone = true;
        } else {
          world.tutorialWaitingAction = 'jump';
        }
      } else if (p.x >= 690 && !p.grounded) {
        world.tutorialHotJumpDone = true;
      }
    }

    if (world.tutorialHotJumpDone) {
      world.tutorialStep = 'hotground-double';
      if (!world.tutorialHotDoubleDone) {
        if (!p.grounded && p.doubleJumpAvailable && p.x >= 760 && p.x <= 930) {
          if (input.jumpPressed) {
            world.tutorialHotDoubleDone = true;
          } else {
            world.tutorialWaitingAction = 'doubleJump';
          }
        } else if (!p.doubleJumpAvailable) {
          world.tutorialHotDoubleDone = true;
        }
      }
    }

    if (p.x >= 1005) {
      world.tutorialStep = 'slide-duct';
    }
  } else if (world.tutorialStep === 'slide-duct') {
    if (!world.tutorialSlideDone) {
      if (p.x >= 1110 && p.x <= 1255) {
        if (input.slideHeld || input.slidePressed || p.h === PLAYER_H_SLIDE) {
          world.tutorialSlideDone = true;
        } else {
          world.tutorialWaitingAction = 'slide';
        }
      }
    }

    if (p.x >= 1475) {
      world.tutorialStep = 'complete';
      world.tutorialActive = false;
      world.tutorialWaitingAction = null;
      world.tutorialCompleteBannerTimer = 3.2;
      soundEngine.playCheckpoint();
      triggerFlash(world, '#10B981', 0.24);
      spawnParticles(world, p.x + p.w / 2, p.y, 18, 'confetti', '#F97316', 240, -140);
      addTrick(world, 'HUSTLE READY', 150, p.x + p.w / 2, p.y - 20);
    }
  }
}

function updateCollapsingBlocks(world: WorldRuntime, dt: number) {
  const p = world.player;

  for (const plat of world.platforms) {
    if (plat.collapsed) {
      plat.collapseFallVy = (plat.collapseFallVy ?? 140) + 1500 * dt;
      plat.collapseFallY = (plat.collapseFallY ?? 16) + plat.collapseFallVy * dt;
      continue;
    }

    if (!plat.collapseTriggered) continue;

    const duration = plat.kind === 'box' ? 1.15 : Math.max(1.45, plat.w / 145);
    const nextProgress = Math.min(1, (plat.collapseProgress ?? 0) + dt / duration);
    plat.collapseProgress = nextProgress;

    const pb = getPlatformBounds(plat, world.simTime);
    if (Math.random() < 0.35 * nextProgress) {
      const rx = pb.x + Math.random() * plat.w;
      spawnParticles(world, rx, pb.y + plat.h - 2, 1, 'dust', '#94A3B8', 60, 45);
    }

    if (nextProgress >= 1) {
      plat.collapsed = true;
      plat.collapseFallY = 16;
      plat.collapseFallVy = 150;
      soundEngine.playCollapse();
      spawnParticles(world, pb.x + plat.w * 0.5, pb.y + plat.h * 0.5, 14, 'dust', '#64748B', 200, 55);
      spawnParticles(world, pb.x + plat.w * 0.5, pb.y + plat.h * 0.5, 8, 'spark', '#FB923C', 180, -15);

      if (
        p.x + p.w > pb.x - 4 &&
        p.x < pb.x + plat.w + 4 &&
        Math.abs(p.y + p.h - pb.y) < 18
      ) {
        p.grounded = false;
        p.coyoteTimer = 0;
        world.shakeTimer = Math.max(world.shakeTimer, 0.14);
        world.shakeMagnitude = Math.max(world.shakeMagnitude, 5);
      }
    }
  }
}

export function stepWorld(
  world: WorldRuntime,
  input: InputState,
  rawDt: number
): { summary: RunSummary | null } {
  const clampedDt = Math.min(rawDt, 0.033);
  if (world.finished) return { summary: null };

  updateTutorialGuide(world, input, clampedDt);

  // Bullet-time slow-mo while waiting on a tutorial action cue
  const dt = world.tutorialWaitingAction ? clampedDt * 0.035 : clampedDt;
  const visualDt = world.tutorialWaitingAction ? clampedDt * 0.65 : clampedDt;

  const prevElapsed = world.elapsedTime;
  world.elapsedTime += dt;
  world.simTime += visualDt;

  if (!world.tutorialActive) {
    world.biomeBlendElapsed += dt;
    const prevBiomeStep = Math.floor(prevElapsed / 15);
    const nextBiomeStep = Math.floor(world.elapsedTime / 15);
    if (nextBiomeStep > prevBiomeStep) {
      const nextIdx = pickRandomNextBiome(world.biomeIndex, world.prevBiomeIndex);
      world.prevBiomeIndex = world.biomeIndex;
      world.biomeIndex = nextIdx;
      world.biomeBlendElapsed = 0;

      const biomeMeta = WORLD_BIOMES[nextIdx];
      triggerFlash(world, biomeMeta.calloutColor, 0.16);
      world.callouts.push({
        x: world.player.x + 80,
        y: world.player.y - 68,
        vy: -32,
        text: biomeMeta.label,
        color: biomeMeta.calloutColor,
        life: 1.4,
        maxLife: 1.4,
      });
    }
  }

  updateCollapsingBlocks(world, dt);

  if (world.course.isEndless && world.player.x + 3800 > world.endlessTailX) {
    extendEndlessWorld(world, world.player.x + 4800);
  }

  const p = world.player;
  p.animTime += dt;

  if (p.coyoteTimer > 0) p.coyoteTimer -= dt;
  if (p.jumpBufferTimer > 0) p.jumpBufferTimer -= dt;
  if (world.shakeTimer > 0) world.shakeTimer -= dt;
  if (world.lastTrickTimer > 0) world.lastTrickTimer -= dt;
  if (world.levelUpBannerTimer > 0) world.levelUpBannerTimer = Math.max(0, world.levelUpBannerTimer - dt);
  if (world.comboTimer > 0) {
    world.comboTimer = Math.max(0, world.comboTimer - dt);
    if (world.comboTimer <= 0) world.comboCount = 0;
  }
  if (world.enemyHitCooldown > 0) world.enemyHitCooldown = Math.max(0, world.enemyHitCooldown - dt);
  if (world.glassSlowTimer > 0) world.glassSlowTimer = Math.max(0, world.glassSlowTimer - dt);
  if (world.powerUpTimers.surge > 0) world.powerUpTimers.surge = Math.max(0, world.powerUpTimers.surge - dt);
  if (world.powerUpTimers.shield > 0) world.powerUpTimers.shield = Math.max(0, world.powerUpTimers.shield - dt);
  if (world.powerUpTimers.magnet > 0) world.powerUpTimers.magnet = Math.max(0, world.powerUpTimers.magnet - dt);

  if (input.jumpPressed) p.jumpBufferTimer = JUMP_BUFFER;

  p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
  p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);

  // Target auto-run speed (gentle progressive ramp + active Overdrive Surge bonus)
  const endlessBonus = world.course.isEndless ? Math.min(95, world.elapsedTime * 1.05) : 0;
  const surgeBonus = world.powerUpTimers.surge > 0 ? 125 : 0;
  let targetSpeed = world.course.baseSpeed + endlessBonus + surgeBonus;
  if (input.left && !input.right) targetSpeed *= 0.72;
  else if (input.right && !input.left) targetSpeed *= 1.18;
  if (world.glassSlowTimer > 0) targetSpeed *= 0.9;

  // Active Ledge Mantle
  if (p.mantleTimer > 0) {
    p.mantleTimer -= dt;
    const progress = 1 - Math.max(0, p.mantleTimer) / 0.1;
    p.x += (p.mantleTargetX - p.x) * Math.min(1, progress * 0.65 + 0.35);
    p.y += (p.mantleTargetY - p.y) * Math.min(1, progress * 0.65 + 0.35);
    p.action = 'mantle';
    if (p.mantleTimer <= 0) {
      p.x = p.mantleTargetX;
      p.y = p.mantleTargetY;
      p.vy = 0;
      p.vx = Math.max(targetSpeed, p.vx);
      p.grounded = true;
      p.doubleJumpAvailable = true;
    }
    updateVisualsAndCamera(world, dt);
    return checkCourseEnd(world);
  }

  // Grind Rail & Overhead Bar Line Glider State
  if (p.grindingRailId) {
    const rail = world.rails.find((r) => r.id === p.grindingRailId);
    if (!rail) {
      p.grindingRailId = null;
    } else {
      const isGlider = rail.kind === 'glider';
      const rx1 = Math.min(rail.x1, rail.x2);
      const rx2 = Math.max(rail.x1, rail.x2);
      const cx = p.x + p.w / 2;
      if (cx < rx1 - 10 || cx > rx2 + 10) {
        p.grindingRailId = null;
        if (isGlider) {
          p.vy = Math.min(p.vy, -135);
          p.doubleJumpAvailable = true;
        }
      } else {
        const slope = (rail.y2 - rail.y1) / (rail.x2 - rail.x1 || 1);
        p.vx = Math.max(targetSpeed + (isGlider ? 145 : 75), p.vx);
        p.x += p.vx * dt;
        const newCx = p.x + p.w / 2;
        const newT = (newCx - rail.x1) / (rail.x2 - rail.x1 || 1);
        const railY = rail.y1 + newT * (rail.y2 - rail.y1);
        p.y = isGlider ? railY + 8 : railY - p.h;
        p.vy = slope * p.vx;
        p.action = isGlider ? 'hangGlide' : 'grind';
        p.doubleJumpAvailable = true;

        if (isGlider) {
          if (Math.random() < 0.85) {
            spawnParticles(world, newCx, railY, 2, 'spark', '#38BDF8', 130, 50);
            spawnParticles(world, newCx - 8, railY + 4, 1, 'streak', '#BAE6FD', 110, 0);
          }
        } else if (Math.random() < 0.85) {
          spawnParticles(world, newCx, p.y + p.h, 2, 'spark', '#FBBF24', 140, -80);
          spawnParticles(world, newCx, p.y + p.h - 2, 1, 'streak', '#FDE68A', 90, -20);
        }

        if (p.jumpBufferTimer > 0) {
          p.grindingRailId = null;
          p.jumpBufferTimer = 0;
          p.vy = isGlider ? JUMP_VEL * 1.06 : JUMP_VEL;
          p.squashX = 0.78;
          p.squashY = 1.25;
          world.zoomPunch = -0.025;
          soundEngine.playJump();
          spawnParticles(world, newCx, isGlider ? railY : p.y + p.h, 1, 'ring', isGlider ? '#38BDF8' : '#FBBF24', 120, -40);
          addTrick(world, isGlider ? 'GLIDER LAUNCH' : 'RAIL LEAP', isGlider ? 95 : 75, newCx, p.y);
        } else if (isGlider && input.slidePressed) {
          p.grindingRailId = null;
          p.vy = 260;
          p.rollTimer = 0.25;
          soundEngine.playRoll();
        }

        postStepChecks(world, dt);
        return checkCourseEnd(world);
      }
    }
  }

  // Slide & Roll
  const bottomY = p.y + p.h;
  if (p.rollTimer > 0) {
    p.rollTimer -= dt;
    if (p.h !== PLAYER_H_SLIDE) {
      p.h = PLAYER_H_SLIDE;
      p.y = bottomY - PLAYER_H_SLIDE;
    }
    if (p.rollTimer <= 0 && !input.slideHeld && canStandUp(world, p.x, p.y + p.h)) {
      p.h = PLAYER_H_STAND;
      p.y = p.y + PLAYER_H_SLIDE - PLAYER_H_STAND;
    }
  } else if (p.grounded && input.slideHeld) {
    if (p.h !== PLAYER_H_SLIDE) {
      p.h = PLAYER_H_SLIDE;
      p.y = bottomY - PLAYER_H_SLIDE;
      p.vx = Math.max(p.vx, targetSpeed + 65);
      p.squashX = 1.22;
      p.squashY = 0.8;
      pushAfterimage(p, 0.72);
      soundEngine.playRoll();
      haptics.pulse(14);
      spawnParticles(world, p.x + p.w / 2, p.y + p.h, 5, 'dust', '#94A3B8', 110, -35);
    }
    if (Math.random() < 0.35) {
      spawnParticles(world, p.x + p.w / 2, p.y + p.h, 1, 'dust', '#CBD5E1', 50, -20);
    }
  } else if (p.h === PLAYER_H_SLIDE) {
    if (canStandUp(world, p.x, bottomY)) {
      p.h = PLAYER_H_STAND;
      p.y = bottomY - PLAYER_H_STAND;
    }
  }

  // Smooth horizontal auto-run acceleration toward targetSpeed
  if (p.vx < targetSpeed) {
    p.vx = Math.min(targetSpeed, p.vx + 1850 * dt);
  } else if (p.vx > targetSpeed) {
    // Let boost strip / double jump extra speed decay gently
    p.vx = Math.max(targetSpeed, p.vx - 260 * dt);
  }

  // Gravity + optional fast-fall when holding slide in mid-air
  const extraFall = !p.grounded && input.slideHeld && p.vy > -100 ? 850 : 0;
  p.vy += (GRAVITY + extraFall) * dt;
  if (p.onWall && p.vy > 0 && !p.grounded) {
    p.vy = Math.min(p.vy, 160);
  }
  if (p.vy > 1150) p.vy = 1150;
  if (p.vy > 520) p.highFallArmed = true;

  // Execute Jump / Double Jump / Wall Vault
  if (p.jumpBufferTimer > 0) {
    if (p.grounded || p.coyoteTimer > 0) {
      if (p.h === PLAYER_H_SLIDE && canStandUp(world, p.x, p.y + p.h)) {
        p.h = PLAYER_H_STAND;
        p.y = p.y + PLAYER_H_SLIDE - PLAYER_H_STAND;
      }
      p.vy = JUMP_VEL;
      p.grounded = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.squashX = 0.76;
      p.squashY = 1.28;
      pushAfterimage(p, 0.68);
      soundEngine.playJump();
      haptics.pulse(12);
      spawnParticles(world, p.x + p.w / 2, p.y + p.h, 6, 'dust', '#E2E8F0', 130, -55);
    } else if (p.onWall) {
      // Forgiving forward wall vault upward
      p.vy = JUMP_VEL * 0.98;
      p.onWall = false;
      p.jumpBufferTimer = 0;
      p.doubleJumpAvailable = true;
      p.squashX = 0.76;
      p.squashY = 1.28;
      pushAfterimage(p, 0.76);
      soundEngine.playWallKick();
      haptics.pulse(18);
      world.shakeTimer = 0.1;
      world.shakeMagnitude = 4;
      spawnParticles(world, p.x + p.w, p.y + p.h * 0.5, 12, 'spark', '#F97316', 190, -90);
      spawnParticles(world, p.x + p.w, p.y + p.h * 0.5, 1, 'ring', '#FB923C', 140, -40);
      addTrick(world, 'WALL VAULT', 70, p.x + p.w, p.y);
    } else if (p.doubleJumpAvailable) {
      // Mid-air Double Jump / Air Vault
      if (p.h === PLAYER_H_SLIDE && canStandUp(world, p.x, p.y + p.h)) {
        p.h = PLAYER_H_STAND;
        p.y = p.y + PLAYER_H_SLIDE - PLAYER_H_STAND;
      }
      p.vy = DOUBLE_JUMP_VEL;
      p.vx = Math.max(p.vx, targetSpeed + 55);
      p.doubleJumpAvailable = false;
      p.jumpBufferTimer = 0;
      pushAfterimage(p, 0.85);
      soundEngine.playDash();
      haptics.pulse(14);
      addTrick(world, 'AIR VAULT', 50, p.x + p.w / 2, p.y);
    }
  }

  // Variable jump height on quick tap (gentle cut for touch swipe reliability)
  if (!input.jumpHeld && p.vy < -280) {
    p.vy *= 0.82;
  }

  // X Collision + Auto-Mantle
  p.x += p.vx * dt;
  p.onWall = false;

  for (const plat of world.platforms) {
    if (plat.collapsed || plat.kind === 'upperBuilding') continue;
    const b = getPlatformBounds(plat, world.simTime);
    if (rectsOverlap(p.x, p.y, p.w, p.h, b.x, b.y, plat.w, plat.h)) {
      const topOverlap = p.y + p.h - b.y;
      const canMantleTop =
        plat.kind !== 'overhead' &&
        topOverlap > 0 &&
        topOverlap <= 44 &&
        p.y < b.y;

      if (canMantleTop && canStandUp(world, b.x + 8, b.y)) {
        p.mantleTimer = 0.1;
        p.mantleTargetX = b.x + 10;
        p.mantleTargetY = b.y - PLAYER_H_STAND;
        p.h = PLAYER_H_STAND;
        p.doubleJumpAvailable = true;
        if (isCollapsibleBlock(plat, world.tutorialActive) && !plat.collapseTriggered) {
          plat.collapseTriggered = true;
          plat.collapseProgress = Math.max(plat.collapseProgress ?? 0, 0.08);
          plat.collapseStepPulses = (plat.collapseStepPulses ?? 0) + 1;
          soundEngine.playCrumbleStep(plat.collapseProgress);
        }
        soundEngine.playJump();
        spawnParticles(world, p.mantleTargetX + p.w / 2, b.y, 6, 'dust', '#F97316', 100, -50);
        addTrick(world, 'VAULT', 60, p.mantleTargetX, b.y);
        if (plat.isHighPlace || b.y <= HIGH_PLACE_Y_THRESHOLD) {
          recordHighPlacePass(world, plat.id, p.mantleTargetX + p.w * 0.5, b.y);
        }
        updateVisualsAndCamera(world, dt);
        return checkCourseEnd(world);
      }

      // Blocked by solid front face — gentle stumble & mild pursuer surge
      p.x = b.x - p.w;
      p.vx = 0;
      if (world.highPlaceStreak > 0) {
        world.highPlaceStreak = 0;
        world.comboCount = 0;
        world.callouts.push({
          x: p.x,
          y: p.y - 42,
          vy: -36,
          text: 'STREAK RESET',
          color: '#FCA5A5',
          life: 0.85,
          maxLife: 0.85,
        });
      }
      if (!world.tutorialActive && world.chaser.bumpCooldown <= 0) {
        world.chaser.bumpCooldown = 0.65;
        world.chaser.surgeTimer = Math.max(world.chaser.surgeTimer, 0.65);
        world.chaser.x = Math.min(p.x - 36, world.chaser.x + 16);
        world.shakeTimer = Math.max(world.shakeTimer, 0.08);
        world.shakeMagnitude = Math.max(world.shakeMagnitude, 3);
        if (p.x - world.chaser.x < 240) {
          world.callouts.push({
            x: p.x,
            y: p.y - 18,
            vy: -36,
            text: 'CLOSING IN!',
            color: '#EF4444',
            life: 0.75,
            maxLife: 0.75,
          });
        }
      }
      if (!p.grounded && plat.kind !== 'overhead') {
        p.onWall = true;
        p.doubleJumpAvailable = true;
      }
    }
  }

  // Y Collision
  const prevFootY = p.y + p.h;
  const wasGrounded = p.grounded;
  p.grounded = false;
  p.y += p.vy * dt;
  let standingPlatform: Platform | null = null;
  const groundCheckH = wasGrounded && p.vy >= 0 ? p.h + 5 : p.h;

  for (const plat of world.platforms) {
    if (plat.collapsed) continue;
    const b = getPlatformBounds(plat, world.simTime);
    const isOneWayTop = plat.kind === 'upperBuilding';
    if (rectsOverlap(p.x, p.y, p.w, groundCheckH, b.x, b.y, plat.w, plat.h)) {
      if (p.vy >= 0 && (!isOneWayTop || prevFootY <= b.y + 16 + Math.abs(b.dy) * dt)) {
        p.y = b.y - p.h;
        standingPlatform = plat;
        if (!wasGrounded && p.vy > 200) {
          if (p.highFallArmed && input.slideHeld) {
            p.rollTimer = 0.3;
            p.h = PLAYER_H_SLIDE;
            p.y = b.y - PLAYER_H_SLIDE;
            p.vx = Math.max(p.vx, targetSpeed + 90);
            world.shakeTimer = 0.12;
            world.shakeMagnitude = 5;
            world.zoomPunch = -0.025;
            soundEngine.playRoll();
            spawnParticles(world, p.x + p.w / 2, b.y, 2, 'ring', '#F97316', 160, -25);
            spawnParticles(world, p.x + p.w / 2, b.y, 8, 'streak', '#FDBA74', 180, -30);
            addTrick(world, 'ROLL', 90, p.x + p.w / 2, p.y);
          } else {
            const impactRatio = Math.min(1, p.vy / 950);
            p.squashX = 1 + impactRatio * 0.28;
            p.squashY = 1 - impactRatio * 0.24;
            if (impactRatio > 0.55) {
              world.shakeTimer = 0.1;
              world.shakeMagnitude = impactRatio * 5;
              world.zoomPunch = 0.02 * impactRatio;
              spawnParticles(world, p.x + p.w / 2, b.y, 1, 'ring', '#E2E8F0', 120, -20);
            }
            soundEngine.playFootstep(1);
            spawnParticles(world, p.x + p.w / 2, b.y, 6, 'dust', '#CBD5E1', 140, -45);
          }
          p.highFallArmed = false;
        }
        p.vy = 0;
        p.grounded = true;
        p.coyoteTimer = COYOTE_TIME;
        p.doubleJumpAvailable = true;
        p.highFallArmed = false;

        if (plat.isHighPlace || plat.kind === 'upperBuilding' || b.y <= HIGH_PLACE_Y_THRESHOLD) {
          recordHighPlacePass(world, plat.id, p.x + p.w * 0.5, b.y);
        }

        if (isCollapsibleBlock(plat, world.tutorialActive)) {
          if (!plat.collapseTriggered) {
            plat.collapseTriggered = true;
            plat.collapseProgress = Math.max(plat.collapseProgress ?? 0, plat.kind === 'box' ? 0.07 : 0.05);
            plat.collapseStepPulses = (plat.collapseStepPulses ?? 0) + 1;
            soundEngine.playCrumbleStep(plat.collapseProgress);
            spawnParticles(world, p.x + p.w / 2, b.y + plat.h * 0.4, 6, 'dust', '#94A3B8', 130, 35);
          }
        }

        if (b.dx !== 0) p.x += b.dx * dt;
      } else if (!isOneWayTop && p.vy < 0 && rectsOverlap(p.x, p.y, p.w, p.h, b.x, b.y, plat.w, plat.h)) {
        p.y = b.y + plat.h;
        p.vy = 0;
      }
    }
  }

  if (wasGrounded && !p.grounded && p.vy >= 0) {
    p.coyoteTimer = COYOTE_TIME;
  }

  // Grind Rail & Overhead Bar Line Glider Snap
  if (!p.grounded) {
    const cx = p.x + p.w / 2;
    const footY = p.y + p.h;
    const handY = p.y + 4;
    const midY = p.y + p.h * 0.42;

    for (const rail of world.rails) {
      const minX = Math.min(rail.x1, rail.x2);
      const maxX = Math.max(rail.x1, rail.x2);
      const isGlider = rail.kind === 'glider';

      if (isGlider) {
        if (p.vy >= -380 && cx >= minX - 10 && cx <= maxX + 10) {
          const t = Math.max(0, Math.min(1, (cx - rail.x1) / (rail.x2 - rail.x1 || 1)));
          const railY = rail.y1 + t * (rail.y2 - rail.y1);
          if (Math.abs(handY - railY) <= 34 || Math.abs(midY - railY) <= 28) {
            p.grindingRailId = rail.id;
            p.h = PLAYER_H_STAND;
            p.y = railY + 8;
            p.vy = 0;
            p.doubleJumpAvailable = true;
            p.squashX = 0.85;
            p.squashY = 1.18;
            soundEngine.playGliderLatch();
            haptics.pulse(12);
            spawnParticles(world, cx, railY, 10, 'spark', '#38BDF8', 170, 50);
            spawnParticles(world, cx, railY, 1, 'ring', '#7DD3FC', 110, 0);
            addTrick(world, 'BAR GLIDE', 90, cx, railY);
            if (rail.isHighPlace || railY <= 360) {
              recordHighPlacePass(world, rail.id, cx, railY);
            }
            break;
          }
        }
      } else if (p.vy >= -60 && cx >= minX && cx <= maxX) {
        const t = (cx - rail.x1) / (rail.x2 - rail.x1 || 1);
        const railY = rail.y1 + t * (rail.y2 - rail.y1);
        if (Math.abs(footY - railY) <= 22) {
          p.grindingRailId = rail.id;
          p.y = railY - p.h;
          p.vy = 0;
          p.doubleJumpAvailable = true;
          soundEngine.playWallKick();
          addTrick(world, 'RAIL GRIND', 70, cx, railY);
          break;
        }
      }
    }
  }

  postStepChecks(world, dt);

  // Determine animation state
  if (p.mantleTimer > 0) p.action = 'mantle';
  else if (p.grindingRailId) {
    const activeRail = world.rails.find((r) => r.id === p.grindingRailId);
    p.action = activeRail?.kind === 'glider' ? 'hangGlide' : 'grind';
  }
  else if (p.rollTimer > 0) p.action = 'roll';
  else if (p.h === PLAYER_H_SLIDE) p.action = 'slide';
  else if (!p.grounded) {
    if (p.onWall) p.action = 'wallSlide';
    else p.action = p.vy < 0 ? (p.doubleJumpAvailable ? 'jump' : 'doubleJump') : 'fall';
  } else if (Math.abs(p.vx) > 20) {
    p.action = 'run';
    const stepPhase = Math.floor((p.animTime * (Math.abs(p.vx) / 36)) % 2);
    if (stepPhase !== p.lastFootstepPhase) {
      p.lastFootstepPhase = stepPhase;
      soundEngine.playFootstep(Math.abs(p.vx) / 550);
      if (Math.random() < 0.7) {
        spawnParticles(world, p.x + p.w / 2, p.y + p.h, 2, 'dust', '#CBD5E1', 45, -30);
      }
      if (standingPlatform && !standingPlatform.collapsed && isCollapsibleBlock(standingPlatform, world.tutorialActive)) {
        const stepBump = standingPlatform.kind === 'box' ? 0.045 : 0.025;
        standingPlatform.collapseTriggered = true;
        standingPlatform.collapseProgress = Math.min(1, (standingPlatform.collapseProgress ?? 0) + stepBump);
        standingPlatform.collapseStepPulses = (standingPlatform.collapseStepPulses ?? 0) + 1;
        soundEngine.playCrumbleStep(standingPlatform.collapseProgress);
        const sb = getPlatformBounds(standingPlatform, world.simTime);
        spawnParticles(world, p.x + p.w / 2, sb.y + standingPlatform.h * 0.65, 5, 'dust', '#CBD5E1', 120, 45);
        spawnParticles(world, p.x + p.w / 2, sb.y + standingPlatform.h * 0.65, 2, 'spark', '#F97316', 95, 25);
      }
    }
  } else {
    p.action = 'idle';
  }

  return checkCourseEnd(world);
}

function postStepChecks(world: WorldRuntime, dt: number) {
  const p = world.player;

  for (const sp of world.springs) {
    if (rectsOverlap(p.x, p.y, p.w, p.h, sp.x, sp.y, sp.w, sp.h)) {
      p.vy = -(sp.power ?? 980);
      p.grounded = false;
      p.grindingRailId = null;
      p.doubleJumpAvailable = true;
      p.squashX = 0.72;
      p.squashY = 1.35;
      world.shakeTimer = 0.14;
      world.shakeMagnitude = 6;
      world.zoomPunch = -0.035;
      triggerFlash(world, '#FB923C', 0.18);
      soundEngine.playSpring();
      spawnParticles(world, sp.x + sp.w / 2, sp.y, 14, 'spark', '#F97316', 190, -210);
      spawnParticles(world, sp.x + sp.w / 2, sp.y, 2, 'ring', '#FDBA74', 120, -40);
      addTrick(world, 'UPDRAFT', 80, sp.x + sp.w / 2, sp.y);
    }
  }

  for (const b of world.boosts) {
    if (rectsOverlap(p.x, p.y, p.w, p.h, b.x, b.y - 6, b.w, b.h + 8)) {
      if (p.vx < 650) {
        p.vx = 650;
        world.shakeTimer = 0.14;
        world.shakeMagnitude = 5.5;
        world.zoomPunch = -0.04;
        triggerFlash(world, '#FFFFFF', 0.22);
        soundEngine.playDash();
        spawnParticles(world, p.x + p.w / 2, p.y + p.h * 0.6, 12, 'streak', '#FFFFFF', 220, -20);
        spawnParticles(world, p.x + p.w / 2, p.y + p.h, 8, 'spark', '#F8FAFC', 180, -40);
        addTrick(world, 'BOOST', 60, b.x + b.w / 2, b.y);
      }
    }
  }

  // Mid-Air Jet Boosters (Forward, Angled Launch, and Updraft Air Boosters)
  const pxCenter = p.x + p.w / 2;
  const pyCenter = p.y + p.h / 2;
  for (const ab of world.airBoosters) {
    if (ab.triggered) continue;
    const dist = Math.hypot(pxCenter - ab.x, pyCenter - ab.y);
    if (dist <= ab.radius + 26) {
      ab.triggered = true;
      p.grounded = false;
      p.grindingRailId = null;
      p.doubleJumpAvailable = true;
      p.h = PLAYER_H_STAND;

      if (ab.dir === 'up') {
        p.vx = Math.max(p.vx + 70, ab.powerVx ?? 520);
        p.vy = Math.min(p.vy, ab.powerVy ?? -820);
      } else if (ab.dir === 'up-forward') {
        p.vx = Math.max(p.vx + 135, ab.powerVx ?? 665);
        p.vy = Math.min(p.vy, ab.powerVy ?? -680);
      } else {
        p.vx = Math.max(p.vx + 165, ab.powerVx ?? 715);
        p.vy = Math.min(p.vy, ab.powerVy ?? -320);
      }

      p.squashX = 0.72;
      p.squashY = 1.32;
      world.shakeTimer = 0.14;
      world.shakeMagnitude = 6;
      world.zoomPunch = -0.045;
      triggerFlash(world, '#38BDF8', 0.22);
      soundEngine.playAirBoost();
      haptics.pulse(18);
      spawnParticles(world, ab.x, ab.y, 14, 'spark', '#38BDF8', 240, -110);
      spawnParticles(world, ab.x, ab.y, 10, 'streak', '#FDBA74', 260, -25);
      spawnParticles(world, ab.x, ab.y, 2, 'ring', '#7DD3FC', 150, -40);
      addTrick(world, ab.dir === 'up' ? 'UPDRAFT BOOST' : 'AIR BOOST', 120, ab.x, ab.y);
    }
  }

  // Tall Architectural Glass Walls — smash straight through with flying shards!
  for (const gw of world.glassWalls) {
    if (gw.shattered) continue;
    if (rectsOverlap(p.x - 2, p.y, p.w + 4, p.h, gw.x, gw.y, gw.w, gw.h)) {
      gw.shattered = true;
      const impactX = gw.x + gw.w * 0.5;
      const impactY = Math.max(gw.y + 24, Math.min(gw.y + gw.h - 24, p.y + p.h * 0.5));

      const shards = [];
      const shardCount = 22;
      for (let i = 0; i < shardCount; i++) {
        const sy = gw.y + 8 + ((gw.h - 16) * i) / shardCount + (Math.random() * 12 - 6);
        const distBias = Math.max(0.35, 1 - Math.abs(sy - impactY) / (gw.h * 0.7));
        shards.push({
          x: impactX + (Math.random() * 10 - 5),
          y: sy,
          vx: p.vx * (0.45 + Math.random() * 0.68) * distBias + (Math.random() * 120 - 30),
          vy: (sy - impactY) * 1.45 + p.vy * 0.25 - 70 - Math.random() * 150,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 18,
          w: 7 + Math.random() * 11,
          h: 10 + Math.random() * 16,
          alpha: 0.95,
        });
      }
      gw.shards = shards;

      // Slight 0.5s speed dip on glass breakthrough
      world.glassSlowTimer = 0.5;
      p.vx = Math.max(220, p.vx * 0.9);
      world.shakeTimer = Math.max(world.shakeTimer, 0.14);
      world.shakeMagnitude = Math.max(world.shakeMagnitude, 6.5);
      world.zoomPunch = -0.032;
      triggerFlash(world, '#BAE6FD', 0.24);
      soundEngine.playGlassShatter();
      haptics.pulse([16, 12, 26]);
      spawnParticles(world, impactX, impactY, 14, 'spark', '#E0F2FE', 260, -90);
      spawnParticles(world, impactX, impactY, 8, 'streak', '#7DD3FC', 250, -25);
      spawnParticles(world, impactX, impactY, 1, 'ring', '#BAE6FD', 150, -30);

      const breakLabel = !p.grounded
        ? 'GLASS CRASH'
        : p.h === PLAYER_H_SLIDE || p.rollTimer > 0
        ? 'SLIDE SHATTER'
        : 'GLASS BREACH';
      addTrick(world, breakLabel, !p.grounded || p.h === PLAYER_H_SLIDE ? 130 : 110, impactX, impactY - 24);
    }
  }

  // Magnet pulls nearby shards smoothly toward the runner
  if (world.powerUpTimers.magnet > 0) {
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    for (const sh of world.shards) {
      if (sh.collected) continue;
      const dx = px - sh.x;
      const dy = py - sh.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1 && dist < 260) {
        const pull = (620 - dist * 0.8) * dt;
        sh.x += (dx / dist) * pull;
        sh.y += (dy / dist) * pull;
      }
    }
  }

  for (const sh of world.shards) {
    if (!sh.collected && rectsOverlap(p.x - 6, p.y - 6, p.w + 12, p.h + 12, sh.x - 14, sh.y - 14, 28, 28)) {
      sh.collected = true;
      world.shardsCollected += 1;
      soundEngine.playShard();
      haptics.pulse(10);
      spawnParticles(world, sh.x, sh.y, 12, 'spark', '#FBBF24', 210, -65);
      spawnParticles(world, sh.x, sh.y, 1, 'ring', '#FDE68A', 120, -20);
      addTrick(world, 'SHARD', 100, sh.x, sh.y);
    }
  }

  // Power-Up Pickups (Overdrive Surge, Aero Shield, Shard Magnet)
  for (const pu of world.powerUps) {
    if (!pu.collected && rectsOverlap(p.x - 6, p.y - 6, p.w + 12, p.h + 12, pu.x - 16, pu.y - 16, 32, 32)) {
      pu.collected = true;
      soundEngine.playPowerUp();
      haptics.pulse([16, 20, 24]);
      world.zoomPunch = -0.03;

      if (pu.kind === 'surge') {
        world.powerUpTimers.surge = 8.5;
        p.vx = Math.max(p.vx, 650);
        world.chaser.x = Math.max(p.x - 480, world.chaser.x - 70);
        triggerFlash(world, '#06B6D4', 0.25);
        spawnParticles(world, pu.x, pu.y, 16, 'spark', '#22D3EE', 240, -60);
        spawnParticles(world, pu.x, pu.y, 2, 'ring', '#67E8F9', 150, -20);
        addTrick(world, 'OVERDRIVE SURGE', 120, pu.x, pu.y);
      } else if (pu.kind === 'shield') {
        world.powerUpTimers.shield = 14;
        triggerFlash(world, '#10B981', 0.22);
        spawnParticles(world, pu.x, pu.y, 16, 'spark', '#34D399', 220, -60);
        spawnParticles(world, pu.x, pu.y, 2, 'ring', '#6EE7B7', 150, -20);
        addTrick(world, 'AERO SHIELD', 100, pu.x, pu.y);
      } else {
        world.powerUpTimers.magnet = 11;
        triggerFlash(world, '#F59E0B', 0.2);
        spawnParticles(world, pu.x, pu.y, 16, 'spark', '#FBBF24', 220, -60);
        spawnParticles(world, pu.x, pu.y, 2, 'ring', '#FDE68A', 150, -20);
        addTrick(world, 'SHARD MAGNET', 100, pu.x, pu.y);
      }
    }
  }

  // Parkour Enemies & Stylish Takedowns ("parkour like kills")
  for (const en of world.enemies) {
    if (en.defeated) {
      if ((en.defeatTimer ?? 0) > 0) {
        en.defeatTimer = Math.max(0, (en.defeatTimer ?? 0) - dt);
        en.x += (en.defeatVx ?? 220) * dt;
        en.y += (en.defeatVy ?? -180) * dt;
        en.defeatVy = (en.defeatVy ?? -180) + 1200 * dt;
      }
      continue;
    }

    const speedMul = en.kind === 'drone' ? 2.1 : 1.4;
    en.x = en.baseX + Math.sin(world.simTime * speedMul + en.phase) * en.patrolRange;
    const renderY = en.kind === 'drone' ? en.y + Math.sin(world.simTime * 3.5 + en.phase) * 7 : en.y;

    if (rectsOverlap(p.x + 2, p.y + 2, p.w - 4, p.h - 4, en.x + 2, renderY + 2, en.w - 4, en.h - 4)) {
      const hasBlitzPower = world.powerUpTimers.surge > 0;
      const hasShieldPower = world.powerUpTimers.shield > 0;
      const isSlidingKill = (p.h === PLAYER_H_SLIDE || p.rollTimer > 0) && en.kind === 'sentry';
      const isAirDropkick =
        !p.grounded && (p.vy > -40 || p.y + p.h * 0.8 < renderY + en.h * 0.78);

      if (hasBlitzPower || hasShieldPower || isSlidingKill || isAirDropkick) {
        en.defeated = true;
        en.defeatTimer = 0.85;
        en.defeatVx = p.vx * 0.7 + 220;
        en.defeatVy = isSlidingKill ? -320 : -140;
        world.takedownsCount += 1;
        soundEngine.playTakedown();
        haptics.pulse([18, 22, 34]);
        world.shakeTimer = 0.14;
        world.shakeMagnitude = 6.5;
        world.zoomPunch = -0.03;

        // Kinetic reward & pursuer pushback
        p.vx = Math.max(p.vx, world.course.baseSpeed + 115);
        world.chaser.x = Math.max(p.x - 480, world.chaser.x - 48);

        if (isAirDropkick && !hasBlitzPower) {
          p.vy = -520;
          p.doubleJumpAvailable = true;
          p.squashX = 0.78;
          p.squashY = 1.24;
        }

        const koLabel = hasBlitzPower
          ? 'OVERDRIVE KO'
          : isSlidingKill
          ? 'SLIDE SWEEP KO'
          : isAirDropkick
          ? 'DROPKICK KO'
          : 'SHIELD BASH KO';
        const koPoints = isAirDropkick ? 180 : isSlidingKill ? 160 : 200;
        triggerFlash(world, '#F97316', 0.22);
        spawnParticles(world, en.x + en.w * 0.5, renderY + en.h * 0.5, 16, 'spark', '#FB923C', 260, -110);
        spawnParticles(world, en.x + en.w * 0.5, renderY + en.h * 0.5, 2, 'ring', '#FEF08A', 160, -30);
        addTrick(world, koLabel, koPoints, en.x + en.w * 0.5, renderY);
      } else if (world.enemyHitCooldown <= 0) {
        // Gentle stumble hit
        world.enemyHitCooldown = 0.8;
        p.vx = Math.min(p.vx, 225);
        world.comboCount = 0;
        if (world.highPlaceStreak > 0) {
          world.highPlaceStreak = 0;
        }
        soundEngine.playFail();
        haptics.pulse([30, 20, 35]);
        world.shakeTimer = 0.14;
        world.shakeMagnitude = 5.5;
        triggerFlash(world, '#EF4444', 0.22);
        spawnParticles(world, p.x + p.w * 0.5, p.y + p.h * 0.5, 10, 'spark', '#EF4444', 180, -70);

        if (!world.tutorialActive) {
          world.chaser.surgeTimer = Math.max(world.chaser.surgeTimer, 0.7);
          world.chaser.x = Math.min(p.x - 36, world.chaser.x + 18);
          world.callouts.push({
            x: p.x,
            y: p.y - 20,
            vy: -36,
            text: 'CLOSING IN!',
            color: '#EF4444',
            life: 0.75,
            maxLife: 0.75,
          });
        }
      }
    }
  }

  // Rising Thermal Lava Updraft Vents
  for (const tv of world.thermalVents) {
    if (rectsOverlap(p.x, p.y, p.w, p.h, tv.x, tv.y, tv.w, tv.h)) {
      const targetVy = -(tv.powerVy ?? 860);
      if (p.vy > targetVy * 0.55) {
        p.vy = targetVy;
        p.vx = Math.max(p.vx, world.course.baseSpeed + 70);
        p.grounded = false;
        p.doubleJumpAvailable = true;
        p.squashX = 0.74;
        p.squashY = 1.3;
        soundEngine.playThermalLift();
        haptics.pulse(14);
        spawnParticles(world, p.x + p.w * 0.5, p.y + p.h, 12, 'spark', '#FB923C', 180, -180);
        spawnParticles(world, p.x + p.w * 0.5, p.y + p.h, 1, 'ring', '#FDE047', 120, -40);
        addTrick(world, 'THERMAL LIFT', 85, p.x + p.w * 0.5, p.y);
      }
    }
  }

  for (const cp of world.checkpoints) {
    if (cp.index > world.activeCheckpointIndex && Math.abs(p.x + p.w / 2 - cp.x) < 42 && Math.abs(p.y + p.h - cp.y) < 120) {
      world.activeCheckpointIndex = cp.index;
      world.respawnX = cp.x - p.w / 2;
      world.respawnY = cp.y - PLAYER_H_STAND - 4;
      triggerFlash(world, '#10B981', 0.18);
      soundEngine.playCheckpoint();
      spawnParticles(world, cp.x, cp.y - 40, 16, 'spark', '#10B981', 210, -100);
      spawnParticles(world, cp.x, cp.y - 40, 2, 'ring', '#34D399', 150, -30);
      world.callouts.push({
        x: cp.x,
        y: cp.y - 72,
        vy: -36,
        text: `CHECKPOINT ${cp.index}`,
        color: '#10B981',
        life: 1.0,
        maxLife: 1.0,
      });
    }
  }

  for (const hz of world.hazards) {
    if (rectsOverlap(p.x + 4, p.y + 4, p.w - 8, p.h - 6, hz.x + 2, hz.y + 2, hz.w - 4, hz.h - 2)) {
      handleFail(world, false);
      return;
    }
  }

  if (p.y + p.h >= LAVA_SURFACE_Y || p.y > world.course.fallLimitY) {
    handleFail(world, true);
    return;
  }

  updateVisualsAndCamera(world, dt);
}

function updateVisualsAndCamera(world: WorldRuntime, dt: number) {
  const p = world.player;

  const anchorX = p.x + p.w / 2 - 3;
  const anchorY = p.y + (p.h === PLAYER_H_SLIDE ? 8 : 13);
  p.scarf[0].x = anchorX;
  p.scarf[0].y = anchorY;

  const windX = -p.vx * 0.045 - 22;
  for (let i = 1; i < p.scarf.length; i++) {
    const prev = p.scarf[i - 1];
    const node = p.scarf[i];
    const wave = Math.sin(world.simTime * 14 + i * 0.9) * 18;
    node.x += windX * dt;
    node.y += (150 + wave - p.vy * 0.05) * dt;

    const dx = node.x - prev.x;
    const dy = node.y - prev.y;
    const dist = Math.hypot(dx, dy) || 1;
    const segLen = 5.5;
    if (dist > segLen) {
      node.x = prev.x + (dx / dist) * segLen;
      node.y = prev.y + (dy / dist) * segLen;
    }
  }

  // Dynamic velocity-reactive trails & screen FX
  const speedRatio = Math.max(0, Math.min(1, (p.vx - 450) / 220));
  const targetSpeedLines =
    p.action === 'grind' || p.action === 'hangGlide' || p.action === 'roll'
      ? Math.max(0.55, speedRatio)
      : speedRatio;
  world.speedLinesAlpha += (targetSpeedLines - world.speedLinesAlpha) * Math.min(1, dt * 8);
  world.flashAlpha = Math.max(0, world.flashAlpha - dt * 1.9);
  world.zoomPunch += (0 - world.zoomPunch) * Math.min(1, dt * 10);

  // Little player cloning trail animation during sprinting, jumps, slides, rolls, and gliders
  world.afterimageCooldown -= dt;
  const cloneActive =
    world.powerUpTimers.surge > 0 ||
    Math.abs(p.vx) > 260 ||
    !p.grounded ||
    p.h === PLAYER_H_SLIDE ||
    p.rollTimer > 0 ||
    p.action === 'hangGlide' ||
    p.action === 'grind';
  if (world.afterimageCooldown <= 0 && cloneActive) {
    world.afterimageCooldown = 0.072;
    pushAfterimage(p, world.powerUpTimers.surge > 0 ? 0.48 : 0.38);
  }

  // Ambient wind streaks during high speed
  if (speedRatio > 0.35 && Math.random() < speedRatio * 0.6) {
    spawnParticles(world, p.x + 420 + Math.random() * 240, p.y - 160 + Math.random() * 340, 1, 'streak', 'rgba(248, 250, 252, 0.7)', 60, 0);
  }

  for (let i = p.afterimages.length - 1; i >= 0; i--) {
    p.afterimages[i].alpha -= dt * 2.9;
    if (p.afterimages[i].alpha <= 0) p.afterimages.splice(i, 1);
  }

  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.kind === 'spark' || pt.kind === 'dust') pt.vy += 320 * dt;
    else if (pt.kind === 'confetti') {
      pt.vy += 460 * dt;
      pt.vx *= 0.985;
    }
    if (pt.life <= 0) world.particles.splice(i, 1);
  }

  for (const gw of world.glassWalls) {
    if (!gw.shattered || !gw.shards || gw.shards.length === 0) continue;
    for (let i = gw.shards.length - 1; i >= 0; i--) {
      const s = gw.shards[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 960 * dt;
      s.vx *= 0.992;
      s.rot += s.vRot * dt;
      s.alpha -= dt * 0.78;
      if (s.alpha <= 0) {
        gw.shards.splice(i, 1);
      }
    }
  }

  for (let i = world.callouts.length - 1; i >= 0; i--) {
    const c = world.callouts[i];
    c.life -= dt;
    c.y += c.vy * dt;
    if (c.life <= 0) world.callouts.splice(i, 1);
  }

  updateMysteryChaser(world, dt);

  // Camera framing with speed-reactive forward lookahead & smooth zoom transitions
  const lookAhead = 360 - Math.min(90, Math.max(0, (p.vx - 400) * 0.25));
  const targetCamX = Math.max(0, p.x - lookAhead);
  const targetCamY = p.y - 680 + p.vy * 0.045;
  world.cameraX += (targetCamX - world.cameraX) * Math.min(1, dt * 8.5);
  world.cameraY += (targetCamY - world.cameraY) * Math.min(1, dt * 6.0);
  world.cameraZoom += (world.targetCameraZoom - world.cameraZoom) * Math.min(1, dt * 8.5);
}

function updateMysteryChaser(world: WorldRuntime, dt: number) {
  if (world.finished) return;
  const ch = world.chaser;
  const p = world.player;

  if (ch.bumpCooldown > 0) ch.bumpCooldown = Math.max(0, ch.bumpCooldown - dt);
  if (ch.surgeTimer > 0) ch.surgeTimer = Math.max(0, ch.surgeTimer - dt);

  const endlessBonus = world.course.isEndless ? Math.min(95, world.elapsedTime * 1.05) : 0;
  const normalCruiseSpeed = world.course.baseSpeed + endlessBonus;

  if (world.tutorialActive) {
    // Hover safely in view behind the runner during the guided tutorial
    const desiredX = p.x - 280;
    ch.x += (desiredX - ch.x) * Math.min(1, dt * 5);
    ch.vx = p.vx;
  } else {
    const gap = p.x - ch.x;
    const isSlowed = p.vx < normalCruiseSpeed * 0.88;
    let desiredVx: number;

    if (ch.surgeTimer > 0) {
      desiredVx = normalCruiseSpeed + 115;
    } else if (isSlowed) {
      desiredVx = normalCruiseSpeed + 80;
    } else if (p.vx > normalCruiseSpeed + 25) {
      desiredVx = normalCruiseSpeed - 42;
    } else if (gap > 400) {
      desiredVx = normalCruiseSpeed + 28;
    } else {
      desiredVx = normalCruiseSpeed - 18;
    }

    ch.vx += (desiredVx - ch.vx) * Math.min(1, dt * 7);
    ch.x = Math.max(p.x - 480, ch.x + ch.vx * dt);
  }

  // Smooth aerial hover flight tracking player altitude without touching ground
  const hoverTargetY = p.y - 18 + Math.sin(world.simTime * 3.8) * 16;
  ch.vy = (hoverTargetY - ch.y) * 5.4;
  ch.y += ch.vy * dt;

  // Spectral flight afterimages
  if (Math.random() < (ch.surgeTimer > 0 ? 0.72 : 0.42)) {
    ch.afterimages.push({ x: ch.x, y: ch.y, alpha: ch.surgeTimer > 0 ? 0.65 : 0.45 });
    if (ch.afterimages.length > 8) ch.afterimages.shift();
  }
  for (let i = ch.afterimages.length - 1; i >= 0; i--) {
    ch.afterimages[i].alpha -= dt * 1.9;
    if (ch.afterimages[i].alpha <= 0) ch.afterimages.splice(i, 1);
  }

  // Catch check when active in endless mode
  if (!world.tutorialActive && p.x - ch.x <= 24) {
    world.caughtByChaser = true;
    world.finished = true;
    soundEngine.playFail();
    haptics.pulse([60, 40, 90]);
    world.shakeTimer = 0.35;
    world.shakeMagnitude = 14;
    world.zoomPunch = 0.055;
    triggerFlash(world, '#EF4444', 0.55);
    spawnParticles(world, p.x + p.w * 0.5, p.y + p.h * 0.5, 22, 'spark', '#EF4444', 260, -80);
    spawnParticles(world, p.x + p.w * 0.5, p.y + p.h * 0.5, 2, 'ring', '#F87171', 160, -40);
  }
}

function checkCourseEnd(world: WorldRuntime): { summary: RunSummary | null } {
  const p = world.player;
  const distM = Math.max(0, Math.round((p.x - world.course.startX) / 28));
  const levelNumber = world.runLevel;

  if (!world.tutorialActive && !world.course.isEndless && !world.finished && p.x + p.w * 0.5 >= world.course.finishX) {
    world.finished = true;
    world.levelCleared = true;
    soundEngine.playFinish();
    haptics.pulse([20, 25, 40]);
    triggerFlash(world, '#10B981', 0.35);
    spawnParticles(world, world.course.finishX, world.course.finishY - 60, 28, 'confetti', '#10B981', 300, -180);
    spawnParticles(world, world.course.finishX, world.course.finishY - 60, 20, 'confetti', '#F97316', 280, -210);
    spawnParticles(world, world.course.finishX, world.course.finishY - 60, 2, 'ring', '#34D399', 150, -20);
  }

  if (world.finished) {
    const medal: RunSummary['medal'] = world.course.isEndless
      ? distM >= 500
        ? 'Gold'
        : distM >= 250
        ? 'Silver'
        : distM >= 100
        ? 'Bronze'
        : 'None'
      : world.levelCleared
      ? world.shardsCollected >= Math.max(2, Math.floor(world.shards.length * 0.5))
        ? 'Gold'
        : world.takedownsCount >= 1
        ? 'Silver'
        : 'Bronze'
      : 'None';

    return {
      summary: {
        courseId: world.course.id,
        courseTitle: world.course.title,
        levelNumber,
        isEndless: Boolean(world.course.isEndless),
        cleared: world.levelCleared,
        onTime: Boolean(world.course.isEndless) || world.levelCleared,
        caughtByChaser: world.caughtByChaser,
        fellInLava: world.fellInLava,
        elapsedTime: world.elapsedTime,
        timeRemaining: 0,
        distanceMeters: distM,
        shardsCollected: world.shardsCollected,
        totalShards: world.shards.length,
        takedownsCount: world.takedownsCount,
        highPlacesPassed: world.highPlacesPassed,
        levelUpsEarned: world.levelUpsEarned,
        score: world.score + distM * 10 + (world.levelCleared ? 500 : 0),
        medal,
        isNewBest: false,
      },
    };
  }

  return { summary: null };
}

export function getHudSnapshot(world: WorldRuntime): HudSnapshot {
  const p = world.player;
  const distM = Math.max(0, Math.round((p.x - world.course.startX) / 28));
  const chaserDistM = Math.max(0, Math.round((p.x - world.chaser.x) / 28));
  const totalDistPx = Math.max(1, world.course.finishX - world.course.startX);
  const progressPct = world.course.isEndless
    ? 0
    : Math.max(0, Math.min(100, Math.round(((p.x - world.course.startX) / totalDistPx) * 100)));

  return {
    levelNumber: world.runLevel,
    runLevel: world.runLevel,
    isEndless: Boolean(world.course.isEndless) && !world.tutorialActive,
    elapsedTime: world.elapsedTime,
    timeRemaining: 0,
    distanceMeters: distM,
    progressPct,
    shardsCollected: world.shardsCollected,
    totalShards: world.shards.length,
    takedownsCount: world.takedownsCount,
    score: world.score + distM * 10,
    lastTrickLabel: world.lastTrickTimer > 0 ? world.lastTrickLabel : '',
    chaserDistanceMeters: chaserDistM,
    highPlaceStreak: world.highPlaceStreak,
    highPlacesPassed: world.highPlacesPassed,
    levelUpsEarned: world.levelUpsEarned,
    comboMultiplier: getComboMultiplier(world.comboCount),
    activePowerUps: { ...world.powerUpTimers },
    tutorial: {
      active: world.tutorialActive,
      step: world.tutorialStep,
      waitingAction: world.tutorialWaitingAction,
      bannerTimer: world.tutorialCompleteBannerTimer,
    },
  };
}

export function getRunSaveKey(): string {
  return 'active-run';
}

export function serializeWorldRun(world: WorldRuntime): SavedRunSnapshot {
  const hud = getHudSnapshot(world);
  const key = getRunSaveKey();
  const collectedShardIds = world.shards.filter((s) => s.collected).map((s) => s.id);

  const snapshot: SavedRunSnapshot = {
    key,
    courseId: world.course.id,
    levelNumber: world.runLevel,
    isEndless: Boolean(world.course.isEndless),
    elapsedTime: world.elapsedTime,
    simTime: world.simTime,
    score: world.score,
    shardsCollected: world.shardsCollected,
    collectedShardIds,
    activeCheckpointIndex: world.activeCheckpointIndex,
    respawnX: world.respawnX,
    respawnY: world.respawnY,
    cameraX: world.cameraX,
    cameraY: world.cameraY,
    progressPct: hud.progressPct,
    distanceMeters: hud.distanceMeters,
    timeRemaining: hud.timeRemaining,
    player: {
      x: world.player.x,
      y: world.player.y,
      h: world.player.h,
      vx: world.player.vx,
      vy: world.player.vy,
      grounded: world.player.grounded,
      onWall: world.player.onWall,
      doubleJumpAvailable: world.player.doubleJumpAvailable,
      highFallArmed: world.player.highFallArmed,
    },
    endlessState: {
      endlessChunkCount: world.endlessChunkCount,
      endlessTailX: world.endlessTailX,
      endlessTailY: world.endlessTailY,
      platforms: world.platforms.map((p) => ({ ...p })),
      rails: world.rails.map((r) => ({ ...r })),
      springs: world.springs.map((s) => ({ ...s })),
      boosts: world.boosts.map((b) => ({ ...b })),
      airBoosters: world.airBoosters.map((ab) => ({ ...ab })),
      glassWalls: world.glassWalls.map((gw) => ({ id: gw.id, x: gw.x, y: gw.y, w: gw.w, h: gw.h, shattered: gw.shattered })),
      thermalVents: world.thermalVents.map((tv) => ({ ...tv })),
      hazards: world.hazards.map((h) => ({ ...h })),
      shards: world.shards.map((s) => ({ ...s })),
      powerUps: world.powerUps.map((pu) => ({ ...pu })),
      enemies: world.enemies.map((en) => ({ ...en })),
    },
    powerUpTimers: { ...world.powerUpTimers },
    takedownsCount: world.takedownsCount,
    highPlaceStreak: world.highPlaceStreak,
    highPlacesPassed: world.highPlacesPassed,
    levelUpsEarned: world.levelUpsEarned,
    runLevel: world.runLevel,
    comboCount: world.comboCount,
    visitedHighPlaceIds: Array.from(world.visitedHighPlaceIds),
    biomeIndex: world.biomeIndex,
    prevBiomeIndex: world.prevBiomeIndex,
    chaser: {
      x: world.chaser.x,
      y: world.chaser.y,
      vx: world.chaser.vx,
      variant: world.chaser.variant,
      surgeTimer: world.chaser.surgeTimer,
    },
    savedAt: Date.now(),
  };

  return snapshot;
}

export function restoreWorldFromSave(save: SavedRunSnapshot): WorldRuntime {
  const course =
    save.isEndless || save.courseId === 'endless-skyline'
      ? ENDLESS_COURSE
      : buildLevelCourse(save.levelNumber ?? 1);
  const world = createWorldRuntime(course);

  if (save.endlessState) {
    world.endlessChunkCount = save.endlessState.endlessChunkCount;
    world.endlessTailX = save.endlessState.endlessTailX;
    world.endlessTailY = save.endlessState.endlessTailY;
    world.platforms = save.endlessState.platforms.map((p) => ({ ...p }));
    world.rails = save.endlessState.rails.map((r) => ({ ...r }));
    world.springs = save.endlessState.springs.map((s) => ({ ...s }));
    world.boosts = save.endlessState.boosts.map((b) => ({ ...b }));
    world.airBoosters = (save.endlessState.airBoosters ?? []).map((ab) => ({ ...ab }));
    world.glassWalls = (save.endlessState.glassWalls ?? []).map((gw) => ({ ...gw, shards: [] }));
    world.thermalVents = (save.endlessState.thermalVents ?? []).map((tv) => ({ ...tv }));
    world.hazards = save.endlessState.hazards.map((h) => ({ ...h }));
    world.shards = save.endlessState.shards.map((s) => ({ ...s }));
    world.powerUps = (save.endlessState.powerUps ?? []).map((pu) => ({ ...pu }));
    world.enemies = (save.endlessState.enemies ?? []).map((en) => ({ ...en }));
  }

  const collectedSet = new Set(save.collectedShardIds);
  for (const sh of world.shards) {
    if (collectedSet.has(sh.id)) {
      sh.collected = true;
    }
  }

  world.elapsedTime = save.elapsedTime;
  world.simTime = save.simTime;
  world.score = save.score;
  world.shardsCollected = save.shardsCollected;
  world.takedownsCount = save.takedownsCount ?? 0;
  world.highPlaceStreak = save.highPlaceStreak ?? 0;
  world.highPlacesPassed = save.highPlacesPassed ?? 0;
  world.levelUpsEarned = save.levelUpsEarned ?? 0;
  world.runLevel = save.runLevel ?? (save.isEndless ? 1 : save.levelNumber ?? 1);
  world.comboCount = save.comboCount ?? 0;
  world.visitedHighPlaceIds = new Set(save.visitedHighPlaceIds ?? []);
  if (typeof save.biomeIndex === 'number' && save.biomeIndex >= 0 && save.biomeIndex < WORLD_BIOMES.length) {
    world.biomeIndex = save.biomeIndex;
    world.prevBiomeIndex =
      typeof save.prevBiomeIndex === 'number' && save.prevBiomeIndex >= 0 && save.prevBiomeIndex < WORLD_BIOMES.length
        ? save.prevBiomeIndex
        : save.biomeIndex;
    world.biomeBlendElapsed = 2;
  }
  if (save.powerUpTimers) {
    world.powerUpTimers = { ...save.powerUpTimers };
  }
  world.activeCheckpointIndex = save.activeCheckpointIndex;
  world.respawnX = save.respawnX;
  world.respawnY = save.respawnY;
  world.cameraX = save.cameraX;
  world.cameraY = save.cameraY;

  world.player.x = save.player.x;
  world.player.y = save.player.y;
  world.player.h = save.player.h;
  world.player.vx = save.player.vx;
  world.player.vy = save.player.vy;
  world.player.grounded = save.player.grounded;
  world.player.onWall = save.player.onWall;
  world.player.doubleJumpAvailable = save.player.doubleJumpAvailable;
  world.player.highFallArmed = save.player.highFallArmed;
  world.player.scarf = createScarf(save.player.x + world.player.w / 2, save.player.y);

  if (save.chaser) {
    world.chaser.x = save.chaser.x;
    world.chaser.y = save.chaser.y;
    world.chaser.vx = save.chaser.vx;
    world.chaser.variant = save.chaser.variant;
    world.chaser.surgeTimer = save.chaser.surgeTimer;
  } else {
    world.chaser.x = save.player.x - 310;
    world.chaser.y = save.player.y - 22;
  }

  return world;
}
