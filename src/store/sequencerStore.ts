/**
 * Beat Bot Pro - Zustand Store
 * Full-featured sequencer with kits, patterns, persistence
 */

import { create } from "zustand";
import type {
  SequencerStore,
  Track,
  Pattern,
  Step,
  TrackEffects,
} from "../types";
import {
  DEFAULT_EFFECTS,
  createEmptySequence,
  createEmptyStep,
} from "../types";
import { DRUM_KITS, getKitById, DEFAULT_KIT_ID } from "../data/kits";
import { audioEngine } from "../audio/AudioEngine";
import { Scheduler } from "../audio/Scheduler";
import type { BeatPreset } from "../data/presets";

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// IndexedDB helpers for persistence
const DB_NAME = "beatbot-pro";
const DB_VERSION = 1;
const PROJECTS_STORE = "projects";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
      }
    };
  });
};

// Create initial tracks from a kit
const createTracksFromKit = (kitId: string, patternLength: number): Track[] => {
  const kit = getKitById(kitId) || DRUM_KITS[0];
  return kit.tracks.map((trackDef) => ({
    id: generateId(),
    name: trackDef.name,
    sampleUrl: trackDef.sampleUrl,
    sequence: createEmptySequence(patternLength),
    volume: trackDef.defaultVolume,
    pan: 0,
    pitch: 0,
    muted: false,
    solo: false,
    effects: { ...DEFAULT_EFFECTS },
  }));
};

// Create initial pattern
const createInitialPattern = (
  kitId: string,
  length: 8 | 16 | 32 | 64 = 16
): Pattern => {
  const kit = getKitById(kitId) || DRUM_KITS[0];
  return {
    id: generateId(),
    name: "Pattern 1",
    length,
    kitId,
    tracks: kit.tracks.map((trackDef) => ({
      trackId: generateId(),
      sampleUrl: trackDef.sampleUrl,
      name: trackDef.name,
      sequence: createEmptySequence(length),
      volume: trackDef.defaultVolume,
      pan: 0,
      pitch: 0,
      muted: false,
      effects: { ...DEFAULT_EFFECTS },
    })),
  };
};

// Scheduler instance (created after store)
let scheduler: Scheduler | null = null;

// History for undo/redo
interface HistoryEntry {
  tracks: Track[];
  patterns: Pattern[];
  currentPatternId: string;
}
const history: HistoryEntry[] = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

const saveToHistory = (state: HistoryEntry) => {
  // Remove any future history if we're not at the end
  if (historyIndex < history.length - 1) {
    history.splice(historyIndex + 1);
  }

  // Add new entry
  history.push(JSON.parse(JSON.stringify(state)));
  historyIndex = history.length - 1;

  // Limit history size
  if (history.length > MAX_HISTORY) {
    history.shift();
    historyIndex--;
  }
};

export const useSequencerStore = create<SequencerStore>((set, get) => ({
  // Initial state
  currentKitId: DEFAULT_KIT_ID,
  tracks: createTracksFromKit(DEFAULT_KIT_ID, 16),
  patterns: [createInitialPattern(DEFAULT_KIT_ID, 16)],
  currentPatternId: "",
  patternLength: 16,
  isPlaying: false,
  currentStep: 0,
  bpm: 120,
  swing: 0,
  masterVolume: 0.8,
  isLoading: false,
  isInitialized: false,
  historyIndex: -1,

  // Initialize audio engine and load samples
  init: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      // Initialize audio engine
      await audioEngine.init();

      // Set current pattern ID
      const patterns = get().patterns;
      if (patterns.length > 0 && !get().currentPatternId) {
        set({ currentPatternId: patterns[0].id });
      }

      // Load all samples for current kit
      const tracks = get().tracks;
      await Promise.all(
        tracks.map((track) => audioEngine.loadSample(track.sampleUrl))
      );

      // Set up track gains
      tracks.forEach((track) => {
        audioEngine.setTrackVolume(track.id, track.volume);
      });

      // Set master volume
      audioEngine.setMasterVolume(get().masterVolume);

      // Create scheduler
      scheduler = new Scheduler({
        onStep: (step) => set({ currentStep: step }),
        getTracks: () => get().tracks,
        getBpm: () => get().bpm,
        getSwing: () => get().swing,
        getPatternLength: () => get().patternLength,
        hasSoloTrack: () => get().tracks.some((t) => t.solo),
      });

      // Initialize history
      saveToHistory({
        tracks: get().tracks,
        patterns: get().patterns,
        currentPatternId: get().currentPatternId,
      });

      set({ isInitialized: true, isLoading: false });
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      set({ isLoading: false });
    }
  },

  // Transport controls
  play: () => {
    if (!scheduler || !get().isInitialized) return;
    scheduler.start();
    set({ isPlaying: true });
  },

  stop: () => {
    if (!scheduler) return;
    scheduler.stop();
    scheduler.reset();
    set({ isPlaying: false, currentStep: 0 });
  },

  togglePlay: () => {
    const { isPlaying, play, stop } = get();
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  },

  setBpm: (bpm) => {
    set({ bpm: Math.max(40, Math.min(300, bpm)) });
  },

  setSwing: (swing) => {
    set({ swing: Math.max(0, Math.min(100, swing)) });
  },

  setCurrentStep: (step) => {
    set({ currentStep: step });
  },

  // Track actions
  toggleStep: (trackId, step) => {
    set((state) => {
      const newTracks = state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              sequence: track.sequence.map((s, i) =>
                i === step ? { ...s, active: !s.active } : s
              ),
            }
          : track
      );

      // Save to history
      saveToHistory({
        tracks: newTracks,
        patterns: state.patterns,
        currentPatternId: state.currentPatternId,
      });

      return { tracks: newTracks };
    });
  },

  setStepVelocity: (trackId, step, velocity) => {
    set((state) => {
      const newTracks = state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              sequence: track.sequence.map((s, i) =>
                i === step
                  ? { ...s, velocity: Math.max(0, Math.min(1, velocity)) }
                  : s
              ),
            }
          : track
      );
      return { tracks: newTracks };
    });
  },

  setTrackVolume: (trackId, volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioEngine.setTrackVolume(trackId, clampedVolume);
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, volume: clampedVolume } : track
      ),
    }));
  },

  setTrackPan: (trackId, pan) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, pan: Math.max(-1, Math.min(1, pan)) }
          : track
      ),
    }));
  },

  setTrackPitch: (trackId, pitch) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, pitch: Math.max(-12, Math.min(12, pitch)) }
          : track
      ),
    }));
  },

  toggleMute: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      ),
    }));
  },

  toggleSolo: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, solo: !track.solo } : track
      ),
    }));
  },

  clearTrack: (trackId) => {
    set((state) => {
      const newTracks = state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, sequence: createEmptySequence(state.patternLength) }
          : track
      );

      saveToHistory({
        tracks: newTracks,
        patterns: state.patterns,
        currentPatternId: state.currentPatternId,
      });

      return { tracks: newTracks };
    });
  },

  setTrackEffect: (trackId, effect, value) => {
    const clampedValue = Math.max(0, Math.min(effect === "delayTime" ? 2 : 1, value));

    // Update audio engine
    switch (effect) {
      case "reverb":
        audioEngine.setTrackReverb(trackId, clampedValue);
        break;
      case "delay":
        audioEngine.setTrackDelay(trackId, clampedValue);
        break;
      case "delayTime":
        audioEngine.setTrackDelayTime(trackId, clampedValue);
        break;
      case "distortion":
        audioEngine.setTrackDistortion(trackId, clampedValue);
        break;
    }

    // Update state
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              effects: {
                ...track.effects,
                [effect]: clampedValue,
              },
            }
          : track
      ),
    }));
  },

  // Kit actions
  switchKit: async (kitId) => {
    const kit = getKitById(kitId);
    if (!kit) return;

    set({ isLoading: true });

    try {
      // Load new samples
      await Promise.all(
        kit.tracks.map((track) => audioEngine.loadSample(track.sampleUrl))
      );

      // Create new tracks with kit samples but preserve pattern
      const currentTracks = get().tracks;
      const newTracks = kit.tracks.map((trackDef, index) => {
        const existingTrack = currentTracks[index];
        return {
          id: existingTrack?.id || generateId(),
          name: trackDef.name,
          sampleUrl: trackDef.sampleUrl,
          sequence: existingTrack?.sequence || createEmptySequence(get().patternLength),
          volume: existingTrack?.volume ?? trackDef.defaultVolume,
          pan: existingTrack?.pan ?? 0,
          pitch: existingTrack?.pitch ?? 0,
          muted: existingTrack?.muted ?? false,
          solo: existingTrack?.solo ?? false,
          effects: existingTrack?.effects || { ...DEFAULT_EFFECTS },
        };
      });

      // Set up track gains for new tracks
      newTracks.forEach((track) => {
        audioEngine.setTrackVolume(track.id, track.volume);
      });

      saveToHistory({
        tracks: newTracks,
        patterns: get().patterns,
        currentPatternId: get().currentPatternId,
      });

      set({
        currentKitId: kitId,
        tracks: newTracks,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to switch kit:", error);
      set({ isLoading: false });
    }
  },

  // Pattern actions
  createPattern: (name) => {
    const state = get();
    const newPattern = createInitialPattern(state.currentKitId, state.patternLength);
    newPattern.name = name || `Pattern ${state.patterns.length + 1}`;

    const newPatterns = [...state.patterns, newPattern];

    saveToHistory({
      tracks: state.tracks,
      patterns: newPatterns,
      currentPatternId: newPattern.id,
    });

    set({
      patterns: newPatterns,
      currentPatternId: newPattern.id,
      tracks: createTracksFromKit(state.currentKitId, state.patternLength),
    });
  },

  deletePattern: (patternId) => {
    const state = get();
    if (state.patterns.length <= 1) return; // Keep at least one pattern

    const newPatterns = state.patterns.filter((p) => p.id !== patternId);
    const newCurrentId =
      state.currentPatternId === patternId
        ? newPatterns[0].id
        : state.currentPatternId;

    // If switching patterns, load the tracks from the new current pattern
    let newTracks = state.tracks;
    if (state.currentPatternId === patternId) {
      const pattern = newPatterns.find((p) => p.id === newCurrentId);
      if (pattern) {
        newTracks = pattern.tracks.map((pt) => ({
          id: pt.trackId,
          name: pt.name,
          sampleUrl: pt.sampleUrl,
          sequence: pt.sequence,
          volume: pt.volume,
          pan: pt.pan,
          pitch: pt.pitch,
          muted: pt.muted,
          solo: false,
          effects: pt.effects,
        }));
      }
    }

    saveToHistory({
      tracks: newTracks,
      patterns: newPatterns,
      currentPatternId: newCurrentId,
    });

    set({
      patterns: newPatterns,
      currentPatternId: newCurrentId,
      tracks: newTracks,
    });
  },

  switchPattern: (patternId) => {
    const state = get();
    const pattern = state.patterns.find((p) => p.id === patternId);
    if (!pattern) return;

    // Save current tracks to current pattern before switching
    const updatedPatterns = state.patterns.map((p) =>
      p.id === state.currentPatternId
        ? {
            ...p,
            tracks: state.tracks.map((t) => ({
              trackId: t.id,
              sampleUrl: t.sampleUrl,
              name: t.name,
              sequence: t.sequence,
              volume: t.volume,
              pan: t.pan,
              pitch: t.pitch,
              muted: t.muted,
              effects: t.effects,
            })),
          }
        : p
    );

    // Load tracks from new pattern
    const newTracks = pattern.tracks.map((pt) => ({
      id: pt.trackId,
      name: pt.name,
      sampleUrl: pt.sampleUrl,
      sequence: pt.sequence,
      volume: pt.volume,
      pan: pt.pan,
      pitch: pt.pitch,
      muted: pt.muted,
      solo: false,
      effects: pt.effects,
    }));

    set({
      patterns: updatedPatterns,
      currentPatternId: patternId,
      tracks: newTracks,
      patternLength: pattern.length,
    });
  },

  duplicatePattern: (patternId) => {
    const state = get();
    const pattern = state.patterns.find((p) => p.id === patternId);
    if (!pattern) return;

    const newPattern: Pattern = {
      ...JSON.parse(JSON.stringify(pattern)),
      id: generateId(),
      name: `${pattern.name} (copy)`,
      tracks: pattern.tracks.map((t) => ({
        ...t,
        trackId: generateId(),
      })),
    };

    const newPatterns = [...state.patterns, newPattern];

    saveToHistory({
      tracks: state.tracks,
      patterns: newPatterns,
      currentPatternId: state.currentPatternId,
    });

    set({ patterns: newPatterns });
  },

  setPatternLength: (length) => {
    set((state) => {
      const newTracks = state.tracks.map((track) => {
        const currentLength = track.sequence.length;
        let newSequence: Step[];

        if (length > currentLength) {
          // Extend with empty steps
          newSequence = [
            ...track.sequence,
            ...createEmptySequence(length - currentLength),
          ];
        } else {
          // Truncate
          newSequence = track.sequence.slice(0, length);
        }

        return { ...track, sequence: newSequence };
      });

      // Update patterns too
      const newPatterns = state.patterns.map((p) =>
        p.id === state.currentPatternId ? { ...p, length } : p
      );

      saveToHistory({
        tracks: newTracks,
        patterns: newPatterns,
        currentPatternId: state.currentPatternId,
      });

      return {
        tracks: newTracks,
        patterns: newPatterns,
        patternLength: length,
      };
    });
  },

  renamePattern: (patternId, name) => {
    set((state) => ({
      patterns: state.patterns.map((p) =>
        p.id === patternId ? { ...p, name } : p
      ),
    }));
  },

  // Master controls
  setMasterVolume: (volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioEngine.setMasterVolume(clampedVolume);
    set({ masterVolume: clampedVolume });
  },

  // Pattern operations
  clearAll: () => {
    set((state) => {
      const newTracks = state.tracks.map((track) => ({
        ...track,
        sequence: createEmptySequence(state.patternLength),
      }));

      saveToHistory({
        tracks: newTracks,
        patterns: state.patterns,
        currentPatternId: state.currentPatternId,
      });

      return { tracks: newTracks };
    });
  },

  randomize: () => {
    set((state) => {
      const newTracks = state.tracks.map((track) => ({
        ...track,
        sequence: Array.from({ length: state.patternLength }, () => ({
          active: Math.random() > 0.7,
          velocity: 0.5 + Math.random() * 0.5,
        })),
      }));

      saveToHistory({
        tracks: newTracks,
        patterns: state.patterns,
        currentPatternId: state.currentPatternId,
      });

      return { tracks: newTracks };
    });
  },

  // Load preset beat
  loadPreset: (preset: BeatPreset) => {
    const state = get();

    // Apply preset to tracks
    const newTracks = state.tracks.map((track, index) => {
      const presetPattern = preset.pattern[index];
      if (!presetPattern) return track;

      // Extend or truncate preset pattern to match current pattern length
      const sequence = Array.from({ length: state.patternLength }, (_, i) => {
        if (i < presetPattern.length) {
          return { ...presetPattern[i] };
        }
        // For lengths > 16, repeat the pattern
        return { ...presetPattern[i % presetPattern.length] };
      });

      return { ...track, sequence };
    });

    saveToHistory({
      tracks: newTracks,
      patterns: state.patterns,
      currentPatternId: state.currentPatternId,
    });

    set({
      tracks: newTracks,
      bpm: preset.bpm,
      swing: preset.swing,
    });
  },

  // Project persistence
  saveProject: async (name) => {
    const state = get();

    // Save current tracks to current pattern
    const patterns = state.patterns.map((p) =>
      p.id === state.currentPatternId
        ? {
            ...p,
            tracks: state.tracks.map((t) => ({
              trackId: t.id,
              sampleUrl: t.sampleUrl,
              name: t.name,
              sequence: t.sequence,
              volume: t.volume,
              pan: t.pan,
              pitch: t.pitch,
              muted: t.muted,
              effects: t.effects,
            })),
          }
        : p
    );

    const project = {
      id: generateId(),
      name,
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bpm: state.bpm,
      swing: state.swing,
      masterVolume: state.masterVolume,
      kitId: state.currentKitId,
      patterns,
      currentPatternId: state.currentPatternId,
    };

    const db = await openDB();
    return new Promise<string>((resolve, reject) => {
      const tx = db.transaction(PROJECTS_STORE, "readwrite");
      const store = tx.objectStore(PROJECTS_STORE);
      const request = store.put(project);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(project.id);
    });
  },

  loadProject: async (projectId) => {
    const db = await openDB();
    const project = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(PROJECTS_STORE, "readonly");
      const store = tx.objectStore(PROJECTS_STORE);
      const request = store.get(projectId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Load kit samples
    await get().switchKit(project.kitId);

    // Load pattern
    const pattern = project.patterns.find(
      (p: Pattern) => p.id === project.currentPatternId
    );
    if (pattern) {
      const newTracks = pattern.tracks.map((pt: any) => ({
        id: pt.trackId,
        name: pt.name,
        sampleUrl: pt.sampleUrl,
        sequence: pt.sequence,
        volume: pt.volume,
        pan: pt.pan,
        pitch: pt.pitch,
        muted: pt.muted,
        solo: false,
        effects: pt.effects,
      }));

      set({
        bpm: project.bpm,
        swing: project.swing,
        masterVolume: project.masterVolume,
        currentKitId: project.kitId,
        patterns: project.patterns,
        currentPatternId: project.currentPatternId,
        patternLength: pattern.length,
        tracks: newTracks,
      });

      audioEngine.setMasterVolume(project.masterVolume);
    }
  },

  deleteProject: async (projectId) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PROJECTS_STORE, "readwrite");
      const store = tx.objectStore(PROJECTS_STORE);
      const request = store.delete(projectId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  getProjects: async () => {
    const db = await openDB();
    return new Promise<{ id: string; name: string; updatedAt: number }[]>(
      (resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE, "readonly");
        const store = tx.objectStore(PROJECTS_STORE);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () =>
          resolve(
            request.result.map((p: any) => ({
              id: p.id,
              name: p.name,
              updatedAt: p.updatedAt,
            }))
          );
      }
    );
  },

  exportProject: () => {
    const state = get();

    // Save current tracks to current pattern
    const patterns = state.patterns.map((p) =>
      p.id === state.currentPatternId
        ? {
            ...p,
            tracks: state.tracks.map((t) => ({
              trackId: t.id,
              sampleUrl: t.sampleUrl,
              name: t.name,
              sequence: t.sequence,
              volume: t.volume,
              pan: t.pan,
              pitch: t.pitch,
              muted: t.muted,
              effects: t.effects,
            })),
          }
        : p
    );

    const project = {
      id: generateId(),
      name: "Exported Project",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bpm: state.bpm,
      swing: state.swing,
      masterVolume: state.masterVolume,
      kitId: state.currentKitId,
      patterns,
      currentPatternId: state.currentPatternId,
    };

    return JSON.stringify(project, null, 2);
  },

  importProject: async (json) => {
    const project = JSON.parse(json);
    await get().loadProject(project.id);
  },

  // History
  undo: () => {
    if (historyIndex <= 0) return;
    historyIndex--;
    const entry = history[historyIndex];
    set({
      tracks: entry.tracks,
      patterns: entry.patterns,
      currentPatternId: entry.currentPatternId,
      historyIndex,
    });
  },

  redo: () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    const entry = history[historyIndex];
    set({
      tracks: entry.tracks,
      patterns: entry.patterns,
      currentPatternId: entry.currentPatternId,
      historyIndex,
    });
  },

  canUndo: () => historyIndex > 0,

  canRedo: () => historyIndex < history.length - 1,
}));

// Export audio engine for visualizer access
export { audioEngine };
