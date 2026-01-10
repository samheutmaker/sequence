/**
 * DAW Inspector Panel - Track/Region properties
 */

import { useState, useEffect } from 'react';
import { useDAWStore } from '../../store/dawStore';
import { TRACK_COLORS, midiNoteToName } from '../../types/daw';
import type { MidiRegion, AudioRegion } from '../../types/daw';

// Audio input device interface
interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export function Inspector() {
  const {
    project,
    view,
    setTrackName,
    setTrackColor,
    setTrackVolume,
    setTrackPan,
    setTrackInput,
    setTrackOutput,
    setTrackRecordingMode,
    setTrackInstrument,
    setRegionMute,
    setRegionLoop,
    setBpm,
    setTimeSignature,
    setKey,
  } = useDAWStore();

  const [audioInputs, setAudioInputs] = useState<AudioInputDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('none');

  // Fetch available audio input devices
  useEffect(() => {
    async function getAudioInputs() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Input ${device.deviceId.slice(0, 8)}`,
          }));
        setAudioInputs(inputs);
      } catch {
        setAudioInputs([]);
      }
    }

    getAudioInputs();
  }, []);

  if (!project) return null;

  const selectedTrack = project.tracks.find(t => view.selectedTrackIds.includes(t.id));
  const selectedRegion = view.selectedRegionIds[0]
    ? project.regions[view.selectedRegionIds[0]]
    : null;

  // Convert volume to dB
  const volumeToDb = (vol: number) => {
    if (vol === 0) return '-∞';
    const db = 20 * Math.log10(vol) + 6;
    return db.toFixed(1);
  };

  // Convert pan to L/C/R
  const panToString = (pan: number) => {
    if (pan === 0) return 'C';
    if (pan < 0) return `${Math.abs(Math.round(pan * 100))}L`;
    return `${Math.round(pan * 100)}R`;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="h-10 border-b border-[#3a3a3c] flex items-center justify-center px-3">
        <span className="text-xs text-[#98989d] uppercase tracking-wider">Inspector</span>
      </div>

      {/* Project Info */}
      <div className="p-3 border-b border-[#3a3a3c]">
        <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-2">Project</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#98989d]">Tempo</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={project.bpm}
                onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                onFocus={(e) => e.target.select()}
                className="w-14 bg-[#1c1c1e] text-white text-xs text-right px-2 py-1 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
                min={20}
                max={300}
              />
              <span className="text-[10px] text-[#98989d]">BPM</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#98989d]">Time Sig</span>
            <div className="flex items-center gap-1">
              <select
                value={project.timeSignature[0]}
                onChange={(e) => setTimeSignature([parseInt(e.target.value), project.timeSignature[1]])}
                className="bg-[#1c1c1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 12].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-[#98989d]">/</span>
              <select
                value={project.timeSignature[1]}
                onChange={(e) => setTimeSignature([project.timeSignature[0], parseInt(e.target.value)])}
                className="bg-[#1c1c1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
              >
                {[2, 4, 8, 16].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#98989d]">Key</span>
            <select
              value={project.key || 'C Major'}
              onChange={(e) => setKey(e.target.value)}
              className="bg-[#1c1c1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
            >
              <option value="C Major">C Major</option>
              <option value="A Minor">A Minor</option>
              <option value="G Major">G Major</option>
              <option value="E Minor">E Minor</option>
              <option value="D Major">D Major</option>
              <option value="B Minor">B Minor</option>
              <option value="F Major">F Major</option>
              <option value="D Minor">D Minor</option>
              <option value="A Major">A Major</option>
              <option value="F# Minor">F# Minor</option>
              <option value="E Major">E Major</option>
              <option value="C# Minor">C# Minor</option>
              <option value="B Major">B Major</option>
              <option value="G# Minor">G# Minor</option>
              <option value="Bb Major">Bb Major</option>
              <option value="G Minor">G Minor</option>
              <option value="Eb Major">Eb Major</option>
              <option value="C Minor">C Minor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Track Inspector */}
      {selectedTrack && (
        <div className="p-3 border-b border-[#3a3a3c]">
          <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-2">Track</div>
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="text-[10px] text-[#98989d] block mb-1">Name</label>
              <input
                type="text"
                value={selectedTrack.name}
                onChange={(e) => setTrackName(selectedTrack.id, e.target.value)}
                className="w-full bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-[10px] text-[#98989d] block mb-1">Color</label>
              <div className="flex flex-wrap gap-1">
                {TRACK_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setTrackColor(selectedTrack.id, color)}
                    className={`w-5 h-5 rounded ${
                      selectedTrack.color === color ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-[#98989d]">Volume</label>
                <span className="text-[10px] text-white font-mono">
                  {volumeToDb(selectedTrack.volume)} dB
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={selectedTrack.volume}
                onChange={(e) => setTrackVolume(selectedTrack.id, parseFloat(e.target.value))}
                className="w-full h-1 accent-[#0a84ff]"
              />
            </div>

            {/* Pan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-[#98989d]">Pan</label>
                <span className="text-[10px] text-white font-mono">
                  {panToString(selectedTrack.pan)}
                </span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={selectedTrack.pan}
                onChange={(e) => setTrackPan(selectedTrack.id, parseFloat(e.target.value))}
                className="w-full h-1 accent-[#0a84ff]"
              />
            </div>

            {/* Input/Output for Audio Tracks */}
            {selectedTrack.type === 'audio' && (
              <div className="pt-2 border-t border-[#3a3a3c] space-y-2">
                <div>
                  <label className="text-[10px] text-[#98989d] block mb-1">Input</label>
                  <select
                    value={selectedTrack.input || 'none'}
                    onChange={(e) => setTrackInput(selectedTrack.id, e.target.value)}
                    className="w-full bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
                  >
                    <option value="none">No Input</option>
                    <option value="stereo-1-2">Input 1-2 (Stereo)</option>
                    {audioInputs.map(input => (
                      <option key={input.deviceId} value={input.deviceId}>
                        {input.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#98989d] block mb-1">Output</label>
                  <select
                    value={selectedTrack.output || 'master'}
                    onChange={(e) => setTrackOutput(selectedTrack.id, e.target.value)}
                    className="w-full bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
                  >
                    <option value="master">Stereo Out</option>
                    {project.buses.map(bus => (
                      <option key={bus.id} value={bus.id}>
                        {bus.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#98989d] block mb-1">Recording Mode</label>
                  <select
                    value={selectedTrack.recordingMode || 'replace'}
                    onChange={(e) => setTrackRecordingMode(selectedTrack.id, e.target.value as 'replace' | 'overdub' | 'merge')}
                    className="w-full bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
                  >
                    <option value="replace">Replace</option>
                    <option value="overdub">Overdub</option>
                    <option value="merge">Merge</option>
                  </select>
                </div>
              </div>
            )}

            {/* Instrument Selection for Software Instrument Tracks */}
            {selectedTrack.type === 'software-instrument' && (
              <div className="pt-2 border-t border-[#3a3a3c] space-y-2">
                <div>
                  <label className="text-[10px] text-[#98989d] block mb-1">Instrument</label>
                  <select
                    value={selectedTrack.instrumentId || 'retro-synth'}
                    onChange={(e) => setTrackInstrument(selectedTrack.id, e.target.value)}
                    className="w-full bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
                  >
                    <option value="retro-synth">Retro Synth</option>
                    <option value="alchemy">Alchemy</option>
                    <option value="sampler">Sampler</option>
                    <option value="drum-kit">Drum Kit Designer</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#98989d] block mb-1">MIDI Input</label>
                  <select
                    value={selectedTrack.input || 'all'}
                    onChange={(e) => setTrackInput(selectedTrack.id, e.target.value)}
                    className="w-full bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
                  >
                    <option value="all">All MIDI Inputs</option>
                    <option value="keyboard">Computer Keyboard</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#98989d] block mb-1">Output</label>
                  <select
                    value={selectedTrack.output || 'master'}
                    onChange={(e) => setTrackOutput(selectedTrack.id, e.target.value)}
                    className="w-full bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
                  >
                    <option value="master">Stereo Out</option>
                    {project.buses.map(bus => (
                      <option key={bus.id} value={bus.id}>
                        {bus.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Track Type Info */}
            <div className="pt-2 border-t border-[#3a3a3c]">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#98989d]">Type</span>
                <span className="text-white capitalize">{selectedTrack.type.replace('-', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] mt-1">
                <span className="text-[#98989d]">Regions</span>
                <span className="text-white">{selectedTrack.regions.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Region Inspector */}
      {selectedRegion && (
        <div className="p-3 border-b border-[#3a3a3c]">
          <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-2">Region</div>
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="text-[10px] text-[#98989d] block mb-1">Name</label>
              <div className="bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c]">
                {selectedRegion.name}
              </div>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#98989d] block mb-1">Start</label>
                <div className="bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] font-mono">
                  {selectedRegion.startTime.toFixed(2)}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#98989d] block mb-1">Length</label>
                <div className="bg-[#1c1c1e] text-white text-xs px-2 py-1.5 rounded border border-[#3a3a3c] font-mono">
                  {selectedRegion.duration.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRegion.muted}
                  onChange={(e) => setRegionMute(selectedRegion.id, e.target.checked)}
                  className="accent-[#0a84ff]"
                />
                <span className="text-xs text-[#98989d]">Mute</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRegion.looped}
                  onChange={(e) => setRegionLoop(selectedRegion.id, e.target.checked)}
                  className="accent-[#0a84ff]"
                />
                <span className="text-xs text-[#98989d]">Loop</span>
              </label>
            </div>

            {/* MIDI Info */}
            {'notes' in selectedRegion && (
              <div className="pt-2 border-t border-[#3a3a3c]">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#98989d]">Notes</span>
                  <span className="text-white">{(selectedRegion as MidiRegion).notes.length}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-[#98989d]">Quantize</span>
                  <span className="text-white">{(selectedRegion as MidiRegion).quantize}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedTrack && !selectedRegion && (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-[#98989d] text-center">
            Select a track or region to view its properties
          </p>
        </div>
      )}
    </div>
  );
}
