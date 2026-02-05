/**
 * Drummer Editor - Logic Pro-style AI-assisted drum pattern generator
 */

import { useState, useCallback, useEffect } from 'react';
import { useDAWStore } from '../../store/dawStore';
import type { MidiNote, MidiRegion } from '../../types/daw';

// Drummer styles/genres
const DRUMMER_STYLES = [
  { id: 'pop', name: 'Pop', description: 'Clean, punchy grooves' },
  { id: 'rock', name: 'Rock', description: 'Driving, powerful beats' },
  { id: 'hiphop', name: 'Hip Hop', description: 'Trap and boom-bap patterns' },
  { id: 'electronic', name: 'Electronic', description: 'EDM and house rhythms' },
  { id: 'jazz', name: 'Jazz', description: 'Swing and brushes' },
  { id: 'latin', name: 'Latin', description: 'Samba and bossa nova' },
] as const;

// Drum kit pieces with MIDI notes
const DRUM_PIECES = {
  kick: { note: 36, name: 'Kick' },
  snare: { note: 38, name: 'Snare' },
  hihat: { note: 42, name: 'Hi-Hat' },
  openHat: { note: 46, name: 'Open Hat' },
  clap: { note: 39, name: 'Clap' },
  rim: { note: 37, name: 'Rim' },
  tom1: { note: 50, name: 'Tom 1' },
  tom2: { note: 48, name: 'Tom 2' },
  tom3: { note: 45, name: 'Tom 3' },
  crash: { note: 49, name: 'Crash' },
  ride: { note: 51, name: 'Ride' },
} as const;

interface DrummerEditorProps {
  trackId: string;
  regionId?: string;
}

// Pattern generators for different styles
const generatePattern = (
  style: string,
  complexity: number,
  loudness: number,
  swing: number,
  bars: number
): MidiNote[] => {
  const notes: MidiNote[] = [];
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const baseVelocity = Math.round(60 + loudness * 60);

  // Add variation based on complexity
  const addHit = (step: number, piece: keyof typeof DRUM_PIECES, velocityMod = 1) => {
    const swingOffset = step % 2 === 1 ? swing * 0.1 : 0;
    notes.push({
      id: `note_${notes.length}`,
      pitch: DRUM_PIECES[piece].note,
      startTime: step + swingOffset,
      duration: 0.25,
      velocity: Math.min(127, Math.round(baseVelocity * velocityMod)),
    });
  };

  for (let bar = 0; bar < bars; bar++) {
    const barOffset = bar * stepsPerBar;

    switch (style) {
      case 'hiphop':
        // Trap/Hip-hop pattern
        addHit(barOffset, 'kick', 1.2);
        addHit(barOffset + 3, 'kick', 0.8);
        addHit(barOffset + 6, 'kick', 0.9);
        addHit(barOffset + 10, 'kick', 0.85);
        addHit(barOffset + 14, 'kick', 0.7);

        addHit(barOffset + 4, 'snare', 1.1);
        addHit(barOffset + 12, 'snare', 1.1);

        if (complexity > 0.3) {
          addHit(barOffset + 4, 'clap', 0.9);
          addHit(barOffset + 12, 'clap', 0.9);
        }

        // Rolling hi-hats
        for (let i = 0; i < 16; i++) {
          addHit(barOffset + i, 'hihat', 0.6 + Math.random() * 0.3 * complexity);
        }

        // Add open hat at end of phrase
        if (bar % 2 === 1 && complexity > 0.5) {
          addHit(barOffset + 15, 'openHat', 0.9);
        }
        break;

      case 'rock':
        // Standard rock beat
        addHit(barOffset, 'kick', 1.2);
        addHit(barOffset + 8, 'kick', 1.0);
        if (complexity > 0.5) {
          addHit(barOffset + 6, 'kick', 0.7);
        }

        addHit(barOffset + 4, 'snare', 1.1);
        addHit(barOffset + 12, 'snare', 1.1);

        // 8th note hi-hats
        for (let i = 0; i < 16; i += 2) {
          addHit(barOffset + i, 'hihat', 0.7);
        }
        break;

      case 'pop':
        // Pop four-on-floor with variation
        addHit(barOffset, 'kick', 1.2);
        addHit(barOffset + 4, 'kick', 1.0);
        addHit(barOffset + 8, 'kick', 1.0);
        addHit(barOffset + 12, 'kick', 1.0);

        addHit(barOffset + 4, 'snare', 1.0);
        addHit(barOffset + 12, 'snare', 1.0);

        // Offbeat hi-hats
        for (let i = 2; i < 16; i += 4) {
          addHit(barOffset + i, 'hihat', 0.7);
        }
        break;

      case 'electronic':
        // Four-on-floor EDM
        addHit(barOffset, 'kick', 1.3);
        addHit(barOffset + 4, 'kick', 1.2);
        addHit(barOffset + 8, 'kick', 1.2);
        addHit(barOffset + 12, 'kick', 1.2);

        // Clap on 2 and 4
        addHit(barOffset + 4, 'clap', 1.0);
        addHit(barOffset + 12, 'clap', 1.0);

        // 16th note hi-hats
        for (let i = 0; i < 16; i++) {
          addHit(barOffset + i, 'hihat', 0.5 + (i % 4 === 0 ? 0.3 : 0));
        }

        // Open hat every 8 steps
        if (complexity > 0.4) {
          addHit(barOffset + 2, 'openHat', 0.7);
          addHit(barOffset + 10, 'openHat', 0.7);
        }
        break;

      case 'jazz':
        // Jazz swing pattern (simplified)
        addHit(barOffset, 'kick', 0.6);
        if (complexity > 0.5) addHit(barOffset + 7, 'kick', 0.4);

        addHit(barOffset + 4, 'snare', 0.5);
        addHit(barOffset + 12, 'snare', 0.5);

        // Ride pattern with swing
        for (let i = 0; i < 16; i += 4) {
          addHit(barOffset + i, 'ride', 0.6);
          addHit(barOffset + i + 3, 'ride', 0.4); // swung 8th
        }
        break;

      case 'latin':
      default:
        // Bossa nova inspired
        addHit(barOffset, 'kick', 0.8);
        addHit(barOffset + 6, 'kick', 0.6);
        addHit(barOffset + 10, 'kick', 0.7);

        addHit(barOffset + 3, 'rim', 0.6);
        addHit(barOffset + 7, 'rim', 0.5);
        addHit(barOffset + 10, 'rim', 0.6);
        addHit(barOffset + 13, 'rim', 0.5);

        // Light hi-hats
        for (let i = 0; i < 16; i += 2) {
          addHit(barOffset + i, 'hihat', 0.4);
        }
        break;
    }

    // Add fills based on complexity at end of 4-bar phrase
    if (bar % 4 === 3 && complexity > 0.6) {
      addHit(barOffset + 14, 'tom1', 0.8);
      addHit(barOffset + 14.5, 'tom2', 0.7);
      addHit(barOffset + 15, 'tom3', 0.8);
      addHit(barOffset + 15.5, 'crash', 0.9);
    }
  }

  return notes;
};

export const DrummerEditor: React.FC<DrummerEditorProps> = ({ trackId, regionId }) => {
  const { project, addRegion, deleteRegion } = useDAWStore();

  const [style, setStyle] = useState('hiphop');
  const [complexity, setComplexity] = useState(0.5);
  const [loudness, setLoudness] = useState(0.7);
  const [swing, setSwing] = useState(0);
  const [bars, setBars] = useState(4);

  const track = project?.tracks.find(t => t.id === trackId);
  const region = regionId ? project?.regions[regionId] as MidiRegion : null;

  const generateDrums = useCallback(() => {
    if (!track || !project) return;

    const notes = generatePattern(style, complexity, loudness, swing, bars);
    const startTime = region?.startTime ?? 0;

    // Delete existing region if updating
    if (region && regionId) {
      deleteRegion(regionId);
    }

    // Create new region
    const newRegion: MidiRegion = {
      id: `drummer_${Date.now()}`,
      name: `${DRUMMER_STYLES.find(s => s.id === style)?.name || 'Drums'} Pattern`,
      trackId,
      startTime,
      duration: bars * 4,
      color: track.color,
      muted: false,
      looped: false,
      notes,
      quantize: '1/16',
    };
    addRegion(newRegion);
  }, [track, project, style, complexity, loudness, swing, bars, region, regionId, deleteRegion, addRegion]);

  if (!track) return null;

  return (
    <div className="p-4 bg-[#2d2d2d] border-t border-[#3d3d3d]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Drummer</h3>
        <button
          onClick={generateDrums}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
        >
          Generate Pattern
        </button>
      </div>

      {/* Style Selection */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-2">Style</label>
        <div className="grid grid-cols-3 gap-2">
          {DRUMMER_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`p-2 text-xs rounded border transition-colors ${
                style === s.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-[#1a1a1a] border-[#3d3d3d] text-gray-300 hover:border-gray-500'
              }`}
              title={s.description}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* XY Pad for Complexity/Loudness */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-2">Pattern Character</label>
        <div
          className="relative w-full h-32 bg-[#1a1a1a] border border-[#3d3d3d] rounded cursor-crosshair"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1 - (e.clientY - rect.top) / rect.height;
            setComplexity(Math.max(0, Math.min(1, x)));
            setLoudness(Math.max(0, Math.min(1, y)));
          }}
        >
          {/* Axis labels */}
          <span className="absolute left-1 bottom-1 text-[10px] text-gray-500">Simple</span>
          <span className="absolute right-1 bottom-1 text-[10px] text-gray-500">Complex</span>
          <span className="absolute left-1 top-1 text-[10px] text-gray-500">Loud</span>
          <span className="absolute left-1 bottom-8 text-[10px] text-gray-500 -rotate-90 origin-left">Soft</span>

          {/* Crosshair position */}
          <div
            className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${complexity * 100}%`,
              top: `${(1 - loudness) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Swing Control */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Swing</label>
          <span className="text-xs text-gray-500">{Math.round(swing * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={swing}
          onChange={(e) => setSwing(parseFloat(e.target.value))}
          className="w-full h-1 bg-[#3d3d3d] rounded appearance-none cursor-pointer"
        />
      </div>

      {/* Length Control */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Length</label>
          <span className="text-xs text-gray-500">{bars} bars</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 4, 8].map(b => (
            <button
              key={b}
              onClick={() => setBars(b)}
              className={`flex-1 py-1 text-xs rounded ${
                bars === b
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Current settings display */}
      <div className="text-[10px] text-gray-500 border-t border-[#3d3d3d] pt-2">
        Complexity: {Math.round(complexity * 100)}% |
        Loudness: {Math.round(loudness * 100)}% |
        Swing: {Math.round(swing * 100)}%
      </div>
    </div>
  );
};

export default DrummerEditor;
