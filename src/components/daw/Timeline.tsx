/**
 * DAW Timeline - Ruler with bars/beats, playhead, loop region
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useDAWStore } from '../../store/dawStore';

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [showMarkerInput, setShowMarkerInput] = useState<{ x: number; beat: number } | null>(null);
  const [markerName, setMarkerName] = useState('');

  const {
    project,
    view,
    playheadPosition,
    isPlaying,
    setPlayheadPosition,
    setLoopRegion,
    setScroll,
    addMarker,
    deleteMarker,
  } = useDAWStore();

  // Draw timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !project) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.fillStyle = '#2c2c2e';
    ctx.fillRect(0, 0, width, height);

    // Calculate visible range
    const pixelsPerBeat = view.horizontalZoom;
    const beatsPerBar = project.timeSignature[0] * (4 / project.timeSignature[1]);
    const startBeat = view.scrollX / pixelsPerBeat;
    const visibleBeats = width / pixelsPerBeat;

    // Draw loop region
    if (project.loop.enabled) {
      const loopStartX = (project.loop.start - startBeat) * pixelsPerBeat;
      const loopEndX = (project.loop.end - startBeat) * pixelsPerBeat;
      ctx.fillStyle = 'rgba(191, 90, 242, 0.2)';
      ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height);
    }

    // Draw grid lines and bar numbers
    const startBar = Math.floor(startBeat / beatsPerBar);
    const endBar = Math.ceil((startBeat + visibleBeats) / beatsPerBar) + 1;

    ctx.font = '10px -apple-system, system-ui, sans-serif';

    for (let bar = startBar; bar <= endBar; bar++) {
      const beatPos = bar * beatsPerBar;
      const x = (beatPos - startBeat) * pixelsPerBeat;

      // Draw bar line
      ctx.strokeStyle = '#98989d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Draw bar number
      ctx.fillStyle = '#98989d';
      ctx.fillText(`${bar + 1}`, x + 4, 12);

      // Draw beat subdivisions
      for (let beat = 1; beat < beatsPerBar; beat++) {
        const beatX = x + (beat * pixelsPerBeat);
        ctx.strokeStyle = '#3a3a3c';
        ctx.beginPath();
        ctx.moveTo(beatX, height - 8);
        ctx.lineTo(beatX, height);
        ctx.stroke();
      }
    }

    // Draw playhead
    const playheadX = (playheadPosition - startBeat) * pixelsPerBeat;
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#ff453a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = '#ff453a';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }

    // Draw markers
    project.markers.forEach(marker => {
      const markerX = (marker.time - startBeat) * pixelsPerBeat;
      if (markerX >= 0 && markerX <= width) {
        // Marker flag pole
        ctx.strokeStyle = marker.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(markerX, height);
        ctx.lineTo(markerX, 4);
        ctx.stroke();

        // Marker flag
        ctx.fillStyle = marker.color;
        ctx.beginPath();
        ctx.moveTo(markerX, 4);
        ctx.lineTo(markerX + 60, 4);
        ctx.lineTo(markerX + 60, 18);
        ctx.lineTo(markerX, 18);
        ctx.closePath();
        ctx.fill();

        // Marker name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px -apple-system, system-ui, sans-serif';
        ctx.fillText(marker.name.substring(0, 10), markerX + 4, 14);
      }
    });

  }, [project, view, playheadPosition]);

  // Handle click to set playhead
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!project) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pixelsPerBeat = view.horizontalZoom;
    const startBeat = view.scrollX / pixelsPerBeat;
    const clickedBeat = startBeat + (x / pixelsPerBeat);

    setPlayheadPosition(Math.max(0, clickedBeat));
    isDragging.current = true;
  }, [project, view, setPlayheadPosition]);

  // Handle double-click to add marker
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!project) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pixelsPerBeat = view.horizontalZoom;
    const startBeat = view.scrollX / pixelsPerBeat;
    const clickedBeat = startBeat + (x / pixelsPerBeat);

    // Show marker name input
    setShowMarkerInput({ x: e.clientX - rect.left, beat: clickedBeat });
    setMarkerName(`Marker ${project.markers.length + 1}`);
  }, [project, view]);

  // Handle right-click to delete marker
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!project) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pixelsPerBeat = view.horizontalZoom;
    const startBeat = view.scrollX / pixelsPerBeat;
    const clickedBeat = startBeat + (x / pixelsPerBeat);

    // Check if click is near a marker
    const clickedMarker = project.markers.find(marker => {
      const markerX = (marker.time - startBeat) * pixelsPerBeat;
      return Math.abs(markerX - x) < 60; // Within marker flag width
    });

    if (clickedMarker) {
      if (confirm(`Delete marker "${clickedMarker.name}"?`)) {
        deleteMarker(clickedMarker.id);
      }
    }
  }, [project, view, deleteMarker]);

  // Handle marker name submit
  const handleMarkerSubmit = () => {
    if (showMarkerInput && markerName.trim()) {
      addMarker(markerName.trim(), showMarkerInput.beat);
    }
    setShowMarkerInput(null);
    setMarkerName('');
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !project) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pixelsPerBeat = view.horizontalZoom;
    const startBeat = view.scrollX / pixelsPerBeat;
    const clickedBeat = startBeat + (x / pixelsPerBeat);

    setPlayheadPosition(Math.max(0, clickedBeat));
  }, [project, view, setPlayheadPosition]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Handle scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (e.metaKey || e.ctrlKey) {
      // Zoom
      const store = useDAWStore.getState();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      store.setHorizontalZoom(view.horizontalZoom * delta);
    } else {
      // Scroll
      setScroll(Math.max(0, view.scrollX + e.deltaX), view.scrollY);
    }
  }, [view, setScroll]);

  return (
    <div
      ref={containerRef}
      className="h-10 border-b border-[#3a3a3c] cursor-pointer relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Marker name input popup */}
      {showMarkerInput && (
        <div
          className="absolute z-50 bg-[#2c2c2e] border border-[#3a3a3c] rounded-lg shadow-lg p-2"
          style={{ left: showMarkerInput.x, top: -60 }}
        >
          <input
            type="text"
            value={markerName}
            onChange={(e) => setMarkerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleMarkerSubmit();
              if (e.key === 'Escape') {
                setShowMarkerInput(null);
                setMarkerName('');
              }
            }}
            autoFocus
            className="w-32 bg-[#1c1c1e] text-white text-xs px-2 py-1 rounded border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
            placeholder="Marker name"
          />
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleMarkerSubmit}
              className="flex-1 px-2 py-0.5 text-[10px] bg-[#0a84ff] text-white rounded hover:bg-[#0077ed]"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowMarkerInput(null);
                setMarkerName('');
              }}
              className="flex-1 px-2 py-0.5 text-[10px] bg-[#3a3a3c] text-white rounded hover:bg-[#4a4a4c]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
