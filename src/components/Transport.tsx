/**
 * Transport controls - Play/Stop, BPM, Swing
 */

import { useSequencerStore } from "../store/sequencerStore";

export function Transport() {
  const {
    isPlaying,
    bpm,
    swing,
    masterVolume,
    togglePlay,
    setBpm,
    setSwing,
    setMasterVolume,
    clearAll,
    randomize,
  } = useSequencerStore();

  return (
    <div className="flex flex-wrap items-center gap-8 p-4 bg-surface-900 rounded-lg border border-surface-700">
      {/* Play/Stop */}
      <button
        onClick={togglePlay}
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-150
          ${
            isPlaying
              ? "bg-accent text-white shadow-lg shadow-accent/20"
              : "bg-surface-700 text-white hover:bg-surface-600"
          }
        `}
        aria-label={isPlaying ? "Stop" : "Play"}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-10 bg-surface-700" />

      {/* BPM */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-surface-400 uppercase tracking-wider font-medium">BPM</label>
        <input
          type="range"
          min="60"
          max="200"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-24 h-1.5 rounded-full bg-surface-700 appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
        />
        <span className="text-base font-mono text-white w-10 text-right font-medium">{bpm}</span>
      </div>

      {/* Swing */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-surface-400 uppercase tracking-wider font-medium">Swing</label>
        <input
          type="range"
          min="0"
          max="100"
          value={swing}
          onChange={(e) => setSwing(Number(e.target.value))}
          className="w-20 h-1.5 rounded-full bg-surface-700 appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
        />
        <span className="text-sm font-mono text-surface-300 w-10">{swing}%</span>
      </div>

      {/* Master Volume */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-surface-400 uppercase tracking-wider font-medium">Master</label>
        <input
          type="range"
          min="0"
          max="100"
          value={masterVolume * 100}
          onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
          className="w-20 h-1.5 rounded-full bg-surface-700 appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
        />
        <span className="text-sm font-mono text-surface-300 w-10">
          {Math.round(masterVolume * 100)}%
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={clearAll}
          className="px-4 py-2 text-xs font-medium uppercase tracking-wider rounded-md
            bg-surface-800 text-surface-300 border border-surface-600
            hover:bg-surface-700 hover:text-white hover:border-surface-500
            transition-colors"
        >
          Clear
        </button>
        <button
          onClick={randomize}
          className="px-4 py-2 text-xs font-medium uppercase tracking-wider rounded-md
            bg-surface-800 text-surface-300 border border-surface-600
            hover:bg-surface-700 hover:text-white hover:border-surface-500
            transition-colors"
        >
          Random
        </button>
      </div>
    </div>
  );
}
