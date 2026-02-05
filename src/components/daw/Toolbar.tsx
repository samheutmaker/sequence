/**
 * DAW Toolbar - Top bar with tools, view controls, and project info
 */

import { useState, useRef } from 'react';
import { useDAWStore, dawAudioEngine } from '../../store/dawStore';
import type { Tool, DAWProject } from '../../types/daw';

const TOOLS: { id: Tool; label: string; icon: string; shortcut: string }[] = [
  { id: 'pointer', label: 'Pointer', icon: '↖', shortcut: 'T' },
  { id: 'pencil', label: 'Pencil', icon: '✏', shortcut: 'P' },
  { id: 'scissors', label: 'Scissors', icon: '✂', shortcut: 'S' },
  { id: 'glue', label: 'Glue', icon: '🔗', shortcut: 'G' },
  { id: 'eraser', label: 'Eraser', icon: '◯', shortcut: 'E' },
  { id: 'automation', label: 'Automation', icon: '〰', shortcut: 'A' },
];

const SNAP_VALUES = [
  { value: 'off', label: 'Off' },
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/16', label: '1/16' },
  { value: '1/32', label: '1/32' },
  { value: '1/4T', label: '1/4T' },
  { value: '1/8T', label: '1/8T' },
  { value: '1/16T', label: '1/16T' },
];

export function Toolbar() {
  const {
    project,
    view,
    isModified,
    playheadPosition,
    setActiveTool,
    setSnapEnabled,
    setSnapValue,
    setHorizontalZoom,
    toggleLibrary,
    toggleInspector,
    toggleMixer,
    togglePianoRoll,
    toggleTempoTrack,
    setProjectName,
    newProject,
    loadProject,
    saveProject,
    splitRegion,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDAWStore();

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as DAWProject;
        loadProject(data);
      } catch (err) {
        alert('Failed to load project: Invalid file format');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be loaded again
    e.target.value = '';
  };

  const handleExport = async () => {
    if (!project || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Calculate total duration (find the end of all regions)
      let maxEndBeat = 32; // Default 8 bars
      project.tracks.forEach((track: any) => {
        track.regions.forEach((regionId: string) => {
          const region = project.regions[regionId];
          if (region) {
            const endBeat = region.startTime + region.duration;
            if (endBeat > maxEndBeat) maxEndBeat = endBeat;
          }
        });
      });

      const blob = await dawAudioEngine.exportToWav(
        project,
        maxEndBeat,
        (progress) => setExportProgress(progress * 100)
      );

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  if (!project) return null;

  return (
    <div className="h-10 bg-[#323234] border-b border-[#1c1c1e] flex items-center px-3 gap-4">
      {/* Project Info */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent text-white text-sm font-medium w-40 px-2 py-1 rounded hover:bg-[#3a3a3c] focus:bg-[#3a3a3c] focus:outline-none"
        />
        {isModified && (
          <span className="text-[#98989d] text-xs">•</span>
        )}
      </div>

      <div className="w-px h-5 bg-[#3a3a3c]" />

      {/* Hidden file input for loading projects */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".logicstudio,.json"
        className="hidden"
        onChange={handleLoadProject}
      />

      {/* File Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={newProject}
          className="px-2 py-1 text-xs text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded transition-colors"
          title="New Project (Cmd+N)"
        >
          New
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 text-xs text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded transition-colors"
          title="Open Project (Cmd+O)"
        >
          Open
        </button>
        <button
          onClick={() => {
            const data = saveProject();
            if (data) {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${project.name}.logicstudio`;
              a.click();
              URL.revokeObjectURL(url);
            }
          }}
          className="px-2 py-1 text-xs text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded transition-colors"
          title="Save Project (Cmd+S)"
        >
          Save
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
            isExporting
              ? 'bg-[#30d158] text-white cursor-wait'
              : 'text-[#30d158] hover:text-white hover:bg-[#3a3a3c]'
          }`}
          title="Export Audio (WAV)"
        >
          {isExporting ? (
            <>
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M4 12a8 8 0 018-8" />
              </svg>
              {Math.round(exportProgress)}%
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Export
            </>
          )}
        </button>
      </div>

      <div className="w-px h-5 bg-[#3a3a3c]" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            canUndo()
              ? 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
              : 'text-[#3a3a3c] cursor-not-allowed'
          }`}
          title="Undo (Cmd+Z)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            canRedo()
              ? 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
              : 'text-[#3a3a3c] cursor-not-allowed'
          }`}
          title="Redo (Cmd+Shift+Z)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
          </svg>
        </button>
      </div>

      {/* Split at Playhead */}
      <button
        onClick={() => {
          const selectedRegions = view.selectedRegionIds;
          selectedRegions.forEach(id => {
            const region = project?.regions[id];
            if (region && playheadPosition > region.startTime && playheadPosition < region.startTime + region.duration) {
              splitRegion(id, playheadPosition);
            }
          });
        }}
        disabled={view.selectedRegionIds.length === 0}
        className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
          view.selectedRegionIds.length > 0
            ? 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
            : 'text-[#3a3a3c] cursor-not-allowed'
        }`}
        title="Split at Playhead (/)"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 5v14H9V5h2zm4 0v14h-2V5h2z"/>
        </svg>
      </button>

      <div className="w-px h-5 bg-[#3a3a3c]" />

      {/* Tools */}
      <div className="flex items-center gap-0.5 bg-[#2c2c2e] rounded-lg p-0.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`w-7 h-7 flex items-center justify-center rounded text-sm transition-colors ${
              view.activeTool === tool.id
                ? 'bg-[#0a84ff] text-white'
                : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-[#3a3a3c]" />

      {/* Snap */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSnapEnabled(!view.snapEnabled)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            view.snapEnabled
              ? 'bg-[#0a84ff] text-white'
              : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
          }`}
        >
          Snap
        </button>
        <select
          value={view.snapValue}
          onChange={(e) => setSnapValue(e.target.value as any)}
          className="bg-[#2c2c2e] text-[#98989d] text-xs rounded px-2 py-1 border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
          disabled={!view.snapEnabled}
        >
          {SNAP_VALUES.map((snap) => (
            <option key={snap.value} value={snap.value}>
              {snap.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-[#3a3a3c]" />

      {/* Zoom */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setHorizontalZoom(view.horizontalZoom / 1.2)}
          className="w-6 h-6 flex items-center justify-center text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <div className="w-24 h-1.5 bg-[#3a3a3c] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0a84ff] rounded-full"
            style={{ width: `${((view.horizontalZoom - 10) / 190) * 100}%` }}
          />
        </div>
        <button
          onClick={() => setHorizontalZoom(view.horizontalZoom * 1.2)}
          className="w-6 h-6 flex items-center justify-center text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded transition-colors"
          title="Zoom In"
        >
          +
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View Toggles */}
      <div className="flex items-center gap-0.5 bg-[#2c2c2e] rounded-lg p-0.5">
        <button
          onClick={toggleLibrary}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            view.showLibrary
              ? 'bg-[#3a3a3c] text-white'
              : 'text-[#98989d] hover:text-white'
          }`}
          title="Library (B)"
        >
          Library
        </button>
        <button
          onClick={toggleInspector}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            view.showInspector
              ? 'bg-[#3a3a3c] text-white'
              : 'text-[#98989d] hover:text-white'
          }`}
          title="Inspector (I)"
        >
          Inspector
        </button>
        <button
          onClick={toggleMixer}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            view.showMixer
              ? 'bg-[#3a3a3c] text-white'
              : 'text-[#98989d] hover:text-white'
          }`}
          title="Mixer (X)"
        >
          Mixer
        </button>
        <button
          onClick={togglePianoRoll}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            view.showPianoRoll
              ? 'bg-[#3a3a3c] text-white'
              : 'text-[#98989d] hover:text-white'
          }`}
          title="Editors (E)"
        >
          Editors
        </button>
        <button
          onClick={toggleTempoTrack}
          className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
            view.showTempoTrack
              ? 'bg-[#ff9500] text-white'
              : 'text-[#98989d] hover:text-white'
          }`}
          title="Tempo Track (T)"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
          </svg>
          Tempo
        </button>
      </div>
    </div>
  );
}
