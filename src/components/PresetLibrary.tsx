/**
 * Preset Library - Load starter beats
 */

import { useState } from "react";
import { useSequencerStore } from "../store/sequencerStore";
import { BEAT_PRESETS, getCategories, type BeatPreset } from "../data/presets";

export function PresetLibrary() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { loadPreset } = useSequencerStore();

  const categories = getCategories();
  const filteredPresets = selectedCategory
    ? BEAT_PRESETS.filter((p) => p.category === selectedCategory)
    : BEAT_PRESETS;

  const handleLoadPreset = (preset: BeatPreset) => {
    loadPreset(preset);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
      >
        Presets
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-[600px] max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
              <div>
                <h2 className="text-lg font-semibold text-white">Beat Library</h2>
                <p className="text-xs text-surface-400 mt-0.5">
                  Load a starter beat pattern
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 p-4 border-b border-surface-800">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  selectedCategory === null
                    ? "bg-accent text-white"
                    : "bg-surface-800 text-surface-400 hover:text-white"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    selectedCategory === cat
                      ? "bg-accent text-white"
                      : "bg-surface-800 text-surface-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Presets grid */}
            <div className="p-3 sm:p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset)}
                    className="text-left p-4 rounded-lg bg-surface-800 border border-surface-700 hover:border-accent/50 hover:bg-surface-750 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-white group-hover:text-accent transition-colors">
                          {preset.name}
                        </h3>
                        <p className="text-xs text-surface-400 mt-1">
                          {preset.description}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-surface-500 bg-surface-900 px-2 py-1 rounded">
                        {preset.bpm}
                      </span>
                    </div>

                    {/* Mini pattern preview */}
                    <div className="mt-3 flex gap-0.5">
                      {preset.pattern[0].slice(0, 16).map((step, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-sm ${
                            step.active
                              ? step.velocity > 0.7
                                ? "bg-accent"
                                : step.velocity > 0.4
                                  ? "bg-accent/60"
                                  : "bg-accent/30"
                              : "bg-surface-700"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                      <span>{preset.category}</span>
                      {preset.swing > 0 && <span>Swing: {preset.swing}%</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-800 bg-surface-900/50">
              <p className="text-xs text-surface-500 text-center">
                Click a preset to load it • Your current pattern will be replaced
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
