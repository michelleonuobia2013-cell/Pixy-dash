import { ArrowRight, Camera, List, RotateCcw } from 'lucide-react';
import { getChallengeLabel } from '../levels/districts';
import { RunSummary } from '../types/game';
import { formatRunTime } from './GameHUD';

interface RunSummaryModalProps {
  summary: RunSummary;
  hasNextLevel: boolean;
  compactLayout: boolean;
  leaderboardSubmitted?: boolean;
  onWatchReplay: () => void;
  onNextLevel: () => void;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function RunSummaryModal({
  summary,
  hasNextLevel,
  compactLayout,
  leaderboardSubmitted,
  onWatchReplay,
  onNextLevel,
  onPlayAgain,
  onMainMenu,
}: RunSummaryModalProps) {
  const canAdvance = !summary.isEndless && summary.cleared && hasNextLevel;

  return (
    <div className="animate-backdrop-fade fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm">
      <div
        className={`animate-modal-pop max-h-full w-full overflow-y-auto rounded-xl border bg-slate-900 ${
          summary.cleared
            ? 'border-emerald-500/50 shadow-[0_0_50px_-14px_rgba(16,185,129,0.45)]'
            : 'border-orange-500/35 shadow-[0_0_50px_-14px_rgba(249,115,22,0.4)]'
        } ${compactLayout ? 'max-w-lg p-4' : 'max-w-md p-6 sm:p-7'}`}
      >
        <div
          className={`flex items-baseline justify-between gap-4 border-b border-slate-800 ${
            compactLayout ? 'pb-2.5' : 'pb-4'
          }`}
        >
          <div>
            <h2 className={`font-display font-bold text-slate-50 ${compactLayout ? 'text-2xl' : 'text-3xl'}`}>
              {summary.isEndless
                ? summary.caughtByChaser
                  ? 'Caught by Pursuer'
                  : summary.fellInLava
                  ? 'Fell into Boiling Lava'
                  : 'Endless Run Ended'
                : summary.cleared
                ? summary.levelNumber === 500
                  ? 'Rooftop 500 Conquered!'
                  : `Stage ${summary.levelNumber} Cleared`
                : summary.caughtByChaser
                ? 'Caught by Pursuer'
                : summary.fellInLava
                ? 'Fell into Boiling Lava'
                : `Stage ${summary.levelNumber} Failed`}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>
                {summary.cleared
                  ? 'Finish gate reached'
                  : summary.caughtByChaser
                  ? 'Flying mystery pursuer closed the gap'
                  : summary.fellInLava
                  ? 'Submerged in molten magma below the skyline'
                  : 'No second chance — try again'}{' '}
                · {formatRunTime(summary.elapsedTime)}
              </span>
              {summary.isNewBest && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-orange-400">New Best Distance</span>
                </>
              )}
              {leaderboardSubmitted && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-cyan-300">Uploaded to Global Leaderboard</span>
                </>
              )}
            </div>
          </div>

          {summary.medal !== 'None' && (
            <div className="text-right shrink-0">
              <div className="text-[11px] font-medium text-slate-400">Rank</div>
              <div
                className={`font-display font-bold ${compactLayout ? 'text-xl' : 'text-2xl'} ${
                  summary.medal === 'Gold'
                    ? 'text-amber-400'
                    : summary.medal === 'Silver'
                    ? 'text-slate-200'
                    : 'text-orange-400'
                }`}
              >
                {summary.medal}
              </div>
            </div>
          )}
        </div>

        <div className={`grid grid-cols-2 ${compactLayout ? 'mt-3 gap-2' : 'mt-5 gap-3'}`}>
          <div className={`rounded-lg border border-slate-800 bg-slate-950/50 ${compactLayout ? 'p-2.5' : 'p-3'}`}>
            <div className="text-xs text-slate-400">Coins &amp; XP Earned</div>
            <div className="mt-0.5 font-mono-tabular text-lg font-bold text-amber-300">
              +{summary.coinsEarned}c <span className="text-sm text-cyan-300">· +{summary.xpEarned} XP</span>
            </div>
          </div>

          <div className={`rounded-lg border border-slate-800 bg-slate-950/50 ${compactLayout ? 'p-2.5' : 'p-3'}`}>
            <div className="text-xs text-slate-400">
              {summary.raceRank ? 'Race Podium' : 'High Places · Level Ups'}
            </div>
            <div className="mt-0.5 font-mono-tabular text-lg font-bold text-emerald-400">
              {summary.raceRank
                ? `#${summary.raceRank} / ${summary.totalRacers}`
                : `${summary.highPlacesPassed} · +${summary.levelUpsEarned}`}
            </div>
          </div>

          <div className={`rounded-lg border border-slate-800 bg-slate-950/50 ${compactLayout ? 'p-2.5' : 'p-3'}`}>
            <div className="text-xs text-slate-400">Distance · Max Leap</div>
            <div className="mt-0.5 font-mono-tabular text-base font-semibold text-slate-100">
              {summary.distanceMeters} m · {summary.longestJumpMeters.toFixed(1)} m
            </div>
          </div>

          <div className={`rounded-lg border border-slate-800 bg-slate-950/50 ${compactLayout ? 'p-2.5' : 'p-3'}`}>
            <div className="text-xs text-slate-400">Perfect Landings · KOs</div>
            <div className="mt-0.5 font-mono-tabular text-base font-semibold text-slate-100">
              {summary.perfectLandings} · {summary.takedownsCount}
            </div>
          </div>
        </div>

        {(summary.challengeTag !== 'standard' || summary.secretsDiscovered.length > 0) && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300 flex flex-wrap justify-between gap-2">
            {summary.challengeTag !== 'standard' && (
              <span className={summary.challengeCompleted ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {getChallengeLabel(summary.challengeTag)}: {summary.challengeCompleted ? 'Cleared' : 'Missed'}
              </span>
            )}
            {summary.secretsDiscovered.length > 0 && (
              <span className="text-emerald-300 font-semibold">
                {summary.secretsDiscovered.length} Secret Discovered!
              </span>
            )}
          </div>
        )}

        <div className={compactLayout ? 'mt-3.5 grid grid-cols-2 gap-2' : 'mt-5 flex flex-col gap-2.5'}>
          {canAdvance ? (
            <>
              <button
                type="button"
                onClick={onNextLevel}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-500 active:scale-[0.98] whitespace-nowrap"
              >
                <span>Next Stage ({summary.levelNumber + 1})</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onPlayAgain}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Replay Stage {summary.levelNumber}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white transition-all duration-150 hover:bg-orange-500 active:scale-[0.98] whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{summary.isEndless ? 'Retry Endless Run' : `Retry Stage ${summary.levelNumber}`}</span>
            </button>
          )}

          {summary.replayFrames.length >= 2 && (
            <button
              type="button"
              onClick={onWatchReplay}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-4 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/50 whitespace-nowrap"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Replay &amp; Photo Mode</span>
            </button>
          )}

          <button
            type="button"
            onClick={onMainMenu}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-4 text-xs font-medium text-slate-300 hover:bg-slate-800 whitespace-nowrap"
          >
            <List className="h-3.5 w-3.5" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
