/**
 * Beat Bot Pro - Types
 * Professional drum machine type definitions
 */

// Step with velocity control
export interface Step {
  active: boolean;
  velocity: number; // 0-1, default 0.8
}

// Per-track effects
export interface TrackEffects {
  reverb: number; // 0-1 wet/dry
  delay: number; // 0-1 wet/dry
  delayTime: number; // 0.1-2.0 seconds
  distortion: number; // 0-1 amount
}

// Default effects
export const DEFAULT_EFFECTS: TrackEffects = {
  reverb: 0,
  delay: 0,
  delayTime: 0.3,
  distortion: 0,
};

// Track definition
export interface Track {
  id: string;
  name: string;
  sampleUrl: string;
  sequence: Step[];
  volume: number;
  pan: number; // -1 to 1
  pitch: number; // semitones, -12 to 12
  muted: boolean;
  solo: boolean;
  effects: TrackEffects;
}

// Drum kit definition
export interface DrumKit {
  id: string;
  name: string;
  category: "electronic" | "acoustic" | "lofi" | "world";
  color: string; // UI accent color
  tracks: {
    name: string;
    sampleUrl: string;
    defaultVolume: number;
  }[];
}

// Pattern (saveable sequence state)
export interface Pattern {
  id: string;
  name: string;
  length: 8 | 16 | 32 | 64;
  kitId: string;
  tracks: {
    trackId: string;
    sampleUrl: string;
    name: string;
    sequence: Step[];
    volume: number;
    pan: number;
    pitch: number;
    muted: boolean;
    effects: TrackEffects;
  }[];
}

// Full project
export interface Project {
  id: string;
  name: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  swing: number;
  masterVolume: number;
  kitId: string;
  patterns: Pattern[];
  currentPatternId: string;
}

// Sequencer state
export interface SequencerState {
  // Current kit
  currentKitId: string;

  // Tracks
  tracks: Track[];

  // Patterns
  patterns: Pattern[];
  currentPatternId: string;
  patternLength: 8 | 16 | 32 | 64;

  // Transport
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  swing: number;

  // Master
  masterVolume: number;

  // Loading state
  isLoading: boolean;
  isInitialized: boolean;

  // History for undo/redo
  historyIndex: number;
}

export interface SequencerActions {
  // Initialization
  init: () => Promise<void>;

  // Transport
  play: () => void;
  stop: () => void;
  togglePlay: () => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setCurrentStep: (step: number) => void;

  // Track actions
  toggleStep: (trackId: string, step: number) => void;
  setStepVelocity: (trackId: string, step: number, velocity: number) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackPan: (trackId: string, pan: number) => void;
  setTrackPitch: (trackId: string, pitch: number) => void;
  toggleMute: (trackId: string) => void;
  toggleSolo: (trackId: string) => void;
  clearTrack: (trackId: string) => void;
  setTrackEffect: (
    trackId: string,
    effect: keyof TrackEffects,
    value: number
  ) => void;

  // Kit actions
  switchKit: (kitId: string) => Promise<void>;

  // Pattern actions
  createPattern: (name?: string) => void;
  deletePattern: (patternId: string) => void;
  switchPattern: (patternId: string) => void;
  duplicatePattern: (patternId: string) => void;
  setPatternLength: (length: 8 | 16 | 32 | 64) => void;
  renamePattern: (patternId: string, name: string) => void;

  // Master controls
  setMasterVolume: (volume: number) => void;

  // Pattern operations
  clearAll: () => void;
  randomize: () => void;
  loadPreset: (preset: any) => void;

  // Project persistence
  saveProject: (name: string) => Promise<string>;
  loadProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  getProjects: () => Promise<{ id: string; name: string; updatedAt: number }[]>;
  exportProject: () => string;
  importProject: (json: string) => Promise<void>;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type SequencerStore = SequencerState & SequencerActions;

// Helper to create empty step
export const createEmptyStep = (): Step => ({
  active: false,
  velocity: 0.8,
});

// Helper to create step array
export const createEmptySequence = (length: number): Step[] =>
  Array.from({ length }, createEmptyStep);

// Helper to convert boolean sequence to Step sequence (migration)
export const migrateSequence = (booleanSeq: boolean[]): Step[] =>
  booleanSeq.map((active) => ({ active, velocity: 0.8 }));
