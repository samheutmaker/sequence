/**
 * Beat Bot Pro - Drum Kit Definitions
 * 5 built-in kits using bundled samples
 */

import type { DrumKit } from "../types";

export const DRUM_KITS: DrumKit[] = [
  {
    id: "808-classic",
    name: "808 Classic",
    category: "electronic",
    color: "#f97316", // Orange
    tracks: [
      { name: "Kick", sampleUrl: "/samples/kick-808.mp3", defaultVolume: 0.9 },
      { name: "Snare", sampleUrl: "/samples/snare-808.mp3", defaultVolume: 0.8 },
      { name: "Hi-Hat", sampleUrl: "/samples/hihat-808.mp3", defaultVolume: 0.7 },
      { name: "Clap", sampleUrl: "/samples/clap-808.mp3", defaultVolume: 0.75 },
      { name: "Open Hat", sampleUrl: "/samples/openhat-808.mp3", defaultVolume: 0.6 },
      { name: "Perc", sampleUrl: "/samples/perc-808.mp3", defaultVolume: 0.65 },
      { name: "Cowbell", sampleUrl: "/samples/cowbell-808.mp3", defaultVolume: 0.5 },
      { name: "Crash", sampleUrl: "/samples/crash-808.mp3", defaultVolume: 0.55 },
    ],
  },
  {
    id: "electro-909",
    name: "Electro 909",
    category: "electronic",
    color: "#3b82f6", // Blue
    tracks: [
      { name: "Kick", sampleUrl: "/samples/kick-electro01.mp3", defaultVolume: 0.9 },
      { name: "Snare", sampleUrl: "/samples/snare-analog.mp3", defaultVolume: 0.8 },
      { name: "Hi-Hat", sampleUrl: "/samples/hihat-analog.mp3", defaultVolume: 0.7 },
      { name: "Clap", sampleUrl: "/samples/clap-analog.mp3", defaultVolume: 0.75 },
      { name: "Open Hat", sampleUrl: "/samples/openhat-analog.mp3", defaultVolume: 0.6 },
      { name: "Perc", sampleUrl: "/samples/perc-chirpy.mp3", defaultVolume: 0.65 },
      { name: "Shaker", sampleUrl: "/samples/shaker-analog.mp3", defaultVolume: 0.5 },
      { name: "Crash", sampleUrl: "/samples/crash-noise.mp3", defaultVolume: 0.55 },
    ],
  },
  {
    id: "acoustic",
    name: "Acoustic Kit",
    category: "acoustic",
    color: "#22c55e", // Green
    tracks: [
      { name: "Kick", sampleUrl: "/samples/kick-acoustic01.mp3", defaultVolume: 0.85 },
      { name: "Snare", sampleUrl: "/samples/snare-acoustic01.mp3", defaultVolume: 0.8 },
      { name: "Hi-Hat", sampleUrl: "/samples/hihat-acoustic01.mp3", defaultVolume: 0.65 },
      { name: "Clap", sampleUrl: "/samples/clap-slapper.mp3", defaultVolume: 0.7 },
      { name: "Open Hat", sampleUrl: "/samples/openhat-acoustic01.mp3", defaultVolume: 0.55 },
      { name: "Ride", sampleUrl: "/samples/ride-acoustic01.mp3", defaultVolume: 0.5 },
      { name: "Tom", sampleUrl: "/samples/tom-acoustic01.mp3", defaultVolume: 0.7 },
      { name: "Crash", sampleUrl: "/samples/crash-acoustic.mp3", defaultVolume: 0.5 },
    ],
  },
  {
    id: "lofi-tape",
    name: "Lo-Fi Tape",
    category: "lofi",
    color: "#a855f7", // Purple
    tracks: [
      { name: "Kick", sampleUrl: "/samples/kick-tape.mp3", defaultVolume: 0.85 },
      { name: "Snare", sampleUrl: "/samples/snare-tape.mp3", defaultVolume: 0.75 },
      { name: "Hi-Hat", sampleUrl: "/samples/hihat-plain.mp3", defaultVolume: 0.6 },
      { name: "Clap", sampleUrl: "/samples/clap-tape.mp3", defaultVolume: 0.7 },
      { name: "Open Hat", sampleUrl: "/samples/openhat-tight.mp3", defaultVolume: 0.55 },
      { name: "Shaker", sampleUrl: "/samples/shaker-shuffle.mp3", defaultVolume: 0.5 },
      { name: "Perc", sampleUrl: "/samples/perc-hollow.mp3", defaultVolume: 0.6 },
      { name: "Crash", sampleUrl: "/samples/crash-tape.mp3", defaultVolume: 0.45 },
    ],
  },
  {
    id: "world-tribal",
    name: "World Tribal",
    category: "world",
    color: "#eab308", // Yellow
    tracks: [
      { name: "Kick", sampleUrl: "/samples/kick-stomp.mp3", defaultVolume: 0.9 },
      { name: "Snare", sampleUrl: "/samples/snare-brute.mp3", defaultVolume: 0.8 },
      { name: "Shaker", sampleUrl: "/samples/shaker-suckup.mp3", defaultVolume: 0.65 },
      { name: "Tribal", sampleUrl: "/samples/perc-tribal.mp3", defaultVolume: 0.75 },
      { name: "Tambo", sampleUrl: "/samples/perc-tambo.mp3", defaultVolume: 0.6 },
      { name: "Metal", sampleUrl: "/samples/perc-metal.mp3", defaultVolume: 0.55 },
      { name: "Hollow", sampleUrl: "/samples/perc-hollow.mp3", defaultVolume: 0.6 },
      { name: "Crash", sampleUrl: "/samples/crash-noise.mp3", defaultVolume: 0.5 },
    ],
  },
];

// Get kit by ID
export const getKitById = (id: string): DrumKit | undefined =>
  DRUM_KITS.find((kit) => kit.id === id);

// Default kit
export const DEFAULT_KIT_ID = "lofi-tape";
