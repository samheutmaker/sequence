/**
 * DAW Mixer Panel - Channel strips, faders, meters
 */

import { useRef, useEffect, useState } from 'react';
import { useDAWStore, dawAudioEngine } from '../../store/dawStore';
import { BUILT_IN_PLUGINS } from '../../audio/DAWAudioEngine';
import type { DAWTrack, Bus, TrackSend } from '../../types/daw';

// Plugin Parameter Editor Popup
function PluginEditor({
  track,
  insertIndex,
  insert,
  plugin,
  onClose,
}: {
  track: DAWTrack;
  insertIndex: number;
  insert: { id: string; pluginId: string; enabled: boolean; params?: Record<string, number> };
  plugin: typeof BUILT_IN_PLUGINS[0];
  onClose: () => void;
}) {
  const { setInsertParameter, setInsertEnabled, removeTrackInsert } = useDAWStore();

  const getParamValue = (paramId: string) => {
    const param = plugin.parameters.find(p => p.id === paramId);
    return insert.params?.[paramId] ?? param?.default ?? 0;
  };

  const handleParamChange = (paramId: string, value: number) => {
    setInsertParameter(track.id, insertIndex, paramId, value);
  };

  const applyPreset = (presetId: string) => {
    const preset = plugin.presets?.find(p => p.id === presetId);
    if (preset) {
      Object.entries(preset.values).forEach(([paramId, value]) => {
        setInsertParameter(track.id, insertIndex, paramId, value as number);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-[#2c2c2e] rounded-xl shadow-2xl border border-[#3a3a3c] w-96 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="h-10 flex items-center justify-between px-4 border-b border-[#3a3a3c]"
          style={{ backgroundColor: insert.enabled ? '#0a84ff' : '#3a3a3c' }}
        >
          <span className="text-sm font-medium text-white">{plugin.name}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInsertEnabled(track.id, insertIndex, !insert.enabled)}
              className={`px-2 py-0.5 text-[10px] rounded ${
                insert.enabled ? 'bg-white/20 text-white' : 'bg-[#ff9500] text-white'
              }`}
            >
              {insert.enabled ? 'Bypass' : 'Enable'}
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center text-white/70 hover:text-white rounded hover:bg-white/10"
            >
              ×
            </button>
          </div>
        </div>

        {/* Presets */}
        {plugin.presets && plugin.presets.length > 0 && (
          <div className="px-4 py-2 border-b border-[#3a3a3c] flex items-center gap-2">
            <span className="text-[10px] text-[#98989d]">Preset:</span>
            <select
              onChange={(e) => applyPreset(e.target.value)}
              className="flex-1 bg-[#1c1c1e] text-white text-xs rounded px-2 py-1 border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
              defaultValue=""
            >
              <option value="" disabled>Select preset...</option>
              {plugin.presets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Parameters */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {plugin.parameters.map(param => {
            const value = getParamValue(param.id);
            const percent = ((value - param.min) / (param.max - param.min)) * 100;

            return (
              <div key={param.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#98989d]">{param.name}</span>
                  <span className="text-xs text-white font-mono">
                    {value.toFixed(param.unit === 'Hz' ? 0 : 1)}{param.unit}
                  </span>
                </div>
                <div className="relative">
                  <div className="h-2 bg-[#1c1c1e] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0a84ff] rounded-full transition-all duration-75"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={(param.max - param.min) / 100}
                    value={value}
                    onChange={(e) => handleParamChange(param.id, parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#3a3a3c] flex justify-between">
          <button
            onClick={() => {
              removeTrackInsert(track.id, insertIndex);
              onClose();
            }}
            className="px-3 py-1 text-xs text-[#ff453a] hover:bg-[#ff453a]/10 rounded"
          >
            Remove
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs bg-[#0a84ff] text-white rounded hover:bg-[#0077ed]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Insert slot for effects
function InsertSlot({
  track,
  insertIndex,
  insert,
}: {
  track: DAWTrack;
  insertIndex: number;
  insert?: { id: string; pluginId: string; enabled: boolean; params?: Record<string, number> };
}) {
  const { addTrackInsert, removeTrackInsert, setInsertEnabled } = useDAWStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const plugin = insert ? BUILT_IN_PLUGINS.find(p => p.id === insert.pluginId) : null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (insert && plugin) {
            setShowMenu(false);
            setShowEditor(true);
          }
        }}
        className={`w-full h-5 text-[8px] px-1 truncate rounded transition-colors ${
          insert
            ? insert.enabled
              ? 'bg-[#0a84ff] text-white'
              : 'bg-[#3a3a3c] text-[#98989d]'
            : 'bg-[#1c1c1e] text-[#4a4a4c] hover:bg-[#2c2c2e] hover:text-[#98989d]'
        }`}
        title={insert ? 'Double-click to edit parameters' : 'Click to add effect'}
      >
        {insert ? plugin?.name || insert.pluginId : '---'}
      </button>

      {showMenu && (
        <div className="absolute top-5 left-0 z-50 w-32 bg-[#2c2c2e] rounded shadow-lg border border-[#3a3a3c]">
          {insert ? (
            <>
              <button
                onClick={() => {
                  if (plugin) {
                    setShowMenu(false);
                    setShowEditor(true);
                  }
                }}
                className="w-full px-2 py-1 text-[10px] text-left text-white hover:bg-[#3a3a3c]"
              >
                Edit Parameters
              </button>
              <button
                onClick={() => {
                  setInsertEnabled(track.id, insertIndex, !insert.enabled);
                  setShowMenu(false);
                }}
                className="w-full px-2 py-1 text-[10px] text-left text-white hover:bg-[#3a3a3c]"
              >
                {insert.enabled ? 'Bypass' : 'Enable'}
              </button>
              <button
                onClick={() => {
                  removeTrackInsert(track.id, insertIndex);
                  setShowMenu(false);
                }}
                className="w-full px-2 py-1 text-[10px] text-left text-[#ff453a] hover:bg-[#3a3a3c]"
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <div className="px-2 py-1 text-[8px] text-[#98989d] uppercase">Add Effect</div>
              {BUILT_IN_PLUGINS.filter(p => p.type === 'effect').map(plugin => (
                <button
                  key={plugin.id}
                  onClick={() => {
                    addTrackInsert(track.id, plugin.id, insertIndex);
                    setShowMenu(false);
                  }}
                  className="w-full px-2 py-1 text-[10px] text-left text-white hover:bg-[#3a3a3c]"
                >
                  {plugin.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Plugin Editor Modal */}
      {showEditor && insert && plugin && (
        <PluginEditor
          track={track}
          insertIndex={insertIndex}
          insert={insert}
          plugin={plugin}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

// Send slot for routing to buses
function SendSlot({
  track,
  sendIndex,
  send,
}: {
  track: DAWTrack;
  sendIndex: number;
  send?: TrackSend;
}) {
  const { project, addTrackSend, removeTrackSend, setSendAmount, setSendPreFader } = useDAWStore();
  const [showMenu, setShowMenu] = useState(false);

  const bus = send ? project?.buses.find(b => b.id === send.busId) : null;

  return (
    <div className="relative">
      {send ? (
        <div className="flex items-center gap-0.5">
          {/* Send amount knob */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={send.amount}
            onChange={(e) => setSendAmount(track.id, send.id, parseFloat(e.target.value))}
            className="w-10 h-3 accent-[#30d158]"
          />
          {/* Bus name */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`flex-1 h-5 text-[8px] px-1 truncate rounded transition-colors ${
              send.preFader
                ? 'bg-[#ff9500] text-white'
                : 'bg-[#30d158] text-white'
            }`}
          >
            {bus?.name || 'Bus'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-full h-5 text-[8px] px-1 truncate rounded transition-colors bg-[#1c1c1e] text-[#4a4a4c] hover:bg-[#2c2c2e] hover:text-[#98989d]"
        >
          ---
        </button>
      )}

      {showMenu && (
        <div className="absolute top-5 left-0 z-50 w-32 bg-[#2c2c2e] rounded shadow-lg border border-[#3a3a3c]">
          {send ? (
            <>
              <button
                onClick={() => {
                  setSendPreFader(track.id, send.id, !send.preFader);
                  setShowMenu(false);
                }}
                className="w-full px-2 py-1 text-[10px] text-left text-white hover:bg-[#3a3a3c]"
              >
                {send.preFader ? 'Post-Fader' : 'Pre-Fader'}
              </button>
              <button
                onClick={() => {
                  removeTrackSend(track.id, send.id);
                  setShowMenu(false);
                }}
                className="w-full px-2 py-1 text-[10px] text-left text-[#ff453a] hover:bg-[#3a3a3c]"
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <div className="px-2 py-1 text-[8px] text-[#98989d] uppercase">Send to Bus</div>
              {project?.buses.length === 0 ? (
                <div className="px-2 py-1 text-[10px] text-[#636366]">No buses</div>
              ) : (
                project?.buses.map(b => {
                  // Check if already sending to this bus
                  const alreadySending = track.sends.some(s => s.busId === b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        if (!alreadySending) {
                          addTrackSend(track.id, b.id);
                        }
                        setShowMenu(false);
                      }}
                      disabled={alreadySending}
                      className={`w-full px-2 py-1 text-[10px] text-left hover:bg-[#3a3a3c] ${
                        alreadySending ? 'text-[#636366]' : 'text-white'
                      }`}
                    >
                      {b.name} {alreadySending ? '✓' : ''}
                    </button>
                  );
                })
              )}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

// Meter component with peak hold
function LevelMeter({ level, width = 3 }: { level: number; width?: number }) {
  const [peakLevel, setPeakLevel] = useState(0);
  const peakDecayRef = useRef<number>();
  const peakHoldTimeRef = useRef<number>(0);

  // Peak hold logic
  useEffect(() => {
    if (level > peakLevel) {
      setPeakLevel(level);
      peakHoldTimeRef.current = Date.now();
    } else {
      // Decay peak after 1 second hold
      const timeSincePeak = Date.now() - peakHoldTimeRef.current;
      if (timeSincePeak > 1000 && peakLevel > level) {
        peakDecayRef.current = requestAnimationFrame(() => {
          setPeakLevel(prev => Math.max(level, prev - 0.02));
        });
      }
    }
    return () => {
      if (peakDecayRef.current) cancelAnimationFrame(peakDecayRef.current);
    };
  }, [level, peakLevel]);

  // Get color based on level
  const getMeterColor = (lvl: number) => {
    if (lvl > 0.9) return '#ff453a'; // Red for clipping
    if (lvl > 0.7) return '#ffd60a'; // Yellow for hot
    return '#30d158'; // Green for normal
  };

  return (
    <div
      className="h-full bg-[#1c1c1e] rounded-sm overflow-hidden relative flex flex-col-reverse"
      style={{ width: `${width}px` }}
    >
      {/* Main level */}
      <div
        className="w-full transition-all duration-[50ms]"
        style={{
          height: `${Math.min(100, level * 100)}%`,
          background: `linear-gradient(to top, #30d158 0%, #30d158 60%, #ffd60a 85%, #ff453a 100%)`,
        }}
      />
      {/* Peak hold indicator */}
      <div
        className="absolute w-full h-0.5 transition-all duration-[50ms]"
        style={{
          bottom: `${Math.min(100, peakLevel * 100)}%`,
          backgroundColor: getMeterColor(peakLevel),
          opacity: peakLevel > 0.01 ? 1 : 0,
        }}
      />
      {/* Clip indicator */}
      {peakLevel > 0.98 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff453a] animate-pulse" />
      )}
    </div>
  );
}

// dB scale markers
function MeterScale() {
  const markers = [
    { db: 0, pos: 100 },
    { db: -6, pos: 80 },
    { db: -12, pos: 60 },
    { db: -24, pos: 40 },
    { db: -48, pos: 10 },
  ];

  return (
    <div className="relative h-full w-4 text-[6px] text-[#636366]">
      {markers.map(({ db, pos }) => (
        <div
          key={db}
          className="absolute right-0 flex items-center"
          style={{ bottom: `${pos}%`, transform: 'translateY(50%)' }}
        >
          <span className="mr-0.5">{db}</span>
          <div className="w-1 h-px bg-[#636366]" />
        </div>
      ))}
    </div>
  );
}

function ChannelStrip({
  track,
  isMaster = false,
  isBus = false,
}: {
  track?: DAWTrack;
  bus?: Bus;
  isMaster?: boolean;
  isBus?: boolean;
}) {
  const {
    setTrackVolume,
    setTrackPan,
    toggleTrackMute,
    toggleTrackSolo,
    setMasterVolume,
    project,
  } = useDAWStore();

  const [meterLevel, setMeterLevel] = useState({ left: 0, right: 0 });
  const meterRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Animate meters with real audio analysis
  useEffect(() => {
    const updateMeter = () => {
      if (isMaster) {
        const levels = dawAudioEngine.getMeterLevels();
        setMeterLevel(levels);
      } else if (track) {
        const level = dawAudioEngine.getTrackMeterLevel(track.id);
        // Add slight stereo variation for realism
        const stereoOffset = Math.sin(Date.now() / 200) * 0.05;
        setMeterLevel({
          left: track.muted ? 0 : Math.max(0, level + stereoOffset),
          right: track.muted ? 0 : Math.max(0, level - stereoOffset),
        });
      }
      animationRef.current = requestAnimationFrame(updateMeter);
    };

    updateMeter();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMaster, track?.id, track?.muted]);

  const volume = isMaster ? (project?.master.volume ?? 0.8) : (track?.volume ?? 0.8);
  const pan = isMaster ? 0 : (track?.pan ?? 0);
  const muted = isMaster ? false : (track?.muted ?? false);
  const solo = isMaster ? false : (track?.solo ?? false);

  // Convert volume to dB
  const volumeToDb = (vol: number) => {
    if (vol === 0) return -60;
    return 20 * Math.log10(vol) + 6;
  };

  const dbValue = volumeToDb(volume);

  // Convert fader position to value (0-100%)
  const faderPosition = ((volume - 0) / (1 - 0)) * 100;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (isMaster) {
      setMasterVolume(value);
    } else if (track) {
      setTrackVolume(track.id, value);
    }
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (track) {
      setTrackPan(track.id, parseFloat(e.target.value));
    }
  };

  return (
    <div className={`w-20 flex flex-col bg-[#2c2c2e] rounded-lg overflow-hidden ${isMaster ? 'w-24 bg-[#3a3a3c]' : ''}`}>
      {/* Header */}
      <div
        className="h-6 flex items-center justify-center border-b border-[#1c1c1e] px-1"
        style={{ backgroundColor: isMaster ? '#4a4a4c' : track?.color || '#3a3a3c' }}
      >
        <span className="text-[10px] text-white font-medium truncate">
          {isMaster ? 'Master' : track?.name || 'Track'}
        </span>
      </div>

      {/* Pan Knob */}
      {!isMaster && (
        <div className="p-2 flex flex-col items-center border-b border-[#1c1c1e]">
          <div className="text-[8px] text-[#98989d] mb-1">PAN</div>
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" className="w-full h-full">
              {/* Knob track */}
              <circle
                cx="16"
                cy="16"
                r="12"
                fill="none"
                stroke="#3a3a3c"
                strokeWidth="2"
                strokeDasharray="50 25"
                transform="rotate(-135 16 16)"
              />
              {/* Knob fill */}
              <circle
                cx="16"
                cy="16"
                r="10"
                fill="#4a4a4c"
                className="cursor-pointer"
              />
              {/* Indicator */}
              <line
                x1="16"
                y1="8"
                x2="16"
                y2="14"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${pan * 135} 16 16)`}
              />
            </svg>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={pan}
              onChange={handlePanChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <div className="text-[8px] text-[#98989d] mt-0.5">
            {pan === 0 ? 'C' : pan < 0 ? `${Math.abs(Math.round(pan * 100))}L` : `${Math.round(pan * 100)}R`}
          </div>
        </div>
      )}

      {/* Insert Slots */}
      {!isMaster && track && (
        <div className="px-1 py-1 border-b border-[#1c1c1e] space-y-0.5">
          <div className="text-[7px] text-[#98989d] uppercase text-center mb-0.5">Inserts</div>
          {[0, 1, 2, 3].map(slotIndex => (
            <InsertSlot
              key={slotIndex}
              track={track}
              insertIndex={slotIndex}
              insert={track.inserts[slotIndex]}
            />
          ))}
        </div>
      )}

      {/* Send Slots */}
      {!isMaster && track && (
        <div className="px-1 py-1 border-b border-[#1c1c1e] space-y-0.5">
          <div className="text-[7px] text-[#98989d] uppercase text-center mb-0.5">Sends</div>
          {[0, 1].map(slotIndex => (
            <SendSlot
              key={slotIndex}
              track={track}
              sendIndex={slotIndex}
              send={track.sends[slotIndex]}
            />
          ))}
        </div>
      )}

      {/* Meter + Fader */}
      <div className={`${isMaster ? 'h-28' : 'h-24'} p-2 flex gap-1 items-stretch`}>
        {/* dB Scale (master only) */}
        {isMaster && <MeterScale />}

        {/* Meter */}
        <div ref={meterRef} className="flex gap-0.5 h-full">
          <LevelMeter level={meterLevel.left} width={isMaster ? 4 : 3} />
          <LevelMeter level={meterLevel.right} width={isMaster ? 4 : 3} />
        </div>

        {/* Fader */}
        <div className="flex-1 flex flex-col items-center relative h-full">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="h-full w-8"
            style={{
              WebkitAppearance: 'slider-vertical',
              writingMode: 'vertical-lr',
              transform: 'rotate(180deg)',
            }}
          />
        </div>
      </div>

      {/* dB Display */}
      <div className="h-6 flex items-center justify-center border-t border-[#1c1c1e]">
        <span className="text-[10px] font-mono text-white">
          {dbValue === -60 ? '-∞' : dbValue.toFixed(1)}
        </span>
      </div>

      {/* Controls */}
      {!isMaster && track && (
        <div className="flex border-t border-[#1c1c1e]">
          <button
            onClick={() => toggleTrackMute(track.id)}
            className={`flex-1 py-1 text-[10px] font-bold transition-colors ${
              muted ? 'bg-[#ff9500] text-white' : 'text-[#98989d] hover:text-white'
            }`}
          >
            M
          </button>
          <button
            onClick={() => toggleTrackSolo(track.id)}
            className={`flex-1 py-1 text-[10px] font-bold transition-colors ${
              solo ? 'bg-[#ffd60a] text-black' : 'text-[#98989d] hover:text-white'
            }`}
          >
            S
          </button>
        </div>
      )}
    </div>
  );
}

// Bus Channel Strip - simplified version for buses
function BusChannelStrip({ bus }: { bus: Bus }) {
  const {
    setBusVolume,
    setBusPan,
    toggleBusMute,
    toggleBusSolo,
    deleteBus,
  } = useDAWStore();

  const [meterLevel, setMeterLevel] = useState({ left: 0, right: 0 });
  const meterRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Animate meters
  useEffect(() => {
    const updateMeter = () => {
      const level = dawAudioEngine.getBusMeterLevel(bus.id);
      setMeterLevel({
        left: bus.muted ? 0 : level * (0.95 + Math.random() * 0.1),
        right: bus.muted ? 0 : level * (0.95 + Math.random() * 0.1),
      });
      animationRef.current = requestAnimationFrame(updateMeter);
    };

    updateMeter();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bus.id, bus.muted]);

  const volumeToDb = (vol: number) => {
    if (vol === 0) return -60;
    return 20 * Math.log10(vol) + 6;
  };

  const dbValue = volumeToDb(bus.volume);

  return (
    <div className="w-20 flex flex-col bg-[#2c2c2e] rounded-lg overflow-hidden border border-[#30d158]/30">
      {/* Header */}
      <div
        className="h-6 flex items-center justify-center border-b border-[#1c1c1e] px-1"
        style={{ backgroundColor: bus.color }}
      >
        <span className="text-[10px] text-white font-medium truncate">
          {bus.name}
        </span>
      </div>

      {/* Pan Knob */}
      <div className="p-2 flex flex-col items-center border-b border-[#1c1c1e]">
        <div className="text-[8px] text-[#98989d] mb-1">PAN</div>
        <div className="relative w-8 h-8">
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="#3a3a3c"
              strokeWidth="2"
              strokeDasharray="50 25"
              transform="rotate(-135 16 16)"
            />
            <circle
              cx="16"
              cy="16"
              r="10"
              fill="#4a4a4c"
              className="cursor-pointer"
            />
            <line
              x1="16"
              y1="8"
              x2="16"
              y2="14"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${bus.pan * 135} 16 16)`}
            />
          </svg>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={bus.pan}
            onChange={(e) => setBusPan(bus.id, parseFloat(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        <div className="text-[8px] text-[#98989d] mt-0.5">
          {bus.pan === 0 ? 'C' : bus.pan < 0 ? `${Math.abs(Math.round(bus.pan * 100))}L` : `${Math.round(bus.pan * 100)}R`}
        </div>
      </div>

      {/* Meter + Fader */}
      <div className="h-24 p-2 flex gap-1 items-stretch">
        {/* Meter */}
        <div ref={meterRef} className="flex gap-0.5 h-full">
          <LevelMeter level={meterLevel.left} width={3} />
          <LevelMeter level={meterLevel.right} width={3} />
        </div>

        {/* Fader */}
        <div className="flex-1 flex flex-col items-center relative h-full">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={bus.volume}
            onChange={(e) => setBusVolume(bus.id, parseFloat(e.target.value))}
            className="h-full w-8"
            style={{
              WebkitAppearance: 'slider-vertical',
              writingMode: 'vertical-lr',
              transform: 'rotate(180deg)',
            }}
          />
        </div>
      </div>

      {/* dB Display */}
      <div className="h-6 flex items-center justify-center border-t border-[#1c1c1e]">
        <span className="text-[10px] font-mono text-white">
          {dbValue === -60 ? '-∞' : dbValue.toFixed(1)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex border-t border-[#1c1c1e]">
        <button
          onClick={() => toggleBusMute(bus.id)}
          className={`flex-1 py-1 text-[10px] font-bold transition-colors ${
            bus.muted ? 'bg-[#ff9500] text-white' : 'text-[#98989d] hover:text-white'
          }`}
        >
          M
        </button>
        <button
          onClick={() => toggleBusSolo(bus.id)}
          className={`flex-1 py-1 text-[10px] font-bold transition-colors ${
            bus.solo ? 'bg-[#ffd60a] text-black' : 'text-[#98989d] hover:text-white'
          }`}
        >
          S
        </button>
      </div>
    </div>
  );
}

export function Mixer() {
  const { project, addBus } = useDAWStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!project) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-8 border-b border-[#3a3a3c] flex items-center justify-between px-3">
        <span className="text-xs text-[#98989d] uppercase tracking-wider">Mixer</span>
        <button
          onClick={() => addBus()}
          className="px-2 py-0.5 text-[10px] bg-[#30d158] text-white rounded hover:bg-[#28a745] transition-colors"
        >
          + Bus
        </button>
      </div>

      {/* Mixer Content */}
      <div
        ref={scrollRef}
        className="flex-1 flex gap-2 p-3 overflow-x-auto"
      >
        {/* Track Channels */}
        {project.tracks.map((track) => (
          <ChannelStrip key={track.id} track={track} />
        ))}

        {/* Separator */}
        <div className="w-px bg-[#3a3a3c] self-stretch" />

        {/* Bus Channels */}
        {project.buses.map((bus) => (
          <BusChannelStrip key={bus.id} bus={bus} />
        ))}

        {/* Add Bus Button (inline) */}
        {project.buses.length > 0 && (
          <button
            onClick={() => addBus()}
            className="w-10 self-stretch flex items-center justify-center bg-[#1c1c1e] rounded-lg text-[#636366] hover:text-[#98989d] hover:bg-[#2c2c2e] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {/* Separator */}
        {project.buses.length > 0 && (
          <div className="w-px bg-[#3a3a3c] self-stretch" />
        )}

        {/* Master Channel */}
        <ChannelStrip isMaster />
      </div>
    </div>
  );
}
