/**
 * DAW Main Application - Logic Pro style interface
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDAWStore } from '../../store/dawStore';

// Resizable panel handle component
function ResizeHandle({
  direction,
  onResize,
}: {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
  }, [direction]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      ref={handleRef}
      className={`flex-shrink-0 ${
        direction === 'horizontal'
          ? 'w-1.5 cursor-col-resize hover:bg-[#0a84ff]'
          : 'h-1.5 cursor-row-resize hover:bg-[#0a84ff]'
      } ${isDragging ? 'bg-[#0a84ff]' : 'bg-[#3a3a3c]'} transition-colors`}
      onMouseDown={handleMouseDown}
    />
  );
}
import { Toolbar } from './Toolbar';
import { TransportBar } from './TransportBar';
import { TrackList } from './TrackList';
import { Timeline } from './Timeline';
import { Arrangement } from './Arrangement';
import { Library } from './Library';
import { Inspector } from './Inspector';
import { Mixer } from './Mixer';
import { PianoRoll } from './PianoRoll';
import { StepSequencer } from './StepSequencer';
import { KeyboardPianoOverlay } from './KeyboardPiano';
import { SmartControls } from './SmartControls';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { TempoTrack } from './TempoTrack';
import { DrummerEditor } from './DrummerEditor';

export function DAWApp() {
  const {
    init,
    isInitialized,
    isLoading,
    project,
    view,
  } = useDAWStore();

  // Panel sizes state
  const [libraryWidth, setLibraryWidth] = useState(256);
  const [inspectorWidth, setInspectorWidth] = useState(256);
  const [mixerHeight, setMixerHeight] = useState(200);
  const [pianoRollHeight, setPianoRollHeight] = useState(250);
  const [smartControlsHeight, setSmartControlsHeight] = useState(280);
  const [editorMode, setEditorMode] = useState<'piano' | 'steps' | 'drummer'>('piano');

  // Resize handlers
  const handleLibraryResize = useCallback((delta: number) => {
    setLibraryWidth(prev => Math.max(180, Math.min(400, prev + delta)));
  }, []);

  const handleInspectorResize = useCallback((delta: number) => {
    setInspectorWidth(prev => Math.max(180, Math.min(400, prev - delta)));
  }, []);

  const handleMixerResize = useCallback((delta: number) => {
    setMixerHeight(prev => Math.max(150, Math.min(400, prev - delta)));
  }, []);

  const handlePianoRollResize = useCallback((delta: number) => {
    setPianoRollHeight(prev => Math.max(150, Math.min(400, prev - delta)));
  }, []);

  const handleSmartControlsResize = useCallback((delta: number) => {
    setSmartControlsHeight(prev => Math.max(100, Math.min(300, prev - delta)));
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      init();
    }
  }, [init, isInitialized, isLoading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const store = useDAWStore.getState();

      // Space - play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        store.togglePlay();
      }

      // Enter - stop and go to start
      if (e.code === 'Enter') {
        e.preventDefault();
        store.stop();
      }

      // R - toggle recording
      if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        store.toggleRecording();
      }

      // M - toggle metronome
      if (e.code === 'KeyM' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        store.toggleMetronome();
      }

      // L - toggle loop
      if (e.code === 'KeyL' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        store.toggleLoop();
      }

      // Delete/Backspace - delete selected
      if (e.code === 'Delete' || e.code === 'Backspace') {
        const selectedRegions = store.view.selectedRegionIds;
        selectedRegions.forEach(id => store.deleteRegion(id));
      }

      // Cmd/Ctrl + A - select all
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyA') {
        e.preventDefault();
        store.selectAll();
      }

      // Cmd/Ctrl + D - duplicate
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyD') {
        e.preventDefault();
        const selectedRegions = store.view.selectedRegionIds;
        selectedRegions.forEach(id => store.duplicateRegion(id));
      }

      // / - split selected regions at playhead
      if (e.code === 'Slash' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const selectedRegions = store.view.selectedRegionIds;
        const playhead = store.playheadPosition;
        selectedRegions.forEach(id => {
          const region = store.project?.regions[id];
          if (region && playhead > region.startTime && playhead < region.startTime + region.duration) {
            store.splitRegion(id, playhead);
          }
        });
      }

      // Escape - clear selection
      if (e.code === 'Escape') {
        store.clearSelection();
        store.closeEditor();
      }

      // , - rewind (go to start / previous bar)
      if (e.code === 'Comma') {
        e.preventDefault();
        const bpm = store.project?.bpm || 120;
        const beatsPerBar = (store.project?.timeSignature[0] || 4) * (4 / (store.project?.timeSignature[1] || 4));
        const currentBar = Math.floor(store.playheadPosition / beatsPerBar);
        const newPosition = Math.max(0, (currentBar - 1) * beatsPerBar);
        store.setPlayheadPosition(newPosition);
      }

      // . - forward (next bar)
      if (e.code === 'Period') {
        e.preventDefault();
        const beatsPerBar = (store.project?.timeSignature[0] || 4) * (4 / (store.project?.timeSignature[1] || 4));
        const currentBar = Math.floor(store.playheadPosition / beatsPerBar);
        store.setPlayheadPosition((currentBar + 1) * beatsPerBar);
      }

      // Left arrow - nudge back one beat
      if (e.code === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        store.setPlayheadPosition(Math.max(0, store.playheadPosition - 1));
      }

      // Right arrow - nudge forward one beat
      if (e.code === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        store.setPlayheadPosition(store.playheadPosition + 1);
      }

      // Home - go to start
      if (e.code === 'Home') {
        e.preventDefault();
        store.setPlayheadPosition(0);
      }

      // End - go to end of last region
      if (e.code === 'End') {
        e.preventDefault();
        let maxEnd = 0;
        if (store.project) {
          Object.values(store.project.regions).forEach((region: any) => {
            const end = region.startTime + region.duration;
            if (end > maxEnd) maxEnd = end;
          });
        }
        store.setPlayheadPosition(maxEnd > 0 ? maxEnd : 16);
      }

      // Tool shortcuts
      if (e.code === 'KeyT') store.setActiveTool('pointer');
      if (e.code === 'KeyP') store.setActiveTool('pencil');
      if (e.code === 'KeyS' && !e.metaKey && !e.ctrlKey) store.setActiveTool('scissors');
      if (e.code === 'KeyG') store.setActiveTool('glue');
      if (e.code === 'KeyE') store.setActiveTool('eraser');
      if (e.code === 'KeyZ' && !e.metaKey && !e.ctrlKey) store.setActiveTool('zoom');
      if (e.code === 'KeyU') store.setActiveTool('mute');
      if (e.code === 'KeyA' && !e.metaKey && !e.ctrlKey) store.setActiveTool('automation');

      // View toggle shortcuts
      if (e.code === 'KeyY' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        store.toggleLibrary();
      }
      if (e.code === 'KeyI' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        store.toggleInspector();
      }
      if (e.code === 'KeyX' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        store.toggleMixer();
      }

      // Zoom
      if (e.code === 'Equal' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        store.setHorizontalZoom(store.view.horizontalZoom * 1.2);
      }
      if (e.code === 'Minus' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        store.setHorizontalZoom(store.view.horizontalZoom / 1.2);
      }

      // Copy/Cut/Paste
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyC' && !e.shiftKey) {
        e.preventDefault();
        store.copyRegions();
      }
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyX' && !e.shiftKey) {
        e.preventDefault();
        store.cutRegions();
      }
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyV' && !e.shiftKey) {
        e.preventDefault();
        store.pasteRegions();
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && e.shiftKey) {
        e.preventDefault();
        store.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Loading screen
  if (!isInitialized || isLoading) {
    return (
      <div className="h-screen bg-[#1c1c1e] flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-white mb-4">Logic Studio</h1>
          <p className="text-[#98989d] text-sm mb-8">Professional Audio Workstation</p>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#0a84ff] animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-[#0a84ff] animate-pulse delay-100" />
              <div className="w-2 h-2 rounded-full bg-[#0a84ff] animate-pulse delay-200" />
            </div>
          ) : (
            <button
              onClick={init}
              className="px-8 py-3 bg-[#0a84ff] text-white rounded-lg font-medium hover:bg-[#0077ed] transition-colors"
            >
              Start Session
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="h-screen bg-[#1c1c1e] flex flex-col overflow-hidden select-none">
      {/* Top Toolbar */}
      <Toolbar />

      {/* Transport Bar */}
      <TransportBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Library Panel (Left) */}
        {view.showLibrary && (
          <>
            <div style={{ width: libraryWidth }} className="flex-shrink-0 flex flex-col bg-[#2c2c2e]">
              <Library />
            </div>
            <ResizeHandle direction="horizontal" onResize={handleLibraryResize} />
          </>
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Arrangement View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Track Headers */}
            <div className="w-52 flex-shrink-0 bg-[#2c2c2e] border-r border-[#3a3a3c]">
              <div className="h-10 border-b border-[#3a3a3c] flex items-center justify-center">
                <span className="text-xs text-[#98989d] uppercase tracking-wider">Tracks</span>
              </div>
              <TrackList />
            </div>

            {/* Timeline and Regions */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#1c1c1e]">
              {/* Timeline Ruler */}
              <Timeline />

              {/* Tempo Track (when visible) */}
              {view.showTempoTrack && (
                <TempoTrack
                  width={1200}
                  pixelsPerBeat={view.horizontalZoom}
                />
              )}

              {/* Arrangement Grid */}
              <Arrangement />
            </div>
          </div>

          {/* Smart Controls (shows when track selected) */}
          {view.selectedTrackIds.length > 0 && (
            <>
              <ResizeHandle direction="vertical" onResize={handleSmartControlsResize} />
              <div style={{ height: smartControlsHeight }} className="flex-shrink-0 bg-[#2c2c2e]">
                <SmartControls />
              </div>
            </>
          )}

          {/* Editor Panel (Piano Roll or Step Sequencer) */}
          {view.showPianoRoll && (
            <>
              <ResizeHandle direction="vertical" onResize={handlePianoRollResize} />
              <div style={{ height: pianoRollHeight }} className="flex-shrink-0 bg-[#2c2c2e] flex flex-col">
                {/* Editor Mode Toggle */}
                <div className="h-7 bg-[#323234] border-b border-[#3a3a3c] flex items-center px-2 gap-2">
                  <div className="flex items-center bg-[#2c2c2e] rounded p-0.5">
                    <button
                      onClick={() => setEditorMode('piano')}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                        editorMode === 'piano'
                          ? 'bg-[#0a84ff] text-white'
                          : 'text-[#98989d] hover:text-white'
                      }`}
                    >
                      Piano Roll
                    </button>
                    <button
                      onClick={() => setEditorMode('steps')}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                        editorMode === 'steps'
                          ? 'bg-[#0a84ff] text-white'
                          : 'text-[#98989d] hover:text-white'
                      }`}
                    >
                      Step Sequencer
                    </button>
                    <button
                      onClick={() => setEditorMode('drummer')}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                        editorMode === 'drummer'
                          ? 'bg-[#0a84ff] text-white'
                          : 'text-[#98989d] hover:text-white'
                      }`}
                    >
                      Drummer
                    </button>
                  </div>
                </div>
                {/* Editor Content */}
                <div className="flex-1 overflow-hidden">
                  {editorMode === 'piano' ? (
                    <PianoRoll />
                  ) : editorMode === 'drummer' ? (
                    (view.activeEditorTrackId || view.selectedTrackIds[0]) ? (
                      <DrummerEditor trackId={view.activeEditorTrackId || view.selectedTrackIds[0]} regionId={view.activeEditorRegionId || undefined} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[#98989d] text-sm">
                        Select a track to use the Drummer
                      </div>
                    )
                  ) : view.activeEditorRegionId ? (
                    <StepSequencer regionId={view.activeEditorRegionId} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#98989d] text-sm">
                      Double-click a MIDI region to open Step Sequencer
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Inspector Panel (Right) */}
        {view.showInspector && (
          <>
            <ResizeHandle direction="horizontal" onResize={handleInspectorResize} />
            <div style={{ width: inspectorWidth }} className="flex-shrink-0 flex flex-col bg-[#2c2c2e]">
              <Inspector />
            </div>
          </>
        )}
      </div>

      {/* Mixer Panel (Bottom) */}
      {view.showMixer && (
        <>
          <ResizeHandle direction="vertical" onResize={handleMixerResize} />
          <div style={{ height: mixerHeight }} className="flex-shrink-0 bg-[#2c2c2e]">
            <Mixer />
          </div>
        </>
      )}

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcuts />

      {/* Virtual Piano Keyboard (toggle with Cmd+K) */}
      <KeyboardPianoOverlay />
    </div>
  );
}
