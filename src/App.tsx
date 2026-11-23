import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { CharacterModal } from './components/CharacterModal';
import { GameHUD } from './components/GameHUD';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MissionsModal } from './components/MissionsModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { PauseModal } from './components/PauseModal';
import { ReplayOverlay } from './components/ReplayOverlay';
import { RunSummaryModal } from './components/RunSummaryModal';
import { PlayMode, TitleMenu } from './components/TitleMenu';
import {
  createWorldRuntime,
  getHudSnapshot,
  getRunSaveKey,
  restoreWorldFromSave,
  serializeWorldRun,
  stepWorld,
  WorldRuntime,
} from './engine/physics';
import {
  applyRunToProfile,
  getActiveUnexpectedEvent,
  loadPlayerProfile,
  PlayerProfile,
  savePlayerProfile,
} from './engine/progression';
import { renderWorld } from './engine/renderer';
import { buildLevelCourse, ENDLESS_COURSE, MAX_LEVEL, TUTORIAL_COURSE } from './levels/courses';
import {
  BestRecord,
  CameraZoom,
  GameState,
  GhostParticipant,
  HudSnapshot,
  InputState,
  MultiplayerRemotePlayer,
  ReplayFrame,
  RunSummary,
  SavedRunSnapshot,
} from './types/game';
import { haptics } from './utils/haptics';
import {
  multiplayerClient,
  RoomChatMessage,
  RoomStateInfo,
  submitLeaderboardRun,
  submitTournamentScore,
} from './utils/multiplayerClient';

const ENDLESS_RECORD_KEY = 'skyline_stride_endless_v1';
const PROGRESS_KEY = 'skyline_stride_progress_v1';
const SAVED_RUNS_KEY = 'skyline_stride_saved_runs_v1';
const TUTORIAL_DONE_KEY = 'skyline_stride_tutorial_done_v1';
const CAMERA_ZOOM_KEY = 'skyline_stride_cam_zoom_v1';

function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return hasTouch || coarsePointer;
}

function getViewportSize(): { vw: number; vh: number } {
  if (typeof window === 'undefined') return { vw: 1280, vh: 720 };
  return {
    vw: window.visualViewport?.width ?? window.innerWidth,
    vh: window.visualViewport?.height ?? window.innerHeight,
  };
}

function detectMobilePortrait(): boolean {
  const { vw, vh } = getViewportSize();
  return isMobileTouchDevice() && vh > vw && vw < 1100;
}

function detectCompactLandscape(): boolean {
  const { vw, vh } = getViewportSize();
  const logicalH = detectMobilePortrait() ? vw : vh;
  return logicalH < 540;
}

function tryLockLandscapeOrientation() {
  if (typeof window === 'undefined' || !isMobileTouchDevice()) return;
  try {
    const orientation = screen.orientation as (ScreenOrientation & { lock?: (mode: string) => Promise<void> }) | undefined;
    orientation?.lock?.('landscape')?.catch(() => {});
  } catch {
    // Ignore unsupported orientation lock errors
  }
}

function loadCameraZoom(): CameraZoom {
  try {
    const raw = Number(localStorage.getItem(CAMERA_ZOOM_KEY));
    if (raw === 2 || raw === 3) return raw;
  } catch {
    // Ignore storage error
  }
  return 1;
}

function loadTutorialDone(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadEndlessRecord(): BestRecord | undefined {
  try {
    const raw = localStorage.getItem(ENDLESS_RECORD_KEY);
    return raw ? (JSON.parse(raw) as BestRecord) : undefined;
  } catch {
    return undefined;
  }
}

function clampLevel(lvl: number): number {
  if (!Number.isFinite(lvl)) return 1;
  return Math.max(1, Math.min(MAX_LEVEL, Math.round(lvl)));
}

function loadLevelProgress(): { highestUnlocked: number; selectedLevel: number } {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { highestUnlocked?: number; selectedLevel?: number };
      const highestUnlocked = clampLevel(parsed.highestUnlocked ?? 1);
      const selectedLevel = Math.min(highestUnlocked, clampLevel(parsed.selectedLevel ?? highestUnlocked));
      return { highestUnlocked, selectedLevel };
    }
  } catch {
    // Ignore storage error
  }
  return { highestUnlocked: 1, selectedLevel: 1 };
}

function persistLevelProgress(highestUnlocked: number, selectedLevel: number) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ highestUnlocked, selectedLevel }));
  } catch {
    // Ignore storage error
  }
}

function loadSavedEndlessRun(): SavedRunSnapshot | undefined {
  try {
    const raw = localStorage.getItem(SAVED_RUNS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, SavedRunSnapshot>;
    const snap = parsed[getRunSaveKey()];
    return snap && snap.elapsedTime > 0.2 ? snap : undefined;
  } catch {
    return undefined;
  }
}

function persistSavedEndlessRun(snap: SavedRunSnapshot | undefined) {
  try {
    const raw = localStorage.getItem(SAVED_RUNS_KEY);
    const current = raw ? (JSON.parse(raw) as Record<string, SavedRunSnapshot>) : {};
    if (snap) {
      current[getRunSaveKey()] = snap;
    } else {
      delete current[getRunSaveKey()];
    }
    localStorage.setItem(SAVED_RUNS_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors
  }
}

interface ReplaySessionState {
  frames: ReplayFrame[];
  index: number;
  playing: boolean;
  speed: 0.5 | 1 | 2;
  photoMode: boolean;
  hideHud: boolean;
  camOffset: { dx: number; dy: number; zoomMult: number };
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [profile, setProfile] = useState<PlayerProfile>(() => loadPlayerProfile());
  const profileRef = useRef<PlayerProfile>(profile);
  profileRef.current = profile;

  const [endlessRecord, setEndlessRecord] = useState<BestRecord | undefined>(() => loadEndlessRecord());
  const [savedRun, setSavedRun] = useState<SavedRunSnapshot | undefined>(() => loadSavedEndlessRun());
  const savedRunRef = useRef<SavedRunSnapshot | undefined>(savedRun);
  savedRunRef.current = savedRun;

  const [initialProgress] = useState(() => loadLevelProgress());
  const [playMode, setPlayMode] = useState<PlayMode>('levels');
  const playModeRef = useRef<PlayMode>(playMode);
  playModeRef.current = playMode;
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState<number>(initialProgress.highestUnlocked);
  const highestUnlockedRef = useRef<number>(highestUnlockedLevel);
  highestUnlockedRef.current = highestUnlockedLevel;
  const [selectedLevel, setSelectedLevel] = useState<number>(initialProgress.selectedLevel);
  const selectedLevelRef = useRef<number>(selectedLevel);
  selectedLevelRef.current = selectedLevel;

  const [tutorialDone, setTutorialDone] = useState<boolean>(() => loadTutorialDone());
  const tutorialDoneRef = useRef<boolean>(tutorialDone);
  tutorialDoneRef.current = tutorialDone;

  const [cameraZoom, setCameraZoom] = useState<CameraZoom>(() => loadCameraZoom());
  const cameraZoomRef = useRef<CameraZoom>(cameraZoom);
  cameraZoomRef.current = cameraZoom;

  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => haptics.isEnabled());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isForcedLandscape, setIsForcedLandscape] = useState<boolean>(() => detectMobilePortrait());
  const isForcedLandscapeRef = useRef<boolean>(isForcedLandscape);
  isForcedLandscapeRef.current = isForcedLandscape;
  const [compactLayout, setCompactLayout] = useState<boolean>(() => detectCompactLandscape());
  const mainRef = useRef<HTMLElement | null>(null);

  // New Feature Modal States
  const [studioOpen, setStudioOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [leaderboardsOpen, setLeaderboardsOpen] = useState(false);
  const [multiplayerOpen, setMultiplayerOpen] = useState(false);
  const [inviteJoinCode, setInviteJoinCode] = useState<string | undefined>(undefined);

  // Multiplayer Live State
  const [activeRoom, setActiveRoom] = useState<RoomStateInfo | null>(null);
  const activeRoomRef = useRef<RoomStateInfo | null>(null);
  activeRoomRef.current = activeRoom;
  const [chatLog, setChatLog] = useState<RoomChatMessage[]>([]);
  const [roomCountdown, setRoomCountdown] = useState<number | null>(null);
  const remotePlayersMapRef = useRef<Map<string, MultiplayerRemotePlayer>>(new Map());

  // Event / Tournament / Challenger Ghost tracking
  const activeEventRef = useRef<{ levelNumber: number; title: string; bonusCoins: number; bonusXp: number } | null>(null);
  const activeTournamentRef = useRef<{ tournamentId: string; title: string; levelNumber: number } | null>(null);

  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const runSummaryRef = useRef<RunSummary | null>(null);
  runSummaryRef.current = runSummary;
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false);

  const [replayState, setReplayState] = useState<ReplaySessionState | null>(null);
  const replayStateRef = useRef<ReplaySessionState | null>(null);
  replayStateRef.current = replayState;
  const replayAccumRef = useRef(0);

  const [shutterKey, setShutterKey] = useState<number>(0);
  const [shiftBanner, setShiftBanner] = useState<{ key: number; title: string; subtitle: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<WorldRuntime>(
    (() => {
      const initialProfile = profileRef.current;
      const w =
        savedRun && savedRun.elapsedTime > 0.2
          ? restoreWorldFromSave(savedRun, {
              customization: initialProfile.customization,
              skills: initialProfile.skills,
              cinematicSlowMoEnabled: initialProfile.cinematicSlowMoEnabled,
            })
          : createWorldRuntime(tutorialDone ? buildLevelCourse(initialProgress.selectedLevel) : TUTORIAL_COURSE, {
              tutorialMode: !tutorialDone,
              cameraZoom,
              customization: initialProfile.customization,
              skills: initialProfile.skills,
              rivalsEnabled: initialProfile.rivalsEnabled,
              cinematicSlowMoEnabled: initialProfile.cinematicSlowMoEnabled,
            });
      w.cameraZoom = cameraZoom;
      w.targetCameraZoom = cameraZoom;
      return w;
    })()
  );

  const [hud, setHud] = useState<HudSnapshot>(() => getHudSnapshot(worldRef.current));
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    sprintHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slideHeld: false,
    slidePressed: false,
  });

  const swipeRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
  });
  const jumpHoldTimerRef = useRef<number | null>(null);
  const slideHoldTimerRef = useRef<number | null>(null);

  const isSpectatorMode = Boolean(
    activeRoom && activeRoom.participants.find((p) => p.playerId === profile.playerId)?.spectator
  );
  const isSpectatorRef = useRef<boolean>(isSpectatorMode);
  isSpectatorRef.current = isSpectatorMode;

  const handleUpdateProfile = useCallback((next: PlayerProfile) => {
    profileRef.current = next;
    setProfile(next);
    savePlayerProfile(next);
    const w = worldRef.current;
    w.customization = { ...next.customization };
    w.skills = { ...next.skills };
    w.cinematicSlowMoEnabled = next.cinematicSlowMoEnabled;
  }, []);

  const handleToggleRivals = useCallback(() => {
    const curr = profileRef.current;
    handleUpdateProfile({ ...curr, rivalsEnabled: !curr.rivalsEnabled });
  }, [handleUpdateProfile]);

  const handleToggleGhost = useCallback(() => {
    const curr = profileRef.current;
    handleUpdateProfile({ ...curr, ghostEnabled: !curr.ghostEnabled });
  }, [handleUpdateProfile]);

  const handleToggleSlowMo = useCallback(() => {
    const curr = profileRef.current;
    handleUpdateProfile({ ...curr, cinematicSlowMoEnabled: !curr.cinematicSlowMoEnabled });
  }, [handleUpdateProfile]);

  const clearInputs = useCallback(() => {
    if (jumpHoldTimerRef.current !== null) {
      window.clearTimeout(jumpHoldTimerRef.current);
      jumpHoldTimerRef.current = null;
    }
    if (slideHoldTimerRef.current !== null) {
      window.clearTimeout(slideHoldTimerRef.current);
      slideHoldTimerRef.current = null;
    }
    swipeRef.current = { active: false, pointerId: null, startX: 0, startY: 0 };
    inputRef.current = {
      left: false,
      right: false,
      sprintHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slideHeld: false,
      slidePressed: false,
    };
  }, []);

  const saveActiveWorldSnapshot = useCallback((syncUiState = true) => {
    const world = worldRef.current;
    if (world.finished || world.tutorialActive || world.elapsedTime <= 0.15 || activeRoomRef.current) return;
    const snap = serializeWorldRun(world);
    savedRunRef.current = snap;
    persistSavedEndlessRun(snap);
    if (syncUiState) {
      setSavedRun(snap);
    }
  }, []);

  const markTutorialCompleted = useCallback(() => {
    if (tutorialDoneRef.current) return;
    tutorialDoneRef.current = true;
    setTutorialDone(true);
    try {
      localStorage.setItem(TUTORIAL_DONE_KEY, '1');
    } catch {
      // Ignore storage error
    }
  }, []);

  const clearSavedRun = useCallback(() => {
    if (!savedRunRef.current) return;
    savedRunRef.current = undefined;
    persistSavedEndlessRun(undefined);
    setSavedRun(undefined);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen?.()
        .then(() => tryLockLandscapeOrientation())
        .catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    tryLockLandscapeOrientation();
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      if (document.fullscreenElement) {
        tryLockLandscapeOrientation();
      }
    };
    const onOrientationCheck = () => {
      const forced = detectMobilePortrait();
      isForcedLandscapeRef.current = forced;
      setIsForcedLandscape(forced);
      setCompactLayout(detectCompactLandscape());
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('resize', onOrientationCheck);
    window.addEventListener('orientationchange', onOrientationCheck);
    window.visualViewport?.addEventListener('resize', onOrientationCheck);
    screen.orientation?.addEventListener?.('change', onOrientationCheck);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('resize', onOrientationCheck);
      window.removeEventListener('orientationchange', onOrientationCheck);
      window.visualViewport?.removeEventListener('resize', onOrientationCheck);
      screen.orientation?.removeEventListener?.('change', onOrientationCheck);
    };
  }, []);

  // Support ?room=CODE invite query param on launch
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomCode = params.get('room')?.trim().toUpperCase();
      if (roomCode && /^[A-Z0-9]{4,8}$/.test(roomCode)) {
        setInviteJoinCode(roomCode);
        setMultiplayerOpen(true);
      }
    } catch {
      // Ignore invalid URL query params
    }
  }, []);

  const triggerTransition = useCallback((banner?: { title: string; subtitle: string }) => {
    const id = Date.now() + Math.random();
    setShutterKey(id);
    if (banner) {
      setShiftBanner({ key: id, title: banner.title, subtitle: banner.subtitle });
    } else {
      setShiftBanner(null);
    }
  }, []);

  useEffect(() => {
    if (!shutterKey) return;
    const timer = window.setTimeout(() => {
      setShutterKey((curr) => (curr === shutterKey ? 0 : curr));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [shutterKey]);

  useEffect(() => {
    if (!shiftBanner) return;
    const timer = window.setTimeout(() => {
      setShiftBanner((curr) => (curr?.key === shiftBanner.key ? null : curr));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [shiftBanner]);

  const buildGhostsForLevel = useCallback((lvl: number, extraGhosts?: GhostParticipant[]): GhostParticipant[] => {
    const list: GhostParticipant[] = [];
    const p = profileRef.current;
    if (p.ghostEnabled) {
      const pbFrames = p.personalBestGhosts[lvl];
      if (pbFrames && pbFrames.length > 1) {
        list.push({
          id: 'personal-best',
          name: p.customization.name,
          label: 'PB',
          kind: 'personal',
          appearance: p.customization,
          frames: pbFrames,
        });
      }
    }
    if (extraGhosts && extraGhosts.length > 0) {
      list.push(...extraGhosts);
    }
    return list;
  }, []);

  const handleChangePlayMode = useCallback((mode: PlayMode) => {
    playModeRef.current = mode;
    setPlayMode(mode);
    if (gameStateRef.current === 'TITLE_MENU') {
      const p = profileRef.current;
      const course = mode === 'endless' ? ENDLESS_COURSE : buildLevelCourse(selectedLevelRef.current);
      worldRef.current = createWorldRuntime(course, {
        cameraZoom: cameraZoomRef.current,
        customization: p.customization,
        skills: p.skills,
        rivalsEnabled: p.rivalsEnabled,
        cinematicSlowMoEnabled: p.cinematicSlowMoEnabled,
      });
    }
  }, []);

  const handleSelectLevel = useCallback((lvl: number) => {
    const clamped = Math.min(highestUnlockedRef.current, clampLevel(lvl));
    selectedLevelRef.current = clamped;
    setSelectedLevel(clamped);
    persistLevelProgress(highestUnlockedRef.current, clamped);
    if (gameStateRef.current === 'TITLE_MENU') {
      const p = profileRef.current;
      const preview = createWorldRuntime(buildLevelCourse(clamped), {
        cameraZoom: cameraZoomRef.current,
        customization: p.customization,
        skills: p.skills,
        rivalsEnabled: p.rivalsEnabled,
        cinematicSlowMoEnabled: p.cinematicSlowMoEnabled,
      });
      worldRef.current = preview;
    }
  }, []);

  const startRun = useCallback(
    (
      forceTutorial = false,
      targetLevel?: number,
      endlessOverride?: boolean,
      runOpts?: {
        extraGhosts?: GhostParticipant[];
        activeEventTitle?: string;
        tournamentId?: string;
        isMultiplayer?: boolean;
      }
    ) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      tryLockLandscapeOrientation();

      const useTutorial = forceTutorial || (!tutorialDoneRef.current && !runOpts?.isMultiplayer && !runOpts?.tournamentId);
      const isEndless = typeof endlessOverride === 'boolean' ? endlessOverride : playModeRef.current === 'endless';
      const lvl = clampLevel(targetLevel ?? selectedLevelRef.current);

      if (!forceTutorial && !runOpts?.isMultiplayer) {
        clearSavedRun();
        if (!isEndless) {
          playModeRef.current = 'levels';
          setPlayMode('levels');
          if (lvl <= highestUnlockedRef.current) {
            selectedLevelRef.current = lvl;
            setSelectedLevel(lvl);
            persistLevelProgress(highestUnlockedRef.current, lvl);
          }
        } else {
          playModeRef.current = 'endless';
          setPlayMode('endless');
        }
      }

      const p = profileRef.current;
      const course = useTutorial ? TUTORIAL_COURSE : isEndless ? ENDLESS_COURSE : buildLevelCourse(lvl);
      const ghosts = !useTutorial && !isEndless ? buildGhostsForLevel(lvl, runOpts?.extraGhosts) : [];

      const freshWorld = createWorldRuntime(course, {
        tutorialMode: useTutorial,
        cameraZoom: cameraZoomRef.current,
        customization: p.customization,
        skills: p.skills,
        rivalsEnabled: p.rivalsEnabled,
        ghosts,
        cinematicSlowMoEnabled: p.cinematicSlowMoEnabled,
        activeEventTitle: runOpts?.activeEventTitle,
        tournamentId: runOpts?.tournamentId,
        isMultiplayer: runOpts?.isMultiplayer,
      });

      if (runOpts?.isMultiplayer) {
        freshWorld.remotePlayers = Array.from(remotePlayersMapRef.current.values());
      }

      worldRef.current = freshWorld;
      clearInputs();
      setReplayState(null);
      setRunSummary(null);
      setLeaderboardSubmitted(false);
      setHud(getHudSnapshot(freshWorld));

      triggerTransition(
        useTutorial
          ? { title: 'Pixy Dash Guide', subtitle: 'Swipe up to vault · Swipe down to slide & sweep' }
          : runOpts?.isMultiplayer
          ? { title: `Online Race · Stage ${lvl}`, subtitle: `${course.districtName ?? 'Rooftop'} · Live Multiplayer` }
          : runOpts?.tournamentId
          ? { title: `Tournament · Stage ${lvl}`, subtitle: 'Beat the clock & climb the live tournament board!' }
          : runOpts?.activeEventTitle
          ? { title: runOpts.activeEventTitle, subtitle: `Special Event · Stage ${lvl}` }
          : isEndless
          ? { title: 'Pixy Dash Endless', subtitle: 'Clear 5 high places without falling to level up · Dodge the lava' }
          : {
              title: `Stage ${lvl} · ${course.districtName ?? 'Skyline'}`,
              subtitle: `Pixy Dash · ${course.title} — clear 5 high places to level up!`,
            }
      );
      setGameState('PLAYING');
    },
    [buildGhostsForLevel, clearInputs, clearSavedRun, triggerTransition]
  );

  // Subscribe to Multiplayer WebSocket events
  useEffect(() => {
    const syncRemoteMap = (room: RoomStateInfo) => {
      const nextMap = new Map<string, MultiplayerRemotePlayer>();
      const myId = profileRef.current.playerId;
      for (const part of room.participants) {
        if (part.playerId === myId || part.spectator) continue;
        const existing = remotePlayersMapRef.current.get(part.playerId);
        nextMap.set(part.playerId, {
          playerId: part.playerId,
          name: part.name,
          x: existing?.x ?? part.x ?? 80,
          y: existing?.y ?? part.y ?? 300,
          h: existing?.h ?? part.h ?? 54,
          vx: existing?.vx ?? part.vx ?? 0,
          vy: existing?.vy ?? part.vy ?? 0,
          action: existing?.action ?? part.action ?? 'run',
          facing: existing?.facing ?? part.facing ?? 1,
          progressPct: existing?.progressPct ?? part.progressPct ?? 0,
          distanceMeters: existing?.distanceMeters ?? part.distanceMeters ?? 0,
          finished: part.finished,
          finishTime: part.finishTime,
          appearance: part.appearance,
        });
      }
      remotePlayersMapRef.current = nextMap;
      if (worldRef.current) {
        worldRef.current.remotePlayers = Array.from(nextMap.values());
      }
    };

    const unsub = multiplayerClient.subscribe((ev) => {
      if (ev.type === 'room:joined') {
        setActiveRoom(ev.room);
        setChatLog([]);
        setRoomCountdown(null);
        syncRemoteMap(ev.room);
      } else if (ev.type === 'room:state') {
        setActiveRoom(ev.room);
        syncRemoteMap(ev.room);
      } else if (ev.type === 'room:countdown') {
        setActiveRoom(ev.room);
        setRoomCountdown(ev.seconds);
      } else if (ev.type === 'room:started') {
        setActiveRoom(ev.room);
        setRoomCountdown(null);
        setMultiplayerOpen(false);
        setStudioOpen(false);
        setMissionsOpen(false);
        setLeaderboardsOpen(false);
        syncRemoteMap(ev.room);
        activeEventRef.current = null;
        activeTournamentRef.current = null;
        startRun(false, ev.room.levelNumber, false, { isMultiplayer: true });
      } else if (ev.type === 'room:chat') {
        setChatLog((prev) => [...prev.slice(-35), ev.message]);
      } else if (ev.type === 'player:sync') {
        if (ev.player.playerId !== profileRef.current.playerId) {
          remotePlayersMapRef.current.set(ev.player.playerId, ev.player);
          worldRef.current.remotePlayers = Array.from(remotePlayersMapRef.current.values());
        }
      } else if (ev.type === 'disconnected') {
        setRoomCountdown(null);
      }
    });
    return unsub;
  }, [startRun]);

  const skipTutorial = useCallback(() => {
    markTutorialCompleted();
    startRun(false, undefined, playModeRef.current === 'endless');
  }, [markTutorialCompleted, startRun]);

  const continueSavedRun = useCallback(
    (save: SavedRunSnapshot) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      tryLockLandscapeOrientation();
      const p = profileRef.current;
      const restored = restoreWorldFromSave(save, {
        customization: p.customization,
        skills: p.skills,
        cinematicSlowMoEnabled: p.cinematicSlowMoEnabled,
      });
      restored.cameraZoom = cameraZoomRef.current;
      restored.targetCameraZoom = cameraZoomRef.current;
      worldRef.current = restored;
      const isEndless = Boolean(save.isEndless || save.courseId === 'endless-skyline');
      playModeRef.current = isEndless ? 'endless' : 'levels';
      setPlayMode(isEndless ? 'endless' : 'levels');
      clearInputs();
      setReplayState(null);
      setRunSummary(null);
      setLeaderboardSubmitted(false);
      setHud(getHudSnapshot(restored));
      triggerTransition({
        title: isEndless ? 'Endless Run' : `Stage ${save.levelNumber ?? 1}`,
        subtitle: `Resuming at ${save.distanceMeters} m`,
      });
      setGameState('PLAYING');
    },
    [clearInputs, triggerTransition]
  );

  const handleChangeCameraZoom = useCallback((zoom: CameraZoom) => {
    cameraZoomRef.current = zoom;
    setCameraZoom(zoom);
    worldRef.current.targetCameraZoom = zoom;
    try {
      localStorage.setItem(CAMERA_ZOOM_KEY, String(zoom));
    } catch {
      // Ignore storage error
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
  }, []);

  const handleToggleVibration = useCallback(() => {
    const nextVib = haptics.toggle();
    setVibrationEnabled(nextVib);
  }, []);

  const handleFinishRun = useCallback(
    (rawSummary: RunSummary) => {
      gameStateRef.current = 'ROUND_SUMMARY';
      clearSavedRun();

      let summary: RunSummary = rawSummary;

      // Check Unexpected Event Bonus
      const pendingEv = activeEventRef.current;
      if (pendingEv && summary.cleared && summary.levelNumber === pendingEv.levelNumber) {
        summary = {
          ...summary,
          coinsEarned: summary.coinsEarned + pendingEv.bonusCoins,
          xpEarned: summary.xpEarned + pendingEv.bonusXp,
        };
      }
      activeEventRef.current = null;

      // Report finish to active multiplayer room
      if (activeRoomRef.current && !isSpectatorRef.current) {
        multiplayerClient.sendFinish(summary.cleared, summary.elapsedTime);
      }

      // Report score to active tournament
      const pendingTourn = activeTournamentRef.current;
      if (pendingTourn && summary.cleared && summary.levelNumber === pendingTourn.levelNumber) {
        void submitTournamentScore(pendingTourn.tournamentId, {
          playerId: profileRef.current.playerId,
          playerName: profileRef.current.customization.name,
          timeSec: summary.elapsedTime,
          score: summary.score,
        });
      }
      activeTournamentRef.current = null;

      // Unlock next stage in campaign if cleared
      if (summary.cleared && !summary.isEndless) {
        const nextLevel = Math.min(MAX_LEVEL, summary.levelNumber + 1);
        const nextUnlocked = Math.max(highestUnlockedRef.current, nextLevel);
        highestUnlockedRef.current = nextUnlocked;
        setHighestUnlockedLevel(nextUnlocked);
        if (summary.levelNumber >= selectedLevelRef.current) {
          selectedLevelRef.current = nextLevel;
          setSelectedLevel(nextLevel);
          persistLevelProgress(nextUnlocked, nextLevel);
        } else {
          persistLevelProgress(nextUnlocked, selectedLevelRef.current);
        }
      }

      // Apply Coins, XP, Best Times, Ghost, Secrets, Missions, Badges
      const updatedProfile = applyRunToProfile(profileRef.current, summary);
      profileRef.current = updatedProfile;
      setProfile(updatedProfile);

      // Update local personal Endless / Best Distance Record
      setEndlessRecord((prev) => {
        const isNewBest = !prev?.bestDistanceM || summary.distanceMeters > prev.bestDistanceM;
        const updated: BestRecord = {
          bestDistanceM: Math.max(prev?.bestDistanceM ?? 0, summary.distanceMeters),
          bestScore: Math.max(prev?.bestScore ?? 0, summary.score),
        };
        try {
          localStorage.setItem(ENDLESS_RECORD_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage error
        }
        setRunSummary({ ...summary, isNewBest });
        return updated;
      });

      // Upload run + ghost replay to global leaderboard server
      if ((summary.cleared && !summary.isEndless) || (summary.isEndless && summary.distanceMeters >= 50)) {
        void submitLeaderboardRun({
          playerId: updatedProfile.playerId,
          playerName: updatedProfile.customization.name,
          levelNumber: summary.levelNumber,
          isEndless: summary.isEndless,
          timeSec: summary.elapsedTime,
          score: summary.score,
          distanceMeters: summary.distanceMeters,
          longestJumpMeters: summary.longestJumpMeters,
          medal: summary.medal,
          appearance: updatedProfile.customization,
          replayFrames: summary.replayFrames.filter((_, i) => i % 2 === 0).slice(0, 180),
        }).then((savedEntry) => {
          if (savedEntry) {
            setLeaderboardSubmitted(true);
          }
        });
      }

      setGameState('ROUND_SUMMARY');
    },
    [clearSavedRun]
  );

  // Auto-save active run if user closes tab, refreshes, or switches away
  useEffect(() => {
    const persistSync = () => {
      if (gameStateRef.current !== 'PLAYING' && gameStateRef.current !== 'PAUSED') return;
      const world = worldRef.current;
      if (world.finished || world.tutorialActive || world.elapsedTime <= 0.15 || activeRoomRef.current) return;
      const snap = serializeWorldRun(world);
      persistSavedEndlessRun(snap);
    };

    const onVisibility = () => {
      if (document.hidden) persistSync();
    };

    window.addEventListener('pagehide', persistSync);
    window.addEventListener('beforeunload', persistSync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', persistSync);
      window.removeEventListener('beforeunload', persistSync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      // Ignore game hotkeys if user is typing in an input inside a modal
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      ) {
        return;
      }

      if (code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      if (code === 'KeyC') {
        e.preventDefault();
        const nextZoom: CameraZoom = cameraZoomRef.current === 1 ? 2 : cameraZoomRef.current === 2 ? 3 : 1;
        handleChangeCameraZoom(nextZoom);
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (gameStateRef.current === 'PLAYING') {
          clearInputs();
          saveActiveWorldSnapshot();
          setGameState('PAUSED');
          return;
        }
        if (gameStateRef.current === 'PAUSED') {
          clearInputs();
          setGameState('PLAYING');
          return;
        }
      }

      if (code === 'KeyR' && (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED')) {
        if (!activeRoomRef.current) {
          e.preventDefault();
          startRun(
            worldRef.current.tutorialActive,
            worldRef.current.course.levelNumber,
            Boolean(worldRef.current.course.isEndless)
          );
          return;
        }
      }

      const anyModalOpen = studioOpen || missionsOpen || leaderboardsOpen || multiplayerOpen;

      if (gameStateRef.current === 'TITLE_MENU' && !anyModalOpen && (code === 'Space' || code === 'Enter')) {
        e.preventDefault();
        const existing = savedRunRef.current;
        if (existing && existing.elapsedTime > 0.2) {
          continueSavedRun(existing);
        } else {
          startRun(false, selectedLevelRef.current, playModeRef.current === 'endless');
        }
        return;
      }

      if (gameStateRef.current === 'ROUND_SUMMARY' && !anyModalOpen && (code === 'Space' || code === 'Enter')) {
        e.preventDefault();
        const currSummary = runSummaryRef.current;
        if (currSummary?.isEndless) {
          startRun(false, undefined, true);
        } else if (currSummary && currSummary.cleared && currSummary.levelNumber < MAX_LEVEL) {
          startRun(false, currSummary.levelNumber + 1, false);
        } else if (currSummary) {
          startRun(false, currSummary.levelNumber, false);
        } else {
          startRun(false);
        }
        return;
      }

      if (gameStateRef.current !== 'PLAYING' || isSpectatorRef.current) return;

      if (code === 'ArrowLeft' || code === 'KeyA') {
        inputRef.current.left = true;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        inputRef.current.right = true;
      } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
        inputRef.current.sprintHeld = true;
      } else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        e.preventDefault();
        if (!inputRef.current.jumpHeld) {
          inputRef.current.jumpPressed = true;
        }
        inputRef.current.jumpHeld = true;
      } else if (code === 'ArrowDown' || code === 'KeyS' || code === 'ControlLeft') {
        e.preventDefault();
        if (!inputRef.current.slideHeld) {
          inputRef.current.slidePressed = true;
        }
        inputRef.current.slideHeld = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') {
        inputRef.current.left = false;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        inputRef.current.right = false;
      } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
        inputRef.current.sprintHeld = false;
      } else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        inputRef.current.jumpHeld = false;
      } else if (code === 'ArrowDown' || code === 'KeyS' || code === 'ControlLeft') {
        inputRef.current.slideHeld = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
    };
  }, [
    clearInputs,
    continueSavedRun,
    handleChangeCameraZoom,
    leaderboardsOpen,
    missionsOpen,
    multiplayerOpen,
    saveActiveWorldSnapshot,
    startRun,
    studioOpen,
    toggleFullscreen,
  ]);

  const triggerSwipeJump = useCallback(() => {
    if (slideHoldTimerRef.current !== null) {
      window.clearTimeout(slideHoldTimerRef.current);
      slideHoldTimerRef.current = null;
    }
    inputRef.current.slideHeld = false;
    inputRef.current.jumpPressed = true;
    inputRef.current.jumpHeld = true;
    if (jumpHoldTimerRef.current !== null) window.clearTimeout(jumpHoldTimerRef.current);
    jumpHoldTimerRef.current = window.setTimeout(() => {
      inputRef.current.jumpHeld = false;
      jumpHoldTimerRef.current = null;
    }, 220);
  }, []);

  const triggerSwipeSlide = useCallback(() => {
    if (jumpHoldTimerRef.current !== null) {
      window.clearTimeout(jumpHoldTimerRef.current);
      jumpHoldTimerRef.current = null;
    }
    inputRef.current.jumpHeld = false;
    inputRef.current.slidePressed = true;
    inputRef.current.slideHeld = true;
    if (slideHoldTimerRef.current !== null) window.clearTimeout(slideHoldTimerRef.current);
    slideHoldTimerRef.current = window.setTimeout(() => {
      if (!swipeRef.current.active) {
        inputRef.current.slideHeld = false;
      }
      slideHoldTimerRef.current = null;
    }, 450);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let hudAccum = 0;
    let saveAccum = 0;

    const getLogicalViewport = () => {
      const forced = detectMobilePortrait();
      isForcedLandscapeRef.current = forced;
      const host = mainRef.current;
      if (host && host.clientWidth > 0 && host.clientHeight > 0) {
        return { w: host.clientWidth, h: host.clientHeight };
      }
      const { vw, vh } = getViewportSize();
      return forced ? { w: vh, h: vw } : { w: vw, h: vh };
    };

    const syncCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { w, h } = getLogicalViewport();
      const targetW = Math.max(1, Math.floor(w * dpr));
      const targetH = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    syncCanvasSize();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncCanvasSize) : null;
    if (mainRef.current && resizeObserver) {
      resizeObserver.observe(mainRef.current);
    }
    window.addEventListener('resize', syncCanvasSize);
    window.addEventListener('orientationchange', syncCanvasSize);
    window.visualViewport?.addEventListener('resize', syncCanvasSize);
    screen.orientation?.addEventListener?.('change', syncCanvasSize);

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      const world = worldRef.current;
      const state = gameStateRef.current;

      if (state === 'PLAYING') {
        if (isSpectatorRef.current) {
          // Spectator mode: follow leading active racer smoothly
          world.simTime += dt;
          const target = world.remotePlayers.find((rp) => !rp.finished) ?? world.remotePlayers[0];
          if (target) {
            world.player.x = target.x;
            world.player.y = target.y;
            world.player.action = target.action;
            world.cameraX += (target.x - world.cameraX) * Math.min(1, dt * 8);
            world.cameraY += (target.y - world.cameraY) * Math.min(1, dt * 8);
          }
          hudAccum += dt;
          if (hudAccum >= 0.08) {
            hudAccum = 0;
            setHud(getHudSnapshot(world));
          }
        } else {
          const wasTutorial = world.tutorialActive;
          const prevLevelUps = world.levelUpsEarned;
          const { summary } = stepWorld(world, inputRef.current, dt);
          inputRef.current.jumpPressed = false;
          inputRef.current.slidePressed = false;

          if (wasTutorial && !world.tutorialActive) {
            markTutorialCompleted();
          }

          if (world.levelUpsEarned > prevLevelUps) {
            const newLvl = world.runLevel;
            if (!world.course.isEndless && !activeRoomRef.current) {
              const nextUnlocked = Math.max(highestUnlockedRef.current, Math.min(MAX_LEVEL, newLvl));
              highestUnlockedRef.current = nextUnlocked;
              setHighestUnlockedLevel(nextUnlocked);
              selectedLevelRef.current = newLvl;
              setSelectedLevel(newLvl);
              persistLevelProgress(nextUnlocked, newLvl);
            }
            setShiftBanner({
              key: Date.now() + Math.random(),
              title: `LEVEL UP! · STAGE ${newLvl}`,
              subtitle: '5 High Places cleared without falling — Sky Surge +500 pts!',
            });
          }

          // Stream multiplayer position while in a room
          if (activeRoomRef.current && !world.finished) {
            const span = Math.max(1, world.course.finishX - world.course.startX);
            const progressPct = Math.max(0, Math.min(100, Math.round(((world.player.x - world.course.startX) / span) * 100)));
            const distanceMeters = Math.max(0, Math.round((world.player.x - world.course.startX) / 28));
            multiplayerClient.sendPlayerState({
              x: world.player.x,
              y: world.player.y,
              h: world.player.h,
              vx: world.player.vx,
              vy: world.player.vy,
              action: world.player.action,
              facing: world.player.facing,
              progressPct,
              distanceMeters,
            });
          }

          if (summary) {
            handleFinishRun(summary);
          } else {
            hudAccum += dt;
            if (hudAccum >= 0.05) {
              hudAccum = 0;
              setHud(getHudSnapshot(world));
            }

            saveAccum += dt;
            if (saveAccum >= 0.4) {
              saveAccum = 0;
              saveActiveWorldSnapshot(false);
            }
          }
        }
      } else if (state === 'TITLE_MENU') {
        world.simTime += dt;
        world.cameraZoom += (world.targetCameraZoom - world.cameraZoom) * Math.min(1, dt * 8.5);
        if (!savedRunRef.current) {
          world.cameraX = 120 + Math.sin(world.simTime * 0.18) * 120;
        }
      } else if (state === 'REPLAY_MODE') {
        const rs = replayStateRef.current;
        if (rs && rs.playing && !rs.photoMode && rs.frames.length > 1) {
          replayAccumRef.current += dt * rs.speed;
          const stepSec = 0.033;
          if (replayAccumRef.current >= stepSec) {
            const advance = Math.floor(replayAccumRef.current / stepSec);
            replayAccumRef.current -= advance * stepSec;
            const nextIdx = (rs.index + advance) % rs.frames.length;
            setReplayState((prev) => (prev ? { ...prev, index: nextIdx } : prev));
          }
        }
      }

      const { w, h } = syncCanvasSize();
      if (state === 'REPLAY_MODE' && replayStateRef.current && replayStateRef.current.frames.length > 0) {
        const rs = replayStateRef.current;
        const activeFrame = rs.frames[Math.min(rs.index, rs.frames.length - 1)];
        renderWorld(ctx, world, w, h, {
          frameOverride: activeFrame,
          camOffset: rs.camOffset,
        });
      } else {
        renderWorld(ctx, world, w, h);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncCanvasSize);
      window.removeEventListener('orientationchange', syncCanvasSize);
      window.visualViewport?.removeEventListener('resize', syncCanvasSize);
      screen.orientation?.removeEventListener?.('change', syncCanvasSize);
    };
  }, [handleFinishRun, markTutorialCompleted, saveActiveWorldSnapshot]);

  const handleWatchReplay = useCallback(() => {
    const summary = runSummaryRef.current;
    const world = worldRef.current;
    const frames: ReplayFrame[] =
      summary && summary.replayFrames.length > 0
        ? summary.replayFrames
        : [
            {
              t: world.simTime,
              x: world.player.x,
              y: world.player.y,
              h: world.player.h,
              action: world.player.action,
              facing: world.player.facing,
              vx: world.player.vx,
            },
          ];
    replayAccumRef.current = 0;
    setReplayState({
      frames,
      index: 0,
      playing: true,
      speed: 1,
      photoMode: false,
      hideHud: false,
      camOffset: { dx: 0, dy: 0, zoomMult: 1 },
    });
    setGameState('REPLAY_MODE');
  }, []);

  const handleCapturePhoto = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `pixy-dash-stage-${worldRef.current.runLevel}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Ignore canvas export error
    }
  }, []);

  return (
    <main
      ref={mainRef}
      className={
        isForcedLandscape
          ? 'fixed left-0 top-0 h-[100dvw] w-[100dvh] origin-top-left [transform:rotate(90deg)_translateY(-100%)] overflow-hidden bg-slate-950 select-none'
          : 'fixed inset-0 h-dvh w-dvw overflow-hidden bg-slate-950 select-none'
      }
    >
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          tryLockLandscapeOrientation();
          if (gameState !== 'PLAYING' || isSpectatorMode) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          swipeRef.current = {
            active: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
          };
        }}
        onPointerMove={(e) => {
          if (gameState !== 'PLAYING' || isSpectatorMode) return;
          const sw = swipeRef.current;
          if (!sw.active || sw.pointerId !== e.pointerId) return;

          const dx = e.clientX - sw.startX;
          const dy = e.clientY - sw.startY;
          const visualDy = isForcedLandscapeRef.current ? -dx : dy;

          if (visualDy <= -18) {
            triggerSwipeJump();
            sw.startX = e.clientX;
            sw.startY = e.clientY;
          } else if (visualDy >= 18) {
            triggerSwipeSlide();
            sw.startX = e.clientX;
            sw.startY = e.clientY;
          }
        }}
        onPointerUp={(e) => {
          const sw = swipeRef.current;
          if (sw.pointerId === e.pointerId) {
            sw.active = false;
            sw.pointerId = null;
          }
          inputRef.current.jumpHeld = false;
          if (slideHoldTimerRef.current === null) {
            inputRef.current.slideHeld = false;
          }
        }}
        onPointerCancel={() => {
          swipeRef.current.active = false;
          swipeRef.current.pointerId = null;
          inputRef.current.jumpHeld = false;
          inputRef.current.slideHeld = false;
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="block h-full w-full touch-none"
      />

      {gameState === 'PLAYING' && (
        <GameHUD
          hud={hud}
          compactLayout={compactLayout}
          isSpectator={isSpectatorMode}
          roomCode={activeRoom?.code ?? null}
          onPause={() => {
            clearInputs();
            saveActiveWorldSnapshot();
            setGameState('PAUSED');
          }}
          onSkipTutorial={skipTutorial}
        />
      )}

      {gameState === 'TITLE_MENU' && (
        <TitleMenu
          playMode={playMode}
          selectedLevel={selectedLevel}
          highestUnlockedLevel={highestUnlockedLevel}
          maxLevel={MAX_LEVEL}
          endlessRecord={endlessRecord}
          savedRun={savedRun}
          isFirstTime={!tutorialDone}
          compactLayout={compactLayout}
          cameraZoom={cameraZoom}
          muted={muted}
          vibrationEnabled={vibrationEnabled}
          isFullscreen={isFullscreen}
          profile={profile}
          onlineRoomCode={activeRoom?.code ?? null}
          onChangePlayMode={handleChangePlayMode}
          onSelectLevel={handleSelectLevel}
          onChangeCameraZoom={handleChangeCameraZoom}
          onContinueSavedRun={continueSavedRun}
          onStartRun={(lvl) => {
            activeEventRef.current = null;
            activeTournamentRef.current = null;
            startRun(false, lvl, false);
          }}
          onStartEndlessRun={() => {
            activeEventRef.current = null;
            activeTournamentRef.current = null;
            startRun(false, undefined, true);
          }}
          onStartTutorial={() => startRun(true)}
          onToggleMute={handleToggleMute}
          onToggleVibration={handleToggleVibration}
          onToggleFullscreen={toggleFullscreen}
          onOpenStudio={() => setStudioOpen(true)}
          onOpenMissions={() => setMissionsOpen(true)}
          onOpenLeaderboards={() => setLeaderboardsOpen(true)}
          onOpenMultiplayer={() => setMultiplayerOpen(true)}
          onToggleRivals={handleToggleRivals}
          onToggleGhost={handleToggleGhost}
          onToggleSlowMo={handleToggleSlowMo}
        />
      )}

      {gameState === 'PAUSED' && (
        <PauseModal
          levelNumber={hud.runLevel}
          isEndless={hud.isEndless}
          distanceMeters={hud.distanceMeters}
          takedownsCount={hud.takedownsCount}
          compactLayout={compactLayout}
          muted={muted}
          vibrationEnabled={vibrationEnabled}
          slowMoEnabled={profile.cinematicSlowMoEnabled}
          cameraZoom={cameraZoom}
          onToggleMute={handleToggleMute}
          onToggleVibration={handleToggleVibration}
          onToggleSlowMo={handleToggleSlowMo}
          onChangeCameraZoom={handleChangeCameraZoom}
          onResume={() => setGameState('PLAYING')}
          onRestart={() =>
            startRun(
              worldRef.current.tutorialActive,
              worldRef.current.course.levelNumber,
              Boolean(worldRef.current.course.isEndless),
              { isMultiplayer: Boolean(activeRoomRef.current) }
            )
          }
          onExitToMenu={() => {
            clearInputs();
            saveActiveWorldSnapshot();
            triggerTransition();
            setGameState('TITLE_MENU');
          }}
        />
      )}

      {gameState === 'ROUND_SUMMARY' && runSummary && (
        <RunSummaryModal
          summary={runSummary}
          hasNextLevel={runSummary.levelNumber < MAX_LEVEL}
          compactLayout={compactLayout}
          leaderboardSubmitted={leaderboardSubmitted}
          onWatchReplay={handleWatchReplay}
          onNextLevel={() => startRun(false, Math.min(MAX_LEVEL, runSummary.levelNumber + 1), false)}
          onPlayAgain={() =>
            startRun(false, runSummary.levelNumber, runSummary.isEndless, {
              isMultiplayer: Boolean(activeRoomRef.current),
            })
          }
          onMainMenu={() => {
            clearInputs();
            const p = profileRef.current;
            const course =
              playModeRef.current === 'endless'
                ? ENDLESS_COURSE
                : buildLevelCourse(selectedLevelRef.current);
            worldRef.current = createWorldRuntime(course, {
              cameraZoom: cameraZoomRef.current,
              customization: p.customization,
              skills: p.skills,
              rivalsEnabled: p.rivalsEnabled,
              cinematicSlowMoEnabled: p.cinematicSlowMoEnabled,
            });
            triggerTransition();
            setGameState('TITLE_MENU');
          }}
        />
      )}

      {gameState === 'REPLAY_MODE' && replayState && (
        <ReplayOverlay
          frames={replayState.frames}
          currentIndex={replayState.index}
          playing={replayState.playing}
          speed={replayState.speed}
          photoMode={replayState.photoMode}
          hideHud={replayState.hideHud}
          camOffset={replayState.camOffset}
          onSeek={(idx) => setReplayState((prev) => (prev ? { ...prev, index: idx } : prev))}
          onTogglePlay={() =>
            setReplayState((prev) => (prev ? { ...prev, playing: !prev.playing, photoMode: false } : prev))
          }
          onChangeSpeed={(speed) => setReplayState((prev) => (prev ? { ...prev, speed } : prev))}
          onTogglePhotoMode={() =>
            setReplayState((prev) =>
              prev
                ? {
                    ...prev,
                    photoMode: !prev.photoMode,
                    playing: prev.photoMode ? prev.playing : false,
                  }
                : prev
            )
          }
          onToggleHideHud={() => setReplayState((prev) => (prev ? { ...prev, hideHud: !prev.hideHud } : prev))}
          onAdjustCamera={(patch) =>
            setReplayState((prev) =>
              prev ? { ...prev, camOffset: { ...prev.camOffset, ...patch } } : prev
            )
          }
          onCapturePhoto={handleCapturePhoto}
          onExit={() => {
            setReplayState(null);
            setGameState('ROUND_SUMMARY');
          }}
        />
      )}

      {/* Character Customization & Skill Tree Studio Modal */}
      {studioOpen && (
        <CharacterModal
          profile={profile}
          compactLayout={compactLayout}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setStudioOpen(false)}
        />
      )}

      {/* Daily Missions, Events, Secrets & Records Modal */}
      {missionsOpen && (
        <MissionsModal
          profile={profile}
          compactLayout={compactLayout}
          onUpdateProfile={handleUpdateProfile}
          onLaunchEvent={(levelNumber, title) => {
            const activeEv = getActiveUnexpectedEvent();
            activeEventRef.current = {
              levelNumber,
              title,
              bonusCoins: activeEv.levelNumber === levelNumber ? activeEv.bonusCoins : 150,
              bonusXp: activeEv.levelNumber === levelNumber ? activeEv.bonusXp : 200,
            };
            activeTournamentRef.current = null;
            setMissionsOpen(false);
            startRun(false, levelNumber, false, { activeEventTitle: title });
          }}
          onClose={() => setMissionsOpen(false)}
        />
      )}

      {/* Global Leaderboards, Ghost Races & Tournaments Modal */}
      {leaderboardsOpen && (
        <LeaderboardModal
          currentStage={selectedLevel}
          compactLayout={compactLayout}
          onRaceGhost={(levelNumber, ghost) => {
            activeEventRef.current = null;
            activeTournamentRef.current = null;
            setLeaderboardsOpen(false);
            startRun(false, levelNumber, false, { extraGhosts: [ghost] });
          }}
          onEnterTournament={(levelNumber, tournamentId, title) => {
            activeEventRef.current = null;
            activeTournamentRef.current = { tournamentId, title, levelNumber };
            setLeaderboardsOpen(false);
            startRun(false, levelNumber, false, { tournamentId });
          }}
          onClose={() => setLeaderboardsOpen(false)}
        />
      )}

      {/* Online Multiplayer Rooms & Spectator Modal */}
      {multiplayerOpen && (
        <MultiplayerModal
          profile={profile}
          currentStage={selectedLevel}
          activeRoom={activeRoom}
          chatLog={chatLog}
          initialJoinCode={inviteJoinCode}
          compactLayout={compactLayout}
          onRoomUpdated={(room) => {
            setActiveRoom(room);
            if (!room) {
              remotePlayersMapRef.current.clear();
              worldRef.current.remotePlayers = [];
            }
          }}
          onClose={() => setMultiplayerOpen(false)}
        />
      )}

      {/* Non-blocking Multiplayer Race Countdown Overlay */}
      {roomCountdown !== null && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px]">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Online Rooftop Race Starting
            </div>
            <div className="mt-2 font-display text-7xl font-bold text-white drop-shadow-[0_6px_24px_rgba(16,185,129,0.5)]">
              {roomCountdown}
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking Angled Velocity Shutter Wipe */}
      {shutterKey > 0 && (
        <div
          key={`shutter-${shutterKey}`}
          aria-hidden="true"
          className="animate-shutter-wipe pointer-events-none fixed inset-y-0 -left-1/4 z-50 w-[150%] bg-slate-950"
        >
          <div className="absolute inset-y-0 right-0 w-3 bg-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.9)]" />
        </div>
      )}

      {/* Non-blocking Run Intro Slam Banner */}
      {gameState === 'PLAYING' && shiftBanner && (
        <div
          key={`banner-${shiftBanner.key}`}
          aria-hidden="true"
          className={`animate-shift-banner pointer-events-none fixed inset-x-0 z-20 flex flex-col items-center text-center ${
            compactLayout ? 'top-13' : 'top-20'
          }`}
        >
          <div
            className={`font-display font-bold tracking-tight text-slate-50 drop-shadow-[0_4px_16px_rgba(2,6,23,0.9)] ${
              compactLayout ? 'text-4xl' : 'text-5xl sm:text-6xl'
            }`}
          >
            {shiftBanner.title}
          </div>
          <div className="mt-1 text-xs font-medium tracking-wide text-orange-300 drop-shadow-[0_2px_8px_rgba(2,6,23,0.95)] sm:text-sm">
            {shiftBanner.subtitle}
          </div>
        </div>
      )}
    </main>
  );
}
