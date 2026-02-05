/**
 * MIDI File Import - Parse Standard MIDI Files (.mid/.midi)
 */

import { generateId } from '../types/daw';
import type { MidiNote, MidiRegion } from '../types/daw';

interface MidiEvent {
  deltaTime: number;
  type: string;
  channel?: number;
  note?: number;
  velocity?: number;
  data?: number[];
}

interface MidiTrack {
  name: string;
  events: MidiEvent[];
}

interface ParsedMidi {
  format: number;
  numTracks: number;
  ticksPerBeat: number;
  tracks: MidiTrack[];
  tempoChanges: { tick: number; bpm: number }[];
}

/**
 * Parse a MIDI file from ArrayBuffer
 */
export function parseMidiFile(buffer: ArrayBuffer): ParsedMidi {
  const view = new DataView(buffer);
  let offset = 0;

  // Read header chunk
  const headerChunk = readString(view, offset, 4);
  if (headerChunk !== 'MThd') {
    throw new Error('Invalid MIDI file: missing MThd header');
  }
  offset += 4;

  const headerLength = view.getUint32(offset, false);
  offset += 4;

  const format = view.getUint16(offset, false);
  offset += 2;

  const numTracks = view.getUint16(offset, false);
  offset += 2;

  const timeDivision = view.getUint16(offset, false);
  offset += 2;

  // Handle time division - we only support ticks per beat (not SMPTE)
  let ticksPerBeat = 480; // default
  if ((timeDivision & 0x8000) === 0) {
    ticksPerBeat = timeDivision;
  }

  // Skip any remaining header bytes
  offset = 8 + 4 + headerLength;

  const tracks: MidiTrack[] = [];
  const tempoChanges: { tick: number; bpm: number }[] = [];

  // Read track chunks
  for (let i = 0; i < numTracks; i++) {
    if (offset >= buffer.byteLength) break;

    const trackChunk = readString(view, offset, 4);
    if (trackChunk !== 'MTrk') {
      console.warn(`Expected MTrk at offset ${offset}, got ${trackChunk}`);
      break;
    }
    offset += 4;

    const trackLength = view.getUint32(offset, false);
    offset += 4;

    const trackEnd = offset + trackLength;
    const events: MidiEvent[] = [];
    let trackName = `Track ${i + 1}`;
    let currentTick = 0;
    let runningStatus = 0;

    while (offset < trackEnd) {
      // Read delta time (variable length)
      const { value: deltaTime, bytesRead } = readVariableLength(view, offset);
      offset += bytesRead;
      currentTick += deltaTime;

      // Read event
      let statusByte = view.getUint8(offset);

      // Handle running status
      if (statusByte < 0x80) {
        statusByte = runningStatus;
      } else {
        offset++;
        if (statusByte < 0xf0) {
          runningStatus = statusByte;
        }
      }

      const eventType = statusByte & 0xf0;
      const channel = statusByte & 0x0f;

      if (statusByte === 0xff) {
        // Meta event
        const metaType = view.getUint8(offset);
        offset++;

        const { value: length, bytesRead: lenBytes } = readVariableLength(view, offset);
        offset += lenBytes;

        if (metaType === 0x03) {
          // Track name
          trackName = readString(view, offset, length);
        } else if (metaType === 0x51) {
          // Tempo (microseconds per quarter note)
          if (length >= 3) {
            const microsecondsPerBeat = (view.getUint8(offset) << 16) |
              (view.getUint8(offset + 1) << 8) |
              view.getUint8(offset + 2);
            const bpm = Math.round(60000000 / microsecondsPerBeat);
            tempoChanges.push({ tick: currentTick, bpm });
          }
        } else if (metaType === 0x2f) {
          // End of track
          offset += length;
          break;
        }

        offset += length;
      } else if (statusByte === 0xf0 || statusByte === 0xf7) {
        // SysEx event
        const { value: length, bytesRead: lenBytes } = readVariableLength(view, offset);
        offset += lenBytes + length;
      } else if (eventType === 0x80 || eventType === 0x90) {
        // Note off / Note on
        const note = view.getUint8(offset);
        offset++;
        const velocity = view.getUint8(offset);
        offset++;

        events.push({
          deltaTime: currentTick,
          type: eventType === 0x90 && velocity > 0 ? 'noteOn' : 'noteOff',
          channel,
          note,
          velocity: eventType === 0x90 ? velocity : 0,
        });
      } else if (eventType === 0xa0) {
        // Polyphonic key pressure
        offset += 2;
      } else if (eventType === 0xb0) {
        // Control change
        offset += 2;
      } else if (eventType === 0xc0) {
        // Program change
        offset++;
      } else if (eventType === 0xd0) {
        // Channel pressure
        offset++;
      } else if (eventType === 0xe0) {
        // Pitch bend
        offset += 2;
      }
    }

    // Ensure we're at the end of the track
    offset = trackEnd;

    tracks.push({
      name: trackName,
      events,
    });
  }

  return {
    format,
    numTracks,
    ticksPerBeat,
    tracks,
    tempoChanges,
  };
}

/**
 * Convert parsed MIDI to DAW regions
 */
export function midiToRegions(
  parsed: ParsedMidi,
  trackId: string,
  startBeat: number = 0,
  color: string = '#0a84ff'
): MidiRegion[] {
  const regions: MidiRegion[] = [];
  const ticksPerBeat = parsed.ticksPerBeat;

  for (const track of parsed.tracks) {
    if (track.events.length === 0) continue;

    // Build notes from note on/off pairs
    const activeNotes = new Map<number, { tick: number; velocity: number }>();
    const notes: MidiNote[] = [];
    let minTick = Infinity;
    let maxTick = 0;

    for (const event of track.events) {
      if (event.type === 'noteOn' && event.note !== undefined) {
        activeNotes.set(event.note, {
          tick: event.deltaTime,
          velocity: event.velocity || 100,
        });
        minTick = Math.min(minTick, event.deltaTime);
      } else if (event.type === 'noteOff' && event.note !== undefined) {
        const noteOn = activeNotes.get(event.note);
        if (noteOn) {
          const startTick = noteOn.tick;
          const endTick = event.deltaTime;
          const durationTicks = endTick - startTick;

          notes.push({
            id: generateId(),
            pitch: event.note,
            velocity: noteOn.velocity,
            startTime: startTick / ticksPerBeat,
            duration: Math.max(0.0625, durationTicks / ticksPerBeat), // Min 1/16 note
          });

          maxTick = Math.max(maxTick, endTick);
          activeNotes.delete(event.note);
        }
      }
    }

    if (notes.length === 0) continue;

    // Adjust note start times to be relative to region start
    const regionStartBeat = minTick / ticksPerBeat;
    const regionDuration = Math.max(4, Math.ceil((maxTick - minTick) / ticksPerBeat / 4) * 4); // Round up to bars

    for (const note of notes) {
      note.startTime = note.startTime - regionStartBeat;
    }

    regions.push({
      id: generateId(),
      name: track.name || 'Imported MIDI',
      trackId,
      startTime: startBeat + regionStartBeat,
      duration: regionDuration,
      color,
      muted: false,
      looped: false,
      notes,
      quantize: '1/16',
    });
  }

  return regions;
}

/**
 * Import a MIDI file and return regions
 */
export async function importMidiFile(
  file: File,
  trackId: string,
  startBeat: number = 0,
  color: string = '#0a84ff'
): Promise<{ regions: MidiRegion[]; tempo?: number }> {
  const buffer = await file.arrayBuffer();
  const parsed = parseMidiFile(buffer);
  const regions = midiToRegions(parsed, trackId, startBeat, color);

  // Get initial tempo if available
  const tempo = parsed.tempoChanges.length > 0 ? parsed.tempoChanges[0].bpm : undefined;

  return { regions, tempo };
}

// Helper functions

function readString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    const byte = view.getUint8(offset + i);
    if (byte === 0) break;
    str += String.fromCharCode(byte);
  }
  return str;
}

function readVariableLength(view: DataView, offset: number): { value: number; bytesRead: number } {
  let value = 0;
  let bytesRead = 0;

  while (true) {
    const byte = view.getUint8(offset + bytesRead);
    bytesRead++;
    value = (value << 7) | (byte & 0x7f);

    if ((byte & 0x80) === 0) {
      break;
    }

    if (bytesRead > 4) {
      throw new Error('Invalid variable length value');
    }
  }

  return { value, bytesRead };
}
