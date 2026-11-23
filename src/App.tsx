import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
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
import { renderWorld } from './engine/renderer';
import { buildLevelCourse, ENDLESS_COURSE, MAX_LEVEL, TUTORIAL_COURSE } from './levels/courses';
import { BestRecord, CameraZoom, GameState, HudSnapshot, InputState, RunSummary, SavedRunSnapshot } from './types/game';
import { haptics } from './utils/haptics';

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

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
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

  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const runSummaryRef = useRef<RunSummary | null>(null);
  runSummaryRef.current = runSummary;
  const [shutterKey, setShutterKey] = useState<number>(0);
  const [shiftBanner, setShiftBanner] = useState<{ key: number; title: string; subtitle: string } | null>(null);
  const [hud, setHud] = useState<HudSnapshot>({
    levelNumber: initialProgress.selectedLevel,
    runLevel: initialProgress.selectedLevel,
    isEndless: false,
    elapsedTime: 0,
    timeRemaining: 0,
    distanceMeters: 0,
    progressPct: 0,
    shardsCollected: 0,
    totalShards: 0,
    takedownsCount: 0,
    score: 0,
    lastTrickLabel: '',
    chaserDistanceMeters: 11,
    highPlaceStreak: 0,
    highPlacesPassed: 0,
    levelUpsEarned: 0,
    comboMultiplier: 1,
    activePowerUps: { surge: 0, shield: 0, magnet: 0 },
    tutorial: {
      active: false,
      step: 'complete',
      waitingAction: null,
      bannerTimer: 0,
    },
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<WorldRuntime>(
    (() => {
      const w =
        savedRun && savedRun.elapsedTime > 0.2
          ? restoreWorldFromSave(savedRun)
          : createWorldRuntime(tutorialDone ? buildLevelCourse(initialProgress.selectedLevel) : TUTORIAL_COURSE, {
              tutorialMode: !tutorialDone,
              cameraZoom,
            });
      w.cameraZoom = cameraZoom;
      w.targetCameraZoom = cameraZoom;
      return w;
    })()
  );
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const inputRef = useRef<InputState>({
    left: false,
    right: false,
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
      jumpPressed: false,
      jumpHeld: false,
      slideHeld: false,
      slidePressed: false,
    };
  }, []);

  const saveActiveWorldSnapshot = useCallback((syncUiState = true) => {
    const world = worldRef.current;
    if (world.finished || world.tutorialActive || world.elapsedTime <= 0.15) return;
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

  const handleChangePlayMode = useCallback((mode: PlayMode) => {
    playModeRef.current = mode;
    setPlayMode(mode);
    if (gameStateRef.current === 'TITLE_MENU') {
      const course = mode === 'endless' ? ENDLESS_COURSE : buildLevelCourse(selectedLevelRef.current);
      worldRef.current = createWorldRuntime(course, { cameraZoom: cameraZoomRef.current });
    }
  }, []);

  const handleSelectLevel = useCallback((lvl: number) => {
    const clamped = Math.min(highestUnlockedRef.current, clampLevel(lvl));
    selectedLevelRef.current = clamped;
    setSelectedLevel(clamped);
    persistLevelProgress(highestUnlockedRef.current, clamped);
    if (gameStateRef.current === 'TITLE_MENU') {
      const preview = createWorldRuntime(buildLevelCourse(clamped), { cameraZoom: cameraZoomRef.current });
      worldRef.current = preview;
    }
  }, []);

  const startRun = useCallback(
    (forceTutorial = false, targetLevel?: number, endlessOverride?: boolean) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      tryLockLandscapeOrientation();

      const useTutorial = forceTutorial || !tutorialDoneRef.current;
      const isEndless = typeof endlessOverride === 'boolean' ? endlessOverride : playModeRef.current === 'endless';
      const lvl = clampLevel(targetLevel ?? selectedLevelRef.current);

      if (!forceTutorial) {
        clearSavedRun();
        if (!isEndless) {
          playModeRef.current = 'levels';
          setPlayMode('levels');
          selectedLevelRef.current = lvl;
          setSelectedLevel(lvl);
          persistLevelProgress(highestUnlockedRef.current, lvl);
        } else {
          playModeRef.current = 'endless';
          setPlayMode('endless');
        }
      }

      const freshWorld = createWorldRuntime(
        useTutorial ? TUTORIAL_COURSE : isEndless ? ENDLESS_COURSE : buildLevelCourse(lvl),
        { tutorialMode: useTutorial, cameraZoom: cameraZoomRef.current }
      );
      worldRef.current = freshWorld;
      clearInputs();
      setRunSummary(null);
      setHud(getHudSnapshot(freshWorld));
      triggerTransition(
        useTutorial
          ? { title: 'Pixy Dash Guide', subtitle: 'Swipe up to vault · Swipe down to slide & sweep' }
          : isEndless
          ? { title: 'Pixy Dash Endless', subtitle: 'Clear 5 high places without falling to level up · Dodge the lava' }
          : { title: `Level ${lvl}`, subtitle: `Pixy Dash · Stage ${lvl} of ${MAX_LEVEL} — clear 5 high places to level up!` }
      );
      setGameState('PLAYING');
    },
    [clearInputs, clearSavedRun, triggerTransition]
  );

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
      const restored = restoreWorldFromSave(save);
      restored.cameraZoom = cameraZoomRef.current;
      restored.targetCameraZoom = cameraZoomRef.current;
      worldRef.current = restored;
      const isEndless = Boolean(save.isEndless || save.courseId === 'endless-skyline');
      playModeRef.current = isEndless ? 'endless' : 'levels';
      setPlayMode(isEndless ? 'endless' : 'levels');
      clearInputs();
      setRunSummary(null);
      setHud(getHudSnapshot(restored));
      triggerTransition({
        title: isEndless ? 'Endless Run' : `Level ${save.levelNumber ?? 1}`,
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
    (summary: RunSummary) => {
      gameStateRef.current = 'ROUND_SUMMARY';
      clearSavedRun();

      if (summary.cleared && !summary.isEndless) {
        const nextLevel = Math.min(MAX_LEVEL, summary.levelNumber + 1);
        const nextUnlocked = Math.max(highestUnlockedRef.current, nextLevel);
        highestUnlockedRef.current = nextUnlocked;
        setHighestUnlockedLevel(nextUnlocked);
        selectedLevelRef.current = nextLevel;
        setSelectedLevel(nextLevel);
        persistLevelProgress(nextUnlocked, nextLevel);
      }

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

      setGameState('ROUND_SUMMARY');
    },
    [clearSavedRun]
  );

  // Auto-save active run if user closes tab, refreshes, or switches away
  useEffect(() => {
    const persistSync = () => {
      if (gameStateRef.current !== 'PLAYING' && gameStateRef.current !== 'PAUSED') return;
      const world = worldRef.current;
      if (world.finished || world.tutorialActive || world.elapsedTime <= 0.15) return;
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
        e.preventDefault();
        startRun(worldRef.current.tutorialActive, worldRef.current.course.levelNumber, Boolean(worldRef.current.course.isEndless));
        return;
      }

      if (gameStateRef.current === 'TITLE_MENU' && (code === 'Space' || code === 'Enter')) {
        e.preventDefault();
        const existing = savedRunRef.current;
        if (existing && existing.elapsedTime > 0.2) {
          continueSavedRun(existing);
        } else {
          startRun(false, selectedLevelRef.current, playModeRef.current === 'endless');
        }
        return;
      }

      if (gameStateRef.current === 'ROUND_SUMMARY' && (code === 'Space' || code === 'Enter')) {
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

      if (gameStateRef.current !== 'PLAYING') return;

      if (code === 'ArrowLeft' || code === 'KeyA') {
        inputRef.current.left = true;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        inputRef.current.right = true;
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
  }, [clearInputs, continueSavedRun, handleChangeCameraZoom, saveActiveWorldSnapshot, startRun, toggleFullscreen]);

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
          if (!world.course.isEndless) {
            const nextUnlocked = Math.max(highestUnlockedRef.current, Math.min(MAX_LEVEL, newLvl));
            highestUnlockedRef.current = nextUnlocked;
            setHighestUnlockedLevel(nextUnlocked);
            selectedLevelRef.current = newLvl;
            setSelectedLevel(newLvl);
            persistLevelProgress(nextUnlocked, newLvl);
          }
          setShiftBanner({
            key: Date.now() + Math.random(),
            title: `LEVEL UP! · LEVEL ${newLvl}`,
            subtitle: '5 High Places cleared without falling — Sky Surge +500 pts!',
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
      } else if (state === 'TITLE_MENU') {
        world.simTime += dt;
        world.cameraZoom += (world.targetCameraZoom - world.cameraZoom) * Math.min(1, dt * 8.5);
        if (!savedRunRef.current) {
          world.cameraX = 120 + Math.sin(world.simTime * 0.18) * 120;
        }
      }

      const { w, h } = syncCanvasSize();
      renderWorld(ctx, world, w, h);
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
          if (gameState !== 'PLAYING') return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          swipeRef.current = {
            active: true,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
          };
        }}
        onPointerMove={(e) => {
          if (gameState !== 'PLAYING') return;
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
          onChangePlayMode={handleChangePlayMode}
          onSelectLevel={handleSelectLevel}
          onChangeCameraZoom={handleChangeCameraZoom}
          onContinueSavedRun={continueSavedRun}
          onStartRun={(lvl) => startRun(false, lvl, false)}
          onStartEndlessRun={() => startRun(false, undefined, true)}
          onStartTutorial={() => startRun(true)}
          onToggleMute={handleToggleMute}
          onToggleVibration={handleToggleVibration}
          onToggleFullscreen={toggleFullscreen}
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
          cameraZoom={cameraZoom}
          onToggleMute={handleToggleMute}
          onToggleVibration={handleToggleVibration}
          onChangeCameraZoom={handleChangeCameraZoom}
          onResume={() => setGameState('PLAYING')}
          onRestart={() =>
            startRun(
              worldRef.current.tutorialActive,
              worldRef.current.course.levelNumber,
              Boolean(worldRef.current.course.isEndless)
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
          onNextLevel={() => startRun(false, Math.min(MAX_LEVEL, runSummary.levelNumber + 1), false)}
          onPlayAgain={() => startRun(false, runSummary.levelNumber, runSummary.isEndless)}
          onMainMenu={() => {
            clearInputs();
            const course =
              playModeRef.current === 'endless'
                ? ENDLESS_COURSE
                : buildLevelCourse(selectedLevelRef.current);
            worldRef.current = createWorldRuntime(course, {
              cameraZoom: cameraZoomRef.current,
            });
            triggerTransition();
            setGameState('TITLE_MENU');
          }}
        />
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
          <div className={`font-display font-bold tracking-tight text-slate-50 drop-shadow-[0_4px_16px_rgba(2,6,23,0.9)] ${compactLayout ? 'text-4xl' : 'text-5xl sm:text-6xl'}`}>
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
