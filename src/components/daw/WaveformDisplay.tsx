/**
 * Waveform Display - Audio waveform visualization for regions
 */

import { useRef, useEffect, useState, useCallback } from 'react';

interface WaveformDisplayProps {
  audioBuffer?: AudioBuffer;
  width: number;
  height: number;
  color?: string;
  backgroundColor?: string;
  // For demo/placeholder when no real audio
  isPlaceholder?: boolean;
}

export function WaveformDisplay({
  audioBuffer,
  width,
  height,
  color = '#30d158',
  backgroundColor = 'transparent',
  isPlaceholder = false,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);

  // Generate placeholder waveform data for demo
  const generatePlaceholderWaveform = useCallback((samples: number): Float32Array => {
    const data = new Float32Array(samples);

    // Generate realistic-looking audio waveform
    for (let i = 0; i < samples; i++) {
      const t = i / samples;

      // Multiple frequency components for realistic look
      const wave1 = Math.sin(t * Math.PI * 8) * 0.4;
      const wave2 = Math.sin(t * Math.PI * 23) * 0.25;
      const wave3 = Math.sin(t * Math.PI * 67) * 0.15;
      const wave4 = Math.sin(t * Math.PI * 157) * 0.1;

      // Add some noise
      const noise = (Math.random() - 0.5) * 0.1;

      // Envelope for natural sound shape
      const attack = Math.min(1, t * 10);
      const release = Math.min(1, (1 - t) * 5);
      const envelope = attack * release;

      // Combine and add variation
      const combined = (wave1 + wave2 + wave3 + wave4 + noise) * envelope;

      // Add some transients (percussive hits)
      const transient1 = t < 0.02 ? (1 - t / 0.02) * 0.8 : 0;
      const transient2 = t > 0.24 && t < 0.26 ? (1 - Math.abs(t - 0.25) / 0.01) * 0.6 : 0;
      const transient3 = t > 0.49 && t < 0.51 ? (1 - Math.abs(t - 0.5) / 0.01) * 0.7 : 0;
      const transient4 = t > 0.74 && t < 0.76 ? (1 - Math.abs(t - 0.75) / 0.01) * 0.5 : 0;

      data[i] = Math.max(-1, Math.min(1, combined + transient1 + transient2 + transient3 + transient4));
    }

    return data;
  }, []);

  // Extract waveform data from AudioBuffer
  useEffect(() => {
    if (audioBuffer) {
      // Get the first channel's data
      const channelData = audioBuffer.getChannelData(0);

      // Downsample to fit the width
      const samplesPerPixel = Math.floor(channelData.length / width);
      const downsampled = new Float32Array(width);

      for (let i = 0; i < width; i++) {
        const start = i * samplesPerPixel;
        const end = Math.min(start + samplesPerPixel, channelData.length);

        // Find the max absolute value in this range (peak detection)
        let maxVal = 0;
        for (let j = start; j < end; j++) {
          const absVal = Math.abs(channelData[j]);
          if (absVal > maxVal) maxVal = absVal;
        }

        downsampled[i] = maxVal;
      }

      setWaveformData(downsampled);
    } else if (isPlaceholder) {
      setWaveformData(generatePlaceholderWaveform(width));
    }
  }, [audioBuffer, width, isPlaceholder, generatePlaceholderWaveform]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = `${color}30`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw waveform
    ctx.fillStyle = color;

    const centerY = height / 2;
    const maxAmplitude = height / 2 - 2;

    for (let i = 0; i < waveformData.length; i++) {
      const amplitude = waveformData[i] * maxAmplitude;

      // Draw symmetric bar from center
      ctx.fillRect(
        i,
        centerY - amplitude,
        1,
        amplitude * 2
      );
    }

  }, [waveformData, width, height, color, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
}

/**
 * Stereo Waveform Display - Shows both left and right channels
 */
export function StereoWaveformDisplay({
  audioBuffer,
  width,
  height,
  leftColor = '#30d158',
  rightColor = '#0a84ff',
  isPlaceholder = false,
}: {
  audioBuffer?: AudioBuffer;
  width: number;
  height: number;
  leftColor?: string;
  rightColor?: string;
  isPlaceholder?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    const halfHeight = height / 2;
    const maxAmplitude = halfHeight - 2;

    // Generate or extract waveform data
    const samples = width;
    let leftData: Float32Array;
    let rightData: Float32Array;

    if (audioBuffer) {
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.numberOfChannels > 1
        ? audioBuffer.getChannelData(1)
        : leftChannel;

      const samplesPerPixel = Math.floor(leftChannel.length / samples);
      leftData = new Float32Array(samples);
      rightData = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        const start = i * samplesPerPixel;
        const end = Math.min(start + samplesPerPixel, leftChannel.length);

        let maxLeft = 0, maxRight = 0;
        for (let j = start; j < end; j++) {
          maxLeft = Math.max(maxLeft, Math.abs(leftChannel[j]));
          maxRight = Math.max(maxRight, Math.abs(rightChannel[j]));
        }

        leftData[i] = maxLeft;
        rightData[i] = maxRight;
      }
    } else if (isPlaceholder) {
      // Generate placeholder data
      leftData = new Float32Array(samples);
      rightData = new Float32Array(samples);

      for (let i = 0; i < samples; i++) {
        const t = i / samples;
        const base = Math.sin(t * Math.PI * 12) * 0.4 + Math.sin(t * Math.PI * 37) * 0.2;
        const noise = Math.random() * 0.15;
        const envelope = Math.min(1, t * 8) * Math.min(1, (1 - t) * 4);

        leftData[i] = Math.abs(base + noise) * envelope;
        rightData[i] = Math.abs(base + noise * 0.8 + Math.sin(t * Math.PI * 53) * 0.1) * envelope;
      }
    } else {
      return;
    }

    // Draw left channel (top half, inverted)
    ctx.fillStyle = leftColor;
    for (let i = 0; i < samples; i++) {
      const amplitude = leftData[i] * maxAmplitude;
      ctx.fillRect(i, halfHeight - amplitude, 1, amplitude);
    }

    // Draw right channel (bottom half)
    ctx.fillStyle = rightColor;
    for (let i = 0; i < samples; i++) {
      const amplitude = rightData[i] * maxAmplitude;
      ctx.fillRect(i, halfHeight, 1, amplitude);
    }

    // Center line
    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, halfHeight);
    ctx.lineTo(width, halfHeight);
    ctx.stroke();

  }, [audioBuffer, width, height, leftColor, rightColor, isPlaceholder]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

/**
 * Mini Waveform - Compact waveform for track headers
 */
export function MiniWaveform({
  width = 60,
  height = 20,
  color = '#98989d',
}: {
  width?: number;
  height?: number;
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;

    const centerY = height / 2;
    const maxAmp = height / 2 - 1;

    for (let i = 0; i < width; i++) {
      const t = i / width;
      const val = Math.sin(t * Math.PI * 8) * 0.5 + Math.sin(t * Math.PI * 19) * 0.3;
      const envelope = Math.min(1, t * 5) * Math.min(1, (1 - t) * 3);
      const amp = Math.abs(val) * envelope * maxAmp;

      ctx.fillRect(i, centerY - amp, 1, amp * 2);
    }
  }, [width, height, color]);

  return <canvas ref={canvasRef} className="opacity-50" />;
}
