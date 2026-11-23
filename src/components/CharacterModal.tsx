import { Check, Lock, RotateCw, Sparkles, User, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  canEquipCustomization,
  COSMETIC_SHOP_ITEMS,
  JACKET_SWATCHES,
  PlayerProfile,
  SCARF_SWATCHES,
  SKILL_TREE_NODES,
  TROUSER_SWATCHES,
} from '../engine/progression';
import { renderCharacterPreview } from '../engine/renderer';
import {
  AccessoryId,
  CharacterCustomization,
  CharacterModelId,
  HairStyleId,
  JumpAnimStyle,
  LandAnimStyle,
  ParkourSkills,
  RunnerAction,
  SneakerStyleId,
} from '../types/game';

interface CharacterModalProps {
  profile: PlayerProfile;
  compactLayout: boolean;
  onUpdateProfile: (next: PlayerProfile) => void;
  onClose: () => void;
}

export function CharacterModal({
  profile,
  compactLayout,
  onUpdateProfile,
  onClose,
}: CharacterModalProps) {
  const [tab, setTab] = useState<'appearance' | 'skills'>('appearance');
  const [previewAction, setPreviewAction] = useState<RunnerAction>('run');
  const [previewFacing, setPreviewFacing] = useState<1 | -1>(1);
  const [nameInput, setNameInput] = useState(profile.customization.name);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      renderCharacterPreview(
        ctx,
        canvas.width,
        canvas.height,
        profile.customization,
        t,
        previewAction,
        previewFacing
      );
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [profile.customization, previewAction, previewFacing]);

  const handleCosmeticAction = (
    item: (typeof COSMETIC_SHOP_ITEMS)[number],
    field: keyof Pick<
      CharacterCustomization,
      'model' | 'hairStyle' | 'sneakerStyle' | 'accessory' | 'jumpStyle' | 'landStyle'
    >
  ) => {
    const unlocked = profile.unlockedCosmetics.includes(item.id);
    if (!unlocked) {
      if (profile.coins < item.cost) return;
      const next: PlayerProfile = {
        ...profile,
        coins: profile.coins - item.cost,
        unlockedCosmetics: [...profile.unlockedCosmetics, item.id],
        customization: {
          ...profile.customization,
          [field]: item.value,
        },
      };
      onUpdateProfile(next);
      return;
    }
    if (!canEquipCustomization(profile, field, item.value)) return;
    onUpdateProfile({
      ...profile,
      customization: {
        ...profile.customization,
        [field]: item.value,
      },
    });
  };

  const handleColorChange = (field: 'jacketColor' | 'trouserColor' | 'scarfColor', color: string) => {
    onUpdateProfile({
      ...profile,
      customization: {
        ...profile.customization,
        [field]: color,
      },
    });
  };

  const handleSaveName = () => {
    const clean = nameInput.replace(/[^\w\s\-_.!]/g, '').trim().slice(0, 16) || 'Pixy';
    setNameInput(clean);
    onUpdateProfile({
      ...profile,
      customization: {
        ...profile.customization,
        name: clean,
      },
    });
  };

  const handleSavePreset = () => {
    const label = `${profile.customization.name.slice(0, 10)} Setup`;
    const nextPresets = [
      { label, config: { ...profile.customization } },
      ...profile.presets.slice(0, 2),
    ];
    onUpdateProfile({ ...profile, presets: nextPresets });
  };

  const handleUpgradeSkill = (key: keyof ParkourSkills, cost: number) => {
    const curr = profile.skills[key];
    if (curr >= 3 || profile.coins < cost) return;
    onUpdateProfile({
      ...profile,
      coins: profile.coins - cost,
      skills: {
        ...profile.skills,
        [key]: curr + 1,
      },
    });
  };

  const renderCategory = (
    title: string,
    category: (typeof COSMETIC_SHOP_ITEMS)[number]['category'],
    field: 'model' | 'hairStyle' | 'sneakerStyle' | 'accessory' | 'jumpStyle' | 'landStyle'
  ) => {
    const items = COSMETIC_SHOP_ITEMS.filter((i) => i.category === category);
    const currentVal = profile.customization[field] as
      | CharacterModelId
      | HairStyleId
      | SneakerStyleId
      | AccessoryId
      | JumpAnimStyle
      | LandAnimStyle;

    return (
      <div>
        <div className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">{title}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((item) => {
            const unlocked = profile.unlockedCosmetics.includes(item.id);
            const active = unlocked && currentVal === item.value;
            const canAfford = profile.coins >= item.cost;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!unlocked && !canAfford}
                onClick={() => handleCosmeticAction(item, field)}
                className={`flex min-h-[44px] flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-orange-500 ${
                  active
                    ? 'border-orange-500 bg-orange-950/50 text-white'
                    : unlocked
                    ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                    : canAfford
                    ? 'border-amber-500/40 bg-slate-950/70 text-amber-200 hover:bg-slate-800'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1 text-xs font-semibold">
                  <span className="truncate">{item.label}</span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  ) : !unlocked ? (
                    <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  ) : null}
                </div>
                <div className="mt-0.5 text-[11px] font-mono-tabular text-slate-400">
                  {active ? 'Equipped' : unlocked ? 'Unlocked' : `${item.cost} Coins`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-backdrop-fade fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
      <div
        className={`animate-modal-pop flex max-h-full w-full max-w-4xl flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl ${
          compactLayout ? 'p-3.5' : 'p-5'
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-orange-400" />
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-50">Runner Studio &amp; Skills</h2>
              <p className="text-xs text-slate-400 font-mono-tabular">
                Level {profile.playerLevel} · {profile.coins.toLocaleString()} Coins · {profile.activeTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setTab('appearance')}
                className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                  tab === 'appearance' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Appearance</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('skills')}
                className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                  tab === 'skills' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Skill Tree</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Studio"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {tab === 'appearance' ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 overflow-y-auto pr-1">
            {/* Left Live Preview */}
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <canvas
                  ref={canvasRef}
                  width={260}
                  height={230}
                  className="block w-full h-[230px]"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(['run', 'jump', 'slide', 'hangGlide'] as RunnerAction[]).map((pose) => (
                  <button
                    key={pose}
                    type="button"
                    onClick={() => setPreviewAction(pose)}
                    className={`h-9 rounded-md border text-[11px] font-semibold transition-colors ${
                      previewAction === pose
                        ? 'border-orange-500 bg-orange-600 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {pose === 'hangGlide' ? 'Glide' : pose.charAt(0).toUpperCase() + pose.slice(1)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPreviewFacing((f) => (f === 1 ? -1 : 1))}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                <RotateCw className="h-3.5 w-3.5 text-orange-400" />
                <span>Turn Character ({previewFacing === 1 ? 'Right' : 'Left'})</span>
              </button>

              {/* Custom Runner Name */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <label className="block text-xs font-semibold text-slate-400">Runner Name</label>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    type="text"
                    maxLength={16}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={handleSaveName}
                    className="h-10 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-100 focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="h-10 rounded-md bg-orange-600 px-3 text-xs font-semibold text-white hover:bg-orange-500"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Saved Presets */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Saved Outfits</span>
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300"
                  >
                    + Save Current
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {profile.presets.map((preset, idx) => (
                    <button
                      key={`${preset.label}-${idx}`}
                      type="button"
                      onClick={() =>
                        onUpdateProfile({
                          ...profile,
                          customization: { ...preset.config, name: profile.customization.name },
                        })
                      }
                      className="flex h-9 items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-2.5 text-xs text-slate-200 hover:border-orange-500/60"
                    >
                      <span>{preset.label}</span>
                      <span
                        className="h-3 w-3 rounded-sm border border-white/30"
                        style={{ backgroundColor: preset.config.scarfColor }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Customization Controls */}
            <div className="flex flex-col gap-5 pb-2">
              {renderCategory('Character Model', 'model', 'model')}
              {renderCategory('Hairstyle', 'hair', 'hairStyle')}
              {renderCategory('Sneakers', 'sneaker', 'sneakerStyle')}
              {renderCategory('Accessory', 'accessory', 'accessory')}

              {/* Color Swatches */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-slate-400">Jacket</div>
                  <div className="flex flex-wrap gap-1.5">
                    {JACKET_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Jacket color ${c}`}
                        onClick={() => handleColorChange('jacketColor', c)}
                        className={`h-8 w-8 rounded-md border-2 transition-transform ${
                          profile.customization.jacketColor === c
                            ? 'border-orange-400 scale-105'
                            : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-slate-400">Trousers</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TROUSER_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Trousers color ${c}`}
                        onClick={() => handleColorChange('trouserColor', c)}
                        className={`h-8 w-8 rounded-md border-2 transition-transform ${
                          profile.customization.trouserColor === c
                            ? 'border-orange-400 scale-105'
                            : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-slate-400">Scarf Trail</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SCARF_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Scarf color ${c}`}
                        onClick={() => handleColorChange('scarfColor', c)}
                        className={`h-8 w-8 rounded-md border-2 transition-transform ${
                          profile.customization.scarfColor === c
                            ? 'border-orange-400 scale-105'
                            : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {renderCategory('Jump Style', 'jumpStyle', 'jumpStyle')}
              {renderCategory('Landing Style', 'landStyle', 'landStyle')}
            </div>
          </div>
        ) : (
          /* Skill Tree Tab */
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
            {SKILL_TREE_NODES.map((node) => {
              const rank = profile.skills[node.key];
              const isMax = rank >= 3;
              const nextCost = isMax ? 0 : node.costs[rank];
              const canBuy = !isMax && profile.coins >= nextCost;

              return (
                <div
                  key={node.key}
                  className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-slate-100">{node.name}</h3>
                      <span className="font-mono-tabular text-xs font-bold text-orange-400">
                        Rank {rank} / 3
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{node.description}</p>
                    <p className="mt-2 text-xs font-medium text-cyan-300">{node.bonusSummary}</p>

                    <div className="mt-3 flex gap-1.5">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`h-2 flex-1 rounded-xs ${
                            rank >= step ? 'bg-orange-500' : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isMax || !canBuy}
                    onClick={() => handleUpgradeSkill(node.key, nextCost)}
                    className={`mt-4 flex h-10 w-full items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                      isMax
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : canBuy
                        ? 'bg-orange-600 text-white hover:bg-orange-500'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? 'Mastered' : `Upgrade to Rank ${rank + 1} · ${nextCost} Coins`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
