/**
 * TrackEffectsChain - Per-track audio effects processing
 * Provides distortion, delay, and reverb with wet/dry mixing
 */

import { createDistortionCurve } from "./createDistortion";
import { createSimpleReverb } from "./createReverb";

export class TrackEffectsChain {
  private ctx: AudioContext;

  // Routing nodes
  private input: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private output: GainNode;

  // Effects nodes
  private distortionNode: WaveShaperNode;
  private distortionGain: GainNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayWetGain: GainNode;
  private reverbNode: ConvolverNode;
  private reverbWetGain: GainNode;

  // Current values
  private distortionAmount = 0;
  private delayAmount = 0;
  private delayTimeValue = 0.3;
  private reverbAmount = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Create routing nodes
    this.input = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.output = ctx.createGain();

    // Initialize wet/dry at fully dry
    this.dryGain.gain.value = 1;
    this.wetGain.gain.value = 0;

    // Create distortion
    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.oversample = "4x";
    this.distortionGain = ctx.createGain();
    this.distortionGain.gain.value = 1;

    // Create delay
    this.delayNode = ctx.createDelay(2.0);
    this.delayNode.delayTime.value = this.delayTimeValue;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayWetGain = ctx.createGain();
    this.delayWetGain.gain.value = 0;

    // Create reverb (convolver with generated impulse)
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = createSimpleReverb(ctx, 2, 2);
    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.value = 0;

    // Wire up the signal chain
    this.connectNodes();
  }

  private connectNodes(): void {
    // Input splits to dry and wet paths
    this.input.connect(this.dryGain);
    this.input.connect(this.distortionNode);

    // Effects chain: distortion -> delay -> reverb
    // Distortion path
    this.distortionNode.connect(this.distortionGain);

    // Delay with feedback loop
    this.distortionGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode); // Feedback loop
    this.delayNode.connect(this.delayWetGain);

    // Also send dry (post-distortion) signal through
    this.distortionGain.connect(this.wetGain);
    this.delayWetGain.connect(this.wetGain);

    // Reverb path
    this.wetGain.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbWetGain);

    // Mix outputs
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);
    this.reverbWetGain.connect(this.output);
  }

  /**
   * Get the input node for connecting sources
   */
  get inputNode(): GainNode {
    return this.input;
  }

  /**
   * Connect the output to a destination
   */
  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  /**
   * Disconnect from all destinations
   */
  disconnect(): void {
    this.output.disconnect();
  }

  /**
   * Set distortion amount (0-1)
   */
  setDistortion(amount: number): void {
    amount = Math.max(0, Math.min(1, amount));
    this.distortionAmount = amount;

    if (amount === 0) {
      // Bypass distortion
      this.distortionNode.curve = null;
    } else {
      this.distortionNode.curve = createDistortionCurve(amount);
    }

    // Adjust wet/dry based on if any effects are active
    this.updateWetDry();
  }

  /**
   * Set delay wet/dry (0-1)
   */
  setDelay(wetDry: number): void {
    wetDry = Math.max(0, Math.min(1, wetDry));
    this.delayAmount = wetDry;

    const time = this.ctx.currentTime;
    this.delayWetGain.gain.setValueAtTime(this.delayWetGain.gain.value, time);
    this.delayWetGain.gain.linearRampToValueAtTime(wetDry * 0.7, time + 0.05);

    this.updateWetDry();
  }

  /**
   * Set delay time in seconds (0.1-2.0)
   */
  setDelayTime(seconds: number): void {
    seconds = Math.max(0.05, Math.min(2.0, seconds));
    this.delayTimeValue = seconds;

    const time = this.ctx.currentTime;
    this.delayNode.delayTime.setValueAtTime(
      this.delayNode.delayTime.value,
      time
    );
    this.delayNode.delayTime.linearRampToValueAtTime(seconds, time + 0.05);
  }

  /**
   * Set reverb wet/dry (0-1)
   */
  setReverb(wetDry: number): void {
    wetDry = Math.max(0, Math.min(1, wetDry));
    this.reverbAmount = wetDry;

    const time = this.ctx.currentTime;
    this.reverbWetGain.gain.setValueAtTime(this.reverbWetGain.gain.value, time);
    this.reverbWetGain.gain.linearRampToValueAtTime(wetDry * 0.8, time + 0.05);

    this.updateWetDry();
  }

  /**
   * Update wet/dry mix based on active effects
   */
  private updateWetDry(): void {
    const hasEffects =
      this.distortionAmount > 0 ||
      this.delayAmount > 0 ||
      this.reverbAmount > 0;

    const time = this.ctx.currentTime;

    if (hasEffects) {
      // Reduce dry signal slightly when effects are active
      const dryLevel = 1 - Math.max(this.delayAmount, this.reverbAmount) * 0.3;
      this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, time);
      this.dryGain.gain.linearRampToValueAtTime(dryLevel, time + 0.05);

      // Enable wet path
      const wetLevel = this.distortionAmount > 0 ? 1 : 0;
      this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, time);
      this.wetGain.gain.linearRampToValueAtTime(wetLevel, time + 0.05);
    } else {
      // Full dry signal
      this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, time);
      this.dryGain.gain.linearRampToValueAtTime(1, time + 0.05);
      this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, time);
      this.wetGain.gain.linearRampToValueAtTime(0, time + 0.05);
    }
  }

  /**
   * Clean up all nodes
   */
  dispose(): void {
    this.input.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.output.disconnect();
    this.distortionNode.disconnect();
    this.distortionGain.disconnect();
    this.delayNode.disconnect();
    this.delayFeedback.disconnect();
    this.delayWetGain.disconnect();
    this.reverbNode.disconnect();
    this.reverbWetGain.disconnect();
  }
}
