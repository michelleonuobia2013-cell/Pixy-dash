import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  CharacterCustomization,
  ReplayFrame,
  RunnerAction,
} from './src/types/game.js';

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'pixy-store.json');

if (!STORE_PATH.startsWith(DATA_DIR + path.sep)) {
  throw new Error('Unsafe storage path configuration');
}

interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  levelNumber: number;
  isEndless: boolean;
  timeSec: number;
  score: number;
  distanceMeters: number;
  longestJumpMeters: number;
  medal: 'Gold' | 'Silver' | 'Bronze' | 'None';
  weekKey: string;
  createdAt: number;
  appearance: CharacterCustomization;
  hasGhost: boolean;
}

interface TournamentRecord {
  id: string;
  title: string;
  subtitle: string;
  levelNumber: number;
  endsAt: number;
  rewardCoins: number;
  rewardTitle: string;
  entries: Array<{
    playerId: string;
    playerName: string;
    timeSec: number;
    score: number;
    submittedAt: number;
  }>;
}

interface PersistedStore {
  leaderboards: LeaderboardEntry[];
  ghosts: Record<string, ReplayFrame[]>;
  tournaments: TournamentRecord[];
}

export type MultiplayerRoomMode = 'race' | 'timeAttack' | 'survival' | 'meetup';

interface RoomParticipant {
  playerId: string;
  name: string;
  ready: boolean;
  spectator: boolean;
  appearance: CharacterCustomization;
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
  eliminated?: boolean;
  ws: WebSocket;
}

interface MultiplayerRoom {
  code: string;
  name: string;
  isPublic: boolean;
  mode: MultiplayerRoomMode;
  levelNumber: number;
  hostId: string;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  createdAt: number;
  startedAt?: number;
  participants: Map<string, RoomParticipant>;
}

const DEFAULT_APPEARANCE: CharacterCustomization = {
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

const PRESET_EMOTES = new Set([
  'Ready!',
  'Good luck!',
  'Nice leap!',
  'Catch me!',
  'Close race!',
  'GG!',
]);

function getWeekKey(): string {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function sanitizeText(raw: unknown, maxLen: number, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[^\w\s\-_.!]/g, '').trim().slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeHexColor(raw: unknown, fallback: string): string {
  if (typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  return fallback;
}

function sanitizeAppearance(raw: unknown): CharacterCustomization {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_APPEARANCE };
  const obj = raw as Record<string, unknown>;
  const models = new Set(['pixy', 'kuro', 'nova', 'vex', 'aria']);
  const hairs = new Set(['spiky', 'ponytail', 'hood', 'mohawk', 'swept']);
  const sneakers = new Set(['ember', 'cyanPulse', 'volt', 'obsidian', 'goldApex']);
  const accessories = new Set(['none', 'visor', 'halo', 'wings', 'crown']);
  const jumps = new Set(['stride', 'flip', 'spin', 'aerial']);
  const lands = new Set(['roll', 'slam', 'balance']);

  return {
    name: sanitizeText(obj.name, 16, 'Pixy'),
    model: models.has(String(obj.model)) ? (String(obj.model) as CharacterCustomization['model']) : 'pixy',
    hairStyle: hairs.has(String(obj.hairStyle)) ? (String(obj.hairStyle) as CharacterCustomization['hairStyle']) : 'spiky',
    jacketColor: sanitizeHexColor(obj.jacketColor, '#0F172A'),
    trouserColor: sanitizeHexColor(obj.trouserColor, '#1E293B'),
    sneakerStyle: sneakers.has(String(obj.sneakerStyle))
      ? (String(obj.sneakerStyle) as CharacterCustomization['sneakerStyle'])
      : 'ember',
    scarfColor: sanitizeHexColor(obj.scarfColor, '#F97316'),
    accessory: accessories.has(String(obj.accessory))
      ? (String(obj.accessory) as CharacterCustomization['accessory'])
      : 'none',
    jumpStyle: jumps.has(String(obj.jumpStyle))
      ? (String(obj.jumpStyle) as CharacterCustomization['jumpStyle'])
      : 'stride',
    landStyle: lands.has(String(obj.landStyle))
      ? (String(obj.landStyle) as CharacterCustomization['landStyle'])
      : 'roll',
  };
}

const VALID_RUNNER_ACTIONS = new Set<RunnerAction>([
  'idle',
  'run',
  'jump',
  'doubleJump',
  'fall',
  'wallSlide',
  'wallRun',
  'slide',
  'roll',
  'grind',
  'hangGlide',
  'mantle',
]);

function sanitizeReplayFrames(raw: unknown): ReplayFrame[] {
  if (!Array.isArray(raw)) return [];
  const out: ReplayFrame[] = [];
  const step = Math.max(1, Math.floor(raw.length / 180));
  for (let i = 0; i < raw.length && out.length < 180; i += step) {
    const f = raw[i];
    if (!f || typeof f !== 'object') continue;
    const obj = f as Record<string, unknown>;
    const t = Number(obj.t);
    const x = Number(obj.x);
    const y = Number(obj.y);
    const h = Number(obj.h);
    const vx = Number(obj.vx);
    if (!Number.isFinite(t) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({
      t: Math.max(0, Math.min(3600, t)),
      x: Math.max(-500, Math.min(250000, x)),
      y: Math.max(-3000, Math.min(2500, y)),
      h: h === 26 ? 26 : 54,
      action: VALID_RUNNER_ACTIONS.has(String(obj.action) as RunnerAction)
        ? (String(obj.action) as RunnerAction)
        : 'run',
      facing: obj.facing === -1 ? -1 : 1,
      vx: Number.isFinite(vx) ? Math.max(-1200, Math.min(2200, vx)) : 400,
    });
  }
  return out;
}

function createInitialTournaments(): TournamentRecord[] {
  const now = Date.now();
  return [
    {
      id: 'tour-neon-sprint',
      title: 'Neon Skyline Sprint Open',
      subtitle: 'Stage 212 · Fastest Rooftop Finish',
      levelNumber: 212,
      endsAt: now + 1000 * 60 * 60 * 24 * 3,
      rewardCoins: 800,
      rewardTitle: 'Neon Champion',
      entries: [],
    },
    {
      id: 'tour-storm-gauntlet',
      title: 'Storm District Slipstream Cup',
      subtitle: 'Stage 265 · Wet Rooftop Speed Trial',
      levelNumber: 265,
      endsAt: now + 1000 * 60 * 60 * 24 * 5,
      rewardCoins: 1100,
      rewardTitle: 'Storm Strider',
      entries: [],
    },
    {
      id: 'tour-rooftop-500',
      title: 'Rooftop 500 Grand Apex',
      subtitle: 'Stage 500 · The Final Leap Championship',
      levelNumber: 500,
      endsAt: now + 1000 * 60 * 60 * 24 * 7,
      rewardCoins: 2500,
      rewardTitle: 'Apex Legend 500',
      entries: [],
    },
  ];
}

function loadStore(): PersistedStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedStore>;
      const tournaments = Array.isArray(parsed.tournaments) && parsed.tournaments.length > 0
        ? parsed.tournaments
        : createInitialTournaments();
      return {
        leaderboards: Array.isArray(parsed.leaderboards) ? parsed.leaderboards : [],
        ghosts: parsed.ghosts && typeof parsed.ghosts === 'object' ? parsed.ghosts : {},
        tournaments,
      };
    }
  } catch (err) {
    console.warn('Could not read pixy-store.json, initializing fresh store:', err);
  }
  const initial: PersistedStore = {
    leaderboards: [],
    ghosts: {},
    tournaments: createInitialTournaments(),
  };
  saveStore(initial);
  return initial;
}

function saveStore(store: PersistedStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store), 'utf8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.warn('Failed to persist store:', err);
  }
}

const store = loadStore();
const rooms = new Map<string, MultiplayerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function serializeRoom(room: MultiplayerRoom) {
  return {
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    mode: room.mode,
    levelNumber: room.levelNumber,
    hostId: room.hostId,
    status: room.status,
    startedAt: room.startedAt,
    participants: Array.from(room.participants.values()).map((p) => ({
      playerId: p.playerId,
      name: p.name,
      ready: p.ready,
      spectator: p.spectator,
      appearance: p.appearance,
      x: p.x,
      y: p.y,
      h: p.h,
      vx: p.vx,
      vy: p.vy,
      action: p.action,
      facing: p.facing,
      progressPct: p.progressPct,
      distanceMeters: p.distanceMeters,
      finished: p.finished,
      finishTime: p.finishTime,
      eliminated: p.eliminated,
    })),
  };
}

function broadcastRoom(room: MultiplayerRoom, payload: unknown, excludeId?: string) {
  const encoded = JSON.stringify(payload);
  for (const participant of room.participants.values()) {
    if (excludeId && participant.playerId === excludeId) continue;
    if (participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.send(encoded);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size, leaderboardCount: store.leaderboards.length });
  });

  app.get('/api/leaderboards', (req, res) => {
    const mode = String(req.query.mode ?? 'global');
    const levelFilter = req.query.level ? Number(req.query.level) : undefined;
    const currentWeek = getWeekKey();

    let entries = [...store.leaderboards];
    if (mode === 'weekly') {
      entries = entries.filter((e) => e.weekKey === currentWeek);
    } else if (mode === 'rooftop' && Number.isFinite(levelFilter)) {
      entries = entries.filter((e) => !e.isEndless && e.levelNumber === Math.round(levelFilter!));
    }

    if (mode === 'longestJump') {
      entries.sort((a, b) => b.longestJumpMeters - a.longestJumpMeters || b.score - a.score);
    } else if (mode === 'rooftop') {
      entries.sort((a, b) => a.timeSec - b.timeSec || b.score - a.score);
    } else {
      entries.sort((a, b) => b.score - a.score || b.distanceMeters - a.distanceMeters);
    }

    res.json({
      entries: entries.slice(0, 50),
      weekKey: currentWeek,
    });
  });

  app.post('/api/leaderboards/submit', (req, res) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const playerId = sanitizeText(body.playerId, 32, '');
    const playerName = sanitizeText(body.playerName, 16, 'Runner');
    const levelNumber = Math.max(1, Math.min(500, Math.round(Number(body.levelNumber) || 1)));
    const isEndless = Boolean(body.isEndless);
    const timeSec = Number(body.timeSec);
    const score = Math.max(0, Math.min(5_000_000, Math.round(Number(body.score) || 0)));
    const distanceMeters = Math.max(0, Math.min(100_000, Math.round(Number(body.distanceMeters) || 0)));
    const longestJumpMeters = Math.max(0, Math.min(500, Number(body.longestJumpMeters) || 0));
    const medalRaw = String(body.medal ?? 'None');
    const medal: LeaderboardEntry['medal'] =
      medalRaw === 'Gold' || medalRaw === 'Silver' || medalRaw === 'Bronze' ? medalRaw : 'None';

    if (!playerId || !Number.isFinite(timeSec) || timeSec < 1.5 || timeSec > 7200) {
      res.status(400).json({ error: 'Run telemetry outside valid bounds' });
      return;
    }

    // Plausibility check against impossible speeds (>85 m/s sustained)
    if (distanceMeters > timeSec * 85 + 60) {
      res.status(400).json({ error: 'Run velocity failed verification' });
      return;
    }

    const id = `lb-${crypto.randomUUID().slice(0, 12)}`;
    const frames = sanitizeReplayFrames(body.replayFrames);
    const hasGhost = frames.length >= 6;
    if (hasGhost) {
      store.ghosts[id] = frames;
    }

    const entry: LeaderboardEntry = {
      id,
      playerId,
      playerName,
      levelNumber,
      isEndless,
      timeSec: Number(timeSec.toFixed(2)),
      score,
      distanceMeters,
      longestJumpMeters: Number(longestJumpMeters.toFixed(1)),
      medal,
      weekKey: getWeekKey(),
      createdAt: Date.now(),
      appearance: sanitizeAppearance(body.appearance),
      hasGhost,
    };

    store.leaderboards.push(entry);
    // Keep top 400 records globally + clean orphaned ghosts
    if (store.leaderboards.length > 400) {
      store.leaderboards.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
      const removed = store.leaderboards.splice(400);
      for (const r of removed) {
        delete store.ghosts[r.id];
      }
    }

    saveStore(store);
    res.json({ ok: true, entry });
  });

  app.get('/api/ghost/:entryId', (req, res) => {
    const entryId = sanitizeText(req.params.entryId, 40, '');
    const entry = store.leaderboards.find((e) => e.id === entryId);
    const frames = store.ghosts[entryId];
    if (!entry || !frames) {
      res.status(404).json({ error: 'Ghost not found' });
      return;
    }
    res.json({
      entry,
      frames,
    });
  });

  app.get('/api/tournaments', (_req, res) => {
    const now = Date.now();
    // Refresh expired tournaments automatically so events stay live
    let dirty = false;
    for (const t of store.tournaments) {
      if (t.endsAt < now) {
        t.endsAt = now + 1000 * 60 * 60 * 24 * 4;
        t.entries = [];
        dirty = true;
      }
    }
    if (dirty) saveStore(store);
    res.json({ tournaments: store.tournaments });
  });

  app.post('/api/tournaments/:id/submit', (req, res) => {
    const tourId = sanitizeText(req.params.id, 40, '');
    const tournament = store.tournaments.find((t) => t.id === tourId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body) {
      res.status(400).json({ error: 'Missing body' });
      return;
    }
    const playerId = sanitizeText(body.playerId, 32, '');
    const playerName = sanitizeText(body.playerName, 16, 'Runner');
    const timeSec = Number(body.timeSec);
    const score = Math.max(0, Math.min(5_000_000, Math.round(Number(body.score) || 0)));

    if (!playerId || !Number.isFinite(timeSec) || timeSec < 2 || timeSec > 3600) {
      res.status(400).json({ error: 'Invalid tournament submission' });
      return;
    }

    const existingIdx = tournament.entries.findIndex((e) => e.playerId === playerId);
    const record = {
      playerId,
      playerName,
      timeSec: Number(timeSec.toFixed(2)),
      score,
      submittedAt: Date.now(),
    };

    if (existingIdx >= 0) {
      if (record.timeSec < tournament.entries[existingIdx].timeSec) {
        tournament.entries[existingIdx] = record;
      }
    } else {
      tournament.entries.push(record);
    }

    tournament.entries.sort((a, b) => a.timeSec - b.timeSec || b.score - a.score);
    tournament.entries = tournament.entries.slice(0, 50);
    saveStore(store);

    const rank = tournament.entries.findIndex((e) => e.playerId === playerId) + 1;
    res.json({ ok: true, rank, tournament });
  });

  app.get('/api/rooms', (_req, res) => {
    const publicRooms = Array.from(rooms.values())
      .filter((r) => r.isPublic && r.participants.size > 0)
      .map((r) => ({
        code: r.code,
        name: r.name,
        mode: r.mode,
        levelNumber: r.levelNumber,
        status: r.status,
        playerCount: Array.from(r.participants.values()).filter((p) => !p.spectator).length,
        spectatorCount: Array.from(r.participants.values()).filter((p) => p.spectator).length,
      }));
    res.json({ rooms: publicRooms });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });

  wss.on('connection', (ws) => {
    let activeRoomCode: string | null = null;
    let activePlayerId: string | null = null;

    const leaveCurrentRoom = () => {
      if (!activeRoomCode || !activePlayerId) return;
      const room = rooms.get(activeRoomCode);
      if (room) {
        room.participants.delete(activePlayerId);
        if (room.participants.size === 0) {
          rooms.delete(room.code);
        } else {
          if (room.hostId === activePlayerId) {
            const first = room.participants.values().next().value;
            if (first) room.hostId = first.playerId;
          }
          broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        }
      }
      activeRoomCode = null;
      activePlayerId = null;
    };

    ws.on('message', (rawBuf) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawBuf.toString('utf8')) as Record<string, unknown>;
      } catch {
        return;
      }
      const type = String(msg.type ?? '');

      if (type === 'room:create') {
        leaveCurrentRoom();
        const playerId = sanitizeText(msg.playerId, 32, crypto.randomUUID().slice(0, 10));
        const appearance = sanitizeAppearance(msg.appearance);
        const modeRaw = String(msg.mode ?? 'race');
        const mode: MultiplayerRoomMode =
          modeRaw === 'timeAttack' || modeRaw === 'survival' || modeRaw === 'meetup' ? modeRaw : 'race';
        const levelNumber = Math.max(1, Math.min(500, Math.round(Number(msg.levelNumber) || 1)));
        const isPublic = msg.isPublic !== false;
        const roomName = sanitizeText(msg.roomName, 28, `${appearance.name}'s Rooftop`);
        const code = generateRoomCode();

        const room: MultiplayerRoom = {
          code,
          name: roomName,
          isPublic,
          mode,
          levelNumber,
          hostId: playerId,
          status: 'lobby',
          createdAt: Date.now(),
          participants: new Map(),
        };

        room.participants.set(playerId, {
          playerId,
          name: appearance.name,
          ready: true,
          spectator: false,
          appearance,
          x: 0,
          y: 0,
          h: 54,
          vx: 0,
          vy: 0,
          action: 'idle',
          facing: 1,
          progressPct: 0,
          distanceMeters: 0,
          finished: false,
          ws,
        });

        rooms.set(code, room);
        activeRoomCode = code;
        activePlayerId = playerId;
        ws.send(JSON.stringify({ type: 'room:joined', room: serializeRoom(room), playerId }));
        return;
      }

      if (type === 'room:join') {
        leaveCurrentRoom();
        const code = sanitizeText(msg.code, 10, '').toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'room:error', message: 'Room code not found.' }));
          return;
        }
        const playerId = sanitizeText(msg.playerId, 32, crypto.randomUUID().slice(0, 10));
        const appearance = sanitizeAppearance(msg.appearance);
        const spectator = Boolean(msg.spectator) || room.status === 'racing';

        if (!spectator && Array.from(room.participants.values()).filter((p) => !p.spectator).length >= 10) {
          ws.send(JSON.stringify({ type: 'room:error', message: 'Room is full (10 racers max). Join as spectator!' }));
          return;
        }

        room.participants.set(playerId, {
          playerId,
          name: appearance.name,
          ready: false,
          spectator,
          appearance,
          x: 0,
          y: 0,
          h: 54,
          vx: 0,
          vy: 0,
          action: 'idle',
          facing: 1,
          progressPct: 0,
          distanceMeters: 0,
          finished: false,
          ws,
        });

        activeRoomCode = code;
        activePlayerId = playerId;
        ws.send(JSON.stringify({ type: 'room:joined', room: serializeRoom(room), playerId }));
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) }, playerId);
        return;
      }

      if (type === 'room:leave') {
        leaveCurrentRoom();
        return;
      }

      if (!activeRoomCode || !activePlayerId) return;
      const room = rooms.get(activeRoomCode);
      if (!room) return;
      const me = room.participants.get(activePlayerId);
      if (!me) return;

      if (type === 'room:ready') {
        me.ready = Boolean(msg.ready);
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        return;
      }

      if (type === 'room:config' && room.hostId === activePlayerId && room.status === 'lobby') {
        if (msg.levelNumber !== undefined) {
          room.levelNumber = Math.max(1, Math.min(500, Math.round(Number(msg.levelNumber) || 1)));
        }
        const modeRaw = String(msg.mode ?? '');
        if (modeRaw === 'race' || modeRaw === 'timeAttack' || modeRaw === 'survival' || modeRaw === 'meetup') {
          room.mode = modeRaw;
        }
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        return;
      }

      if (type === 'room:start' && room.hostId === activePlayerId) {
        room.status = 'countdown';
        for (const p of room.participants.values()) {
          p.finished = false;
          p.finishTime = undefined;
          p.eliminated = false;
          p.progressPct = 0;
          p.distanceMeters = 0;
        }
        broadcastRoom(room, { type: 'room:countdown', seconds: 3, room: serializeRoom(room) });
        setTimeout(() => {
          const r = rooms.get(room.code);
          if (!r || r.status !== 'countdown') return;
          r.status = 'racing';
          r.startedAt = Date.now();
          broadcastRoom(r, { type: 'room:started', room: serializeRoom(r) });
        }, 2400);
        return;
      }

      if (type === 'room:resetLobby' && room.hostId === activePlayerId) {
        room.status = 'lobby';
        for (const p of room.participants.values()) {
          p.finished = false;
          p.finishTime = undefined;
          p.eliminated = false;
        }
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        return;
      }

      if (type === 'room:chat') {
        const emote = String(msg.text ?? '');
        if (!PRESET_EMOTES.has(emote)) return;
        broadcastRoom(room, {
          type: 'room:chat',
          playerId: me.playerId,
          name: me.name,
          text: emote,
          at: Date.now(),
        });
        return;
      }

      if (type === 'player:state' && !me.spectator) {
        const rawAction = String(msg.action ?? 'run') as RunnerAction;
        me.x = Math.max(-500, Math.min(250000, Number(msg.x) || 0));
        me.y = Math.max(-3000, Math.min(2500, Number(msg.y) || 0));
        me.h = msg.h === 26 ? 26 : 54;
        me.vx = Math.max(-1200, Math.min(2200, Number(msg.vx) || 0));
        me.vy = Math.max(-2000, Math.min(2500, Number(msg.vy) || 0));
        me.action = VALID_RUNNER_ACTIONS.has(rawAction) ? rawAction : 'run';
        me.facing = msg.facing === -1 ? -1 : 1;
        me.progressPct = Math.max(0, Math.min(100, Math.round(Number(msg.progressPct) || 0)));
        me.distanceMeters = Math.max(0, Math.min(100000, Math.round(Number(msg.distanceMeters) || 0)));

        broadcastRoom(
          room,
          {
            type: 'player:sync',
            player: {
              playerId: me.playerId,
              name: me.name,
              x: me.x,
              y: me.y,
              h: me.h,
              vx: me.vx,
              vy: me.vy,
              action: me.action,
              facing: me.facing,
              progressPct: me.progressPct,
              distanceMeters: me.distanceMeters,
              finished: me.finished,
              finishTime: me.finishTime,
              appearance: me.appearance,
            },
          },
          me.playerId
        );
        return;
      }

      if (type === 'player:finish' && !me.spectator) {
        const cleared = Boolean(msg.cleared);
        const timeSec = Math.max(1, Math.min(7200, Number(msg.timeSec) || 0));
        me.finished = true;
        me.eliminated = !cleared && room.mode === 'survival';
        if (cleared) {
          me.finishTime = Number(timeSec.toFixed(2));
          me.progressPct = 100;
        }
        const activeRacers = Array.from(room.participants.values()).filter((p) => !p.spectator);
        if (activeRacers.length > 0 && activeRacers.every((p) => p.finished)) {
          room.status = 'finished';
        }
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
      }
    });

    ws.on('close', leaveCurrentRoom);
    ws.on('error', leaveCurrentRoom);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PIXy DASH server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
