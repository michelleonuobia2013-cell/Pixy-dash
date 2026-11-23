import { FastForward, Magnet, Pause, Shield, Zap } from 'lucide-react';
import { HudSnapshot, TutorialStepId } from '../types/game';

interface GameHUDProps {
  hud: HudSnapshot;
  compactLayout: boolean;
  onPause: () => void;
  onSkipTutorial: () => void;
}

export function formatRunTime(sec: number): string {
  const safe = Math.max(0, sec);
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  const whole = Math.floor(rem);
  const hundredths = Math.floor((rem - whole) * 100);
  return `${String(mins).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

const TUTORIAL_COPY: Record<Exclude<TutorialStepId, 'complete'>, { step: string; title: string; body: string }> = {
  'jump-box': {
    step: 'Guide 1 / 3',
    title: 'Swipe Up to Vault',
    body: 'Swipe up anywhere on screen (or press Up / Space) to clear curved blocks.',
  },
  'hotground-jump': {
    step: 'Guide 2 / 3',
    title: 'Dodge Hot Ground',
    body: 'Molten rooftop strips burn on contact — swipe up early to leap clear.',
  },
  'hotground-double': {
    step: 'Guide 2 / 3',
    title: 'Mid-Air Double Jump',
    body: 'Swipe up again in mid-air to perform an Air Vault across wide hazards.',
  },
  'slide-duct': {
    step: 'Guide 3 / 3',
    title: 'Swipe Down to Slide',
    body: 'Swipe down (or press Down / S) to slide under barriers & sweep rooftop sentries.',
  },
};

export function GameHUD({
  hud,
  compactLayout,
  onPause,
  onSkipTutorial,
}: GameHUDProps) {
  const { tutorial, activePowerUps } = hud;
  const tutMeta = tutorial.active && tutorial.step !== 'complete' ? TUTORIAL_COPY[tutorial.step] : null;
  const hasPowerUp = activePowerUps.surge > 0 || activePowerUps.shield > 0 || activePowerUps.magnet > 0;

  return (
    <>
      <header
        className={`animate-backdrop-fade pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-3 ${
          compactLayout ? 'px-4 py-2.5' : 'px-3 py-3 sm:px-5 sm:py-4'
        }`}
      >
        {/* Top-Left: Clean Dedicated Pause Icon */}
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          title="Pause & Settings (Esc / P)"
          aria-label="Pause"
          className={`pointer-events-auto flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/85 text-slate-100 shadow-lg backdrop-blur-md transition-colors hover:border-orange-500/70 hover:bg-slate-900 active:scale-95 focus-visible:outline-2 focus-visible:outline-orange-500 shrink-0 ${
            compactLayout ? 'h-10 w-10' : 'h-11 w-11'
          }`}
        >
          <Pause className="h-5 w-5 text-orange-400" />
        </button>

        {/* Top-Right: Unobtrusive Live Run Telemetry & Active Power-Ups */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg border border-slate-800/70 bg-slate-950/75 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono-tabular backdrop-blur-md whitespace-nowrap">
            {!tutorial.active && (
              hud.isEndless ? (
                <>
                  <span className="font-bold text-amber-300">Endless · Lvl {hud.runLevel}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-emerald-400">Lvl {hud.runLevel}/500</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-semibold text-slate-300">{hud.progressPct}%</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                </>
              )
            )}

            <span className="font-semibold text-slate-100">{formatRunTime(hud.elapsedTime)}</span>

            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-semibold text-orange-400">{hud.distanceMeters} m</span>

            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-semibold text-slate-200">{hud.takedownsCount} KOs</span>

            {!tutorial.active && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span
                  className={`font-semibold ${
                    hud.chaserDistanceMeters <= 5
                      ? 'text-rose-400'
                      : hud.chaserDistanceMeters <= 9
                      ? 'text-amber-300'
                      : 'text-slate-300'
                  }`}
                >
                  Pursuer {hud.chaserDistanceMeters}m
                </span>
              </>
            )}
          </div>

          {!tutorial.active && (
            <div className="flex items-center gap-3 text-xs font-mono-tabular font-semibold drop-shadow-[0_2px_6px_rgba(2,6,23,0.95)] whitespace-nowrap">
              <div className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-slate-950/75 px-2.5 py-1 backdrop-blur-sm">
                <span className="text-[11px] font-medium text-amber-300">High Places</span>
                <div className="flex items-center gap-1" aria-label={`High place streak ${hud.highPlaceStreak} of 5`}>
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <span
                      key={idx}
                      className={`h-2 w-3 rounded-xs transition-colors ${
                        idx < hud.highPlaceStreak ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)]' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-slate-100">{hud.highPlaceStreak}/5</span>
              </div>

              {hud.comboMultiplier > 1 && (
                <span className="font-bold text-amber-300">
                  Combo {hud.comboMultiplier}×
                </span>
              )}
            </div>
          )}

          {hasPowerUp && (
            <div className="flex items-center gap-3 text-xs font-mono-tabular font-semibold drop-shadow-[0_2px_6px_rgba(2,6,23,0.95)] whitespace-nowrap">
              {activePowerUps.surge > 0 && (
                <span className="flex items-center gap-1 text-cyan-300">
                  <Zap className="h-3.5 w-3.5" />
                  Surge {Math.ceil(activePowerUps.surge)}s
                </span>
              )}
              {activePowerUps.shield > 0 && (
                <span className="flex items-center gap-1 text-emerald-300">
                  <Shield className="h-3.5 w-3.5" />
                  Shield {Math.ceil(activePowerUps.shield)}s
                </span>
              )}
              {activePowerUps.magnet > 0 && (
                <span className="flex items-center gap-1 text-amber-300">
                  <Magnet className="h-3.5 w-3.5" />
                  Magnet {Math.ceil(activePowerUps.magnet)}s
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Interactive First-Time Guide Card */}
      {tutMeta && (
        <div
          className={`pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 ${
            compactLayout ? 'top-13' : 'top-16 sm:top-20'
          }`}
        >
          <div
            className={`animate-modal-pop pointer-events-auto flex w-full max-w-lg items-center justify-between gap-4 rounded-xl border border-orange-500/75 bg-slate-950/90 shadow-[0_12px_32px_-8px_rgba(234,88,12,0.5)] backdrop-blur-md ${
              compactLayout ? 'px-3.5 py-2' : 'px-4 py-3'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-orange-400">
                <span>{tutMeta.step}</span>
                {tutorial.waitingAction && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-amber-300">Swipe Now</span>
                  </>
                )}
              </div>
              <div className={`mt-0.5 font-display font-bold tracking-tight text-slate-50 ${compactLayout ? 'text-lg' : 'text-xl'}`}>
                {tutMeta.title}
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                {tutMeta.body}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onSkipTutorial();
              }}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap shrink-0"
            >
              <FastForward className="h-3.5 w-3.5 text-orange-400" />
              <span>Skip Guide</span>
            </button>
          </div>
        </div>
      )}

      {/* Tutorial Complete Celebration Banner */}
      {!tutorial.active && tutorial.bannerTimer > 0 && (
        <div
          className={`animate-modal-pop pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 ${
            compactLayout ? 'top-13' : 'top-16 sm:top-20'
          }`}
        >
          <div className="rounded-xl border border-emerald-500/70 bg-slate-950/90 px-5 py-2 text-center shadow-[0_12px_32px_-8px_rgba(16,185,129,0.45)] backdrop-blur-md">
            <div className="font-display text-lg sm:text-xl font-bold tracking-wide text-emerald-400">
              Pursuit Live — Outrun the Phantom
            </div>
            <div className="text-xs text-slate-200">
              Swipe down to sweep sentries · Jump onto drones · Grab power-ups
            </div>
          </div>
        </div>
      )}

      {/* Active Trick / KO Pop */}
      {hud.lastTrickLabel && (
        <div
          key={hud.lastTrickLabel}
          className={`animate-trick-pop pointer-events-none fixed left-4 z-20 sm:left-5 ${
            tutorial.active || tutorial.bannerTimer > 0
              ? compactLayout
                ? 'top-36'
                : 'top-44 sm:top-24'
              : compactLayout
              ? 'top-14'
              : 'top-16'
          }`}
        >
          <span className="font-display text-lg sm:text-xl font-bold tracking-wider text-orange-400 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
            {hud.lastTrickLabel}
          </span>
        </div>
      )}

      {/* Brief unobtrusive swipe hint at run start (no on-screen control buttons) */}
      {!tutorial.active && hud.elapsedTime < 4.5 && (
        <div className={`pointer-events-none fixed inset-x-0 z-10 flex justify-center px-4 ${compactLayout ? 'bottom-2.5' : 'bottom-5'}`}>
          <div className="rounded-lg border border-slate-800/60 bg-slate-950/65 px-4 py-1.5 text-xs text-slate-200 backdrop-blur-sm whitespace-nowrap">
            Swipe Up: Jump &amp; Air Vault <span className="mx-2 text-slate-500">·</span> Swipe Down: Slide &amp; Sweep Sentries
          </div>
        </div>
      )}
    </>
  );
}
