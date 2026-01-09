/**
 * Kit selector - switch between drum kits
 */

import { useSequencerStore } from "../store/sequencerStore";
import { DRUM_KITS } from "../data/kits";

export function KitSelector() {
  const { currentKitId, switchKit, isLoading } = useSequencerStore();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-surface-400 font-medium">Kit:</span>
      <div className="flex gap-1">
        {DRUM_KITS.map((kit) => (
          <button
            key={kit.id}
            onClick={() => switchKit(kit.id)}
            disabled={isLoading}
            className={`
              px-3 py-1.5 text-xs font-medium rounded transition-all
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
            {kit.name}
          </button>
        ))}
      </div>
    </div>
  );
}
