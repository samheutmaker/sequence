/**
 * Beat Bot Pro - Preset Beat Library
 * Sick trap beat patterns ready to load
 */

import type { Step } from "../types";

// Helper to create a step
const on = (velocity: number = 0.8): Step => ({ active: true, velocity });
const off: Step = { active: false, velocity: 0.8 };

// High, medium, low velocity shortcuts
const H = on(1.0);   // Hard hit
const M = on(0.7);   // Medium hit
const L = on(0.4);   // Soft/ghost note
const _ = off;       // Off

export interface BeatPreset {
  id: string;
  name: string;
  category: string;
  bpm: number;
  swing: number;
  description: string;
  // Pattern for each track (8 tracks x 16 steps)
  // Order: Kick, Snare, Hi-Hat, Clap, Open Hat, Perc, Cowbell/Shaker, Crash
  pattern: Step[][];
}

export const BEAT_PRESETS: BeatPreset[] = [
  {
    id: "classic-trap",
    name: "Classic Trap",
    category: "Trap",
    bpm: 140,
    swing: 0,
    description: "The essential trap bounce with rolling hi-hats",
    pattern: [
      // Kick - syncopated trap pattern
      [H, _, _, _, _, _, H, _, _, _, H, _, _, _, _, _],
      // Snare - on 5 and 13
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Hi-Hat - rolling 16ths with accents
      [H, L, M, L, H, L, M, L, H, L, M, L, H, L, M, L],
      // Clap - layered with snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat - offbeat accents
      [_, _, _, _, _, _, _, M, _, _, _, _, _, _, _, M],
      // Perc - 808 cowbell pattern
      [_, _, M, _, _, _, M, _, _, _, M, _, _, _, M, _],
      // Shaker/Cowbell
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Crash - top of pattern
      [M, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "hard-trap",
    name: "Hard Trap",
    category: "Trap",
    bpm: 150,
    swing: 0,
    description: "Aggressive kicks and snappy snares",
    pattern: [
      // Kick - hard hitting
      [H, _, _, H, _, _, H, _, _, _, H, _, H, _, _, _],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, H],
      // Hi-Hat - triplet feel
      [H, M, H, L, H, M, H, L, H, M, H, L, H, M, H, L],
      // Clap
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, H, _],
      // Perc
      [_, _, _, M, _, _, _, M, _, _, _, M, _, _, _, M],
      // Shaker
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Crash
      [H, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "atlanta-bounce",
    name: "Atlanta Bounce",
    category: "Trap",
    bpm: 138,
    swing: 15,
    description: "Bouncy ATL style with swing",
    pattern: [
      // Kick - bounce pattern
      [H, _, _, _, _, _, H, _, _, H, _, _, _, _, H, _],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Hi-Hat - swung
      [H, _, H, L, H, _, H, L, H, _, H, L, H, _, H, L],
      // Clap
      [_, _, _, _, M, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, H, _, _, _, _, _, _, _, H, _],
      // Perc
      [_, M, _, _, _, M, _, _, _, M, _, _, _, M, _, _],
      // Shaker
      [L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L],
      // Crash
      [M, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "drill-beat",
    name: "UK Drill",
    category: "Drill",
    bpm: 140,
    swing: 0,
    description: "Dark drill pattern with sliding 808s",
    pattern: [
      // Kick - drill bounce
      [H, _, _, H, _, _, _, H, _, _, H, _, _, H, _, _],
      // Snare - offbeat snares
      [_, _, _, _, H, _, _, _, _, _, _, H, _, _, H, _],
      // Hi-Hat - drill rolls
      [H, H, H, M, H, H, H, M, H, H, H, M, H, H, H, M],
      // Clap
      [_, _, _, _, _, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, _, H, _, _, _, _, _, _, _, H],
      // Perc - rim shots
      [_, _, M, _, _, _, M, _, _, _, M, _, _, _, M, _],
      // Shaker
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Crash
      [H, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "melodic-trap",
    name: "Melodic Trap",
    category: "Trap",
    bpm: 132,
    swing: 10,
    description: "Smooth melodic vibes, lighter hits",
    pattern: [
      // Kick - sparse and smooth
      [H, _, _, _, _, _, _, _, H, _, _, _, _, _, H, _],
      // Snare
      [_, _, _, _, M, _, _, _, _, _, _, _, M, _, _, _],
      // Hi-Hat - gentle rolls
      [M, L, M, L, M, L, M, L, M, L, M, L, M, L, M, L],
      // Clap - soft layer
      [_, _, _, _, L, _, _, _, _, _, _, _, M, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, M, _, _, _, _, _, _, _, M, _],
      // Perc
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Shaker - gentle
      [L, _, L, _, L, _, L, _, L, _, L, _, L, _, L, _],
      // Crash
      [L, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "808-mafia",
    name: "808 Mafia",
    category: "Trap",
    bpm: 145,
    swing: 0,
    description: "Heavy 808 with rapid hi-hats",
    pattern: [
      // Kick - heavy 808 pattern
      [H, _, _, _, _, _, H, H, _, _, H, _, _, H, _, _],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Hi-Hat - machine gun
      [H, H, H, H, H, H, H, H, H, H, H, H, H, H, H, H],
      // Clap
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, H],
      // Perc
      [_, _, _, _, _, _, _, _, _, M, _, _, _, _, _, _],
      // Shaker
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Crash
      [H, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "future-trap",
    name: "Future Trap",
    category: "Trap",
    bpm: 155,
    swing: 0,
    description: "Futuristic patterns with complex rhythms",
    pattern: [
      // Kick - glitchy
      [H, _, H, _, _, _, H, _, _, H, _, _, H, _, _, H],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, H, _, _, H, _],
      // Hi-Hat - complex
      [H, L, H, H, L, H, L, H, H, L, H, H, L, H, L, H],
      // Clap
      [_, _, _, _, M, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, _, M, _, _, _, _, _, _, _, M],
      // Perc - glitchy
      [_, M, _, _, _, L, _, _, _, M, _, _, _, L, _, _],
      // Shaker
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Crash
      [H, _, _, _, _, _, _, _, H, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "travis-scott",
    name: "Astroworld",
    category: "Trap",
    bpm: 136,
    swing: 20,
    description: "Psychedelic trap with heavy swing",
    pattern: [
      // Kick
      [H, _, _, _, _, _, H, _, _, _, _, _, H, _, _, _],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Hi-Hat - swung triplets
      [H, _, M, _, H, _, M, _, H, _, M, _, H, _, M, _],
      // Clap
      [_, _, _, _, M, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, _, H, _, _, _, _, _, _, _, H],
      // Perc
      [_, _, _, _, _, M, _, _, _, _, _, _, _, M, _, _],
      // Shaker
      [L, L, L, L, L, L, L, L, L, L, L, L, L, L, L, L],
      // Crash
      [M, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "metro-boomin",
    name: "Metro Style",
    category: "Trap",
    bpm: 142,
    swing: 5,
    description: "Producer tag worthy bounce",
    pattern: [
      // Kick - signature bounce
      [H, _, _, _, _, _, H, _, _, _, H, _, _, H, _, _],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Hi-Hat
      [H, M, H, L, H, M, H, L, H, M, H, L, H, M, H, L],
      // Clap
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, H, _],
      // Perc - trademark percs
      [_, _, M, _, _, _, _, M, _, _, M, _, _, _, _, M],
      // Shaker
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Crash
      [H, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "phonk",
    name: "Phonk Drift",
    category: "Phonk",
    bpm: 130,
    swing: 25,
    description: "Memphis-style cowbell phonk",
    pattern: [
      // Kick - memphis bounce
      [H, _, _, H, _, _, H, _, _, H, _, _, H, _, _, _],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Hi-Hat
      [H, _, H, _, H, _, H, _, H, _, H, _, H, _, H, _],
      // Clap
      [_, _, _, _, M, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, H, _, _, _, _, _, _, _, H, _],
      // Perc
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Cowbell - signature phonk
      [M, _, M, _, M, _, M, _, M, _, M, _, M, _, M, _],
      // Crash
      [H, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "southside",
    name: "Southside 808",
    category: "Trap",
    bpm: 148,
    swing: 0,
    description: "808 Mafia co-founder style",
    pattern: [
      // Kick - punchy
      [H, _, _, _, _, H, _, _, H, _, _, _, _, H, _, _],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, H],
      // Hi-Hat - aggressive
      [H, H, M, H, H, M, H, H, M, H, H, M, H, H, M, H],
      // Clap
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, _, H, _, _, _, _, _, _, _, _],
      // Perc
      [_, _, _, _, _, _, _, _, M, _, _, _, _, _, _, M],
      // Shaker
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Crash
      [H, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
  {
    id: "dark-trap",
    name: "Dark Trap",
    category: "Trap",
    bpm: 135,
    swing: 0,
    description: "Menacing and minimal",
    pattern: [
      // Kick - sparse and heavy
      [H, _, _, _, _, _, _, _, H, _, _, _, _, _, _, _],
      // Snare
      [_, _, _, _, H, _, _, _, _, _, _, _, H, _, _, _],
      // Hi-Hat - minimal
      [M, _, M, _, M, _, M, _, M, _, M, _, M, _, M, _],
      // Clap
      [_, _, _, _, _, _, _, _, _, _, _, _, H, _, _, _],
      // Open Hat
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, H, _],
      // Perc - dark percs
      [_, _, _, M, _, _, _, _, _, _, _, M, _, _, _, _],
      // Shaker
      [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
      // Crash
      [M, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    ],
  },
];

// Get preset by ID
export const getPresetById = (id: string): BeatPreset | undefined =>
  BEAT_PRESETS.find((p) => p.id === id);

// Get presets by category
export const getPresetsByCategory = (category: string): BeatPreset[] =>
  BEAT_PRESETS.filter((p) => p.category === category);

// Get all categories
export const getCategories = (): string[] =>
  [...new Set(BEAT_PRESETS.map((p) => p.category))];
