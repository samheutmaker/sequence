/**
 * Lookahead Scheduler for precise timing
 * Schedules notes ahead of time using Web Audio API's clock
 */

import { audioEngine } from "./AudioEngine";
import type { Step } from "../types";

export interface SchedulerTrack {
  id: string;
  sampleUrl: string;
  sequence: Step[];
  muted: boolean;
  solo: boolean;
  pitch: number;
}

export interface SchedulerCallbacks {
  onStep: (step: number) => void;
  getTracks: () => SchedulerTrack[];
  getBpm: () => number;
  getSwing: () => number;
  getPatternLength: () => number;
  hasSoloTrack: () => boolean;
}

export class Scheduler {
  private lookahead = 0.1; // Schedule 100ms ahead
  private scheduleInterval = 25; // Check every 25ms
  private nextNoteTime = 0;
  private currentStep = 0;
  private timerId: number | null = null;
  private isRunning = false;
  private callbacks: SchedulerCallbacks;

  constructor(callbacks: SchedulerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) return;
    if (!audioEngine.isInitialized) {
      console.warn("AudioEngine not initialized");
      return;
    }

    this.isRunning = true;
    this.currentStep = 0;
    this.nextNoteTime = audioEngine.currentTime;
    this.scheduleLoop();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    this.currentStep = 0;
    this.callbacks.onStep(0);
  }

  /**
   * Main scheduling loop
   */
  private scheduleLoop = (): void => {
    if (!this.isRunning) return;

    // Schedule all notes within the lookahead window
    while (
      this.nextNoteTime <
      audioEngine.currentTime + this.lookahead
    ) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }

    // Schedule next check
    this.timerId = window.setTimeout(this.scheduleLoop, this.scheduleInterval);
  };

  /**
   * Schedule a single step
   */
  private scheduleStep(step: number, time: number): void {
    const tracks = this.callbacks.getTracks();
    const hasSolo = this.callbacks.hasSoloTrack();

    // Notify UI of step change (with slight delay to sync with audio)
    const uiDelay = Math.max(0, (time - audioEngine.currentTime) * 1000);
    setTimeout(() => {
      if (this.isRunning) {
        this.callbacks.onStep(step);
      }
    }, uiDelay);

    // Play samples for active steps
    tracks.forEach((track) => {
      // Skip if muted, or if there's a solo track and this isn't it
      if (track.muted) return;
      if (hasSolo && !track.solo) return;

      const stepData = track.sequence[step];
      if (stepData && stepData.active) {
        audioEngine.playSample(
          track.sampleUrl,
          time,
          track.id,
          stepData.velocity,
          track.pitch
        );
      }
    });
  }

  /**
   * Advance to next step and calculate timing
   */
  private advanceStep(): void {
    const bpm = this.callbacks.getBpm();
    const swing = this.callbacks.getSwing();
    const patternLength = this.callbacks.getPatternLength();

    // Calculate step duration (16 steps per bar, 4 beats per bar)
    // So each step is 1/4 of a beat
    const secondsPerBeat = 60 / bpm;
    const secondsPerStep = secondsPerBeat / 4;

    // Apply swing to odd steps (makes them "late")
    const isOddStep = this.currentStep % 2 === 1;
    const swingAmount = isOddStep ? (swing / 100) * secondsPerStep * 0.5 : 0;

    this.nextNoteTime += secondsPerStep + swingAmount;
    this.currentStep = (this.currentStep + 1) % patternLength;
  }

  /**
   * Get current step (for external sync)
   */
  get step(): number {
    return this.currentStep;
  }

  /**
   * Check if running
   */
  get running(): boolean {
    return this.isRunning;
  }
}
