/**
 * Individual step button in the sequencer grid
 * Shows velocity via opacity/height
 */

import type { Step } from "../types";

interface StepButtonProps {
  step: Step;
  isActive: boolean;
  onClick: () => void;
  onVelocityChange?: (velocity: number) => void;
  stepIndex: number;
}

export function StepButton({
  step,
  isActive,
  onClick,
  onVelocityChange,
  stepIndex,
}: StepButtonProps) {
  const isDownbeat = stepIndex % 4 === 0;
  const { active, velocity } = step;

  // Handle right-click for velocity adjustment
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (active && onVelocityChange) {
      // Cycle through velocities: 0.3 -> 0.6 -> 1.0 -> 0.3
      const newVelocity = velocity <= 0.4 ? 0.6 : velocity <= 0.7 ? 1.0 : 0.3;
      onVelocityChange(newVelocity);
    }
  };

  // Velocity-based styling
  const getVelocityStyle = () => {
    if (!active) return {};
    // Higher velocity = more opaque and slightly taller indicator
    const heightPercent = 40 + velocity * 60; // 40% to 100%
    return {
      height: `${heightPercent}%`,
      opacity: 0.5 + velocity * 0.5, // 0.5 to 1.0
    };
  };

  return (
    <button
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className={`
        relative w-10 h-10 sm:w-12 sm:h-12 rounded transition-all duration-75 cursor-pointer overflow-hidden
        ${
          isActive
            ? "ring-2 ring-accent ring-offset-1 ring-offset-surface-900"
            : ""
        }
        ${
          active
            ? "bg-surface-700"
            : isDownbeat
              ? "bg-surface-700 hover:bg-surface-600"
              : "bg-surface-800 hover:bg-surface-700"
        }
      `}
      aria-label={`Step ${stepIndex + 1}, ${active ? `on at ${Math.round(velocity * 100)}%` : "off"}`}
      title={active ? `Velocity: ${Math.round(velocity * 100)}% (right-click to change)` : "Click to enable"}
    >
      {/* Velocity indicator bar */}
      {active && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-beat-on rounded-b transition-all"
          style={getVelocityStyle()}
        />
      )}
      {/* Active playhead indicator */}
      {isActive && (
        <div className="absolute inset-0 bg-accent/30 rounded" />
      )}
    </button>
  );
}
