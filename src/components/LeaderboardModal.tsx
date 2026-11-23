import { Flag, Ghost, RefreshCw, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { GhostParticipant } from '../types/game';
import {
  fetchGhostById,
  fetchLeaderboards,
  fetchTournaments,
  LeaderboardRecord,
  TournamentInfo,
} from '../utils/multiplayerClient';
import { formatRunTime } from './GameHUD';

interface LeaderboardModalProps {
  currentStage: number;
  compactLayout: boolean;
  onRaceGhost: (levelNumber: number, ghost: GhostParticipant) => void;
  onEnterTournament: (levelNumber: number, tournamentId: string, title: string) => void;
  onClose: () => void;
}

export function LeaderboardModal({
  currentStage,
  compactLayout,
  onRaceGhost,
  onEnterTournament,
  onClose,
}: LeaderboardModalProps) {
  const [tab, setTab] = useState<'global' | 'weekly' | 'rooftop' | 'longestJump' | 'tournaments'>('global');
  const [stageFilter, setStageFilter] = useState<number>(currentStage);
  const [entries, setEntries] = useState<LeaderboardRecord[]>([]);
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'tournaments') {
        const list = await fetchTournaments();
        setTournaments(list);
      } else {
        const list = await fetchLeaderboards(tab, stageFilter);
        setEntries(list);
      }
    } catch {
      setError('Could not connect to leaderboard server.');
    } finally {
      setLoading(false);
    }
  }, [tab, stageFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleLoadGhost = async (rec: LeaderboardRecord) => {
    const res = await fetchGhostById(rec.id);
    if (!res) {
      setError('Ghost replay unavailable for that entry.');
      return;
    }
    onRaceGhost(rec.levelNumber, {
      id: rec.id,
      name: rec.playerName,
      label: `${rec.playerName} (${formatRunTime(rec.timeSec)})`,
      kind: 'leaderboard',
      appearance: rec.appearance,
      frames: res.frames,
    });
  };

  return (
    <div className="animate-backdrop-fade fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
      <div
        className={`animate-modal-pop flex max-h-full w-full max-w-3xl flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl ${
          compactLayout ? 'p-3.5' : 'p-5'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-50">Leaderboards &amp; Tournaments</h2>
              <p className="text-xs text-slate-400">
                Server-verified rooftop records · Race any recorded ghost run
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              aria-label="Refresh"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Leaderboards"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-700 bg-slate-950 p-1">
            {([
              ['global', 'Global'],
              ['weekly', 'Weekly'],
              ['rooftop', 'By Stage'],
              ['longestJump', 'Longest Jump'],
              ['tournaments', 'Tournaments'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`h-9 rounded-md px-3 text-xs font-semibold transition-colors ${
                  tab === key ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'rooftop' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Stage</label>
              <input
                type="number"
                min={1}
                max={500}
                value={stageFilter}
                onChange={(e) => setStageFilter(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                className="h-9 w-20 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs font-mono-tabular text-slate-100"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="mt-3 overflow-y-auto pr-1 flex flex-col gap-2">
          {tab === 'tournaments' ? (
            tournaments.map((t) => {
              const hoursLeft = Math.max(1, Math.round((t.endsAt - Date.now()) / (1000 * 60 * 60)));
              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono-tabular text-amber-400">
                        <Flag className="h-3.5 w-3.5" />
                        <span>Stage {t.levelNumber} · {hoursLeft}h remaining</span>
                      </div>
                      <h3 className="mt-0.5 font-display text-xl font-bold text-slate-100">{t.title}</h3>
                      <p className="text-xs text-slate-400">{t.subtitle} · Prize: {t.rewardCoins} Coins &amp; "{t.rewardTitle}"</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEnterTournament(t.levelNumber, t.id, t.title)}
                      className="h-10 rounded-lg bg-orange-600 px-4 text-xs font-semibold text-white hover:bg-orange-500"
                    >
                      Enter Tournament
                    </button>
                  </div>

                  {t.entries.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {t.entries.slice(0, 6).map((ent, idx) => (
                        <div
                          key={`${ent.playerId}-${idx}`}
                          className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-mono-tabular"
                        >
                          <span className="text-slate-200 truncate">
                            #{idx + 1} {ent.playerName}
                          </span>
                          <span className="text-emerald-400">{formatRunTime(ent.timeSec)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No entries yet — set the first benchmark time!</div>
                  )}
                </div>
              );
            })
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
              {loading ? 'Loading records...' : 'No recorded runs yet for this filter. Complete a stage to claim #1!'}
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-8 text-center font-mono-tabular text-sm font-bold ${
                      idx === 0
                        ? 'text-amber-400'
                        : idx === 1
                        ? 'text-slate-200'
                        : idx === 2
                        ? 'text-orange-400'
                        : 'text-slate-500'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">{entry.playerName}</div>
                    <div className="text-xs font-mono-tabular text-slate-400">
                      {entry.isEndless ? 'Endless' : `Stage ${entry.levelNumber}`} · {formatRunTime(entry.timeSec)} ·{' '}
                      {entry.distanceMeters} m
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono-tabular">
                    <div className="text-sm font-bold text-orange-400">
                      {tab === 'longestJump'
                        ? `${entry.longestJumpMeters.toFixed(1)} m`
                        : entry.score.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {tab === 'longestJump' ? 'Longest Jump' : 'Score'}
                    </div>
                  </div>

                  {entry.hasGhost && !entry.isEndless && (
                    <button
                      type="button"
                      onClick={() => void handleLoadGhost(entry)}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50"
                    >
                      <Ghost className="h-3.5 w-3.5" />
                      <span>Race Ghost</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
