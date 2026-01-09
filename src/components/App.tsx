/**
 * Beat Bot Pro - Main App Component
 */

import { useState } from "react";
import { useSequencerStore } from "../store/sequencerStore";
import { Sequencer } from "./Sequencer";
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from "../hooks/useKeyboardShortcuts";
import { PresetLibrary } from "./PresetLibrary";

export function App() {
  const {
    init,
    isInitialized,
    isLoading,
    isPlaying,
    saveProject,
    getProjects,
    loadProject,
    exportProject,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSequencerStore();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string; updatedAt: number }[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Use keyboard shortcuts
  useKeyboardShortcuts();

  // Load projects list
  const refreshProjects = async () => {
    const list = await getProjects();
    setProjects(list.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleSave = async () => {
    if (!projectName.trim()) return;
    await saveProject(projectName);
    setShowSaveModal(false);
    setProjectName("");
  };

  const handleLoad = async (projectId: string) => {
    await loadProject(projectId);
    setShowLoadModal(false);
  };

  const handleExport = () => {
    const json = exportProject();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "beatbot-project.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show start screen if not initialized
  if (!isInitialized && !isLoading) {
    return (
      <div className="h-screen bg-surface-950 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-lg">
          {/* Logo / Title */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white tracking-tight mb-3">
              Sequence
            </h1>
            <p className="text-surface-400 text-lg">
              Professional Drum Machine
            </p>
          </div>

          {/* Description */}
          <p className="text-surface-300 text-sm leading-relaxed mb-8">
            A browser-based drum sequencer with sample-accurate timing,
            5 drum kits, per-track effects (distortion, delay, reverb),
            pattern management, and full keyboard control.
            Built with React, TypeScript, and the Web Audio API.
          </p>

          {/* Start Button */}
          <button
            onClick={init}
            className="px-10 py-4 text-base font-medium rounded-lg
              bg-accent text-white
              hover:bg-accent-bright
              transition-colors duration-150
              shadow-lg shadow-accent/20"
          >
            Start Making Beats
          </button>

          {/* Quick tips */}
          <div className="text-xs text-surface-500 mt-10 space-y-1">
            <p><span className="text-surface-400 font-mono">Space</span> to play/stop</p>
            <p><span className="text-surface-400 font-mono">Click</span> pads to toggle, <span className="text-surface-400 font-mono">right-click</span> for velocity</p>
            <p><span className="text-surface-400 font-mono">1-5</span> to switch kits</p>
          </div>

          {/* Attribution */}
          <div className="mt-16 pt-8 border-t border-surface-800">
            <p className="text-xs text-surface-500 mb-4">
              One-shot vibe coded with Claude Code
            </p>

            <div className="flex items-center justify-center gap-6">
              {/* X/Twitter Link */}
              <a
                href="https://x.com/samhogan"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-sm">@samhogan</span>
              </a>

              {/* GitHub Link */}
              <a
                href="https://github.com/samheutmaker/sequence"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm">Source</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-surface-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-surface-900 border-b border-surface-700">
        <h1 className="text-sm sm:text-base font-semibold text-white tracking-tight">
          Sequence
        </h1>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Undo/Redo - hidden on mobile */}
          <div className="hidden sm:flex gap-1">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className={`px-2 py-1 text-xs rounded ${
                canUndo()
                  ? "text-surface-300 hover:text-white hover:bg-surface-700"
                  : "text-surface-600 cursor-not-allowed"
              }`}
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className={`px-2 py-1 text-xs rounded ${
                canRedo()
                  ? "text-surface-300 hover:text-white hover:bg-surface-700"
                  : "text-surface-600 cursor-not-allowed"
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
          </div>

          <div className="hidden sm:block w-px h-6 bg-surface-700" />

          {/* Presets */}
          <PresetLibrary />

          <div className="hidden sm:block w-px h-6 bg-surface-700" />

          {/* Save/Load/Export - simplified on mobile */}
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-2 sm:px-3 py-1.5 text-xs font-medium rounded bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                refreshProjects();
                setShowLoadModal(true);
              }}
              className="px-2 sm:px-3 py-1.5 text-xs font-medium rounded bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
            >
              Load
            </button>
            <button
              onClick={handleExport}
              className="hidden sm:block px-3 py-1.5 text-xs font-medium rounded bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
            >
              Export
            </button>
          </div>

          <div className="hidden sm:block w-px h-6 bg-surface-700" />

          {/* Shortcuts help - hidden on mobile */}
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="hidden sm:block px-2 py-1 text-xs text-surface-400 hover:text-white transition-colors"
            title="Keyboard shortcuts"
          >
            ?
          </button>

          <div className="hidden sm:block w-px h-6 bg-surface-700" />

          {/* Status indicator */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:inline text-xs text-surface-400 font-mono uppercase tracking-wider">
              {isPlaying ? "Playing" : "Stopped"}
            </span>
            <div
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                isPlaying ? "bg-accent animate-pulse" : "bg-surface-600"
              }`}
            />
          </div>
        </div>
      </header>

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <div className="absolute top-14 right-6 z-50 bg-surface-800 border border-surface-700 rounded-lg shadow-xl p-4 min-w-48">
          <h3 className="text-sm font-medium text-white mb-3">Keyboard Shortcuts</h3>
          <div className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.key} className="flex justify-between text-xs">
                <span className="text-surface-400">{shortcut.action}</span>
                <span className="text-surface-300 font-mono">{shortcut.key}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main sequencer */}
      <main className="flex-1 overflow-auto p-2 sm:p-6">
        <Sequencer />
      </main>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-surface-700 rounded-lg p-4 sm:p-6 w-full max-w-96">
            <h2 className="text-lg font-medium text-white mb-4">Save Project</h2>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 rounded bg-surface-800 border border-surface-700 text-white text-sm focus:outline-none focus:border-accent"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm rounded bg-surface-800 text-surface-300 hover:bg-surface-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent-bright"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-surface-700 rounded-lg p-4 sm:p-6 w-full max-w-96 max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-medium text-white mb-4">Load Project</h2>
            {projects.length === 0 ? (
              <p className="text-surface-400 text-sm">No saved projects</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleLoad(project.id)}
                    className="w-full text-left px-4 py-3 rounded bg-surface-800 hover:bg-surface-700 transition-colors"
                  >
                    <div className="text-white text-sm font-medium">{project.name}</div>
                    <div className="text-surface-500 text-xs">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-4 py-2 text-sm rounded bg-surface-800 text-surface-300 hover:bg-surface-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close shortcuts */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowShortcuts(false)}
        />
      )}
    </div>
  );
}
