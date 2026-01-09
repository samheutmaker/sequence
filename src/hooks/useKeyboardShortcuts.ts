/**
 * Keyboard shortcuts hook
 * Provides keyboard control for the sequencer
 */

import { useEffect } from "react";
import { useSequencerStore } from "../store/sequencerStore";

export function useKeyboardShortcuts() {
  const {
    togglePlay,
    setBpm,
    bpm,
    undo,
    redo,
    canUndo,
    canRedo,
    patterns,
    switchPattern,
    clearAll,
    randomize,
  } = useSequencerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space - Play/Stop
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Ctrl/Cmd + Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        if (canRedo()) redo();
        return;
      }

      // + or = - Increase BPM
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setBpm(bpm + (e.shiftKey ? 10 : 1));
        return;
      }

      // - - Decrease BPM
      if (e.key === "-") {
        e.preventDefault();
        setBpm(bpm - (e.shiftKey ? 10 : 1));
        return;
      }

      // 1-9 - Switch patterns
      if (e.key >= "1" && e.key <= "9" && !e.ctrlKey && !e.metaKey) {
        const patternIndex = parseInt(e.key) - 1;
        if (patternIndex < patterns.length) {
          e.preventDefault();
          switchPattern(patterns[patternIndex].id);
        }
        return;
      }

      // C - Clear (without Ctrl)
      if (e.key === "c" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        clearAll();
        return;
      }

      // R - Randomize
      if (e.key === "r" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        randomize();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    setBpm,
    bpm,
    undo,
    redo,
    canUndo,
    canRedo,
    patterns,
    switchPattern,
    clearAll,
    randomize,
  ]);
}

// Keyboard shortcuts reference
export const KEYBOARD_SHORTCUTS = [
  { key: "Space", action: "Play/Stop" },
  { key: "Ctrl+Z", action: "Undo" },
  { key: "Ctrl+Shift+Z", action: "Redo" },
  { key: "+/-", action: "Adjust BPM" },
  { key: "1-9", action: "Switch Pattern" },
  { key: "C", action: "Clear All" },
  { key: "R", action: "Randomize" },
];
