/**
 * DAW Store - Zustand state management for the full DAW
 */

import { create } from 'zustand';
import type {
  DAWState,
  DAWProject,
  DAWTrack,
  Region,
  MidiRegion,
  AudioRegion,
  MidiNote,
  ViewState,
  Tool,
  QuantizeValue,
  Bus,
  Marker,
  TimeSignature,
  AutomationPoint,
  TrackInsert,
  TrackSend,
  CurveType,
} from '../types/daw';
import { generateId, getRandomColor, TRACK_COLORS } from '../types/daw';
import { dawAudioEngine, dawScheduler } from '../audio/DAWAudioEngine';
import { importMidiFile as parseMidiFile } from '../audio/midiImport';
import { midiInputService, type RecordedMidiNote } from '../audio/MidiInput';

// History for undo/redo
const MAX_HISTORY_SIZE = 50;
let undoStack: DAWProject[] = [];
let redoStack: DAWProject[] = [];

// Clipboard for copy/paste
let clipboard: Region[] = [];

// Helper to save state to undo stack
const saveToHistory = (project: DAWProject | null) => {
  if (!project) return;
  undoStack.push(JSON.parse(JSON.stringify(project)));
  if (undoStack.length > MAX_HISTORY_SIZE) {
    undoStack.shift();
  }
  redoStack = []; // Clear redo stack on new action
};

// Default view state
const defaultViewState: ViewState = {
  horizontalZoom: 40,
  verticalZoom: 1,
  scrollX: 0,
  scrollY: 0,
  showLibrary: true,
  showInspector: true,
  showMixer: true,
  showPianoRoll: false,
  showTempoTrack: false,
  selectedTrackIds: [],
  selectedRegionIds: [],
  selectedNoteIds: [],
  activeEditorTrackId: null,
  activeEditorRegionId: null,
  snapEnabled: true,
  snapValue: '1/16',
  activeTool: 'pointer',
};

// Create empty project
const createEmptyProject = (): DAWProject => ({
  id: generateId(),
  name: 'Untitled',
  version: '1.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  bpm: 120,
  timeSignature: [4, 4],
  key: 'C Major',
  sampleRate: 48000,
  bitDepth: 24,
  tempoChanges: [],
  markers: [],
  tracks: [],
  regions: {},
  buses: [],
  master: {
    volume: 0.8,
    pan: 0,
    inserts: [],
    limiterEnabled: true,
    limiterThreshold: -0.3,
  },
  loop: {
    enabled: false,
    start: 0,
    end: 16,
  },
  viewState: { ...defaultViewState },
});

// Create default track
const createDefaultTrack = (type: DAWTrack['type'], name: string, index: number): DAWTrack => {
  const trackId = generateId();

  // Audio tracks get default Channel EQ and Compressor inserts (like Logic Pro)
  const defaultInserts: TrackInsert[] = type === 'audio' ? [
    {
      id: `${trackId}_eq`,
      pluginId: 'channel-eq',
      enabled: true,
      parameters: { lowGain: 0, midGain: 0, highGain: 0 },
    },
    {
      id: `${trackId}_comp`,
      pluginId: 'compressor',
      enabled: true,
      parameters: { threshold: -20, ratio: 4, attack: 10, release: 100 },
    },
  ] : [];

  return {
    id: trackId,
    name,
    type,
    color: TRACK_COLORS[index % TRACK_COLORS.length],
    height: 80,
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    armed: false,
    frozen: false,
    input: 'none',
    output: 'master',
    recordingMode: 'replace',
    inserts: defaultInserts,
    sends: [],
    regions: [],
    automationLanes: [
      {
        id: `${trackId}_vol`,
        parameter: 'volume' as const,
        enabled: true,
        visible: true,
        points: [],
      },
      {
        id: `${trackId}_pan`,
        parameter: 'pan' as const,
        enabled: true,
        visible: true,
        points: [],
      },
    ],
    showAutomation: false,
    instrumentId: type === 'software-instrument' ? 'retro-synth' : undefined,
  };
};

interface DAWActions {
  // Initialization
  init: () => Promise<void>;

  // Project
  newProject: () => void;
  loadProject: (project: DAWProject) => void;
  saveProject: () => DAWProject | null;
  setProjectName: (name: string) => void;

  // Transport
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  setPlayheadPosition: (position: number) => void;
  setBpm: (bpm: number) => void;
  setTimeSignature: (timeSignature: TimeSignature) => void;
  toggleLoop: () => void;
  setLoopRegion: (start: number, end: number) => void;
  setKey: (key: string) => void;
  toggleMetronome: () => void;
  setMetronomeVolume: (volume: number) => void;
  setCountIn: (bars: number) => void;
  toggleRecording: () => void;

  // Tracks
  addTrack: (type: DAWTrack['type'], name?: string) => string;
  deleteTrack: (trackId: string) => void;
  duplicateTrack: (trackId: string) => void;
  setTrackName: (trackId: string, name: string) => void;
  setTrackColor: (trackId: string, color: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackPan: (trackId: string, pan: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleTrackArm: (trackId: string) => void;
  setTrackHeight: (trackId: string, height: number) => void;
  setTrackInput: (trackId: string, input: string) => void;
  setTrackOutput: (trackId: string, output: string) => void;
  setTrackRecordingMode: (trackId: string, mode: 'replace' | 'overdub' | 'merge') => void;
  setTrackInstrument: (trackId: string, instrumentId: string) => void;
  reorderTracks: (trackIds: string[]) => void;
  toggleTrackAutomation: (trackId: string) => void;
  addAutomationPoint: (trackId: string, laneId: string, time: number, value: number) => void;
  updateAutomationPoint: (trackId: string, laneId: string, pointId: string, time: number, value: number) => void;
  deleteAutomationPoint: (trackId: string, laneId: string, pointId: string) => void;
  setAutomationPointCurve: (trackId: string, laneId: string, pointId: string, curve: CurveType) => void;
  setAutomationLanePoints: (trackId: string, laneId: string, points: AutomationPoint[]) => void;

  // Track Grouping (Folder Tracks)
  createFolderTrack: (name?: string) => string;
  moveTracksToFolder: (trackIds: string[], folderId: string | null) => void;
  toggleFolderCollapsed: (folderId: string) => void;
  groupSelectedTracksIntoFolder: () => void;
  ungroupFolder: (folderId: string) => void;
  setStackType: (folderId: string, stackType: 'folder' | 'summing') => void;

  // Track Inserts (Effects)
  addTrackInsert: (trackId: string, pluginId: string, index?: number) => void;
  removeTrackInsert: (trackId: string, insertIndex: number) => void;
  setInsertEnabled: (trackId: string, insertIndex: number, enabled: boolean) => void;
  setInsertParameter: (trackId: string, insertIndex: number, paramId: string, value: number) => void;

  freezeTrack: (trackId: string) => void;
  unfreezeTrack: (trackId: string) => void;
  bounceTrack: (trackId: string) => void;

  // Regions
  addRegion: (region: Region) => void;
  deleteRegion: (regionId: string) => void;
  moveRegion: (regionId: string, newTrackId: string, newStartTime: number) => void;
  resizeRegion: (regionId: string, newDuration: number, edge: 'start' | 'end') => void;
  splitRegion: (regionId: string, splitTime: number) => void;
  duplicateRegion: (regionId: string) => void;
  mergeRegions: (regionIds: string[]) => void;
  setRegionMute: (regionId: string, muted: boolean) => void;
  setRegionLoop: (regionId: string, looped: boolean, loopLength?: number) => void;
  updateRegionFade: (regionId: string, fadeType: 'fadeIn' | 'fadeOut', value: number) => void;

  // MIDI Notes
  addNote: (regionId: string, note: MidiNote) => void;
  deleteNote: (regionId: string, noteId: string) => void;
  updateNote: (regionId: string, noteId: string, updates: Partial<MidiNote>) => void;
  quantizeNotes: (regionId: string, value: QuantizeValue) => void;
  transposeNotes: (regionId: string, semitones: number, noteIds?: string[]) => void;
  humanizeNotes: (regionId: string, amount: number, noteIds?: string[]) => void;
  scaleVelocity: (regionId: string, factor: number, noteIds?: string[]) => void;

  // MIDI Import
  importMidiFile: (file: File, trackId?: string) => Promise<void>;

  // Tempo
  addTempoChange: (time: number, bpm: number, curve?: 'step' | 'linear' | 'smooth') => void;
  updateTempoChange: (id: string, updates: Partial<{ time: number; bpm: number; curve: 'step' | 'linear' | 'smooth' }>) => void;
  deleteTempoChange: (id: string) => void;
  toggleTempoTrack: () => void;

  // Markers
  addMarker: (name: string, time: number) => void;
  deleteMarker: (markerId: string) => void;
  updateMarker: (markerId: string, updates: Partial<Marker>) => void;

  // Buses
  addBus: (name?: string) => string;
  deleteBus: (busId: string) => void;
  setBusVolume: (busId: string, volume: number) => void;
  setBusPan: (busId: string, pan: number) => void;
  toggleBusMute: (busId: string) => void;
  toggleBusSolo: (busId: string) => void;

  // Sends
  addTrackSend: (trackId: string, busId: string) => void;
  removeTrackSend: (trackId: string, sendId: string) => void;
  setSendAmount: (trackId: string, sendId: string, amount: number) => void;
  setSendPreFader: (trackId: string, sendId: string, preFader: boolean) => void;

  // Master
  setMasterVolume: (volume: number) => void;

  // Synth Parameters (for Smart Controls)
  setSynthCutoff: (trackId: string, value: number) => void;
  setSynthResonance: (trackId: string, value: number) => void;
  setSynthAttack: (trackId: string, value: number) => void;
  setSynthDecay: (trackId: string, value: number) => void;
  setSynthSustain: (trackId: string, value: number) => void;
  setSynthRelease: (trackId: string, value: number) => void;
  setSynthDrive: (trackId: string, value: number) => void;
  setSynthMix: (trackId: string, value: number) => void;
  setSynthOscillator: (trackId: string, type: OscillatorType) => void;

  // View
  setHorizontalZoom: (zoom: number) => void;
  setVerticalZoom: (zoom: number) => void;
  setScroll: (x: number, y: number) => void;
  toggleLibrary: () => void;
  toggleInspector: () => void;
  toggleMixer: () => void;
  togglePianoRoll: () => void;
  setActiveTool: (tool: Tool) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapValue: (value: QuantizeValue) => void;

  // Selection
  selectTrack: (trackId: string, addToSelection?: boolean) => void;
  selectRegion: (regionId: string, addToSelection?: boolean) => void;
  selectNote: (noteId: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Editor
  openEditor: (trackId: string, regionId: string) => void;
  closeEditor: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Clipboard
  copyRegions: (regionIds?: string[]) => void;
  cutRegions: (regionIds?: string[]) => void;
  pasteRegions: (trackId?: string, startTime?: number) => void;
  hasClipboard: () => boolean;
}

type DAWStore = DAWState & DAWActions;

// Setup scheduler state accessor
const setupScheduler = () => {
  dawScheduler.setStateAccessor(
    () => {
      const state = useDAWStore.getState();
      return {
        project: state.project,
        playheadPosition: state.playheadPosition,
        isPlaying: state.isPlaying,
        metronomeEnabled: state.metronomeEnabled,
      };
    },
    (position: number) => {
      useDAWStore.setState({ playheadPosition: position });
    }
  );
};

export const useDAWStore = create<DAWStore>((set, get) => ({
  // Initial state
  project: null,
  isModified: false,
  isPlaying: false,
  isRecording: false,
  playheadPosition: 0,
  isInitialized: false,
  isLoading: false,
  audioContextState: 'suspended',
  metronomeEnabled: true,
  metronomeVolume: 0.5,
  countIn: 0,
  view: { ...defaultViewState },

  // Initialization
  init: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      await dawAudioEngine.init();

      // Create a new empty project with some default tracks
      const project = createEmptyProject();

      // Add default tracks
      const audioTrack = createDefaultTrack('audio', 'Audio 1', 0);
      const midiTrack = createDefaultTrack('software-instrument', 'Inst 1', 1);
      const drumTrack = createDefaultTrack('drummer', 'Drums', 2);

      project.tracks = [audioTrack, midiTrack, drumTrack];

      // Create track processors
      project.tracks.forEach(track => {
        dawAudioEngine.createTrackProcessor(track);
      });

      // Create a simple 2-bar trap beat for testing at 140 BPM
      project.bpm = 140;

      // Full trap drum pattern - 2 bars with hi-hat rolls and variations
      const trapDrumNotes: MidiNote[] = [
        // === BAR 1 ===
        // Kicks - syncopated trap pattern
        { id: generateId(), pitch: 36, velocity: 115, startTime: 0, duration: 0.25 },
        { id: generateId(), pitch: 36, velocity: 100, startTime: 1.75, duration: 0.25 },
        { id: generateId(), pitch: 36, velocity: 108, startTime: 2.5, duration: 0.25 },
        { id: generateId(), pitch: 36, velocity: 95, startTime: 3.25, duration: 0.25 },

        // === BAR 2 ===
        // Kicks
        { id: generateId(), pitch: 36, velocity: 115, startTime: 4, duration: 0.25 },
        { id: generateId(), pitch: 36, velocity: 98, startTime: 5.5, duration: 0.25 },
        { id: generateId(), pitch: 36, velocity: 105, startTime: 6, duration: 0.25 },
        { id: generateId(), pitch: 36, velocity: 92, startTime: 7.25, duration: 0.25 },

        // Snares/Claps on 2 and 4 of each bar
        { id: generateId(), pitch: 38, velocity: 105, startTime: 1, duration: 0.25 },
        { id: generateId(), pitch: 38, velocity: 110, startTime: 3, duration: 0.25 },
        { id: generateId(), pitch: 38, velocity: 105, startTime: 5, duration: 0.25 },
        { id: generateId(), pitch: 38, velocity: 110, startTime: 7, duration: 0.25 },

        // Hi-hats - 16th notes with velocity variation and rolls
        // Bar 1: Standard 16th pattern with accents
        { id: generateId(), pitch: 42, velocity: 85, startTime: 0, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 0.25, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 0.5, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 0.75, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 80, startTime: 1, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 1.25, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 1.5, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 1.75, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 85, startTime: 2, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 2.25, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 2.5, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 2.75, duration: 0.0625 },
        // Hi-hat roll at end of bar 1 (32nd notes)
        { id: generateId(), pitch: 42, velocity: 75, startTime: 3, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 60, startTime: 3.125, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 3.25, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 3.375, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 80, startTime: 3.5, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 65, startTime: 3.625, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 90, startTime: 3.75, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 3.875, duration: 0.0625 },

        // Bar 2: 16th pattern with triplet feel roll
        { id: generateId(), pitch: 42, velocity: 85, startTime: 4, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 4.25, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 4.5, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 4.75, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 80, startTime: 5, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 5.25, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 5.5, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 5.75, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 85, startTime: 6, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 6.25, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 6.5, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 55, startTime: 6.75, duration: 0.0625 },
        // Final hi-hat triplet roll into open hat
        { id: generateId(), pitch: 42, velocity: 75, startTime: 7, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 60, startTime: 7.167, duration: 0.0625 },
        { id: generateId(), pitch: 42, velocity: 70, startTime: 7.333, duration: 0.0625 },
        { id: generateId(), pitch: 46, velocity: 90, startTime: 7.5, duration: 0.25 }, // Open hat

        // Additional percussion - 808 cowbell on offbeats
        { id: generateId(), pitch: 56, velocity: 65, startTime: 0.5, duration: 0.125 },
        { id: generateId(), pitch: 56, velocity: 60, startTime: 2.5, duration: 0.125 },
        { id: generateId(), pitch: 56, velocity: 65, startTime: 4.5, duration: 0.125 },
        { id: generateId(), pitch: 56, velocity: 60, startTime: 6.5, duration: 0.125 },
      ];

      const demoDrumRegion: MidiRegion = {
        id: generateId(),
        name: 'Trap Drums',
        trackId: drumTrack.id,
        startTime: 0,
        duration: 8, // 2 bars
        color: drumTrack.color,
        muted: false,
        looped: false,
        notes: trapDrumNotes,
        quantize: '1/16' as const,
      };

      drumTrack.regions.push(demoDrumRegion.id);
      project.regions[demoDrumRegion.id] = demoDrumRegion;

      // Simple 808 bass on Inst track
      const bass808Region: MidiRegion = {
        id: generateId(),
        name: 'Trap 808',
        trackId: midiTrack.id,
        startTime: 0,
        duration: 8,
        color: midiTrack.color,
        muted: false,
        looped: false,
        notes: [
          { id: generateId(), pitch: 36, velocity: 110, startTime: 0, duration: 1.5 },
          { id: generateId(), pitch: 36, velocity: 100, startTime: 2, duration: 1.5 },
          { id: generateId(), pitch: 38, velocity: 105, startTime: 4, duration: 1.5 },
          { id: generateId(), pitch: 36, velocity: 100, startTime: 6, duration: 1.5 },
        ],
        quantize: '1/16' as const,
      };

      midiTrack.regions.push(bass808Region.id);
      project.regions[bass808Region.id] = bass808Region;

      // Enable loop for 2-bar pattern
      project.loop.enabled = true;
      project.loop.start = 0;
      project.loop.end = 8;

      set({
        project,
        isInitialized: true,
        isLoading: false,
        audioContextState: 'running',
        view: project.viewState,
      });
    } catch (error) {
      console.error('Failed to initialize DAW:', error);
      set({ isLoading: false });
    }
  },

  // Project actions
  newProject: () => {
    const project = createEmptyProject();
    const audioTrack = createDefaultTrack('audio', 'Audio 1', 0);
    const midiTrack = createDefaultTrack('software-instrument', 'Inst 1', 1);
    project.tracks = [audioTrack, midiTrack];

    set({
      project,
      isModified: false,
      isPlaying: false,
      isRecording: false,
      playheadPosition: 0,
      view: project.viewState,
    });
  },

  loadProject: (project) => {
    // Create track processors
    project.tracks.forEach(track => {
      dawAudioEngine.createTrackProcessor(track);
    });

    set({
      project,
      isModified: false,
      isPlaying: false,
      isRecording: false,
      playheadPosition: 0,
      view: project.viewState,
    });
  },

  saveProject: () => {
    const state = get();
    if (!state.project) return null;

    const project = {
      ...state.project,
      updatedAt: Date.now(),
      viewState: state.view,
    };

    set({ isModified: false });
    return project;
  },

  setProjectName: (name) => {
    set(state => ({
      project: state.project ? { ...state.project, name } : null,
      isModified: true,
    }));
  },

  // Transport
  play: () => {
    const state = get();
    if (!state.project || state.isPlaying) return;

    // Ensure scheduler is set up
    setupScheduler();

    // Resume audio context if suspended (Chrome autoplay policy)
    const startPlayback = () => {
      set({ isPlaying: true });
      dawScheduler.start();
    };

    if (dawAudioEngine.context?.state === 'suspended') {
      dawAudioEngine.context.resume().then(startPlayback);
    } else {
      startPlayback();
    }
  },

  pause: () => {
    dawScheduler.stop();
    set({ isPlaying: false });
  },

  stop: () => {
    dawScheduler.stop();
    set({ isPlaying: false, isRecording: false, playheadPosition: 0 });
  },

  togglePlay: () => {
    const state = get();
    if (state.isPlaying) {
      state.pause();
    } else {
      state.play();
    }
  },

  setPlayheadPosition: (position) => {
    set({ playheadPosition: Math.max(0, position) });
  },

  setBpm: (bpm) => {
    set(state => ({
      project: state.project
        ? { ...state.project, bpm: Math.max(20, Math.min(300, bpm)) }
        : null,
      isModified: true,
    }));
  },

  setTimeSignature: (timeSignature) => {
    set(state => ({
      project: state.project ? { ...state.project, timeSignature } : null,
      isModified: true,
    }));
  },

  toggleLoop: () => {
    set(state => ({
      project: state.project
        ? { ...state.project, loop: { ...state.project.loop, enabled: !state.project.loop.enabled } }
        : null,
    }));
  },

  setLoopRegion: (start, end) => {
    set(state => ({
      project: state.project
        ? { ...state.project, loop: { ...state.project.loop, start, end } }
        : null,
    }));
  },

  setKey: (key) => {
    set(state => ({
      project: state.project ? { ...state.project, key } : null,
      isModified: true,
    }));
  },

  toggleMetronome: () => {
    set(state => {
      const enabled = !state.metronomeEnabled;
      dawAudioEngine.setMetronomeEnabled(enabled);
      return { metronomeEnabled: enabled };
    });
  },

  setMetronomeVolume: (volume) => {
    dawAudioEngine.setMetronomeVolume(volume);
    set({ metronomeVolume: volume });
  },

  setCountIn: (bars) => {
    set({ countIn: bars });
  },

  toggleRecording: async () => {
    const state = get();

    if (state.isRecording) {
      // Stop recording
      const armedTrack = state.project?.tracks.find(t => t.armed);
      const isMidiTrack = armedTrack?.type === 'software-instrument' || armedTrack?.type === 'midi';

      if (isMidiTrack && state.project) {
        // Stop MIDI recording
        const recordedNotes = midiInputService.stopRecording();

        if (recordedNotes.length > 0 && armedTrack) {
          const regionId = generateId();
          const bpm = state.project.bpm;
          const beatsPerSecond = bpm / 60;

          // Convert recorded notes to MIDI notes
          const midiNotes: MidiNote[] = recordedNotes.map((rn: RecordedMidiNote, idx: number) => ({
            id: `${regionId}_note_${idx}`,
            pitch: rn.note,
            velocity: rn.velocity,
            startTime: rn.startTime * beatsPerSecond,
            duration: rn.duration * beatsPerSecond,
          }));

          // Calculate region duration
          const maxEndTime = Math.max(...midiNotes.map(n => n.startTime + n.duration));
          const regionDuration = Math.ceil(maxEndTime / 4) * 4; // Round to nearest 4 beats

          const newRegion: MidiRegion = {
            id: regionId,
            name: `Recording ${new Date().toLocaleTimeString()}`,
            trackId: armedTrack.id,
            startTime: state.playheadPosition,
            duration: Math.max(regionDuration, 4),
            muted: false,
            looped: false,
            color: armedTrack.color,
            notes: midiNotes,
            quantize: '1/16',
          };

          saveToHistory(state.project);
          set(s => ({
            project: s.project ? {
              ...s.project,
              regions: { ...s.project.regions, [regionId]: newRegion },
              tracks: s.project.tracks.map(t =>
                t.id === armedTrack.id
                  ? { ...t, regions: [...t.regions, regionId] }
                  : t
              ),
            } : null,
            isRecording: false,
            isModified: true,
          }));
        } else {
          set({ isRecording: false });
        }
      } else {
        // Stop audio recording
        const result = dawAudioEngine.stopRecording();

        if (result && state.project) {
          const { url: audioUrl, durationSeconds } = result;
          const audioArmedTrack = state.project.tracks.find(t => t.armed && t.type === 'audio');
          const targetTrack = audioArmedTrack || state.project.tracks.find(t => t.type === 'audio');

          if (targetTrack) {
            const regionId = generateId();
            const bpm = state.project.bpm;
            const beatsPerSecond = bpm / 60;
            const durationInBeats = durationSeconds * beatsPerSecond;

            const newRegion: AudioRegion = {
              id: regionId,
              name: `Recording ${new Date().toLocaleTimeString()}`,
              trackId: targetTrack.id,
              startTime: state.playheadPosition,
              duration: durationInBeats,
              offset: 0,
              muted: false,
              looped: false,
              color: targetTrack.color,
              audioUrl, // Use URL from stopRecording - buffer already stored
              gain: 1,
              fadeIn: 0,
              fadeOut: 0,
            };

            saveToHistory(state.project);
            set(s => ({
              project: s.project ? {
                ...s.project,
                regions: { ...s.project.regions, [regionId]: newRegion },
                tracks: s.project.tracks.map(t =>
                  t.id === targetTrack.id
                    ? { ...t, regions: [...t.regions, regionId] }
                    : t
                ),
              } : null,
              isRecording: false,
              isModified: true,
            }));
          } else {
            set({ isRecording: false });
          }
        } else {
          set({ isRecording: false });
        }
      }
    } else {
      // Start recording
      const armedTrack = state.project?.tracks.find(t => t.armed);
      const isMidiTrack = armedTrack?.type === 'software-instrument' || armedTrack?.type === 'midi';

      if (isMidiTrack && armedTrack) {
        // Initialize MIDI input if not already done
        if (!midiInputService.isAvailable()) {
          await midiInputService.init();
          midiInputService.connectToAllDevices();
        }

        midiInputService.startRecording();
        set({ isRecording: true });

        // Also start playback if not already playing
        if (!state.isPlaying) {
          get().togglePlay();
        }
      } else {
        // Audio recording
        const audioArmedTrack = state.project?.tracks.find(t => t.armed && t.type === 'audio');
        const targetTrack = audioArmedTrack || state.project?.tracks.find(t => t.type === 'audio');

        if (targetTrack) {
          const success = await dawAudioEngine.startRecording(targetTrack.id);
          if (success) {
            set({ isRecording: true });
            if (!state.isPlaying) {
              get().togglePlay();
            }
          }
        }
      }
    }
  },

  // Track actions
  addTrack: (type, name) => {
    const state = get();
    if (!state.project) return '';

    saveToHistory(state.project);

    const trackName = name || `${type === 'audio' ? 'Audio' : type === 'software-instrument' ? 'Inst' : 'Track'} ${state.project.tracks.length + 1}`;
    const track = createDefaultTrack(type, trackName, state.project.tracks.length);

    dawAudioEngine.createTrackProcessor(track);

    set(state => ({
      project: state.project
        ? { ...state.project, tracks: [...state.project.tracks, track] }
        : null,
      isModified: true,
    }));

    return track.id;
  },

  deleteTrack: (trackId) => {
    const state = get();
    saveToHistory(state.project);

    dawAudioEngine.removeTrackProcessor(trackId);

    set(state => {
      if (!state.project) return state;

      const track = state.project.tracks.find(t => t.id === trackId);
      if (!track) return state;

      // Remove regions belonging to this track
      const newRegions = { ...state.project.regions };
      track.regions.forEach(regionId => {
        delete newRegions[regionId];
      });

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.filter(t => t.id !== trackId),
          regions: newRegions,
        },
        isModified: true,
        view: {
          ...state.view,
          selectedTrackIds: state.view.selectedTrackIds.filter(id => id !== trackId),
        },
      };
    });
  },

  duplicateTrack: (trackId) => {
    const state = get();
    if (!state.project) return;

    const track = state.project.tracks.find(t => t.id === trackId);
    if (!track) return;

    const newTrack: DAWTrack = {
      ...JSON.parse(JSON.stringify(track)),
      id: generateId(),
      name: `${track.name} Copy`,
      regions: [],
    };

    dawAudioEngine.createTrackProcessor(newTrack);

    // Duplicate regions
    const newRegions: Record<string, Region> = {};
    track.regions.forEach(regionId => {
      const region = state.project!.regions[regionId];
      if (region) {
        const newRegion = {
          ...JSON.parse(JSON.stringify(region)),
          id: generateId(),
          trackId: newTrack.id,
        };
        newRegions[newRegion.id] = newRegion;
        newTrack.regions.push(newRegion.id);
      }
    });

    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: [...state.project.tracks, newTrack],
            regions: { ...state.project.regions, ...newRegions },
          }
        : null,
      isModified: true,
    }));
  },

  setTrackName: (trackId, name) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, name } : t
            ),
          }
        : null,
      isModified: true,
    }));
  },

  setTrackColor: (trackId, color) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, color } : t
            ),
          }
        : null,
      isModified: true,
    }));
  },

  setTrackVolume: (trackId, volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    dawAudioEngine.setTrackVolume(trackId, clampedVolume);

    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, volume: clampedVolume } : t
            ),
          }
        : null,
    }));
  },

  setTrackPan: (trackId, pan) => {
    const clampedPan = Math.max(-1, Math.min(1, pan));
    dawAudioEngine.setTrackPan(trackId, clampedPan);

    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, pan: clampedPan } : t
            ),
          }
        : null,
    }));
  },

  toggleTrackMute: (trackId) => {
    set(state => {
      if (!state.project) return state;

      const track = state.project.tracks.find(t => t.id === trackId);
      if (!track) return state;

      const newMuted = !track.muted;
      dawAudioEngine.setTrackMute(trackId, newMuted);

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId ? { ...t, muted: newMuted } : t
          ),
        },
      };
    });
  },

  toggleTrackSolo: (trackId) => {
    set(state => {
      if (!state.project) return state;

      const track = state.project.tracks.find(t => t.id === trackId);
      if (!track) return state;

      const newSolo = !track.solo;

      // Update mute states based on solo
      const hasSoloTrack = state.project.tracks.some(t =>
        t.id === trackId ? newSolo : t.solo
      );

      state.project.tracks.forEach(t => {
        if (hasSoloTrack) {
          const shouldMute = t.id === trackId ? !newSolo : !t.solo;
          dawAudioEngine.setTrackMute(t.id, shouldMute);
        } else {
          dawAudioEngine.setTrackMute(t.id, t.muted);
        }
      });

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId ? { ...t, solo: newSolo } : t
          ),
        },
      };
    });
  },

  toggleTrackArm: (trackId) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, armed: !t.armed } : t
            ),
          }
        : null,
    }));
  },

  setTrackHeight: (trackId, height) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, height: Math.max(40, Math.min(200, height)) } : t
            ),
          }
        : null,
    }));
  },

  setTrackInput: (trackId, input) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, input } : t
            ),
          }
        : null,
    }));
  },

  setTrackOutput: (trackId, output) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, output } : t
            ),
          }
        : null,
    }));
  },

  setTrackRecordingMode: (trackId, mode) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, recordingMode: mode } : t
            ),
          }
        : null,
    }));
  },

  setTrackInstrument: (trackId, instrumentId) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, instrumentId } : t
            ),
          }
        : null,
    }));
  },

  toggleTrackAutomation: (trackId) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, showAutomation: !t.showAutomation } : t
            ),
          }
        : null,
    }));
  },

  addAutomationPoint: (trackId, laneId, time, value) => {
    set(state => {
      if (!state.project) return state;

      const track = state.project.tracks.find(t => t.id === trackId);
      if (!track) return state;

      const lane = track.automationLanes.find(l => l.id === laneId);
      if (!lane) return state;

      const newPoint = {
        id: `point_${Date.now()}`,
        time,
        value: Math.max(0, Math.min(1, value)),
        curve: 'linear' as const,
      };

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  automationLanes: t.automationLanes.map(l =>
                    l.id === laneId
                      ? { ...l, points: [...l.points, newPoint] }
                      : l
                  ),
                }
              : t
          ),
        },
      };
    });
  },

  updateAutomationPoint: (trackId, laneId, pointId, time, value) => {
    set(state => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  automationLanes: t.automationLanes.map(l =>
                    l.id === laneId
                      ? {
                          ...l,
                          points: l.points.map(p =>
                            p.id === pointId
                              ? { ...p, time, value: Math.max(0, Math.min(1, value)) }
                              : p
                          ),
                        }
                      : l
                  ),
                }
              : t
          ),
        },
        isModified: true,
      };
    });
  },

  deleteAutomationPoint: (trackId, laneId, pointId) => {
    set(state => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  automationLanes: t.automationLanes.map(l =>
                    l.id === laneId
                      ? { ...l, points: l.points.filter(p => p.id !== pointId) }
                      : l
                  ),
                }
              : t
          ),
        },
        isModified: true,
      };
    });
  },

  setAutomationPointCurve: (trackId, laneId, pointId, curve) => {
    set(state => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  automationLanes: t.automationLanes.map(l =>
                    l.id === laneId
                      ? {
                          ...l,
                          points: l.points.map(p =>
                            p.id === pointId ? { ...p, curve } : p
                          ),
                        }
                      : l
                  ),
                }
              : t
          ),
        },
        isModified: true,
      };
    });
  },

  setAutomationLanePoints: (trackId, laneId, points) => {
    set(state => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  automationLanes: t.automationLanes.map(l =>
                    l.id === laneId ? { ...l, points } : l
                  ),
                }
              : t
          ),
        },
        isModified: true,
      };
    });
  },

  // Track Grouping (Folder Tracks)
  createFolderTrack: (name) => {
    const state = get();
    if (!state.project) return '';

    saveToHistory(state.project);

    const folderTrack: DAWTrack = {
      id: generateId(),
      name: name || `Folder ${state.project.tracks.filter(t => t.type === 'folder').length + 1}`,
      type: 'folder',
      color: '#8b5cf6', // Purple for folders
      height: 32,
      volume: 1,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      frozen: false,
      input: '',
      output: 'master',
      recordingMode: 'replace',
      inserts: [],
      sends: [],
      regions: [],
      automationLanes: [],
      showAutomation: false,
      isCollapsed: false,
    };

    set(state => ({
      project: state.project
        ? { ...state.project, tracks: [...state.project.tracks, folderTrack] }
        : null,
      isModified: true,
    }));

    return folderTrack.id;
  },

  moveTracksToFolder: (trackIds, folderId) => {
    const state = get();
    if (!state.project) return;

    saveToHistory(state.project);

    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(track =>
              trackIds.includes(track.id)
                ? { ...track, groupId: folderId || undefined }
                : track
            ),
          }
        : null,
      isModified: true,
    }));
  },

  toggleFolderCollapsed: (folderId) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(track =>
              track.id === folderId && track.type === 'folder'
                ? { ...track, isCollapsed: !track.isCollapsed }
                : track
            ),
          }
        : null,
    }));
  },

  groupSelectedTracksIntoFolder: () => {
    const state = get();
    if (!state.project) return;

    const selectedTrackIds = state.view.selectedTrackIds;
    if (selectedTrackIds.length < 2) return;

    saveToHistory(state.project);

    // Create a new folder track
    const folderTrack: DAWTrack = {
      id: generateId(),
      name: `Folder ${state.project.tracks.filter(t => t.type === 'folder').length + 1}`,
      type: 'folder',
      color: '#8b5cf6',
      height: 32,
      volume: 1,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      frozen: false,
      input: '',
      output: 'master',
      recordingMode: 'replace',
      inserts: [],
      sends: [],
      regions: [],
      automationLanes: [],
      showAutomation: false,
      isCollapsed: false,
    };

    // Find the position of the first selected track
    const firstSelectedIndex = state.project.tracks.findIndex(t => selectedTrackIds.includes(t.id));

    set(state => {
      if (!state.project) return state;

      // Insert folder at the position of first selected track
      const newTracks = [...state.project.tracks];
      newTracks.splice(firstSelectedIndex, 0, folderTrack);

      // Move selected tracks into the folder
      return {
        project: {
          ...state.project,
          tracks: newTracks.map(track =>
            selectedTrackIds.includes(track.id)
              ? { ...track, groupId: folderTrack.id }
              : track
          ),
        },
        isModified: true,
        view: {
          ...state.view,
          selectedTrackIds: [folderTrack.id], // Select the new folder
        },
      };
    });
  },

  ungroupFolder: (folderId) => {
    const state = get();
    if (!state.project) return;

    saveToHistory(state.project);

    set(state => {
      if (!state.project) return state;

      // Remove groupId from all tracks in the folder
      const updatedTracks = state.project.tracks
        .map(track =>
          track.groupId === folderId
            ? { ...track, groupId: undefined }
            : track
        )
        // Remove the folder track itself
        .filter(track => track.id !== folderId);

      return {
        project: {
          ...state.project,
          tracks: updatedTracks,
        },
        isModified: true,
        view: {
          ...state.view,
          selectedTrackIds: state.view.selectedTrackIds.filter(id => id !== folderId),
        },
      };
    });
  },

  setStackType: (folderId, stackType) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(track =>
              track.id === folderId && track.type === 'folder'
                ? { ...track, stackType }
                : track
            ),
          }
        : null,
      isModified: true,
    }));
  },

  // Track Insert (Effect) Management
  addTrackInsert: (trackId, pluginId, index = -1) => {
    const success = dawAudioEngine.addTrackEffect(trackId, pluginId, index);
    if (!success) return;

    set(state => {
      if (!state.project) return state;
      saveToHistory(state.project);

      const newInsert: TrackInsert = {
        id: generateId(),
        pluginId,
        enabled: true,
        parameters: {},
      };

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  inserts: index < 0 || index >= t.inserts.length
                    ? [...t.inserts, newInsert]
                    : [...t.inserts.slice(0, index), newInsert, ...t.inserts.slice(index)],
                }
              : t
          ),
        },
        isModified: true,
      };
    });
  },

  removeTrackInsert: (trackId, insertIndex) => {
    dawAudioEngine.removeTrackEffect(trackId, insertIndex);

    set(state => {
      if (!state.project) return state;
      saveToHistory(state.project);

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  inserts: t.inserts.filter((_, i) => i !== insertIndex),
                }
              : t
          ),
        },
        isModified: true,
      };
    });
  },

  setInsertEnabled: (trackId, insertIndex, enabled) => {
    dawAudioEngine.setTrackEffectEnabled(trackId, insertIndex, enabled);

    set(state => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  inserts: t.inserts.map((insert, i) =>
                    i === insertIndex ? { ...insert, enabled } : insert
                  ),
                }
              : t
          ),
        },
        isModified: true,
      };
    });
  },

  setInsertParameter: (trackId, insertIndex, paramId, value) => {
    dawAudioEngine.setTrackEffectParameter(trackId, insertIndex, paramId, value);

    set(state => {
      if (!state.project) return state;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  inserts: t.inserts.map((insert, i) =>
                    i === insertIndex
                      ? { ...insert, parameters: { ...insert.parameters, [paramId]: value } }
                      : insert
                  ),
                }
              : t
          ),
        },
        isModified: true,
      };
    });
  },

  freezeTrack: async (trackId) => {
    const state = get();
    if (!state.project) return;

    const track = state.project.tracks.find(t => t.id === trackId);
    if (!track) return;

    // Calculate track duration
    let maxEndTime = 0;
    track.regions.forEach(regionId => {
      const region = state.project!.regions[regionId];
      if (region) {
        const endTime = region.startTime + region.duration;
        if (endTime > maxEndTime) maxEndTime = endTime;
      }
    });
    if (maxEndTime === 0) maxEndTime = 16; // Default 4 bars

    try {
      // Actually render the track to audio
      const { url } = await dawAudioEngine.renderTrackToBuffer(
        track,
        state.project,
        maxEndTime
      );

      // Create frozen audio region
      const frozenRegionId = generateId();
      const frozenRegion: AudioRegion = {
        id: frozenRegionId,
        name: `${track.name} (Frozen)`,
        trackId: trackId,
        startTime: 0,
        duration: maxEndTime,
        offset: 0,
        color: track.color,
        muted: false,
        looped: false,
        audioUrl: url,
        gain: 1,
        fadeIn: 0,
        fadeOut: 0,
      };

      set(state => ({
        project: {
          ...state.project!,
          tracks: state.project!.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  frozen: true,
                  armed: false,
                  // Store original regions for unfreeze
                  _originalRegions: t.regions,
                  _originalInserts: t.inserts,
                  regions: [frozenRegionId],
                  inserts: [], // Disable inserts when frozen
                }
              : t
          ),
          regions: {
            ...state.project!.regions,
            [frozenRegionId]: frozenRegion,
          },
        },
      }));

      console.log(`[DAWStore] Track ${track.name} frozen successfully`);
    } catch (err) {
      console.error('[DAWStore] Failed to freeze track:', err);
    }
  },

  unfreezeTrack: (trackId) => {
    set(state => {
      if (!state.project) return state;

      const track = state.project.tracks.find(t => t.id === trackId);
      if (!track) return state;

      // Restore original regions and inserts if they were stored
      const originalRegions = (track as any)._originalRegions || track.regions;
      const originalInserts = (track as any)._originalInserts || track.inserts;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId
              ? {
                  ...t,
                  frozen: false,
                  regions: originalRegions,
                  inserts: originalInserts,
                  _originalRegions: undefined,
                  _originalInserts: undefined,
                }
              : t
          ),
        },
      };
    });
  },

  bounceTrack: async (trackId) => {
    const state = get();
    if (!state.project) return;

    const track = state.project.tracks.find(t => t.id === trackId);
    if (!track) return;

    // Calculate total duration from existing regions
    let maxEndTime = 0;
    track.regions.forEach(regionId => {
      const region = state.project!.regions[regionId];
      if (region) {
        const endTime = region.startTime + region.duration;
        if (endTime > maxEndTime) maxEndTime = endTime;
      }
    });
    if (maxEndTime === 0) maxEndTime = 16; // Default 4 bars

    try {
      // Actually render the track to audio
      const { url } = await dawAudioEngine.renderTrackToBuffer(
        track,
        state.project,
        maxEndTime
      );

      // Create a new audio track with the bounced content
      const bounceTrackId = generateId();
      const bouncedTrack: DAWTrack = {
        id: bounceTrackId,
        name: `${track.name} (Bounced)`,
        type: 'audio',
        color: track.color,
        height: 80,
        volume: 0.8, // Reset to default
        pan: 0,
        muted: false,
        solo: false,
        armed: false,
        frozen: false,
        input: 'none',
        output: 'master',
        recordingMode: 'replace',
        inserts: [],
        sends: [],
        regions: [],
        automationLanes: [
          {
            id: `${bounceTrackId}_vol`,
            parameter: 'volume' as const,
            enabled: true,
            visible: true,
            points: [],
          },
          {
            id: `${bounceTrackId}_pan`,
            parameter: 'pan' as const,
            enabled: true,
            visible: true,
            points: [],
          },
        ],
        showAutomation: false,
      };

      const bouncedRegionId = generateId();
      const bouncedRegion: AudioRegion = {
        id: bouncedRegionId,
        name: `${track.name} Bounce`,
        trackId: bounceTrackId,
        startTime: 0,
        duration: maxEndTime,
        offset: 0,
        color: track.color,
        muted: false,
        looped: false,
        audioUrl: url, // Use the actual rendered audio URL
        gain: 1,
        fadeIn: 0,
        fadeOut: 0,
      };

      bouncedTrack.regions = [bouncedRegionId];

      // Create track processor for the new track
      dawAudioEngine.createTrackProcessor(bouncedTrack);

      // Find the index of the source track and insert after it
      const sourceIndex = state.project.tracks.findIndex(t => t.id === trackId);

      set(state => ({
        project: {
          ...state.project!,
          tracks: [
            ...state.project!.tracks.slice(0, sourceIndex + 1),
            bouncedTrack,
            ...state.project!.tracks.slice(sourceIndex + 1),
          ],
          regions: {
            ...state.project!.regions,
            [bouncedRegionId]: bouncedRegion,
          },
        },
      }));

      console.log(`[DAWStore] Track ${track.name} bounced successfully to ${url}`);
    } catch (err) {
      console.error('[DAWStore] Failed to bounce track:', err);
    }
  },

  reorderTracks: (trackIds) => {
    set(state => {
      if (!state.project) return state;

      const trackMap = new Map(state.project.tracks.map(t => [t.id, t]));
      const reorderedTracks = trackIds
        .map(id => trackMap.get(id))
        .filter((t): t is DAWTrack => t !== undefined);

      return {
        project: { ...state.project, tracks: reorderedTracks },
        isModified: true,
      };
    });
  },

  // Region actions
  addRegion: (region) => {
    const currentState = get();
    saveToHistory(currentState.project);

    set(state => {
      if (!state.project) return state;

      const track = state.project.tracks.find(t => t.id === region.trackId);
      if (!track) return state;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === region.trackId
              ? { ...t, regions: [...t.regions, region.id] }
              : t
          ),
          regions: { ...state.project.regions, [region.id]: region },
        },
        isModified: true,
      };
    });
  },

  deleteRegion: (regionId) => {
    const currentState = get();
    saveToHistory(currentState.project);

    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId];
      if (!region) return state;

      const newRegions = { ...state.project.regions };
      delete newRegions[regionId];

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === region.trackId
              ? { ...t, regions: t.regions.filter(id => id !== regionId) }
              : t
          ),
          regions: newRegions,
        },
        isModified: true,
        view: {
          ...state.view,
          selectedRegionIds: state.view.selectedRegionIds.filter(id => id !== regionId),
        },
      };
    });
  },

  moveRegion: (regionId, newTrackId, newStartTime) => {
    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId];
      if (!region) return state;

      const oldTrackId = region.trackId;
      const isSameTrack = oldTrackId === newTrackId;

      return {
        project: {
          ...state.project,
          tracks: isSameTrack
            ? state.project.tracks // No track change needed, just update region position
            : state.project.tracks.map(t => {
                if (t.id === oldTrackId) {
                  return { ...t, regions: t.regions.filter(id => id !== regionId) };
                }
                if (t.id === newTrackId) {
                  return { ...t, regions: [...t.regions, regionId] };
                }
                return t;
              }),
          regions: {
            ...state.project.regions,
            [regionId]: { ...region, trackId: newTrackId, startTime: Math.max(0, newStartTime) },
          },
        },
        isModified: true,
      };
    });
  },

  resizeRegion: (regionId, newDuration, edge) => {
    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId];
      if (!region) return state;

      let updatedRegion: Region;
      if (edge === 'start') {
        const delta = region.duration - newDuration;
        updatedRegion = {
          ...region,
          startTime: region.startTime + delta,
          duration: newDuration,
        };
      } else {
        updatedRegion = { ...region, duration: Math.max(0.25, newDuration) };
      }

      return {
        project: {
          ...state.project,
          regions: { ...state.project.regions, [regionId]: updatedRegion },
        },
        isModified: true,
      };
    });
  },

  splitRegion: (regionId, splitTime) => {
    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId];
      if (!region) return state;

      const relativeTime = splitTime - region.startTime;
      if (relativeTime <= 0 || relativeTime >= region.duration) return state;

      const newRegion: Region = {
        ...JSON.parse(JSON.stringify(region)),
        id: generateId(),
        startTime: splitTime,
        duration: region.duration - relativeTime,
      };

      const updatedOriginal = { ...region, duration: relativeTime };

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === region.trackId
              ? { ...t, regions: [...t.regions, newRegion.id] }
              : t
          ),
          regions: {
            ...state.project.regions,
            [regionId]: updatedOriginal,
            [newRegion.id]: newRegion,
          },
        },
        isModified: true,
      };
    });
  },

  duplicateRegion: (regionId) => {
    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId];
      if (!region) return state;

      const newRegion: Region = {
        ...JSON.parse(JSON.stringify(region)),
        id: generateId(),
        startTime: region.startTime + region.duration,
      };

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === region.trackId
              ? { ...t, regions: [...t.regions, newRegion.id] }
              : t
          ),
          regions: { ...state.project.regions, [newRegion.id]: newRegion },
        },
        isModified: true,
      };
    });
  },

  mergeRegions: (regionIds) => {
    const currentState = get();
    saveToHistory(currentState.project);

    set(state => {
      if (!state.project || regionIds.length < 2) return state;

      // Get all regions and verify they exist
      const regions = regionIds
        .map(id => state.project!.regions[id])
        .filter(Boolean);

      if (regions.length < 2) return state;

      // Verify all regions are on the same track
      const trackId = regions[0].trackId;
      if (!regions.every(r => r.trackId === trackId)) {
        console.warn('Cannot merge regions from different tracks');
        return state;
      }

      // Verify all regions are the same type (all MIDI or all audio)
      const isMidi = 'notes' in regions[0];
      if (!regions.every(r => ('notes' in r) === isMidi)) {
        console.warn('Cannot merge regions of different types');
        return state;
      }

      // Sort regions by start time
      const sortedRegions = [...regions].sort((a, b) => a.startTime - b.startTime);

      // Calculate merged region bounds
      const startTime = sortedRegions[0].startTime;
      const endTime = Math.max(...sortedRegions.map(r => r.startTime + r.duration));
      const duration = endTime - startTime;

      // Create merged region
      let mergedRegion: Region;

      if (isMidi) {
        // Merge MIDI notes - adjust note times relative to new region start
        const allNotes: MidiNote[] = [];
        sortedRegions.forEach(region => {
          const midiRegion = region as MidiRegion;
          midiRegion.notes.forEach(note => {
            allNotes.push({
              ...note,
              id: generateId(),
              startTime: note.startTime + (region.startTime - startTime),
            });
          });
        });

        mergedRegion = {
          id: generateId(),
          name: sortedRegions[0].name + ' (Merged)',
          trackId,
          startTime,
          duration,
          color: sortedRegions[0].color,
          muted: false,
          looped: false,
          notes: allNotes,
          quantize: (sortedRegions[0] as MidiRegion).quantize,
        } as MidiRegion;
      } else {
        // For audio regions, just extend the first region to cover all
        // (Real merging would require bouncing audio, which is complex)
        const firstAudio = sortedRegions[0] as AudioRegion;
        mergedRegion = {
          id: generateId(),
          name: firstAudio.name + ' (Merged)',
          trackId,
          startTime,
          duration,
          offset: firstAudio.offset,
          audioUrl: firstAudio.audioUrl,
          color: firstAudio.color,
          muted: false,
          looped: false,
          gain: firstAudio.gain,
          fadeIn: firstAudio.fadeIn,
          fadeOut: (sortedRegions[sortedRegions.length - 1] as AudioRegion).fadeOut,
        } as AudioRegion;
      }

      // Remove old region IDs from track and add new one
      const track = state.project.tracks.find(t => t.id === trackId);
      if (!track) return state;

      const newRegionsList = track.regions.filter(id => !regionIds.includes(id));
      newRegionsList.push(mergedRegion.id);

      // Remove old regions from regions map and add new one
      const newRegions = { ...state.project.regions };
      regionIds.forEach(id => delete newRegions[id]);
      newRegions[mergedRegion.id] = mergedRegion;

      return {
        project: {
          ...state.project,
          tracks: state.project.tracks.map(t =>
            t.id === trackId ? { ...t, regions: newRegionsList } : t
          ),
          regions: newRegions,
        },
        isModified: true,
        view: {
          ...state.view,
          selectedRegionIds: [mergedRegion.id],
        },
      };
    });
  },

  setRegionMute: (regionId, muted) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            regions: {
              ...state.project.regions,
              [regionId]: { ...state.project.regions[regionId], muted },
            },
          }
        : null,
    }));
  },

  setRegionLoop: (regionId, looped, loopLength) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            regions: {
              ...state.project.regions,
              [regionId]: { ...state.project.regions[regionId], looped, loopLength },
            },
          }
        : null,
    }));
  },

  updateRegionFade: (regionId, fadeType, value) => {
    set(state => {
      if (!state.project) return state;
      const region = state.project.regions[regionId] as AudioRegion;
      if (!region || !('fadeIn' in region)) return state;

      return {
        project: {
          ...state.project,
          regions: {
            ...state.project.regions,
            [regionId]: { ...region, [fadeType]: value },
          },
        },
        isModified: true,
      };
    });
  },

  // MIDI notes
  addNote: (regionId, note) => {
    const currentState = get();
    saveToHistory(currentState.project);

    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId] as MidiRegion;
      if (!region || !('notes' in region)) return state;

      return {
        project: {
          ...state.project,
          regions: {
            ...state.project.regions,
            [regionId]: { ...region, notes: [...region.notes, note] },
          },
        },
        isModified: true,
      };
    });
  },

  deleteNote: (regionId, noteId) => {
    const currentState = get();
    saveToHistory(currentState.project);

    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId] as MidiRegion;
      if (!region || !('notes' in region)) return state;

      return {
        project: {
          ...state.project,
          regions: {
            ...state.project.regions,
            [regionId]: { ...region, notes: region.notes.filter(n => n.id !== noteId) },
          },
        },
        isModified: true,
        view: {
          ...state.view,
          selectedNoteIds: state.view.selectedNoteIds.filter(id => id !== noteId),
        },
      };
    });
  },

  updateNote: (regionId, noteId, updates) => {
    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId] as MidiRegion;
      if (!region || !('notes' in region)) return state;

      return {
        project: {
          ...state.project,
          regions: {
            ...state.project.regions,
            [regionId]: {
              ...region,
              notes: region.notes.map(n =>
                n.id === noteId ? { ...n, ...updates } : n
              ),
            },
          },
        },
        isModified: true,
      };
    });
  },

  quantizeNotes: (regionId, value) => {
    set(state => {
      if (!state.project || value === 'off') return state;

      const region = state.project.regions[regionId] as MidiRegion;
      if (!region || !('notes' in region)) return state;

      // Parse quantize value
      const match = value.match(/1\/(\d+)(T)?/);
      if (!match) return state;

      const division = parseInt(match[1]);
      const isTriplet = match[2] === 'T';
      const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;

      const quantizedNotes = region.notes.map(note => ({
        ...note,
        startTime: Math.round(note.startTime / gridSize) * gridSize,
      }));

      return {
        project: {
          ...state.project,
          regions: {
            ...state.project.regions,
            [regionId]: { ...region, notes: quantizedNotes, quantize: value },
          },
        },
        isModified: true,
      };
    });
  },

  transposeNotes: (regionId, semitones, noteIds) => {
    const currentState = get();
    saveToHistory(currentState.project);

    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId] as MidiRegion;
      if (!region || !('notes' in region)) return state;

      const transposedNotes = region.notes.map(note => {
        // If noteIds specified, only transpose those notes
        if (noteIds && !noteIds.includes(note.id)) return note;

        // Transpose and clamp to valid MIDI range (0-127)
        const newPitch = Math.max(0, Math.min(127, note.pitch + semitones));
        return { ...note, pitch: newPitch };
      });

      return {
        project: {
          ...state.project,
          regions: {
            ...state.project.regions,
            [regionId]: { ...region, notes: transposedNotes },
          },
        },
        isModified: true,
      };
    });
  },

  humanizeNotes: (regionId, amount, noteIds) => {
    const currentState = get();
    saveToHistory(currentState.project);

    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId] as MidiRegion;
      if (!region || !('notes' in region)) return state;

      const humanizedNotes = region.notes.map(note => {
        // If noteIds specified, only humanize those notes
        if (noteIds && !noteIds.includes(note.id)) return note;

        // Random timing offset (amount is in beats, e.g. 0.05 = 5% of a beat)
        const timingOffset = (Math.random() - 0.5) * 2 * amount;
        const newStartTime = Math.max(0, note.startTime + timingOffset);

        // Random velocity offset (scale amount to velocity range)
        const velocityOffset = Math.round((Math.random() - 0.5) * 2 * amount * 20);
        const newVelocity = Math.max(1, Math.min(127, note.velocity + velocityOffset));

        return { ...note, startTime: newStartTime, velocity: newVelocity };
      });

      return {
        project: {
          ...state.project,
          regions: {
            ...state.project.regions,
            [regionId]: { ...region, notes: humanizedNotes },
          },
        },
        isModified: true,
      };
    });
  },

  scaleVelocity: (regionId, factor, noteIds) => {
    const currentState = get();
    saveToHistory(currentState.project);

    set(state => {
      if (!state.project) return state;

      const region = state.project.regions[regionId] as MidiRegion;
      if (!region || !('notes' in region)) return state;

      const scaledNotes = region.notes.map(note => {
        // If noteIds specified, only scale those notes
        if (noteIds && !noteIds.includes(note.id)) return note;

        // Scale velocity and clamp to valid range (1-127)
        const newVelocity = Math.max(1, Math.min(127, Math.round(note.velocity * factor)));
        return { ...note, velocity: newVelocity };
      });

      return {
        project: {
          ...state.project,
          regions: {
            ...state.project.regions,
            [regionId]: { ...region, notes: scaledNotes },
          },
        },
        isModified: true,
      };
    });
  },

  // MIDI Import
  importMidiFile: async (file, trackId) => {
    const state = get();
    if (!state.project) return;

    try {
      // Find or create target track
      let targetTrackId = trackId;
      if (!targetTrackId) {
        // Find first software-instrument track or create one
        const midiTrack = state.project.tracks.find(t => t.type === 'software-instrument');
        if (midiTrack) {
          targetTrackId = midiTrack.id;
        } else {
          // Create a new MIDI track
          targetTrackId = get().addTrack('software-instrument', file.name.replace(/\.(mid|midi)$/i, ''));
        }
      }

      const track = get().project?.tracks.find(t => t.id === targetTrackId);
      if (!track) return;

      // Parse the MIDI file
      const { regions, tempo } = await parseMidiFile(file, targetTrackId, 0, track.color);

      // Update tempo if found in MIDI file
      if (tempo && tempo !== state.project.bpm) {
        get().setBpm(tempo);
      }

      // Add all imported regions
      for (const region of regions) {
        get().addRegion(region);
      }

      console.log(`[DAWStore] Imported ${regions.length} region(s) from MIDI file: ${file.name}`);
    } catch (error) {
      console.error('[DAWStore] Failed to import MIDI file:', error);
      throw error;
    }
  },

  // Tempo
  addTempoChange: (time, bpm, curve = 'linear') => {
    const tempoChange = {
      id: generateId(),
      time,
      bpm: Math.max(40, Math.min(240, bpm)),
      curve,
    };

    set(state => ({
      project: state.project
        ? { ...state.project, tempoChanges: [...(state.project.tempoChanges || []), tempoChange] }
        : null,
      isModified: true,
    }));
  },

  updateTempoChange: (id, updates) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tempoChanges: (state.project.tempoChanges || []).map(tc =>
              tc.id === id
                ? {
                    ...tc,
                    ...updates,
                    bpm: updates.bpm !== undefined ? Math.max(40, Math.min(240, updates.bpm)) : tc.bpm,
                  }
                : tc
            ),
          }
        : null,
      isModified: true,
    }));
  },

  deleteTempoChange: (id) => {
    set(state => ({
      project: state.project
        ? { ...state.project, tempoChanges: (state.project.tempoChanges || []).filter(tc => tc.id !== id) }
        : null,
      isModified: true,
    }));
  },

  toggleTempoTrack: () => {
    set(state => ({
      view: { ...state.view, showTempoTrack: !state.view.showTempoTrack },
    }));
  },

  // Markers
  addMarker: (name, time) => {
    const marker: Marker = {
      id: generateId(),
      name,
      time,
      color: getRandomColor(),
    };

    set(state => ({
      project: state.project
        ? { ...state.project, markers: [...state.project.markers, marker] }
        : null,
      isModified: true,
    }));
  },

  deleteMarker: (markerId) => {
    set(state => ({
      project: state.project
        ? { ...state.project, markers: state.project.markers.filter(m => m.id !== markerId) }
        : null,
      isModified: true,
    }));
  },

  updateMarker: (markerId, updates) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            markers: state.project.markers.map(m =>
              m.id === markerId ? { ...m, ...updates } : m
            ),
          }
        : null,
      isModified: true,
    }));
  },

  // Buses
  addBus: (name) => {
    const bus: Bus = {
      id: generateId(),
      name: name || `Bus ${(get().project?.buses.length || 0) + 1}`,
      color: getRandomColor(),
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      inserts: [],
      sends: [],
      output: 'master',
    };

    set(state => ({
      project: state.project
        ? { ...state.project, buses: [...state.project.buses, bus] }
        : null,
      isModified: true,
    }));

    return bus.id;
  },

  deleteBus: (busId) => {
    set(state => ({
      project: state.project
        ? { ...state.project, buses: state.project.buses.filter(b => b.id !== busId) }
        : null,
      isModified: true,
    }));
  },

  setBusVolume: (busId, volume) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            buses: state.project.buses.map(b =>
              b.id === busId ? { ...b, volume: Math.max(0, Math.min(1, volume)) } : b
            ),
          }
        : null,
    }));
  },

  setBusPan: (busId, pan) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            buses: state.project.buses.map(b =>
              b.id === busId ? { ...b, pan: Math.max(-1, Math.min(1, pan)) } : b
            ),
          }
        : null,
    }));
  },

  toggleBusMute: (busId) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            buses: state.project.buses.map(b =>
              b.id === busId ? { ...b, muted: !b.muted } : b
            ),
          }
        : null,
    }));
  },

  toggleBusSolo: (busId) => {
    set(state => ({
      project: state.project
        ? {
            ...state.project,
            buses: state.project.buses.map(b =>
              b.id === busId ? { ...b, solo: !b.solo } : b
            ),
          }
        : null,
    }));
  },

  // Sends
  addTrackSend: (trackId, busId) => {
    const state = get();
    if (!state.project) return;

    const newSend: TrackSend = {
      id: generateId(),
      busId,
      amount: 0.5, // Default 50%
      preFader: false,
    };

    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, sends: [...t.sends, newSend] } : t
            ),
          }
        : null,
    }));

    // Update audio engine routing
    dawAudioEngine.addTrackSend(trackId, busId, newSend.amount, newSend.preFader);
  },

  removeTrackSend: (trackId, sendId) => {
    const state = get();
    if (!state.project) return;

    const track = state.project.tracks.find(t => t.id === trackId);
    const send = track?.sends.find(s => s.id === sendId);

    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId ? { ...t, sends: t.sends.filter(s => s.id !== sendId) } : t
            ),
          }
        : null,
    }));

    // Update audio engine routing
    if (send) {
      dawAudioEngine.removeTrackSend(trackId, send.busId);
    }
  },

  setSendAmount: (trackId, sendId, amount) => {
    const state = get();
    if (!state.project) return;

    const track = state.project.tracks.find(t => t.id === trackId);
    const send = track?.sends.find(s => s.id === sendId);

    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId
                ? {
                    ...t,
                    sends: t.sends.map(s =>
                      s.id === sendId ? { ...s, amount: Math.max(0, Math.min(1, amount)) } : s
                    ),
                  }
                : t
            ),
          }
        : null,
    }));

    // Update audio engine
    if (send) {
      dawAudioEngine.setSendAmount(trackId, send.busId, amount);
    }
  },

  setSendPreFader: (trackId, sendId, preFader) => {
    const state = get();
    if (!state.project) return;

    const track = state.project.tracks.find(t => t.id === trackId);
    const send = track?.sends.find(s => s.id === sendId);

    set(state => ({
      project: state.project
        ? {
            ...state.project,
            tracks: state.project.tracks.map(t =>
              t.id === trackId
                ? {
                    ...t,
                    sends: t.sends.map(s =>
                      s.id === sendId ? { ...s, preFader } : s
                    ),
                  }
                : t
            ),
          }
        : null,
    }));

    // Update audio engine
    if (send) {
      dawAudioEngine.setSendPreFader(trackId, send.busId, preFader);
    }
  },

  // Master
  setMasterVolume: (volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    dawAudioEngine.setMasterVolume(clampedVolume);

    set(state => ({
      project: state.project
        ? { ...state.project, master: { ...state.project.master, volume: clampedVolume } }
        : null,
    }));
  },

  // Synth Parameters (for Smart Controls)
  setSynthCutoff: (trackId, value) => {
    // value is 0-1, convert to freq 20-20000Hz (logarithmic)
    const freq = 20 * Math.pow(1000, value);
    dawAudioEngine.setSynthFilterCutoff(trackId, freq);
  },

  setSynthResonance: (trackId, value) => {
    // value is 0-1, convert to Q 0.1-20
    const q = 0.1 + value * 19.9;
    dawAudioEngine.setSynthFilterResonance(trackId, q);
  },

  setSynthAttack: (trackId, value) => {
    // value is 0-1, convert to 0.001-2 seconds
    const attack = 0.001 + value * 1.999;
    const params = dawAudioEngine.getSynthParameters(trackId);
    if (params) {
      dawAudioEngine.setSynthADSR(trackId, attack, params.decay, params.sustain, params.release);
    }
  },

  setSynthDecay: (trackId, value) => {
    // value is 0-1, convert to 0.001-2 seconds
    const decay = 0.001 + value * 1.999;
    const params = dawAudioEngine.getSynthParameters(trackId);
    if (params) {
      dawAudioEngine.setSynthADSR(trackId, params.attack, decay, params.sustain, params.release);
    }
  },

  setSynthSustain: (trackId, value) => {
    // value is 0-1
    const params = dawAudioEngine.getSynthParameters(trackId);
    if (params) {
      dawAudioEngine.setSynthADSR(trackId, params.attack, params.decay, value, params.release);
    }
  },

  setSynthRelease: (trackId, value) => {
    // value is 0-1, convert to 0.001-5 seconds
    const release = 0.001 + value * 4.999;
    const params = dawAudioEngine.getSynthParameters(trackId);
    if (params) {
      dawAudioEngine.setSynthADSR(trackId, params.attack, params.decay, params.sustain, release);
    }
  },

  setSynthDrive: (trackId, value) => {
    dawAudioEngine.setSynthDrive(trackId, value);
  },

  setSynthMix: (trackId, value) => {
    dawAudioEngine.setSynthMix(trackId, value);
  },

  setSynthOscillator: (trackId, type) => {
    dawAudioEngine.setSynthOscillator(trackId, type);
  },

  // View actions
  setHorizontalZoom: (zoom) => {
    set(state => ({
      view: { ...state.view, horizontalZoom: Math.max(10, Math.min(200, zoom)) },
    }));
  },

  setVerticalZoom: (zoom) => {
    set(state => ({
      view: { ...state.view, verticalZoom: Math.max(0.5, Math.min(3, zoom)) },
    }));
  },

  setScroll: (x, y) => {
    set(state => ({
      view: { ...state.view, scrollX: Math.max(0, x), scrollY: Math.max(0, y) },
    }));
  },

  toggleLibrary: () => {
    set(state => ({
      view: { ...state.view, showLibrary: !state.view.showLibrary },
    }));
  },

  toggleInspector: () => {
    set(state => ({
      view: { ...state.view, showInspector: !state.view.showInspector },
    }));
  },

  toggleMixer: () => {
    set(state => ({
      view: { ...state.view, showMixer: !state.view.showMixer },
    }));
  },

  togglePianoRoll: () => {
    set(state => ({
      view: { ...state.view, showPianoRoll: !state.view.showPianoRoll },
    }));
  },

  setActiveTool: (tool) => {
    set(state => ({
      view: { ...state.view, activeTool: tool },
    }));
  },

  setSnapEnabled: (enabled) => {
    set(state => ({
      view: { ...state.view, snapEnabled: enabled },
    }));
  },

  setSnapValue: (value) => {
    set(state => ({
      view: { ...state.view, snapValue: value },
    }));
  },

  // Selection
  selectTrack: (trackId, addToSelection = false) => {
    set(state => ({
      view: {
        ...state.view,
        selectedTrackIds: addToSelection
          ? state.view.selectedTrackIds.includes(trackId)
            ? state.view.selectedTrackIds.filter(id => id !== trackId)
            : [...state.view.selectedTrackIds, trackId]
          : [trackId],
      },
    }));
  },

  selectRegion: (regionId, addToSelection = false) => {
    set(state => ({
      view: {
        ...state.view,
        selectedRegionIds: addToSelection
          ? state.view.selectedRegionIds.includes(regionId)
            ? state.view.selectedRegionIds.filter(id => id !== regionId)
            : [...state.view.selectedRegionIds, regionId]
          : [regionId],
      },
    }));
  },

  selectNote: (noteId, addToSelection = false) => {
    set(state => ({
      view: {
        ...state.view,
        selectedNoteIds: addToSelection
          ? state.view.selectedNoteIds.includes(noteId)
            ? state.view.selectedNoteIds.filter(id => id !== noteId)
            : [...state.view.selectedNoteIds, noteId]
          : [noteId],
      },
    }));
  },

  clearSelection: () => {
    set(state => ({
      view: {
        ...state.view,
        selectedTrackIds: [],
        selectedRegionIds: [],
        selectedNoteIds: [],
      },
    }));
  },

  selectAll: () => {
    const state = get();
    if (!state.project) return;

    set({
      view: {
        ...state.view,
        selectedRegionIds: Object.keys(state.project.regions),
      },
    });
  },

  // Editor
  openEditor: (trackId, regionId) => {
    set(state => ({
      view: {
        ...state.view,
        showPianoRoll: true,
        activeEditorTrackId: trackId,
        activeEditorRegionId: regionId,
      },
    }));
  },

  closeEditor: () => {
    set(state => ({
      view: {
        ...state.view,
        showPianoRoll: false,
        activeEditorTrackId: null,
        activeEditorRegionId: null,
      },
    }));
  },

  // Undo/Redo
  undo: () => {
    const state = get();
    if (undoStack.length === 0 || !state.project) return;

    // Save current state to redo stack
    redoStack.push(JSON.parse(JSON.stringify(state.project)));

    // Restore previous state
    const previousProject = undoStack.pop()!;

    // Recreate track processors
    state.project.tracks.forEach(track => {
      dawAudioEngine.removeTrackProcessor(track.id);
    });
    previousProject.tracks.forEach(track => {
      dawAudioEngine.createTrackProcessor(track);
    });

    set({
      project: previousProject,
      isModified: undoStack.length > 0,
    });
  },

  redo: () => {
    const state = get();
    if (redoStack.length === 0 || !state.project) return;

    // Save current state to undo stack
    undoStack.push(JSON.parse(JSON.stringify(state.project)));

    // Restore next state
    const nextProject = redoStack.pop()!;

    // Recreate track processors
    state.project.tracks.forEach(track => {
      dawAudioEngine.removeTrackProcessor(track.id);
    });
    nextProject.tracks.forEach(track => {
      dawAudioEngine.createTrackProcessor(track);
    });

    set({
      project: nextProject,
      isModified: true,
    });
  },

  canUndo: () => undoStack.length > 0,

  canRedo: () => redoStack.length > 0,

  // Clipboard operations
  copyRegions: (regionIds) => {
    const state = get();
    if (!state.project) return;

    // Use provided regionIds or currently selected regions
    const ids = regionIds || state.view.selectedRegionIds;
    if (ids.length === 0) return;

    // Deep copy regions to clipboard
    clipboard = ids
      .map(id => state.project!.regions[id])
      .filter((r): r is Region => r !== undefined)
      .map(r => JSON.parse(JSON.stringify(r)));

    console.log(`[DAWStore] Copied ${clipboard.length} region(s) to clipboard`);
  },

  cutRegions: (regionIds) => {
    const state = get();
    if (!state.project) return;

    // Use provided regionIds or currently selected regions
    const ids = regionIds || state.view.selectedRegionIds;
    if (ids.length === 0) return;

    // Copy first
    get().copyRegions(ids);

    // Then delete
    saveToHistory(state.project);
    ids.forEach(id => {
      get().deleteRegion(id);
    });

    console.log(`[DAWStore] Cut ${ids.length} region(s)`);
  },

  pasteRegions: (trackId, startTime) => {
    const state = get();
    if (!state.project || clipboard.length === 0) return;

    saveToHistory(state.project);

    // Determine target track - use provided, first selected, or same track as first clipboard region
    let targetTrackId = trackId;
    if (!targetTrackId && state.view.selectedTrackIds.length > 0) {
      targetTrackId = state.view.selectedTrackIds[0];
    }
    if (!targetTrackId && clipboard.length > 0) {
      targetTrackId = clipboard[0].trackId;
    }

    // Verify target track exists
    const targetTrack = state.project.tracks.find(t => t.id === targetTrackId);
    if (!targetTrack) {
      console.warn('[DAWStore] Cannot paste: target track not found');
      return;
    }

    // Determine paste position - use playhead if no startTime provided
    const pastePosition = startTime !== undefined ? startTime : state.playheadPosition;

    // Find the earliest start time in clipboard to calculate offsets
    const earliestStart = Math.min(...clipboard.map(r => r.startTime));

    // Paste all regions with new IDs
    const newRegionIds: string[] = [];
    clipboard.forEach(region => {
      const offset = region.startTime - earliestStart;
      const newRegion: Region = {
        ...JSON.parse(JSON.stringify(region)),
        id: generateId(),
        trackId: targetTrackId!,
        startTime: pastePosition + offset,
      };

      // Add the region
      set(s => {
        if (!s.project) return s;
        return {
          project: {
            ...s.project,
            tracks: s.project.tracks.map(t =>
              t.id === targetTrackId
                ? { ...t, regions: [...t.regions, newRegion.id] }
                : t
            ),
            regions: { ...s.project.regions, [newRegion.id]: newRegion },
          },
          isModified: true,
        };
      });

      newRegionIds.push(newRegion.id);
    });

    // Select the newly pasted regions
    set(s => ({
      view: {
        ...s.view,
        selectedRegionIds: newRegionIds,
      },
    }));

    console.log(`[DAWStore] Pasted ${newRegionIds.length} region(s) at position ${pastePosition}`);
  },

  hasClipboard: () => clipboard.length > 0,
}));

export { dawAudioEngine, dawScheduler };

// Expose store globally for debugging/testing
if (typeof window !== 'undefined') {
  (window as any).__DAW_STORE__ = useDAWStore;
  (window as any).__DAW_ENGINE__ = dawAudioEngine;
  (window as any).__DAW_SCHEDULER__ = dawScheduler;
}
