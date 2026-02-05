/**
 * Tempo Track - Logic Pro style tempo track with automation
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { useDAWStore } from '../../store/dawStore';
import type { TempoChange } from '../../types/daw';

interface TempoTrackProps {
  width: number;
  pixelsPerBeat: number;
}

export function TempoTrack({ width, pixelsPerBeat }: TempoTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    project,
    view,
    addTempoChange,
    updateTempoChange,
    deleteTempoChange,
  } = useDAWStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragPointId, setDragPointId] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  const height = 60;
  const minBpm = 40;
  const maxBpm = 240;

  // Convert BPM to Y position
  const bpmToY = useCallback((bpm: number) => {
    const range = maxBpm - minBpm;
    const normalized = (bpm - minBpm) / range;
    return height - 10 - normalized * (height - 20);
  }, [height]);

  // Convert Y position to BPM
  const yToBpm = useCallback((y: number) => {
    const normalized = (height - 10 - y) / (height - 20);
    return Math.max(minBpm, Math.min(maxBpm, minBpm + normalized * (maxBpm - minBpm)));
  }, [height]);

  // Draw the tempo track
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(0, 0, width, height);

    // Draw horizontal grid lines for BPM values
    ctx.strokeStyle = '#2c2c2e';
    ctx.lineWidth = 1;
    [60, 90, 120, 150, 180].forEach(bpm => {
      const y = bpmToY(bpm);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // BPM label
      ctx.fillStyle = '#5a5a5e';
      ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${bpm}`, 4, y - 2);
    });

    // Get tempo changes sorted by time
    const tempoChanges = [...(project.tempoChanges || [])].sort((a, b) => a.time - b.time);

    // Draw tempo line
    if (tempoChanges.length === 0) {
      // Just draw a flat line at current BPM
      const y = bpmToY(project.bpm);
      ctx.strokeStyle = '#ff9500';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    } else {
      // Draw tempo automation curve
      ctx.strokeStyle = '#ff9500';
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Start from beginning
      const firstChange = tempoChanges[0];
      const startBpm = firstChange.time > 0 ? project.bpm : firstChange.bpm;
      ctx.moveTo(0, bpmToY(startBpm));

      tempoChanges.forEach((change, i) => {
        const x = change.time * pixelsPerBeat;
        const y = bpmToY(change.bpm);

        if (i === 0 && change.time > 0) {
          // Line from start to first point
          ctx.lineTo(x, bpmToY(project.bpm));
        }

        const prevChange = i > 0 ? tempoChanges[i - 1] : null;

        if (change.curve === 'step' && prevChange) {
          // Step: horizontal then vertical
          ctx.lineTo(x, bpmToY(prevChange.bpm));
          ctx.lineTo(x, y);
        } else if (change.curve === 'smooth' && prevChange) {
          // Smooth: bezier curve
          const prevX = prevChange.time * pixelsPerBeat;
          const prevY = bpmToY(prevChange.bpm);
          const cpX = (prevX + x) / 2;
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        } else {
          // Linear: straight line
          ctx.lineTo(x, y);
        }
      });

      // Continue to end
      const lastChange = tempoChanges[tempoChanges.length - 1];
      ctx.lineTo(width, bpmToY(lastChange.bpm));
      ctx.stroke();

      // Fill under the curve
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 149, 0, 0.1)';
      ctx.fill();

      // Draw points
      tempoChanges.forEach(change => {
        const x = change.time * pixelsPerBeat;
        const y = bpmToY(change.bpm);
        const isHovered = hoveredPoint === change.id;
        const isDragged = dragPointId === change.id;

        // Point circle
        ctx.beginPath();
        ctx.arc(x, y, isHovered || isDragged ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isDragged ? '#fff' : isHovered ? '#ffb84d' : '#ff9500';
        ctx.fill();

        // BPM label on hover
        if (isHovered || isDragged) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(change.bpm)} BPM`, x, y - 10);
        }
      });
    }

    // Draw current playhead position tempo
    const playheadX = useDAWStore.getState().playheadPosition * pixelsPerBeat;
    if (playheadX > 0 && playheadX < width) {
      ctx.strokeStyle = '#ff453a';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [project, width, pixelsPerBeat, bpmToY, hoveredPoint, dragPointId]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = x / pixelsPerBeat;

    // Check if clicking on existing point
    const clickedPoint = project.tempoChanges?.find(change => {
      const px = change.time * pixelsPerBeat;
      const py = bpmToY(change.bpm);
      return Math.abs(px - x) < 8 && Math.abs(py - y) < 8;
    });

    if (clickedPoint) {
      if (e.altKey) {
        // Alt+click to delete
        deleteTempoChange(clickedPoint.id);
      } else {
        // Start dragging
        setIsDragging(true);
        setDragPointId(clickedPoint.id);
      }
    } else if (e.shiftKey || e.metaKey) {
      // Shift/Cmd+click to add new point
      const bpm = yToBpm(y);
      addTempoChange(time, bpm);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && dragPointId) {
      // Update the dragged point
      const time = Math.max(0, x / pixelsPerBeat);
      const bpm = yToBpm(y);
      updateTempoChange(dragPointId, { time, bpm });
    } else {
      // Check hover
      const hoveredPt = project.tempoChanges?.find(change => {
        const px = change.time * pixelsPerBeat;
        const py = bpmToY(change.bpm);
        return Math.abs(px - x) < 8 && Math.abs(py - y) < 8;
      });
      setHoveredPoint(hoveredPt?.id || null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragPointId(null);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    if (isDragging) {
      setIsDragging(false);
      setDragPointId(null);
    }
  };

  return (
    <div className="border-b border-[#3a3a3c] bg-[#1c1c1e]">
      <div className="flex">
        {/* Header */}
        <div className="w-52 flex-shrink-0 h-[60px] bg-[#2c2c2e] border-r border-[#3a3a3c] flex items-center px-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#ff9500]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            <span className="text-xs font-medium text-[#ff9500]">Tempo</span>
            <span className="text-[10px] text-[#98989d] ml-auto">
              {project?.bpm || 120} BPM
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <canvas
            ref={canvasRef}
            style={{ width, height }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair"
          />
        </div>
      </div>

      {/* Help text */}
      <div className="h-4 bg-[#2c2c2e] border-t border-[#3a3a3c] flex items-center justify-center">
        <span className="text-[9px] text-[#5a5a5e]">
          ⇧+Click to add point • ⌥+Click to delete • Drag to move
        </span>
      </div>
    </div>
  );
}

/**
 * Tempo Track Header in the Track List
 */
export function TempoTrackHeader() {
  const { project, view, toggleTempoTrack } = useDAWStore();

  return (
    <div
      className={`h-10 border-b border-[#3a3a3c] flex items-center px-3 cursor-pointer transition-colors ${
        view.showTempoTrack ? 'bg-[#3a3a3c]' : 'hover:bg-[#323234]'
      }`}
      onClick={() => toggleTempoTrack?.()}
    >
      <div className="flex items-center gap-2 flex-1">
        <svg className="w-4 h-4 text-[#ff9500]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
        <span className="text-xs font-medium text-[#ff9500]">Tempo Track</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#98989d]">{project?.bpm || 120} BPM</span>
        <div
          className={`w-4 h-4 rounded flex items-center justify-center ${
            view.showTempoTrack ? 'bg-[#ff9500] text-white' : 'text-[#98989d]'
          }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {view.showTempoTrack ? (
              <path d="M19 9l-7 7-7-7" />
            ) : (
              <path d="M9 5l7 7-7 7" />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
