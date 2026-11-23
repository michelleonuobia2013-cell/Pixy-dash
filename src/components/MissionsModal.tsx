import { Award, Compass, Gift, Sparkles, Target, X, Zap } from 'lucide-react';
import { useState } from 'react';
import {
  getActiveUnexpectedEvent,
  MissionProgressItem,
  PlayerProfile,
  savePlayerProfile,
  xpForNextLevel,
} from '../engine/progression';
import { ROOFTOP_DISTRICTS, SECRET_CATALOG } from '../levels/districts';

interface MissionsModalProps {
  profile: PlayerProfile;
  compactLayout: boolean;
  onUpdateProfile: (next: PlayerProfile) => void;
  onLaunchEvent: (levelNumber: number, title: string) => void;
  onClose: () => void;
}

export function MissionsModal({
  profile,
  compactLayout,
  onUpdateProfile,
  onLaunchEvent,
  onClose,
}: MissionsModalProps) {
  const [tab, setTab] = useState<'missions' | 'secrets' | 'records'>('missions');
  const activeEvent = getActiveUnexpectedEvent();
  const dailyBonusCoins = 100 + Math.min(200, (profile.dailyLoginStreak - 1) * 25);

  const handleClaimDailyLogin = () => {
    if (profile.dailyRewardClaimedToday) return;
    const next: PlayerProfile = {
      ...profile,
      coins: profile.coins + dailyBonusCoins,
      dailyRewardClaimedToday: true,
    };
    savePlayerProfile(next);
    onUpdateProfile(next);
  };

  const handleClaimMission = (mission: MissionProgressItem) => {
    if (mission.claimed || mission.progress < mission.target) return;
    let xp = profile.xp + mission.rewardXp;
    let playerLevel = profile.playerLevel;
    while (xp >= xpForNextLevel(playerLevel)) {
      xp -= xpForNextLevel(playerLevel);
      playerLevel += 1;
    }
    const next: PlayerProfile = {
      ...profile,
      coins: profile.coins + mission.rewardCoins,
      xp,
      playerLevel,
      missions: profile.missions.map((m) => (m.id === mission.id ? { ...m, claimed: true } : m)),
    };
    savePlayerProfile(next);
    onUpdateProfile(next);
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
            <Target className="h-5 w-5 text-orange-400" />
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-50">Missions, Secrets &amp; Career</h2>
              <p className="text-xs text-slate-400 font-mono-tabular">
                {profile.coins.toLocaleString()} Coins · {profile.discoveredSecrets.length} / {SECRET_CATALOG.length} Secrets Found
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setTab('missions')}
                className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                  tab === 'missions' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Missions</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('secrets')}
                className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                  tab === 'secrets' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Secrets</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('records')}
                className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                  tab === 'records' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>Records</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Missions"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-y-auto pr-1 flex flex-col gap-4">
          {tab === 'missions' && (
            <>
              {/* Daily Login & Active Unexpected Event */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col justify-between rounded-xl border border-amber-500/40 bg-slate-950/70 p-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <Gift className="h-4 w-4" />
                      <span>Daily Login Streak · Day {profile.dailyLoginStreak}</span>
                    </div>
                    <div className="mt-1 font-display text-xl font-bold text-slate-100">
                      +{dailyBonusCoins} Bonus Coins
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Log in daily to grow your streak bonus up to 300 Coins.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={profile.dailyRewardClaimedToday}
                    onClick={handleClaimDailyLogin}
                    className={`mt-3 h-10 w-full rounded-lg text-xs font-semibold transition-colors ${
                      profile.dailyRewardClaimedToday
                        ? 'border border-emerald-500/40 bg-emerald-950/50 text-emerald-300 cursor-default'
                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    {profile.dailyRewardClaimedToday ? 'Claimed Today' : `Claim ${dailyBonusCoins} Coins`}
                  </button>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-cyan-500/40 bg-slate-950/70 p-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                      <Sparkles className="h-4 w-4" />
                      <span>Live Skyline Event · Stage {activeEvent.levelNumber}</span>
                    </div>
                    <div className="mt-1 font-display text-xl font-bold text-slate-100">
                      {activeEvent.title}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{activeEvent.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchEvent(activeEvent.levelNumber, activeEvent.title)}
                    className="mt-3 h-10 w-full rounded-lg bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-500"
                  >
                    Run Event Stage (+{activeEvent.bonusCoins} Bonus Coins)
                  </button>
                </div>
              </div>

              {/* Daily & Weekly Missions */}
              <div className="flex flex-col gap-2.5">
                {profile.missions.map((m) => {
                  const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                  const complete = m.progress >= m.target;
                  return (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-mono-tabular font-bold uppercase ${
                              m.period === 'daily' ? 'text-orange-400' : 'text-cyan-400'
                            }`}
                          >
                            {m.period}
                          </span>
                          <span className="font-display text-base font-bold text-slate-100">{m.title}</span>
                        </div>
                        <p className="text-xs text-slate-400">{m.description}</p>
                        <div className="mt-2 flex items-center gap-2.5">
                          <div className="h-2 flex-1 overflow-hidden rounded-xs bg-slate-800">
                            <div
                              className={`h-full transition-all ${complete ? 'bg-emerald-500' : 'bg-orange-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono-tabular text-slate-300">
                            {m.progress}/{m.target}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!complete || m.claimed}
                        onClick={() => handleClaimMission(m)}
                        className={`h-10 min-w-[130px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                          m.claimed
                            ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 cursor-default'
                            : complete
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'border border-slate-800 bg-slate-900 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {m.claimed ? 'Claimed' : `+${m.rewardCoins}c · +${m.rewardXp}xp`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'secrets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SECRET_CATALOG.map((sec) => {
                const found = profile.discoveredSecrets.includes(sec.id);
                const district = ROOFTOP_DISTRICTS[sec.districtIndex];
                return (
                  <div
                    key={sec.id}
                    className={`rounded-xl border p-4 ${
                      found ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800 bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg font-bold text-slate-100">
                        {found ? sec.title : 'Undiscovered Secret'}
                      </span>
                      <span
                        className={`text-xs font-mono-tabular font-bold ${
                          found ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {found ? 'Discovered' : `Stages ${district?.rangeStart}–${district?.rangeEnd}`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {found
                        ? sec.description
                        : `Take upper branching shortcuts in ${district?.name ?? 'Skyline'} to locate the glowing emerald portal.`}
                    </p>
                    <div className="mt-2 text-[11px] font-mono-tabular text-amber-300">
                      Reward: +{sec.coinBonus} Coins · +{sec.xpBonus} XP
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'records' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="text-xs text-slate-400">Total Rooftop Distance</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-100">
                    {profile.totalDistanceM.toLocaleString()} m
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="text-xs text-slate-400">Longest Single Leap</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-orange-400">
                    {profile.longestJumpM.toFixed(1)} m
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="text-xs text-slate-400">Rooftops Cleared</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-emerald-400">
                    {profile.completedLevels.length} / 500
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="text-xs text-slate-400">Perfect Landings</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-cyan-300">
                    {profile.totalPerfectLandings}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="text-xs text-slate-400">High Places Passed</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-amber-300">
                    {profile.totalHighPlaces}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="text-xs text-slate-400">Races Won</div>
                  <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-100">
                    {profile.totalRacesWon}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Unlocked Badges &amp; Titles
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.unlockedBadges.map((b) => {
                    const active = profile.activeTitle === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          const next = { ...profile, activeTitle: b };
                          savePlayerProfile(next);
                          onUpdateProfile(next);
                        }}
                        className={`h-9 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-orange-500 bg-orange-600 text-white'
                            : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {b} {active ? '· Active' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
