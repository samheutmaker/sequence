/**
 * DAW Transport Bar - Playback controls, tempo, time display
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDAWStore, dawAudioEngine } from '../../store/dawStore';
import { formatTime } from '../../types/daw';

export function TransportBar() {
  const {
    project,
    isPlaying,
    isRecording,
    playheadPosition,
    metronomeEnabled,
    play,
    pause,
    stop,
    toggleRecording,
    setBpm,
    setTimeSignature,
    toggleLoop,
    toggleMetronome,
    setPlayheadPosition,
  } = useDAWStore();

  const [audioContextState, setAudioContextState] = useState<string>('suspended');
  const [tempoInput, setTempoInput] = useState<string>('');
  const [isEditingTempo, setIsEditingTempo] = useState(false);
  const tempoInputRef = useRef<HTMLInputElement>(null);

  // Monitor AudioContext state
  useEffect(() => {
    const checkState = () => {
      const ctx = dawAudioEngine.context;
      if (ctx) {
        setAudioContextState(ctx.state);
      }
    };

    checkState();
    const interval = setInterval(checkState, 500);
    return () => clearInterval(interval);
  }, []);

  // Resume audio context on any click in the transport bar
  const handleTransportClick = useCallback(async () => {
    const ctx = dawAudioEngine.context;
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
        setAudioContextState(ctx.state);

        // Play a quick confirmation beep to let user know audio is enabled
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        // AudioContext resume failed silently
      }
    }
  }, []);

  if (!project) return null;

  const formattedTime = formatTime(playheadPosition, project.bpm, project.timeSignature);
  const seconds = (playheadPosition / project.bpm) * 60;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return (
    <div
      className="h-14 bg-[#2c2c2e] border-b border-[#1c1c1e] flex items-center px-4 gap-6"
      onClick={handleTransportClick}
    >
      {/* Transport Controls */}
      <div className="flex items-center gap-1">
        {/* Rewind */}
        <button
          onClick={() => setPlayheadPosition(0)}
          className="w-10 h-10 flex items-center justify-center text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded-lg transition-colors"
          title="Go to Beginning (Enter)"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={isPlaying ? pause : play}
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
            isPlaying
              ? 'bg-[#30d158] text-white hover:bg-[#28b84c]'
              : 'bg-[#0a84ff] text-white hover:bg-[#0077ed]'
          }`}
          title="Play/Pause (Space)"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          className="w-10 h-10 flex items-center justify-center text-[#98989d] hover:text-white hover:bg-[#3a3a3c] rounded-lg transition-colors"
          title="Stop"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
        </button>

        {/* Record */}
        <button
          onClick={toggleRecording}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            isRecording
              ? 'bg-[#ff453a] text-white'
              : 'text-[#ff453a] hover:bg-[#3a3a3c]'
          }`}
          title="Record (R)"
        >
          <div className={`w-4 h-4 rounded-full ${isRecording ? 'animate-pulse' : ''} bg-current`} />
        </button>
      </div>

      <div className="w-px h-8 bg-[#3a3a3c]" />

      {/* Time Display */}
      <div className="flex flex-col items-center">
        {/* Bars.Beats.Ticks */}
        <div className="text-xl font-mono text-white tracking-wider">
          {formattedTime}
        </div>
        {/* Minutes:Seconds.Ms */}
        <div className="text-xs font-mono text-[#98989d]">
          {minutes.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}.{ms.toString().padStart(3, '0')}
        </div>
      </div>

      <div className="w-px h-8 bg-[#3a3a3c]" />

      {/* Tempo */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1">
          <input
            ref={tempoInputRef}
            type="text"
            inputMode="numeric"
            value={isEditingTempo ? tempoInput : project.bpm}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setTempoInput(value);
            }}
            onFocus={(e) => {
              setIsEditingTempo(true);
              setTempoInput(String(project.bpm));
              // Select all text after a small delay to ensure value is set
              setTimeout(() => e.target.select(), 0);
            }}
            onBlur={() => {
              setIsEditingTempo(false);
              const value = parseInt(tempoInput) || 120;
              setBpm(Math.max(20, Math.min(300, value)));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setTempoInput(String(project.bpm));
                e.currentTarget.blur();
              }
            }}
            className="w-16 bg-transparent text-white text-lg font-mono text-center focus:outline-none focus:bg-[#3a3a3c] rounded"
          />
          <span className="text-xs text-[#98989d]">BPM</span>
        </div>
        {/* Time Signature */}
        <div className="flex items-center gap-1 text-xs text-[#98989d]">
          <select
            value={project.timeSignature[0]}
            onChange={(e) => setTimeSignature([parseInt(e.target.value), project.timeSignature[1]])}
            className="bg-transparent focus:outline-none"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 12].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span>/</span>
          <select
            value={project.timeSignature[1]}
            onChange={(e) => setTimeSignature([project.timeSignature[0], parseInt(e.target.value)])}
            className="bg-transparent focus:outline-none"
          >
            {[2, 4, 8, 16].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-px h-8 bg-[#3a3a3c]" />

      {/* Loop */}
      <button
        onClick={toggleLoop}
        className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
          project.loop.enabled
            ? 'bg-[#bf5af2] text-white'
            : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
        }`}
        title="Cycle (L)"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
        </svg>
        <span className="text-xs">Cycle</span>
      </button>

      {/* Metronome */}
      <button
        onClick={toggleMetronome}
        className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
          metronomeEnabled
            ? 'bg-[#ff9500] text-white'
            : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
        }`}
        title="Metronome (M)"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1.5 7.5 21h9L12 1.5zm0 5.5 2.5 10h-5L12 7z" />
        </svg>
        <span className="text-xs">Click</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Audio Context State Indicator */}
      {audioContextState === 'suspended' && (
        <div className="flex items-center gap-2 px-3 py-1 bg-[#ff9500] text-white rounded-lg text-xs cursor-pointer hover:bg-[#e68600] transition-colors">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Click to enable audio</span>
        </div>
      )}

      {/* CPU/Audio Info */}
      <div className="flex items-center gap-4 text-xs text-[#98989d]">
        <div className="flex items-center gap-2">
          <span>Sample Rate:</span>
          <span className="text-white font-mono">{project.sampleRate / 1000}kHz</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Bit Depth:</span>
          <span className="text-white font-mono">{project.bitDepth}-bit</span>
        </div>
        {/* Audio Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              audioContextState === 'running'
                ? 'bg-[#30d158]'
                : audioContextState === 'suspended'
                ? 'bg-[#ff9500]'
                : 'bg-[#ff453a]'
            }`}
          />
          <span className="capitalize">{audioContextState}</span>
        </div>
      </div>
    </div>
  );
}
