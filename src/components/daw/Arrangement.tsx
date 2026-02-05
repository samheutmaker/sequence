/**
 * DAW Arrangement View - Track lanes with regions
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useDAWStore, dawAudioEngine } from '../../store/dawStore';
import type { Region, MidiRegion, AudioRegion, MidiNote } from '../../types/daw';
import { generateId, getRandomColor } from '../../types/daw';
import { WaveformDisplay } from './WaveformDisplay';
import { AutomationLane } from './AutomationLane';

// Cache for loaded audio buffers
const audioBufferCache = new Map<string, AudioBuffer>();

// Hook to load and cache audio buffer
function useAudioBuffer(audioUrl: string | undefined): AudioBuffer | undefined {
  const [buffer, setBuffer] = useState<AudioBuffer | undefined>(() =>
    audioUrl ? audioBufferCache.get(audioUrl) : undefined
  );

  useEffect(() => {
    if (!audioUrl) {
      setBuffer(undefined);
      return;
    }

    // Check cache first
    const cached = audioBufferCache.get(audioUrl);
    if (cached) {
      setBuffer(cached);
      return;
    }

    // Load the audio file
    let cancelled = false;

    dawAudioEngine.loadSample(audioUrl).then((loadedBuffer) => {
      if (!cancelled) {
        audioBufferCache.set(audioUrl, loadedBuffer);
        setBuffer(loadedBuffer);
      }
    }).catch(() => {
      // Failed to load audio for waveform
    });

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  return buffer;
}

function RegionBlock({
  region,
  track,
  pixelsPerBeat,
  startBeat,
  trackTop,
}: {
  region: Region;
  track: any;
  pixelsPerBeat: number;
  startBeat: number;
  trackTop: number;
}) {
  const {
    view,
    selectRegion,
    moveRegion,
    resizeRegion,
    deleteRegion,
    duplicateRegion,
    splitRegion,
    mergeRegions,
    openEditor,
    project,
    updateRegionFade,
    setRegionLoop,
  } = useDAWStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'start' | 'end' | null>(null);
  const [isFadeDragging, setIsFadeDragging] = useState<'fadeIn' | 'fadeOut' | null>(null);
  const [isLoopDragging, setIsLoopDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startTime: 0, fadeValue: 0, loopLength: 0 });

  const isSelected = view.selectedRegionIds.includes(region.id);
  const isMidi = 'notes' in region;
  const isAudio = 'audioUrl' in region;

  // Load audio buffer for waveform display
  const audioUrl = isAudio ? (region as AudioRegion).audioUrl : undefined;
  const audioBuffer = useAudioBuffer(audioUrl);

  // Calculate dimensions including loops
  const loopLength = region.looped && region.loopLength ? region.loopLength : region.duration;
  const loopCount = region.looped ? Math.floor(loopLength / region.duration) : 1;
  const left = (region.startTime - startBeat) * pixelsPerBeat;
  const baseWidth = region.duration * pixelsPerBeat;
  const totalWidth = loopLength * pixelsPerBeat;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;

    // Handle tool-specific actions
    switch (view.activeTool) {
      case 'eraser':
        // Delete region
        deleteRegion(region.id);
        return;

      case 'scissors':
        // Split region at click point
        const clickBeat = region.startTime + (relX / pixelsPerBeat);
        if (clickBeat > region.startTime && clickBeat < region.startTime + region.duration) {
          splitRegion(region.id, clickBeat);
        }
        return;

      case 'glue':
        // Select region, then merge all selected regions on same track
        selectRegion(region.id, true); // Add to selection
        // Get all selected regions on this track (including the one we just clicked)
        const selectedOnTrack = [...view.selectedRegionIds, region.id]
          .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates
          .filter(id => {
            const r = project?.regions[id];
            return r && r.trackId === region.trackId;
          });
        if (selectedOnTrack.length >= 2) {
          mergeRegions(selectedOnTrack);
        }
        return;

      case 'mute':
        // Toggle mute on region
        const { setRegionMute } = useDAWStore.getState();
        setRegionMute(region.id, !region.muted);
        return;

      default:
        // Pointer tool and others - normal selection and drag behavior
        selectRegion(region.id, e.shiftKey);

        // Check for resize handle
        if (relX < 8) {
          setIsResizing('start');
        } else if (relX > rect.width - 8) {
          setIsResizing('end');
        } else {
          setIsDragging(true);
        }

        setDragStart({
          x: e.clientX,
          y: e.clientY,
          startTime: region.startTime,
          fadeValue: 0,
          loopLength: loopLength,
        });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditor(track.id, region.id);
  };

  useEffect(() => {
    if (!isDragging && !isResizing && !isFadeDragging && !isLoopDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaBeat = deltaX / pixelsPerBeat;

      if (isDragging) {
        const newStartTime = Math.max(0, dragStart.startTime + deltaBeat);

        // Snap to grid if enabled
        if (view.snapEnabled && view.snapValue !== 'off') {
          const match = view.snapValue.match(/1\/(\d+)(T)?/);
          if (match) {
            const division = parseInt(match[1]);
            const isTriplet = match[2] === 'T';
            const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
            const snapped = Math.round(newStartTime / gridSize) * gridSize;
            moveRegion(region.id, region.trackId, snapped);
            return;
          }
        }

        moveRegion(region.id, region.trackId, newStartTime);
      } else if (isResizing) {
        if (isResizing === 'end') {
          const newDuration = Math.max(0.25, region.duration + deltaBeat);
          resizeRegion(region.id, newDuration, 'end');
        } else {
          const newDuration = Math.max(0.25, region.duration - deltaBeat);
          resizeRegion(region.id, newDuration, 'start');
        }
        setDragStart({ ...dragStart, x: e.clientX });
      } else if (isFadeDragging && isAudio) {
        // Handle fade adjustment
        const newFade = Math.max(0, Math.min(region.duration * 0.5, dragStart.fadeValue + deltaBeat));
        updateRegionFade(region.id, isFadeDragging, newFade);
      } else if (isLoopDragging) {
        // Handle loop extension
        const newLoopLength = Math.max(region.duration, dragStart.loopLength + deltaBeat);
        const loopCount = Math.round(newLoopLength / region.duration);
        const snappedLoopLength = loopCount * region.duration;
        if (loopCount > 1) {
          setRegionLoop(region.id, true, snappedLoopLength);
        } else {
          setRegionLoop(region.id, false, undefined);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setIsFadeDragging(null);
      setIsLoopDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, isFadeDragging, isLoopDragging, dragStart, region, view, pixelsPerBeat, moveRegion, resizeRegion, updateRegionFade, setRegionLoop, isAudio]);

  // Render MIDI notes preview
  const renderMidiPreview = () => {
    if (!isMidi) return null;
    const midiRegion = region as MidiRegion;
    if (!midiRegion.notes.length) return null;

    const notes = midiRegion.notes;
    const minPitch = Math.min(...notes.map(n => n.pitch));
    const maxPitch = Math.max(...notes.map(n => n.pitch));
    const pitchRange = Math.max(1, maxPitch - minPitch);
    const noteHeight = Math.max(2, (track.height - 24) / pitchRange);

    return (
      <div className="absolute inset-0 overflow-hidden pt-4 pb-1 px-1">
        {notes.map(note => {
          const noteLeft = (note.startTime / region.duration) * 100;
          const noteWidth = (note.duration / region.duration) * 100;
          const noteTop = ((maxPitch - note.pitch) / pitchRange) * 100;

          return (
            <div
              key={note.id}
              className="absolute rounded-sm"
              style={{
                left: `${noteLeft}%`,
                width: `${Math.max(1, noteWidth)}%`,
                top: `${noteTop}%`,
                height: `${noteHeight}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
              }}
            />
          );
        })}
      </div>
    );
  };

  // Render audio waveform
  const renderAudioPreview = () => {
    if (!isAudio) return null;

    const audioRegion = region as AudioRegion;
    const waveformHeight = track.height - 20; // Account for region name header

    // Use audioBuffer if loaded, otherwise show placeholder if URL exists
    const hasAudioUrl = !!audioRegion.audioUrl;

    return (
      <div className="absolute left-0 right-0 bottom-1 top-4 overflow-hidden">
        <WaveformDisplay
          audioBuffer={audioBuffer}
          width={Math.max(1, baseWidth - 2)}
          height={Math.max(1, waveformHeight)}
          color="rgba(255, 255, 255, 0.7)"
          isPlaceholder={!audioBuffer && hasAudioUrl}
        />
      </div>
    );
  };

  // Tool-based cursor
  const getCursor = () => {
    switch (view.activeTool) {
      case 'eraser': return 'cursor-not-allowed';
      case 'scissors': return 'cursor-crosshair';
      case 'glue': return 'cursor-cell';
      case 'mute': return 'cursor-pointer';
      default: return 'cursor-move';
    }
  };

  return (
    <div
      data-region={region.id}
      className={`absolute rounded overflow-hidden transition-shadow ${getCursor()} ${
        isSelected ? 'ring-2 ring-white shadow-lg' : ''
      } ${region.muted ? 'opacity-50' : ''}`}
      style={{
        left: `${left}px`,
        width: `${totalWidth}px`,
        top: 0,
        bottom: 0,
        backgroundColor: region.color,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Loop iteration markers */}
      {region.looped && loopCount > 1 && (
        <>
          {Array.from({ length: loopCount - 1 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none"
              style={{ left: `${((i + 1) * baseWidth)}px` }}
            />
          ))}
          {/* Looped area overlay */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${baseWidth}px`,
              right: 0,
              background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)',
            }}
          />
        </>
      )}

      {/* Region name */}
      <div className="absolute top-0 left-0 px-2 py-0.5 text-[10px] text-white truncate font-medium bg-black/20" style={{ width: `${baseWidth}px` }}>
        {region.name}
      </div>

      {/* Content preview */}
      {isAudio && renderAudioPreview()}
      {isMidi && renderMidiPreview()}

      {/* Fade overlays for audio regions */}
      {isAudio && (region as AudioRegion).fadeIn > 0 && (
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none"
          style={{
            width: `${((region as AudioRegion).fadeIn / region.duration) * 100}%`,
            background: 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)',
          }}
        >
          {/* Fade curve line */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path
              d={`M0,100% L100%,0 L100%,100% Z`}
              fill="rgba(0,0,0,0.3)"
            />
            <line x1="0" y1="100%" x2="100%" y2="0" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>
      )}
      {isAudio && (region as AudioRegion).fadeOut > 0 && (
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none"
          style={{
            width: `${((region as AudioRegion).fadeOut / region.duration) * 100}%`,
            background: 'linear-gradient(to left, rgba(0,0,0,0.7), transparent)',
          }}
        >
          {/* Fade curve line */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path
              d={`M0,0 L100%,100% L0,100% Z`}
              fill="rgba(0,0,0,0.3)"
            />
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>
      )}

      {/* Fade handles for audio regions */}
      {isAudio && isSelected && (
        <>
          {/* Fade-in handle */}
          <div
            className="absolute top-0 w-3 h-3 cursor-ew-resize z-10 group"
            style={{
              left: `${((region as AudioRegion).fadeIn / region.duration) * 100}%`,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsFadeDragging('fadeIn');
              setDragStart({
                x: e.clientX,
                y: e.clientY,
                startTime: region.startTime,
                fadeValue: (region as AudioRegion).fadeIn,
                loopLength: 0,
              });
            }}
          >
            <div className="w-3 h-3 bg-white rounded-full border-2 border-[#0a84ff] shadow-lg group-hover:scale-125 transition-transform" />
          </div>
          {/* Fade-out handle */}
          <div
            className="absolute top-0 w-3 h-3 cursor-ew-resize z-10 group"
            style={{
              right: `${((region as AudioRegion).fadeOut / region.duration) * 100}%`,
              transform: 'translateX(50%)',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsFadeDragging('fadeOut');
              setDragStart({
                x: e.clientX,
                y: e.clientY,
                startTime: region.startTime,
                fadeValue: (region as AudioRegion).fadeOut,
                loopLength: 0,
              });
            }}
          >
            <div className="w-3 h-3 bg-white rounded-full border-2 border-[#0a84ff] shadow-lg group-hover:scale-125 transition-transform" />
          </div>
        </>
      )}

      {/* Resize handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
      />

      {/* Loop indicator */}
      {region.looped && (
        <div className="absolute top-1" style={{ left: `${baseWidth - 16}px` }}>
          <svg className="w-3 h-3 text-white/70" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
          </svg>
        </div>
      )}

      {/* Loop drag handle (right edge bracket) */}
      {isSelected && (
        <div
          className="absolute top-0 bottom-0 w-4 cursor-e-resize flex items-center justify-center group"
          style={{ right: 0 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsLoopDragging(true);
            setDragStart({
              x: e.clientX,
              y: e.clientY,
              startTime: region.startTime,
              fadeValue: 0,
              loopLength: loopLength,
            });
          }}
        >
          <div className="w-1 h-8 bg-white/50 rounded-full group-hover:bg-white group-hover:h-12 transition-all" />
        </div>
      )}
    </div>
  );
}

function TrackLane({
  track,
  pixelsPerBeat,
  startBeat,
  yOffset,
}: {
  track: any;
  pixelsPerBeat: number;
  startBeat: number;
  yOffset: number;
}) {
  const { project, view, addRegion, selectTrack, clearSelection } = useDAWStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!project) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedBeat = startBeat + (x / pixelsPerBeat);

    // Snap to grid
    let snapBeat = clickedBeat;
    if (view.snapEnabled && view.snapValue !== 'off') {
      const match = view.snapValue.match(/1\/(\d+)(T)?/);
      if (match) {
        const division = parseInt(match[1]);
        const isTriplet = match[2] === 'T';
        const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
        snapBeat = Math.round(clickedBeat / gridSize) * gridSize;
      }
    }

    // Create appropriate region type based on track type
    if (track.type === 'audio') {
      const newRegion: AudioRegion = {
        id: generateId(),
        name: `${track.name} Region`,
        trackId: track.id,
        startTime: snapBeat,
        duration: 4, // 1 bar in 4/4
        offset: 0,
        color: track.color,
        muted: false,
        looped: false,
        audioUrl: '',
        gain: 1,
        fadeIn: 0,
        fadeOut: 0,
      };
      addRegion(newRegion);
    } else {
      // Create MIDI region for instrument/drummer tracks
      const newRegion: MidiRegion = {
        id: generateId(),
        name: `${track.name} Region`,
        trackId: track.id,
        startTime: snapBeat,
        duration: 4, // 1 bar in 4/4
        color: track.color,
        muted: false,
        looped: false,
        notes: [],
        quantize: '1/16',
      };
      addRegion(newRegion);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectTrack(track.id);
      clearSelection();
    }
  };

  // Drag and drop handlers for loops
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!project) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let clickedBeat = startBeat + (x / pixelsPerBeat);

    // Snap to grid
    if (view.snapEnabled && view.snapValue !== 'off') {
      const match = view.snapValue.match(/1\/(\d+)(T)?/);
      if (match) {
        const division = parseInt(match[1]);
        const isTriplet = match[2] === 'T';
        const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
        clickedBeat = Math.round(clickedBeat / gridSize) * gridSize;
      }
    }

    // Handle sample drop
    const sampleData = e.dataTransfer.getData('sample');
    if (sampleData) {
      try {
        const sample = JSON.parse(sampleData);

        // Create audio region from sample
        const newRegion: AudioRegion = {
          id: generateId(),
          name: sample.name,
          trackId: track.id,
          startTime: Math.max(0, clickedBeat),
          duration: sample.duration || 1,
          offset: 0,
          color: track.color || getRandomColor(),
          muted: false,
          looped: false,
          audioUrl: sample.url,
          gain: 1,
          fadeIn: 0,
          fadeOut: 0,
        };

        addRegion(newRegion);
        return;
      } catch {
        // Failed to parse dropped sample data
      }
    }

    // Handle loop drop
    const loopData = e.dataTransfer.getData('loop');
    if (loopData) {
      try {
        const loop = JSON.parse(loopData);

        // Create audio region from loop
        const beatsPerBar = project.timeSignature[0] * (4 / project.timeSignature[1]);
        const duration = loop.bars * beatsPerBar;

        const newRegion: AudioRegion = {
          id: generateId(),
          name: loop.name,
          trackId: track.id,
          startTime: Math.max(0, clickedBeat),
          duration,
          offset: 0,
          color: track.color || getRandomColor(),
          muted: false,
          looped: false,
          audioUrl: loop.audioUrl || '', // Use loop's audio URL if available
          gain: 1,
          fadeIn: 0,
          fadeOut: 0,
        };

        addRegion(newRegion);
      } catch {
        // Failed to parse dropped loop data
      }
    }
  };

  return (
    <div
      className={`relative border-b border-[#3a3a3c] transition-colors ${
        isDragOver ? 'bg-[#0a84ff]/20 ring-2 ring-[#0a84ff] ring-inset' : 'hover:bg-white/5'
      }`}
      style={{ height: track.height }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Regions */}
      {track.regions.map((regionId: string) => {
        const region = project?.regions[regionId];
        if (!region) return null;

        return (
          <RegionBlock
            key={regionId}
            region={region}
            track={track}
            pixelsPerBeat={pixelsPerBeat}
            startBeat={startBeat}
            trackTop={yOffset}
          />
        );
      })}

      {/* Automation Lanes Overlay */}
      {track.showAutomation && track.automationLanes.map((lane: any, laneIndex: number) => (
        <div
          key={lane.id}
          className="absolute left-0 right-0 pointer-events-auto"
          style={{
            top: track.height * 0.6 + laneIndex * 30,
            height: 28,
          }}
        >
          <AutomationLane
            trackId={track.id}
            laneId={lane.id}
            parameter={lane.parameter}
            points={lane.points}
            color={track.color}
            height={28}
            pixelsPerBeat={pixelsPerBeat}
          />
        </div>
      ))}
    </div>
  );
}

export function Arrangement() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const {
    project,
    view,
    playheadPosition,
    setScroll,
    selectRegion,
    clearSelection,
  } = useDAWStore();

  // Marquee selection state
  const [marquee, setMarquee] = useState<{
    isSelecting: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScroll(target.scrollLeft, target.scrollTop);
  }, [setScroll]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const store = useDAWStore.getState();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      store.setHorizontalZoom(view.horizontalZoom * delta);
    }
  }, [view.horizontalZoom]);

  // Marquee selection handlers
  const handleMarqueeStart = useCallback((e: React.MouseEvent) => {
    // Don't start marquee if clicking on a region block
    const target = e.target as HTMLElement;
    if (target.closest('[data-region]')) return;

    // Only start on left mouse button
    if (e.button !== 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop || 0);

    // Clear existing selection unless shift is held
    if (!e.shiftKey) {
      clearSelection();
    }

    setMarquee({
      isSelecting: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  }, [clearSelection]);

  // Handle marquee drag
  useEffect(() => {
    if (!marquee?.isSelecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
      const y = e.clientY - rect.top + (containerRef.current?.scrollTop || 0);

      setMarquee(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!marquee || !project) {
        setMarquee(null);
        return;
      }

      // Calculate marquee bounds
      const left = Math.min(marquee.startX, marquee.currentX);
      const right = Math.max(marquee.startX, marquee.currentX);
      const top = Math.min(marquee.startY, marquee.currentY);
      const bottom = Math.max(marquee.startY, marquee.currentY);

      const pixelsPerBeat = view.horizontalZoom;

      // Find regions that intersect with marquee
      let yOffset = 0;
      project.tracks.forEach(track => {
        const trackTop = yOffset;
        const trackBottom = yOffset + track.height;
        yOffset += track.height;

        // Check if marquee intersects this track vertically
        if (bottom < trackTop || top > trackBottom) return;

        // Check each region in this track
        track.regions.forEach((regionId: string) => {
          const region = project.regions[regionId];
          if (!region) return;

          const regionLeft = region.startTime * pixelsPerBeat;
          const regionRight = (region.startTime + region.duration) * pixelsPerBeat;
          const regionTop = trackTop;
          const regionBottom = trackBottom;

          // Check if region intersects marquee
          if (
            regionRight > left &&
            regionLeft < right &&
            regionBottom > top &&
            regionTop < bottom
          ) {
            selectRegion(region.id, true); // Add to selection
          }
        });
      });

      setMarquee(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [marquee, project, view.horizontalZoom, selectRegion]);

  if (!project) return null;

  const pixelsPerBeat = view.horizontalZoom;
  const startBeat = view.scrollX / pixelsPerBeat;
  const beatsPerBar = project.timeSignature[0] * (4 / project.timeSignature[1]);

  // Calculate grid width (at least 100 bars)
  const totalBars = Math.max(100, Math.ceil((playheadPosition + 16) / beatsPerBar) + 10);
  const gridWidth = totalBars * beatsPerBar * pixelsPerBeat;

  // Calculate marquee rectangle for rendering
  const marqueeRect = marquee ? {
    left: Math.min(marquee.startX, marquee.currentX),
    top: Math.min(marquee.startY, marquee.currentY),
    width: Math.abs(marquee.currentX - marquee.startX),
    height: Math.abs(marquee.currentY - marquee.startY),
  } : null;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto relative"
      onScroll={handleScroll}
      onWheel={handleWheel}
      onMouseDown={handleMarqueeStart}
    >
      {/* Grid Background */}
      <div
        ref={gridRef}
        className="relative"
        style={{ width: gridWidth, minHeight: '100%' }}
      >
        {/* Grid Lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: gridWidth, height: '100%' }}
        >
          <defs>
            <pattern
              id="beat-grid"
              width={pixelsPerBeat}
              height={100}
              patternUnits="userSpaceOnUse"
            >
              <line
                x1={pixelsPerBeat}
                y1="0"
                x2={pixelsPerBeat}
                y2="100"
                stroke="#2c2c2e"
                strokeWidth="1"
              />
            </pattern>
            <pattern
              id="bar-grid"
              width={beatsPerBar * pixelsPerBeat}
              height={100}
              patternUnits="userSpaceOnUse"
            >
              <rect width="100%" height="100%" fill="url(#beat-grid)" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="100"
                stroke="#3a3a3c"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bar-grid)" />
        </svg>

        {/* Loop Region Overlay */}
        {project.loop.enabled && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: project.loop.start * pixelsPerBeat,
              width: (project.loop.end - project.loop.start) * pixelsPerBeat,
              backgroundColor: 'rgba(191, 90, 242, 0.1)',
              borderLeft: '2px solid #bf5af2',
              borderRight: '2px solid #bf5af2',
            }}
          />
        )}

        {/* Track Lanes */}
        <div className="relative">
          {project.tracks.map((track, index) => {
            // Get all collapsed folder IDs
            const collapsedFolderIds = new Set(
              project.tracks
                .filter(t => t.type === 'folder' && t.isCollapsed)
                .map(t => t.id)
            );

            // Skip tracks that are inside a collapsed folder
            if (track.groupId && collapsedFolderIds.has(track.groupId)) {
              return null;
            }

            // Calculate yOffset only for visible tracks
            const visibleTracks = project.tracks.slice(0, index).filter(t => {
              if (t.groupId && collapsedFolderIds.has(t.groupId)) {
                return false;
              }
              return true;
            });
            const yOffset = visibleTracks.reduce((sum, t) => sum + t.height, 0);

            // For folder tracks, collect child regions for summary display when collapsed
            const isFolderTrack = track.type === 'folder';
            const isCollapsed = track.isCollapsed;
            let folderChildRegions: string[] = [];

            if (isFolderTrack && isCollapsed) {
              // Get all child tracks of this folder
              const childTracks = project.tracks.filter(t => t.groupId === track.id);
              // Collect all regions from child tracks
              folderChildRegions = childTracks.flatMap(t => t.regions);
            }

            return (
              <TrackLane
                key={track.id}
                track={{
                  ...track,
                  // When folder is collapsed, show child regions on folder track
                  regions: isFolderTrack && isCollapsed
                    ? [...track.regions, ...folderChildRegions]
                    : track.regions,
                }}
                pixelsPerBeat={pixelsPerBeat}
                startBeat={0}
                yOffset={yOffset}
              />
            );
          })}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#ff453a] pointer-events-none z-10"
          style={{ left: playheadPosition * pixelsPerBeat }}
        />

        {/* Marquee Selection Rectangle */}
        {marqueeRect && marqueeRect.width > 2 && marqueeRect.height > 2 && (
          <div
            className="absolute pointer-events-none z-20 border-2 border-[#0a84ff] bg-[#0a84ff]/20 rounded"
            style={{
              left: marqueeRect.left,
              top: marqueeRect.top,
              width: marqueeRect.width,
              height: marqueeRect.height,
            }}
          />
        )}
      </div>
    </div>
  );
}
