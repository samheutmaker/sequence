/**
 * Single track row with name, controls, and step buttons
 */

import { useState } from "react";
import { StepButton } from "./StepButton";
import { EffectsPanel } from "./EffectsPanel";
import { useSequencerStore } from "../store/sequencerStore";
import type { Track } from "../types";

interface TrackRowProps {
  track: Track;
  currentStep: number;
}

export function TrackRow({ track, currentStep }: TrackRowProps) {
  const { toggleStep, toggleMute, toggleSolo, setTrackVolume, setStepVelocity } =
    useSequencerStore();
  const [showEffects, setShowEffects] = useState(false);

  // Check if any effects are active
  const hasActiveEffects =
    track.effects.distortion > 0 ||
    track.effects.delay > 0 ||
    track.effects.reverb > 0;

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center gap-1 sm:gap-3 py-2 sm:py-3 px-2 sm:px-4 bg-surface-900 border border-surface-800 ${
          showEffects ? "rounded-t-lg border-b-0" : "rounded-lg"
        }`}
      >
        {/* Track name */}
        <div className="w-12 sm:w-16 text-xs sm:text-sm font-medium text-surface-300 truncate flex-shrink-0">
          {track.name}
        </div>

        {/* Mute/Solo buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => toggleMute(track.id)}
            className={`
              w-6 h-6 sm:w-8 sm:h-8 text-xs font-bold rounded transition-colors
              ${
                track.muted
                  ? "bg-red-500 text-white"
                  : "bg-surface-700 text-surface-400 hover:bg-surface-600 hover:text-white"
              }
            `}
            title="Mute"
          >
            M
          </button>
          <button
            onClick={() => toggleSolo(track.id)}
            className={`
              w-6 h-6 sm:w-8 sm:h-8 text-xs font-bold rounded transition-colors
              ${
                track.solo
                  ? "bg-yellow-500 text-black"
                  : "bg-surface-700 text-surface-400 hover:bg-surface-600 hover:text-white"
              }
            `}
            title="Solo"
          >
            S
          </button>
        </div>

        {/* Step buttons */}
        <div className="flex gap-1 overflow-x-auto">
          {track.sequence.map((step, index) => (
            <StepButton
              key={index}
              step={step}
              isActive={currentStep === index}
              stepIndex={index}
              onClick={() => toggleStep(track.id, index)}
              onVelocityChange={(velocity) => setStepVelocity(track.id, index, velocity)}
            />
          ))}
        </div>

        {/* FX button */}
        <button
          onClick={() => setShowEffects(!showEffects)}
          className={`
            w-6 h-6 sm:w-8 sm:h-8 text-xs font-bold rounded transition-colors flex-shrink-0
            ${
              showEffects
                ? "bg-accent text-white"
                : hasActiveEffects
                  ? "bg-accent/30 text-accent hover:bg-accent/50"
                  : "bg-surface-700 text-surface-400 hover:bg-surface-600 hover:text-white"
            }
          `}
          title="Effects"
        >
          FX
        </button>

        {/* Volume slider */}
        <div className="hidden sm:flex items-center gap-3 ml-auto">
          <input
            type="range"
            min="0"
            max="100"
            value={track.volume * 100}
            onChange={(e) => setTrackVolume(track.id, Number(e.target.value) / 100)}
            className="w-20 h-1.5 rounded-full bg-surface-700 appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface-300
              [&::-webkit-slider-thumb]:hover:bg-white [&::-webkit-slider-thumb]:transition-colors"
          />
          <span className="text-xs font-mono text-surface-500 w-9 text-right">
            {Math.round(track.volume * 100)}%
          </span>
        </div>
      </div>

      {/* Effects Panel */}
      {showEffects && <EffectsPanel track={track} />}
    </div>
  );
}
