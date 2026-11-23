import { CharacterCustomization, CourseDefinition, Platform, RivalRunnerState } from '../types/game';

export interface RivalTemplate {
  id: string;
  name: string;
  personality: string;
  skillFactor: number;
  riskBias: number;
  appearance: CharacterCustomization;
}

export const NPC_RIVAL_ROSTER: RivalTemplate[] = [
  {
    id: 'rival-kaito',
    name: 'BlitzKaito',
    personality: 'The Speedster',
    skillFactor: 1.04,
    riskBias: 0.72,
    appearance: {
      name: 'BlitzKaito',
      model: 'kuro',
      hairStyle: 'spiky',
      jacketColor: '#1E3A8A',
      trouserColor: '#0F172A',
      sneakerStyle: 'cyanPulse',
      scarfColor: '#22D3EE',
      accessory: 'visor',
      jumpStyle: 'stride',
      landStyle: 'roll',
    },
  },
  {
    id: 'rival-valkyrie',
    name: 'Valkyrie_J',
    personality: 'The Precision Jumper',
    skillFactor: 1.0,
    riskBias: 0.52,
    appearance: {
      name: 'Valkyrie_J',
      model: 'nova',
      hairStyle: 'ponytail',
      jacketColor: '#4C1D95',
      trouserColor: '#1E293B',
      sneakerStyle: 'volt',
      scarfColor: '#A855F7',
      accessory: 'halo',
      jumpStyle: 'aerial',
      landStyle: 'balance',
    },
  },
  {
    id: 'rival-ash',
    name: 'AshDaredevil',
    personality: 'The Risk Taker',
    skillFactor: 1.06,
    riskBias: 0.9,
    appearance: {
      name: 'AshDaredevil',
      model: 'vex',
      hairStyle: 'mohawk',
      jacketColor: '#7C2D12',
      trouserColor: '#0F172A',
      sneakerStyle: 'ember',
      scarfColor: '#F43F5E',
      accessory: 'wings',
      jumpStyle: 'flip',
      landStyle: 'slam',
    },
  },
  {
    id: 'rival-hex',
    name: 'HexShortcut',
    personality: 'The Shortcut Hunter',
    skillFactor: 0.98,
    riskBias: 0.8,
    appearance: {
      name: 'HexShortcut',
      model: 'kuro',
      hairStyle: 'hood',
      jacketColor: '#064E3B',
      trouserColor: '#0F172A',
      sneakerStyle: 'obsidian',
      scarfColor: '#4ADE80',
      accessory: 'visor',
      jumpStyle: 'spin',
      landStyle: 'roll',
    },
  },
  {
    id: 'rival-vesper',
    name: 'ApexVesper',
    personality: 'The Rooftop Champion',
    skillFactor: 1.09,
    riskBias: 0.85,
    appearance: {
      name: 'ApexVesper',
      model: 'aria',
      hairStyle: 'swept',
      jacketColor: '#881337',
      trouserColor: '#0F172A',
      sneakerStyle: 'goldApex',
      scarfColor: '#FACC15',
      accessory: 'crown',
      jumpStyle: 'aerial',
      landStyle: 'slam',
    },
  },
];

export function createRivalsForCourse(course: CourseDefinition, count = 2): RivalRunnerState[] {
  const seed = Math.max(1, course.levelNumber ?? 7);
  const out: RivalRunnerState[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = NPC_RIVAL_ROSTER[(seed + i * 2) % NPC_RIVAL_ROSTER.length];
    out.push({
      id: `${tpl.id}-${i}`,
      name: tpl.name,
      personality: tpl.personality,
      appearance: tpl.appearance,
      x: course.startX + 18 + i * 26,
      y: course.startY,
      w: 26,
      h: 54,
      vx: course.baseSpeed * tpl.skillFactor,
      vy: 0,
      grounded: true,
      action: 'run',
      animTime: i * 0.4,
      skillFactor: tpl.skillFactor,
      riskBias: tpl.riskBias,
      jumpCooldown: 0,
      finished: false,
    });
  }
  return out;
}

export function stepRivalRunners(
  rivals: RivalRunnerState[],
  platforms: Platform[],
  baseSpeed: number,
  finishX: number,
  isEndless: boolean,
  elapsedTime: number,
  dt: number
) {
  for (const r of rivals) {
    if (r.finished) continue;
    r.animTime += dt;
    if (r.jumpCooldown > 0) r.jumpCooldown = Math.max(0, r.jumpCooldown - dt);

    // Physics-respecting forward cruise + edge/gap jumping
    const targetVx = baseSpeed * r.skillFactor * (0.98 + Math.sin(elapsedTime * 1.4 + r.riskBias * 5) * 0.04);
    r.vx += (targetVx - r.vx) * Math.min(1, dt * 8);
    r.x += r.vx * dt;

    // Look ahead for gap or elevated bridge
    let groundPlat: Platform | null = null;
    let aheadPlat: Platform | null = null;
    const footX = r.x + r.w * 0.5;
    for (const p of platforms) {
      if (p.collapsed || p.kind === 'overhead') continue;
      if (footX >= p.x && footX <= p.x + p.w) {
        if (!groundPlat || p.y < groundPlat.y) {
          if (Math.abs(p.y - (r.y + r.h)) < 110 || r.y + r.h <= p.y + 24) {
            groundPlat = p;
          }
        }
      }
      if (p.x > r.x && p.x < r.x + 260 && p.y <= r.y + r.h + 40) {
        if (!aheadPlat || p.x < aheadPlat.x) aheadPlat = p;
      }
    }

    // Trigger natural jump near edge of current building or toward higher platform
    if (r.grounded && r.jumpCooldown <= 0) {
      const nearEdge = groundPlat && r.x + r.w > groundPlat.x + groundPlat.w - 38;
      const stepUpAhead = aheadPlat && aheadPlat.y < r.y + r.h - 24 && aheadPlat.x - (r.x + r.w) < 115;
      if (nearEdge || stepUpAhead || !groundPlat) {
        r.vy = stepUpAhead ? -720 : -670;
        r.grounded = false;
        r.jumpCooldown = 0.28;
      }
    }

    r.vy += 1780 * dt;
    if (r.vy > 1050) r.vy = 1050;
    const prevFoot = r.y + r.h;
    r.y += r.vy * dt;
    r.grounded = false;

    for (const p of platforms) {
      if (p.collapsed || p.kind === 'overhead') continue;
      if (r.x + r.w > p.x && r.x < p.x + p.w && r.vy >= 0) {
        if (prevFoot <= p.y + 22 && r.y + r.h >= p.y) {
          r.y = p.y - r.h;
          r.vy = 0;
          r.grounded = true;
          break;
        }
      }
    }

    // Natural recovery if an NPC misses a gap above lava
    if (r.y + r.h >= 660) {
      r.vy = -780;
      r.vx = baseSpeed * 0.94;
      r.grounded = false;
    }

    r.action = r.grounded ? 'run' : r.vy < 0 ? 'jump' : 'fall';

    if (!isEndless && r.x >= finishX) {
      r.finished = true;
      r.finishTime = elapsedTime;
      r.action = 'idle';
    }
  }
}
