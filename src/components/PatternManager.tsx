/**
 * Pattern manager - create, switch, delete patterns
 */

import { useState } from "react";
import { useSequencerStore } from "../store/sequencerStore";

export function PatternManager() {
  const {
    patterns,
    currentPatternId,
    patternLength,
    switchPattern,
    createPattern,
    deletePattern,
    duplicatePattern,
    setPatternLength,
  } = useSequencerStore();

  const [showMenu, setShowMenu] = useState<string | null>(null);

  const handleRightClick = (e: React.MouseEvent, patternId: string) => {
    e.preventDefault();
    setShowMenu(showMenu === patternId ? null : patternId);
  };

  const patternLengths: (8 | 16 | 32 | 64)[] = [8, 16, 32, 64];

  return (
    <div className="flex items-center gap-4">
      {/* Patterns */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-surface-400 font-medium">Patterns:</span>
        <div className="flex gap-1 relative">
          {patterns.map((pattern, index) => (
            <div key={pattern.id} className="relative">
              <button
                onClick={() => switchPattern(pattern.id)}
                onContextMenu={(e) => handleRightClick(e, pattern.id)}
                className={`
                  w-10 h-10 text-sm font-bold rounded transition-all
                  ${
                    currentPatternId === pattern.id
                      ? "bg-accent text-white"
                      : "bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-white"
                  }
                `}
                title={`${pattern.name} (right-click for options)`}
              >
                {String.fromCharCode(65 + index)}
              </button>

              {/* Context menu */}
              {showMenu === pattern.id && (
                <div className="absolute top-full left-0 mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-50 overflow-hidden min-w-32">
                  <button
                    onClick={() => {
                      duplicatePattern(pattern.id);
                      setShowMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-surface-300 hover:bg-surface-700 hover:text-white"
                  >
                    Duplicate
                  </button>
                  {patterns.length > 1 && (
                    <button
                      onClick={() => {
                        deletePattern(pattern.id);
                        setShowMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add pattern button */}
          <button
            onClick={() => createPattern()}
            className="w-10 h-10 text-lg font-bold rounded bg-surface-800 text-surface-500 hover:bg-surface-700 hover:text-white transition-all"
            title="Create new pattern"
          >
            +
          </button>
        </div>
      </div>

      {/* Pattern length */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-surface-400 font-medium">Steps:</span>
        <div className="flex gap-1">
          {patternLengths.map((len) => (
            <button
              key={len}
              onClick={() => setPatternLength(len)}
              className={`
                px-2 py-1 text-xs font-mono rounded transition-all
                ${
                  patternLength === len
                    ? "bg-accent text-white"
                    : "bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-white"
                }
              `}
            >
              {len}
            </button>
          ))}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(null)}
        />
      )}
    </div>
  );
}
