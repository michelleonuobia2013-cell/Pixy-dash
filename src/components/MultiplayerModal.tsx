import { Copy, Eye, Globe, Lock, MessageSquare, Play, RefreshCw, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlayerProfile } from '../engine/progression';
import {
  fetchPublicRooms,
  multiplayerClient,
  MultiplayerRoomMode,
  PublicRoomSummary,
  RoomChatMessage,
  RoomStateInfo,
} from '../utils/multiplayerClient';

interface MultiplayerModalProps {
  profile: PlayerProfile;
  currentStage: number;
  activeRoom: RoomStateInfo | null;
  chatLog: RoomChatMessage[];
  initialJoinCode?: string;
  compactLayout: boolean;
  onRoomUpdated: (room: RoomStateInfo | null) => void;
  onClose: () => void;
}

const MODE_LABELS: Record<MultiplayerRoomMode, string> = {
  race: 'Rooftop Race',
  timeAttack: 'Time Attack',
  survival: 'Survival Parkour',
  meetup: 'Open Rooftop Meetup',
};

const QUICK_EMOTES = ['Ready!', 'Good luck!', 'Nice leap!', 'Catch me!', 'Close race!', 'GG!'];

export function MultiplayerModal({
  profile,
  currentStage,
  activeRoom,
  chatLog,
  initialJoinCode,
  compactLayout,
  onRoomUpdated,
  onClose,
}: MultiplayerModalProps) {
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [roomName, setRoomName] = useState(`${profile.customization.name}'s Rooftop`);
  const [roomMode, setRoomMode] = useState<MultiplayerRoomMode>('race');
  const [roomStage, setRoomStage] = useState<number>(currentStage);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [joinCode, setJoinCode] = useState<string>(initialJoinCode ?? '');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(false);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const rooms = await fetchPublicRooms();
      setPublicRooms(rooms);
    } catch {
      setError('Unable to reach multiplayer server.');
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (!activeRoom) {
      void loadRooms();
    }
    const unsub = multiplayerClient.subscribe((ev) => {
      if (ev.type === 'room:error') {
        setError(ev.message);
      }
    });
    return unsub;
  }, [activeRoom]);

  const handleCreate = async () => {
    setError('');
    try {
      await multiplayerClient.createRoom({
        playerId: profile.playerId,
        appearance: profile.customization,
        roomName,
        isPublic,
        mode: roomMode,
        levelNumber: roomStage,
      });
    } catch {
      setError('Could not connect to multiplayer WebSocket server.');
    }
  };

  const handleJoin = async (code: string, spectator = false) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError('Enter a 6-character room code.');
      return;
    }
    setError('');
    try {
      await multiplayerClient.joinRoom({
        playerId: profile.playerId,
        appearance: profile.customization,
        code: clean,
        spectator,
      });
    } catch {
      setError('Could not connect to multiplayer WebSocket server.');
    }
  };

  const handleCopyInvite = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const me = activeRoom?.participants.find((p) => p.playerId === profile.playerId);
  const isHost = activeRoom?.hostId === profile.playerId;

  return (
    <div className="animate-backdrop-fade fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
      <div
        className={`animate-modal-pop flex max-h-full w-full max-w-3xl flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl ${
          compactLayout ? 'p-3.5' : 'p-5'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Users className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-50">
                {activeRoom ? `Room ${activeRoom.code} · ${activeRoom.name}` : 'Online Multiplayer Rooftops'}
              </h2>
              <p className="text-xs text-slate-400">
                Live WebSocket multiplayer rooms · Racers, Spectators &amp; Private Invite Links
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Multiplayer"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {activeRoom ? (
          <div className="mt-4 flex flex-col gap-4 overflow-y-auto pr-1">
            {/* Room Info & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-tabular text-emerald-400">
                  <span>{MODE_LABELS[activeRoom.mode]}</span>
                  <span>·</span>
                  <span>Stage {activeRoom.levelNumber}</span>
                  <span>·</span>
                  <span>Code: {activeRoom.code}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {activeRoom.status === 'lobby'
                    ? 'Waiting for host to launch race...'
                    : activeRoom.status === 'countdown'
                    ? 'Race starting...'
                    : 'Race in progress'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyInvite(activeRoom.code)}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{copied ? 'Copied Link!' : 'Copy Invite Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    multiplayerClient.leaveRoom();
                    onRoomUpdated(null);
                  }}
                  className="h-9 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-900/40"
                >
                  Leave Room
                </button>
              </div>
            </div>

            {/* Host Config */}
            {isHost && activeRoom.status === 'lobby' && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <label className="text-xs font-semibold text-slate-300">Mode:</label>
                <select
                  value={activeRoom.mode}
                  onChange={(e) =>
                    multiplayerClient.updateRoomConfig(activeRoom.levelNumber, e.target.value as MultiplayerRoomMode)
                  }
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-100"
                >
                  {Object.entries(MODE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <label className="text-xs font-semibold text-slate-300">Stage:</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={activeRoom.levelNumber}
                  onChange={(e) =>
                    multiplayerClient.updateRoomConfig(
                      Math.max(1, Math.min(500, Number(e.target.value) || 1)),
                      activeRoom.mode
                    )
                  }
                  className="h-9 w-20 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs font-mono-tabular text-slate-100"
                />
              </div>
            )}

            {/* Participants List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeRoom.participants.map((p) => (
                <div
                  key={p.playerId}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-xs shrink-0"
                      style={{ backgroundColor: p.appearance.scarfColor }}
                    />
                    <span className="text-sm font-semibold text-slate-100 truncate">
                      {p.name}
                      {p.playerId === activeRoom.hostId ? ' (Host)' : ''}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono-tabular font-semibold ${
                      p.spectator
                        ? 'text-cyan-300'
                        : p.ready
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {p.spectator ? '[SPECTATOR]' : p.ready ? 'Ready' : 'Waiting'}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Emotes Chat */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Lobby Emotes</span>
              </div>
              <div className="max-h-24 overflow-y-auto text-xs text-slate-300 space-y-1 mb-2">
                {chatLog.length === 0 ? (
                  <div className="text-slate-500">Say hello to other runners in the room.</div>
                ) : (
                  chatLog.slice(-6).map((c, i) => (
                    <div key={`${c.at}-${i}`}>
                      <span className="font-semibold text-orange-400">{c.name}: </span>
                      <span>{c.text}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_EMOTES.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => multiplayerClient.sendChat(em)}
                    className="h-8 rounded-md border border-slate-700 bg-slate-800 px-2.5 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Ready / Start Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              {!me?.spectator && (
                <button
                  type="button"
                  onClick={() => multiplayerClient.setReady(!me?.ready)}
                  className={`h-11 rounded-lg px-5 text-sm font-semibold transition-colors ${
                    me?.ready
                      ? 'border border-emerald-500 bg-emerald-950/60 text-emerald-300'
                      : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {me?.ready ? 'Ready!' : 'Mark Ready'}
                </button>
              )}

              {isHost && (
                <button
                  type="button"
                  onClick={() => multiplayerClient.startRoomRace()}
                  className="flex h-11 items-center gap-2 rounded-lg bg-orange-600 px-6 text-sm font-semibold text-white hover:bg-orange-500"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Start Multiplayer Run</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Room Browser & Creator */
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
            {/* Create Room */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col gap-3">
              <h3 className="font-display text-xl font-bold text-slate-100">Create Rooftop Room</h3>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Room Name</label>
                <input
                  type="text"
                  maxLength={28}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Mode</label>
                  <select
                    value={roomMode}
                    onChange={(e) => setRoomMode(e.target.value as MultiplayerRoomMode)}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-100"
                  >
                    {Object.entries(MODE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Stage (1–500)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={roomStage}
                    onChange={(e) => setRoomStage(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm font-mono-tabular text-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold ${
                    isPublic
                      ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Public Room</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold ${
                    !isPublic
                      ? 'border-orange-500 bg-orange-950/50 text-orange-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Private Code</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleCreate()}
                className="mt-1 h-11 w-full rounded-lg bg-orange-600 text-sm font-semibold text-white hover:bg-orange-500"
              >
                Create &amp; Enter Lobby
              </button>
            </div>

            {/* Join by Code & Public Rooms */}
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="font-display text-xl font-bold text-slate-100">Join by Code</h3>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="ROOM CODE"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="h-10 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm font-mono-tabular uppercase text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => void handleJoin(joinCode, false)}
                    className="h-10 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Join
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleJoin(joinCode, true)}
                    title="Watch as Spectator"
                    className="flex h-10 items-center gap-1 rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Watch</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg font-bold text-slate-100">Open Public Rooms</h3>
                  <button
                    type="button"
                    onClick={() => void loadRooms()}
                    className="flex h-8 items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingRooms ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {publicRooms.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No public lobbies active right now — create one on the left!
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {publicRooms.map((r) => (
                      <div
                        key={r.code}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">{r.name}</div>
                          <div className="text-[11px] font-mono-tabular text-slate-400">
                            {MODE_LABELS[r.mode]} · Stage {r.levelNumber} · {r.playerCount} racers
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleJoin(r.code, false)}
                            className="h-8 rounded bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-500"
                          >
                            Join
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleJoin(r.code, true)}
                            className="h-8 rounded border border-cyan-500/40 bg-cyan-950/40 px-2.5 text-xs font-semibold text-cyan-300"
                          >
                            Watch
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
