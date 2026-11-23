import type {
  CharacterCustomization,
  MultiplayerRemotePlayer,
  ReplayFrame,
  RunnerAction,
} from '../types/game';

export type MultiplayerRoomMode = 'race' | 'timeAttack' | 'survival' | 'meetup';

export interface PublicRoomSummary {
  code: string;
  name: string;
  mode: MultiplayerRoomMode;
  levelNumber: number;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  playerCount: number;
  spectatorCount: number;
}

export interface RoomParticipantInfo {
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
}

export interface RoomStateInfo {
  code: string;
  name: string;
  isPublic: boolean;
  mode: MultiplayerRoomMode;
  levelNumber: number;
  hostId: string;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  startedAt?: number;
  participants: RoomParticipantInfo[];
}

export interface RoomChatMessage {
  playerId: string;
  name: string;
  text: string;
  at: number;
}

export interface LeaderboardRecord {
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

export interface TournamentInfo {
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

export async function fetchLeaderboards(
  mode: 'global' | 'weekly' | 'rooftop' | 'longestJump',
  level?: number
): Promise<LeaderboardRecord[]> {
  const qs = new URLSearchParams({ mode });
  if (mode === 'rooftop' && level !== undefined) {
    qs.set('level', String(level));
  }
  const res = await fetch(`/api/leaderboards?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to load leaderboards');
  const data = (await res.json()) as { entries: LeaderboardRecord[] };
  return data.entries ?? [];
}

export async function submitLeaderboardRun(payload: {
  playerId: string;
  playerName: string;
  levelNumber: number;
  isEndless: boolean;
  timeSec: number;
  score: number;
  distanceMeters: number;
  longestJumpMeters: number;
  medal: 'Gold' | 'Silver' | 'Bronze' | 'None';
  appearance: CharacterCustomization;
  replayFrames: ReplayFrame[];
}): Promise<LeaderboardRecord | null> {
  try {
    const res = await fetch('/api/leaderboards/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { entry?: LeaderboardRecord };
    return data.entry ?? null;
  } catch {
    return null;
  }
}

export async function fetchGhostById(
  entryId: string
): Promise<{ entry: LeaderboardRecord; frames: ReplayFrame[] } | null> {
  try {
    const res = await fetch(`/api/ghost/${encodeURIComponent(entryId)}`);
    if (!res.ok) return null;
    return (await res.json()) as { entry: LeaderboardRecord; frames: ReplayFrame[] };
  } catch {
    return null;
  }
}

export async function fetchTournaments(): Promise<TournamentInfo[]> {
  const res = await fetch('/api/tournaments');
  if (!res.ok) throw new Error('Failed to load tournaments');
  const data = (await res.json()) as { tournaments: TournamentInfo[] };
  return data.tournaments ?? [];
}

export async function submitTournamentScore(
  tournamentId: string,
  payload: { playerId: string; playerName: string; timeSec: number; score: number }
): Promise<{ rank: number; tournament: TournamentInfo } | null> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as { rank: number; tournament: TournamentInfo };
  } catch {
    return null;
  }
}

export async function fetchPublicRooms(): Promise<PublicRoomSummary[]> {
  const res = await fetch('/api/rooms');
  if (!res.ok) throw new Error('Failed to load rooms');
  const data = (await res.json()) as { rooms: PublicRoomSummary[] };
  return data.rooms ?? [];
}

export type RoomEvent =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'room:joined'; room: RoomStateInfo; playerId: string }
  | { type: 'room:state'; room: RoomStateInfo }
  | { type: 'room:countdown'; seconds: number; room: RoomStateInfo }
  | { type: 'room:started'; room: RoomStateInfo }
  | { type: 'room:chat'; message: RoomChatMessage }
  | { type: 'room:error'; message: string }
  | { type: 'player:sync'; player: MultiplayerRemotePlayer };

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<(ev: RoomEvent) => void>();
  private lastSendAt = 0;

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public subscribe(listener: (ev: RoomEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(ev: RoomEvent) {
    for (const listener of this.listeners) {
      listener(ev);
    }
  }

  public connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      this.ws = ws;

      ws.onopen = () => {
        this.emit({ type: 'connected' });
        resolve();
      };
      ws.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };
      ws.onclose = () => {
        this.ws = null;
        this.emit({ type: 'disconnected' });
      };
      ws.onmessage = (msgEv) => {
        try {
          const data = JSON.parse(String(msgEv.data)) as Record<string, unknown>;
          const type = String(data.type ?? '');
          if (type === 'room:joined') {
            this.emit({
              type: 'room:joined',
              room: data.room as RoomStateInfo,
              playerId: String(data.playerId ?? ''),
            });
          } else if (type === 'room:state') {
            this.emit({ type: 'room:state', room: data.room as RoomStateInfo });
          } else if (type === 'room:countdown') {
            this.emit({
              type: 'room:countdown',
              seconds: Number(data.seconds) || 3,
              room: data.room as RoomStateInfo,
            });
          } else if (type === 'room:started') {
            this.emit({ type: 'room:started', room: data.room as RoomStateInfo });
          } else if (type === 'room:chat') {
            this.emit({
              type: 'room:chat',
              message: {
                playerId: String(data.playerId ?? ''),
                name: String(data.name ?? 'Runner'),
                text: String(data.text ?? ''),
                at: Number(data.at) || Date.now(),
              },
            });
          } else if (type === 'room:error') {
            this.emit({ type: 'room:error', message: String(data.message ?? 'Room error') });
          } else if (type === 'player:sync') {
            this.emit({ type: 'player:sync', player: data.player as MultiplayerRemotePlayer });
          }
        } catch {
          // Ignore malformed WS message
        }
      };
    });
  }

  public disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public async createRoom(params: {
    playerId: string;
    appearance: CharacterCustomization;
    roomName: string;
    isPublic: boolean;
    mode: MultiplayerRoomMode;
    levelNumber: number;
  }) {
    await this.connect();
    this.send({ type: 'room:create', ...params });
  }

  public async joinRoom(params: {
    playerId: string;
    appearance: CharacterCustomization;
    code: string;
    spectator?: boolean;
  }) {
    await this.connect();
    this.send({ type: 'room:join', ...params });
  }

  public leaveRoom() {
    this.send({ type: 'room:leave' });
  }

  public setReady(ready: boolean) {
    this.send({ type: 'room:ready', ready });
  }

  public updateRoomConfig(levelNumber: number, mode: MultiplayerRoomMode) {
    this.send({ type: 'room:config', levelNumber, mode });
  }

  public startRoomRace() {
    this.send({ type: 'room:start' });
  }

  public resetLobby() {
    this.send({ type: 'room:resetLobby' });
  }

  public sendChat(text: string) {
    this.send({ type: 'room:chat', text });
  }

  public sendPlayerState(state: {
    x: number;
    y: number;
    h: number;
    vx: number;
    vy: number;
    action: RunnerAction;
    facing: 1 | -1;
    progressPct: number;
    distanceMeters: number;
  }) {
    const now = performance.now();
    if (now - this.lastSendAt < 45) return;
    this.lastSendAt = now;
    this.send({ type: 'player:state', ...state });
  }

  public sendFinish(cleared: boolean, timeSec: number) {
    this.send({ type: 'player:finish', cleared, timeSec });
  }
}

export const multiplayerClient = new MultiplayerClient();
