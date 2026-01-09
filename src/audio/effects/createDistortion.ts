/**
 * Distortion curve generator
 * Creates a soft-clipping waveshaper curve
 */

/**
 * Generate a soft-clipping distortion curve
 * @param amount - Distortion amount (0-1)
 * @returns Float32Array waveshaper curve
 */
export function createDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);

  // Scale amount to a more useful range
  const k = amount * 50;

  for (let i = 0; i < samples; i++) {
    // Map index to -1 to 1 range
    const x = (i * 2) / samples - 1;

    if (k === 0) {
      // No distortion - linear pass-through
      curve[i] = x;
    } else {
      // Soft clipping using tanh-like curve
      // Formula: (3 + k) * x * 20 * (PI/180) / (PI + k * |x|)
      // This provides a smooth saturation characteristic
      const deg = Math.PI / 180;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
  }

  return curve;
}

/**
 * Generate a more aggressive hard-clipping curve
 * @param amount - Distortion amount (0-1)
 * @returns Float32Array waveshaper curve
 */
export function createHardClipCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);

  // Threshold for clipping (lower = more aggressive)
  const threshold = 1 - amount * 0.9;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;

    if (x > threshold) {
      curve[i] = threshold + (1 - threshold) * Math.tanh((x - threshold) * 2);
    } else if (x < -threshold) {
      curve[i] =
        -threshold - (1 - threshold) * Math.tanh((-x - threshold) * 2);
    } else {
      curve[i] = x;
    }
  }

  return curve;
}

/**
 * Generate a tube-style saturation curve
 * @param amount - Saturation amount (0-1)
 * @returns Float32Array waveshaper curve
 */
export function createTubeSaturationCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);

  const drive = 1 + amount * 10;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;

    // Asymmetric saturation (tube-like)
    if (x >= 0) {
      curve[i] = Math.tanh(x * drive);
    } else {
      // Softer clipping on negative side
      curve[i] = Math.tanh(x * drive * 0.8);
    }
  }

  return curve;
}
