/**
 * EffectsPanel - Per-track effects controls
 * Displays sliders for distortion, delay, and reverb
 */

import type { Track, TrackEffects } from "../types";
import { useSequencerStore } from "../store/sequencerStore";

interface EffectsPanelProps {
  track: Track;
}

interface EffectSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

function EffectSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: EffectSliderProps) {
  const displayValue = formatValue ? formatValue(value) : `${Math.round(value * 100)}%`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs font-mono text-surface-500">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-surface-700 appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
          [&::-webkit-slider-thumb]:hover:bg-accent-bright [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  );
}

export function EffectsPanel({ track }: EffectsPanelProps) {
  const { setTrackEffect } = useSequencerStore();

  const handleEffectChange = (effect: keyof TrackEffects, value: number) => {
    setTrackEffect(track.id, effect, value);
  };

  return (
    <div className="px-4 py-3 bg-surface-850 border-t border-surface-700 rounded-b-lg -mt-2">
      <div className="grid grid-cols-4 gap-6">
        {/* Distortion */}
        <EffectSlider
          label="Distortion"
          value={track.effects.distortion}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => handleEffectChange("distortion", v)}
        />

        {/* Delay */}
        <EffectSlider
          label="Delay"
          value={track.effects.delay}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => handleEffectChange("delay", v)}
        />

        {/* Delay Time */}
        <EffectSlider
          label="Delay Time"
          value={track.effects.delayTime}
          min={0.05}
          max={2}
          step={0.01}
          onChange={(v) => handleEffectChange("delayTime", v)}
          formatValue={(v) => `${v.toFixed(2)}s`}
        />

        {/* Reverb */}
        <EffectSlider
          label="Reverb"
          value={track.effects.reverb}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => handleEffectChange("reverb", v)}
        />
      </div>
    </div>
  );
}
