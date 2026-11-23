import {
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  Ghost,
  Grid3X3,
  Infinity as InfinityIcon,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Settings,
  Smartphone,
  Sparkles,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { PlayerProfile, xpForNextLevel } from '../engine/progression';
import { getChallengeLabel, getChallengeTagForLevel, getDistrictForLevel, ROOFTOP_DISTRICTS } from '../levels/districts';
import { BestRecord, CameraZoom, SavedRunSnapshot } from '../types/game';
import { formatRunTime } from './GameHUD';

export type PlayMode = 'levels' | 'endless';

interface TitleMenuProps {
  playMode: PlayMode;
  selectedLevel: number;
  highestUnlockedLevel: number;
  maxLevel: number;
  endlessRecord?: BestRecord;
  savedRun?: SavedRunSnapshot;
  isFirstTime: boolean;
  compactLayout: boolean;
  cameraZoom: CameraZoom;
  muted: boolean;
  vibrationEnabled: boolean;
  isFullscreen: boolean;
  profile: PlayerProfile;
  onlineRoomCode?: string | null;
  onChangePlayMode: (mode: PlayMode) => void;
  onSelectLevel: (level: number) => void;
  onChangeCameraZoom: (zoom: CameraZoom) => void;
  onContinueSavedRun: (save: SavedRunSnapshot) => void;
  onStartRun: (level?: number) => void;
  onStartEndlessRun: () => void;
  onStartTutorial: () => void;
  onToggleMute: () => void;
  onToggleVibration: () => void;
  onToggleFullscreen: () => void;
  onOpenStudio: () => void;
  onOpenMissions: () => void;
  onOpenLeaderboards: () => void;
  onOpenMultiplayer: () => void;
  onToggleRivals: () => void;
  onToggleGhost: () => void;
  onToggleSlowMo: () => void;
}

export function TitleMenu({
  playMode,
  selectedLevel,
  highestUnlockedLevel,
  maxLevel,
  endlessRecord,
  savedRun,
  isFirstTime,
  compactLayout,
  cameraZoom,
  muted,
  vibrationEnabled,
  isFullscreen,
  profile,
  onlineRoomCode,
  onChangePlayMode,
  onSelectLevel,
  onChangeCameraZoom,
  onContinueSavedRun,
  onStartRun,
  onStartEndlessRun,
  onStartTutorial,
  onToggleMute,
  onToggleVibration,
  onToggleFullscreen,
  onOpenStudio,
  onOpenMissions,
  onOpenLeaderboards,
  onOpenMultiplayer,
  onToggleRivals,
  onToggleGhost,
  onToggleSlowMo,
}: TitleMenuProps) {
  const hasSavedSpot = Boolean(savedRun && savedRun.elapsedTime > 0.2);
  const savedIsEndless = Boolean(savedRun && (savedRun.isEndless || savedRun.courseId === 'endless-skyline'));
  const [showSettings, setShowSettings] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [pickerBandIndex, setPickerBandIndex] = useState(() =>
    Math.min(9, Math.max(0, Math.floor((selectedLevel - 1) / 50)))
  );

  const activeDistrictBand = ROOFTOP_DISTRICTS[pickerBandIndex] ?? ROOFTOP_DISTRICTS[0];
  const selectedDistrict = getDistrictForLevel(selectedLevel);
  const selectedChallenge = getChallengeTagForLevel(selectedLevel);
  const hasClaimableMission =
    !profile.dailyRewardClaimedToday ||
    profile.missions.some((m) => !m.claimed && m.progress >= m.target);
  const xpNeeded = xpForNextLevel(profile.playerLevel);

  return (
    <div
      className={`animate-backdrop-fade fixed inset-0 z-30 flex flex-col justify-between overflow-y-auto bg-gradient-to-t from-slate-950/92 via-slate-950/45 to-slate-950/65 ${
        compactLayout ? 'px-5 py-3.5' : 'p-5 sm:p-10'
      }`}
    >
      {/* Top Bar */}
      <div className="animate-menu-rise flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <span
            className={`font-display font-bold tracking-wide text-slate-50 whitespace-nowrap ${
              compactLayout ? 'text-xl' : 'text-2xl'
            }`}
          >
            Pixy Dash
          </span>
          <span className="hidden sm:inline text-xs font-mono-tabular text-slate-300">
            Lvl {profile.playerLevel} ({profile.xp}/{xpNeeded} XP) ·{' '}
            <span className="font-bold text-amber-300">{profile.coins.toLocaleString()} Coins</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="text-xs sm:text-sm font-mono-tabular text-slate-300 whitespace-nowrap">
            Unlocked <span className="font-bold text-emerald-400">{highestUnlockedLevel}</span>
            <span className="text-slate-500"> / {maxLevel}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label="Open Settings"
            className={`flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 text-xs font-medium text-slate-200 backdrop-blur-md transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap ${
              compactLayout ? 'h-9' : 'h-10 gap-2 px-3.5'
            }`}
          >
            <Settings className="h-4 w-4 text-orange-400" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className={`flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 text-xs font-medium text-slate-200 backdrop-blur-md transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap ${
              compactLayout ? 'h-9' : 'h-10 gap-2 px-3.5'
            }`}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {!compactLayout && (
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Architectural Deck */}
      <div
        className={`animate-menu-rise mx-auto w-full max-w-4xl [animation-delay:55ms] ${
          compactLayout ? 'mt-2' : 'mt-6'
        }`}
      >
        <div className={compactLayout ? 'mb-2' : 'mb-4'}>
          <h1
            className={`font-display font-bold tracking-tight text-slate-50 text-balance ${
              compactLayout ? 'text-3xl leading-none' : 'text-5xl sm:text-6xl'
            }`}
          >
            Pixy Dash.
          </h1>
          <p className={`text-slate-300 ${compactLayout ? 'mt-1 text-xs line-clamp-2' : 'mt-2 text-sm sm:text-base'}`}>
            500 giant rooftops across 10 districts above boiling lava. Wall-run, sprint, race NPC rivals or live online lobbies, and master Rooftop 500.
          </p>

          {/* Feature Hub Buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenStudio}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-700/90 bg-slate-900/85 px-3.5 text-xs font-semibold text-slate-100 backdrop-blur-md transition-colors hover:border-orange-500/70 hover:bg-slate-800 whitespace-nowrap"
            >
              <User className="h-4 w-4 text-orange-400" />
              <span>Runner Studio &amp; Skills</span>
            </button>

            <button
              type="button"
              onClick={onOpenMultiplayer}
              className={`flex h-10 items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold backdrop-blur-md transition-colors whitespace-nowrap ${
                onlineRoomCode
                  ? 'border-emerald-500/80 bg-emerald-950/70 text-emerald-200'
                  : 'border-slate-700/90 bg-slate-900/85 text-slate-100 hover:border-emerald-500/60 hover:bg-slate-800'
              }`}
            >
              <Users className="h-4 w-4 text-emerald-400" />
              <span>{onlineRoomCode ? `Room ${onlineRoomCode}` : 'Online Multiplayer'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenMissions}
              className="relative flex h-10 items-center gap-2 rounded-lg border border-slate-700/90 bg-slate-900/85 px-3.5 text-xs font-semibold text-slate-100 backdrop-blur-md transition-colors hover:border-cyan-500/60 hover:bg-slate-800 whitespace-nowrap"
            >
              <Compass className="h-4 w-4 text-cyan-400" />
              <span>Missions &amp; Secrets</span>
              {hasClaimableMission && (
                <span className="h-2 w-2 rounded-xs bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenLeaderboards}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-700/90 bg-slate-900/85 px-3.5 text-xs font-semibold text-slate-100 backdrop-blur-md transition-colors hover:border-amber-500/60 hover:bg-slate-800 whitespace-nowrap"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Leaderboards &amp; Tournaments</span>
            </button>
          </div>
        </div>

        <div
          className={`rounded-lg border border-orange-500/80 bg-slate-900/90 backdrop-blur-md shadow-[0_0_32px_-10px_rgba(249,115,22,0.45)] ${
            compactLayout ? 'p-3.5' : 'p-5'
          }`}
        >
          {/* Mode Tabs + Mode Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div role="tablist" aria-label="Game mode" className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-950/85 p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={playMode === 'levels'}
                  onClick={() => onChangePlayMode('levels')}
                  className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-500 ${
                    playMode === 'levels' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Levels 1–{maxLevel}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={playMode === 'endless'}
                  onClick={() => onChangePlayMode('endless')}
                  className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-500 ${
                    playMode === 'endless' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <InfinityIcon className="h-3.5 w-3.5" />
                  <span>Endless Run</span>
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-display font-bold text-slate-50 ${compactLayout ? 'text-lg' : 'text-xl'}`}>
                    {playMode === 'endless'
                      ? 'Endless Pursuit'
                      : `Stage ${selectedLevel} · ${selectedDistrict.name}`}
                  </span>
                  {playMode === 'levels' && selectedChallenge !== 'standard' && (
                    <span className="text-xs font-semibold text-amber-300">
                      [{getChallengeLabel(selectedChallenge)}]
                    </span>
                  )}
                </div>
                {hasSavedSpot && savedRun ? (
                  <p className="text-xs font-medium text-emerald-400">
                    Saved {savedIsEndless ? 'Endless Run' : `Level ${savedRun.levelNumber ?? 1}`} at {savedRun.distanceMeters} m · {formatRunTime(savedRun.elapsedTime)}
                  </p>
                ) : isFirstTime ? (
                  <p className="text-xs font-medium text-orange-300">
                    First run launches a quick swipe warm-up before the chase begins.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    {playMode === 'endless'
                      ? 'Infinite procedural rooftops — survive as far as you can.'
                      : selectedDistrict.signatureFeature}
                  </p>
                )}
              </div>
            </div>

            {playMode === 'levels' && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-950/80 p-1">
                  <button
                    type="button"
                    disabled={selectedLevel <= 1}
                    onClick={() => onSelectLevel(Math.max(1, selectedLevel - 1))}
                    aria-label="Previous Level"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-orange-500"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[82px] text-center text-xs font-mono-tabular font-bold text-slate-100">
                    Stage {selectedLevel}
                  </span>
                  <button
                    type="button"
                    disabled={selectedLevel >= highestUnlockedLevel}
                    onClick={() => onSelectLevel(Math.min(highestUnlockedLevel, selectedLevel + 1))}
                    aria-label="Next Level"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-orange-500"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPickerBandIndex(Math.min(9, Math.max(0, Math.floor((selectedLevel - 1) / 50))));
                    setShowLevelPicker(true);
                  }}
                  className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/90 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap"
                >
                  <Grid3X3 className="h-3.5 w-3.5 text-orange-400" />
                  <span>Districts 1–{maxLevel}</span>
                </button>
              </div>
            )}
          </div>

          <div
            className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 ${
              compactLayout ? 'mt-2.5 pt-2.5' : 'mt-4 pt-4 gap-4'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono-tabular">
              <span>Best Distance: {endlessRecord?.bestDistanceM ? `${endlessRecord.bestDistanceM} m` : '—'}</span>
              {endlessRecord?.bestScore ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>High Score: {endlessRecord.bestScore.toLocaleString()}</span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span className="text-orange-300">
                Rivals: {profile.rivalsEnabled ? 'On' : 'Off'} · Ghost: {profile.ghostEnabled ? 'On' : 'Off'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isFirstTime && (
                <button
                  type="button"
                  onClick={onStartTutorial}
                  className={`flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap ${
                    compactLayout ? 'h-9.5' : 'h-12 px-4 text-sm'
                  }`}
                >
                  <BookOpen className="h-4 w-4 text-orange-400" />
                  <span>Runner Guide</span>
                </button>
              )}

              {hasSavedSpot && savedRun && (
                <button
                  type="button"
                  onClick={() => onContinueSavedRun(savedRun)}
                  className={`flex items-center justify-center gap-2 rounded-lg border border-emerald-500/70 bg-emerald-950/50 px-4 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-900/60 focus-visible:outline-2 focus-visible:outline-emerald-400 whitespace-nowrap ${
                    compactLayout ? 'h-9.5' : 'h-12 px-5 text-sm'
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Continue {savedIsEndless ? 'Endless' : `Stage ${savedRun.levelNumber ?? 1}`}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (playMode === 'endless') {
                    onStartEndlessRun();
                  } else {
                    onStartRun(selectedLevel);
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-lg bg-orange-600 font-semibold text-white shadow-[0_10px_28px_-6px_rgba(234,88,12,0.55)] transition-all duration-150 hover:bg-orange-500 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-orange-400 whitespace-nowrap shrink-0 ${
                  compactLayout ? 'h-9.5 px-5 text-xs' : 'h-12 gap-2.5 px-8 text-sm'
                }`}
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {isFirstTime
                    ? 'Start Warm-Up'
                    : playMode === 'endless'
                    ? 'Start Endless Run'
                    : `Play Stage ${selectedLevel}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Levels 1-500 District Browser Modal */}
      {showLevelPicker && (
        <div className="animate-backdrop-fade fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div
            className={`animate-modal-pop flex max-h-full w-full max-w-3xl flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl ${
              compactLayout ? 'p-3.5' : 'p-5'
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h2 className={`font-display font-bold text-slate-50 ${compactLayout ? 'text-xl' : 'text-2xl'}`}>
                  10 Districts · Stages 1–{maxLevel}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeDistrictBand.name} ({activeDistrictBand.rangeStart}–{activeDistrictBand.rangeEnd}) · {activeDistrictBand.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLevelPicker(false)}
                aria-label="Close Level Picker"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-orange-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 10 District Tabs */}
            <div className="mt-3 flex flex-wrap gap-1.5 shrink-0">
              {ROOFTOP_DISTRICTS.map((dist, idx) => {
                const active = idx === pickerBandIndex;
                const bandUnlocked = highestUnlockedLevel >= dist.rangeStart;
                return (
                  <button
                    key={dist.id}
                    type="button"
                    onClick={() => setPickerBandIndex(idx)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-orange-600 text-white'
                        : bandUnlocked
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-950/60 text-slate-500 hover:bg-slate-800/60'
                    }`}
                  >
                    {dist.rangeStart}–{dist.rangeEnd} · {dist.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* Grid of 50 levels in selected district */}
            <div className="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-1.5 overflow-y-auto pr-1 py-1">
              {Array.from({ length: 50 }, (_, offset) => {
                const lvl = activeDistrictBand.rangeStart + offset;
                const unlocked = lvl <= highestUnlockedLevel;
                const isSelected = lvl === selectedLevel;
                const completed = profile.completedLevels.includes(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      onSelectLevel(lvl);
                      setShowLevelPicker(false);
                    }}
                    className={`flex h-9 items-center justify-center gap-1 rounded-md border text-xs font-mono-tabular font-bold transition-colors focus-visible:outline-2 focus-visible:outline-orange-500 ${
                      isSelected
                        ? 'border-orange-400 bg-orange-600 text-white'
                        : completed
                        ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                        : unlocked
                        ? 'border-slate-700 bg-slate-800/80 text-slate-100 hover:border-orange-500/60 hover:bg-slate-700'
                        : 'border-slate-800/70 bg-slate-950/60 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {unlocked ? (
                      <span>{lvl}</span>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 shrink-0" />
                        <span>{lvl}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Overlay on Title Menu */}
      {showSettings && (
        <div className="animate-backdrop-fade fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm">
          <div
            className={`animate-modal-pop max-h-full w-full max-w-sm overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl ${
              compactLayout ? 'p-4' : 'p-6'
            }`}
          >
            <div className={`flex items-center justify-between gap-3 border-b border-slate-800 ${compactLayout ? 'pb-2.5' : 'pb-3'}`}>
              <h2 className={`font-display font-bold text-slate-50 ${compactLayout ? 'text-2xl' : 'text-3xl'}`}>Settings</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Close Settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-orange-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`flex flex-col ${compactLayout ? 'mt-3 gap-2.5' : 'mt-5 gap-3'}`}>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3.5 py-2">
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                  {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-orange-400" />}
                  <span>Sound</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!muted}
                  onClick={onToggleMute}
                  className={`flex h-9 min-w-[74px] items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    !muted ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {muted ? 'Off' : 'On'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3.5 py-2">
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                  <Smartphone className={`h-4 w-4 ${vibrationEnabled ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span>Vibration</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={vibrationEnabled}
                  onClick={onToggleVibration}
                  className={`flex h-9 min-w-[74px] items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    vibrationEnabled ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {vibrationEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3.5 py-2">
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                  <Users className={`h-4 w-4 ${profile.rivalsEnabled ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span>NPC Rivals</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.rivalsEnabled}
                  onClick={onToggleRivals}
                  className={`flex h-9 min-w-[74px] items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    profile.rivalsEnabled ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {profile.rivalsEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3.5 py-2">
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                  <Ghost className={`h-4 w-4 ${profile.ghostEnabled ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>Best Ghost</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.ghostEnabled}
                  onClick={onToggleGhost}
                  className={`flex h-9 min-w-[74px] items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    profile.ghostEnabled ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {profile.ghostEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3.5 py-2">
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                  <Sparkles className={`h-4 w-4 ${profile.cinematicSlowMoEnabled ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>Slow-Mo FX</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.cinematicSlowMoEnabled}
                  onClick={onToggleSlowMo}
                  className={`flex h-9 min-w-[74px] items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    profile.cinematicSlowMoEnabled ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {profile.cinematicSlowMoEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3.5 py-2">
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                  <Camera className="h-4 w-4 text-orange-400" />
                  <span>Camera View</span>
                </div>
                <div role="group" aria-label="Camera view zoom" className="flex items-center gap-1 rounded-md bg-slate-900 p-1">
                  {([1, 2, 3] as const).map((zoom) => {
                    const active = cameraZoom === zoom;
                    return (
                      <button
                        key={zoom}
                        type="button"
                        onClick={() => onChangeCameraZoom(zoom)}
                        aria-pressed={active}
                        className={`flex h-8 min-w-[38px] items-center justify-center rounded px-2 text-xs font-mono-tabular font-bold transition-colors whitespace-nowrap ${
                          active ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {`${zoom}×`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
