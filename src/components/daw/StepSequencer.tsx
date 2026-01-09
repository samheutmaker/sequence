/**
 * DAW Step Sequencer - Logic Pro style drum machine grid
 */

import { useState, useCallback, useEffect } from 'react';
import { useDAWStore } from '../../store/dawStore';
import { generateId } from '../../types/daw';
import type { MidiRegion, MidiNote } from '../../types/daw';

// Drum kit mapping (MIDI note to name)
const DRUM_KIT = [
  { note: 36, name: 'Kick', color: '#ef4444' },
  { note: 38, name: 'Snare', color: '#f97316' },
  { note: 37, name: 'Rim', color: '#f59e0b' },
  { note: 39, name: 'Clap', color: '#eab308' },
  { note: 42, name: 'Closed HH', color: '#84cc16' },
  { note: 46, name: 'Open HH', color: '#22c55e' },
  { note: 44, name: 'Pedal HH', color: '#10b981' },
  { note: 45, name: 'Low Tom', color: '#14b8a6' },
  { note: 48, name: 'Mid Tom', color: '#06b6d4' },
  { note: 50, name: 'High Tom', color: '#0ea5e9' },
  { note: 49, name: 'Crash', color: '#3b82f6' },
  { note: 51, name: 'Ride', color: '#6366f1' },
  { note: 56, name: 'Cowbell', color: '#8b5cf6' },
  { note: 54, name: 'Tambourine', color: '#a855f7' },
  { note: 69, name: 'Shaker', color: '#d946ef' },
  { note: 75, name: 'Claves', color: '#ec4899' },
];

interface StepSequencerProps {
  regionId: string;
  steps?: number;
}

export function StepSequencer({ regionId, steps: initialSteps = 16 }: StepSequencerProps) {
  const {
    project,
    view,
    playheadPosition,
    isPlaying,
    addNote,
    deleteNote,
    updateNote,
    resizeRegion,
  } = useDAWStore();

  const [velocity, setVelocity] = useState(100);
  const [swing, setSwing] = useState(0);
  const [steps, setSteps] = useState(initialSteps);

  if (!project) return null;

  const region = project.regions[regionId] as MidiRegion;
  if (!region || !('notes' in region)) return null;

  const track = project.tracks.find(t => t.id === region.trackId);
  const stepDuration = region.duration / steps;
  const beatsPerStep = stepDuration;

  // Calculate current step based on playhead
  const currentStep = isPlaying
    ? Math.floor((playheadPosition - region.startTime) / stepDuration) % steps
    : -1;

  // Get notes for a specific step and drum
  const getNotesAtStep = (drumNote: number, step: number): MidiNote[] => {
    const stepStart = step * stepDuration;
    const stepEnd = stepStart + stepDuration;
    return region.notes.filter(
      n => n.pitch === drumNote && n.startTime >= stepStart && n.startTime < stepEnd
    );
  };

  // Check if a step has a note
  const hasNote = (drumNote: number, step: number): boolean => {
    return getNotesAtStep(drumNote, step).length > 0;
  };

  // Get velocity of note at step
  const getNoteVelocity = (drumNote: number, step: number): number => {
    const notes = getNotesAtStep(drumNote, step);
    return notes.length > 0 ? notes[0].velocity : 0;
  };

  // Toggle note at step
  const toggleStep = (drumNote: number, step: number) => {
    const notes = getNotesAtStep(drumNote, step);

    if (notes.length > 0) {
      // Delete existing notes
      notes.forEach(note => deleteNote(regionId, note.id));
    } else {
      // Add new note with swing offset
      const swingOffset = step % 2 === 1 ? (swing / 100) * stepDuration * 0.5 : 0;
      const newNote: MidiNote = {
        id: generateId(),
        pitch: drumNote,
        velocity,
        startTime: step * stepDuration + swingOffset,
        duration: stepDuration * 0.5,
      };
      addNote(regionId, newNote);
    }
  };

  // Adjust velocity on right-click drag
  const handleVelocityDrag = (drumNote: number, step: number, e: React.MouseEvent) => {
    e.preventDefault();
    const notes = getNotesAtStep(drumNote, step);
    if (notes.length === 0) return;

    const startY = e.clientY;
    const startVel = notes[0].velocity;

    const handleMove = (moveE: MouseEvent) => {
      const deltaY = startY - moveE.clientY;
      const newVel = Math.max(1, Math.min(127, startVel + Math.round(deltaY / 2)));
      updateNote(regionId, notes[0].id, { velocity: newVel });
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  // Fill/clear row
  const fillRow = (drumNote: number, fill: boolean) => {
    if (fill) {
      for (let step = 0; step < steps; step++) {
        if (!hasNote(drumNote, step)) {
          const swingOffset = step % 2 === 1 ? (swing / 100) * stepDuration * 0.5 : 0;
          addNote(regionId, {
            id: generateId(),
            pitch: drumNote,
            velocity,
            startTime: step * stepDuration + swingOffset,
            duration: stepDuration * 0.5,
          });
        }
      }
    } else {
      region.notes
        .filter(n => n.pitch === drumNote)
        .forEach(n => deleteNote(regionId, n.id));
    }
  };

  return (
    <div className="flex flex-col bg-[#1c1c1e] h-full">
      {/* Header */}
      <div className="h-8 bg-[#2c2c2e] border-b border-[#3a3a3c] flex items-center justify-between px-3">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-white">Step Sequencer</span>
          <span className="text-[10px] text-[#98989d]">{region.name}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Velocity */}
          <div className="flex items-center gap-2">
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
          </div>
          {/* Swing */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#98989d]">Swing:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={swing}
              onChange={(e) => setSwing(parseInt(e.target.value))}
              className="w-16 h-1 accent-[#0a84ff]"
            />
            <span className="text-[10px] text-white w-6">{swing}%</span>
          </div>
          {/* Steps selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#98989d]">Steps:</span>
            <select
              value={steps}
              onChange={(e) => {
                const newSteps = parseInt(e.target.value);
                setSteps(newSteps);
                // Resize region to match new step count (each step = 1/4 beat)
                const newDuration = newSteps * 0.25;
                resizeRegion(regionId, newDuration, 'end');
              }}
              className="bg-[#3a3a3c] text-white text-[10px] px-2 py-0.5 rounded border-none focus:outline-none"
            >
              <option value="8">8</option>
              <option value="16">16</option>
              <option value="32">32</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Row labels */}
          <div className="flex-shrink-0 w-24 bg-[#2c2c2e]">
            {/* Step numbers header */}
            <div className="h-6 border-b border-[#3a3a3c]" />
            {/* Drum names */}
            {DRUM_KIT.map((drum) => (
              <div
                key={drum.note}
                className="h-7 flex items-center justify-between px-2 border-b border-[#3a3a3c] group"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: drum.color }}
                  />
                  <span className="text-[10px] text-[#98989d] group-hover:text-white">
                    {drum.name}
                  </span>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => fillRow(drum.note, true)}
                    className="text-[8px] text-[#0a84ff] hover:text-white"
                    title="Fill all steps"
                  >
                    F
                  </button>
                  <button
                    onClick={() => fillRow(drum.note, false)}
                    className="text-[8px] text-[#ff453a] hover:text-white"
                    title="Clear row"
                  >
                    C
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Step grid */}
          <div className="flex-1 overflow-x-auto">
            {/* Step numbers */}
            <div className="flex h-6 border-b border-[#3a3a3c]">
              {Array.from({ length: steps }, (_, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 w-7 flex items-center justify-center text-[9px] border-r border-[#3a3a3c] ${
                    i % 4 === 0 ? 'text-white bg-[#3a3a3c]/30' : 'text-[#666]'
                  } ${currentStep === i ? 'bg-[#0a84ff]/30' : ''}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {DRUM_KIT.map((drum) => (
              <div key={drum.note} className="flex h-7 border-b border-[#3a3a3c]">
                {Array.from({ length: steps }, (_, step) => {
                  const active = hasNote(drum.note, step);
                  const vel = getNoteVelocity(drum.note, step);
                  const isCurrentStep = currentStep === step;
                  const isBeatStart = step % 4 === 0;

                  return (
                    <div
                      key={step}
                      onClick={() => toggleStep(drum.note, step)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (active) handleVelocityDrag(drum.note, step, e);
                      }}
                      className={`flex-shrink-0 w-7 h-full border-r cursor-pointer transition-colors flex items-center justify-center ${
                        isBeatStart ? 'border-[#4a4a4c]' : 'border-[#3a3a3c]'
                      } ${isCurrentStep ? 'bg-[#0a84ff]/20' : isBeatStart ? 'bg-[#2a2a2c]' : 'bg-[#1c1c1e]'} ${
                        active ? '' : 'hover:bg-[#3a3a3c]/50'
                      }`}
                    >
                      {active && (
                        <div
                          className="w-5 h-5 rounded transition-all"
                          style={{
                            backgroundColor: drum.color,
                            opacity: vel / 127,
                            transform: `scale(${0.6 + (vel / 127) * 0.4})`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini step sequencer for inline display
export function MiniStepSequencer({ regionId }: { regionId: string }) {
  const { project } = useDAWStore();

  if (!project) return null;

  const region = project.regions[regionId] as MidiRegion;
  if (!region || !('notes' in region)) return null;

  const steps = 16;
  const stepDuration = region.duration / steps;

  // Get active steps for kick and snare
  const kickActive = new Set<number>();
  const snareActive = new Set<number>();

  region.notes.forEach(note => {
    const step = Math.floor(note.startTime / stepDuration);
    if (note.pitch === 36) kickActive.add(step);
    if (note.pitch === 38) snareActive.add(step);
  });

  return (
    <div className="flex gap-px h-full">
      {Array.from({ length: steps }, (_, i) => (
        <div key={i} className="flex-1 flex flex-col gap-px">
          <div
            className={`flex-1 rounded-sm ${kickActive.has(i) ? 'bg-[#ef4444]' : 'bg-[#3a3a3c]/30'}`}
          />
          <div
            className={`flex-1 rounded-sm ${snareActive.has(i) ? 'bg-[#f97316]' : 'bg-[#3a3a3c]/30'}`}
          />
        </div>
      ))}
    </div>
  );
}
