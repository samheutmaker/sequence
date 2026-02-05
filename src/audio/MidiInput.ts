/**
 * MIDI Input Service - Web MIDI API integration for recording
 */

export interface MidiInputDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export interface RecordedMidiNote {
  note: number;
  velocity: number;
  startTime: number; // in seconds from recording start
  duration: number;  // in seconds
}

type MidiMessageCallback = (note: number, velocity: number, isNoteOn: boolean) => void;

class MidiInputService {
  private midiAccess: MIDIAccess | null = null;
  private activeInputs: Map<string, MIDIInput> = new Map();
  private isRecording = false;
  private recordingStartTime = 0;
  private recordedNotes: RecordedMidiNote[] = [];
  private activeNotes: Map<number, { startTime: number; velocity: number }> = new Map();
  private onMidiMessage: MidiMessageCallback | null = null;

  async init(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn('[MidiInput] Web MIDI API not supported');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      console.log('[MidiInput] MIDI access granted');

      // Listen for device connection changes
      this.midiAccess.onstatechange = () => {
        console.log('[MidiInput] MIDI device state changed');
      };

      return true;
    } catch (err) {
      console.error('[MidiInput] Failed to get MIDI access:', err);
      return false;
    }
  }

  getInputDevices(): MidiInputDevice[] {
    if (!this.midiAccess) return [];

    const devices: MidiInputDevice[] = [];
    this.midiAccess.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || 'Unknown',
      });
    });

    return devices;
  }

  connectToDevice(deviceId: string): boolean {
    if (!this.midiAccess) return false;

    const input = this.midiAccess.inputs.get(deviceId);
    if (!input) {
      console.warn('[MidiInput] Device not found:', deviceId);
      return false;
    }

    // Disconnect if already connected
    if (this.activeInputs.has(deviceId)) {
      this.disconnectFromDevice(deviceId);
    }

    input.onmidimessage = this.handleMidiMessage.bind(this);
    this.activeInputs.set(deviceId, input);
    console.log('[MidiInput] Connected to:', input.name);
    return true;
  }

  disconnectFromDevice(deviceId: string): void {
    const input = this.activeInputs.get(deviceId);
    if (input) {
      input.onmidimessage = null;
      this.activeInputs.delete(deviceId);
      console.log('[MidiInput] Disconnected from:', input.name);
    }
  }

  connectToAllDevices(): void {
    const devices = this.getInputDevices();
    devices.forEach(device => this.connectToDevice(device.id));
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    const [status, note, velocity] = event.data || [];

    // Check for note on/off messages (channels 1-16)
    const messageType = status & 0xf0;
    const isNoteOn = messageType === 0x90 && velocity > 0;
    const isNoteOff = messageType === 0x80 || (messageType === 0x90 && velocity === 0);

    if (isNoteOn) {
      this.handleNoteOn(note, velocity);
    } else if (isNoteOff) {
      this.handleNoteOff(note);
    }

    // Call external callback for real-time monitoring
    if (this.onMidiMessage && (isNoteOn || isNoteOff)) {
      this.onMidiMessage(note, velocity, isNoteOn);
    }
  }

  private handleNoteOn(note: number, velocity: number): void {
    if (!this.isRecording) return;

    const currentTime = (performance.now() / 1000) - this.recordingStartTime;
    this.activeNotes.set(note, { startTime: currentTime, velocity });
  }

  private handleNoteOff(note: number): void {
    if (!this.isRecording) return;

    const noteData = this.activeNotes.get(note);
    if (noteData) {
      const currentTime = (performance.now() / 1000) - this.recordingStartTime;
      const duration = currentTime - noteData.startTime;

      this.recordedNotes.push({
        note,
        velocity: noteData.velocity,
        startTime: noteData.startTime,
        duration: Math.max(duration, 0.01), // Minimum duration
      });

      this.activeNotes.delete(note);
    }
  }

  startRecording(): void {
    this.isRecording = true;
    this.recordingStartTime = performance.now() / 1000;
    this.recordedNotes = [];
    this.activeNotes.clear();
    console.log('[MidiInput] Recording started');
  }

  stopRecording(): RecordedMidiNote[] {
    // Close any still-active notes
    const stopTime = (performance.now() / 1000) - this.recordingStartTime;
    this.activeNotes.forEach((noteData, note) => {
      this.recordedNotes.push({
        note,
        velocity: noteData.velocity,
        startTime: noteData.startTime,
        duration: stopTime - noteData.startTime,
      });
    });

    this.isRecording = false;
    this.activeNotes.clear();

    const notes = [...this.recordedNotes];
    this.recordedNotes = [];

    console.log('[MidiInput] Recording stopped, captured', notes.length, 'notes');
    return notes;
  }

  setMidiMessageCallback(callback: MidiMessageCallback | null): void {
    this.onMidiMessage = callback;
  }

  isAvailable(): boolean {
    return this.midiAccess !== null;
  }

  getActiveInputCount(): number {
    return this.activeInputs.size;
  }
}

export const midiInputService = new MidiInputService();
