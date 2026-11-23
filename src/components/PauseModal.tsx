import { ArrowLeft, Camera, List, Play, RotateCcw, Settings, Smartphone, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { CameraZoom } from '../types/game';

interface PauseModalProps {
  levelNumber: number;
  isEndless: boolean;
  distanceMeters: number;
  takedownsCount: number;
  compactLayout: boolean;
  muted: boolean;
  vibrationEnabled: boolean;
  slowMoEnabled: boolean;
  cameraZoom: CameraZoom;
  onToggleMute: () => void;
  onToggleVibration: () => void;
  onToggleSlowMo: () => void;
  onChangeCameraZoom: (zoom: CameraZoom) => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToMenu: () => void;
}

export function PauseModal({
  levelNumber,
  isEndless,
  distanceMeters,
  takedownsCount,
  compactLayout,
  muted,
  vibrationEnabled,
  slowMoEnabled,
  cameraZoom,
  onToggleMute,
  onToggleVibration,
  onToggleSlowMo,
  onChangeCameraZoom,
  onResume,
  onRestart,
  onExitToMenu,
}: PauseModalProps) {
  const [view, setView] = useState<'main' | 'settings'>('main');

  return (
    <div className="animate-backdrop-fade fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm">
      <div
        className={`animate-modal-pop max-h-full w-full overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl ${
          compactLayout ? 'max-w-md p-4' : 'max-w-sm p-6'
        }`}
      >
        {view === 'main' ? (
          <>
            <h2 className={`font-display font-bold text-slate-50 ${compactLayout ? 'text-2xl' : 'text-3xl'}`}>Paused</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 font-mono-tabular">
              {isEndless ? 'Endless Run' : `Stage ${levelNumber}`} <span className="mx-1.5 text-slate-600">·</span> {distanceMeters} m <span className="mx-1.5 text-slate-600">·</span> {takedownsCount} KOs
            </p>

            <div className={compactLayout ? 'mt-4 grid grid-cols-2 gap-2.5' : 'mt-6 flex flex-col gap-2.5'}>
              <button
                type="button"
                onClick={onResume}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white transition-all duration-150 hover:bg-orange-500 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-orange-400 whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Resume</span>
              </button>

              <button
                type="button"
                onClick={onRestart}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retry</span>
              </button>

              <button
                type="button"
                onClick={() => setView('settings')}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap"
              >
                <Settings className="h-4 w-4 text-orange-400" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                onClick={onExitToMenu}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-4 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap"
              >
                <List className="h-4 w-4" />
                <span>Main Menu</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`flex items-center justify-between gap-3 border-b border-slate-800 ${compactLayout ? 'pb-2.5' : 'pb-3'}`}>
              <h2 className={`font-display font-bold text-slate-50 ${compactLayout ? 'text-2xl' : 'text-3xl'}`}>Settings</h2>
              <button
                type="button"
                onClick={() => setView('main')}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-orange-500 whitespace-nowrap"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            </div>

            <div className={`flex flex-col ${compactLayout ? 'mt-3 gap-2.5' : 'mt-5 gap-3.5'}`}>
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
                  <Sparkles className={`h-4 w-4 ${slowMoEnabled ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>Slow-Mo FX</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={slowMoEnabled}
                  onClick={onToggleSlowMo}
                  className={`flex h-9 min-w-[74px] items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    slowMoEnabled ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {slowMoEnabled ? 'On' : 'Off'}
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
          </>
        )}
      </div>
    </div>
  );
}
