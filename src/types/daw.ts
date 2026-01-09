/**
 * DAW Types - Full-featured Digital Audio Workstation type definitions
 * Inspired by Logic Pro
 */

// ============================================
// Audio Types
// ============================================

export type TrackType = 'audio' | 'midi' | 'software-instrument' | 'drummer' | 'bus' | 'master' | 'folder';

export interface AudioRegion {
  id: string;
  name: string;
  trackId: string;
  startTime: number; // in beats
  duration: number; // in beats
  offset: number; // start offset within the audio file
  audioUrl?: string;
  color: string;
  muted: boolean;
  looped: boolean;
  loopLength?: number;
  gain: number;
  fadeIn: number;
  fadeOut: number;
}

export interface MidiNote {
  id: string;
  pitch: number; // 0-127 MIDI note
  velocity: number; // 0-127
  startTime: number; // in beats (relative to region start)
  duration: number; // in beats
}

export interface MidiRegion {
  id: string;
  name: string;
  trackId: string;
  startTime: number; // in beats
  duration: number; // in beats
  color: string;
  muted: boolean;
  looped: boolean;
  loopLength?: number;
  notes: MidiNote[];
  quantize: QuantizeValue;
}

export type Region = AudioRegion | MidiRegion;

export type QuantizeValue = 'off' | '1/4' | '1/8' | '1/16' | '1/32' | '1/64' | '1/4T' | '1/8T' | '1/16T';

// ============================================
// Track Types
// ============================================

export interface TrackInsert {
  id: string;
  pluginId: string;
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface TrackSend {
  id: string;
  busId: string;
  amount: number; // 0-1
  preFader: boolean;
}

export type StackType = 'folder' | 'summing'; // Folder Stack vs Summing Stack (like Logic Pro)

export interface DAWTrack {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  height: number; // pixels
  volume: number; // 0-1 (maps to -inf to +6dB)
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  armed: boolean; // record armed
  frozen: boolean;
  input: string; // input source ID
  output: string; // output destination ID (bus or master)
  recordingMode: 'replace' | 'overdub' | 'merge';
  inserts: TrackInsert[];
  sends: TrackSend[];
  regions: string[]; // region IDs
  automationLanes: AutomationLane[];
  showAutomation: boolean;
  instrumentId?: string; // for software instrument tracks
  // Track grouping (folder tracks / track stacks)
  groupId?: string; // ID of parent folder track
  isCollapsed?: boolean; // For folder tracks only
  stackType?: StackType; // For folder tracks: 'folder' (no audio sum) or 'summing' (audio routes through stack)
}

// ============================================
// Automation Types
// ============================================

export type AutomationParameter = 'volume' | 'pan' | 'mute' | 'send' | 'plugin';

export type CurveType = 'linear' | 'exponential' | 'logarithmic' | 'step' | 's-curve';

export interface AutomationPoint {
  id: string;
  time: number; // in beats
  value: number; // 0-1 normalized
  curve: CurveType;
}

export interface AutomationLane {
  id: string;
  parameter: AutomationParameter;
  pluginId?: string;
  parameterName?: string;
  points: AutomationPoint[];
  enabled: boolean;
  visible: boolean;
}

// ============================================
// Mixer Types
// ============================================

export interface Bus {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  inserts: TrackInsert[];
  sends: TrackSend[];
  output: string; // destination bus or 'master'
}

export interface MasterChannel {
  volume: number;
  pan: number;
  inserts: TrackInsert[];
  limiterEnabled: boolean;
  limiterThreshold: number;
}

// ============================================
// Plugin Types
// ============================================

export type PluginCategory = 'eq' | 'compressor' | 'reverb' | 'delay' | 'distortion' | 'modulation' | 'utility' | 'instrument' | 'sampler' | 'synth';

export interface PluginDefinition {
  id: string;
  name: string;
  category: PluginCategory;
  type: 'effect' | 'instrument';
  parameters: PluginParameterDefinition[];
  presets: PluginPreset[];
}

export interface PluginParameterDefinition {
  id: string;
  name: string;
  min: number;
  max: number;
  default: number;
  unit: string;
  type: 'continuous' | 'stepped' | 'boolean';
  steps?: number[];
}

export interface PluginPreset {
  id: string;
  name: string;
  values: Record<string, number>;
}

// ============================================
// Transport Types
// ============================================

export type TimeSignature = [number, number]; // [numerator, denominator]

export interface Marker {
  id: string;
  name: string;
  time: number; // in beats
  color: string;
}

export interface TempoChange {
  id: string;
  time: number; // in beats
  bpm: number;
  curve: 'step' | 'linear' | 'smooth';
}

export interface LoopRegion {
  enabled: boolean;
  start: number; // in beats
  end: number; // in beats
}

// ============================================
// Project Types
// ============================================

export interface DAWProject {
  id: string;
  name: string;
  version: string;
  createdAt: number;
  updatedAt: number;

  // Transport
  bpm: number;
  timeSignature: TimeSignature;
  key: string; // e.g., "C Major", "A Minor"
  sampleRate: number;
  bitDepth: number;

  // Tempo & Time
  tempoChanges: TempoChange[];
  markers: Marker[];

  // Content
  tracks: DAWTrack[];
  regions: Record<string, Region>;
  buses: Bus[];
  master: MasterChannel;

  // Loop
  loop: LoopRegion;

  // View State
  viewState: ViewState;
}

// ============================================
// View State Types
// ============================================

export interface ViewState {
  // Timeline
  horizontalZoom: number; // pixels per beat
  verticalZoom: number;
  scrollX: number;
  scrollY: number;

  // Panels
  showLibrary: boolean;
  showInspector: boolean;
  showMixer: boolean;
  showPianoRoll: boolean;
  showTempoTrack: boolean;

  // Selection
  selectedTrackIds: string[];
  selectedRegionIds: string[];
  selectedNoteIds: string[];

  // Editor
  activeEditorTrackId: string | null;
  activeEditorRegionId: string | null;

  // Grid
  snapEnabled: boolean;
  snapValue: QuantizeValue;

  // Tool
  activeTool: Tool;
}

export type Tool = 'pointer' | 'pencil' | 'scissors' | 'glue' | 'eraser' | 'zoom' | 'mute' | 'automation';

// ============================================
// Action Types (for store)
// ============================================

export interface DAWState {
  // Project
  project: DAWProject | null;
  isModified: boolean;

  // Transport State
  isPlaying: boolean;
  isRecording: boolean;
  playheadPosition: number; // in beats

  // Audio State
  isInitialized: boolean;
  isLoading: boolean;
  audioContextState: 'suspended' | 'running' | 'closed';

  // Metronome
  metronomeEnabled: boolean;
  metronomeVolume: number;
  countIn: number; // bars

  // UI State
  view: ViewState;
}

// ============================================
// Helper Functions
// ============================================

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const beatsToTime = (beats: number, bpm: number) => (beats / bpm) * 60;
export const timeToBeats = (time: number, bpm: number) => (time / 60) * bpm;

export const beatsToMeasures = (beats: number, timeSignature: TimeSignature) => {
  const beatsPerMeasure = timeSignature[0] * (4 / timeSignature[1]);
  return beats / beatsPerMeasure;
};

export const measureToBeats = (measure: number, timeSignature: TimeSignature) => {
  const beatsPerMeasure = timeSignature[0] * (4 / timeSignature[1]);
  return measure * beatsPerMeasure;
};

export const formatTime = (beats: number, bpm: number, timeSignature: TimeSignature): string => {
  const beatsPerMeasure = timeSignature[0] * (4 / timeSignature[1]);
  const measure = Math.floor(beats / beatsPerMeasure) + 1;
  const beat = Math.floor(beats % beatsPerMeasure) + 1;
  const subdivision = Math.floor((beats % 1) * 4) + 1;
  return `${measure}.${beat}.${subdivision}`;
};

export const midiNoteToName = (note: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  return `${notes[note % 12]}${octave}`;
};

export const nameToMidiNote = (name: string): number => {
  const match = name.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60;
  const notes: Record<string, number> = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
  return notes[match[1]] + (parseInt(match[2]) + 1) * 12;
};

// Default colors for tracks
export const TRACK_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

export const getRandomColor = () => TRACK_COLORS[Math.floor(Math.random() * TRACK_COLORS.length)];
