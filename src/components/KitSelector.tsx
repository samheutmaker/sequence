/**
 * Kit selector - switch between drum kits
 */

import { useSequencerStore } from "../store/sequencerStore";
import { DRUM_KITS } from "../data/kits";

export function KitSelector() {
  const { currentKitId, switchKit, isLoading } = useSequencerStore();

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-xs sm:text-sm text-surface-400 font-medium">Kit:</span>
      <div className="flex gap-1 flex-wrap">
        {DRUM_KITS.map((kit) => (
          <button
            key={kit.id}
            onClick={() => switchKit(kit.id)}
            disabled={isLoading}
            className={`
              px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded transition-all
              ${
                currentKitId === kit.id
                  ? "text-white"
                  : "bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-white"
              }
              ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
            `}
            style={{
              backgroundColor: currentKitId === kit.id ? kit.color : undefined,
            }}
            title={kit.name}
          >
            <span className="hidden sm:inline">{kit.name}</span>
            <span className="sm:hidden">{kit.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
