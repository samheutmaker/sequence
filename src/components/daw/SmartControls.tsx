/**
 * Smart Controls Panel - Logic Pro style instrument/effect controls
 * Connected to the actual audio engine synth parameters
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDAWStore, dawAudioEngine } from '../../store/dawStore';

function Knob({
  value,
  min,
  max,
  size = 48,
  color = '#0a84ff',
  label,
  onChange,
  formatValue,
}: {
  value: number;
  min: number;
  max: number;
  size?: number;
  color?: string;
  label: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  const normalizedValue = (value - min) / (max - min);
  const angle = -135 + normalizedValue * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = (startYRef.current - e.clientY) / 100;
      const range = max - min;
      const newValue = Math.max(min, Math.min(max, startValueRef.current + delta * range));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, onChange]);

  const displayValue = formatValue ? formatValue(value) : value.toFixed(value < 10 ? 1 : 0);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative cursor-pointer select-none"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#3a3a3c"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="188.5 62.8"
            transform="rotate(135 50 50)"
          />
          {/* Value arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${normalizedValue * 188.5} 251.3`}
            transform="rotate(135 50 50)"
          />
          {/* Center circle */}
          <circle cx="50" cy="50" r="30" fill="#2c2c2e" />
          {/* Indicator line */}
          <line
            x1="50"
            y1="25"
            x2="50"
            y2="35"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${angle} 50 50)`}
          />
        </svg>
      </div>
      <span className="text-[10px] text-[#98989d] text-center truncate w-full">
        {label}
      </span>
      <span className="text-[10px] text-white font-mono">
        {displayValue}
      </span>
    </div>
  );
}

function XYPad({
  valueX,
  valueY,
  onChangeX,
  onChangeY,
  labelX,
  labelY,
  color = '#0a84ff',
}: {
  valueX: number;
  valueY: number;
  onChangeX: (v: number) => void;
  onChangeY: (v: number) => void;
  labelX: string;
  labelY: string;
  color?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValues(e);
  };

  const updateValues = (e: React.MouseEvent | MouseEvent) => {
    const rect = (e.target as HTMLElement).closest('.xy-pad')?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    onChangeX(x);
    onChangeY(y);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="xy-pad relative w-24 h-24 bg-[#1c1c1e] rounded-lg border border-[#3a3a3c] cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => isDragging && updateValues(e)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
          <line x1="50" y1="0" x2="50" y2="100" stroke="#3a3a3c" strokeWidth="1" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#3a3a3c" strokeWidth="1" />
        </svg>
        {/* Position indicator */}
        <div
          className="absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${valueX * 100}%`,
            top: `${(1 - valueY) * 100}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
      <div className="flex justify-between w-24 text-[10px] text-[#98989d]">
        <span>{labelX}</span>
        <span>{labelY}</span>
      </div>
    </div>
  );
}

export function SmartControls() {
  const {
    project,
    view,
    setSynthCutoff,
    setSynthResonance,
    setSynthAttack,
    setSynthDecay,
    setSynthSustain,
    setSynthRelease,
    setSynthDrive,
    setSynthMix,
    setInsertParameter,
  } = useDAWStore();

  // Local state for UI that syncs with audio engine
  const [synthParams, setSynthParams] = useState({
    cutoff: 0.7,       // 0-1 normalized
    resonance: 0.1,    // 0-1 normalized
    attack: 0.01,      // 0-1 normalized
    decay: 0.15,       // 0-1 normalized
    sustain: 0.7,      // 0-1 direct
    release: 0.06,     // 0-1 normalized
    drive: 0.2,
    mix: 0.5,
    xyX: 0.5,
    xyY: 0.5,
  });

  // EQ and Compressor parameters for audio tracks
  const [eqParams, setEqParams] = useState({
    low: 0,   // -12 to +12 dB
    mid: 0,
    high: 0,
  });

  const [compParams, setCompParams] = useState({
    threshold: -20, // -60 to 0 dB
    ratio: 4,       // 1 to 20
    attack: 10,     // 0.1 to 100 ms
    release: 100,   // 10 to 1000 ms
  });

  if (!project) return null;

  const selectedTrack = project.tracks.find(t => view.selectedTrackIds.includes(t.id));
  const isSoftwareInstrument = selectedTrack?.type === 'software-instrument';

  // Update local state and audio engine
  const updateCutoff = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, cutoff: value }));
    if (selectedTrack) {
      setSynthCutoff(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthCutoff]);

  const updateResonance = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, resonance: value }));
    if (selectedTrack) {
      setSynthResonance(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthResonance]);

  const updateAttack = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, attack: value }));
    if (selectedTrack) {
      setSynthAttack(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthAttack]);

  const updateDecay = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, decay: value }));
    if (selectedTrack) {
      setSynthDecay(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthDecay]);

  const updateSustain = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, sustain: value }));
    if (selectedTrack) {
      setSynthSustain(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthSustain]);

  const updateRelease = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, release: value }));
    if (selectedTrack) {
      setSynthRelease(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthRelease]);

  const updateDrive = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, drive: value }));
    if (selectedTrack) {
      setSynthDrive(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthDrive]);

  const updateMix = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, mix: value }));
    if (selectedTrack) {
      setSynthMix(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthMix]);

  // XY Pad controls cutoff (X) and resonance (Y)
  const updateXYX = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, xyX: value, cutoff: value }));
    if (selectedTrack) {
      setSynthCutoff(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthCutoff]);

  const updateXYY = useCallback((value: number) => {
    setSynthParams(p => ({ ...p, xyY: value, resonance: value }));
    if (selectedTrack) {
      setSynthResonance(selectedTrack.id, value);
    }
  }, [selectedTrack, setSynthResonance]);

  // Format functions for display
  const formatCutoff = (v: number) => {
    const freq = 20 * Math.pow(1000, v);
    return freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${Math.round(freq)}`;
  };

  const formatTime = (v: number, max: number) => {
    const time = 0.001 + v * (max - 0.001);
    return time >= 1 ? `${time.toFixed(1)}s` : `${Math.round(time * 1000)}ms`;
  };

  // Find EQ and Compressor insert indices for audio tracks
  const eqInsertIndex = selectedTrack?.inserts.findIndex(i => i.pluginId === 'channel-eq') ?? -1;
  const compInsertIndex = selectedTrack?.inserts.findIndex(i => i.pluginId === 'compressor') ?? -1;

  // EQ update functions
  const updateEqLow = useCallback((value: number) => {
    // Convert 0-100 knob value to -12 to +12 dB
    const dbValue = (value - 50) * 0.24;
    setEqParams(p => ({ ...p, low: dbValue }));
    if (selectedTrack && eqInsertIndex >= 0) {
      setInsertParameter(selectedTrack.id, eqInsertIndex, 'lowGain', dbValue);
    }
  }, [selectedTrack, eqInsertIndex, setInsertParameter]);

  const updateEqMid = useCallback((value: number) => {
    const dbValue = (value - 50) * 0.24;
    setEqParams(p => ({ ...p, mid: dbValue }));
    if (selectedTrack && eqInsertIndex >= 0) {
      setInsertParameter(selectedTrack.id, eqInsertIndex, 'midGain', dbValue);
    }
  }, [selectedTrack, eqInsertIndex, setInsertParameter]);

  const updateEqHigh = useCallback((value: number) => {
    const dbValue = (value - 50) * 0.24;
    setEqParams(p => ({ ...p, high: dbValue }));
    if (selectedTrack && eqInsertIndex >= 0) {
      setInsertParameter(selectedTrack.id, eqInsertIndex, 'highGain', dbValue);
    }
  }, [selectedTrack, eqInsertIndex, setInsertParameter]);

  // Compressor update functions
  const updateCompThreshold = useCallback((value: number) => {
    setCompParams(p => ({ ...p, threshold: value }));
    if (selectedTrack && compInsertIndex >= 0) {
      setInsertParameter(selectedTrack.id, compInsertIndex, 'threshold', value);
    }
  }, [selectedTrack, compInsertIndex, setInsertParameter]);

  const updateCompRatio = useCallback((value: number) => {
    setCompParams(p => ({ ...p, ratio: value }));
    if (selectedTrack && compInsertIndex >= 0) {
      setInsertParameter(selectedTrack.id, compInsertIndex, 'ratio', value);
    }
  }, [selectedTrack, compInsertIndex, setInsertParameter]);

  const updateCompAttack = useCallback((value: number) => {
    setCompParams(p => ({ ...p, attack: value }));
    if (selectedTrack && compInsertIndex >= 0) {
      // Convert ms to seconds for Web Audio API
      setInsertParameter(selectedTrack.id, compInsertIndex, 'attack', value / 1000);
    }
  }, [selectedTrack, compInsertIndex, setInsertParameter]);

  const updateCompRelease = useCallback((value: number) => {
    setCompParams(p => ({ ...p, release: value }));
    if (selectedTrack && compInsertIndex >= 0) {
      // Convert ms to seconds for Web Audio API
      setInsertParameter(selectedTrack.id, compInsertIndex, 'release', value / 1000);
    }
  }, [selectedTrack, compInsertIndex, setInsertParameter]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-8 border-b border-[#3a3a3c] flex items-center justify-between px-3">
        <span className="text-xs text-[#98989d] uppercase tracking-wider">Smart Controls</span>
        {selectedTrack && (
          <span className="text-xs text-white">{selectedTrack.name}</span>
        )}
      </div>

      {!selectedTrack ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[#98989d]">Select a track to view controls</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Instrument Controls */}
          {isSoftwareInstrument && (
            <>
              {/* Main XY Pad - Controls Cutoff/Resonance */}
              <div className="flex justify-center mb-6">
                <XYPad
                  valueX={synthParams.xyX}
                  valueY={synthParams.xyY}
                  onChangeX={updateXYX}
                  onChangeY={updateXYY}
                  labelX="Cutoff"
                  labelY="Resonance"
                  color={selectedTrack.color}
                />
              </div>

              {/* Tone Section */}
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-3">Tone</div>
                <div className="grid grid-cols-4 gap-4">
                  <Knob
                    value={synthParams.cutoff}
                    min={0}
                    max={1}
                    label="Cutoff"
                    color="#ff9500"
                    onChange={updateCutoff}
                    formatValue={formatCutoff}
                  />
                  <Knob
                    value={synthParams.resonance}
                    min={0}
                    max={1}
                    label="Resonance"
                    color="#ff9500"
                    onChange={updateResonance}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Knob
                    value={synthParams.drive}
                    min={0}
                    max={1}
                    label="Drive"
                    color="#ff453a"
                    onChange={updateDrive}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Knob
                    value={synthParams.mix}
                    min={0}
                    max={1}
                    label="Mix"
                    color="#30d158"
                    onChange={updateMix}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                </div>
              </div>

              {/* Envelope Section */}
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-3">Envelope</div>
                <div className="grid grid-cols-4 gap-4">
                  <Knob
                    value={synthParams.attack}
                    min={0}
                    max={1}
                    label="Attack"
                    color="#0a84ff"
                    onChange={updateAttack}
                    formatValue={(v) => formatTime(v, 2)}
                  />
                  <Knob
                    value={synthParams.decay}
                    min={0}
                    max={1}
                    label="Decay"
                    color="#0a84ff"
                    onChange={updateDecay}
                    formatValue={(v) => formatTime(v, 2)}
                  />
                  <Knob
                    value={synthParams.sustain}
                    min={0}
                    max={1}
                    label="Sustain"
                    color="#0a84ff"
                    onChange={updateSustain}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Knob
                    value={synthParams.release}
                    min={0}
                    max={1}
                    label="Release"
                    color="#0a84ff"
                    onChange={updateRelease}
                    formatValue={(v) => formatTime(v, 5)}
                  />
                </div>
              </div>

              {/* ADSR Visual */}
              <div className="mb-4">
                <div className="h-16 bg-[#1c1c1e] rounded-lg border border-[#3a3a3c] p-2">
                  <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="none">
                    {/* ADSR envelope visualization */}
                    <path
                      d={`M0,50
                        L${synthParams.attack * 50},5
                        L${synthParams.attack * 50 + synthParams.decay * 40},${50 - synthParams.sustain * 45}
                        L${150},${50 - synthParams.sustain * 45}
                        L${150 + synthParams.release * 50},50`}
                      fill="none"
                      stroke="#0a84ff"
                      strokeWidth="2"
                    />
                    <path
                      d={`M0,50
                        L${synthParams.attack * 50},5
                        L${synthParams.attack * 50 + synthParams.decay * 40},${50 - synthParams.sustain * 45}
                        L${150},${50 - synthParams.sustain * 45}
                        L${150 + synthParams.release * 50},50 Z`}
                      fill="url(#adsrGradient)"
                      opacity="0.3"
                    />
                    <defs>
                      <linearGradient id="adsrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0a84ff" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </>
          )}

          {/* Audio Track Controls */}
          {selectedTrack.type === 'audio' && (
            <>
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-3">Channel EQ</div>
                {/* EQ Visualization */}
                <div className="h-24 bg-[#1c1c1e] rounded-lg border border-[#3a3a3c] mb-4 relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                    {/* Grid */}
                    {[0, 25, 50, 75, 100].map(x => (
                      <line key={x} x1={x * 2} y1="0" x2={x * 2} y2="80" stroke="#3a3a3c" strokeWidth="0.5" />
                    ))}
                    {[0, 20, 40, 60, 80].map(y => (
                      <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#3a3a3c" strokeWidth="0.5" />
                    ))}
                    {/* EQ Curve */}
                    <path
                      d="M0,40 Q30,35 50,38 Q80,42 100,40 Q130,36 160,42 Q180,38 200,40"
                      fill="none"
                      stroke="#ff9500"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,40 Q30,35 50,38 Q80,42 100,40 Q130,36 160,42 Q180,38 200,40 V80 H0 Z"
                      fill="url(#eqGradient)"
                      opacity="0.3"
                    />
                    <defs>
                      <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff9500" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Frequency labels */}
                  <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-[8px] text-[#98989d]">
                    <span>20Hz</span>
                    <span>200</span>
                    <span>2k</span>
                    <span>20kHz</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Knob
                    value={50 + (eqParams.low / 0.24)}
                    min={0}
                    max={100}
                    label="Low"
                    color="#ff9500"
                    onChange={updateEqLow}
                    formatValue={(v) => `${((v - 50) * 0.24).toFixed(1)}dB`}
                  />
                  <Knob
                    value={50 + (eqParams.mid / 0.24)}
                    min={0}
                    max={100}
                    label="Mid"
                    color="#ff9500"
                    onChange={updateEqMid}
                    formatValue={(v) => `${((v - 50) * 0.24).toFixed(1)}dB`}
                  />
                  <Knob
                    value={50 + (eqParams.high / 0.24)}
                    min={0}
                    max={100}
                    label="High"
                    color="#ff9500"
                    onChange={updateEqHigh}
                    formatValue={(v) => `${((v - 50) * 0.24).toFixed(1)}dB`}
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-3">Compressor</div>
                <div className="grid grid-cols-4 gap-4">
                  <Knob
                    value={compParams.threshold}
                    min={-60}
                    max={0}
                    label="Threshold"
                    color="#0a84ff"
                    onChange={updateCompThreshold}
                    formatValue={(v) => `${v.toFixed(0)}dB`}
                  />
                  <Knob
                    value={compParams.ratio}
                    min={1}
                    max={20}
                    label="Ratio"
                    color="#0a84ff"
                    onChange={updateCompRatio}
                    formatValue={(v) => `${v.toFixed(1)}:1`}
                  />
                  <Knob
                    value={compParams.attack}
                    min={0.1}
                    max={100}
                    label="Attack"
                    color="#0a84ff"
                    onChange={updateCompAttack}
                    formatValue={(v) => `${v.toFixed(0)}ms`}
                  />
                  <Knob
                    value={compParams.release}
                    min={10}
                    max={1000}
                    label="Release"
                    color="#0a84ff"
                    onChange={updateCompRelease}
                    formatValue={(v) => `${v.toFixed(0)}ms`}
                  />
                </div>
              </div>
            </>
          )}

          {/* Drummer Track Controls */}
          {selectedTrack.type === 'drummer' && (
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-3">Drum Kit</div>
              <div className="bg-[#1c1c1e] rounded-lg border border-[#3a3a3c] p-4">
                <div className="text-sm text-white mb-2">808 Kit</div>
                <div className="text-xs text-[#98989d]">
                  Classic 808 drum sounds with kick, snare, hi-hats, and more
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {['Kick', 'Snare', 'HiHat', 'Clap'].map((name) => (
                    <div
                      key={name}
                      className="h-12 bg-[#3a3a3c] rounded flex items-center justify-center text-[10px] text-white"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sends Section (for all tracks) */}
          <div className="mt-4 pt-4 border-t border-[#3a3a3c]">
            <div className="text-[10px] uppercase tracking-wider text-[#98989d] mb-3">Sends</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white">Bus 1 (Reverb)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={30}
                  className="w-24 h-1 accent-[#30d158]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white">Bus 2 (Delay)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={15}
                  className="w-24 h-1 accent-[#0a84ff]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
