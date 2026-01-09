/**
 * Web Audio API Engine for Beat Bot
 * Handles audio context, sample loading, and playback with effects
 */

import { TrackEffectsChain } from "./effects";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private samples: Map<string, AudioBuffer> = new Map();
  private trackGains: Map<string, GainNode> = new Map();
  private trackEffects: Map<string, TrackEffectsChain> = new Map();

  get context(): AudioContext | null {
    return this.ctx;
  }

  get isInitialized(): boolean {
    return this.ctx !== null;
  }

  /**
   * Initialize the audio context (must be called from user gesture)
   */
  async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext();

    // Create master chain: masterGain → analyser → destination
    this.masterGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Resume if suspended (needed for some browsers)
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  /**
   * Load a sample from URL and cache it
   */
  async loadSample(url: string): Promise<AudioBuffer> {
    if (this.samples.has(url)) {
      return this.samples.get(url)!;
    }

    if (!this.ctx) {
      throw new Error("AudioEngine not initialized");
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    this.samples.set(url, audioBuffer);
    return audioBuffer;
  }

  /**
   * Get or create a gain node for a track (with effects chain)
   */
  getTrackGain(trackId: string): GainNode {
    if (!this.ctx || !this.masterGain) {
      throw new Error("AudioEngine not initialized");
    }

    if (!this.trackGains.has(trackId)) {
      const gain = this.ctx.createGain();

      // Create effects chain for this track
      const effectsChain = new TrackEffectsChain(this.ctx);
      this.trackEffects.set(trackId, effectsChain);

      // Route: trackGain -> effectsChain -> masterGain
      gain.connect(effectsChain.inputNode);
      effectsChain.connect(this.masterGain);

      this.trackGains.set(trackId, gain);
    }

    return this.trackGains.get(trackId)!;
  }

  /**
   * Get the effects chain for a track
   */
  getTrackEffectsChain(trackId: string): TrackEffectsChain | undefined {
    return this.trackEffects.get(trackId);
  }

  /**
   * Set distortion amount for a track (0-1)
   */
  setTrackDistortion(trackId: string, amount: number): void {
    const effects = this.trackEffects.get(trackId);
    if (effects) {
      effects.setDistortion(amount);
    }
  }

  /**
   * Set delay wet/dry for a track (0-1)
   */
  setTrackDelay(trackId: string, wetDry: number): void {
    const effects = this.trackEffects.get(trackId);
    if (effects) {
      effects.setDelay(wetDry);
    }
  }

  /**
   * Set delay time for a track (0.1-2.0 seconds)
   */
  setTrackDelayTime(trackId: string, time: number): void {
    const effects = this.trackEffects.get(trackId);
    if (effects) {
      effects.setDelayTime(time);
    }
  }

  /**
   * Set reverb wet/dry for a track (0-1)
   */
  setTrackReverb(trackId: string, wetDry: number): void {
    const effects = this.trackEffects.get(trackId);
    if (effects) {
      effects.setReverb(wetDry);
    }
  }

  /**
   * Set volume for a track (0-1)
   */
  setTrackVolume(trackId: string, volume: number): void {
    const gain = this.trackGains.get(trackId);
    if (gain) {
      gain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Play a sample at a specific time
   * @param url - Sample URL (must be pre-loaded)
   * @param time - AudioContext time to play at
   * @param trackId - Track ID for routing
   * @param velocity - Velocity multiplier (0-1, default 1)
   * @param pitch - Pitch shift in semitones (-12 to 12)
   */
  playSample(
    url: string,
    time: number,
    trackId: string,
    velocity: number = 1,
    pitch: number = 0
  ): void {
    if (!this.ctx) return;

    const buffer = this.samples.get(url);
    if (!buffer) {
      console.warn(`Sample not loaded: ${url}`);
      return;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Apply pitch shift via playbackRate
    if (pitch !== 0) {
      source.playbackRate.value = Math.pow(2, pitch / 12);
    }

    // Create velocity gain node
    const velocityGain = this.ctx.createGain();
    velocityGain.gain.value = velocity;

    const trackGain = this.getTrackGain(trackId);
    source.connect(velocityGain);
    velocityGain.connect(trackGain);

    source.start(time);
  }

  /**
   * Play a sample immediately (for preview)
   */
  playNow(url: string, trackId: string): void {
    if (!this.ctx) return;
    this.playSample(url, this.ctx.currentTime, trackId);
  }

  /**
   * Get current audio context time
   */
  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /**
   * Get analyser data for visualization
   */
  getAnalyserData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(0);
    }

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  /**
   * Get frequency data for spectrum visualization
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(0);
    }

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Clean up effects chains
    this.trackEffects.forEach((effects) => effects.dispose());
    this.trackEffects.clear();

    this.trackGains.forEach((gain) => gain.disconnect());
    this.trackGains.clear();
    this.samples.clear();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
