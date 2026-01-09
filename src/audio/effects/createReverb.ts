/**
 * Algorithmic reverb generator
 * Creates impulse response buffers for ConvolverNode
 */

/**
 * Create a simple algorithmic reverb impulse response
 * Uses exponential decay with noise
 *
 * @param ctx - AudioContext
 * @param duration - Reverb tail length in seconds
 * @param decay - Decay rate (higher = faster decay)
 * @returns AudioBuffer impulse response
 */
export function createSimpleReverb(
  ctx: AudioContext,
  duration: number = 2,
  decay: number = 2
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);

  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    // Exponential decay envelope
    const envelope = Math.exp((-i / length) * decay * 3);

    // Generate noise with slight stereo difference
    const noiseL = (Math.random() * 2 - 1) * envelope;
    const noiseR = (Math.random() * 2 - 1) * envelope;

    leftChannel[i] = noiseL;
    rightChannel[i] = noiseR;
  }

  return impulse;
}

/**
 * Create a room-style reverb with early reflections
 *
 * @param ctx - AudioContext
 * @param roomSize - Room size (0.1 = small, 1.0 = large)
 * @param damping - High frequency damping (0-1)
 * @returns AudioBuffer impulse response
 */
export function createRoomReverb(
  ctx: AudioContext,
  roomSize: number = 0.5,
  damping: number = 0.5
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.5 + roomSize * 2.5; // 0.5 to 3 seconds
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);

  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  // Early reflection times (in samples) based on room size
  const earlyReflections = [
    Math.floor(sampleRate * 0.01 * roomSize),
    Math.floor(sampleRate * 0.02 * roomSize),
    Math.floor(sampleRate * 0.03 * roomSize),
    Math.floor(sampleRate * 0.04 * roomSize),
    Math.floor(sampleRate * 0.05 * roomSize),
  ];

  // Create early reflections
  for (const delay of earlyReflections) {
    if (delay < length) {
      const amplitude = 0.5 * Math.exp(-delay / (sampleRate * 0.1));
      leftChannel[delay] += amplitude * (0.5 + Math.random() * 0.5);
      rightChannel[delay] += amplitude * (0.5 + Math.random() * 0.5);
    }
  }

  // Create diffuse tail
  const tailStart = Math.floor(sampleRate * 0.05 * roomSize);
  const decayRate = 3 + damping * 4;

  for (let i = tailStart; i < length; i++) {
    const t = (i - tailStart) / (length - tailStart);
    const envelope = Math.exp(-t * decayRate);

    // Apply high frequency damping (filter noise)
    const noise = Math.random() * 2 - 1;
    const dampedNoise = noise * (1 - damping * t);

    leftChannel[i] += dampedNoise * envelope * 0.3;
    rightChannel[i] += (Math.random() * 2 - 1) * envelope * 0.3;
  }

  return impulse;
}

/**
 * Create a hall-style reverb with long tail
 *
 * @param ctx - AudioContext
 * @returns AudioBuffer impulse response
 */
export function createHallReverb(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 3.5;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);

  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  // Multiple decay layers for richness
  const layers = [
    { delay: 0, decay: 2.5, amplitude: 1.0 },
    { delay: 0.02, decay: 3.0, amplitude: 0.7 },
    { delay: 0.05, decay: 3.5, amplitude: 0.5 },
    { delay: 0.1, decay: 4.0, amplitude: 0.3 },
  ];

  for (const layer of layers) {
    const startSample = Math.floor(sampleRate * layer.delay);

    for (let i = startSample; i < length; i++) {
      const t = (i - startSample) / (length - startSample);
      const envelope = Math.exp(-t * layer.decay) * layer.amplitude;

      leftChannel[i] += (Math.random() * 2 - 1) * envelope * 0.2;
      rightChannel[i] += (Math.random() * 2 - 1) * envelope * 0.2;
    }
  }

  return impulse;
}

/**
 * Create a plate-style reverb (dense, metallic)
 *
 * @param ctx - AudioContext
 * @returns AudioBuffer impulse response
 */
export function createPlateReverb(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 2.5;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);

  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  // Plate reverb has dense, quick early reflections
  const density = 200;
  for (let i = 0; i < density; i++) {
    const position = Math.floor(Math.random() * sampleRate * 0.1);
    const amplitude = (1 - i / density) * 0.3;
    if (position < length) {
      leftChannel[position] += amplitude * (Math.random() * 2 - 1);
      rightChannel[position] += amplitude * (Math.random() * 2 - 1);
    }
  }

  // Smooth decay tail
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const envelope = Math.exp(-t * 3) * (1 - Math.exp(-i / (sampleRate * 0.01)));

    leftChannel[i] += (Math.random() * 2 - 1) * envelope * 0.15;
    rightChannel[i] += (Math.random() * 2 - 1) * envelope * 0.15;
  }

  return impulse;
}
