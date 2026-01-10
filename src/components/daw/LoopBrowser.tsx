/**
 * Apple Loops-style Loop Browser
 * Features: Column browser, tempo/key matching, favorites, waveform preview
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDAWStore } from '../../store/dawStore';

// Loop data types
interface Loop {
  id: string;
  name: string;
  category: LoopCategory;
  genre: string;
  instrument: string;
  mood: string;
  bpm: number;
  key: string;
  bars: number;
  beats: number;
  favorite: boolean;
  tags: string[];
  waveformData: number[]; // Normalized 0-1 values for mini waveform
  audioUrl?: string; // Optional audio file URL
}

type LoopCategory = 'drums' | 'bass' | 'synth' | 'guitar' | 'keys' | 'vocals' | 'fx' | 'percussion' | 'strings' | 'brass';

// Sample loop data - loops use existing samples for demo playback
// In a production app, these would have dedicated loop audio files
const SAMPLE_LOOPS: Loop[] = [
  // Drums - using kick samples for demo playback
  { id: 'drum-1', name: 'Classic Rock Beat', category: 'drums', genre: 'Rock', instrument: 'Drum Kit', mood: 'Driving', bpm: 120, key: '-', bars: 4, beats: 16, favorite: true, tags: ['acoustic', 'live'], waveformData: generateWaveform(), audioUrl: '/samples/kick-acoustic01.mp3' },
  { id: 'drum-2', name: 'Funk Groove 01', category: 'drums', genre: 'Funk', instrument: 'Drum Kit', mood: 'Groovy', bpm: 110, key: '-', bars: 4, beats: 16, favorite: false, tags: ['funky', 'tight'], waveformData: generateWaveform(), audioUrl: '/samples/kick-vinyl01.mp3' },
  { id: 'drum-3', name: 'Hip Hop Beat Heavy', category: 'drums', genre: 'Hip Hop', instrument: 'Drum Machine', mood: 'Dark', bpm: 90, key: '-', bars: 4, beats: 16, favorite: true, tags: ['heavy', '808'], waveformData: generateWaveform(), audioUrl: '/samples/kick-808.mp3' },
  { id: 'drum-4', name: 'EDM Drop Kit', category: 'drums', genre: 'Electronic', instrument: 'Drum Machine', mood: 'Intense', bpm: 128, key: '-', bars: 8, beats: 32, favorite: false, tags: ['festival', 'big'], waveformData: generateWaveform(), audioUrl: '/samples/kick-electro01.mp3' },
  { id: 'drum-5', name: 'Jazz Brush Swing', category: 'drums', genre: 'Jazz', instrument: 'Drum Kit', mood: 'Relaxed', bpm: 140, key: '-', bars: 4, beats: 16, favorite: false, tags: ['brush', 'swing'], waveformData: generateWaveform(), audioUrl: '/samples/snare-acoustic01.mp3' },
  { id: 'drum-6', name: 'Lo-Fi Dusty Beat', category: 'drums', genre: 'Lo-Fi', instrument: 'Drum Machine', mood: 'Chill', bpm: 85, key: '-', bars: 4, beats: 16, favorite: true, tags: ['vinyl', 'chill'], waveformData: generateWaveform(), audioUrl: '/samples/kick-vinyl01.mp3' },
  { id: 'drum-7', name: 'Reggae One Drop', category: 'drums', genre: 'Reggae', instrument: 'Drum Kit', mood: 'Relaxed', bpm: 75, key: '-', bars: 4, beats: 16, favorite: false, tags: ['one-drop', 'laid-back'], waveformData: generateWaveform(), audioUrl: '/samples/kick-deep.mp3' },
  { id: 'drum-8', name: 'Trap Hi-Hats', category: 'drums', genre: 'Trap', instrument: 'Drum Machine', mood: 'Energetic', bpm: 140, key: '-', bars: 4, beats: 16, favorite: false, tags: ['triplet', 'rolls'], waveformData: generateWaveform(), audioUrl: '/samples/hihat-808.mp3' },

  // Bass - using kick samples as bass placeholders
  { id: 'bass-1', name: 'Funky Slap Bass', category: 'bass', genre: 'Funk', instrument: 'Electric Bass', mood: 'Groovy', bpm: 110, key: 'E', bars: 4, beats: 16, favorite: true, tags: ['slap', 'funk'], waveformData: generateWaveform(), audioUrl: '/samples/kick-deep.mp3' },
  { id: 'bass-2', name: 'Sub Bass 808', category: 'bass', genre: 'Hip Hop', instrument: 'Synth Bass', mood: 'Dark', bpm: 90, key: 'F', bars: 4, beats: 16, favorite: false, tags: ['sub', '808'], waveformData: generateWaveform(), audioUrl: '/samples/kick-808.mp3' },
  { id: 'bass-3', name: 'Rock Bass Riff', category: 'bass', genre: 'Rock', instrument: 'Electric Bass', mood: 'Driving', bpm: 120, key: 'A', bars: 4, beats: 16, favorite: false, tags: ['picked', 'rock'], waveformData: generateWaveform(), audioUrl: '/samples/kick-heavy.mp3' },
  { id: 'bass-4', name: 'Reggae Bass Line', category: 'bass', genre: 'Reggae', instrument: 'Electric Bass', mood: 'Relaxed', bpm: 75, key: 'G', bars: 4, beats: 16, favorite: false, tags: ['dub', 'deep'], waveformData: generateWaveform(), audioUrl: '/samples/kick-deep.mp3' },
  { id: 'bass-5', name: 'Dubstep Wobble', category: 'bass', genre: 'Electronic', instrument: 'Synth Bass', mood: 'Intense', bpm: 140, key: 'D', bars: 4, beats: 16, favorite: true, tags: ['wobble', 'dirty'], waveformData: generateWaveform(), audioUrl: '/samples/kick-electro01.mp3' },
  { id: 'bass-6', name: 'Acid Bass Line', category: 'bass', genre: 'Electronic', instrument: 'Synth Bass', mood: 'Hypnotic', bpm: 130, key: 'C', bars: 8, beats: 32, favorite: false, tags: ['303', 'acid'], waveformData: generateWaveform(), audioUrl: '/samples/kick-808.mp3' },

  // Synths - no audio samples available, placeholder
  { id: 'synth-1', name: 'Ambient Pad', category: 'synth', genre: 'Ambient', instrument: 'Synthesizer', mood: 'Dreamy', bpm: 80, key: 'C', bars: 8, beats: 32, favorite: true, tags: ['lush', 'reverb'], waveformData: generateWaveform() },
  { id: 'synth-2', name: 'Retro Arp', category: 'synth', genre: 'Synthwave', instrument: 'Synthesizer', mood: 'Nostalgic', bpm: 118, key: 'Am', bars: 4, beats: 16, favorite: false, tags: ['80s', 'arp'], waveformData: generateWaveform() },
  { id: 'synth-3', name: 'EDM Lead', category: 'synth', genre: 'Electronic', instrument: 'Synthesizer', mood: 'Energetic', bpm: 128, key: 'F', bars: 4, beats: 16, favorite: true, tags: ['lead', 'festival'], waveformData: generateWaveform() },
  { id: 'synth-4', name: 'Chill Chord Stabs', category: 'synth', genre: 'Lo-Fi', instrument: 'Synthesizer', mood: 'Chill', bpm: 85, key: 'Dm', bars: 4, beats: 16, favorite: false, tags: ['chords', 'warm'], waveformData: generateWaveform() },
  { id: 'synth-5', name: 'Trance Supersaw', category: 'synth', genre: 'Trance', instrument: 'Synthesizer', mood: 'Euphoric', bpm: 138, key: 'A', bars: 8, beats: 32, favorite: false, tags: ['supersaw', 'uplifting'], waveformData: generateWaveform() },

  // Guitar - no audio samples available, placeholder
  { id: 'guitar-1', name: 'Acoustic Strum', category: 'guitar', genre: 'Pop', instrument: 'Acoustic Guitar', mood: 'Happy', bpm: 100, key: 'G', bars: 4, beats: 16, favorite: false, tags: ['strumming', 'bright'], waveformData: generateWaveform() },
  { id: 'guitar-2', name: 'Clean Funk Chops', category: 'guitar', genre: 'Funk', instrument: 'Electric Guitar', mood: 'Groovy', bpm: 110, key: 'E', bars: 4, beats: 16, favorite: true, tags: ['funky', 'clean'], waveformData: generateWaveform() },
  { id: 'guitar-3', name: 'Distorted Power Chords', category: 'guitar', genre: 'Rock', instrument: 'Electric Guitar', mood: 'Intense', bpm: 140, key: 'E', bars: 4, beats: 16, favorite: false, tags: ['distortion', 'power'], waveformData: generateWaveform() },
  { id: 'guitar-4', name: 'Reggae Skank', category: 'guitar', genre: 'Reggae', instrument: 'Electric Guitar', mood: 'Relaxed', bpm: 75, key: 'Bb', bars: 4, beats: 16, favorite: false, tags: ['skank', 'clean'], waveformData: generateWaveform() },

  // Keys - no audio samples available, placeholder
  { id: 'keys-1', name: 'Rhodes Chords', category: 'keys', genre: 'Soul', instrument: 'Electric Piano', mood: 'Warm', bpm: 95, key: 'Dm', bars: 4, beats: 16, favorite: true, tags: ['rhodes', 'soulful'], waveformData: generateWaveform() },
  { id: 'keys-2', name: 'Piano Ballad', category: 'keys', genre: 'Pop', instrument: 'Piano', mood: 'Emotional', bpm: 70, key: 'C', bars: 8, beats: 32, favorite: false, tags: ['ballad', 'expressive'], waveformData: generateWaveform() },
  { id: 'keys-3', name: 'Organ Gospel', category: 'keys', genre: 'Gospel', instrument: 'Organ', mood: 'Uplifting', bpm: 100, key: 'G', bars: 4, beats: 16, favorite: false, tags: ['organ', 'gospel'], waveformData: generateWaveform() },
  { id: 'keys-4', name: 'Clavinet Funk', category: 'keys', genre: 'Funk', instrument: 'Clavinet', mood: 'Groovy', bpm: 115, key: 'E', bars: 4, beats: 16, favorite: true, tags: ['clavinet', 'funky'], waveformData: generateWaveform() },

  // Vocals - no audio samples available, placeholder
  { id: 'vocal-1', name: 'Vocal Chops Pop', category: 'vocals', genre: 'Pop', instrument: 'Vocals', mood: 'Happy', bpm: 120, key: 'C', bars: 4, beats: 16, favorite: false, tags: ['chops', 'bright'], waveformData: generateWaveform() },
  { id: 'vocal-2', name: 'Vocal Ad-Libs', category: 'vocals', genre: 'Hip Hop', instrument: 'Vocals', mood: 'Energetic', bpm: 90, key: '-', bars: 2, beats: 8, favorite: false, tags: ['ad-libs', 'hype'], waveformData: generateWaveform() },
  { id: 'vocal-3', name: 'Ethereal Vocal Pad', category: 'vocals', genre: 'Ambient', instrument: 'Vocals', mood: 'Dreamy', bpm: 80, key: 'D', bars: 8, beats: 32, favorite: true, tags: ['ethereal', 'reverb'], waveformData: generateWaveform() },

  // FX - using crash samples for impacts
  { id: 'fx-1', name: 'Riser Build Up', category: 'fx', genre: 'Electronic', instrument: 'FX', mood: 'Intense', bpm: 128, key: '-', bars: 4, beats: 16, favorite: true, tags: ['riser', 'build'], waveformData: generateWaveform(), audioUrl: '/samples/crash-808.mp3' },
  { id: 'fx-2', name: 'Impact Hit', category: 'fx', genre: 'Cinematic', instrument: 'FX', mood: 'Dark', bpm: 120, key: '-', bars: 1, beats: 4, favorite: false, tags: ['impact', 'hit'], waveformData: generateWaveform(), audioUrl: '/samples/crash-noise.mp3' },
  { id: 'fx-3', name: 'White Noise Sweep', category: 'fx', genre: 'Electronic', instrument: 'FX', mood: 'Energetic', bpm: 128, key: '-', bars: 2, beats: 8, favorite: false, tags: ['noise', 'sweep'], waveformData: generateWaveform(), audioUrl: '/samples/crash-tape.mp3' },
  { id: 'fx-4', name: 'Vinyl Crackle', category: 'fx', genre: 'Lo-Fi', instrument: 'FX', mood: 'Nostalgic', bpm: 85, key: '-', bars: 4, beats: 16, favorite: false, tags: ['vinyl', 'texture'], waveformData: generateWaveform() },

  // Percussion - using perc/shaker samples
  { id: 'perc-1', name: 'Conga Pattern', category: 'percussion', genre: 'Latin', instrument: 'Congas', mood: 'Groovy', bpm: 100, key: '-', bars: 4, beats: 16, favorite: false, tags: ['conga', 'latin'], waveformData: generateWaveform(), audioUrl: '/samples/perc-tribal.mp3' },
  { id: 'perc-2', name: 'Shaker Loop', category: 'percussion', genre: 'Pop', instrument: 'Shaker', mood: 'Light', bpm: 120, key: '-', bars: 2, beats: 8, favorite: false, tags: ['shaker', 'steady'], waveformData: generateWaveform(), audioUrl: '/samples/shaker-analog.mp3' },
  { id: 'perc-3', name: 'Bongo Fills', category: 'percussion', genre: 'World', instrument: 'Bongos', mood: 'Energetic', bpm: 110, key: '-', bars: 4, beats: 16, favorite: true, tags: ['bongo', 'fills'], waveformData: generateWaveform(), audioUrl: '/samples/perc-808.mp3' },
];

// Generate fake waveform data
function generateWaveform(): number[] {
  const points = 50;
  const data: number[] = [];
  for (let i = 0; i < points; i++) {
    // Create more realistic waveform with some structure
    const base = 0.3 + Math.random() * 0.4;
    const transient = Math.random() > 0.85 ? 0.3 : 0;
    data.push(Math.min(1, base + transient));
  }
  return data;
}

// Get unique values from loops for column browser
const getUniqueValues = (loops: Loop[], key: keyof Loop): string[] => {
  const values = new Set<string>();
  loops.forEach(loop => {
    const value = loop[key];
    if (typeof value === 'string' && value !== '-') {
      values.add(value);
    }
  });
  return Array.from(values).sort();
};

// Category icons
const CATEGORY_ICONS: Record<LoopCategory, string> = {
  drums: '🥁',
  bass: '🎸',
  synth: '🎹',
  guitar: '🎸',
  keys: '🎹',
  vocals: '🎤',
  fx: '✨',
  percussion: '🪘',
  strings: '🎻',
  brass: '🎺',
};

// Mood colors
const MOOD_COLORS: Record<string, string> = {
  'Driving': '#ff453a',
  'Groovy': '#ff9500',
  'Dark': '#5856d6',
  'Intense': '#ff2d55',
  'Relaxed': '#30d158',
  'Chill': '#64d2ff',
  'Dreamy': '#bf5af2',
  'Nostalgic': '#ff9f0a',
  'Energetic': '#ff375f',
  'Happy': '#ffd60a',
  'Emotional': '#5e5ce6',
  'Warm': '#ff9500',
  'Uplifting': '#30d158',
  'Euphoric': '#bf5af2',
  'Light': '#64d2ff',
  'Hypnotic': '#5856d6',
};

interface LoopBrowserProps {
  compact?: boolean;
}

export function LoopBrowser({ compact = false }: LoopBrowserProps) {
  const { project } = useDAWStore();
  const [loops, setLoops] = useState<Loop[]>(SAMPLE_LOOPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedLoop, setSelectedLoop] = useState<Loop | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewingLoopId, setPreviewingLoopId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'bpm' | 'key' | 'bars'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<'column' | 'list'>('column');

  const previewOscillator = useRef<OscillatorNode | null>(null);
  const previewSource = useRef<AudioBufferSourceNode | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const loadedBuffers = useRef<Map<string, AudioBuffer>>(new Map());

  // Get all unique values for filters
  const genres = getUniqueValues(loops, 'genre');
  const instruments = getUniqueValues(loops, 'instrument');
  const moods = getUniqueValues(loops, 'mood');

  // Filter loops
  const filteredLoops = loops.filter(loop => {
    if (searchQuery && !loop.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !loop.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }
    if (showFavoritesOnly && !loop.favorite) return false;
    if (selectedGenre && loop.genre !== selectedGenre) return false;
    if (selectedInstrument && loop.instrument !== selectedInstrument) return false;
    if (selectedMood && loop.mood !== selectedMood) return false;
    return true;
  });

  // Sort loops
  const sortedLoops = [...filteredLoops].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'bpm':
        comparison = a.bpm - b.bpm;
        break;
      case 'key':
        comparison = a.key.localeCompare(b.key);
        break;
      case 'bars':
        comparison = a.bars - b.bars;
        break;
    }
    return sortAsc ? comparison : -comparison;
  });

  // Check if loop tempo matches project
  const tempoMatches = (loopBpm: number) => {
    if (!project) return false;
    const projectBpm = project.bpm;
    // Allow within 10% or double/half time
    return Math.abs(loopBpm - projectBpm) <= projectBpm * 0.1 ||
           Math.abs(loopBpm - projectBpm * 2) <= projectBpm * 0.1 ||
           Math.abs(loopBpm - projectBpm / 2) <= projectBpm * 0.1;
  };

  // Toggle favorite
  const toggleFavorite = (loopId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoops(loops.map(loop =>
      loop.id === loopId ? { ...loop, favorite: !loop.favorite } : loop
    ));
  };

  // Preview loop - plays actual audio file if available, otherwise oscillator tone
  const previewLoop = useCallback(async (loop: Loop) => {
    if (!audioContext.current) {
      audioContext.current = new AudioContext();
    }

    // Stop any existing preview
    if (previewOscillator.current) {
      previewOscillator.current.stop();
      previewOscillator.current = null;
    }
    if (previewSource.current) {
      previewSource.current.stop();
      previewSource.current = null;
    }

    if (previewingLoopId === loop.id) {
      setPreviewingLoopId(null);
      setIsPreviewPlaying(false);
      return;
    }

    const ctx = audioContext.current;
    setPreviewingLoopId(loop.id);
    setIsPreviewPlaying(true);

    // If loop has an audio URL, load and play it
    if (loop.audioUrl) {
      try {
        let buffer = loadedBuffers.current.get(loop.audioUrl);

        if (!buffer) {
          const response = await fetch(loop.audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          buffer = await ctx.decodeAudioData(arrayBuffer);
          loadedBuffers.current.set(loop.audioUrl, buffer);
        }

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = buffer;
        gain.gain.value = 0.5;

        source.connect(gain);
        gain.connect(ctx.destination);

        source.start();
        previewSource.current = source;

        source.onended = () => {
          setPreviewingLoopId(null);
          setIsPreviewPlaying(false);
          previewSource.current = null;
        };

        return;
      } catch {
        // Fall through to oscillator fallback
      }
    }

    // Fallback: Create a simple preview sound based on loop properties
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Different sound based on category
    switch (loop.category) {
      case 'bass':
        osc.type = 'sawtooth';
        osc.frequency.value = 80;
        break;
      case 'synth':
        osc.type = 'square';
        osc.frequency.value = 440;
        break;
      case 'keys':
        osc.type = 'sine';
        osc.frequency.value = 330;
        break;
      default:
        osc.type = 'triangle';
        osc.frequency.value = 200;
    }

    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1);

    previewOscillator.current = osc;

    setTimeout(() => {
      setPreviewingLoopId(null);
      setIsPreviewPlaying(false);
    }, 1000);
  }, [previewingLoopId]);

  // Clear filters
  const clearFilters = () => {
    setSelectedGenre(null);
    setSelectedInstrument(null);
    setSelectedMood(null);
    setSearchQuery('');
    setShowFavoritesOnly(false);
  };

  // Handle sort column click
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  // Mini waveform component
  const MiniWaveform = ({ data, playing }: { data: number[]; playing: boolean }) => (
    <div className="flex items-center h-4 gap-px">
      {data.slice(0, 25).map((value, i) => (
        <div
          key={i}
          className={`w-0.5 rounded-sm transition-colors ${
            playing ? 'bg-[#30d158]' : 'bg-[#636366]'
          }`}
          style={{ height: `${value * 100}%` }}
        />
      ))}
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-[#1c1c1e] ${compact ? '' : 'border-l border-[#3a3a3c]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3a3a3c]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#30d158]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
          </svg>
          <span className="text-xs font-medium text-white">Loop Browser</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('column')}
            className={`p-1 rounded ${viewMode === 'column' ? 'bg-[#3a3a3c] text-white' : 'text-[#98989d] hover:text-white'}`}
            title="Column View"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 5v14h18V5H3zm8 12H5V7h6v10zm8 0h-6V7h6v10z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded ${viewMode === 'list' ? 'bg-[#3a3a3c] text-white' : 'text-[#98989d] hover:text-white'}`}
            title="List View"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="px-2 py-2 border-b border-[#3a3a3c] space-y-2">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#98989d]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search loops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-[#2c2c2e] text-white text-xs rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff] placeholder-[#636366]"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
              showFavoritesOnly
                ? 'bg-[#ff9500] text-white'
                : 'bg-[#3a3a3c] text-[#98989d] hover:text-white'
            }`}
          >
            {showFavoritesOnly ? '★' : '☆'} Favorites
          </button>
          {project && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#2c2c2e] text-[#98989d]">
              Project: {project.bpm} BPM
            </span>
          )}
          {(selectedGenre || selectedInstrument || selectedMood) && (
            <button
              onClick={clearFilters}
              className="px-2 py-0.5 text-[10px] rounded-full bg-[#ff453a] text-white"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'column' && (
          <>
            {/* Column Browser */}
            <div className="flex border-r border-[#3a3a3c] min-w-0" style={{ width: '40%', minWidth: 180 }}>
              {/* Genre Column */}
              <div className="flex-1 flex flex-col border-r border-[#3a3a3c] min-w-0">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[#636366] bg-[#2c2c2e] border-b border-[#3a3a3c]">
                  Genre
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div
                    onClick={() => setSelectedGenre(null)}
                    className={`px-2 py-1 text-xs cursor-pointer ${
                      !selectedGenre ? 'bg-[#0a84ff] text-white' : 'text-[#98989d] hover:bg-[#3a3a3c]'
                    }`}
                  >
                    All
                  </div>
                  {genres.map(genre => (
                    <div
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className={`px-2 py-1 text-xs cursor-pointer truncate ${
                        selectedGenre === genre ? 'bg-[#0a84ff] text-white' : 'text-white hover:bg-[#3a3a3c]'
                      }`}
                    >
                      {genre}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instrument Column */}
              <div className="flex-1 flex flex-col border-r border-[#3a3a3c] min-w-0">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[#636366] bg-[#2c2c2e] border-b border-[#3a3a3c]">
                  Instrument
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div
                    onClick={() => setSelectedInstrument(null)}
                    className={`px-2 py-1 text-xs cursor-pointer ${
                      !selectedInstrument ? 'bg-[#0a84ff] text-white' : 'text-[#98989d] hover:bg-[#3a3a3c]'
                    }`}
                  >
                    All
                  </div>
                  {instruments.map(inst => (
                    <div
                      key={inst}
                      onClick={() => setSelectedInstrument(inst)}
                      className={`px-2 py-1 text-xs cursor-pointer truncate ${
                        selectedInstrument === inst ? 'bg-[#0a84ff] text-white' : 'text-white hover:bg-[#3a3a3c]'
                      }`}
                    >
                      {inst}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mood Column */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[#636366] bg-[#2c2c2e] border-b border-[#3a3a3c]">
                  Mood
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div
                    onClick={() => setSelectedMood(null)}
                    className={`px-2 py-1 text-xs cursor-pointer ${
                      !selectedMood ? 'bg-[#0a84ff] text-white' : 'text-[#98989d] hover:bg-[#3a3a3c]'
                    }`}
                  >
                    All
                  </div>
                  {moods.map(mood => (
                    <div
                      key={mood}
                      onClick={() => setSelectedMood(mood)}
                      className={`px-2 py-1 text-xs cursor-pointer flex items-center gap-1 ${
                        selectedMood === mood ? 'bg-[#0a84ff] text-white' : 'text-white hover:bg-[#3a3a3c]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: MOOD_COLORS[mood] || '#636366' }}
                      />
                      <span className="truncate">{mood}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loop List */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* List Header */}
          <div className="flex items-center px-2 py-1 bg-[#2c2c2e] border-b border-[#3a3a3c] text-[10px] uppercase tracking-wider text-[#636366]">
            <div className="w-6" /> {/* Favorite */}
            <div className="w-6" /> {/* Category icon */}
            <div
              className="flex-1 cursor-pointer hover:text-white"
              onClick={() => handleSort('name')}
            >
              Name {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
            </div>
            <div
              className="w-14 text-center cursor-pointer hover:text-white"
              onClick={() => handleSort('bpm')}
            >
              BPM {sortBy === 'bpm' && (sortAsc ? '↑' : '↓')}
            </div>
            <div
              className="w-10 text-center cursor-pointer hover:text-white"
              onClick={() => handleSort('key')}
            >
              Key {sortBy === 'key' && (sortAsc ? '↑' : '↓')}
            </div>
            <div
              className="w-12 text-center cursor-pointer hover:text-white"
              onClick={() => handleSort('bars')}
            >
              Bars {sortBy === 'bars' && (sortAsc ? '↑' : '↓')}
            </div>
            <div className="w-16" /> {/* Waveform */}
          </div>

          {/* Loop Items */}
          <div className="flex-1 overflow-y-auto">
            {sortedLoops.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#636366] text-xs">
                No loops match your filters
              </div>
            ) : (
              sortedLoops.map(loop => (
                <div
                  key={loop.id}
                  onClick={() => setSelectedLoop(loop)}
                  onDoubleClick={() => previewLoop(loop)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('loop', JSON.stringify(loop));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className={`flex items-center px-2 py-1.5 cursor-pointer border-b border-[#2c2c2e] ${
                    selectedLoop?.id === loop.id
                      ? 'bg-[#0a84ff]/20'
                      : 'hover:bg-[#3a3a3c]/50'
                  }`}
                >
                  {/* Favorite */}
                  <button
                    onClick={(e) => toggleFavorite(loop.id, e)}
                    className="w-6 text-center"
                  >
                    <span className={loop.favorite ? 'text-[#ff9500]' : 'text-[#636366] hover:text-[#ff9500]'}>
                      {loop.favorite ? '★' : '☆'}
                    </span>
                  </button>

                  {/* Category Icon */}
                  <div className="w-6 text-center text-sm">
                    {CATEGORY_ICONS[loop.category]}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{loop.name}</div>
                    <div className="text-[10px] text-[#636366] truncate">
                      {loop.genre} • {loop.mood}
                    </div>
                  </div>

                  {/* BPM with tempo match indicator */}
                  <div className="w-14 text-center">
                    <span className={`text-xs ${tempoMatches(loop.bpm) ? 'text-[#30d158]' : 'text-white'}`}>
                      {loop.bpm}
                    </span>
                    {tempoMatches(loop.bpm) && (
                      <span className="text-[8px] text-[#30d158] ml-0.5">●</span>
                    )}
                  </div>

                  {/* Key */}
                  <div className="w-10 text-center text-xs text-[#98989d]">
                    {loop.key}
                  </div>

                  {/* Bars */}
                  <div className="w-12 text-center text-xs text-[#98989d]">
                    {loop.bars}
                  </div>

                  {/* Mini Waveform */}
                  <div className="w-16">
                    <MiniWaveform
                      data={loop.waveformData}
                      playing={previewingLoopId === loop.id}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Loop Details / Preview */}
      {selectedLoop && (
        <div className="border-t border-[#3a3a3c] bg-[#2c2c2e] p-3">
          <div className="flex items-start gap-3">
            {/* Loop Icon */}
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#30d158] to-[#0a84ff] flex items-center justify-center text-2xl">
              {CATEGORY_ICONS[selectedLoop.category]}
            </div>

            {/* Loop Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{selectedLoop.name}</div>
              <div className="text-xs text-[#98989d] mt-0.5">
                {selectedLoop.genre} • {selectedLoop.instrument} • {selectedLoop.mood}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#636366]">
                <span>{selectedLoop.bpm} BPM</span>
                <span>Key: {selectedLoop.key}</span>
                <span>{selectedLoop.bars} bars</span>
                <span>{selectedLoop.beats} beats</span>
              </div>
              {/* Tags */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {selectedLoop.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-[9px] rounded bg-[#3a3a3c] text-[#98989d]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview Button */}
            <button
              onClick={() => previewLoop(selectedLoop)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                previewingLoopId === selectedLoop.id
                  ? 'bg-[#30d158] text-white'
                  : 'bg-[#3a3a3c] text-white hover:bg-[#4a4a4c]'
              }`}
            >
              {previewingLoopId === selectedLoop.id ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Waveform Preview */}
          <div className="mt-3 h-8 bg-[#1c1c1e] rounded flex items-center px-2 gap-px">
            {selectedLoop.waveformData.map((value, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-colors ${
                  previewingLoopId === selectedLoop.id ? 'bg-[#30d158]' : 'bg-[#636366]'
                }`}
                style={{ height: `${value * 100}%` }}
              />
            ))}
          </div>

          {/* Tempo Match Info */}
          {project && tempoMatches(selectedLoop.bpm) && (
            <div className="mt-2 px-2 py-1 rounded bg-[#30d158]/20 text-[10px] text-[#30d158] flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Tempo matches project ({project.bpm} BPM)
            </div>
          )}

          {/* Drag hint */}
          <div className="mt-2 text-[10px] text-[#636366] text-center">
            Drag to arrangement to add • Double-click to preview
          </div>
        </div>
      )}
    </div>
  );
}

// Export a header component for use with the library
export function LoopBrowserHeader() {
  return (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-[#30d158]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
      </svg>
      <span className="text-xs font-medium text-white">Apple Loops</span>
    </div>
  );
}
