/**
 * Main sequencer component
 */

import { useSequencerStore } from "../store/sequencerStore";
import { Transport } from "./Transport";
import { TrackRow } from "./TrackRow";
import { Visualizer } from "./Visualizer";
import { KitSelector } from "./KitSelector";
import { PatternManager } from "./PatternManager";

export function Sequencer() {
  const { tracks, currentStep, patternLength, isInitialized, isLoading } =
    useSequencerStore();

  if (!isInitialized) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400 text-sm">Loading samples...</div>
      </div>
    );
  }

  // Generate step markers based on pattern length
  const stepMarkers = Array.from({ length: patternLength }, (_, i) => {
    const beatNumber = Math.floor(i / 4) + 1;
    const isDownbeat = i % 4 === 0;
    return { index: i, beatNumber, isDownbeat };
  });

  return (
    <div className="flex flex-col gap-2 sm:gap-4 h-full">
      {/* Visualizer - smaller on mobile */}
      <div className="hidden sm:block">
        <Visualizer />
      </div>

      {/* Kit and Pattern controls */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 p-2 sm:p-4 bg-surface-900 rounded-lg border border-surface-700">
        <KitSelector />
        <div className="hidden sm:block w-px h-8 bg-surface-700" />
        <PatternManager />
      </div>

      {/* Transport controls */}
      <Transport />

      {/* Step markers */}
      <div className="flex items-center gap-1 sm:gap-3 px-2 sm:px-4 text-xs text-surface-500 font-mono">
        <div className="w-12 sm:w-16 flex-shrink-0" />
        <div className="w-[52px] sm:w-[68px] flex-shrink-0" />
        <div className="flex gap-1 overflow-x-auto">
          {stepMarkers.map(({ index, beatNumber, isDownbeat }) => (
            <div
              key={index}
              className={`w-8 sm:w-12 text-center flex-shrink-0 ${
                isDownbeat ? "text-surface-300 font-medium" : "text-surface-600"
              }`}
            >
              {isDownbeat ? beatNumber : "·"}
            </div>
          ))}
        </div>
      </div>

      {/* Track rows */}
      <div className="flex flex-col gap-1 sm:gap-2 overflow-x-auto">
        {tracks.map((track) => (
          <TrackRow key={track.id} track={track} currentStep={currentStep} />
        ))}
      </div>
    </div>
  );
}
