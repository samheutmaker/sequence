/**
 * KeyboardPiano - Virtual MIDI keyboard with computer keyboard input
 * Play notes using your computer keyboard like Logic Pro's Musical Typing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDAWStore, dawAudioEngine } from '../../store/dawStore';
import { generateId } from '../../types/daw';
import type { MidiNote } from '../../types/daw';

// Computer keyboard to MIDI note mapping (2 octaves)
const KEY_MAP: Record<string, number> = {
  // Lower row - white keys (C3 to B3)
  'a': 48, // C3
  's': 50, // D3
  'd': 52, // E3
  'f': 53, // F3
  'g': 55, // G3
  'h': 57, // A3
  'j': 59, // B3
  // Upper row - white keys (C4 to E4)
  'k': 60, // C4
  'l': 62, // D4
  ';': 64, // E4
  "'": 65, // F4
  // Black keys (lower octave)
  'w': 49, // C#3
  'e': 51, // D#3
  't': 54, // F#3
  'y': 56, // G#3
  'u': 58, // A#3
  // Black keys (upper octave)
  'o': 61, // C#4
  'p': 63, // D#4
};

// Note names for display
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface KeyboardPianoProps {
  onClose?: () => void;
}

export function KeyboardPiano({ onClose }: KeyboardPianoProps) {
  const {
    project,
    view,
    isPlaying,
    isRecording,
    playheadPosition,
    addNote,
  } = useDAWStore();

  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [velocity, setVelocity] = useState(100);
  const noteStartTimes = useRef<Map<number, number>>(new Map());

  // Get the currently selected MIDI region for recording
  const selectedRegion = view.activeEditorRegionId
    ? project?.regions[view.activeEditorRegionId]
    : null;
  const isMidiRegion = selectedRegion && 'notes' in selectedRegion;

  // Play a note
  const playNote = useCallback((midiNote: number) => {
    const adjustedNote = midiNote + (octaveOffset * 12);
    if (adjustedNote < 0 || adjustedNote > 127) return;

    // Add to active notes
    setActiveNotes(prev => new Set(prev).add(adjustedNote));

    // Store start time for recording
    noteStartTimes.current.set(adjustedNote, playheadPosition);

    // Play through audio engine
    dawAudioEngine.playNote(adjustedNote, velocity);
  }, [octaveOffset, velocity, playheadPosition]);

  // Stop a note
  const stopNote = useCallback((midiNote: number) => {
    const adjustedNote = midiNote + (octaveOffset * 12);

    // Remove from active notes
    setActiveNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(adjustedNote);
      return newSet;
    });

    // Stop the note
    dawAudioEngine.stopNote(adjustedNote);

    // If recording, add note to the selected region
    if (isRecording && isMidiRegion && selectedRegion) {
      const startTime = noteStartTimes.current.get(adjustedNote);
      if (startTime !== undefined) {
        const duration = Math.max(0.125, playheadPosition - startTime);
        const newNote: MidiNote = {
          id: generateId(),
          pitch: adjustedNote,
          velocity,
          startTime: startTime - selectedRegion.startTime,
          duration,
        };
        addNote(selectedRegion.id, newNote);
        noteStartTimes.current.delete(adjustedNote);
      }
    }
  }, [octaveOffset, isRecording, isMidiRegion, selectedRegion, playheadPosition, velocity, addNote]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // Octave controls
      if (key === 'z') {
        setOctaveOffset(prev => Math.max(-3, prev - 1));
        return;
      }
      if (key === 'x') {
        setOctaveOffset(prev => Math.min(3, prev + 1));
        return;
      }

      // Velocity controls
      if (key === 'c') {
        setVelocity(prev => Math.max(1, prev - 10));
        return;
      }
      if (key === 'v') {
        setVelocity(prev => Math.min(127, prev + 10));
        return;
      }

      // Note keys
      if (KEY_MAP[key] !== undefined && !e.repeat) {
        e.preventDefault();
        playNote(KEY_MAP[key]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (KEY_MAP[key] !== undefined) {
        e.preventDefault();
        stopNote(KEY_MAP[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playNote, stopNote]);

  // Render a piano key
  const renderKey = (note: number, isBlack: boolean, keyLabel?: string) => {
    const isActive = activeNotes.has(note + (octaveOffset * 12));
    const noteName = NOTE_NAMES[note % 12];
    const octave = Math.floor(note / 12) - 1;

    if (isBlack) {
      return (
        <div
          key={note}
          className={`absolute w-6 h-16 rounded-b cursor-pointer z-10 transition-colors ${
            isActive ? 'bg-[#0a84ff]' : 'bg-[#1c1c1e] hover:bg-[#3a3a3c]'
          }`}
          style={{ left: getBlackKeyOffset(note) }}
          onMouseDown={() => playNote(note)}
          onMouseUp={() => stopNote(note)}
          onMouseLeave={() => activeNotes.has(note + (octaveOffset * 12)) && stopNote(note)}
        >
          {keyLabel && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/50">
              {keyLabel}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        key={note}
        className={`relative w-10 h-28 rounded-b border-r border-[#3a3a3c] cursor-pointer transition-colors ${
          isActive ? 'bg-[#0a84ff]' : 'bg-white hover:bg-gray-100'
        }`}
        onMouseDown={() => playNote(note)}
        onMouseUp={() => stopNote(note)}
        onMouseLeave={() => activeNotes.has(note + (octaveOffset * 12)) && stopNote(note)}
      >
        <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] ${
          isActive ? 'text-white' : 'text-gray-400'
        }`}>
          {noteName}{octave + octaveOffset}
        </span>
        {keyLabel && (
          <span className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-medium ${
            isActive ? 'text-white' : 'text-gray-600'
          }`}>
            {keyLabel.toUpperCase()}
          </span>
        )}
      </div>
    );
  };

  // Calculate black key offset
  const getBlackKeyOffset = (note: number): string => {
    const noteInOctave = note % 12;
    const octaveStart = Math.floor(note / 12) * 7 * 40; // 7 white keys per octave, 40px each

    const offsets: Record<number, number> = {
      1: 28,   // C#
      3: 68,   // D#
      6: 148,  // F#
      8: 188,  // G#
      10: 228, // A#
    };

    return `${octaveStart + (offsets[noteInOctave] || 0)}px`;
  };

  // Generate keyboard layout
  const renderKeyboard = () => {
    const keys: JSX.Element[] = [];
    const blackKeys: JSX.Element[] = [];

    // Keyboard mapping for labels
    const keyLabels: Record<number, string> = {
      48: 'a', 50: 's', 52: 'd', 53: 'f', 55: 'g', 57: 'h', 59: 'j',
      60: 'k', 62: 'l', 64: ';', 65: "'",
      49: 'w', 51: 'e', 54: 't', 56: 'y', 58: 'u', 61: 'o', 63: 'p',
    };

    // Render 2 octaves (C3 to B4)
    for (let note = 48; note <= 71; note++) {
      const noteInOctave = note % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

      if (isBlack) {
        blackKeys.push(renderKey(note, true, keyLabels[note]));
      } else {
        keys.push(renderKey(note, false, keyLabels[note]));
      }
    }

    return (
      <div className="relative flex">
        {keys}
        {blackKeys}
      </div>
    );
  };

  return (
    <div className="bg-[#2c2c2e] rounded-lg shadow-xl border border-[#3a3a3c] overflow-hidden">
      {/* Header */}
      <div className="h-8 bg-[#1c1c1e] flex items-center justify-between px-3 border-b border-[#3a3a3c]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-white">Musical Typing</span>
          {isRecording && (
            <span className="flex items-center gap-1 text-[10px] text-[#ff453a]">
              <span className="w-2 h-2 rounded-full bg-[#ff453a] animate-pulse" />
              Recording
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Octave */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#98989d]">Octave:</span>
            <button
              onClick={() => setOctaveOffset(prev => Math.max(-3, prev - 1))}
              className="w-5 h-5 flex items-center justify-center text-xs text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded"
            >
              -
            </button>
            <span className="text-[10px] text-white w-4 text-center">
              {octaveOffset >= 0 ? `+${octaveOffset}` : octaveOffset}
            </span>
            <button
              onClick={() => setOctaveOffset(prev => Math.min(3, prev + 1))}
              className="w-5 h-5 flex items-center justify-center text-xs text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded"
            >
              +
            </button>
            <span className="text-[8px] text-[#666] ml-1">(Z/X)</span>
          </div>
          {/* Velocity */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#98989d]">Velocity:</span>
            <input
              type="range"
              min="1"
              max="127"
              value={velocity}
              onChange={(e) => setVelocity(parseInt(e.target.value))}
              className="w-16 h-1 accent-[#0a84ff]"
            />
            <span className="text-[10px] text-white w-6">{velocity}</span>
            <span className="text-[8px] text-[#666]">(C/V)</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard */}
      <div className="p-4 bg-[#1c1c1e]">
        {renderKeyboard()}
      </div>

      {/* Help */}
      <div className="px-3 py-2 bg-[#2c2c2e] border-t border-[#3a3a3c]">
        <p className="text-[9px] text-[#666]">
          Use keyboard: A-K for white keys, W-P for black keys. Z/X to change octave, C/V for velocity.
        </p>
      </div>
    </div>
  );
}

// Floating keyboard overlay
export function KeyboardPianoOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Toggle with keyboard shortcut (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.keyboard-content')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-50 cursor-move"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="keyboard-content">
        <KeyboardPiano onClose={() => setIsVisible(false)} />
      </div>
    </div>
  );
}
