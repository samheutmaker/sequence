/**
 * DAW Audio Engine - Full-featured Web Audio API implementation
 * Supports audio/MIDI tracks, plugins, buses, and master processing
 */

import type {
  DAWTrack,
  Bus,
  MasterChannel,
  MidiNote,
  Region,
  AudioRegion,
  MidiRegion,
  PluginDefinition,
  TrackInsert,
  LoopRegion,
} from '../types/daw';

// Built-in plugin definitions
export const BUILT_IN_PLUGINS: PluginDefinition[] = [
  {
    id: 'channel-eq',
    name: 'Channel EQ',
    category: 'eq',
    type: 'effect',
    parameters: [
      { id: 'lowFreq', name: 'Low Freq', min: 20, max: 500, default: 80, unit: 'Hz', type: 'continuous' },
      { id: 'lowGain', name: 'Low Gain', min: -24, max: 24, default: 0, unit: 'dB', type: 'continuous' },
      { id: 'midFreq', name: 'Mid Freq', min: 200, max: 8000, default: 1000, unit: 'Hz', type: 'continuous' },
      { id: 'midGain', name: 'Mid Gain', min: -24, max: 24, default: 0, unit: 'dB', type: 'continuous' },
      { id: 'midQ', name: 'Mid Q', min: 0.1, max: 10, default: 1, unit: '', type: 'continuous' },
      { id: 'highFreq', name: 'High Freq', min: 1000, max: 20000, default: 8000, unit: 'Hz', type: 'continuous' },
      { id: 'highGain', name: 'High Gain', min: -24, max: 24, default: 0, unit: 'dB', type: 'continuous' },
    ],
    presets: [
      { id: 'flat', name: 'Flat', values: { lowGain: 0, midGain: 0, highGain: 0 } },
      { id: 'warm', name: 'Warm', values: { lowGain: 3, midGain: -1, highGain: -2 } },
      { id: 'bright', name: 'Bright', values: { lowGain: -2, midGain: 1, highGain: 4 } },
      { id: 'vocal-presence', name: 'Vocal Presence', values: { lowFreq: 100, lowGain: -3, midFreq: 3000, midGain: 4, midQ: 2, highGain: 2 } },
      { id: 'bass-boost', name: 'Bass Boost', values: { lowFreq: 80, lowGain: 6, midGain: -2, highGain: -1 } },
      { id: 'air', name: 'Air', values: { lowGain: 0, midGain: 0, highFreq: 12000, highGain: 5 } },
      { id: 'hi-fi', name: 'Hi-Fi', values: { lowFreq: 60, lowGain: 4, midGain: 0, highFreq: 10000, highGain: 3 } },
      { id: 'telephone', name: 'Telephone', values: { lowFreq: 300, lowGain: -18, midFreq: 2000, midGain: 3, highFreq: 3500, highGain: -18 } },
      { id: 'scoop', name: 'Scoop', values: { lowGain: 4, midFreq: 800, midGain: -6, midQ: 1, highGain: 4 } },
      { id: 'de-mud', name: 'De-Mud', values: { lowGain: 0, midFreq: 300, midGain: -4, midQ: 2, highGain: 2 } },
    ],
  },
  {
    id: 'compressor',
    name: 'Compressor',
    category: 'compressor',
    type: 'effect',
    parameters: [
      { id: 'threshold', name: 'Threshold', min: -60, max: 0, default: -20, unit: 'dB', type: 'continuous' },
      { id: 'ratio', name: 'Ratio', min: 1, max: 20, default: 4, unit: ':1', type: 'continuous' },
      { id: 'attack', name: 'Attack', min: 0.1, max: 100, default: 10, unit: 'ms', type: 'continuous' },
      { id: 'release', name: 'Release', min: 10, max: 1000, default: 100, unit: 'ms', type: 'continuous' },
      { id: 'knee', name: 'Knee', min: 0, max: 40, default: 6, unit: 'dB', type: 'continuous' },
      { id: 'makeupGain', name: 'Makeup', min: 0, max: 24, default: 0, unit: 'dB', type: 'continuous' },
    ],
    presets: [
      { id: 'gentle', name: 'Gentle', values: { threshold: -15, ratio: 2, attack: 20, release: 200 } },
      { id: 'punchy', name: 'Punchy', values: { threshold: -20, ratio: 4, attack: 5, release: 50 } },
      { id: 'limiting', name: 'Limiting', values: { threshold: -10, ratio: 20, attack: 0.1, release: 50 } },
      { id: 'vocal', name: 'Vocal', values: { threshold: -18, ratio: 3, attack: 10, release: 100, knee: 10 } },
      { id: 'drum-bus', name: 'Drum Bus', values: { threshold: -16, ratio: 4, attack: 1, release: 80, knee: 6, makeupGain: 3 } },
      { id: 'parallel', name: 'Parallel Crush', values: { threshold: -30, ratio: 10, attack: 0.5, release: 30, makeupGain: 8 } },
      { id: 'bass', name: 'Bass Tamer', values: { threshold: -12, ratio: 6, attack: 15, release: 150, knee: 12 } },
      { id: 'glue', name: 'Glue', values: { threshold: -20, ratio: 2.5, attack: 30, release: 300, knee: 20 } },
      { id: 'snappy', name: 'Snappy', values: { threshold: -24, ratio: 3, attack: 0.5, release: 40, makeupGain: 2 } },
      { id: 'opto', name: 'Opto Style', values: { threshold: -22, ratio: 3, attack: 50, release: 500, knee: 30 } },
    ],
  },
  {
    id: 'reverb',
    name: 'Space Designer',
    category: 'reverb',
    type: 'effect',
    parameters: [
      { id: 'size', name: 'Size', min: 0, max: 1, default: 0.5, unit: '', type: 'continuous' },
      { id: 'decay', name: 'Decay', min: 0.1, max: 10, default: 2, unit: 's', type: 'continuous' },
      { id: 'damping', name: 'Damping', min: 0, max: 1, default: 0.5, unit: '', type: 'continuous' },
      { id: 'predelay', name: 'Pre-delay', min: 0, max: 100, default: 10, unit: 'ms', type: 'continuous' },
      { id: 'mix', name: 'Mix', min: 0, max: 1, default: 0.3, unit: '', type: 'continuous' },
    ],
    presets: [
      { id: 'room', name: 'Room', values: { size: 0.3, decay: 0.8, damping: 0.6, mix: 0.2 } },
      { id: 'hall', name: 'Hall', values: { size: 0.7, decay: 2.5, damping: 0.4, mix: 0.3 } },
      { id: 'plate', name: 'Plate', values: { size: 0.5, decay: 1.5, damping: 0.3, mix: 0.25 } },
      { id: 'cathedral', name: 'Cathedral', values: { size: 0.95, decay: 6, damping: 0.2, predelay: 40, mix: 0.35 } },
      { id: 'studio', name: 'Studio', values: { size: 0.25, decay: 0.5, damping: 0.7, predelay: 5, mix: 0.15 } },
      { id: 'vocal-plate', name: 'Vocal Plate', values: { size: 0.45, decay: 1.8, damping: 0.4, predelay: 20, mix: 0.22 } },
      { id: 'spring', name: 'Spring', values: { size: 0.35, decay: 1.2, damping: 0.5, predelay: 0, mix: 0.28 } },
      { id: 'ambient-pad', name: 'Ambient Pad', values: { size: 0.85, decay: 4.5, damping: 0.25, predelay: 60, mix: 0.45 } },
      { id: 'drum-room', name: 'Drum Room', values: { size: 0.4, decay: 0.6, damping: 0.65, predelay: 0, mix: 0.18 } },
      { id: 'shimmer', name: 'Shimmer', values: { size: 0.9, decay: 5, damping: 0.15, predelay: 30, mix: 0.4 } },
      { id: 'garage', name: 'Garage', values: { size: 0.55, decay: 1.0, damping: 0.55, predelay: 8, mix: 0.25 } },
    ],
  },
  {
    id: 'delay',
    name: 'Stereo Delay',
    category: 'delay',
    type: 'effect',
    parameters: [
      { id: 'timeL', name: 'Time L', min: 0.01, max: 2, default: 0.25, unit: 's', type: 'continuous' },
      { id: 'timeR', name: 'Time R', min: 0.01, max: 2, default: 0.375, unit: 's', type: 'continuous' },
      { id: 'feedback', name: 'Feedback', min: 0, max: 0.95, default: 0.3, unit: '', type: 'continuous' },
      { id: 'lowCut', name: 'Low Cut', min: 20, max: 2000, default: 100, unit: 'Hz', type: 'continuous' },
      { id: 'highCut', name: 'High Cut', min: 1000, max: 20000, default: 8000, unit: 'Hz', type: 'continuous' },
      { id: 'mix', name: 'Mix', min: 0, max: 1, default: 0.3, unit: '', type: 'continuous' },
    ],
    presets: [
      { id: 'slapback', name: 'Slapback', values: { timeL: 0.1, timeR: 0.1, feedback: 0.1, mix: 0.3 } },
      { id: 'pingpong', name: 'Ping Pong', values: { timeL: 0.25, timeR: 0.5, feedback: 0.4, mix: 0.35 } },
      { id: 'ambient', name: 'Ambient', values: { timeL: 0.5, timeR: 0.75, feedback: 0.5, mix: 0.4 } },
      { id: 'dotted-8th', name: 'Dotted 8th', values: { timeL: 0.375, timeR: 0.375, feedback: 0.35, mix: 0.3 } },
      { id: 'tape-echo', name: 'Tape Echo', values: { timeL: 0.333, timeR: 0.333, feedback: 0.55, lowCut: 150, highCut: 4000, mix: 0.35 } },
      { id: 'dub-delay', name: 'Dub Delay', values: { timeL: 0.5, timeR: 0.5, feedback: 0.65, lowCut: 200, highCut: 3000, mix: 0.4 } },
      { id: 'wide-stereo', name: 'Wide Stereo', values: { timeL: 0.15, timeR: 0.22, feedback: 0.25, mix: 0.35 } },
      { id: 'rhythmic', name: 'Rhythmic', values: { timeL: 0.125, timeR: 0.25, feedback: 0.45, mix: 0.3 } },
      { id: 'vocal-throw', name: 'Vocal Throw', values: { timeL: 0.4, timeR: 0.4, feedback: 0.2, highCut: 6000, mix: 0.25 } },
      { id: 'haunted', name: 'Haunted', values: { timeL: 0.666, timeR: 0.8, feedback: 0.7, lowCut: 300, highCut: 2500, mix: 0.45 } },
    ],
  },
  {
    id: 'distortion',
    name: 'Amp Designer',
    category: 'distortion',
    type: 'effect',
    parameters: [
      { id: 'drive', name: 'Drive', min: 0, max: 1, default: 0.3, unit: '', type: 'continuous' },
      { id: 'tone', name: 'Tone', min: 0, max: 1, default: 0.5, unit: '', type: 'continuous' },
      { id: 'output', name: 'Output', min: 0, max: 1, default: 0.5, unit: '', type: 'continuous' },
      { id: 'type', name: 'Type', min: 0, max: 3, default: 0, unit: '', type: 'stepped', steps: [0, 1, 2, 3] },
    ],
    presets: [
      { id: 'clean', name: 'Clean', values: { drive: 0.1, tone: 0.6, output: 0.7 } },
      { id: 'crunch', name: 'Crunch', values: { drive: 0.4, tone: 0.5, output: 0.5 } },
      { id: 'highgain', name: 'High Gain', values: { drive: 0.8, tone: 0.4, output: 0.4 } },
      { id: 'warm-tape', name: 'Warm Tape', values: { drive: 0.25, tone: 0.45, output: 0.65, type: 1 } },
      { id: 'tube-overdrive', name: 'Tube Overdrive', values: { drive: 0.35, tone: 0.55, output: 0.55 } },
      { id: 'fuzz', name: 'Fuzz', values: { drive: 0.9, tone: 0.35, output: 0.35, type: 2 } },
      { id: 'lo-fi', name: 'Lo-Fi', values: { drive: 0.5, tone: 0.3, output: 0.5, type: 3 } },
      { id: 'edge', name: 'Edge', values: { drive: 0.55, tone: 0.65, output: 0.45 } },
      { id: 'subtle-saturation', name: 'Subtle Saturation', values: { drive: 0.15, tone: 0.5, output: 0.75 } },
      { id: 'bass-growl', name: 'Bass Growl', values: { drive: 0.45, tone: 0.35, output: 0.6 } },
    ],
  },
  {
    id: 'chorus',
    name: 'Ensemble',
    category: 'modulation',
    type: 'effect',
    parameters: [
      { id: 'rate', name: 'Rate', min: 0.1, max: 10, default: 1, unit: 'Hz', type: 'continuous' },
      { id: 'depth', name: 'Depth', min: 0, max: 1, default: 0.5, unit: '', type: 'continuous' },
      { id: 'mix', name: 'Mix', min: 0, max: 1, default: 0.5, unit: '', type: 'continuous' },
    ],
    presets: [
      { id: 'subtle', name: 'Subtle', values: { rate: 0.5, depth: 0.3, mix: 0.3 } },
      { id: 'lush', name: 'Lush', values: { rate: 1, depth: 0.6, mix: 0.5 } },
      { id: '80s-chorus', name: '80s Chorus', values: { rate: 0.8, depth: 0.7, mix: 0.45 } },
      { id: 'thick-pad', name: 'Thick Pad', values: { rate: 0.3, depth: 0.8, mix: 0.6 } },
      { id: 'rotary', name: 'Rotary', values: { rate: 1.5, depth: 0.5, mix: 0.4 } },
      { id: 'shimmer-chorus', name: 'Shimmer', values: { rate: 2.5, depth: 0.4, mix: 0.35 } },
      { id: 'wide-detune', name: 'Wide Detune', values: { rate: 0.2, depth: 0.9, mix: 0.5 } },
      { id: 'vibrato', name: 'Vibrato', values: { rate: 5, depth: 0.3, mix: 0.7 } },
    ],
  },
  {
    id: 'limiter',
    name: 'Adaptive Limiter',
    category: 'utility',
    type: 'effect',
    parameters: [
      { id: 'input', name: 'Input', min: -12, max: 12, default: 0, unit: 'dB', type: 'continuous' },
      { id: 'output', name: 'Output', min: -12, max: 0, default: -0.3, unit: 'dB', type: 'continuous' },
      { id: 'lookahead', name: 'Lookahead', min: 0, max: 20, default: 2, unit: 'ms', type: 'continuous' },
      { id: 'release', name: 'Release', min: 10, max: 1000, default: 100, unit: 'ms', type: 'continuous' },
    ],
    presets: [
      { id: 'mastering', name: 'Mastering', values: { input: 0, output: -0.3, lookahead: 5 } },
      { id: 'transparent', name: 'Transparent', values: { input: 0, output: -1, lookahead: 10 } },
      { id: 'brick-wall', name: 'Brick Wall', values: { input: 3, output: -0.1, lookahead: 2, release: 50 } },
      { id: 'gentle-limit', name: 'Gentle Limit', values: { input: -2, output: -1.5, lookahead: 15, release: 200 } },
      { id: 'loud', name: 'Loud', values: { input: 6, output: -0.3, lookahead: 3, release: 80 } },
      { id: 'streaming', name: 'Streaming', values: { input: 0, output: -1, lookahead: 8, release: 120 } },
      { id: 'vintage', name: 'Vintage', values: { input: 2, output: -0.5, lookahead: 1, release: 300 } },
    ],
  },
];

// Built-in instruments
export const BUILT_IN_INSTRUMENTS: PluginDefinition[] = [
  {
    id: 'retro-synth',
    name: 'Retro Synth',
    category: 'synth',
    type: 'instrument',
    parameters: [
      { id: 'oscillator', name: 'Oscillator', min: 0, max: 3, default: 0, unit: '', type: 'stepped', steps: [0, 1, 2, 3] },
      { id: 'cutoff', name: 'Cutoff', min: 20, max: 20000, default: 5000, unit: 'Hz', type: 'continuous' },
      { id: 'resonance', name: 'Resonance', min: 0, max: 1, default: 0.2, unit: '', type: 'continuous' },
      { id: 'attack', name: 'Attack', min: 0.001, max: 2, default: 0.01, unit: 's', type: 'continuous' },
      { id: 'decay', name: 'Decay', min: 0.001, max: 2, default: 0.1, unit: 's', type: 'continuous' },
      { id: 'sustain', name: 'Sustain', min: 0, max: 1, default: 0.7, unit: '', type: 'continuous' },
      { id: 'release', name: 'Release', min: 0.001, max: 5, default: 0.3, unit: 's', type: 'continuous' },
    ],
    presets: [
      { id: 'pad', name: 'Warm Pad', values: { oscillator: 1, cutoff: 3000, attack: 0.5, release: 1 } },
      { id: 'bass', name: 'Sub Bass', values: { oscillator: 0, cutoff: 800, attack: 0.01, sustain: 1 } },
      { id: 'lead', name: 'Classic Lead', values: { oscillator: 2, cutoff: 8000, resonance: 0.4 } },
    ],
  },
  {
    id: 'sampler',
    name: 'Sampler',
    category: 'sampler',
    type: 'instrument',
    parameters: [
      { id: 'attack', name: 'Attack', min: 0, max: 2, default: 0, unit: 's', type: 'continuous' },
      { id: 'decay', name: 'Decay', min: 0, max: 2, default: 0.1, unit: 's', type: 'continuous' },
      { id: 'sustain', name: 'Sustain', min: 0, max: 1, default: 1, unit: '', type: 'continuous' },
      { id: 'release', name: 'Release', min: 0, max: 5, default: 0.1, unit: 's', type: 'continuous' },
      { id: 'pitch', name: 'Pitch', min: -24, max: 24, default: 0, unit: 'st', type: 'continuous' },
    ],
    presets: [],
  },
  {
    id: 'drum-machine',
    name: 'Drum Machine Designer',
    category: 'sampler',
    type: 'instrument',
    parameters: [
      { id: 'kit', name: 'Kit', min: 0, max: 4, default: 0, unit: '', type: 'stepped', steps: [0, 1, 2, 3, 4] },
      { id: 'pitch', name: 'Pitch', min: -12, max: 12, default: 0, unit: 'st', type: 'continuous' },
      { id: 'decay', name: 'Decay', min: 0.1, max: 2, default: 1, unit: 's', type: 'continuous' },
    ],
    presets: [],
  },
];

// Effect node wrapper
class EffectNode {
  constructor(
    public readonly pluginId: string,
    public readonly inputNode: AudioNode,
    public readonly outputNode: AudioNode,
    public parameters: Record<string, AudioParam | { value: number }>,
  ) {}
}

// Drum kit sample mapping (MIDI note -> sample URL)
const DRUM_KIT_808: Record<number, string> = {
  36: '/samples/kick-808.mp3',       // C1 - Kick
  37: '/samples/snare-808.mp3',      // C#1 - Snare (side stick)
  38: '/samples/snare-808.mp3',      // D1 - Snare
  39: '/samples/clap-808.mp3',       // D#1 - Clap
  40: '/samples/snare-808.mp3',      // E1 - Snare alt
  41: '/samples/tom-808.mp3',        // F1 - Low Tom
  42: '/samples/hihat-808.mp3',      // F#1 - Closed Hi-Hat
  43: '/samples/tom-808.mp3',        // G1 - Low Tom
  44: '/samples/hihat-808.mp3',      // G#1 - Pedal Hi-Hat
  45: '/samples/tom-808.mp3',        // A1 - Mid Tom
  46: '/samples/openhat-808.mp3',    // A#1 - Open Hi-Hat
  47: '/samples/tom-808.mp3',        // B1 - Mid Tom
  48: '/samples/tom-808.mp3',        // C2 - High Tom
  49: '/samples/crash-808.mp3',      // C#2 - Crash Cymbal
  50: '/samples/tom-808.mp3',        // D2 - High Tom
  51: '/samples/ride-acoustic01.mp3', // D#2 - Ride Cymbal
  52: '/samples/crash-808.mp3',      // E2 - Crash Cymbal
  53: '/samples/ride-acoustic02.mp3', // F2 - Ride Bell
  54: '/samples/shaker-analog.mp3',  // F#2 - Tambourine
  55: '/samples/crash-808.mp3',      // G2 - Splash Cymbal
  56: '/samples/cowbell-808.mp3',    // G#2 - Cowbell
};

// Drum Sampler for drummer tracks
class DrumSampler {
  private ctx: AudioContext;
  private outputNode: GainNode;
  private samples: Map<number, AudioBuffer> = new Map();
  private loadedKit: string = '';

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.8;
    this.outputNode.connect(output);
  }

  async loadKit(kitMapping: Record<number, string>): Promise<void> {
    const kitKey = JSON.stringify(kitMapping);
    if (this.loadedKit === kitKey) return;

    // Load all samples in the kit
    const loadPromises: Promise<void>[] = [];

    for (const [note, url] of Object.entries(kitMapping)) {
      const noteNum = parseInt(note);
      loadPromises.push(
        fetch(url)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => this.ctx.decodeAudioData(arrayBuffer))
          .then(audioBuffer => {
            this.samples.set(noteNum, audioBuffer);
          })
          .catch(err => {
            console.warn(`Failed to load drum sample ${url}:`, err);
          })
      );
    }

    await Promise.all(loadPromises);
    this.loadedKit = kitKey;
  }

  playNote(note: number, velocity: number, time: number) {
    const buffer = this.samples.get(note);
    console.log(`[DrumSampler] playNote: note=${note}, hasBuffer=${!!buffer}, time=${time.toFixed(3)}, currentTime=${this.ctx.currentTime.toFixed(3)}`);
    if (!buffer) {
      // Fallback: try to find a close sample
      const closest = this.findClosestSample(note);
      if (!closest) {
        console.warn(`[DrumSampler] No sample found for note ${note}`);
        return;
      }
      this.playSample(closest, velocity, time);
      return;
    }
    this.playSample(buffer, velocity, time);
  }

  private playSample(buffer: AudioBuffer, velocity: number, time: number) {
    console.log(`[DrumSampler] playSample: duration=${buffer.duration.toFixed(3)}s, velocity=${velocity}, gain=${((velocity / 127) * 0.9).toFixed(3)}, contextState=${this.ctx.state}`);

    // Check if context is running
    if (this.ctx.state !== 'running') {
      console.warn(`[DrumSampler] AudioContext is ${this.ctx.state}, audio may not play`);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const velocityGain = this.ctx.createGain();
    velocityGain.gain.value = (velocity / 127) * 0.9;

    source.connect(velocityGain);
    velocityGain.connect(this.outputNode);

    // Log the full gain chain
    console.log(`[DrumSampler] Chain: source -> velocityGain(${velocityGain.gain.value.toFixed(3)}) -> outputNode(${this.outputNode.gain.value.toFixed(3)})`);

    source.start(time);
    console.log(`[DrumSampler] source.start called at time ${time.toFixed(3)}, currentTime=${this.ctx.currentTime.toFixed(3)}`);
  }

  private findClosestSample(note: number): AudioBuffer | null {
    // Look for closest available sample
    for (let offset = 0; offset < 12; offset++) {
      if (this.samples.has(note + offset)) return this.samples.get(note + offset)!;
      if (this.samples.has(note - offset)) return this.samples.get(note - offset)!;
    }
    return null;
  }

  dispose() {
    this.outputNode.disconnect();
    this.samples.clear();
  }
}

// Enhanced synthesizer for MIDI playback with better bass and sound quality
class SimpleSynth {
  private ctx: AudioContext;
  private outputNode: GainNode;
  private activeVoices: Map<number, {
    osc: OscillatorNode;
    subOsc?: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
  }> = new Map();
  private oscillatorType: OscillatorType = 'sawtooth';
  private filterFreq: number = 5000;
  private filterResonance: number = 2;
  private subOscEnabled: boolean = true;
  private subOscLevel: number = 0.5;
  private adsr = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 };
  private filterAdsr = { attack: 0.05, decay: 0.2, sustain: 0.3, range: 4000 };

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.4;
    this.outputNode.connect(output);
  }

  setOscillatorType(type: OscillatorType) {
    this.oscillatorType = type;
  }

  setFilterFreq(freq: number) {
    this.filterFreq = freq;
  }

  setFilterResonance(q: number) {
    this.filterResonance = q;
  }

  setSubOscEnabled(enabled: boolean) {
    this.subOscEnabled = enabled;
  }

  setSubOscLevel(level: number) {
    this.subOscLevel = level;
  }

  setADSR(attack: number, decay: number, sustain: number, release: number) {
    this.adsr = { attack, decay, sustain, release };
  }

  setFilterADSR(attack: number, decay: number, sustain: number, range: number) {
    this.filterAdsr = { attack, decay, sustain, range };
  }

  getParameters() {
    return {
      oscillatorType: this.oscillatorType,
      filterFreq: this.filterFreq,
      filterResonance: this.filterResonance,
      attack: this.adsr.attack,
      decay: this.adsr.decay,
      sustain: this.adsr.sustain,
      release: this.adsr.release,
      subOscEnabled: this.subOscEnabled,
      subOscLevel: this.subOscLevel,
      filterAdsrAttack: this.filterAdsr.attack,
      filterAdsrDecay: this.filterAdsr.decay,
      filterAdsrSustain: this.filterAdsr.sustain,
      filterAdsrRange: this.filterAdsr.range,
    };
  }

  noteOn(note: number, velocity: number, time: number) {
    const freq = 440 * Math.pow(2, (note - 69) / 12);
    const velGain = (velocity / 127) * 0.8;

    // Main oscillator
    const osc = this.ctx.createOscillator();
    osc.type = this.oscillatorType;
    osc.frequency.value = freq;

    // Main oscillator gain (for mixing with sub)
    const oscGain = this.ctx.createGain();
    oscGain.gain.value = this.subOscEnabled ? 0.7 : 1.0;

    // Sub oscillator (one octave down, sine wave for fat bass)
    let subOsc: OscillatorNode | undefined;
    let subGain: GainNode | undefined;
    if (this.subOscEnabled && note < 72) { // Only add sub for lower notes
      subOsc = this.ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.value = freq / 2; // One octave down

      subGain = this.ctx.createGain();
      subGain.gain.value = this.subOscLevel;
    }

    // Filter with envelope
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = this.filterResonance;

    // Calculate filter base frequency based on note (higher notes get brighter filter)
    const filterBase = Math.min(this.filterFreq, Math.max(200, this.filterFreq * (note / 60)));

    // Filter envelope
    filter.frequency.setValueAtTime(filterBase, time);
    filter.frequency.linearRampToValueAtTime(
      Math.min(20000, filterBase + this.filterAdsr.range),
      time + this.filterAdsr.attack
    );
    filter.frequency.linearRampToValueAtTime(
      filterBase + (this.filterAdsr.range * this.filterAdsr.sustain),
      time + this.filterAdsr.attack + this.filterAdsr.decay
    );

    // Master gain for this voice with ADSR
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velGain, time + this.adsr.attack);
    gain.gain.linearRampToValueAtTime(velGain * this.adsr.sustain, time + this.adsr.attack + this.adsr.decay);

    // Slight saturation/warmth using waveshaper for bass notes
    let waveshaper: WaveShaperNode | undefined;
    if (note < 60) {
      waveshaper = this.ctx.createWaveShaper();
      waveshaper.curve = this.makeSoftClipCurve(0.3);
      waveshaper.oversample = '2x';
    }

    // Connect the signal chain
    osc.connect(oscGain);
    if (subOsc && subGain) {
      subOsc.connect(subGain);
      subGain.connect(filter);
    }
    oscGain.connect(filter);

    if (waveshaper) {
      filter.connect(waveshaper);
      waveshaper.connect(gain);
    } else {
      filter.connect(gain);
    }

    gain.connect(this.outputNode);

    // Start oscillators
    osc.start(time);
    subOsc?.start(time);

    this.activeVoices.set(note, { osc, subOsc, gain, filter });
  }

  noteOff(note: number, time: number) {
    const voice = this.activeVoices.get(note);
    if (voice) {
      const releaseTime = this.adsr.release;

      // Fade out amplitude
      voice.gain.gain.cancelScheduledValues(time);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, time);
      voice.gain.gain.linearRampToValueAtTime(0, time + releaseTime);

      // Also fade out filter for smoother release
      voice.filter.frequency.cancelScheduledValues(time);
      voice.filter.frequency.setValueAtTime(voice.filter.frequency.value, time);
      voice.filter.frequency.linearRampToValueAtTime(200, time + releaseTime);

      // Stop oscillators after release
      voice.osc.stop(time + releaseTime + 0.1);
      voice.subOsc?.stop(time + releaseTime + 0.1);

      this.activeVoices.delete(note);
    }
  }

  // Create soft clipping curve for warmth
  private makeSoftClipCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 44100;
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    const k = amount * 50;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }

    return curve;
  }

  dispose() {
    this.activeVoices.forEach(voice => {
      voice.osc.stop();
      voice.osc.disconnect();
      voice.subOsc?.stop();
      voice.subOsc?.disconnect();
      voice.gain.disconnect();
      voice.filter.disconnect();
    });
    this.activeVoices.clear();
    this.outputNode.disconnect();
  }
}

// Track processor
class TrackProcessor {
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;
  public readonly panNode: StereoPannerNode;
  private effects: EffectNode[] = [];
  private synth: SimpleSynth | null = null;
  private drumSampler: DrumSampler | null = null;
  private baseVolume: number = 0.8;
  private basePan: number = 0;
  private isMuted: boolean = false;
  private analyser: AnalyserNode;
  private trackType: string;

  constructor(
    private ctx: AudioContext,
    public readonly trackId: string,
    trackType: string,
  ) {
    this.trackType = trackType;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.panNode = ctx.createStereoPanner();

    // Create analyser for metering
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.3;

    // Default chain: input -> pan -> analyser -> output
    this.inputNode.connect(this.panNode);
    this.panNode.connect(this.analyser);
    this.analyser.connect(this.outputNode);

    // Create synth for software instrument tracks
    if (trackType === 'software-instrument' || trackType === 'midi') {
      this.synth = new SimpleSynth(ctx, this.inputNode);
    }

    // Create drum sampler for drummer tracks
    if (trackType === 'drummer') {
      this.drumSampler = new DrumSampler(ctx, this.inputNode);
      // Pre-load the 808 kit
      this.drumSampler.loadKit(DRUM_KIT_808);
    }
  }

  setVolume(value: number) {
    this.baseVolume = value;
    this.applyVolume(value);
  }

  private applyVolume(value: number) {
    if (this.isMuted) return;
    // Convert 0-1 to dB scale (-infinity to +6dB)
    const db = value === 0 ? -Infinity : 20 * Math.log10(value) + 6;
    const gain = Math.pow(10, db / 20);
    this.outputNode.gain.value = Math.max(0, Math.min(4, gain));
  }

  // Automation-friendly volume setter with smooth ramping
  setVolumeAutomation(value: number, time: number) {
    if (this.isMuted) return;
    const db = value === 0 ? -Infinity : 20 * Math.log10(value) + 6;
    const gain = Math.pow(10, db / 20);
    const clampedGain = Math.max(0, Math.min(4, gain));
    // Use setTargetAtTime for smooth automation
    this.outputNode.gain.setTargetAtTime(clampedGain, time, 0.01);
  }

  setPan(value: number) {
    this.basePan = value;
    this.applyPan(value);
  }

  private applyPan(value: number) {
    this.panNode.pan.value = Math.max(-1, Math.min(1, value));
  }

  // Automation-friendly pan setter with smooth ramping
  setPanAutomation(value: number, time: number) {
    const clampedValue = Math.max(-1, Math.min(1, value));
    // Convert from 0-1 normalized to -1 to 1
    const panValue = clampedValue * 2 - 1;
    this.panNode.pan.setTargetAtTime(panValue, time, 0.01);
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    this.inputNode.gain.value = muted ? 0 : 1;
    if (!muted) {
      this.applyVolume(this.baseVolume);
    }
  }

  // Reset to base values (call when stopping playback)
  resetToBaseValues() {
    this.applyVolume(this.baseVolume);
    this.applyPan(this.basePan);
  }

  getBaseVolume(): number {
    return this.baseVolume;
  }

  getBasePan(): number {
    return this.basePan;
  }

  getSynth(): SimpleSynth | null {
    return this.synth;
  }

  getDrumSampler(): DrumSampler | null {
    return this.drumSampler;
  }

  getTrackType(): string {
    return this.trackType;
  }

  // Get RMS level for metering (returns 0-1)
  getMeterLevel(): number {
    // Safety check - make sure analyser is properly connected
    if (!this.analyser) {
      return 0;
    }

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = (data[i] - 128) / 128;
      sum += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }

    const rms = Math.sqrt(sum / data.length);

    // Use peak detection as primary method since RMS can be too quiet
    // Scale peak aggressively to make meters more visible
    const scaled = Math.pow(peak, 0.4) * 1.5; // Use peak with compression curve
    return Math.min(1, scaled);
  }

  // Effect management
  addEffect(pluginId: string, index: number = -1): EffectNode | null {
    const plugin = BUILT_IN_PLUGINS.find(p => p.id === pluginId);
    if (!plugin || !this.panNode) return null;

    const ctx = this.panNode.context as AudioContext;
    let inputNode: AudioNode;
    let outputNode: AudioNode;
    const params: Record<string, AudioParam | { value: number }> = {};

    // Create effect based on plugin type
    switch (pluginId) {
      case 'channel-eq': {
        // 3-band EQ
        const lowShelf = ctx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 80;
        lowShelf.gain.value = 0;

        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 1000;
        mid.Q.value = 1;
        mid.gain.value = 0;

        const highShelf = ctx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 8000;
        highShelf.gain.value = 0;

        lowShelf.connect(mid);
        mid.connect(highShelf);

        inputNode = lowShelf;
        outputNode = highShelf;
        params.lowFreq = lowShelf.frequency;
        params.lowGain = lowShelf.gain;
        params.midFreq = mid.frequency;
        params.midGain = mid.gain;
        params.midQ = mid.Q;
        params.highFreq = highShelf.frequency;
        params.highGain = highShelf.gain;
        break;
      }
      case 'compressor': {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -20;
        comp.ratio.value = 4;
        comp.attack.value = 0.01;
        comp.release.value = 0.1;
        comp.knee.value = 6;

        const makeupGain = ctx.createGain();
        makeupGain.gain.value = 1;

        comp.connect(makeupGain);

        inputNode = comp;
        outputNode = makeupGain;
        params.threshold = comp.threshold;
        params.ratio = comp.ratio;
        params.attack = comp.attack;
        params.release = comp.release;
        params.knee = comp.knee;
        params.makeupGain = makeupGain.gain;
        break;
      }
      case 'reverb': {
        // Simple reverb using convolver approximation with delay network
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const delay1 = ctx.createDelay(0.5);
        const delay2 = ctx.createDelay(0.5);
        const feedback1 = ctx.createGain();
        const feedback2 = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const output = ctx.createGain();

        dryGain.gain.value = 0.7;
        wetGain.gain.value = 0.3;
        delay1.delayTime.value = 0.03;
        delay2.delayTime.value = 0.05;
        feedback1.gain.value = 0.5;
        feedback2.gain.value = 0.4;
        filter.type = 'lowpass';
        filter.frequency.value = 4000;

        // Parallel dry/wet
        const inputSplit = ctx.createGain();
        inputSplit.connect(dryGain);
        inputSplit.connect(delay1);
        inputSplit.connect(delay2);

        delay1.connect(feedback1);
        feedback1.connect(filter);
        delay2.connect(feedback2);
        feedback2.connect(filter);
        filter.connect(wetGain);

        dryGain.connect(output);
        wetGain.connect(output);

        inputNode = inputSplit;
        outputNode = output;
        params.mix = { value: 0.3 };
        params.decay = { value: 2 };
        params.damping = { value: 0.5 };
        break;
      }
      case 'delay': {
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const delayL = ctx.createDelay(2);
        const delayR = ctx.createDelay(2);
        const feedbackL = ctx.createGain();
        const feedbackR = ctx.createGain();
        const lowCut = ctx.createBiquadFilter();
        const highCut = ctx.createBiquadFilter();
        const output = ctx.createGain();
        const merger = ctx.createChannelMerger(2);

        dryGain.gain.value = 0.7;
        wetGain.gain.value = 0.3;
        delayL.delayTime.value = 0.25;
        delayR.delayTime.value = 0.375;
        feedbackL.gain.value = 0.3;
        feedbackR.gain.value = 0.3;
        lowCut.type = 'highpass';
        lowCut.frequency.value = 100;
        highCut.type = 'lowpass';
        highCut.frequency.value = 8000;

        const inputSplit = ctx.createGain();
        inputSplit.connect(dryGain);
        inputSplit.connect(lowCut);
        lowCut.connect(highCut);
        highCut.connect(delayL);
        highCut.connect(delayR);
        delayL.connect(feedbackL);
        feedbackL.connect(delayL);
        delayL.connect(merger, 0, 0);
        delayR.connect(feedbackR);
        feedbackR.connect(delayR);
        delayR.connect(merger, 0, 1);
        merger.connect(wetGain);
        dryGain.connect(output);
        wetGain.connect(output);

        inputNode = inputSplit;
        outputNode = output;
        params.timeL = delayL.delayTime;
        params.timeR = delayR.delayTime;
        params.feedback = feedbackL.gain;
        params.lowCut = lowCut.frequency;
        params.highCut = highCut.frequency;
        params.mix = wetGain.gain;
        break;
      }
      case 'distortion': {
        const inputGain = ctx.createGain();
        const waveshaper = ctx.createWaveShaper();
        const toneFilter = ctx.createBiquadFilter();
        const outputGain = ctx.createGain();

        inputGain.gain.value = 1;
        toneFilter.type = 'lowpass';
        toneFilter.frequency.value = 4000;
        outputGain.gain.value = 0.5;

        // Create distortion curve
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i / 128) - 1;
          curve[i] = Math.tanh(x * 2);
        }
        waveshaper.curve = curve as Float32Array<ArrayBuffer>;
        waveshaper.oversample = '2x';

        inputGain.connect(waveshaper);
        waveshaper.connect(toneFilter);
        toneFilter.connect(outputGain);

        inputNode = inputGain;
        outputNode = outputGain;
        params.drive = inputGain.gain;
        params.tone = toneFilter.frequency;
        params.output = outputGain.gain;
        break;
      }
      default:
        return null;
    }

    const effect = new EffectNode(pluginId, inputNode, outputNode, params);

    // Insert into chain
    if (index < 0 || index >= this.effects.length) {
      this.effects.push(effect);
    } else {
      this.effects.splice(index, 0, effect);
    }

    this.rebuildEffectChain();
    return effect;
  }

  removeEffect(index: number): void {
    if (index < 0 || index >= this.effects.length) return;

    const effect = this.effects[index];
    // Disconnect effect nodes
    (effect.inputNode as AudioNode).disconnect();
    (effect.outputNode as AudioNode).disconnect();

    this.effects.splice(index, 1);
    this.rebuildEffectChain();
  }

  setEffectParameter(effectIndex: number, paramId: string, value: number): void {
    const effect = this.effects[effectIndex];
    if (!effect) return;

    const param = effect.parameters[paramId];
    if (param) {
      if ('setValueAtTime' in param) {
        (param as AudioParam).setValueAtTime(value, (this.panNode.context as AudioContext).currentTime);
      } else {
        (param as { value: number }).value = value;
      }
    }
  }

  setEffectEnabled(effectIndex: number, enabled: boolean): void {
    // For now, we rebuild the chain to enable/disable
    // A more efficient approach would use gain nodes as bypasses
    this.rebuildEffectChain();
  }

  getEffects(): EffectNode[] {
    return [...this.effects];
  }

  // Alias for getEffects - returns inserts for automation
  getInserts(): EffectNode[] {
    return this.getEffects();
  }

  // Set a parameter on an insert effect (for automation)
  setInsertParameter(insertIndex: number, paramName: string, value: number): void {
    if (insertIndex < 0 || insertIndex >= this.effects.length) return;

    const effect = this.effects[insertIndex];
    if (effect.parameters && effect.parameters[paramName]) {
      const param = effect.parameters[paramName];
      if (param instanceof AudioParam) {
        param.setTargetAtTime(value, this.ctx.currentTime, 0.01);
      } else if ('value' in param) {
        param.value = value;
      }
    }
  }

  private rebuildEffectChain(): void {
    // Disconnect current chain
    this.panNode.disconnect();
    this.effects.forEach(e => {
      (e.inputNode as AudioNode).disconnect();
      (e.outputNode as AudioNode).disconnect();
    });

    // Rebuild: panNode -> effects -> analyser -> outputNode
    if (this.effects.length === 0) {
      this.panNode.connect(this.analyser);
    } else {
      // Connect panNode to first effect
      this.panNode.connect(this.effects[0].inputNode);

      // Chain effects together
      for (let i = 0; i < this.effects.length - 1; i++) {
        this.effects[i].outputNode.connect(this.effects[i + 1].inputNode);
      }

      // Connect last effect to analyser
      this.effects[this.effects.length - 1].outputNode.connect(this.analyser);
    }

    // analyser is already connected to outputNode in constructor
    this.analyser.connect(this.outputNode);
  }

  dispose() {
    this.inputNode.disconnect();
    this.panNode.disconnect();
    this.effects.forEach(e => {
      (e.inputNode as AudioNode).disconnect();
      (e.outputNode as AudioNode).disconnect();
    });
    this.analyser.disconnect();
    this.outputNode.disconnect();
    this.effects.forEach(e => {
      e.inputNode.disconnect();
      e.outputNode.disconnect();
    });
    if (this.synth) {
      this.synth.dispose();
    }
    if (this.drumSampler) {
      this.drumSampler.dispose();
    }
  }
}

// Main DAW Audio Engine
export class DAWAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private meterL: AnalyserNode | null = null;
  private meterR: AnalyserNode | null = null;

  private trackProcessors: Map<string, TrackProcessor> = new Map();
  private busProcessors: Map<string, TrackProcessor> = new Map();
  private samples: Map<string, AudioBuffer> = new Map();

  private scheduledEvents: number[] = [];
  private playStartTime: number = 0;
  private playStartBeat: number = 0;
  private isPlaying: boolean = false;
  private loopRegion: LoopRegion | null = null;

  // Metronome
  private metronomeGain: GainNode | null = null;
  private metronomeEnabled: boolean = false;
  private metronomeVolume: number = 0.5;

  // Recording
  private mediaStream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private recordingProcessor: ScriptProcessorNode | null = null;
  private recordedBuffers: Float32Array[] = [];
  private isRecording: boolean = false;
  private recordingTrackId: string | null = null;
  private inputMonitorGain: GainNode | null = null;

  get context(): AudioContext | null {
    return this.ctx;
  }

  get initialized(): boolean {
    return this.ctx !== null;
  }

  async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext({ sampleRate: 48000 });

    // Master chain: trackOutput -> compressor -> limiter -> analyser -> destination
    this.masterGain = this.ctx.createGain();
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.analyser = this.ctx.createAnalyser();

    // Configure compressor
    this.masterCompressor.threshold.value = -24;
    this.masterCompressor.knee.value = 30;
    this.masterCompressor.ratio.value = 4;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.25;

    // Configure limiter
    this.masterLimiter.threshold.value = -1;
    this.masterLimiter.knee.value = 0;
    this.masterLimiter.ratio.value = 20;
    this.masterLimiter.attack.value = 0.001;
    this.masterLimiter.release.value = 0.1;

    // Analyser config
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create stereo meters
    const splitter = this.ctx.createChannelSplitter(2);
    this.meterL = this.ctx.createAnalyser();
    this.meterR = this.ctx.createAnalyser();
    this.meterL.fftSize = 256;
    this.meterR.fftSize = 256;

    // Connect master chain
    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterLimiter);
    this.masterLimiter.connect(this.analyser);
    this.analyser.connect(splitter);
    splitter.connect(this.meterL, 0);
    splitter.connect(this.meterR, 1);
    this.masterLimiter.connect(this.ctx.destination);

    // Create metronome output
    this.metronomeGain = this.ctx.createGain();
    this.metronomeGain.gain.value = this.metronomeVolume;
    this.metronomeGain.connect(this.ctx.destination);

    // Resume if suspended - don't await to avoid blocking on user gesture requirement
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Will resume on user interaction
      });
    }
  }

  // Track management
  createTrackProcessor(track: DAWTrack): void {
    if (!this.ctx || !this.masterGain) return;

    const processor = new TrackProcessor(this.ctx, track.id, track.type);
    processor.setVolume(track.volume);
    processor.setPan(track.pan);
    processor.setMute(track.muted);

    // Add default inserts (EQ, Compressor) from track data
    for (const insert of track.inserts) {
      const effect = processor.addEffect(insert.pluginId);
      if (effect) {
        // Set initial parameter values
        for (const [paramId, value] of Object.entries(insert.parameters)) {
          if (effect.parameters && effect.parameters[paramId]) {
            const param = effect.parameters[paramId];
            if (param instanceof AudioParam) {
              param.value = value;
            } else if ('value' in param) {
              param.value = value;
            }
          }
        }
      }
    }

    processor.outputNode.connect(this.masterGain);

    this.trackProcessors.set(track.id, processor);
  }

  removeTrackProcessor(trackId: string): void {
    const processor = this.trackProcessors.get(trackId);
    if (processor) {
      processor.dispose();
      this.trackProcessors.delete(trackId);
    }
  }

  setTrackVolume(trackId: string, value: number): void {
    this.trackProcessors.get(trackId)?.setVolume(value);
  }

  setTrackPan(trackId: string, value: number): void {
    this.trackProcessors.get(trackId)?.setPan(value);
  }

  setTrackMute(trackId: string, muted: boolean): void {
    this.trackProcessors.get(trackId)?.setMute(muted);
  }

  setMasterVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(2, value));
    }
  }

  // Track effect methods
  addTrackEffect(trackId: string, pluginId: string, index: number = -1): boolean {
    const processor = this.trackProcessors.get(trackId);
    if (!processor) return false;
    const effect = processor.addEffect(pluginId, index);
    return effect !== null;
  }

  removeTrackEffect(trackId: string, effectIndex: number): void {
    this.trackProcessors.get(trackId)?.removeEffect(effectIndex);
  }

  setTrackEffectParameter(trackId: string, effectIndex: number, paramId: string, value: number): void {
    this.trackProcessors.get(trackId)?.setEffectParameter(effectIndex, paramId, value);
  }

  setTrackEffectEnabled(trackId: string, effectIndex: number, enabled: boolean): void {
    this.trackProcessors.get(trackId)?.setEffectEnabled(effectIndex, enabled);
  }

  getTrackEffects(trackId: string): EffectNode[] {
    return this.trackProcessors.get(trackId)?.getEffects() || [];
  }

  // Bus management
  createBusProcessor(busId: string): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.busProcessors.has(busId)) return;

    const processor = new TrackProcessor(this.ctx, busId, 'bus');
    processor.outputNode.connect(this.masterGain);
    this.busProcessors.set(busId, processor);
  }

  removeBusProcessor(busId: string): void {
    const processor = this.busProcessors.get(busId);
    if (processor) {
      processor.dispose();
      this.busProcessors.delete(busId);
    }
  }

  setBusVolume(busId: string, value: number): void {
    this.busProcessors.get(busId)?.setVolume(value);
  }

  setBusPan(busId: string, value: number): void {
    this.busProcessors.get(busId)?.setPan(value);
  }

  setBusMute(busId: string, muted: boolean): void {
    this.busProcessors.get(busId)?.setMute(muted);
  }

  getBusMeterLevel(busId: string): number {
    const processor = this.busProcessors.get(busId);
    return processor ? processor.getMeterLevel() : 0;
  }

  // Send routing
  addTrackSend(trackId: string, busId: string, amount: number, preFader: boolean): void {
    const trackProcessor = this.trackProcessors.get(trackId);
    let busProcessor = this.busProcessors.get(busId);

    if (!trackProcessor || !this.ctx) return;

    // Create bus processor if it doesn't exist
    if (!busProcessor) {
      this.createBusProcessor(busId);
      busProcessor = this.busProcessors.get(busId);
    }

    if (!busProcessor) return;

    // Create send gain node
    const sendGain = this.ctx.createGain();
    sendGain.gain.value = amount;

    // Connect based on pre/post fader
    const sourceNode = preFader ? trackProcessor.inputNode : trackProcessor.outputNode;
    sourceNode.connect(sendGain);
    sendGain.connect(busProcessor.inputNode);

    // Store the send connection for later removal
    if (!(trackProcessor as any)._sends) {
      (trackProcessor as any)._sends = new Map();
    }
    (trackProcessor as any)._sends.set(busId, { gain: sendGain, preFader });
  }

  removeTrackSend(trackId: string, busId: string): void {
    const trackProcessor = this.trackProcessors.get(trackId);
    if (!trackProcessor) return;

    const sends = (trackProcessor as any)._sends as Map<string, { gain: GainNode; preFader: boolean }>;
    if (!sends) return;

    const send = sends.get(busId);
    if (send) {
      send.gain.disconnect();
      sends.delete(busId);
    }
  }

  setSendAmount(trackId: string, busId: string, amount: number): void {
    const trackProcessor = this.trackProcessors.get(trackId);
    if (!trackProcessor) return;

    const sends = (trackProcessor as any)._sends as Map<string, { gain: GainNode; preFader: boolean }>;
    if (!sends) return;

    const send = sends.get(busId);
    if (send) {
      send.gain.gain.value = Math.max(0, Math.min(1, amount));
    }
  }

  setSendPreFader(trackId: string, busId: string, preFader: boolean): void {
    const trackProcessor = this.trackProcessors.get(trackId);
    const busProcessor = this.busProcessors.get(busId);
    if (!trackProcessor || !busProcessor || !this.ctx) return;

    const sends = (trackProcessor as any)._sends as Map<string, { gain: GainNode; preFader: boolean }>;
    if (!sends) return;

    const send = sends.get(busId);
    if (send && send.preFader !== preFader) {
      // Disconnect old source
      send.gain.disconnect();

      // Reconnect to new source
      const sourceNode = preFader ? trackProcessor.inputNode : trackProcessor.outputNode;
      sourceNode.connect(send.gain);
      send.gain.connect(busProcessor.inputNode);

      send.preFader = preFader;
    }
  }

  // Automation methods
  setTrackVolumeAutomation(trackId: string, value: number, time: number): void {
    this.trackProcessors.get(trackId)?.setVolumeAutomation(value, time);
  }

  setTrackPanAutomation(trackId: string, value: number, time: number): void {
    this.trackProcessors.get(trackId)?.setPanAutomation(value, time);
  }

  setPluginParameterAutomation(
    trackId: string,
    pluginId: string,
    parameterName: string,
    value: number,
    time: number
  ): void {
    const processor = this.trackProcessors.get(trackId);
    if (!processor) return;

    // Find the insert with this plugin and set the parameter
    const inserts = processor.getInserts();
    const insertIndex = inserts.findIndex((ins: any) => ins.pluginId === pluginId);
    if (insertIndex !== -1) {
      processor.setInsertParameter(insertIndex, parameterName, value);
    }
  }

  resetTrackToBaseValues(trackId: string): void {
    this.trackProcessors.get(trackId)?.resetToBaseValues();
  }

  resetAllTracksToBaseValues(): void {
    this.trackProcessors.forEach(processor => processor.resetToBaseValues());
  }

  // Get meter level for a specific track
  getTrackMeterLevel(trackId: string): number {
    const processor = this.trackProcessors.get(trackId);
    if (!processor) {
      return 0;
    }
    return processor.getMeterLevel();
  }

  // Synth parameter setters for Smart Controls
  setSynthOscillator(trackId: string, type: OscillatorType): void {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (synth) {
      synth.setOscillatorType(type);
    }
  }

  setSynthFilterCutoff(trackId: string, freq: number): void {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (synth) {
      synth.setFilterFreq(freq);
    }
  }

  setSynthFilterResonance(trackId: string, q: number): void {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (synth) {
      synth.setFilterResonance(q);
    }
  }

  setSynthADSR(trackId: string, attack: number, decay: number, sustain: number, release: number): void {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (synth) {
      synth.setADSR(attack, decay, sustain, release);
    }
  }

  setSynthFilterADSR(trackId: string, attack: number, decay: number, sustain: number, range: number): void {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (synth) {
      synth.setFilterADSR(attack, decay, sustain, range);
    }
  }

  setSynthSubOsc(trackId: string, enabled: boolean, level: number): void {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (synth) {
      synth.setSubOscEnabled(enabled);
      synth.setSubOscLevel(level);
    }
  }

  setSynthDrive(trackId: string, value: number): void {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (synth && typeof (synth as any).setDrive === 'function') {
      (synth as any).setDrive(value);
    }
  }

  setSynthMix(trackId: string, value: number): void {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (synth && typeof (synth as any).setMix === 'function') {
      (synth as any).setMix(value);
    }
  }

  // Get synth parameters for reading in UI
  getSynthParameters(trackId: string): {
    oscillatorType: OscillatorType;
    filterFreq: number;
    filterResonance: number;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  } | null {
    const processor = this.trackProcessors.get(trackId);
    const synth = processor?.getSynth();
    if (!synth) return null;

    // Return current values from synth (need to add getters to SimpleSynth)
    return (synth as any).getParameters?.() || {
      oscillatorType: 'sawtooth',
      filterFreq: 5000,
      filterResonance: 2,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.7,
      release: 0.3,
    };
  }

  // Get all track meter levels
  getAllTrackMeterLevels(): Map<string, number> {
    const levels = new Map<string, number>();
    this.trackProcessors.forEach((processor, trackId) => {
      levels.set(trackId, processor.getMeterLevel());
    });
    return levels;
  }

  // Sample loading
  async loadSample(url: string): Promise<AudioBuffer> {
    if (this.samples.has(url)) {
      return this.samples.get(url)!;
    }

    if (!this.ctx) {
      throw new Error('Audio engine not initialized');
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    this.samples.set(url, audioBuffer);
    return audioBuffer;
  }

  // Store an AudioBuffer directly (for recorded audio)
  storeSample(url: string, buffer: AudioBuffer): void {
    this.samples.set(url, buffer);
  }

  // Playback
  playSample(
    url: string,
    time: number,
    trackId: string,
    velocity: number = 1,
    pitch: number = 0,
    duration?: number,
    offset: number = 0,
  ): void {
    if (!this.ctx) return;

    const buffer = this.samples.get(url);
    if (!buffer) {
      console.warn(`Sample not loaded: ${url}`);
      return;
    }

    const processor = this.trackProcessors.get(trackId);
    if (!processor) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    if (pitch !== 0) {
      source.playbackRate.value = Math.pow(2, pitch / 12);
    }

    const velocityGain = this.ctx.createGain();
    velocityGain.gain.value = velocity;

    source.connect(velocityGain);
    velocityGain.connect(processor.inputNode);

    if (duration !== undefined) {
      source.start(time, offset, duration);
    } else {
      source.start(time, offset);
    }
  }

  // MIDI playback - routes to appropriate instrument (synth or drum sampler)
  playMidiNote(
    trackId: string,
    note: number,
    velocity: number,
    startTime: number,
    duration: number,
  ): void {
    const processor = this.trackProcessors.get(trackId);
    if (!processor) {
      console.warn(`[playMidiNote] No processor found for track ${trackId}. Available: ${Array.from(this.trackProcessors.keys()).join(', ')}`);
      return;
    }

    // Check if it's a drummer track
    const drumSampler = processor.getDrumSampler();
    if (drumSampler) {
      console.log(`[playMidiNote] Playing drum note ${note} at ${startTime.toFixed(3)}`);
      drumSampler.playNote(note, velocity, startTime);
      return;
    }

    // Otherwise use synth
    const synth = processor.getSynth();
    if (!synth) {
      console.warn(`[playMidiNote] No synth found for track ${trackId}`);
      return;
    }

    console.log(`[playMidiNote] Playing synth note ${note} at ${startTime.toFixed(3)}`);
    synth.noteOn(note, velocity, startTime);
    synth.noteOff(note, startTime + duration);
  }

  // Simple note playback for virtual keyboard (no track required)
  private activeKeyboardNotes: Map<number, { osc: OscillatorNode; gain: GainNode }> = new Map();

  playNote(note: number, velocity: number): void {
    if (!this.ctx || !this.masterGain) return;

    // Stop existing note if playing
    this.stopNote(note);

    const freq = 440 * Math.pow(2, (note - 69) / 12);
    const normalizedVel = velocity / 127;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Use a nicer waveform
    osc.type = 'triangle';
    osc.frequency.value = freq;

    // ADSR envelope
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(normalizedVel * 0.3, now + 0.01); // Attack
    gain.gain.linearRampToValueAtTime(normalizedVel * 0.2, now + 0.1); // Decay to sustain

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    this.activeKeyboardNotes.set(note, { osc, gain });
  }

  stopNote(note: number): void {
    const activeNote = this.activeKeyboardNotes.get(note);
    if (!activeNote || !this.ctx) return;

    const { osc, gain } = activeNote;
    const now = this.ctx.currentTime;

    // Release
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);

    osc.stop(now + 0.15);
    this.activeKeyboardNotes.delete(note);
  }

  // Metronome
  setMetronomeEnabled(enabled: boolean): void {
    this.metronomeEnabled = enabled;
  }

  setMetronomeVolume(volume: number): void {
    this.metronomeVolume = volume;
    if (this.metronomeGain) {
      this.metronomeGain.gain.value = volume;
    }
  }

  playMetronomeClick(time: number, isDownbeat: boolean): void {
    if (!this.ctx || !this.metronomeGain || !this.metronomeEnabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = isDownbeat ? 1000 : 800;

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    osc.connect(gain);
    gain.connect(this.metronomeGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  // Analysis
  getAnalyserData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getMeterLevels(): { left: number; right: number } {
    if (!this.meterL || !this.meterR) return { left: 0, right: 0 };

    const dataL = new Uint8Array(this.meterL.frequencyBinCount);
    const dataR = new Uint8Array(this.meterR.frequencyBinCount);

    this.meterL.getByteTimeDomainData(dataL);
    this.meterR.getByteTimeDomainData(dataR);

    // Calculate RMS
    let sumL = 0, sumR = 0;
    for (let i = 0; i < dataL.length; i++) {
      const sampleL = (dataL[i] - 128) / 128;
      const sampleR = (dataR[i] - 128) / 128;
      sumL += sampleL * sampleL;
      sumR += sampleR * sampleR;
    }

    const rmsL = Math.sqrt(sumL / dataL.length);
    const rmsR = Math.sqrt(sumR / dataR.length);

    // Scale RMS aggressively to make meters more visible
    return {
      left: Math.min(1, Math.pow(rmsL, 0.5) * 2),
      right: Math.min(1, Math.pow(rmsR, 0.5) * 2),
    };
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  // Export project to audio file
  async exportToWav(
    project: any,
    durationBeats: number,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ctx) throw new Error('Audio context not initialized');

    const bpm = project.bpm;
    const beatsPerSecond = bpm / 60;
    const durationSeconds = durationBeats / beatsPerSecond;
    const sampleRate = 44100;
    const channels = 2;
    const totalSamples = Math.ceil(durationSeconds * sampleRate);

    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(channels, totalSamples, sampleRate);

    // Create master gain for offline context
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = project.master?.volume ?? 0.8;
    masterGain.connect(offlineCtx.destination);

    // Count total events for progress (MIDI notes + audio regions)
    let totalEvents = 0;
    let processedEvents = 0;

    project.tracks.forEach((track: any) => {
      if (track.muted) return;
      track.regions.forEach((regionId: string) => {
        const region = project.regions[regionId];
        if (!region || region.muted) return;
        if ('notes' in region) {
          totalEvents += region.notes.length;
        } else if ('audioUrl' in region && region.audioUrl) {
          totalEvents += 1; // Count each audio region
        }
      });
    });

    // Process each track
    for (const track of project.tracks) {
      if (track.muted) continue;

      // Create track effects chain for offline context
      let trackOutput: AudioNode = masterGain;

      // Add reverb if enabled
      const reverbEffect = track.effects?.find((e: any) => e.id === 'reverb' && e.enabled);
      let convolver: ConvolverNode | null = null;
      let reverbWetGain: GainNode | null = null;
      let reverbDryGain: GainNode | null = null;

      if (reverbEffect) {
        convolver = offlineCtx.createConvolver();
        reverbWetGain = offlineCtx.createGain();
        reverbDryGain = offlineCtx.createGain();

        // Create impulse response for reverb
        const impulseLength = sampleRate * (reverbEffect.params?.decay || 2);
        const impulse = offlineCtx.createBuffer(2, impulseLength, sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const impulseData = impulse.getChannelData(channel);
          for (let i = 0; i < impulseLength; i++) {
            impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
          }
        }
        convolver.buffer = impulse;

        const mix = reverbEffect.params?.mix ?? 0.3;
        reverbWetGain.gain.value = mix;
        reverbDryGain.gain.value = 1 - mix;

        convolver.connect(reverbWetGain);
        reverbWetGain.connect(masterGain);
        reverbDryGain.connect(masterGain);
      }

      // Add delay if enabled
      const delayEffect = track.effects?.find((e: any) => e.id === 'delay' && e.enabled);
      let delayNode: DelayNode | null = null;
      let delayFeedback: GainNode | null = null;
      let delayWetGain: GainNode | null = null;

      if (delayEffect) {
        delayNode = offlineCtx.createDelay(5);
        delayFeedback = offlineCtx.createGain();
        delayWetGain = offlineCtx.createGain();

        const delayTime = delayEffect.params?.time ?? 0.3;
        const feedback = delayEffect.params?.feedback ?? 0.4;
        const mix = delayEffect.params?.mix ?? 0.3;

        delayNode.delayTime.value = delayTime;
        delayFeedback.gain.value = feedback;
        delayWetGain.gain.value = mix;

        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        delayNode.connect(delayWetGain);
        delayWetGain.connect(reverbEffect && convolver ? convolver : masterGain);
      }

      // Create track gain node
      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume ?? 0.8;

      // Apply volume automation if present
      const volumeAutomation = track.automationLanes?.find((lane: any) => lane.parameter === 'volume');
      if (volumeAutomation && volumeAutomation.points && volumeAutomation.points.length > 0) {
        const points = [...volumeAutomation.points].sort((a: any, b: any) => a.time - b.time);
        trackGain.gain.setValueAtTime(track.volume ?? 0.8, 0);

        for (const point of points) {
          const timeSeconds = point.time / beatsPerSecond;
          if (timeSeconds <= durationSeconds) {
            trackGain.gain.linearRampToValueAtTime(point.value, timeSeconds);
          }
        }
      }

      // Connect track gain through effects chain
      if (delayNode && delayEffect) {
        trackGain.connect(delayNode);
        trackGain.connect(reverbEffect && convolver ? convolver : masterGain);
        if (reverbEffect && reverbDryGain) {
          trackGain.connect(reverbDryGain);
        }
      } else if (reverbEffect && convolver && reverbDryGain) {
        trackGain.connect(convolver);
        trackGain.connect(reverbDryGain);
      } else {
        trackGain.connect(masterGain);
      }

      // Process regions
      for (const regionId of track.regions) {
        const region = project.regions[regionId];
        if (!region || region.muted) continue;

        // Handle Audio regions
        if ('audioUrl' in region && region.audioUrl) {
          const regionStartTime = region.startTime / beatsPerSecond;

          // Skip if outside duration
          if (regionStartTime >= durationSeconds) {
            processedEvents++;
            continue;
          }

          // Get the sample buffer
          const sampleBuffer = this.samples.get(region.audioUrl);
          if (sampleBuffer) {
            // Create buffer source for offline rendering
            const source = offlineCtx.createBufferSource();
            source.buffer = sampleBuffer;

            // Create gain for this region
            const regionGain = offlineCtx.createGain();
            regionGain.gain.value = region.gain ?? 1;

            // Apply fade in/out if specified (ensure all times are non-negative)
            if (region.fadeIn && region.fadeIn > 0) {
              const fadeInTime = region.fadeIn / beatsPerSecond;
              regionGain.gain.setValueAtTime(0, Math.max(0, regionStartTime));
              regionGain.gain.linearRampToValueAtTime(region.gain ?? 1, Math.max(0.01, regionStartTime + fadeInTime));
            }
            if (region.fadeOut && region.fadeOut > 0) {
              const regionEndTime = (region.startTime + region.duration) / beatsPerSecond;
              const fadeOutTime = region.fadeOut / beatsPerSecond;
              const fadeOutStart = Math.max(0, regionEndTime - fadeOutTime);
              regionGain.gain.setValueAtTime(region.gain ?? 1, fadeOutStart);
              regionGain.gain.linearRampToValueAtTime(0, Math.max(fadeOutStart + 0.01, regionEndTime));
            }

            source.connect(regionGain);
            regionGain.connect(trackGain);

            // Start the sample at the correct time (ensure non-negative values)
            const offset = region.offset ?? 0;
            source.start(Math.max(0, regionStartTime), Math.max(0, offset / beatsPerSecond));
          }

          processedEvents++;
          if (onProgress) {
            onProgress(processedEvents / Math.max(1, totalEvents));
          }
        }

        // Handle MIDI regions
        if ('notes' in region && region.notes) {
          for (const note of region.notes) {
            const noteStartBeat = region.startTime + note.startTime;
            const noteStartTime = noteStartBeat / beatsPerSecond;
            const noteDuration = note.duration / beatsPerSecond;

            // Skip notes outside duration
            if (noteStartTime >= durationSeconds) continue;

            // Create oscillator for synth sound
            const osc = offlineCtx.createOscillator();
            const noteGain = offlineCtx.createGain();
            const filter = offlineCtx.createBiquadFilter();

            // Frequency from MIDI note
            const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
            osc.frequency.value = freq;

            // Choose waveform based on pitch (bass vs lead)
            if (note.pitch < 48) {
              osc.type = 'sine'; // Sub bass
              filter.frequency.value = 200;
            } else if (note.pitch < 60) {
              osc.type = 'sawtooth'; // Bass
              filter.frequency.value = 800;
            } else {
              osc.type = 'square'; // Lead
              filter.frequency.value = 2000;
            }

            filter.type = 'lowpass';
            filter.Q.value = 2;

            // Velocity to gain
            const velocityGain = (note.velocity / 127) * 0.5;

            // ADSR envelope (ensure all times are non-negative)
            const attackEnd = Math.max(0, noteStartTime + 0.01);
            const decayEnd = Math.max(attackEnd, noteStartTime + 0.11);
            const sustainEnd = Math.max(decayEnd, noteStartTime + noteDuration - 0.1);
            const releaseEnd = Math.max(sustainEnd, noteStartTime + noteDuration);

            noteGain.gain.setValueAtTime(0, Math.max(0, noteStartTime));
            noteGain.gain.linearRampToValueAtTime(velocityGain, attackEnd);
            noteGain.gain.linearRampToValueAtTime(velocityGain * 0.7, decayEnd);
            noteGain.gain.setValueAtTime(velocityGain * 0.7, sustainEnd);
            noteGain.gain.linearRampToValueAtTime(0, releaseEnd);

            // Connect
            osc.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(trackGain);

            osc.start(Math.max(0, noteStartTime));
            osc.stop(Math.max(0.01, noteStartTime + noteDuration + 0.1));

            processedEvents++;
            if (onProgress) {
              onProgress(processedEvents / Math.max(1, totalEvents));
            }
          }
        }
      }
    }

    // Render audio
    const renderedBuffer = await offlineCtx.startRendering();

    // Convert to WAV
    const wavBlob = this.bufferToWav(renderedBuffer);
    return wavBlob;
  }

  // Render a single track to an AudioBuffer (for freeze/bounce)
  async renderTrackToBuffer(
    track: any,
    project: any,
    durationBeats: number,
    onProgress?: (progress: number) => void
  ): Promise<{ buffer: AudioBuffer; blob: Blob; url: string }> {
    if (!this.ctx) throw new Error('Audio context not initialized');

    const bpm = project.bpm;
    const beatsPerSecond = bpm / 60;
    const durationSeconds = durationBeats / beatsPerSecond;
    const sampleRate = 44100;
    const channels = 2;
    const totalSamples = Math.ceil(durationSeconds * sampleRate);

    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(channels, totalSamples, sampleRate);

    // Create output gain
    const outputGain = offlineCtx.createGain();
    outputGain.gain.value = track.volume ?? 0.8;
    outputGain.connect(offlineCtx.destination);

    // Add track effects
    let trackOutput: AudioNode = outputGain;

    // Add reverb if enabled
    const reverbInsert = track.inserts?.find((i: any) => i.pluginId === 'reverb' && i.enabled);
    if (reverbInsert) {
      const convolver = offlineCtx.createConvolver();
      const wetGain = offlineCtx.createGain();
      const dryGain = offlineCtx.createGain();

      const decay = reverbInsert.parameters?.decay ?? 2;
      const mix = reverbInsert.parameters?.mix ?? 0.3;

      const impulseLength = sampleRate * decay;
      const impulse = offlineCtx.createBuffer(2, impulseLength, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < impulseLength; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
        }
      }
      convolver.buffer = impulse;

      wetGain.gain.value = mix;
      dryGain.gain.value = 1 - mix;

      convolver.connect(wetGain);
      wetGain.connect(outputGain);
      dryGain.connect(outputGain);
      trackOutput = convolver;
    }

    // Add delay if enabled
    const delayInsert = track.inserts?.find((i: any) => i.pluginId === 'delay' && i.enabled);
    if (delayInsert) {
      const delayNode = offlineCtx.createDelay(5);
      const feedback = offlineCtx.createGain();
      const wetGain = offlineCtx.createGain();

      delayNode.delayTime.value = delayInsert.parameters?.time ?? 0.3;
      feedback.gain.value = delayInsert.parameters?.feedback ?? 0.4;
      wetGain.gain.value = delayInsert.parameters?.mix ?? 0.3;

      delayNode.connect(feedback);
      feedback.connect(delayNode);
      delayNode.connect(wetGain);
      wetGain.connect(trackOutput === outputGain ? outputGain : trackOutput);
    }

    // Process regions
    let processedEvents = 0;
    let totalEvents = 0;

    // Count events
    for (const regionId of track.regions) {
      const region = project.regions[regionId];
      if (!region || region.muted) continue;
      if ('notes' in region) totalEvents += region.notes.length;
      else totalEvents += 1;
    }

    for (const regionId of track.regions) {
      const region = project.regions[regionId];
      if (!region || region.muted) continue;

      // Handle Audio regions
      if ('audioUrl' in region && region.audioUrl) {
        const regionStartTime = region.startTime / beatsPerSecond;
        if (regionStartTime >= durationSeconds) continue;

        const sampleBuffer = this.samples.get(region.audioUrl);
        if (sampleBuffer) {
          const source = offlineCtx.createBufferSource();
          source.buffer = sampleBuffer;

          const regionGain = offlineCtx.createGain();
          regionGain.gain.value = region.gain ?? 1;

          source.connect(regionGain);
          regionGain.connect(trackOutput === outputGain ? outputGain : trackOutput);

          const offset = region.offset ?? 0;
          source.start(Math.max(0, regionStartTime), Math.max(0, offset / beatsPerSecond));
        }

        processedEvents++;
        if (onProgress) onProgress(processedEvents / Math.max(1, totalEvents));
      }

      // Handle MIDI regions
      if ('notes' in region && region.notes) {
        for (const note of region.notes) {
          const noteStartBeat = region.startTime + note.startTime;
          const noteStartTime = noteStartBeat / beatsPerSecond;
          const noteDuration = note.duration / beatsPerSecond;

          if (noteStartTime >= durationSeconds) continue;

          const osc = offlineCtx.createOscillator();
          const noteGain = offlineCtx.createGain();
          const filter = offlineCtx.createBiquadFilter();

          const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
          osc.frequency.value = freq;

          // Choose waveform based on pitch
          if (note.pitch < 48) {
            osc.type = 'sine';
            filter.frequency.value = 200;
          } else if (note.pitch < 60) {
            osc.type = 'sawtooth';
            filter.frequency.value = 800;
          } else {
            osc.type = 'square';
            filter.frequency.value = 2000;
          }

          filter.type = 'lowpass';
          filter.Q.value = 2;

          const velocityGain = (note.velocity / 127) * 0.5;

          // ADSR envelope (ensure all times are non-negative)
          const attackEnd = Math.max(0, noteStartTime + 0.01);
          const decayEnd = Math.max(attackEnd, noteStartTime + 0.11);
          const sustainEnd = Math.max(decayEnd, noteStartTime + noteDuration - 0.1);
          const releaseEnd = Math.max(sustainEnd, noteStartTime + noteDuration);

          noteGain.gain.setValueAtTime(0, Math.max(0, noteStartTime));
          noteGain.gain.linearRampToValueAtTime(velocityGain, attackEnd);
          noteGain.gain.linearRampToValueAtTime(velocityGain * 0.7, decayEnd);
          noteGain.gain.setValueAtTime(velocityGain * 0.7, sustainEnd);
          noteGain.gain.linearRampToValueAtTime(0, releaseEnd);

          osc.connect(filter);
          filter.connect(noteGain);
          noteGain.connect(trackOutput === outputGain ? outputGain : trackOutput);

          osc.start(Math.max(0, noteStartTime));
          osc.stop(Math.max(0.01, noteStartTime + noteDuration + 0.1));

          processedEvents++;
          if (onProgress) onProgress(processedEvents / Math.max(1, totalEvents));
        }
      }
    }

    // Render
    const renderedBuffer = await offlineCtx.startRendering();
    const blob = this.bufferToWav(renderedBuffer);

    // Create a URL for the blob and store the buffer
    const url = `rendered_${track.id}_${Date.now()}.wav`;
    this.samples.set(url, renderedBuffer);

    console.log(`[DAWAudioEngine] Rendered track ${track.name} to ${url}`);

    return { buffer: renderedBuffer, blob, url };
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const wavBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(wavBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Interleave and write samples
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  // Recording methods
  async startRecording(trackId: string, deviceId?: string): Promise<boolean> {
    if (!this.ctx || this.isRecording) return false;

    try {
      // Get audio input
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStreamSource = this.ctx.createMediaStreamSource(this.mediaStream);

      // Create a script processor for recording (deprecated but widely supported)
      // In production, would use AudioWorklet
      const bufferSize = 4096;
      this.recordingProcessor = this.ctx.createScriptProcessor(bufferSize, 1, 1);
      this.recordedBuffers = [];

      this.recordingProcessor.onaudioprocess = (e) => {
        if (this.isRecording) {
          const inputData = e.inputBuffer.getChannelData(0);
          this.recordedBuffers.push(new Float32Array(inputData));
        }
      };

      // Create monitor gain for input monitoring
      this.inputMonitorGain = this.ctx.createGain();
      this.inputMonitorGain.gain.value = 0; // Start with monitoring off

      // Connect: source -> processor -> monitor -> track/master
      this.mediaStreamSource.connect(this.recordingProcessor);
      this.recordingProcessor.connect(this.inputMonitorGain);

      // Route to the track if specified
      const trackProcessor = this.trackProcessors.get(trackId);
      if (trackProcessor) {
        this.inputMonitorGain.connect(trackProcessor.inputNode);
      } else if (this.masterGain) {
        this.inputMonitorGain.connect(this.masterGain);
      }

      this.isRecording = true;
      this.recordingTrackId = trackId;

      console.log('[DAWAudioEngine] Recording started on track:', trackId);
      return true;
    } catch (err) {
      console.error('[DAWAudioEngine] Failed to start recording:', err);
      return false;
    }
  }

  stopRecording(): { buffer: AudioBuffer; url: string; durationSeconds: number } | null {
    if (!this.ctx || !this.isRecording) return null;

    this.isRecording = false;
    const trackId = this.recordingTrackId;

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Disconnect nodes
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.recordingProcessor) {
      this.recordingProcessor.disconnect();
      this.recordingProcessor = null;
    }

    if (this.inputMonitorGain) {
      this.inputMonitorGain.disconnect();
      this.inputMonitorGain = null;
    }

    // Create AudioBuffer from recorded data
    if (this.recordedBuffers.length === 0) {
      this.recordingTrackId = null;
      return null;
    }

    const totalLength = this.recordedBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const audioBuffer = this.ctx.createBuffer(1, totalLength, this.ctx.sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    let offset = 0;
    for (const buffer of this.recordedBuffers) {
      channelData.set(buffer, offset);
      offset += buffer.length;
    }

    this.recordedBuffers = [];
    this.recordingTrackId = null;

    // Generate URL and store the buffer for playback
    const url = `recording_${trackId}_${Date.now()}.wav`;
    this.samples.set(url, audioBuffer);

    console.log('[DAWAudioEngine] Recording stopped. Duration:', audioBuffer.duration, 'seconds, URL:', url);
    return {
      buffer: audioBuffer,
      url,
      durationSeconds: audioBuffer.duration,
    };
  }

  setInputMonitoring(enabled: boolean): void {
    if (this.inputMonitorGain) {
      this.inputMonitorGain.gain.value = enabled ? 1 : 0;
    }
  }

  getRecordingState(): { isRecording: boolean; trackId: string | null; duration: number } {
    const duration = this.recordedBuffers.length * 4096 / (this.ctx?.sampleRate || 48000);
    return {
      isRecording: this.isRecording,
      trackId: this.recordingTrackId,
      duration,
    };
  }

  // Get available audio input devices
  static async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audioinput');
    } catch (err) {
      console.error('[DAWAudioEngine] Failed to get audio devices:', err);
      return [];
    }
  }

  dispose(): void {
    // Stop recording if active
    if (this.isRecording) {
      this.stopRecording();
    }

    this.trackProcessors.forEach(p => p.dispose());
    this.trackProcessors.clear();
    this.busProcessors.forEach(p => p.dispose());
    this.busProcessors.clear();
    this.samples.clear();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Scheduler class for precise MIDI/Audio timing
export class DAWScheduler {
  private audioEngine: DAWAudioEngine;
  private isPlaying: boolean = false;
  private schedulerInterval: number | null = null;
  private scheduledNotes: Map<string, { noteOff: number }> = new Map();
  private lastScheduledBeat: number = 0;
  private lookaheadTime: number = 0.1; // 100ms lookahead
  private scheduleAheadBeats: number = 0.5; // Schedule half a beat ahead

  // Callback to get current state from store
  private getState: (() => {
    project: any;
    playheadPosition: number;
    isPlaying: boolean;
    metronomeEnabled: boolean;
  }) | null = null;

  private setPlayheadPosition: ((position: number) => void) | null = null;
  private playStartTime: number = 0;
  private playStartBeat: number = 0;

  constructor(engine: DAWAudioEngine) {
    this.audioEngine = engine;
  }

  /**
   * Calculate the time in seconds to reach a given beat, considering tempo automation
   */
  private getTimeForBeat(
    beat: number,
    tempoChanges: Array<{ time: number; bpm: number; curve: string }> | undefined,
    baseBpm: number,
    fromBeat: number = 0
  ): number {
    if (!tempoChanges || tempoChanges.length === 0) {
      // Simple linear calculation
      return (beat - fromBeat) * (60 / baseBpm);
    }

    // Sort tempo changes by time
    const sortedChanges = [...tempoChanges].sort((a, b) => a.time - b.time);

    let totalTime = 0;
    let currentBeat = fromBeat;
    let currentBpm = baseBpm;

    // Find the starting BPM based on fromBeat position
    for (const change of sortedChanges) {
      if (change.time <= fromBeat) {
        currentBpm = change.bpm;
      } else {
        break;
      }
    }

    // Iterate through tempo change segments
    for (const change of sortedChanges) {
      if (change.time <= fromBeat) continue; // Skip changes before our start
      if (change.time >= beat) break; // Stop if we've passed our target

      // Calculate time for this segment (from currentBeat to change.time)
      const segmentBeats = change.time - currentBeat;
      const segmentTime = segmentBeats * (60 / currentBpm);
      totalTime += segmentTime;

      currentBeat = change.time;
      currentBpm = change.bpm;
    }

    // Calculate remaining time from last change to target beat
    const remainingBeats = beat - currentBeat;
    totalTime += remainingBeats * (60 / currentBpm);

    return totalTime;
  }

  /**
   * Calculate the beat position for a given elapsed time, considering tempo automation
   */
  private getBeatForTime(
    elapsedTime: number,
    tempoChanges: Array<{ time: number; bpm: number; curve: string }> | undefined,
    baseBpm: number,
    fromBeat: number = 0
  ): number {
    if (!tempoChanges || tempoChanges.length === 0) {
      // Simple linear calculation
      return fromBeat + elapsedTime * (baseBpm / 60);
    }

    // Sort tempo changes by time
    const sortedChanges = [...tempoChanges].sort((a, b) => a.time - b.time);

    let remainingTime = elapsedTime;
    let currentBeat = fromBeat;
    let currentBpm = baseBpm;

    // Find the starting BPM based on fromBeat position
    for (const change of sortedChanges) {
      if (change.time <= fromBeat) {
        currentBpm = change.bpm;
      } else {
        break;
      }
    }

    // Iterate through tempo change segments
    for (const change of sortedChanges) {
      if (change.time <= fromBeat) continue; // Skip changes before our start

      // Calculate time needed to reach this tempo change
      const beatsToChange = change.time - currentBeat;
      const timeToChange = beatsToChange * (60 / currentBpm);

      if (timeToChange >= remainingTime) {
        // We reach target time before this tempo change
        break;
      }

      // Move past this segment
      remainingTime -= timeToChange;
      currentBeat = change.time;
      currentBpm = change.bpm;
    }

    // Calculate remaining beats with current tempo
    const remainingBeats = remainingTime * (currentBpm / 60);
    return currentBeat + remainingBeats;
  }

  /**
   * Get the BPM at a specific beat position
   */
  private getBpmAtBeat(
    beat: number,
    tempoChanges: Array<{ time: number; bpm: number; curve: string }> | undefined,
    baseBpm: number
  ): number {
    if (!tempoChanges || tempoChanges.length === 0) {
      return baseBpm;
    }

    const sortedChanges = [...tempoChanges].sort((a, b) => a.time - b.time);
    let currentBpm = baseBpm;

    for (const change of sortedChanges) {
      if (change.time <= beat) {
        currentBpm = change.bpm;
      } else {
        break;
      }
    }

    return currentBpm;
  }

  setStateAccessor(
    getState: () => any,
    setPlayheadPosition: (position: number) => void
  ) {
    this.getState = getState;
    this.setPlayheadPosition = setPlayheadPosition;
  }

  start() {
    if (this.isPlaying || !this.audioEngine.context) return;

    const state = this.getState?.();
    if (!state) return;

    this.isPlaying = true;
    this.playStartTime = this.audioEngine.currentTime;
    this.playStartBeat = state.playheadPosition;
    this.lastScheduledBeat = state.playheadPosition;

    // Start the scheduler loop
    this.schedulerInterval = window.setInterval(() => this.schedulerTick(), 25);
  }

  stop() {
    this.isPlaying = false;
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    // Stop all active notes
    this.scheduledNotes.clear();
    // Reset all tracks to their base values
    this.audioEngine.resetAllTracksToBaseValues();
  }

  private schedulerTick() {
    if (!this.isPlaying || !this.getState || !this.audioEngine.context) return;

    const state = this.getState();
    if (!state.isPlaying || !state.project) {
      this.stop();
      return;
    }

    const { project } = state;
    const bpm = project.bpm;
    const tempoChanges = project.tempoChanges;

    // Calculate current playhead position considering tempo automation
    const elapsed = this.audioEngine.currentTime - this.playStartTime;
    let currentBeat = this.getBeatForTime(elapsed, tempoChanges, bpm, this.playStartBeat);

    // Handle looping
    if (project.loop?.enabled) {
      const loopStart = project.loop.start;
      const loopEnd = project.loop.end;
      const loopLength = loopEnd - loopStart;

      if (currentBeat >= loopEnd && loopLength > 0) {
        const overflow = currentBeat - loopStart;
        currentBeat = loopStart + (overflow % loopLength);
        this.playStartBeat = currentBeat;
        this.playStartTime = this.audioEngine.currentTime;
        this.lastScheduledBeat = currentBeat;
      }
    }

    // Update playhead in store
    this.setPlayheadPosition?.(currentBeat);

    // Calculate the beat we should schedule up to
    const scheduleUpToBeat = currentBeat + this.scheduleAheadBeats;

    // Schedule metronome clicks
    if (state.metronomeEnabled) {
      this.scheduleMetronome(currentBeat, scheduleUpToBeat, bpm, project.timeSignature);
    }

    // Schedule regions for each track
    project.tracks.forEach((track: any) => {
      if (track.muted) return;

      // Check solo - if any track is solo'd, only play solo'd tracks
      const hasSoloTrack = project.tracks.some((t: any) => t.solo);
      if (hasSoloTrack && !track.solo) return;

      track.regions.forEach((regionId: string) => {
        const region = project.regions[regionId];
        if (!region || region.muted) return;

        // Check if region is in our scheduling window
        const regionStart = region.startTime;
        const regionEnd = region.startTime + region.duration;

        // Skip if region is outside our scheduling window
        if (regionEnd < this.lastScheduledBeat || regionStart > scheduleUpToBeat) return;

        // Handle MIDI regions
        if ('notes' in region && region.notes) {
          this.scheduleMidiRegion(
            track,
            region,
            currentBeat,
            scheduleUpToBeat,
            bpm,
            tempoChanges
          );
        }

        // Handle Audio regions
        if ('audioUrl' in region && region.audioUrl) {
          this.scheduleAudioRegion(
            track,
            region,
            currentBeat,
            scheduleUpToBeat,
            bpm,
            tempoChanges
          );
        }
      });

      // Apply automation for this track (always apply if lanes exist, regardless of UI visibility)
      if (track.automationLanes && track.automationLanes.length > 0) {
        this.applyTrackAutomation(track, currentBeat);
      }
    });

    this.lastScheduledBeat = scheduleUpToBeat;
  }

  // Apply automation values to a track at the current beat
  private applyTrackAutomation(track: any, currentBeat: number) {
    const audioTime = this.audioEngine.currentTime;

    track.automationLanes.forEach((lane: any) => {
      if (!lane.enabled || !lane.points || lane.points.length === 0) return;

      // Get interpolated value at current beat
      const value = this.getAutomationValue(lane.points, currentBeat);
      if (value === null) return;

      // Apply based on parameter type
      switch (lane.parameter) {
        case 'volume':
          this.audioEngine.setTrackVolumeAutomation(track.id, value, audioTime);
          break;
        case 'pan':
          this.audioEngine.setTrackPanAutomation(track.id, value, audioTime);
          break;
        case 'mute':
          // Mute is binary: value > 0.5 = unmuted
          this.audioEngine.setTrackMute(track.id, value < 0.5);
          break;
        case 'send':
          // Send automation - requires busId from parameterName
          if (lane.parameterName) {
            this.audioEngine.setSendAmount(track.id, lane.parameterName, value);
          }
          break;
        case 'plugin':
          // Plugin automation - requires pluginId and parameterName
          if (lane.pluginId && lane.parameterName) {
            this.audioEngine.setPluginParameterAutomation(
              track.id,
              lane.pluginId,
              lane.parameterName,
              value,
              audioTime
            );
          }
          break;
      }
    });
  }

  // Interpolate automation value at a given beat
  private getAutomationValue(points: any[], beat: number): number | null {
    if (points.length === 0) return null;

    // Sort points by time
    const sortedPoints = [...points].sort((a, b) => a.time - b.time);

    // Before first point - return first point's value
    if (beat <= sortedPoints[0].time) {
      return sortedPoints[0].value;
    }

    // After last point - return last point's value
    if (beat >= sortedPoints[sortedPoints.length - 1].time) {
      return sortedPoints[sortedPoints.length - 1].value;
    }

    // Find surrounding points
    let prevPoint = sortedPoints[0];
    let nextPoint = sortedPoints[1];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      if (sortedPoints[i].time <= beat && sortedPoints[i + 1].time > beat) {
        prevPoint = sortedPoints[i];
        nextPoint = sortedPoints[i + 1];
        break;
      }
    }

    // Calculate interpolation factor (0 to 1)
    const timeDiff = nextPoint.time - prevPoint.time;
    const t = timeDiff > 0 ? (beat - prevPoint.time) / timeDiff : 0;

    // Interpolate based on curve type
    switch (prevPoint.curve) {
      case 'step':
        return prevPoint.value;

      case 'exponential':
        // Exponential curve (faster at start, slower at end)
        const expT = 1 - Math.pow(1 - t, 2);
        return prevPoint.value + (nextPoint.value - prevPoint.value) * expT;

      case 'logarithmic':
        // Logarithmic curve (slower at start, faster at end)
        const logT = Math.pow(t, 2);
        return prevPoint.value + (nextPoint.value - prevPoint.value) * logT;

      case 'linear':
      default:
        // Linear interpolation
        return prevPoint.value + (nextPoint.value - prevPoint.value) * t;
    }
  }

  private scheduleMetronome(
    currentBeat: number,
    scheduleUpToBeat: number,
    bpm: number,
    timeSignature: [number, number]
  ) {
    const beatsPerBar = timeSignature[0] * (4 / timeSignature[1]);
    const beatsPerSecond = bpm / 60;

    // Find the next beat to schedule
    let beatToSchedule = Math.ceil(this.lastScheduledBeat);

    while (beatToSchedule < scheduleUpToBeat) {
      if (beatToSchedule >= currentBeat - 0.01) {
        const beatInBar = beatToSchedule % beatsPerBar;
        const isDownbeat = Math.abs(beatInBar) < 0.01;

        // Calculate audio time for this beat
        const beatsFromStart = beatToSchedule - this.playStartBeat;
        const audioTime = this.playStartTime + (beatsFromStart / beatsPerSecond);

        if (audioTime > this.audioEngine.currentTime) {
          this.audioEngine.playMetronomeClick(audioTime, isDownbeat);
        }
      }
      beatToSchedule += 1;
    }
  }

  private scheduleMidiRegion(
    track: any,
    region: any,
    currentBeat: number,
    scheduleUpToBeat: number,
    bpm: number,
    tempoChanges?: Array<{ time: number; bpm: number; curve: string }>
  ) {
    // Debug: Log when we're scheduling
    console.log(`[Scheduler] scheduleMidiRegion: track=${track.name}, region=${region.name}, currentBeat=${currentBeat.toFixed(2)}, scheduleUpTo=${scheduleUpToBeat.toFixed(2)}, lastScheduled=${this.lastScheduledBeat.toFixed(2)}, notes=${region.notes.length}`);

    region.notes.forEach((note: any, idx: number) => {
      const noteKey = `${region.id}_${note.id}`;

      // Skip if already scheduled
      if (this.scheduledNotes.has(noteKey)) return;

      // Calculate absolute beat position
      const noteStartBeat = region.startTime + note.startTime;
      const noteEndBeat = noteStartBeat + note.duration;

      // Debug first 3 notes
      if (idx < 3) {
        console.log(`[Note ${idx}] noteStartBeat=${noteStartBeat.toFixed(2)}, lastScheduled=${this.lastScheduledBeat.toFixed(2)}, scheduleUpTo=${scheduleUpToBeat.toFixed(2)}, inWindow=${noteStartBeat >= this.lastScheduledBeat && noteStartBeat < scheduleUpToBeat}`);
      }

      // Check if note should be scheduled in this window
      if (noteStartBeat >= this.lastScheduledBeat && noteStartBeat < scheduleUpToBeat) {
        // Calculate audio time using tempo automation
        const timeToNote = this.getTimeForBeat(noteStartBeat, tempoChanges, bpm, this.playStartBeat);
        const currentTime = this.audioEngine.currentTime;
        let audioTime = this.playStartTime + timeToNote;

        // If note is in the past, we need to decide whether to play it
        // Allow catching up to 2 seconds of missed notes (for loop restart, late first tick, etc.)
        const maxPastTime = 2.0; // 2 second tolerance for catch-up
        if (audioTime < currentTime) {
          if (audioTime >= currentTime - maxPastTime) {
            // Schedule immediately with a tiny offset to avoid clicks
            audioTime = currentTime + 0.005;
          } else {
            // Too far in the past, skip this note
            return;
          }
        }

        if (audioTime >= currentTime) {
          // Calculate note duration considering tempo at note position
          const noteBpm = this.getBpmAtBeat(noteStartBeat, tempoChanges, bpm);
          const duration = note.duration * (60 / noteBpm);

          this.audioEngine.playMidiNote(
            track.id,
            note.pitch,
            note.velocity,
            audioTime,
            duration
          );

          this.scheduledNotes.set(noteKey, { noteOff: noteEndBeat });

          // Auto-remove from scheduled notes after note ends
          setTimeout(() => {
            this.scheduledNotes.delete(noteKey);
          }, (duration + 0.5) * 1000);
        }
      }
    });
  }

  private scheduleAudioRegion(
    track: any,
    region: any,
    currentBeat: number,
    scheduleUpToBeat: number,
    bpm: number,
    tempoChanges?: Array<{ time: number; bpm: number; curve: string }>
  ) {
    const regionKey = `audio_${region.id}`;

    // Only trigger at region start
    if (this.scheduledNotes.has(regionKey)) return;

    const regionStart = region.startTime;

    if (regionStart >= this.lastScheduledBeat && regionStart < scheduleUpToBeat) {
      // Calculate audio time using tempo automation
      const timeToRegion = this.getTimeForBeat(regionStart, tempoChanges, bpm, this.playStartBeat);
      const audioTime = this.playStartTime + timeToRegion;

      if (audioTime > this.audioEngine.currentTime) {
        // Calculate duration considering tempo at region position
        const regionBpm = this.getBpmAtBeat(regionStart, tempoChanges, bpm);
        const duration = region.duration * (60 / regionBpm);

        this.audioEngine.playSample(
          region.audioUrl,
          audioTime,
          track.id,
          region.gain ?? 1,
          0, // pitch
          duration,
          region.offset ?? 0
        );

        this.scheduledNotes.set(regionKey, { noteOff: region.startTime + region.duration });

        setTimeout(() => {
          this.scheduledNotes.delete(regionKey);
        }, (duration + 0.5) * 1000);
      }
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}

// Singleton instance
export const dawAudioEngine = new DAWAudioEngine();
export const dawScheduler = new DAWScheduler(dawAudioEngine);

// Expose for debugging
(window as any).__DAW_AUDIO_ENGINE__ = dawAudioEngine;
(window as any).__DAW_SCHEDULER__ = dawScheduler;

// Debug function to test audio at different points in the chain
(window as any).__TEST_AUDIO__ = async () => {
  const ctx = dawAudioEngine.context;
  if (!ctx) {
    console.log('[TEST] No audio context');
    return;
  }

  console.log('[TEST] AudioContext state:', ctx.state);

  // Resume if needed
  if (ctx.state === 'suspended') {
    console.log('[TEST] Resuming suspended context...');
    await ctx.resume();
    console.log('[TEST] Context resumed, state:', ctx.state);
  }

  // Create a simple beep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 440;
  osc.type = 'sine';
  gain.gain.value = 0.5;

  osc.connect(gain);
  gain.connect(ctx.destination);

  console.log('[TEST] Playing 440Hz tone directly to destination...');
  osc.start();
  osc.stop(ctx.currentTime + 0.5);

  setTimeout(() => {
    console.log('[TEST] Tone should have played');
  }, 600);
};

// Test playing through the master chain
(window as any).__TEST_AUDIO_MASTER__ = async () => {
  const ctx = dawAudioEngine.context;
  if (!ctx) {
    console.log('[TEST_MASTER] No audio context');
    return;
  }

  console.log('[TEST_MASTER] AudioContext state:', ctx.state);
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Access the private masterGain - use type assertion
  const engine = dawAudioEngine as any;
  const masterGain = engine.masterGain;

  if (!masterGain) {
    console.log('[TEST_MASTER] No masterGain');
    return;
  }

  console.log('[TEST_MASTER] masterGain.gain.value:', masterGain.gain.value);

  // Create a simple beep through master
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  osc.type = 'sine';
  gain.gain.value = 0.5;

  osc.connect(gain);
  gain.connect(masterGain);

  console.log('[TEST_MASTER] Playing 880Hz tone through masterGain...');
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

// Test playing through a drum track's processor
(window as any).__TEST_AUDIO_TRACK__ = async (trackId?: string) => {
  const ctx = dawAudioEngine.context;
  if (!ctx) {
    console.log('[TEST_TRACK] No audio context');
    return;
  }

  console.log('[TEST_TRACK] AudioContext state:', ctx.state);
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Access the private trackProcessors
  const engine = dawAudioEngine as any;
  const trackProcessors = engine.trackProcessors as Map<string, TrackProcessor>;

  console.log('[TEST_TRACK] Available tracks:', Array.from(trackProcessors.keys()));

  // Find a drummer track or use provided trackId
  let processor: TrackProcessor | undefined;
  if (trackId) {
    processor = trackProcessors.get(trackId);
  } else {
    // Find a drummer track
    for (const [id, proc] of trackProcessors) {
      if (proc.getTrackType() === 'drummer') {
        processor = proc;
        trackId = id;
        break;
      }
    }
  }

  if (!processor) {
    console.log('[TEST_TRACK] No processor found');
    return;
  }

  console.log('[TEST_TRACK] Using track:', trackId);
  console.log('[TEST_TRACK] Track type:', processor.getTrackType());
  console.log('[TEST_TRACK] outputNode.gain.value:', processor.outputNode.gain.value);
  console.log('[TEST_TRACK] inputNode.gain.value:', processor.inputNode.gain.value);

  // Create a simple beep through the track's input
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 660;
  osc.type = 'sine';
  gain.gain.value = 0.5;

  osc.connect(gain);
  gain.connect(processor.inputNode);

  console.log('[TEST_TRACK] Playing 660Hz tone through track inputNode...');
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

// Test playing a drum sample directly
(window as any).__TEST_DRUM_SAMPLE__ = async () => {
  const ctx = dawAudioEngine.context;
  if (!ctx) {
    console.log('[TEST_DRUM] No audio context');
    return;
  }

  console.log('[TEST_DRUM] AudioContext state:', ctx.state);
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Access the private trackProcessors
  const engine = dawAudioEngine as any;
  const trackProcessors = engine.trackProcessors as Map<string, TrackProcessor>;

  // Find a drummer track
  let drumTrackId: string | undefined;
  let drumProcessor: TrackProcessor | undefined;
  for (const [id, proc] of trackProcessors) {
    if (proc.getTrackType() === 'drummer') {
      drumTrackId = id;
      drumProcessor = proc;
      break;
    }
  }

  if (!drumProcessor) {
    console.log('[TEST_DRUM] No drummer track found');
    return;
  }

  const drumSampler = drumProcessor.getDrumSampler();
  if (!drumSampler) {
    console.log('[TEST_DRUM] No drum sampler found');
    return;
  }

  console.log('[TEST_DRUM] Playing kick (note 36) in 0.1s...');
  dawAudioEngine.playMidiNote(drumTrackId!, 36, 100, ctx.currentTime + 0.1, 0.5);
};
