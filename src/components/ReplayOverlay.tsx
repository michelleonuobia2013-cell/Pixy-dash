import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Download, Eye, EyeOff, Pause, Play, X, ZoomIn, ZoomOut } from 'lucide-react';
import { ReplayFrame } from '../types/game';
import { formatRunTime } from './GameHUD';

interface ReplayOverlayProps {
  frames: ReplayFrame[];
  currentIndex: number;
  playing: boolean;
  speed: 0.5 | 1 | 2;
  photoMode: boolean;
  hideHud: boolean;
  camOffset: { dx: number; dy: number; zoomMult: number };
  onSeek: (idx: number) => void;
  onTogglePlay: () => void;
  onChangeSpeed: (s: 0.5 | 1 | 2) => void;
  onTogglePhotoMode: () => void;
  onToggleHideHud: () => void;
  onAdjustCamera: (patch: Partial<{ dx: number; dy: number; zoomMult: number }>) => void;
  onCapturePhoto: () => void;
  onExit: () => void;
}

export function ReplayOverlay({
  frames,
  currentIndex,
  playing,
  speed,
  photoMode,
  hideHud,
  camOffset,
  onSeek,
  onTogglePlay,
  onChangeSpeed,
  onTogglePhotoMode,
  onToggleHideHud,
  onAdjustCamera,
  onCapturePhoto,
  onExit,
}: ReplayOverlayProps) {
  const activeFrame = frames[currentIndex];
  const maxIdx = Math.max(0, frames.length - 1);

  if (hideHud) {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={onCapturePhoto}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 text-xs font-semibold text-white shadow-lg hover:bg-orange-500"
        >
          <Download className="h-4 w-4" />
          <span>Save Photo</span>
        </button>
        <button
          type="button"
          onClick={onToggleHideHud}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/85 px-3 text-xs font-semibold text-slate-200 backdrop-blur-md"
        >
          <Eye className="h-4 w-4" />
          <span>Show Controls</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto rounded-lg border border-slate-700/80 bg-slate-950/85 px-3.5 py-2 backdrop-blur-md">
          <div className="text-xs font-semibold text-cyan-300">
            {photoMode ? 'Photo Mode · Frame Frozen' : 'Cinematic Replay'}
          </div>
          <div className="text-xs font-mono-tabular text-slate-300">
            Time {formatRunTime(activeFrame?.t ?? 0)} · Zoom {camOffset.zoomMult.toFixed(1)}×
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/85 px-3.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 backdrop-blur-md"
        >
          <X className="h-4 w-4" />
          <span>Exit Replay</span>
        </button>
      </div>

      {/* Bottom Scrubber & Photo Mode Controls */}
      <div className="fixed inset-x-3 bottom-4 z-30 mx-auto max-w-2xl rounded-xl border border-slate-700/80 bg-slate-950/90 p-3.5 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pause Replay' : 'Play Replay'}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white hover:bg-orange-500 shrink-0"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </button>

          <input
            type="range"
            min={0}
            max={maxIdx}
            value={currentIndex}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="h-2 flex-1 accent-orange-500 cursor-pointer"
          />

          <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 p-1">
            {([0.5, 1, 2] as const).map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => onChangeSpeed(sp)}
                className={`h-8 rounded px-2 text-xs font-mono-tabular font-bold ${
                  speed === sp ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {sp}×
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePhotoMode}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${
                photoMode
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{photoMode ? 'Photo Mode On' : 'Photo Mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => onAdjustCamera({ zoomMult: Math.min(2.4, camOffset.zoomMult + 0.2) })}
              aria-label="Zoom In"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onAdjustCamera({ zoomMult: Math.max(0.7, camOffset.zoomMult - 0.2) })}
              aria-label="Zoom Out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            {photoMode && (
              <>
                <button
                  type="button"
                  onClick={() => onAdjustCamera({ dx: camOffset.dx - 60 })}
                  aria-label="Pan Left"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustCamera({ dx: camOffset.dx + 60 })}
                  aria-label="Pan Right"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustCamera({ dy: camOffset.dy - 50 })}
                  aria-label="Pan Up"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustCamera({ dy: camOffset.dy + 50 })}
                  aria-label="Pan Down"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleHideHud}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Hide UI</span>
            </button>
            <button
              type="button"
              onClick={onCapturePhoto}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 text-xs font-semibold text-white hover:bg-orange-500"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Screenshot PNG</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
