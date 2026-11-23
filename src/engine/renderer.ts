import { RunnerAction } from '../types/game';
import { WORLD_BIOMES, WorldBiomeStyle } from '../levels/biomes';
import { HIGH_PLACE_Y_THRESHOLD, LAVA_SURFACE_Y } from '../levels/courses';
import { getPlatformBounds, WorldRuntime } from './physics';

const FAR_BUILDINGS = Array.from({ length: 24 }, (_, i) => ({
  x: i * 160,
  w: 90 + ((i * 53) % 75),
  h: 180 + ((i * 97) % 240),
  hasSpire: i % 3 === 0,
}));

const MID_BUILDINGS = Array.from({ length: 22 }, (_, i) => ({
  x: i * 210,
  w: 120 + ((i * 71) % 90),
  h: 220 + ((i * 113) % 260),
}));

const FORE_BEAMS = Array.from({ length: 10 }, (_, i) => ({
  x: i * 520,
  w: 18 + ((i * 13) % 14),
  h: 70 + ((i * 29) % 55),
}));

const STARS = Array.from({ length: 48 }, (_, i) => ({
  u: ((i * 197 + 41) % 1000) / 1000,
  v: ((i * 313 + 79) % 560) / 1000,
  r: 0.9 + (i % 3) * 0.55,
  phase: i * 1.37,
}));

const CLOUDS = Array.from({ length: 9 }, (_, i) => ({
  x: i * 320,
  yFrac: 0.08 + ((i * 73) % 24) * 0.01,
  w: 130 + ((i * 47) % 110),
  h: 28 + ((i * 19) % 18),
  speed: 8 + (i % 4) * 4,
}));

const BIRDS = Array.from({ length: 6 }, (_, i) => ({
  x: i * 280,
  yFrac: 0.14 + (i % 4) * 0.045,
  speed: 22 + (i % 3) * 9,
  phase: i * 1.9,
}));

const RAIN_DROPS = Array.from({ length: 95 }, (_, i) => ({
  u: ((i * 139 + 17) % 1000) / 1000,
  v: ((i * 271 + 53) % 1000) / 1000,
  len: 16 + (i % 4) * 7,
  speed: 680 + (i % 5) * 95,
}));

const MOTES = Array.from({ length: 42 }, (_, i) => ({
  u: ((i * 223 + 31) % 1000) / 1000,
  v: ((i * 181 + 67) % 1000) / 1000,
  size: 1.4 + (i % 3) * 0.9,
  speedX: 28 + (i % 5) * 14,
  phase: i * 0.95,
}));

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rTopLeft: number,
  rTopRight = rTopLeft,
  rBottomRight = rTopLeft,
  rBottomLeft = rTopLeft
) {
  const maxR = Math.min(w, h) * 0.5;
  const tl = Math.min(rTopLeft, maxR);
  const tr = Math.min(rTopRight, maxR);
  const br = Math.min(rBottomRight, maxR);
  const bl = Math.min(rBottomLeft, maxR);

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr > 0) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  if (br > 0) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl > 0) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  if (tl > 0) ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function drawArticulatedRunner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  facing: 1 | -1,
  action: RunnerAction,
  animTime: number,
  squashX: number,
  squashY: number,
  isAfterimage: boolean,
  alpha = 1,
  afterimageTint?: { body: string; outline: string; accent: string }
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = x + w / 2;
  const bottomY = y + h;
  ctx.translate(cx, bottomY);
  ctx.scale(facing * squashX, squashY);

  const bodyColor = isAfterimage ? (afterimageTint?.body ?? '#EA580C') : '#0F172A';
  const outlineColor = isAfterimage ? (afterimageTint?.outline ?? '#FEF08A') : '#F8FAFC';
  const accentColor = isAfterimage ? (afterimageTint?.accent ?? '#FDBA74') : '#F97316';

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let hipY = -24;
  let torsoLean = 0.22;
  const headR = 6.4;

  let leg1Knee = { x: 4, y: -12 };
  let leg1Foot = { x: 2, y: 0 };
  let leg2Knee = { x: -4, y: -12 };
  let leg2Foot = { x: -5, y: 0 };
  let arm1Elbow = { x: 6, y: -28 };
  let arm1Hand = { x: 11, y: -20 };
  let arm2Elbow = { x: -6, y: -28 };
  let arm2Hand = { x: -10, y: -21 };

  if (action === 'run') {
    const phase = animTime * 15;
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    hipY = -23 + Math.abs(c) * 2.5;
    torsoLean = 0.35;
    leg1Knee = { x: s * 11 + 3, y: -12 + c * 3 };
    leg1Foot = { x: s * 16 - 2, y: -2 - Math.max(0, c) * 7 };
    leg2Knee = { x: -s * 11 + 3, y: -12 - c * 3 };
    leg2Foot = { x: -s * 16 - 2, y: -2 - Math.max(0, -c) * 7 };
    arm1Elbow = { x: -s * 10 + 4, y: -29 };
    arm1Hand = { x: -s * 14 + 10, y: -22 - c * 4 };
    arm2Elbow = { x: s * 10 + 4, y: -29 };
    arm2Hand = { x: s * 14 + 10, y: -22 + c * 4 };
  } else if (action === 'jump' || action === 'doubleJump') {
    hipY = -25;
    torsoLean = action === 'doubleJump' ? 0.45 : 0.22;
    leg1Knee = { x: 10, y: -15 };
    leg1Foot = { x: 6, y: -4 };
    leg2Knee = { x: -6, y: -11 };
    leg2Foot = { x: -12, y: -2 };
    arm1Elbow = { x: 9, y: -38 };
    arm1Hand = { x: 14, y: -46 };
    arm2Elbow = { x: -8, y: -32 };
    arm2Hand = { x: -14, y: -26 };
  } else if (action === 'fall') {
    hipY = -24;
    torsoLean = 0.1;
    leg1Knee = { x: 7, y: -12 };
    leg1Foot = { x: 4, y: -1 };
    leg2Knee = { x: -5, y: -14 };
    leg2Foot = { x: -9, y: -4 };
    arm1Elbow = { x: 10, y: -36 };
    arm1Hand = { x: 16, y: -42 };
    arm2Elbow = { x: -10, y: -35 };
    arm2Hand = { x: -15, y: -40 };
  } else if (action === 'wallSlide') {
    hipY = -24;
    torsoLean = -0.15;
    leg1Knee = { x: 7, y: -13 };
    leg1Foot = { x: 9, y: -2 };
    leg2Knee = { x: 3, y: -9 };
    leg2Foot = { x: 7, y: 0 };
    arm1Elbow = { x: 7, y: -36 };
    arm1Hand = { x: 11, y: -45 };
    arm2Elbow = { x: -6, y: -30 };
    arm2Hand = { x: -10, y: -23 };
  } else if (action === 'slide') {
    hipY = -9;
    torsoLean = -0.95;
    leg1Knee = { x: 12, y: -7 };
    leg1Foot = { x: 24, y: -2 };
    leg2Knee = { x: 4, y: -5 };
    leg2Foot = { x: 15, y: -1 };
    arm1Elbow = { x: -12, y: -14 };
    arm1Hand = { x: -18, y: -8 };
    arm2Elbow = { x: 4, y: -15 };
    arm2Hand = { x: 11, y: -12 };
  } else if (action === 'roll') {
    ctx.translate(0, -13);
    ctx.rotate(animTime * 24);
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 1.25);
    ctx.stroke();
    ctx.restore();
    return;
  } else if (action === 'grind') {
    hipY = -22;
    torsoLean = 0.14;
    leg1Knee = { x: 8, y: -11 };
    leg1Foot = { x: 10, y: 0 };
    leg2Knee = { x: -6, y: -11 };
    leg2Foot = { x: -9, y: 0 };
    arm1Elbow = { x: 10, y: -31 };
    arm1Hand = { x: 18, y: -29 };
    arm2Elbow = { x: -10, y: -31 };
    arm2Hand = { x: -18, y: -28 };
  } else if (action === 'hangGlide') {
    const sway = Math.sin(animTime * 9) * 2.2;
    hipY = -30;
    torsoLean = -0.36;
    leg1Knee = { x: -11, y: -16 + sway * 0.4 };
    leg1Foot = { x: -20, y: -7 + sway };
    leg2Knee = { x: -7, y: -18 + sway * 0.3 };
    leg2Foot = { x: -16, y: -10 + sway * 0.8 };
    arm1Elbow = { x: -2, y: -49 };
    arm1Hand = { x: 4, y: -58 };
    arm2Elbow = { x: -9, y: -48 };
    arm2Hand = { x: -4, y: -58 };
  } else if (action === 'mantle') {
    hipY = -20;
    torsoLean = 0.52;
    leg1Knee = { x: 8, y: -10 };
    leg1Foot = { x: 4, y: -1 };
    leg2Knee = { x: -7, y: -9 };
    leg2Foot = { x: -12, y: -3 };
    arm1Elbow = { x: 10, y: -25 };
    arm1Hand = { x: 12, y: -16 };
    arm2Elbow = { x: 6, y: -26 };
    arm2Hand = { x: 8, y: -17 };
  }

  const shoulderX = Math.sin(torsoLean) * 17;
  const shoulderY = hipY - Math.cos(torsoLean) * 17;
  const headX = shoulderX + Math.sin(torsoLean * 0.7) * 8;
  const headY = shoulderY - Math.cos(torsoLean * 0.7) * 8;

  ctx.strokeStyle = isAfterimage ? '#EA580C' : '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(arm2Elbow.x, arm2Elbow.y);
  ctx.lineTo(arm2Hand.x, arm2Hand.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(leg2Knee.x, leg2Knee.y);
  ctx.lineTo(leg2Foot.x, leg2Foot.y);
  ctx.stroke();

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.stroke();

  if (!isAfterimage) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(shoulderX * 0.35, hipY + (shoulderY - hipY) * 0.35);
    ctx.lineTo(shoulderX * 0.9, shoulderY + 1);
    ctx.stroke();
  }

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(leg1Knee.x, leg1Knee.y);
  ctx.lineTo(leg1Foot.x, leg1Foot.y);
  ctx.stroke();

  if (!isAfterimage) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(leg1Foot.x - 2, leg1Foot.y - 2.5, 6, 3);
  }

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = isAfterimage ? 1.8 : 1.5;
  ctx.stroke();

  if (!isAfterimage) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(headX + 1, headY - 2, 5.4, 2.8);
  }

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(arm1Elbow.x, arm1Elbow.y);
  ctx.lineTo(arm1Hand.x, arm1Hand.y);
  ctx.stroke();

  ctx.restore();
}

const CHASER_THEMES = [
  { hood: '#0F172A', cloak: '#7F1D1D', aura: '#EF4444', visor: '#FCA5A5' }, // 0: Crimson Stalker
  { hood: '#0F172A', cloak: '#4C1D95', aura: '#A855F7', visor: '#E9D5FF' }, // 1: Violet Phantom
  { hood: '#0F172A', cloak: '#164E63', aura: '#06B6D4', visor: '#A5F3FC' }, // 2: Cyan Wraith
  { hood: '#0F172A', cloak: '#78350F', aura: '#F59E0B', visor: '#FDE68A' }, // 3: Amber Specter
] as const;

function drawFlyingMysteryChaser(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  simTime: number,
  variant: 0 | 1 | 2 | 3,
  surging: boolean,
  isAfterimage: boolean,
  alpha = 1
) {
  const palette = CHASER_THEMES[variant] ?? CHASER_THEMES[0];
  const auraColor = surging ? '#EF4444' : palette.aura;
  const cloakColor = isAfterimage ? auraColor : palette.cloak;
  const bodyColor = isAfterimage ? auraColor : palette.hood;

  ctx.save();
  ctx.globalAlpha = alpha;
  // Mid-air hovering center
  ctx.translate(x + 14, y + 24);

  if (!isAfterimage) {
    // Spectral levitation glow under the flying figure (no feet on ground)
    const auraRadius = surging ? 40 : 32;
    const auraGrad = ctx.createRadialGradient(0, 2, 4, 0, 2, auraRadius);
    auraGrad.addColorStop(0, surging ? 'rgba(239, 68, 68, 0.55)' : `${auraColor}66`);
    auraGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 2, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing levitation rings beneath tucked feet
    const ringCycle = (simTime * (surging ? 3.4 : 2.1)) % 1;
    ctx.strokeStyle = auraColor;
    ctx.globalAlpha = alpha * (1 - ringCycle) * 0.65;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-6, 17 + ringCycle * 10, 12 + ringCycle * 8, 3.5, -0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  // Forward aerodynamic flight tilt (levitating posture)
  ctx.rotate(surging ? 0.44 : 0.34);

  // Billowing tattered cape / cloak ribbon streaming behind in mid-air
  const wave1 = Math.sin(simTime * 13) * 5;
  const wave2 = Math.cos(simTime * 16 + 1.1) * 6;
  ctx.fillStyle = cloakColor;
  ctx.beginPath();
  ctx.moveTo(4, -14);
  ctx.quadraticCurveTo(-18, -14 + wave1 * 0.4, -38, -8 + wave1);
  ctx.lineTo(-30, 1 + wave2 * 0.6);
  ctx.lineTo(-42, 9 + wave2);
  ctx.quadraticCurveTo(-18, 12, -2, 6);
  ctx.closePath();
  ctx.fill();

  if (!isAfterimage) {
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // Sleek swept-back flying legs held together (never running)
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(-15, 13);
  ctx.lineTo(-24, 15);
  ctx.stroke();

  // Torso shroud
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(-1, 5);
  ctx.lineTo(5, -12);
  ctx.stroke();

  // Outstretched reaching arm when surging, otherwise swept back in flight
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(4, -10);
  if (surging) {
    ctx.lineTo(15, -13);
    ctx.lineTo(22, -10);
  } else {
    ctx.lineTo(-8, -3);
    ctx.lineTo(-16, 2);
  }
  ctx.stroke();

  // Pointed Mystery Hood
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(13, -15);
  ctx.quadraticCurveTo(9, -27, -2, -25);
  ctx.lineTo(-10, -21);
  ctx.lineTo(1, -13);
  ctx.closePath();
  ctx.fill();

  if (!isAfterimage) {
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Glowing mystery eyes / visor slit inside hood
    ctx.fillStyle = surging ? '#FEF08A' : palette.visor;
    ctx.beginPath();
    ctx.ellipse(8.5, -18.5, 3.2, 1.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

interface DynamicBiome {
  style: WorldBiomeStyle;
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
  weights: Record<WorldBiomeStyle, number>;
}

function lerpHexColor(a: string, b: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const bl = Math.round(b1 + (b2 - b1) * clamped);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeEmptyWeights(): Record<WorldBiomeStyle, number> {
  return {
    lava: 0,
    neon: 0,
    natural: 0,
    storm: 0,
    toxic: 0,
    aurora: 0,
    desert: 0,
    eclipse: 0,
    sakura: 0,
  };
}

function resolveDynamicBiome(world: WorldRuntime): DynamicBiome {
  if (world.tutorialActive) {
    const base = WORLD_BIOMES[0];
    const weights = makeEmptyWeights();
    weights[base.id] = 1;
    return {
      style: base.id,
      skyTop: base.skyTop,
      skyBottom: base.skyBottom,
      sunColor: base.sunColor,
      farCity: base.farCity,
      midCity: base.midCity,
      buildingFill: base.buildingFill,
      buildingStroke: base.buildingStroke,
      ledgeHighlight: base.ledgeHighlight,
      horizonGlow: base.horizonGlow,
      isNight: base.isNight,
      weather: base.weather,
      weights,
    };
  }

  const currIdx = Math.max(0, Math.min(WORLD_BIOMES.length - 1, world.biomeIndex));
  const prevIdx = Math.max(0, Math.min(WORLD_BIOMES.length - 1, world.prevBiomeIndex));
  const blendWindow = 1.6;
  const blendT = currIdx !== prevIdx ? Math.min(1, Math.max(0, world.biomeBlendElapsed / blendWindow)) : 1;
  const smoothT = blendT * blendT * (3 - 2 * blendT);

  const from = WORLD_BIOMES[prevIdx];
  const to = WORLD_BIOMES[currIdx];

  const weights = makeEmptyWeights();
  weights[from.id] += 1 - smoothT;
  weights[to.id] += smoothT;

  return {
    style: to.id,
    skyTop: lerpHexColor(from.skyTop, to.skyTop, smoothT),
    skyBottom: lerpHexColor(from.skyBottom, to.skyBottom, smoothT),
    sunColor: lerpHexColor(from.sunColor, to.sunColor, smoothT),
    farCity: lerpHexColor(from.farCity, to.farCity, smoothT),
    midCity: lerpHexColor(from.midCity, to.midCity, smoothT),
    buildingFill: lerpHexColor(from.buildingFill, to.buildingFill, smoothT),
    buildingStroke: lerpHexColor(from.buildingStroke, to.buildingStroke, smoothT),
    ledgeHighlight: lerpHexColor(from.ledgeHighlight, to.ledgeHighlight, smoothT),
    horizonGlow: lerpHexColor(from.horizonGlow, to.horizonGlow, smoothT),
    isNight: smoothT >= 0.5 ? to.isNight : from.isNight,
    weather: smoothT >= 0.5 ? to.weather : from.weather,
    weights,
  };
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  world: WorldRuntime,
  viewW: number,
  viewH: number
) {
  const theme = resolveDynamicBiome(world);
  const weather = theme.weather;

  // 1. Full-bleed Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
  skyGrad.addColorStop(0, theme.skyTop);
  skyGrad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewW, viewH);

  // Biome Horizon Underglow + Boiling Lava Atmospheric Heat Glow
  const glowAlpha =
    theme.weights.lava * 0.34 +
    theme.weights.neon * 0.25 +
    theme.weights.toxic * 0.26 +
    theme.weights.eclipse * 0.32 +
    theme.weights.sakura * 0.24 +
    theme.weights.aurora * 0.22 +
    theme.weights.desert * 0.24;
  if (glowAlpha > 0.02) {
    const hGlow = ctx.createLinearGradient(0, viewH * 0.54, 0, viewH);
    hGlow.addColorStop(0, hexToRgba(theme.horizonGlow, 0));
    hGlow.addColorStop(1, hexToRgba(theme.horizonGlow, Math.min(0.42, glowAlpha)));
    ctx.fillStyle = hGlow;
    ctx.fillRect(0, viewH * 0.54, viewW, viewH * 0.46);
  }
  const lavaAmbient = ctx.createLinearGradient(0, viewH * 0.68, 0, viewH);
  lavaAmbient.addColorStop(0, 'rgba(249, 115, 22, 0)');
  lavaAmbient.addColorStop(0.65, 'rgba(234, 88, 12, 0.14)');
  lavaAmbient.addColorStop(1, 'rgba(239, 68, 68, 0.32)');
  ctx.fillStyle = lavaAmbient;
  ctx.fillRect(0, viewH * 0.68, viewW, viewH * 0.32);

  // Arctic Aurora Borealis Sky Ribbons
  if (theme.weights.aurora > 0.03) {
    ctx.save();
    for (let r = 0; r < 2; r++) {
      const baseY = viewH * (0.14 + r * 0.09);
      const auroraGrad = ctx.createLinearGradient(0, baseY - 50, 0, baseY + 60);
      auroraGrad.addColorStop(0, 'rgba(45, 212, 191, 0)');
      auroraGrad.addColorStop(
        0.5,
        r === 0
          ? `rgba(45, 212, 191, ${0.32 * theme.weights.aurora})`
          : `rgba(168, 85, 247, ${0.22 * theme.weights.aurora})`
      );
      auroraGrad.addColorStop(1, 'rgba(103, 232, 249, 0)');
      ctx.fillStyle = auroraGrad;
      ctx.beginPath();
      ctx.moveTo(0, baseY + 60);
      for (let ax = 0; ax <= viewW + 40; ax += 40) {
        const wave = Math.sin(ax * 0.008 + world.simTime * (0.9 + r * 0.3) + r * 2) * 24;
        ctx.lineTo(ax, baseY + wave);
      }
      ctx.lineTo(viewW + 40, baseY + 65);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Storm lightning pulse
  const stormFlash =
    weather === 'storm'
      ? Math.pow(Math.max(0, Math.sin(world.simTime * 0.85) * Math.sin(world.simTime * 2.9 + 1.2)), 14)
      : 0;
  if (stormFlash > 0.04) {
    ctx.fillStyle = `rgba(226, 232, 240, ${stormFlash * 0.28})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  // Night Starfield
  if (theme.isNight) {
    for (const st of STARS) {
      const sx = ((st.u * viewW - world.cameraX * 0.008) % viewW + viewW) % viewW;
      const sy = st.v * viewH;
      const twinkle = 0.3 + 0.65 * Math.abs(Math.sin(world.simTime * 1.8 + st.phase));
      ctx.fillStyle = `rgba(248, 250, 252, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Celestial Disc (Sun / Moon / Solar Eclipse) & Volumetric God-Rays
  const sunX = viewW * 0.78 - world.cameraX * 0.015;
  const sunY = viewH * 0.22;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 240);
  sunGlow.addColorStop(0, theme.sunColor);
  sunGlow.addColorStop(0.32, hexToRgba(theme.sunColor, theme.isNight ? 0.26 : 0.42));
  sunGlow.addColorStop(1, hexToRgba(theme.sunColor, 0));
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 240, 0, Math.PI * 2);
  ctx.fill();

  // Subtle volumetric light shafts fanning across upper skyline
  ctx.save();
  ctx.globalAlpha = theme.isNight ? 0.045 : 0.075;
  ctx.fillStyle = theme.sunColor;
  for (let i = 0; i < 4; i++) {
    const angle = -0.58 + i * 0.19 + Math.sin(world.simTime * 0.25 + i) * 0.025;
    const beamX = sunX + Math.cos(angle) * viewH * 1.4;
    const beamY = sunY + Math.sin(angle) * viewH * 1.4;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(beamX - 110, beamY);
    ctx.lineTo(beamX + 110, beamY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = theme.isNight ? theme.sunColor : '#FFF7ED';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();

  // Blood Eclipse dark moon core inside fiery solar corona
  if (theme.weights.eclipse > 0.3) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, theme.weights.eclipse * 1.25);
    ctx.fillStyle = '#090205';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

  // Drifting Layered Sky Clouds
  const cloudLoopW = CLOUDS.length * 320;
  ctx.save();
  ctx.fillStyle =
    weather === 'storm' || weather === 'rain'
      ? `rgba(148, 163, 184, ${0.14 + stormFlash * 0.2})`
      : weather === 'wind'
      ? 'rgba(254, 215, 170, 0.28)'
      : 'rgba(255, 255, 255, 0.36)';
  for (let rep = -1; rep <= 1; rep++) {
    for (const cl of CLOUDS) {
      const cx =
        ((((cl.x - world.cameraX * 0.05 - world.simTime * cl.speed) % cloudLoopW) + cloudLoopW) % cloudLoopW) +
        rep * cloudLoopW -
        200;
      if (cx + cl.w < -40 || cx > viewW + 40) continue;
      const cy = viewH * cl.yFrac;
      ctx.beginPath();
      ctx.ellipse(cx + cl.w * 0.5, cy, cl.w * 0.5, cl.h * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cl.w * 0.28, cy + 4, cl.w * 0.32, cl.h * 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cl.w * 0.72, cy + 4, cl.w * 0.3, cl.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Distant Gliding Birds (Day / Dusk) or Sweeping Searchlights (Night)
  if (!theme.isNight) {
    ctx.save();
    ctx.strokeStyle = weather === 'wind' ? 'rgba(30, 41, 59, 0.55)' : 'rgba(51, 65, 85, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    const birdLoopW = viewW + 300;
    for (const bd of BIRDS) {
      const bx = (((bd.x - world.cameraX * 0.07 + world.simTime * bd.speed) % birdLoopW) + birdLoopW) % birdLoopW - 100;
      const by = viewH * bd.yFrac + Math.sin(world.simTime * 1.8 + bd.phase) * 8;
      const flap = Math.sin(world.simTime * 7.5 + bd.phase) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 7, by - flap);
      ctx.quadraticCurveTo(bx - 3, by - 3, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - flap);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.save();
    for (let s = 0; s < 2; s++) {
      const baseX = viewW * (0.24 + s * 0.48);
      const baseY = viewH * 0.86;
      const sweep = -Math.PI * 0.5 + Math.sin(world.simTime * (0.55 + s * 0.2) + s * 2.1) * 0.42;
      const len = viewH * 0.95;
      const tx = baseX + Math.cos(sweep) * len;
      const ty = baseY + Math.sin(sweep) * len;
      const beamGrad = ctx.createLinearGradient(baseX, baseY, tx, ty);
      beamGrad.addColorStop(0, 'rgba(251, 191, 36, 0.14)');
      beamGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(baseX - 8, baseY);
      ctx.lineTo(tx - 65, ty);
      ctx.lineTo(tx + 65, ty);
      ctx.lineTo(baseX + 8, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Parallax Far Skyline + Aviation Beacons
  const farLoopW = FAR_BUILDINGS.length * 160;
  const farOffset = -(world.cameraX * 0.12) % farLoopW;
  for (let rep = -1; rep <= 2; rep++) {
    for (let i = 0; i < FAR_BUILDINGS.length; i++) {
      const b = FAR_BUILDINGS[i];
      const bx = farOffset + rep * farLoopW + b.x;
      if (bx + b.w < -40 || bx > viewW + 40) continue;
      const by = viewH - b.h + 20 - world.cameraY * 0.04;
      ctx.fillStyle = theme.farCity;
      ctx.fillRect(bx, by, b.w, viewH - by + 160);
      if (b.hasSpire) {
        ctx.fillRect(bx + b.w / 2 - 2, by - 36, 4, 36);
        const blink = 0.35 + 0.65 * Math.max(0, Math.sin(world.simTime * 3.5 + i * 1.7));
        ctx.fillStyle = hexToRgba(theme.ledgeHighlight, blink);
        ctx.beginPath();
        ctx.arc(bx + b.w / 2, by - 38, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 4. Parallax Mid Skyline
  const midLoopW = MID_BUILDINGS.length * 210;
  const midOffset = -(world.cameraX * 0.28) % midLoopW;
  for (let rep = -1; rep <= 2; rep++) {
    for (let mi = 0; mi < MID_BUILDINGS.length; mi++) {
      const b = MID_BUILDINGS[mi];
      const bx = midOffset + rep * midLoopW + b.x;
      if (bx + b.w < -40 || bx > viewW + 40) continue;
      const by = viewH - b.h + 70 - world.cameraY * 0.08;
      ctx.fillStyle = theme.midCity;
      ctx.fillRect(bx, by, b.w, viewH - by + 180);

      ctx.fillStyle =
        theme.weights.neon > 0.45 && mi % 2 === 1
          ? 'rgba(236, 72, 153, 0.24)'
          : hexToRgba(theme.ledgeHighlight, theme.isNight ? 0.26 : 0.18);
      for (let wy = by + 18; wy < viewH - 20; wy += 24) {
        ctx.fillRect(bx + 14, wy, b.w - 28, 4);
      }
    }
  }

  // Atmospheric Horizon Mist + Rolling Fog Banks separating background towers from foreground rooftops
  const mistAlpha = weather === 'mist' ? 0.38 : weather === 'rain' || weather === 'storm' ? 0.34 : 0.18;
  const mistGrad = ctx.createLinearGradient(0, viewH * 0.5, 0, viewH);
  mistGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
  mistGrad.addColorStop(
    1,
    theme.isNight ? `rgba(15, 23, 42, ${mistAlpha + 0.18})` : `rgba(248, 250, 252, ${mistAlpha})`
  );
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, viewH * 0.5, viewW, viewH * 0.5);

  if (weather === 'mist' || weather === 'rain' || weather === 'storm') {
    ctx.save();
    ctx.fillStyle = theme.isNight ? 'rgba(148, 163, 184, 0.09)' : 'rgba(255, 255, 255, 0.22)';
    const fogShift = -(world.cameraX * 0.16 + world.simTime * 26) % 440;
    for (let fx = fogShift - 440; fx < viewW + 440; fx += 440) {
      const fy = viewH * 0.72 + Math.sin(fx * 0.01 + world.simTime * 0.6) * 14;
      ctx.beginPath();
      ctx.ellipse(fx + 220, fy, 260, 42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Speed-Reactive Camera with 1x / x2 / x3 Zoom Support
  ctx.save();
  const shakeX = world.shakeTimer > 0 ? (Math.random() - 0.5) * world.shakeMagnitude * 2 : 0;
  const shakeY = world.shakeTimer > 0 ? (Math.random() - 0.5) * world.shakeMagnitude * 2 : 0;

  const baseScale = Math.max(0.46, Math.min(0.76, viewH / 1020));
  const speedFovOut = Math.min(0.032, Math.max(0, (world.player.vx - 460) * 0.00013));
  const zoomMult = Math.max(1, world.cameraZoom || 1);
  const scale = Math.max(0.44, baseScale - speedFovOut + world.zoomPunch) * zoomMult;

  const zoomT = Math.min(1, Math.max(0, zoomMult - 1));
  const focusX = world.cameraX + 340;
  const focusY = world.cameraY + 680;
  const baseCamX = Math.max(0, focusX - Math.max(260, (viewW * 0.26) / scale));
  const zoomedCamX = Math.max(0, focusX - (viewW * 0.24) / scale);
  const anchorY = 0.59 - zoomT * 0.04;
  const renderCamX = baseCamX + (zoomedCamX - baseCamX) * zoomT;
  const renderCamY = focusY - (viewH * anchorY) / scale;

  ctx.scale(scale, scale);
  const scaledViewW = viewW / scale;
  const scaledViewH = viewH / scale;
  ctx.translate(-renderCamX + shakeX, -renderCamY + shakeY);

  // Thermal Lava Updraft Vents (Rising Molten Heat Columns over Wide Chasms)
  for (const vent of world.thermalVents) {
    if (vent.x + vent.w < renderCamX - 90 || vent.x > renderCamX + scaledViewW + 90) continue;
    const ventBottom = Math.min(LAVA_SURFACE_Y + 20, vent.y + vent.h);
    const ventTop = vent.y;
    const ventH = Math.max(40, ventBottom - ventTop);

    ctx.save();
    const colGrad = ctx.createLinearGradient(0, ventTop, 0, ventBottom);
    colGrad.addColorStop(0, 'rgba(251, 146, 60, 0)');
    colGrad.addColorStop(0.35, 'rgba(251, 146, 60, 0.16)');
    colGrad.addColorStop(1, 'rgba(239, 68, 68, 0.42)');
    ctx.fillStyle = colGrad;
    ctx.fillRect(vent.x, ventTop, vent.w, ventH);

    // Side heat shimmer borders
    ctx.strokeStyle = 'rgba(253, 186, 116, 0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = world.simTime * 110;
    ctx.beginPath();
    ctx.moveTo(vent.x + 2, ventBottom);
    ctx.lineTo(vent.x + 2, ventTop + 18);
    ctx.moveTo(vent.x + vent.w - 2, ventBottom);
    ctx.lineTo(vent.x + vent.w - 2, ventTop + 18);
    ctx.stroke();
    ctx.setLineDash([]);

    // Animated rising updraft chevrons inside thermal column
    const midX = vent.x + vent.w * 0.5;
    const chevSpacing = 62;
    const chevScroll = (world.simTime * 175) % chevSpacing;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let cy = ventBottom - 26 - chevScroll; cy > ventTop + 18; cy -= chevSpacing) {
      const hProg = Math.max(0, Math.min(1, (cy - ventTop) / ventH));
      ctx.strokeStyle = `rgba(254, 240, 138, ${0.22 + hProg * 0.52})`;
      ctx.beginPath();
      ctx.moveTo(midX - 15, cy + 8);
      ctx.lineTo(midX, cy - 5);
      ctx.lineTo(midX + 15, cy + 8);
      ctx.stroke();
    }

    // Rising incandescent sparks in the updraft
    for (let s = 0; s < 5; s++) {
      const cycle = (world.simTime * (0.9 + s * 0.14) + s * 0.23) % 1;
      const sx = vent.x + 12 + ((s * 37 + Math.sin(world.simTime * 5 + s) * 14 + vent.w) % Math.max(20, vent.w - 24));
      const sy = ventBottom - cycle * ventH;
      ctx.fillStyle = `rgba(254, 249, 195, ${(1 - cycle) * 0.8})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5 * (1 - cycle * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Grind Rails & Overhead Bar Line Gliders
  for (const rail of world.rails) {
    if (Math.max(rail.x1, rail.x2) < renderCamX - 80 || Math.min(rail.x1, rail.x2) > renderCamX + scaledViewW + 80) continue;

    const isActiveRail = world.player.grindingRailId === rail.id;

    if (rail.kind === 'glider') {
      // Overhead suspension masts anchoring the bar line glider
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(rail.x1, rail.y1);
      ctx.lineTo(rail.x1, rail.y1 - 240);
      ctx.moveTo(rail.x2, rail.y2);
      ctx.lineTo(rail.x2, rail.y2 - 240);
      ctx.stroke();

      // Glowing anchor caps
      ctx.fillStyle = '#0EA5E9';
      ctx.beginPath();
      ctx.arc(rail.x1, rail.y1, 5.5, 0, Math.PI * 2);
      ctx.arc(rail.x2, rail.y2, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Cyan aerodynamic tension aura
      ctx.strokeStyle = isActiveRail ? 'rgba(56, 189, 248, 0.55)' : 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = isActiveRail ? 15 : 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rail.x1, rail.y1);
      ctx.lineTo(rail.x2, rail.y2);
      ctx.stroke();

      // Main tension cable
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(rail.x1, rail.y1);
      ctx.lineTo(rail.x2, rail.y2);
      ctx.stroke();

      ctx.strokeStyle = isActiveRail ? '#E0F2FE' : '#38BDF8';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(rail.x1, rail.y1 + 1);
      ctx.lineTo(rail.x2, rail.y2 + 1);
      ctx.stroke();

      // Directional flow chevrons along the bar line
      const dx = rail.x2 - rail.x1;
      const dy = rail.y2 - rail.y1;
      const lineLen = Math.hypot(dx, dy) || 1;
      const angle = Math.atan2(dy, dx);
      const pulseShift = (world.simTime * 110) % 56;
      ctx.save();
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.65)';
      ctx.lineWidth = 2;
      for (let d = pulseShift + 24; d < lineLen - 20; d += 56) {
        const t = d / lineLen;
        const cx = rail.x1 + dx * t;
        const cy = rail.y1 + dy * t;
        ctx.save();
        ctx.translate(cx, cy + 12);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(3, 0);
        ctx.lineTo(-4, 4);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Sliding T-bar handle & pulley carriage
      const pCx = world.player.x + world.player.w / 2;
      const trolleyT = isActiveRail
        ? Math.max(0, Math.min(1, (pCx - rail.x1) / (rail.x2 - rail.x1 || 1)))
        : 0.04;
      const tx = rail.x1 + dx * trolleyT;
      const ty = rail.y1 + dy * trolleyT;

      ctx.save();
      ctx.translate(tx, ty);
      // Pulley block on cable
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      traceRoundedRect(ctx, -10, -7, 20, 11, 4);
      ctx.fill();
      ctx.stroke();

      // Hanging drop stem + horizontal grab bar handle
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, 14);
      ctx.moveTo(-12, 14);
      ctx.lineTo(12, 14);
      ctx.stroke();
      ctx.restore();

      // High-Place gold diamond crest at glider entry when elevated
      if (rail.isHighPlace || rail.y1 <= 360) {
        const passed = world.visitedHighPlaceIds.has(rail.id);
        const bob = Math.sin(world.simTime * 4.5 + rail.x1 * 0.02) * 3;
        ctx.save();
        ctx.translate(rail.x1 + 26, rail.y1 - 24 + bob);
        ctx.fillStyle = passed ? '#10B981' : '#FBBF24';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      continue;
    }

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rail.x1 + 16, rail.y1);
    ctx.lineTo(rail.x1 + 16, rail.y1 + 260);
    ctx.moveTo(rail.x2 - 16, rail.y2);
    ctx.lineTo(rail.x2 - 16, rail.y2 + 260);
    ctx.stroke();

    if (isActiveRail) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.42)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rail.x1, rail.y1);
      ctx.lineTo(rail.x2, rail.y2);
      ctx.stroke();
    }

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rail.x1, rail.y1);
    ctx.lineTo(rail.x2, rail.y2);
    ctx.stroke();

    ctx.strokeStyle = isActiveRail ? '#FEF08A' : '#FBBF24';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(rail.x1, rail.y1 - 1.5);
    ctx.lineTo(rail.x2, rail.y2 - 1.5);
    ctx.stroke();
  }

  // Platforms
  for (const plat of world.platforms) {
    const b = getPlatformBounds(plat, world.simTime);
    if (b.x + plat.w < renderCamX - 100 || b.x > renderCamX + scaledViewW + 100) continue;
    if (b.y > renderCamY + scaledViewH + 160 || b.y + plat.h < renderCamY - 120) continue;

    if (plat.prop === 'antenna') {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x + 60, b.y);
      ctx.lineTo(b.x + 60, b.y - 78);
      ctx.moveTo(b.x + 48, b.y - 54);
      ctx.lineTo(b.x + 72, b.y - 54);
      ctx.stroke();
      const beaconAlpha = 0.5 + 0.5 * Math.sin(world.simTime * 6);
      ctx.fillStyle = `rgba(239, 68, 68, ${beaconAlpha})`;
      ctx.beginPath();
      ctx.arc(b.x + 60, b.y - 80, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (plat.prop === 'hvac') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(b.x + 44, b.y - 26, 48, 26);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(b.x + 50, b.y - 20, 14, 14);
      ctx.fillRect(b.x + 70, b.y - 20, 14, 14);
      // Animated rising HVAC steam puffs
      ctx.save();
      for (let puff = 0; puff < 3; puff++) {
        const cycle = (world.simTime * 0.75 + puff * 0.33 + (b.x % 100) * 0.01) % 1;
        const px = b.x + 68 - cycle * 24 + Math.sin(world.simTime * 4 + puff) * 4;
        const py = b.y - 30 - cycle * 44;
        ctx.fillStyle = `rgba(226, 232, 240, ${(1 - cycle) * 0.28})`;
        ctx.beginPath();
        ctx.arc(px, py, 5 + cycle * 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (plat.prop === 'watertower') {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x + 52, b.y);
      ctx.lineTo(b.x + 58, b.y - 36);
      ctx.moveTo(b.x + 92, b.y);
      ctx.lineTo(b.x + 86, b.y - 36);
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.fillRect(b.x + 50, b.y - 72, 44, 38);
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(b.x + 48, b.y - 72);
      ctx.lineTo(b.x + 72, b.y - 88);
      ctx.lineTo(b.x + 96, b.y - 72);
      ctx.closePath();
      ctx.fill();
    }

    const drawH = plat.kind === 'building' ? Math.max(plat.h, 1800) : plat.h;
    const collapseProg = plat.collapsed ? 1 : plat.collapseProgress ?? 0;
    const isFalling = Boolean(plat.collapsed);
    const fallAlpha = isFalling ? Math.max(0, 1 - ((plat.collapseFallY ?? 16) - 16) / 360) : 1;
    if (fallAlpha <= 0.02) continue;

    // Architectural steel/concrete support columns under elevated upper buildings
    if (plat.kind === 'upperBuilding' && plat.supportDrop && plat.supportDrop > 0) {
      const colW = 14;
      const colH = plat.supportDrop;
      const colTop = b.y + drawH - 4;
      const leftColX = b.x + 22;
      const rightColX = b.x + plat.w - 22 - colW;
      const midColX = b.x + plat.w * 0.5 - colW * 0.5;
      const colPositions = plat.w >= 460 ? [leftColX, midColX, rightColX] : [leftColX, rightColX];

      ctx.save();
      for (const cx of colPositions) {
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(cx, colTop, colW, colH);
        ctx.strokeStyle = theme.buildingStroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx, colTop, colW, colH);

        // Diagonal truss cross-bracing along column
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let cy = colTop + 8; cy < colTop + colH - 16; cy += 28) {
          ctx.moveTo(cx + 2, cy);
          ctx.lineTo(cx + colW - 2, cy + 20);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    const jitterX =
      collapseProg > 0 && !isFalling
        ? Math.sin(world.simTime * 60 + plat.x * 0.2) * (1 + collapseProg * 3.4)
        : 0;
    const jitterY =
      collapseProg > 0 && !isFalling
        ? Math.cos(world.simTime * 48 + plat.y * 0.2) * (collapseProg * 1.8)
        : 0;
    const drawX = b.x + jitterX;
    const drawY = b.y + jitterY;

    ctx.save();
    if (isFalling) {
      const cx = drawX + plat.w * 0.5;
      const cy = drawY + drawH * 0.5;
      const tilt = ((plat.x % 2 === 0 ? 1 : -1) * Math.min(0.45, ((plat.collapseFallY ?? 16) - 16) / 420));
      ctx.globalAlpha = fallAlpha;
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.translate(-cx, -cy);
    }

    if (plat.kind === 'box') {
      const boxRadius = Math.min(18, Math.min(plat.w, drawH) * 0.25);
      const boxGrad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
      boxGrad.addColorStop(0, collapseProg > 0.6 ? '#451A1A' : '#334155');
      boxGrad.addColorStop(1, '#1E293B');

      traceRoundedRect(ctx, drawX, drawY, plat.w, drawH, boxRadius);
      ctx.fillStyle = boxGrad;
      ctx.fill();

      ctx.save();
      ctx.clip();
      // Curved top jump-surface highlight band (shifts hot red as collapse progresses)
      ctx.fillStyle = collapseProg > 0.55 ? '#EF4444' : collapseProg > 0.1 ? '#FB923C' : theme.ledgeHighlight;
      ctx.fillRect(drawX, drawY, plat.w, 6);

      // Recessed inner curved crate panel + cross brace
      const pad = Math.min(11, plat.w * 0.16);
      traceRoundedRect(ctx, drawX + pad, drawY + pad + 2, plat.w - pad * 2, drawH - pad * 2 - 2, Math.max(6, boxRadius * 0.45));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(drawX + pad + 4, drawY + pad + 6);
      ctx.lineTo(drawX + plat.w - pad - 4, drawY + drawH - pad - 4);
      ctx.moveTo(drawX + plat.w - pad - 4, drawY + pad + 6);
      ctx.lineTo(drawX + pad + 4, drawY + drawH - pad - 4);
      ctx.stroke();

      // Gradual stress cracks spreading across the box
      if (collapseProg > 0.05) {
        ctx.strokeStyle = collapseProg > 0.6 ? '#FCA5A5' : '#FDBA74';
        ctx.lineWidth = 1.6 + collapseProg * 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const midX = drawX + plat.w * 0.5;
        const depth = drawH * Math.min(0.92, 0.25 + collapseProg * 0.72);
        ctx.moveTo(midX - 6, drawY + 2);
        ctx.lineTo(midX + 4, drawY + depth * 0.45);
        ctx.lineTo(midX - 8, drawY + depth * 0.78);
        ctx.lineTo(midX + 2, drawY + depth);
        if (collapseProg > 0.4) {
          ctx.moveTo(midX + 4, drawY + depth * 0.45);
          ctx.lineTo(drawX + plat.w * 0.78, drawY + depth * 0.65);
        }
        ctx.stroke();
      }
      ctx.restore();

      traceRoundedRect(ctx, drawX, drawY, plat.w, drawH, boxRadius);
      ctx.strokeStyle = collapseProg > 0.55 ? '#F87171' : theme.isNight ? '#475569' : '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const rTop = plat.kind === 'bridge' ? 10 : plat.kind === 'upperBuilding' ? 8 : 12;
    const rBottom = plat.kind === 'building' ? 0 : plat.kind === 'upperBuilding' ? 4 : rTop;

    traceRoundedRect(ctx, drawX, drawY, plat.w, drawH, rTop, rTop, rBottom, rBottom);
    ctx.fillStyle = collapseProg > 0.6 && plat.kind === 'bridge' ? '#3B181E' : theme.buildingFill;
    ctx.fill();

    ctx.save();
    ctx.clip();

    if ((plat.kind === 'building' && drawH > 120) || (plat.kind === 'upperBuilding' && !plat.tankViewHole && drawH < 150)) {
      ctx.fillStyle = theme.isNight ? 'rgba(148, 163, 184, 0.08)' : 'rgba(255, 255, 255, 0.05)';
      const maxWinY = plat.kind === 'upperBuilding' ? drawY + drawH - 12 : drawY + Math.min(drawH, 1200);
      for (let wy = drawY + 26; wy < maxWinY; wy += 32) {
        ctx.fillRect(drawX + 18, wy, plat.w - 36, 8);
      }
      if (plat.kind === 'upperBuilding') {
        ctx.fillStyle = hexToRgba(theme.ledgeHighlight, 0.22);
        for (let wy = drawY + 26; wy < maxWinY; wy += 64) {
          for (let wx = drawX + 24; wx < drawX + plat.w - 42; wx += 44) {
            ctx.fillRect(wx, wy, 20, 8);
          }
        }
      }
    }

    // Very Big Tank Building: giant untouchable glass view hole in the middle
    if (plat.kind === 'upperBuilding' && (plat.tankViewHole || drawH >= 150)) {
      const holePadX = Math.max(48, Math.round(plat.w * 0.11));
      const holePadTop = Math.max(30, Math.round(drawH * 0.16));
      const holePadBot = Math.max(26, Math.round(drawH * 0.14));
      const hx = drawX + holePadX;
      const hy = drawY + holePadTop;
      const hw = Math.max(120, plat.w - holePadX * 2);
      const hh = Math.max(70, drawH - holePadTop - holePadBot);
      const hr = Math.min(22, hh * 0.18);

      // Sleek open pass-through lower corridor bays on the left & right edges + structural side ribs
      const archH = Math.min(92, Math.round(drawH * 0.38));
      const archW = Math.max(30, holePadX - 4);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.52)';
      traceRoundedRect(ctx, drawX, drawY + drawH - archH, archW + 6, archH, 0, 16, 0, 0);
      ctx.fill();
      traceRoundedRect(ctx, drawX + plat.w - archW - 6, drawY + drawH - archH, archW + 6, archH, 16, 0, 0, 0);
      ctx.fill();

      // Subtle glowing pass-through corridor floor strip & animated forward guide chevrons
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(drawX, drawY + drawH - 12, plat.w, 12);

      const passPulse = (world.simTime * 120) % 52;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.42)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let cx = drawX + 18 + passPulse; cx < drawX + plat.w - 18; cx += 52) {
        const cy = drawY + drawH - 28;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 5);
        ctx.lineTo(cx + 2, cy);
        ctx.lineTo(cx - 5, cy + 5);
        ctx.stroke();
      }

      // Glowing portal arch thresholds
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(drawX, drawY + drawH - archH);
      ctx.lineTo(drawX + archW - 2, drawY + drawH - archH);
      ctx.moveTo(drawX + plat.w - archW + 2, drawY + drawH - archH);
      ctx.lineTo(drawX + plat.w, drawY + drawH - archH);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
      for (let rx = drawX + 18; rx < drawX + plat.w - 14; rx += 92) {
        if (rx > hx - 10 && rx < hx + hw + 10) continue;
        ctx.fillRect(rx, drawY + 14, 6, drawH - archH - 22);
      }

      // Outer beveled steel tank frame around the view hole
      traceRoundedRect(ctx, hx - 8, hy - 8, hw + 16, hh + 16, hr + 4);
      ctx.fillStyle = '#1E293B';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Deep glowing tank interior behind the untouchable glass
      ctx.save();
      traceRoundedRect(ctx, hx, hy, hw, hh, hr);
      ctx.clip();

      const tankGrad = ctx.createLinearGradient(hx, hy, hx, hy + hh);
      tankGrad.addColorStop(0, '#042F2E');
      tankGrad.addColorStop(0.28, '#075985');
      tankGrad.addColorStop(0.75, '#0C4A6E');
      tankGrad.addColorStop(1, '#082F49');
      ctx.fillStyle = tankGrad;
      ctx.fillRect(hx, hy, hw, hh);

      // Subtle interior tank vertical chambers & submerged pipes
      ctx.fillStyle = 'rgba(2, 6, 23, 0.24)';
      const strutStep = Math.max(110, Math.round(hw / 4));
      for (let sx = hx + strutStep; sx < hx + hw - 24; sx += strutStep) {
        ctx.fillRect(sx - 5, hy, 10, hh);
      }

      // Rippling fluid line near top of the viewing tank
      const fluidTopY = hy + hh * 0.14;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.moveTo(hx, hy + hh);
      ctx.lineTo(hx, fluidTopY);
      for (let wx = hx; wx <= hx + hw + 24; wx += 24) {
        const waveY = fluidTopY + Math.sin(wx * 0.032 + world.simTime * 2.4) * 3.5;
        ctx.lineTo(wx, waveY);
      }
      ctx.lineTo(hx + hw, hy + hh);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let wx = hx; wx <= hx + hw + 24; wx += 24) {
        const waveY = fluidTopY + Math.sin(wx * 0.032 + world.simTime * 2.4) * 3.5;
        if (wx === hx) ctx.moveTo(wx, waveY);
        else ctx.lineTo(wx, waveY);
      }
      ctx.stroke();

      // Rising tank bubbles inside the untouchable glass view hole
      const bubbleCount = Math.max(10, Math.floor(hw / 34));
      for (let bi = 0; bi < bubbleCount; bi++) {
        const bx = hx + ((bi * 97 + 29) % Math.max(40, hw - 24)) + 12 + Math.sin(world.simTime * 2.2 + bi) * 5;
        const cycle = (world.simTime * (0.28 + (bi % 4) * 0.08) + bi * 0.17) % 1;
        const by = hy + hh - 8 - cycle * (hh - fluidTopY + hy - 14);
        const br = 2.2 + (bi % 3) * 1.6;
        ctx.fillStyle = 'rgba(224, 242, 254, 0.42)';
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      // Thick sealed untouchable glass diagonal reflections
      ctx.fillStyle = 'rgba(224, 242, 254, 0.16)';
      for (let gx = hx - 40; gx < hx + hw + 60; gx += 135) {
        ctx.beginPath();
        ctx.moveTo(gx, hy + hh);
        ctx.lineTo(gx + 54, hy);
        ctx.lineTo(gx + 82, hy);
        ctx.lineTo(gx + 28, hy + hh);
        ctx.closePath();
        ctx.fill();
      }

      // Subtle inner cyan glass rim shadow
      traceRoundedRect(ctx, hx + 1, hy + 1, hw - 2, hh - 2, hr);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Corner rivet bolts around the armored tank frame
      ctx.fillStyle = '#94A3B8';
      const rivets = [
        [hx - 3, hy - 3],
        [hx + hw + 3, hy - 3],
        [hx - 3, hy + hh + 3],
        [hx + hw + 3, hy + hh + 3],
      ];
      for (const [rx, ry] of rivets) {
        ctx.beginPath();
        ctx.arc(rx, ry, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (plat.kind === 'overhead') {
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(drawX, drawY + plat.h - 6, plat.w, 6);
      ctx.fillStyle = '#0F172A';
      for (let sx = drawX + 6; sx < drawX + plat.w - 8; sx += 18) {
        ctx.fillRect(sx, drawY + plat.h - 6, 8, 6);
      }
    }

    if (plat.accentEdge === 'top') {
      ctx.fillStyle = collapseProg > 0.55 ? '#EF4444' : collapseProg > 0.1 ? '#FB923C' : theme.ledgeHighlight;
      ctx.fillRect(drawX, drawY, plat.w, 4);
    }

    // Stress fissures across collapsing mid-air bridges
    if (plat.kind === 'bridge' && collapseProg > 0.05) {
      ctx.strokeStyle = collapseProg > 0.6 ? '#FCA5A5' : '#FDBA74';
      ctx.lineWidth = 1.6 + collapseProg * 1.2;
      ctx.lineCap = 'round';
      const crackCount = Math.max(2, Math.floor(plat.w / 55));
      ctx.beginPath();
      for (let c = 1; c <= crackCount; c++) {
        const cx = drawX + (plat.w / (crackCount + 1)) * c;
        const reach = drawH * Math.min(0.95, 0.3 + collapseProg * 0.7);
        ctx.moveTo(cx, drawY + 2);
        ctx.lineTo(cx + (c % 2 === 0 ? 6 : -6), drawY + reach * 0.55);
        ctx.lineTo(cx + (c % 2 === 0 ? -4 : 5), drawY + reach);
      }
      ctx.stroke();
    }

    ctx.restore();

    traceRoundedRect(ctx, drawX, drawY, plat.w, drawH, rTop, rTop, rBottom, rBottom);
    ctx.strokeStyle = collapseProg > 0.55 && plat.kind === 'bridge' ? '#EF4444' : theme.buildingStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // High-Place Elevated Beacon & Gold Crown Trim (tracks 5-High-Place Level-Up Streak)
    const isHighPlat =
      !isFalling &&
      plat.kind !== 'overhead' &&
      (plat.isHighPlace || plat.kind === 'upperBuilding' || b.y <= HIGH_PLACE_Y_THRESHOLD);
    if (isHighPlat && plat.w >= 90) {
      const passed = world.visitedHighPlaceIds.has(plat.id);
      ctx.fillStyle = passed ? 'rgba(16, 185, 129, 0.88)' : 'rgba(251, 191, 36, 0.92)';
      ctx.fillRect(drawX + 6, drawY, Math.max(0, plat.w - 12), 4);

      const bx = drawX + Math.min(34, plat.w * 0.35);
      const bob = Math.sin(world.simTime * 4.5 + plat.x * 0.02) * 3;
      const by = drawY - 18 + bob;
      ctx.fillStyle = passed ? 'rgba(16, 185, 129, 0.28)' : 'rgba(251, 191, 36, 0.28)';
      ctx.beginPath();
      ctx.arc(bx, by, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = passed ? '#34D399' : '#FBBF24';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx, by - 7);
      ctx.lineTo(bx + 6, by);
      ctx.lineTo(bx, by + 7);
      ctx.lineTo(bx - 6, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // Ground Slider Boost Strips (Crisp White with Kinetic Glow Aura)
  for (const boost of world.boosts) {
    const aura = ctx.createLinearGradient(0, boost.y - 16, 0, boost.y + boost.h);
    aura.addColorStop(0, 'rgba(255, 255, 255, 0)');
    aura.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
    ctx.fillStyle = aura;
    ctx.fillRect(boost.x, boost.y - 16, boost.w, boost.h + 16);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(boost.x, boost.y, boost.w, boost.h);
    const shift = (world.simTime * 190) % 22;
    ctx.fillStyle = '#CBD5E1';
    for (let cx = boost.x + shift; cx < boost.x + boost.w - 6; cx += 22) {
      ctx.fillRect(cx, boost.y + 1, 9, boost.h - 2);
    }
  }

  // Springs
  for (const sp of world.springs) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(sp.x, sp.y + 4, sp.w, sp.h - 4);
    ctx.fillStyle = '#F97316';
    ctx.fillRect(sp.x + 2, sp.y, sp.w - 4, 5);
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.6)';
    ctx.lineWidth = 2.4;
    const wispOff = (world.simTime * 95) % 34;
    for (let wx = sp.x + 12; wx < sp.x + sp.w - 8; wx += 18) {
      ctx.beginPath();
      ctx.moveTo(wx, sp.y - wispOff);
      ctx.lineTo(wx, sp.y - wispOff - 18);
      ctx.stroke();
    }
  }

  // Mid-Air Jet Boosters (Aerial Thruster Rings)
  for (const ab of world.airBoosters) {
    if (ab.x < renderCamX - 90 || ab.x > renderCamX + scaledViewW + 90) continue;
    const r = ab.radius;
    const angle = ab.dir === 'up' ? -Math.PI / 2 : ab.dir === 'up-forward' ? -Math.PI / 5 : 0;
    const bob = Math.sin(world.simTime * 4.5 + ab.x * 0.015) * 4;

    ctx.save();
    ctx.translate(ab.x, ab.y + bob);
    ctx.globalAlpha = ab.triggered ? 0.32 : 1;

    // Outer jet slipstream halo
    const aura = ctx.createRadialGradient(0, 0, r * 0.25, 0, 0, r * 1.45);
    aura.addColorStop(0, 'rgba(56, 189, 248, 0.36)');
    aura.addColorStop(0.6, 'rgba(249, 115, 22, 0.14)');
    aura.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
    ctx.fill();

    // Rotating turbine bezel ring
    ctx.save();
    ctx.rotate(world.simTime * 3.8);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 0.72);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, Math.PI * 1.72);
    ctx.stroke();

    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, Math.PI * 0.78, Math.PI * 0.96);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, Math.PI * 1.78, Math.PI * 1.96);
    ctx.stroke();
    ctx.restore();

    // Directional thrust chevrons & trailing slipstream ribbons
    ctx.save();
    ctx.rotate(angle);
    const pulse = (world.simTime * 4.2) % 1;
    for (let i = -1; i <= 1; i++) {
      const cx = i * 10 + pulse * 8 - 4;
      ctx.strokeStyle = i === 1 ? '#FEF08A' : '#E0F2FE';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 5, -8);
      ctx.lineTo(cx + 4, 0);
      ctx.lineTo(cx - 5, 8);
      ctx.stroke();
    }

    if (!ab.triggered) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
      ctx.lineWidth = 2;
      for (let s = -1; s <= 1; s += 2) {
        const streakShift = (world.simTime * 95 + s * 14) % 28;
        ctx.beginPath();
        ctx.moveTo(r + 4 + streakShift * 0.35, s * 14);
        ctx.lineTo(r + 22 + streakShift * 0.7, s * 14);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.restore();
  }

  // Tall Architectural Glass Walls & Shattering Polygonal Shards
  for (const gw of world.glassWalls) {
    if (gw.x + gw.w < renderCamX - 240 || gw.x > renderCamX + scaledViewW + 140) continue;

    if (!gw.shattered) {
      ctx.save();
      // Subtle cyan architectural rim glow
      ctx.fillStyle = 'rgba(125, 211, 252, 0.14)';
      ctx.fillRect(gw.x - 5, gw.y, gw.w + 10, gw.h);

      // Tempered glass vertical sheet fill
      const glassGrad = ctx.createLinearGradient(gw.x, gw.y, gw.x + gw.w, gw.y + gw.h);
      glassGrad.addColorStop(0, 'rgba(224, 242, 254, 0.44)');
      glassGrad.addColorStop(0.45, 'rgba(125, 211, 252, 0.24)');
      glassGrad.addColorStop(1, 'rgba(56, 189, 248, 0.36)');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(gw.x, gw.y, gw.w, gw.h);

      // Diagonal specular light reflections moving subtly across the glass pane
      ctx.save();
      ctx.beginPath();
      ctx.rect(gw.x, gw.y, gw.w, gw.h);
      ctx.clip();
      const glareOffset = Math.sin(world.simTime * 1.8 + gw.x * 0.01) * 14;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      for (let gy = gw.y + 18 + glareOffset; gy < gw.y + gw.h; gy += 64) {
        ctx.beginPath();
        ctx.moveTo(gw.x - 2, gy);
        ctx.lineTo(gw.x + gw.w + 2, gy - 22);
        ctx.lineTo(gw.x + gw.w + 2, gy - 11);
        ctx.lineTo(gw.x - 2, gy + 11);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Horizontal structural pane mullions splitting the tall glass wall into segments
      ctx.fillStyle = '#334155';
      for (let my = gw.y + 68; my < gw.y + gw.h - 24; my += 68) {
        ctx.fillRect(gw.x - 1, my, gw.w + 2, 4);
      }

      // Crisp tempered edge highlights & top/bottom mounting shoes
      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 2;
      ctx.strokeRect(gw.x, gw.y, gw.w, gw.h);

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(gw.x - 3, gw.y - 4, gw.w + 6, 8);
      ctx.fillRect(gw.x - 3, gw.y + gw.h - 5, gw.w + 6, 6);
      ctx.restore();
    } else {
      // Intact top/bottom steel frame tracks + jagged glass remnants
      ctx.save();
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(gw.x - 3, gw.y - 4, gw.w + 6, 8);
      ctx.fillRect(gw.x - 3, gw.y + gw.h - 5, gw.w + 6, 6);

      ctx.fillStyle = 'rgba(186, 230, 253, 0.72)';
      ctx.beginPath();
      ctx.moveTo(gw.x + 2, gw.y + 4);
      ctx.lineTo(gw.x + gw.w * 0.5, gw.y + 18);
      ctx.lineTo(gw.x + gw.w - 2, gw.y + 4);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(gw.x + 2, gw.y + gw.h - 5);
      ctx.lineTo(gw.x + gw.w * 0.45, gw.y + gw.h - 19);
      ctx.lineTo(gw.x + gw.w - 2, gw.y + gw.h - 5);
      ctx.closePath();
      ctx.fill();

      // Flying polygonal glass shards
      if (gw.shards) {
        for (const s of gw.shards) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, s.alpha);
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.beginPath();
          ctx.moveTo(-s.w * 0.5, -s.h * 0.45);
          ctx.lineTo(s.w * 0.55, -s.h * 0.15);
          ctx.lineTo(s.w * 0.15, s.h * 0.55);
          ctx.lineTo(-s.w * 0.45, s.h * 0.2);
          ctx.closePath();
          ctx.fillStyle = 'rgba(186, 230, 253, 0.72)';
          ctx.fill();
          ctx.strokeStyle = '#F0F9FF';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  // Hazards with Energy Pulse & Hot Ground Lava Strips
  for (const hz of world.hazards) {
    if (hz.kind === 'hotground') {
      // Rising heat glow aura above the superheated rooftop surface
      const heatGlow = ctx.createLinearGradient(0, hz.y - 30, 0, hz.y + hz.h);
      heatGlow.addColorStop(0, 'rgba(249, 115, 22, 0)');
      heatGlow.addColorStop(1, 'rgba(239, 68, 68, 0.52)');
      ctx.fillStyle = heatGlow;
      ctx.fillRect(hz.x - 4, hz.y - 30, hz.w + 8, hz.h + 30);

      // Rounded molten floor slab
      traceRoundedRect(ctx, hz.x, hz.y, hz.w, hz.h, 6);
      const lavaGrad = ctx.createLinearGradient(0, hz.y, 0, hz.y + hz.h);
      lavaGrad.addColorStop(0, '#FEF08A');
      lavaGrad.addColorStop(0.35, '#F97316');
      lavaGrad.addColorStop(1, '#991B1B');
      ctx.fillStyle = lavaGrad;
      ctx.fill();

      // Rippling bright magma veins along top surface
      ctx.strokeStyle = 'rgba(254, 249, 195, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let vx = hz.x + 8; vx < hz.x + hz.w - 8; vx += 18) {
        const wave = Math.sin(world.simTime * 11 + vx * 0.14) * 1.8;
        ctx.moveTo(vx, hz.y + 4 + wave);
        ctx.lineTo(vx + 9, hz.y + 4 - wave);
      }
      ctx.stroke();

      // Rising glowing heat embers
      for (let ex = hz.x + 12; ex < hz.x + hz.w - 10; ex += 22) {
        const cycle = (world.simTime * 1.4 + ex * 0.037) % 1;
        const ey = hz.y - 2 - cycle * 28;
        const drift = Math.sin(world.simTime * 6 + ex) * 4;
        ctx.fillStyle = `rgba(253, 186, 116, ${(1 - cycle) * 0.85})`;
        ctx.beginPath();
        ctx.arc(ex + drift, ey, 2.2 * (1 - cycle * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (hz.kind === 'laser') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(hz.x - 4, hz.y - 6, hz.w + 8, hz.h + 8);
      ctx.fillStyle = '#991B1B';
      ctx.fillRect(hz.x, hz.y + 6, hz.w, hz.h - 6);
      const pulse = 0.72 + Math.sin(world.simTime * 22) * 0.28;
      ctx.fillStyle = `rgba(248, 113, 113, ${pulse})`;
      ctx.fillRect(hz.x, hz.y, hz.w, 6);
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillRect(hz.x, hz.y + 8, hz.w, 8);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      for (let sx = hz.x + 6; sx < hz.x + hz.w - 6; sx += 14) {
        ctx.beginPath();
        ctx.moveTo(sx, hz.y + 8);
        ctx.lineTo(sx + 5, hz.y - 5 - Math.sin(world.simTime * 14 + sx) * 4);
        ctx.lineTo(sx + 10, hz.y + 8);
        ctx.fill();
      }
    }
  }

  // Checkpoints
  for (const cp of world.checkpoints) {
    const active = cp.index <= world.activeCheckpointIndex;
    if (active) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.fillRect(cp.x - 10, cp.y - 120, 20, 120);
    }
    ctx.strokeStyle = active ? '#10B981' : '#94A3B8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y);
    ctx.lineTo(cp.x, cp.y - 68);
    ctx.stroke();

    ctx.fillStyle = active ? '#10B981' : '#64748B';
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y - 68);
    ctx.lineTo(cp.x + 26, cp.y - 58);
    ctx.lineTo(cp.x, cp.y - 48);
    ctx.closePath();
    ctx.fill();
  }

  // Level Finish Gate Portal
  if (!world.course.isEndless && !world.tutorialActive) {
    const fx = world.course.finishX;
    const fy = world.course.finishY;
    if (fx >= renderCamX - 180 && fx <= renderCamX + scaledViewW + 180) {
      const gateH = 195;
      const gateW = 54;
      const pulse = 0.72 + 0.28 * Math.sin(world.simTime * 6);

      ctx.save();
      // Vertical energy portal beam
      const portalGrad = ctx.createLinearGradient(fx - gateW * 0.5, fy - gateH, fx + gateW * 0.5, fy);
      portalGrad.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
      portalGrad.addColorStop(0.5, `rgba(16, 185, 129, ${0.28 * pulse})`);
      portalGrad.addColorStop(1, 'rgba(52, 211, 153, 0.42)');
      ctx.fillStyle = portalGrad;
      ctx.fillRect(fx - gateW * 0.42, fy - gateH + 22, gateW * 0.84, gateH - 22);

      // Twin architectural gate pillars
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.4;
      traceRoundedRect(ctx, fx - gateW * 0.5, fy - gateH, 11, gateH, 4);
      ctx.fill();
      ctx.stroke();

      traceRoundedRect(ctx, fx + gateW * 0.5 - 11, fy - gateH, 11, gateH, 4);
      ctx.fill();
      ctx.stroke();

      // Overhead crossbar & beacon orb
      traceRoundedRect(ctx, fx - gateW * 0.5 - 8, fy - gateH - 18, gateW + 16, 26, 6);
      ctx.fillStyle = '#0F172A';
      ctx.fill();
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#34D399';
      ctx.beginPath();
      ctx.arc(fx, fy - gateH - 26, 6.5 + pulse * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '700 13px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ECFDF5';
      ctx.fillText(`FINISH · L${world.course.levelNumber ?? 1}`, fx, fy - gateH - 5);
      ctx.restore();
    }
  }

  // In-World Tutorial Target Beacons & Directional Chevrons
  if (world.tutorialActive) {
    let cueX = 484;
    let cueY = 342;
    let cueLabel = 'JUMP';
    let pointDown = true;

    if (world.tutorialStep === 'hotground-jump') {
      cueX = 875;
      cueY = 414;
      cueLabel = 'HOT GROUND · JUMP';
      pointDown = true;
    } else if (world.tutorialStep === 'hotground-double') {
      cueX = 890;
      cueY = 295;
      cueLabel = 'DOUBLE-JUMP';
      pointDown = false;
    } else if (world.tutorialStep === 'slide-duct') {
      cueX = 1235;
      cueY = 454;
      cueLabel = 'SLIDE UNDER';
      pointDown = true;
    }

    const pulse = 0.65 + 0.35 * Math.sin(world.simTime * 7);
    const bob = Math.sin(world.simTime * 5) * 6;

    ctx.save();
    ctx.translate(cueX, cueY + bob);

    // Soft pulsing beacon ring
    ctx.strokeStyle = `rgba(249, 115, 22, ${0.45 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 22 + (1 - pulse) * 8, 0, Math.PI * 2);
    ctx.stroke();

    // Directional chevron arrow
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (pointDown) {
      ctx.moveTo(-9, -4);
      ctx.lineTo(0, 6);
      ctx.lineTo(9, -4);
    } else {
      ctx.moveTo(-9, 4);
      ctx.lineTo(0, -6);
      ctx.lineTo(9, 4);
    }
    ctx.stroke();

    ctx.font = '700 13px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(cueLabel, 1, -29);
    ctx.fillStyle = '#FDBA74';
    ctx.fillText(cueLabel, 0, -30);
    ctx.restore();
  }

  // Shards with Ambient Halo
  for (const sh of world.shards) {
    if (sh.collected) continue;
    if (sh.x < renderCamX - 40 || sh.x > renderCamX + scaledViewW + 40) continue;
    const bob = Math.sin(world.simTime * 4.5 + sh.x * 0.02) * 5;
    ctx.save();
    ctx.translate(sh.x, sh.y + bob);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, 15 + Math.sin(world.simTime * 5 + sh.x) * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(Math.sin(world.simTime * 2.5 + sh.x) * 0.15);
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(3.5, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-3.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Power-Up Orbs (Overdrive Surge, Aero Shield, Shard Magnet)
  for (const pu of world.powerUps) {
    if (pu.collected) continue;
    if (pu.x < renderCamX - 50 || pu.x > renderCamX + scaledViewW + 50) continue;
    const bob = Math.sin(world.simTime * 4 + pu.x * 0.02) * 6;
    const pulse = 0.75 + 0.25 * Math.sin(world.simTime * 7 + pu.x);
    const orbColor = pu.kind === 'surge' ? '#06B6D4' : pu.kind === 'shield' ? '#10B981' : '#F59E0B';
    const orbGlow =
      pu.kind === 'surge'
        ? 'rgba(6, 182, 212, 0.28)'
        : pu.kind === 'shield'
        ? 'rgba(16, 185, 129, 0.28)'
        : 'rgba(245, 158, 11, 0.28)';

    ctx.save();
    ctx.translate(pu.x, pu.y + bob);

    ctx.fillStyle = orbGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = orbColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Distinct Power-Up Icon
    ctx.strokeStyle = orbColor;
    ctx.fillStyle = orbColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (pu.kind === 'surge') {
      // Lightning bolt
      ctx.beginPath();
      ctx.moveTo(2, -7);
      ctx.lineTo(-4, 1);
      ctx.lineTo(1, 1);
      ctx.lineTo(-2, 7);
      ctx.lineTo(5, -1);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();
    } else if (pu.kind === 'shield') {
      // Shield emblem
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(6, -4);
      ctx.lineTo(5, 3);
      ctx.lineTo(0, 7);
      ctx.lineTo(-5, 3);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Magnet arc
      ctx.beginPath();
      ctx.arc(0, -1, 5.5, Math.PI, 0, false);
      ctx.lineTo(5.5, 5);
      ctx.moveTo(-5.5, -1);
      ctx.lineTo(-5.5, 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Parkour Enemies (Sentries & Hover Drones) + KO Spinouts
  for (const en of world.enemies) {
    if (en.defeated && (en.defeatTimer ?? 0) <= 0) continue;
    if (en.x < renderCamX - 70 || en.x > renderCamX + scaledViewW + 70) continue;

    const renderY =
      en.defeated || en.kind !== 'drone' ? en.y : en.y + Math.sin(world.simTime * 4 + en.phase) * 7;
    const alpha = en.defeated ? Math.max(0, (en.defeatTimer ?? 0) / 0.85) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    const cx = en.x + en.w * 0.5;
    const cy = renderY + en.h * 0.5;
    ctx.translate(cx, cy);
    if (en.defeated) {
      ctx.rotate((1 - alpha) * 9);
    }

    if (en.kind === 'drone') {
      // Security Drone hovering body + twin rotors + scanning optic
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = en.defeated ? '#F97316' : '#EF4444';
      ctx.lineWidth = 2;
      traceRoundedRect(ctx, -16, -9, 32, 18, 7);
      ctx.fill();
      ctx.stroke();

      // Spinning rotor blurs
      const bladeW = 10 + Math.sin(world.simTime * 38) * 3;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12 - bladeW * 0.5, -13);
      ctx.lineTo(-12 + bladeW * 0.5, -13);
      ctx.moveTo(12 - bladeW * 0.5, -13);
      ctx.lineTo(12 + bladeW * 0.5, -13);
      ctx.stroke();

      // Crimson eye optic
      ctx.fillStyle = en.defeated ? '#FBBF24' : '#EF4444';
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
      ctx.fill();

      if (!en.defeated) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
        ctx.beginPath();
        ctx.moveTo(-4, 7);
        ctx.lineTo(-18, 40);
        ctx.lineTo(18, 40);
        ctx.lineTo(4, 7);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Tactical Rooftop Sentry (Vector Hunter Silhouette with Red Visor + Stun Baton)
      const stride = en.defeated ? 0 : Math.sin(world.simTime * 7 + en.phase) * 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Legs
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.moveTo(-2, 4);
      ctx.lineTo(-5 - stride, 24);
      ctx.moveTo(2, 4);
      ctx.lineTo(5 + stride, 24);
      ctx.stroke();

      // Armored torso
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(-1, -13);
      ctx.stroke();

      // Tactical helmet + glowing red visor facing left toward player
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(-1, -19, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = en.defeated ? '#FDBA74' : '#EF4444';
      ctx.fillRect(-7, -21, 5.2, 2.8);

      // Extended electric stun baton
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(-2, -9);
      ctx.lineTo(-12, -4);
      ctx.stroke();

      ctx.strokeStyle = en.defeated ? '#FBBF24' : '#F87171';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(-20, -10);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Flying Mystery Chaser Spectral Afterimages & Figure
  const ch = world.chaser;
  const chSurging = ch.surgeTimer > 0 || world.player.x - ch.x < 145;
  for (const img of ch.afterimages) {
    if (img.x < renderCamX - 80 || img.x > renderCamX + scaledViewW + 80) continue;
    drawFlyingMysteryChaser(ctx, img.x, img.y, world.simTime, ch.variant, chSurging, true, img.alpha);
  }
  if (ch.x >= renderCamX - 90 && ch.x <= renderCamX + scaledViewW + 90) {
    drawFlyingMysteryChaser(ctx, ch.x, ch.y, world.simTime, ch.variant, chSurging, false, 1);
  }

  // Little player cloning animations (light kinetic echo silhouettes)
  const cloneTint =
    world.powerUpTimers.surge > 0
      ? { body: '#06B6D4', outline: '#A5F3FC', accent: '#67E8F9' }
      : { body: '#EA580C', outline: '#FEF08A', accent: '#FDBA74' };
  for (const img of world.player.afterimages) {
    const miniScale = 0.9 + img.alpha * 0.14;
    drawArticulatedRunner(
      ctx,
      img.x,
      img.y,
      img.w,
      img.h,
      img.facing,
      img.action,
      img.animTime,
      miniScale,
      miniScale,
      true,
      Math.max(0, img.alpha * 0.72),
      cloneTint
    );
  }

  // Dual-pass Kinetic Scarf Trail (Ignites with Pixy Flame at 3x+ Combo)
  const scarf = world.player.scarf;
  const comboFlame = world.comboCount >= 4;
  if (scarf.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle =
      world.powerUpTimers.surge > 0
        ? 'rgba(6, 182, 212, 0.45)'
        : comboFlame
        ? 'rgba(251, 191, 36, 0.58)'
        : 'rgba(249, 115, 22, 0.35)';
    ctx.lineWidth = comboFlame ? 13 : 10;
    ctx.beginPath();
    ctx.moveTo(scarf[0].x, scarf[0].y);
    for (let i = 1; i < scarf.length; i++) {
      ctx.lineTo(scarf[i].x, scarf[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle =
      world.powerUpTimers.surge > 0 ? '#22D3EE' : comboFlame ? '#FEF08A' : '#F97316';
    ctx.lineWidth = comboFlame ? 5.6 : 4.8;
    ctx.beginPath();
    ctx.moveTo(scarf[0].x, scarf[0].y);
    for (let i = 1; i < scarf.length; i++) {
      ctx.lineTo(scarf[i].x, scarf[i].y);
    }
    ctx.stroke();
  }

  // Runner
  const p = world.player;
  drawArticulatedRunner(
    ctx,
    p.x,
    p.y,
    p.w,
    p.h,
    p.facing,
    p.action,
    p.animTime,
    p.squashX,
    p.squashY,
    false,
    1
  );

  // Active Power-Up Energy Shields & Overdrive Rings on Runner
  if (world.powerUpTimers.shield > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.5, p.y + p.h * 0.5, 26, p.h * 0.65 + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (world.powerUpTimers.surge > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.72)';
    ctx.lineWidth = 2;
    const ringR = 24 + Math.sin(world.simTime * 16) * 4;
    ctx.beginPath();
    ctx.arc(p.x + p.w * 0.5, p.y + p.h * 0.5, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (world.powerUpTimers.magnet > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.48)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(p.x + p.w * 0.5, p.y + p.h * 0.5, 34 + (world.simTime * 28) % 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Foreground translucent tank glass overlay so the runner visibly passes inside & completely through Tank Buildings
  for (const plat of world.platforms) {
    if (plat.collapsed || plat.kind !== 'upperBuilding') continue;
    const b = getPlatformBounds(plat, world.simTime);
    if (b.x + plat.w < renderCamX - 100 || b.x > renderCamX + scaledViewW + 100) continue;
    if (b.y > renderCamY + scaledViewH + 160 || b.y + plat.h < renderCamY - 120) continue;
    if (!plat.tankViewHole && plat.h < 150) continue;

    const holePadX = Math.max(48, Math.round(plat.w * 0.11));
    const holePadTop = Math.max(30, Math.round(plat.h * 0.16));
    const holePadBot = Math.max(26, Math.round(plat.h * 0.14));
    const hx = b.x + holePadX;
    const hy = b.y + holePadTop;
    const hw = Math.max(120, plat.w - holePadX * 2);
    const hh = Math.max(70, plat.h - holePadTop - holePadBot);
    const hr = Math.min(22, hh * 0.18);

    ctx.save();
    traceRoundedRect(ctx, hx, hy, hw, hh, hr);
    ctx.clip();
    ctx.fillStyle = 'rgba(125, 211, 252, 0.08)';
    ctx.fillRect(hx, hy, hw, hh);
    ctx.fillStyle = 'rgba(224, 242, 254, 0.12)';
    for (let gx = hx - 40; gx < hx + hw + 60; gx += 165) {
      ctx.beginPath();
      ctx.moveTo(gx, hy + hh);
      ctx.lineTo(gx + 54, hy);
      ctx.lineTo(gx + 76, hy);
      ctx.lineTo(gx + 22, hy + hh);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Particles (Shockwaves, Velocity Sparks, Wind Streaks, Confetti, Dust)
  for (const pt of world.particles) {
    const ratio = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = ratio;
    if (pt.kind === 'ring') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 3 * ratio;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size + (1 - ratio) * 34, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pt.kind === 'streak') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x + pt.size * (0.4 + ratio * 0.6), pt.y);
      ctx.stroke();
    } else if (pt.kind === 'confetti') {
      ctx.translate(pt.x, pt.y);
      ctx.rotate(world.simTime * 9 + pt.x * 0.05);
      ctx.fillStyle = pt.color;
      ctx.fillRect(-pt.size * 0.5, -pt.size * 0.3, pt.size, pt.size * 0.6);
    } else if (pt.kind === 'spark') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = Math.max(1.5, pt.size * 0.55);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x - pt.vx * 0.025, pt.y - pt.vy * 0.025);
      ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Trick Callouts
  for (const c of world.callouts) {
    const alpha = Math.min(1, c.life / (c.maxLife * 0.5));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 14px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.isNight ? '#0F172A' : '#FFFFFF';
    ctx.fillText(c.text, c.x + 1, c.y + 1);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, c.x, c.y);
    ctx.restore();
  }

  // Boiling Hot Lava Sea Below All Rooftops & Gaps
  const lavaLeft = renderCamX - 240;
  const lavaRight = renderCamX + scaledViewW + 240;
  const lavaDepth = Math.max(460, renderCamY + scaledViewH - LAVA_SURFACE_Y + 320);

  // Rising superheated steam & orange glow above the boiling lava surface
  const surfaceGlow = ctx.createLinearGradient(0, LAVA_SURFACE_Y - 120, 0, LAVA_SURFACE_Y + 24);
  surfaceGlow.addColorStop(0, 'rgba(249, 115, 22, 0)');
  surfaceGlow.addColorStop(0.55, 'rgba(234, 88, 12, 0.24)');
  surfaceGlow.addColorStop(1, 'rgba(251, 146, 60, 0.65)');
  ctx.fillStyle = surfaceGlow;
  ctx.fillRect(lavaLeft, LAVA_SURFACE_Y - 120, lavaRight - lavaLeft, 144);

  // Back molten wave layer (dark crimson magma swell)
  ctx.fillStyle = '#991B1B';
  ctx.beginPath();
  ctx.moveTo(lavaLeft, LAVA_SURFACE_Y + lavaDepth);
  for (let lx = lavaLeft; lx <= lavaRight; lx += 36) {
    const wave =
      Math.sin(lx * 0.015 + world.simTime * 3.1) * 7 +
      Math.cos(lx * 0.031 - world.simTime * 2.2) * 4;
    ctx.lineTo(lx, LAVA_SURFACE_Y - 5 + wave);
  }
  ctx.lineTo(lavaRight, LAVA_SURFACE_Y + lavaDepth);
  ctx.closePath();
  ctx.fill();

  // Main churning boiling lava body gradient
  const lavaSeaGrad = ctx.createLinearGradient(0, LAVA_SURFACE_Y - 4, 0, LAVA_SURFACE_Y + 260);
  lavaSeaGrad.addColorStop(0, '#FB923C');
  lavaSeaGrad.addColorStop(0.18, '#EA580C');
  lavaSeaGrad.addColorStop(0.55, '#DC2626');
  lavaSeaGrad.addColorStop(1, '#450A0A');
  ctx.fillStyle = lavaSeaGrad;
  ctx.beginPath();
  ctx.moveTo(lavaLeft, LAVA_SURFACE_Y + lavaDepth);
  for (let lx = lavaLeft; lx <= lavaRight; lx += 28) {
    const boil =
      Math.sin(lx * 0.024 - world.simTime * 4.4) * 6 +
      Math.sin(lx * 0.062 + world.simTime * 7.2) * 3.5;
    ctx.lineTo(lx, LAVA_SURFACE_Y + boil);
  }
  ctx.lineTo(lavaRight, LAVA_SURFACE_Y + lavaDepth);
  ctx.closePath();
  ctx.fill();

  // Incandescent white-gold boiling surface crust line
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let lx = lavaLeft; lx <= lavaRight; lx += 28) {
    const boil =
      Math.sin(lx * 0.024 - world.simTime * 4.4) * 6 +
      Math.sin(lx * 0.062 + world.simTime * 7.2) * 3.5;
    if (lx === lavaLeft) ctx.moveTo(lx, LAVA_SURFACE_Y + boil);
    else ctx.lineTo(lx, LAVA_SURFACE_Y + boil);
  }
  ctx.stroke();

  // Churning submerged bright magma cells
  const cellStart = Math.floor(lavaLeft / 120) * 120;
  for (let cx = cellStart; cx < lavaRight; cx += 120) {
    const shift = Math.sin(world.simTime * 2.5 + cx * 0.03) * 16;
    const cy = LAVA_SURFACE_Y + 34 + ((Math.abs(cx * 37) % 45));
    ctx.fillStyle = 'rgba(253, 186, 116, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx + shift, cy, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boiling lava bubbles swelling and popping + rising hot embers
  const bubbleStart = Math.floor(lavaLeft / 68) * 68;
  for (let bx = bubbleStart; bx < lavaRight; bx += 68) {
    const seed = Math.abs(Math.sin(bx * 0.13)) * 10;
    const cycle = (world.simTime * (0.95 + (seed % 0.6)) + seed) % 1;
    const surfY =
      LAVA_SURFACE_Y +
      Math.sin(bx * 0.024 - world.simTime * 4.4) * 6 +
      Math.sin(bx * 0.062 + world.simTime * 7.2) * 3.5;

    // Boiling dome bubble on surface
    if (cycle < 0.72) {
      const r = 4 + (cycle / 0.72) * 10;
      ctx.fillStyle = '#FDBA74';
      ctx.strokeStyle = '#FEF9C3';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(bx, surfY + 3 - r * 0.35, r, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    } else {
      // Popping magma droplets
      const popT = (cycle - 0.72) / 0.28;
      ctx.fillStyle = `rgba(254, 240, 138, ${1 - popT})`;
      for (let d = -1; d <= 1; d++) {
        ctx.beginPath();
        ctx.arc(bx + d * (6 + popT * 12), surfY - 6 - Math.sin(popT * Math.PI) * 18, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rising incandescent ember sparks
    const emberCycle = (world.simTime * 0.72 + seed * 0.31) % 1;
    const ex = bx + 18 + Math.sin(world.simTime * 4.5 + seed) * 10;
    const ey = surfY - 8 - emberCycle * 72;
    ctx.fillStyle = `rgba(254, 215, 170, ${(1 - emberCycle) * 0.85})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 2.3 * (1 - emberCycle * 0.45), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // 5b. World Weather Layer (Rain Streaks + Rooftop Splashes, Wind Embers, or Atmospheric Motes)
  if (weather === 'rain' || weather === 'storm') {
    const dropCount = weather === 'storm' ? RAIN_DROPS.length : Math.floor(RAIN_DROPS.length * 0.65);
    ctx.save();
    ctx.strokeStyle = weather === 'storm' ? 'rgba(186, 230, 253, 0.42)' : 'rgba(203, 213, 225, 0.32)';
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < dropCount; i++) {
      const rd = RAIN_DROPS[i];
      const rx = (((rd.u * viewW - world.cameraX * 0.55 - world.simTime * 210) % viewW) + viewW) % viewW;
      const ry = ((rd.v * viewH + world.simTime * rd.speed) % viewH);
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - rd.len * 0.28, ry + rd.len);
    }
    ctx.stroke();

    // Subtle rain droplet splash ticks on visible rooftop edges
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.lineWidth = 1.2;
    for (const plat of world.platforms) {
      if (plat.kind !== 'building' && plat.kind !== 'upperBuilding') continue;
      const b = getPlatformBounds(plat, world.simTime);
      const sx = (b.x - renderCamX) * scale;
      const sy = (b.y - renderCamY) * scale;
      const sw = plat.w * scale;
      if (sx + sw < 0 || sx > viewW || sy < 0 || sy > viewH) continue;
      for (let sp = 0; sp < 3; sp++) {
        const spX = sx + ((sp * 137 + Math.floor(world.simTime * 14) * 59) % Math.max(20, Math.floor(sw)));
        ctx.beginPath();
        ctx.moveTo(spX - 3, sy - 3);
        ctx.lineTo(spX, sy);
        ctx.lineTo(spX + 3, sy - 3);
        ctx.stroke();
      }
    }
    ctx.restore();
  } else {
    ctx.save();
    for (let mi = 0; mi < MOTES.length; mi++) {
      const mt = MOTES[mi];
      const speedMult = theme.style === 'desert' ? 2.4 : theme.style === 'aurora' ? 0.65 : 1;
      const mx =
        (((mt.u * viewW - world.cameraX * 0.35 - world.simTime * mt.speedX * speedMult) % viewW) + viewW) % viewW;
      const my =
        (((mt.v * viewH +
          (theme.style === 'aurora' || theme.style === 'sakura' ? world.simTime * 28 : 0) +
          Math.sin(world.simTime * 1.4 + mt.phase) * 26) %
          viewH) +
          viewH) %
        viewH;

      if (theme.style === 'lava' || theme.style === 'eclipse') {
        ctx.fillStyle = theme.style === 'eclipse' ? 'rgba(251, 113, 133, 0.6)' : 'rgba(251, 146, 60, 0.56)';
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(world.simTime * 3 + mt.phase);
        ctx.fillRect(-mt.size * 1.4, -mt.size * 0.45, mt.size * 2.8, mt.size * 0.9);
        ctx.restore();
      } else if (theme.style === 'sakura') {
        ctx.fillStyle = mi % 2 === 0 ? 'rgba(249, 168, 212, 0.72)' : 'rgba(244, 114, 182, 0.62)';
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(world.simTime * 2.4 + mt.phase);
        ctx.beginPath();
        ctx.ellipse(0, 0, mt.size * 1.8, mt.size * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (theme.style === 'desert') {
        ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - 14 - mt.size * 3, my + 2);
        ctx.stroke();
      } else if (theme.style === 'aurora') {
        ctx.fillStyle = mi % 2 === 0 ? 'rgba(224, 242, 254, 0.72)' : 'rgba(103, 232, 249, 0.55)';
        ctx.beginPath();
        ctx.arc(mx, my, mt.size * 1.05, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.style === 'toxic') {
        ctx.fillStyle = mi % 2 === 0 ? 'rgba(190, 242, 100, 0.62)' : 'rgba(74, 222, 128, 0.5)';
        ctx.beginPath();
        ctx.arc(mx, my, mt.size * 1.15, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.style === 'neon') {
        ctx.fillStyle = mi % 2 === 0 ? 'rgba(34, 211, 238, 0.55)' : 'rgba(236, 72, 153, 0.48)';
        ctx.beginPath();
        ctx.arc(mx, my, mt.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = mi % 3 === 0 ? 'rgba(134, 239, 172, 0.52)' : 'rgba(254, 249, 195, 0.48)';
        ctx.beginPath();
        ctx.arc(mx, my, mt.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 6. Fast Foreground Parallax Silhouette Beams (Extreme Depth & Speed Feel)
  const foreLoopW = FORE_BEAMS.length * 520;
  const foreOffset = -(world.cameraX * 1.48) % foreLoopW;
  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
  for (let rep = -1; rep <= 2; rep++) {
    for (const fb of FORE_BEAMS) {
      const fx = foreOffset + rep * foreLoopW + fb.x;
      if (fx + fb.w < -40 || fx > viewW + 40) continue;
      ctx.fillRect(fx, viewH - fb.h * 0.45, fb.w, fb.h * 0.5);
    }
  }
  ctx.restore();

  // 7. Screen-Space Kinetic Speedlines
  if (world.speedLinesAlpha > 0.04) {
    ctx.save();
    ctx.globalAlpha = world.speedLinesAlpha * 0.36;
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineCap = 'round';
    const lineCount = 16;
    for (let i = 0; i < lineCount; i++) {
      const seed = (i * 197 + Math.floor(world.simTime * 28) * 31) % 1000;
      const bandTop = i % 2 === 0;
      const ly = bandTop ? (seed % Math.max(40, viewH * 0.24)) : viewH - (seed % Math.max(40, viewH * 0.24));
      const lx = (seed * 3.7) % viewW;
      const len = 60 + (seed % 140) * world.speedLinesAlpha;
      ctx.lineWidth = 1 + (i % 2);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - len, ly);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 8. Bullet-Time Focus Vignette during Tutorial Cue Wait
  if (world.tutorialActive && world.tutorialWaitingAction) {
    const focusGrad = ctx.createRadialGradient(
      viewW * 0.5,
      viewH * 0.5,
      Math.min(viewW, viewH) * 0.3,
      viewW * 0.5,
      viewH * 0.5,
      Math.max(viewW, viewH) * 0.78
    );
    focusGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
    focusGrad.addColorStop(1, 'rgba(234, 88, 12, 0.24)');
    ctx.fillStyle = focusGrad;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  // 9. Screen Impact / Boost Edge Flash
  if (world.flashAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = world.flashAlpha * 0.5;
    const flashGrad = ctx.createRadialGradient(
      viewW * 0.5,
      viewH * 0.5,
      Math.min(viewW, viewH) * 0.24,
      viewW * 0.5,
      viewH * 0.5,
      Math.max(viewW, viewH) * 0.75
    );
    flashGrad.addColorStop(0, 'rgba(0,0,0,0)');
    flashGrad.addColorStop(1, world.flashColor);
    ctx.fillStyle = flashGrad;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();
  }

  // 10. Flying Pursuer Close-Proximity Danger Pulse & Off-Screen Edge Marker
  if (!world.tutorialActive && !world.finished) {
    const gapPx = world.player.x - world.chaser.x;
    if (gapPx < 150) {
      const threat = Math.max(0, Math.min(1, (150 - gapPx) / 115));
      const pulse = 0.55 + 0.45 * Math.sin(world.simTime * 14);
      const edgeGrad = ctx.createLinearGradient(0, 0, Math.min(220, viewW * 0.28), 0);
      edgeGrad.addColorStop(0, `rgba(239, 68, 68, ${threat * pulse * 0.42})`);
      edgeGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, Math.min(220, viewW * 0.28), viewH);
    }

    if (world.chaser.x + 28 < renderCamX) {
      const chScreenY = Math.max(88, Math.min(viewH - 108, (world.chaser.y + 20 - renderCamY) * scale));
      const distM = Math.max(1, Math.round(gapPx / 28));
      const palette = CHASER_THEMES[world.chaser.variant] ?? CHASER_THEMES[0];
      const badgeColor = distM <= 5 ? '#EF4444' : palette.aura;

      ctx.save();
      ctx.translate(16, chScreenY);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      traceRoundedRect(ctx, 0, -15, 58, 30, 8);
      ctx.fill();
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Left-pointing danger chevron
      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(15, -5);
      ctx.lineTo(15, 5);
      ctx.closePath();
      ctx.fill();

      ctx.font = '700 13px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(`${distM}m`, 21, 0.5);
      ctx.restore();
    }
  }
}
