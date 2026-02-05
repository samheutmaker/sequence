/**
 * DAW Piano Roll Editor - MIDI note editor
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useDAWStore, dawAudioEngine } from '../../store/dawStore';
import { generateId, midiNoteToName } from '../../types/daw';
import type { MidiRegion, MidiNote, QuantizeValue } from '../../types/daw';

const TOTAL_NOTES = 128;
const NOTE_HEIGHT = 14;
const PIANO_WIDTH = 48;
const VELOCITY_EDITOR_HEIGHT = 48;

// Velocity Editor Component with draggable bars
function VelocityEditor({
  region,
  pixelsPerBeat,
  track,
  updateNote,
  selectNote,
  selectedNoteIds,
}: {
  region: MidiRegion;
  pixelsPerBeat: number;
  track: any;
  updateNote: (regionId: string, noteId: string, updates: Partial<MidiNote>) => void;
  selectNote: (noteId: string, addToSelection?: boolean) => void;
  selectedNoteIds: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartVelocity, setDragStartVelocity] = useState(0);

  const handleVelocityDragStart = (e: React.MouseEvent, note: MidiNote) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingNoteId(note.id);
    setDragStartY(e.clientY);
    setDragStartVelocity(note.velocity);
    selectNote(note.id, e.shiftKey);
  };

  useEffect(() => {
    if (!draggingNoteId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStartY - e.clientY; // Inverted: up increases velocity
      const deltaVelocity = Math.round(deltaY * 1.5); // Sensitivity factor
      const newVelocity = Math.max(1, Math.min(127, dragStartVelocity + deltaVelocity));

      updateNote(region.id, draggingNoteId, { velocity: newVelocity });
    };

    const handleMouseUp = () => {
      setDraggingNoteId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNoteId, dragStartY, dragStartVelocity, region.id, updateNote]);

  // Handle click on empty space to draw velocity
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - PIANO_WIDTH;
    const y = e.clientY - rect.top;

    // Find note at this x position
    const clickedNote = region.notes.find(note => {
      const noteX = note.startTime * pixelsPerBeat;
      const noteWidth = Math.max(6, note.duration * pixelsPerBeat * 0.5);
      return x >= noteX && x <= noteX + noteWidth;
    });

    if (clickedNote) {
      // Calculate velocity from y position (inverted: top = high velocity)
      const barAreaHeight = VELOCITY_EDITOR_HEIGHT - 8; // Account for padding
      const velocity = Math.round(Math.max(1, Math.min(127, (1 - y / barAreaHeight) * 127)));
      updateNote(region.id, clickedNote.id, { velocity });
      selectNote(clickedNote.id, e.shiftKey);
    }
  };

  return (
    <div
      ref={containerRef}
      className="border-t border-[#3a3a3c] bg-[#1c1c1e] flex relative"
      style={{ height: VELOCITY_EDITOR_HEIGHT }}
      onClick={handleContainerClick}
    >
      <div
        style={{ width: PIANO_WIDTH }}
        className="flex items-center justify-center border-r border-[#3a3a3c] flex-shrink-0"
      >
        <span className="text-[8px] text-[#98989d]">VEL</span>
      </div>

      {/* Velocity grid lines */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background grid lines at 25%, 50%, 75% */}
        <div className="absolute inset-0 pointer-events-none">
          {[0.25, 0.5, 0.75].map((level) => (
            <div
              key={level}
              className="absolute left-0 right-0 border-t border-[#2c2c2e]"
              style={{ top: `${(1 - level) * 100}%` }}
            />
          ))}
        </div>

        {/* Velocity bars */}
        {region.notes.map((note) => {
          const noteX = note.startTime * pixelsPerBeat;
          const barHeight = (note.velocity / 127) * (VELOCITY_EDITOR_HEIGHT - 8);
          const isSelected = selectedNoteIds.includes(note.id);
          const isDragging = draggingNoteId === note.id;

          return (
            <div
              key={note.id}
              className={`absolute rounded-t cursor-ns-resize transition-colors ${
                isDragging
                  ? 'bg-white'
                  : isSelected
                  ? 'bg-white'
                  : ''
              }`}
              style={{
                left: noteX,
                width: Math.max(6, note.duration * pixelsPerBeat * 0.3),
                height: barHeight,
                bottom: 4,
                backgroundColor: isDragging || isSelected ? 'white' : track?.color || '#0a84ff',
              }}
              onMouseDown={(e) => handleVelocityDragStart(e, note)}
            >
              {/* Velocity value tooltip on hover/drag */}
              {isDragging && (
                <div
                  className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-1 rounded whitespace-nowrap"
                >
                  {note.velocity}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PianoRoll() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const pianoRef = useRef<HTMLDivElement>(null);

  const {
    project,
    view,
    playheadPosition,
    addNote,
    deleteNote,
    updateNote,
    selectNote,
    closeEditor,
    setScroll,
    quantizeNotes,
    transposeNotes,
    humanizeNotes,
    scaleVelocity,
  } = useDAWStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, note: null as MidiNote | null });
  const [hoverNote, setHoverNote] = useState<number | null>(null);

  if (!project) return null;

  const region = view.activeEditorRegionId
    ? (project.regions[view.activeEditorRegionId] as MidiRegion)
    : null;

  const track = view.activeEditorTrackId
    ? project.tracks.find(t => t.id === view.activeEditorTrackId)
    : null;

  // Zoom and scroll
  const pixelsPerBeat = view.horizontalZoom;
  const beatsPerBar = project.timeSignature[0] * (4 / project.timeSignature[1]);

  // Is a note black key?
  const isBlackKey = (note: number) => {
    const n = note % 12;
    return [1, 3, 6, 8, 10].includes(n);
  };

  // Handle piano key click - plays preview note
  const handlePianoKeyClick = (note: number) => {
    setHoverNote(note);
    // Play the note preview through audio engine
    dawAudioEngine.playNote(note, 100);
  };

  // Handle piano key release - stops the note
  const handlePianoKeyRelease = () => {
    if (hoverNote !== null) {
      dawAudioEngine.stopNote(hoverNote);
    }
  };

  // Handle canvas click to add note
  const handleGridClick = (e: React.MouseEvent) => {
    if (!region || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + gridRef.current.scrollLeft;
    const y = e.clientY - rect.top + gridRef.current.scrollTop;

    // Calculate beat position
    let beatPos = x / pixelsPerBeat;

    // Snap to grid
    if (view.snapEnabled && view.snapValue !== 'off') {
      const match = view.snapValue.match(/1\/(\d+)(T)?/);
      if (match) {
        const division = parseInt(match[1]);
        const isTriplet = match[2] === 'T';
        const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
        beatPos = Math.floor(beatPos / gridSize) * gridSize;
      }
    }

    // Calculate note from Y position
    const noteIndex = Math.floor(y / NOTE_HEIGHT);
    const pitch = TOTAL_NOTES - 1 - noteIndex;

    // Determine note duration based on snap
    let duration = 0.25; // Default 1/16
    if (view.snapValue !== 'off') {
      const match = view.snapValue.match(/1\/(\d+)(T)?/);
      if (match) {
        const division = parseInt(match[1]);
        const isTriplet = match[2] === 'T';
        duration = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
      }
    }

    // Check if clicking on existing note
    const clickedNote = region.notes.find(n => {
      const noteX = n.startTime * pixelsPerBeat;
      const noteWidth = n.duration * pixelsPerBeat;
      const noteY = (TOTAL_NOTES - 1 - n.pitch) * NOTE_HEIGHT;

      return (
        x >= noteX &&
        x <= noteX + noteWidth &&
        y >= noteY &&
        y <= noteY + NOTE_HEIGHT
      );
    });

    if (clickedNote) {
      // Select existing note
      selectNote(clickedNote.id, e.shiftKey);

      // Delete with eraser tool
      if (view.activeTool === 'eraser') {
        deleteNote(region.id, clickedNote.id);
      }
    } else if (view.activeTool === 'pencil' || view.activeTool === 'pointer') {
      // Create new note with pencil or pointer tool
      const newNote: MidiNote = {
        id: generateId(),
        pitch,
        velocity: 100,
        startTime: beatPos,
        duration,
      };

      addNote(region.id, newNote);
      selectNote(newNote.id);
      // Play preview of the added note
      dawAudioEngine.playNote(pitch, 100);
      setTimeout(() => dawAudioEngine.stopNote(pitch), 150);
    }
  };

  // Handle double-click to create notes (always works regardless of tool)
  const handleGridDoubleClick = (e: React.MouseEvent) => {
    if (!region || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + gridRef.current.scrollLeft;
    const y = e.clientY - rect.top + gridRef.current.scrollTop;

    // Calculate beat position
    let beatPos = x / pixelsPerBeat;

    // Snap to grid
    if (view.snapEnabled && view.snapValue !== 'off') {
      const match = view.snapValue.match(/1\/(\d+)(T)?/);
      if (match) {
        const division = parseInt(match[1]);
        const isTriplet = match[2] === 'T';
        const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
        beatPos = Math.floor(beatPos / gridSize) * gridSize;
      }
    }

    // Calculate note from Y position
    const noteIndex = Math.floor(y / NOTE_HEIGHT);
    const pitch = TOTAL_NOTES - 1 - noteIndex;

    // Determine note duration based on snap
    let duration = 0.25; // Default 1/16
    if (view.snapValue !== 'off') {
      const match = view.snapValue.match(/1\/(\d+)(T)?/);
      if (match) {
        const division = parseInt(match[1]);
        const isTriplet = match[2] === 'T';
        duration = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
      }
    }

    // Check if clicking on existing note - if so, delete it
    const clickedNote = region.notes.find(n => {
      const noteX = n.startTime * pixelsPerBeat;
      const noteWidth = n.duration * pixelsPerBeat;
      const noteY = (TOTAL_NOTES - 1 - n.pitch) * NOTE_HEIGHT;

      return (
        x >= noteX &&
        x <= noteX + noteWidth &&
        y >= noteY &&
        y <= noteY + NOTE_HEIGHT
      );
    });

    if (clickedNote) {
      // Delete on double-click
      deleteNote(region.id, clickedNote.id);
    } else {
      // Create new note
      const newNote: MidiNote = {
        id: generateId(),
        pitch,
        velocity: 100,
        startTime: beatPos,
        duration,
      };

      addNote(region.id, newNote);
      selectNote(newNote.id);
      // Play preview of the added note
      dawAudioEngine.playNote(pitch, 100);
      setTimeout(() => dawAudioEngine.stopNote(pitch), 150);
    }
  };

  // Handle note drag
  const handleNoteDragStart = (e: React.MouseEvent, note: MidiNote) => {
    e.stopPropagation();

    const noteElement = e.currentTarget as HTMLElement;
    const rect = noteElement.getBoundingClientRect();
    const relX = e.clientX - rect.left;

    // Check if dragging the resize handle
    if (relX > rect.width - 8) {
      setIsResizing(true);
    } else {
      setIsDragging(true);
    }

    setDragStart({ x: e.clientX, y: e.clientY, note });
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!region || !dragStart.note) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const deltaBeat = deltaX / pixelsPerBeat;
      const deltaPitch = -Math.round(deltaY / NOTE_HEIGHT);

      if (isDragging) {
        let newStartTime = dragStart.note.startTime + deltaBeat;
        let newPitch = Math.max(0, Math.min(127, dragStart.note.pitch + deltaPitch));

        // Snap
        if (view.snapEnabled && view.snapValue !== 'off') {
          const match = view.snapValue.match(/1\/(\d+)(T)?/);
          if (match) {
            const division = parseInt(match[1]);
            const isTriplet = match[2] === 'T';
            const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
            newStartTime = Math.round(newStartTime / gridSize) * gridSize;
          }
        }

        updateNote(region.id, dragStart.note.id, {
          startTime: Math.max(0, newStartTime),
          pitch: newPitch,
        });
      } else if (isResizing) {
        let newDuration = Math.max(0.125, dragStart.note.duration + deltaBeat);

        // Snap duration
        if (view.snapEnabled && view.snapValue !== 'off') {
          const match = view.snapValue.match(/1\/(\d+)(T)?/);
          if (match) {
            const division = parseInt(match[1]);
            const isTriplet = match[2] === 'T';
            const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
            newDuration = Math.max(gridSize, Math.round(newDuration / gridSize) * gridSize);
          }
        }

        updateNote(region.id, dragStart.note.id, { duration: newDuration });
        setDragStart({ ...dragStart, x: e.clientX });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setDragStart({ x: 0, y: 0, note: null });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, region, view, pixelsPerBeat, updateNote]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      // Delete/Backspace - delete selected notes
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (region) {
          view.selectedNoteIds.forEach(noteId => {
            deleteNote(region.id, noteId);
          });
        }
      }

      // Q - Quantize notes
      if (e.code === 'KeyQ' && !e.metaKey && !e.ctrlKey && region) {
        e.preventDefault();
        quantizeNotes(region.id, (region.quantize || '1/16') as QuantizeValue);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [region, view.selectedNoteIds, deleteNote, quantizeNotes]);

  const gridWidth = Math.max(1000, (region?.duration ?? 4) * 4 * pixelsPerBeat);
  const gridHeight = TOTAL_NOTES * NOTE_HEIGHT;

  // Auto-scroll to center on notes when region changes
  useEffect(() => {
    if (!region || !gridRef.current || !pianoRef.current || region.notes.length === 0) return;

    // Find the pitch range of notes in the region
    const pitches = region.notes.map(n => n.pitch);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const centerPitch = Math.floor((minPitch + maxPitch) / 2);

    // Calculate Y position to center on
    const centerY = (TOTAL_NOTES - 1 - centerPitch) * NOTE_HEIGHT;
    const visibleHeight = gridRef.current.clientHeight;

    // Scroll to center the notes (with some padding)
    const scrollTop = Math.max(0, centerY - visibleHeight / 2);
    gridRef.current.scrollTop = scrollTop;
    pianoRef.current.scrollTop = scrollTop;
  }, [region?.id]);

  // Sync piano keys scroll with grid scroll
  const handleGridScroll = useCallback(() => {
    if (gridRef.current && pianoRef.current) {
      pianoRef.current.scrollTop = gridRef.current.scrollTop;
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-8 border-b border-[#3a3a3c] flex items-center px-3 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#98989d] uppercase tracking-wider">Piano Roll</span>
          {track && (
            <span className="text-xs text-white">{track.name}</span>
          )}
          {region && (
            <span className="text-xs text-[#98989d]">- {region.name}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Quantize Controls */}
          {region && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#98989d]">Quantize:</span>
              <select
                value={region.quantize || '1/16'}
                onChange={(e) => quantizeNotes(region.id, e.target.value as QuantizeValue)}
                className="bg-[#2c2c2e] text-[#98989d] text-[10px] rounded px-1.5 py-0.5 border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff] cursor-pointer"
              >
                <option value="1/4">1/4</option>
                <option value="1/8">1/8</option>
                <option value="1/16">1/16</option>
                <option value="1/32">1/32</option>
                <option value="1/4T">1/4T</option>
                <option value="1/8T">1/8T</option>
                <option value="1/16T">1/16T</option>
              </select>
              <button
                onClick={() => quantizeNotes(region.id, (region.quantize || '1/16') as QuantizeValue)}
                className="px-2 py-0.5 text-[10px] bg-[#0a84ff] text-white rounded hover:bg-[#0077ed] transition-colors"
                title="Quantize selected notes (Q)"
              >
                Q
              </button>
            </div>
          )}

          {/* Transpose Controls */}
          {region && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#98989d]">Transpose:</span>
              <button
                onClick={() => transposeNotes(region.id, -12, view.selectedNoteIds.length > 0 ? view.selectedNoteIds : undefined)}
                className="px-1.5 py-0.5 text-[9px] text-[#98989d] bg-[#2c2c2e] rounded hover:bg-[#3a3a3c] hover:text-white transition-colors"
                title="Transpose down 1 octave"
              >
                -Oct
              </button>
              <button
                onClick={() => transposeNotes(region.id, -1, view.selectedNoteIds.length > 0 ? view.selectedNoteIds : undefined)}
                className="px-1.5 py-0.5 text-[9px] text-[#98989d] bg-[#2c2c2e] rounded hover:bg-[#3a3a3c] hover:text-white transition-colors"
                title="Transpose down 1 semitone"
              >
                -1
              </button>
              <button
                onClick={() => transposeNotes(region.id, 1, view.selectedNoteIds.length > 0 ? view.selectedNoteIds : undefined)}
                className="px-1.5 py-0.5 text-[9px] text-[#98989d] bg-[#2c2c2e] rounded hover:bg-[#3a3a3c] hover:text-white transition-colors"
                title="Transpose up 1 semitone"
              >
                +1
              </button>
              <button
                onClick={() => transposeNotes(region.id, 12, view.selectedNoteIds.length > 0 ? view.selectedNoteIds : undefined)}
                className="px-1.5 py-0.5 text-[9px] text-[#98989d] bg-[#2c2c2e] rounded hover:bg-[#3a3a3c] hover:text-white transition-colors"
                title="Transpose up 1 octave"
              >
                +Oct
              </button>
            </div>
          )}

          {/* Humanize & Velocity */}
          {region && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => humanizeNotes(region.id, 0.03, view.selectedNoteIds.length > 0 ? view.selectedNoteIds : undefined)}
                className="px-1.5 py-0.5 text-[9px] text-[#98989d] bg-[#2c2c2e] rounded hover:bg-[#3a3a3c] hover:text-white transition-colors"
                title="Humanize timing and velocity"
              >
                Humanize
              </button>
              <button
                onClick={() => scaleVelocity(region.id, 0.8, view.selectedNoteIds.length > 0 ? view.selectedNoteIds : undefined)}
                className="px-1.5 py-0.5 text-[9px] text-[#98989d] bg-[#2c2c2e] rounded hover:bg-[#3a3a3c] hover:text-white transition-colors"
                title="Reduce velocity by 20%"
              >
                Vel-
              </button>
              <button
                onClick={() => scaleVelocity(region.id, 1.2, view.selectedNoteIds.length > 0 ? view.selectedNoteIds : undefined)}
                className="px-1.5 py-0.5 text-[9px] text-[#98989d] bg-[#2c2c2e] rounded hover:bg-[#3a3a3c] hover:text-white transition-colors"
                title="Increase velocity by 20%"
              >
                Vel+
              </button>
            </div>
          )}
          <button
            onClick={closeEditor}
            className="w-6 h-6 flex items-center justify-center text-[#98989d] hover:text-white rounded hover:bg-[#3a3a3c]"
          >
            ×
          </button>
        </div>
      </div>

      {!region ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-[#98989d]">
            Double-click a MIDI region to edit
          </p>
          <p className="text-xs text-[#666]">
            Click to add notes, double-click to delete, drag to move
          </p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Piano Keys */}
          <div
            ref={pianoRef}
            className="flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide"
            style={{ width: PIANO_WIDTH }}
          >
            {Array.from({ length: TOTAL_NOTES }, (_, i) => {
              const note = TOTAL_NOTES - 1 - i;
              const black = isBlackKey(note);

              return (
                <div
                  key={note}
                  className={`flex items-center justify-end pr-1 border-b border-[#1c1c1e] cursor-pointer transition-colors ${
                    black
                      ? 'bg-[#1c1c1e] text-[#98989d]'
                      : 'bg-[#4a4a4c] text-white'
                  } ${hoverNote === note ? 'bg-[#0a84ff]' : ''}`}
                  style={{ height: NOTE_HEIGHT }}
                  onMouseDown={() => handlePianoKeyClick(note)}
                  onMouseUp={handlePianoKeyRelease}
                  onMouseLeave={handlePianoKeyRelease}
                >
                  {note % 12 === 0 && (
                    <span className="text-[8px]">{midiNoteToName(note)}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div
            ref={gridRef}
            className="flex-1 overflow-auto relative"
            onClick={handleGridClick}
            onDoubleClick={handleGridDoubleClick}
            onScroll={handleGridScroll}
          >
            {/* Grid Background */}
            <div
              className="relative"
              style={{ width: gridWidth, height: gridHeight }}
            >
              {/* Horizontal lines (note rows) */}
              {Array.from({ length: TOTAL_NOTES }, (_, i) => {
                const note = TOTAL_NOTES - 1 - i;
                const black = isBlackKey(note);

                return (
                  <div
                    key={note}
                    className={`absolute left-0 right-0 border-b border-[#2c2c2e] ${
                      black ? 'bg-[#1c1c1e]' : 'bg-[#242426]'
                    }`}
                    style={{ top: i * NOTE_HEIGHT, height: NOTE_HEIGHT }}
                  />
                );
              })}

              {/* Vertical lines (beats) */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: gridWidth, height: gridHeight }}
              >
                <defs>
                  <pattern
                    id="piano-beat-grid"
                    width={pixelsPerBeat}
                    height={NOTE_HEIGHT}
                    patternUnits="userSpaceOnUse"
                  >
                    <line
                      x1={pixelsPerBeat}
                      y1="0"
                      x2={pixelsPerBeat}
                      y2={NOTE_HEIGHT}
                      stroke="#2c2c2e"
                      strokeWidth="1"
                    />
                  </pattern>
                  <pattern
                    id="piano-bar-grid"
                    width={beatsPerBar * pixelsPerBeat}
                    height={NOTE_HEIGHT}
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="100%" height="100%" fill="url(#piano-beat-grid)" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2={NOTE_HEIGHT}
                      stroke="#3a3a3c"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#piano-bar-grid)" />
              </svg>

              {/* Notes */}
              {region.notes.map((note) => {
                const noteX = note.startTime * pixelsPerBeat;
                const noteWidth = note.duration * pixelsPerBeat;
                const noteY = (TOTAL_NOTES - 1 - note.pitch) * NOTE_HEIGHT;
                const isSelected = view.selectedNoteIds.includes(note.id);

                return (
                  <div
                    key={note.id}
                    className={`absolute rounded cursor-pointer transition-shadow ${
                      isSelected ? 'ring-2 ring-white shadow-lg z-10' : ''
                    }`}
                    style={{
                      left: noteX,
                      top: noteY + 1,
                      width: Math.max(8, noteWidth),
                      height: NOTE_HEIGHT - 2,
                      backgroundColor: track?.color || '#0a84ff',
                      opacity: note.velocity / 127,
                    }}
                    onMouseDown={(e) => handleNoteDragStart(e, note)}
                  >
                    {/* Velocity bar */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-black/30"
                      style={{ height: `${(1 - note.velocity / 127) * 100}%` }}
                    />
                    {/* Resize handle */}
                    <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
                  </div>
                );
              })}

              {/* Playhead */}
              {playheadPosition >= (region?.startTime ?? 0) &&
               playheadPosition <= ((region?.startTime ?? 0) + (region?.duration ?? 0)) && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#ff453a] pointer-events-none z-20"
                  style={{ left: (playheadPosition - (region?.startTime ?? 0)) * pixelsPerBeat }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Velocity Editor Strip */}
      {region && (
        <VelocityEditor
          region={region}
          pixelsPerBeat={pixelsPerBeat}
          track={track}
          updateNote={updateNote}
          selectNote={selectNote}
          selectedNoteIds={view.selectedNoteIds}
        />
      )}
    </div>
  );
}
