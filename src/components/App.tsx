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
      <div className="h-screen bg-surface-950 flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Beat Bot Pro
          </h1>
          <p className="text-surface-400 text-sm mb-10">
            Professional Drum Machine
          </p>

          <button
            onClick={init}
            className="px-8 py-3 text-sm font-medium rounded-lg
              bg-accent text-white
              hover:bg-accent-bright
              transition-colors duration-150"
          >
            Initialize Audio
          </button>

          <div className="text-xs text-surface-500 mt-8 space-y-1">
            <p>Space to play/stop</p>
            <p>Click pads to toggle, right-click for velocity</p>
            <p>5 drum kits, variable pattern lengths, save/load projects</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-surface-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-surface-900 border-b border-surface-700">
        <h1 className="text-base font-semibold text-white tracking-tight">
          Beat Bot Pro
        </h1>

        <div className="flex items-center gap-4">
          {/* Undo/Redo */}
          <div className="flex gap-1">
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

          <div className="w-px h-6 bg-surface-700" />

          {/* Presets */}
          <PresetLibrary />

          <div className="w-px h-6 bg-surface-700" />

          {/* Save/Load/Export */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-3 py-1.5 text-xs font-medium rounded bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                refreshProjects();
                setShowLoadModal(true);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
            >
              Load
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs font-medium rounded bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
            >
              Export
            </button>
          </div>

          <div className="w-px h-6 bg-surface-700" />

          {/* Shortcuts help */}
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="px-2 py-1 text-xs text-surface-400 hover:text-white transition-colors"
            title="Keyboard shortcuts"
          >
            ?
          </button>

          <div className="w-px h-6 bg-surface-700" />

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-400 font-mono uppercase tracking-wider">
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
      <main className="flex-1 overflow-auto p-6">
        <Sequencer />
      </main>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-700 rounded-lg p-6 w-96">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-700 rounded-lg p-6 w-96 max-h-[80vh] overflow-auto">
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
