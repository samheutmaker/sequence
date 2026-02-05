/**
 * AutomationLane - Logic Pro-style automation curves with bezier handles
 * Features: bezier curves, tension adjustment, snap to grid, point selection
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useDAWStore } from '../../store/dawStore';
import type { AutomationPoint, AutomationParameter, CurveType } from '../../types/daw';
import { generateId } from '../../types/daw';

interface AutomationLaneProps {
  trackId: string;
  laneId: string;
  parameter: AutomationParameter;
  points: AutomationPoint[];
  color: string;
  height: number;
  pixelsPerBeat: number;
}

// Get parameter display value
function getParameterDisplay(parameter: AutomationParameter, value: number): string {
  switch (parameter) {
    case 'volume':
      // Convert 0-1 to dB scale (-inf to +6)
      if (value === 0) return '-∞ dB';
      const db = 20 * Math.log10(value);
      return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
    case 'pan':
      // Convert 0-1 to -100 to +100
      const panValue = Math.round((value - 0.5) * 200);
      if (panValue === 0) return 'C';
      return panValue < 0 ? `L${Math.abs(panValue)}` : `R${panValue}`;
    case 'mute':
      return value > 0.5 ? 'On' : 'Off';
    case 'send':
      return `${Math.round(value * 100)}%`;
    case 'plugin':
      return `${Math.round(value * 100)}%`;
    default:
      return `${Math.round(value * 100)}%`;
  }
}

// Get parameter label
function getParameterLabel(parameter: AutomationParameter): string {
  switch (parameter) {
    case 'volume': return 'Volume';
    case 'pan': return 'Pan';
    case 'mute': return 'Mute';
    case 'send': return 'Send';
    case 'plugin': return 'Plugin';
    default: return 'Automation';
  }
}

export function AutomationLane({
  trackId,
  laneId,
  parameter,
  points,
  color,
  height,
  pixelsPerBeat,
}: AutomationLaneProps) {
  const {
    project,
    view,
    addAutomationPoint,
    updateAutomationPoint,
    deleteAutomationPoint,
    setAutomationPointCurve,
  } = useDAWStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPointId, setDragPointId] = useState<string | null>(null);
  const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number; value: number } | null>(null);

  // Curve tension dragging
  const [isTensionDragging, setIsTensionDragging] = useState(false);
  const [tensionSegment, setTensionSegment] = useState<{ fromIndex: number; toIndex: number } | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pointId: string } | null>(null);

  // Local points for smooth dragging
  const [localPoints, setLocalPoints] = useState<AutomationPoint[]>(points);

  useEffect(() => {
    setLocalPoints(points);
  }, [points]);

  // Snap time to grid if enabled
  const snapToGrid = useCallback((time: number): number => {
    if (!view.snapEnabled || view.snapValue === 'off') return time;

    const match = view.snapValue.match(/1\/(\d+)(T)?/);
    if (match) {
      const division = parseInt(match[1]);
      const isTriplet = match[2] === 'T';
      const gridSize = isTriplet ? (4 / division) * (2 / 3) : 4 / division;
      return Math.round(time / gridSize) * gridSize;
    }
    return time;
  }, [view.snapEnabled, view.snapValue]);

  // Calculate bezier control points for smooth curves
  const getBezierControlPoints = (
    p1: AutomationPoint,
    p2: AutomationPoint,
    tension: number = 0.3
  ): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } => {
    const x1 = p1.time * pixelsPerBeat;
    const y1 = (1 - p1.value) * height;
    const x2 = p2.time * pixelsPerBeat;
    const y2 = (1 - p2.value) * height;

    const dx = x2 - x1;

    // Adjust control points based on curve type
    switch (p2.curve) {
      case 'exponential':
        return {
          cp1x: x1 + dx * 0.3,
          cp1y: y1,
          cp2x: x1 + dx * 0.8,
          cp2y: y2,
        };
      case 'logarithmic':
        return {
          cp1x: x1 + dx * 0.2,
          cp1y: y2,
          cp2x: x1 + dx * 0.7,
          cp2y: y2,
        };
      case 's-curve':
        return {
          cp1x: x1 + dx * tension,
          cp1y: y1,
          cp2x: x2 - dx * tension,
          cp2y: y2,
        };
      case 'step':
      case 'linear':
      default:
        return {
          cp1x: x1 + dx * tension,
          cp1y: y1 + (y2 - y1) * tension,
          cp2x: x2 - dx * tension,
          cp2y: y2 - (y2 - y1) * tension,
        };
    }
  };

  // Draw automation curve
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !project) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw subtle background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const beatsPerBar = project.timeSignature[0] * (4 / project.timeSignature[1]);
    for (let beat = 0; beat < width / pixelsPerBeat; beat++) {
      const x = beat * pixelsPerBeat;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal guides at 25%, 50%, 75%
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.setLineDash([2, 4]);
    [0.25, 0.5, 0.75].forEach(v => {
      const y = (1 - v) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Sort points by time
    const sortedPoints = [...localPoints].sort((a, b) => a.time - b.time);

    if (sortedPoints.length === 0) {
      // Draw default line at 50%
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      return;
    }

    // Draw filled area under curve first
    ctx.beginPath();
    const firstPoint = sortedPoints[0];
    const firstX = firstPoint.time * pixelsPerBeat;
    const firstY = (1 - firstPoint.value) * height;

    ctx.moveTo(0, height);
    ctx.lineTo(0, firstY);
    ctx.lineTo(firstX, firstY);

    for (let i = 1; i < sortedPoints.length; i++) {
      const point = sortedPoints[i];
      const prevPoint = sortedPoints[i - 1];
      const x = point.time * pixelsPerBeat;
      const y = (1 - point.value) * height;
      const prevX = prevPoint.time * pixelsPerBeat;
      const prevY = (1 - prevPoint.value) * height;

      if (point.curve === 'step') {
        ctx.lineTo(x, prevY);
        ctx.lineTo(x, y);
      } else if (point.curve === 'linear') {
        ctx.lineTo(x, y);
      } else {
        // Bezier curves
        const cp = getBezierControlPoints(prevPoint, point);
        ctx.bezierCurveTo(cp.cp1x, cp.cp1y, cp.cp2x, cp.cp2y, x, y);
      }
    }

    const lastPoint = sortedPoints[sortedPoints.length - 1];
    const lastY = (1 - lastPoint.value) * height;
    ctx.lineTo(width, lastY);
    ctx.lineTo(width, height);
    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}10`);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw the curve line
    ctx.beginPath();
    ctx.moveTo(0, firstY);
    ctx.lineTo(firstX, firstY);

    for (let i = 1; i < sortedPoints.length; i++) {
      const point = sortedPoints[i];
      const prevPoint = sortedPoints[i - 1];
      const x = point.time * pixelsPerBeat;
      const y = (1 - point.value) * height;
      const prevX = prevPoint.time * pixelsPerBeat;
      const prevY = (1 - prevPoint.value) * height;

      if (point.curve === 'step') {
        ctx.lineTo(x, prevY);
        ctx.lineTo(x, y);
      } else if (point.curve === 'linear') {
        ctx.lineTo(x, y);
      } else {
        const cp = getBezierControlPoints(prevPoint, point);
        ctx.bezierCurveTo(cp.cp1x, cp.cp1y, cp.cp2x, cp.cp2y, x, y);
      }
    }

    ctx.lineTo(width, lastY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw points
    sortedPoints.forEach((point) => {
      const x = point.time * pixelsPerBeat;
      const y = (1 - point.value) * height;
      const isSelected = selectedPointIds.has(point.id);
      const isHovered = hoveredPointId === point.id;

      // Point glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = `${color}40`;
        ctx.fill();
      }

      // Point circle
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 7 : (isHovered ? 6 : 5), 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#fff' : color;
      ctx.fill();

      // Point border
      ctx.strokeStyle = isSelected ? color : '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw bezier handles for selected points (if not step curve)
      if (isSelected && sortedPoints.indexOf(point) > 0) {
        const prevPoint = sortedPoints[sortedPoints.indexOf(point) - 1];
        if (point.curve !== 'step' && point.curve !== 'linear') {
          const cp = getBezierControlPoints(prevPoint, point);

          // Handle lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(prevPoint.time * pixelsPerBeat, (1 - prevPoint.value) * height);
          ctx.lineTo(cp.cp1x, cp.cp1y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(cp.cp2x, cp.cp2y);
          ctx.stroke();

          // Handle dots
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(cp.cp1x, cp.cp1y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cp.cp2x, cp.cp2y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Draw hover position indicator
    if (hoverPosition && !isDragging) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverPosition.x, 0);
      ctx.lineTo(hoverPosition.x, height);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hoverPosition.y);
      ctx.lineTo(width, hoverPosition.y);
      ctx.stroke();

      ctx.setLineDash([]);
    }

  }, [localPoints, project, color, height, pixelsPerBeat, selectedPointIds, hoveredPointId, hoverPosition, isDragging]);

  // Find point at position
  const findPointAt = useCallback((x: number, y: number): AutomationPoint | null => {
    return localPoints.find((p) => {
      const px = p.time * pixelsPerBeat;
      const py = (1 - p.value) * height;
      return Math.abs(px - x) < 10 && Math.abs(py - y) < 10;
    }) || null;
  }, [localPoints, pixelsPerBeat, height]);

  // Handle mouse move for hover
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || isDragging) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const point = findPointAt(x, y);
    setHoveredPointId(point?.id || null);

    const time = x / pixelsPerBeat;
    const value = Math.max(0, Math.min(1, 1 - (y / height)));
    setHoverPosition({ x, y, value });
  }, [findPointAt, pixelsPerBeat, height, isDragging]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPointId(null);
    setHoverPosition(null);
  }, []);

  // Handle click to add/select point
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !project) return;
    if (contextMenu) {
      setContextMenu(null);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedPoint = findPointAt(x, y);

    if (clickedPoint) {
      // Select/deselect point
      if (e.shiftKey) {
        // Toggle selection
        setSelectedPointIds(prev => {
          const next = new Set(prev);
          if (next.has(clickedPoint.id)) {
            next.delete(clickedPoint.id);
          } else {
            next.add(clickedPoint.id);
          }
          return next;
        });
      } else {
        setSelectedPointIds(new Set([clickedPoint.id]));
      }
    } else if (view.activeTool === 'pencil' || view.activeTool === 'automation' || view.activeTool === 'pointer') {
      // Add new point
      let time = x / pixelsPerBeat;
      time = snapToGrid(time);
      const value = Math.max(0, Math.min(1, 1 - (y / height)));

      addAutomationPoint(trackId, laneId, Math.max(0, time), value);
      setSelectedPointIds(new Set()); // Clear selection
    }
  }, [project, view.activeTool, pixelsPerBeat, height, trackId, laneId, addAutomationPoint, findPointAt, snapToGrid, contextMenu]);

  // Handle right-click for context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedPoint = findPointAt(x, y);
    if (clickedPoint) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        pointId: clickedPoint.id,
      });
    }
  }, [findPointAt]);

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedPoint = findPointAt(x, y);
    if (clickedPoint) {
      setDragPointId(clickedPoint.id);
      setIsDragging(true);
      if (!selectedPointIds.has(clickedPoint.id)) {
        setSelectedPointIds(new Set([clickedPoint.id]));
      }
    }
  }, [findPointAt, selectedPointIds]);

  // Handle drag
  useEffect(() => {
    if (!isDragging || !dragPointId) return;

    let lastTime = 0;
    let lastValue = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let time = Math.max(0, x / pixelsPerBeat);
      if (e.shiftKey) {
        // Snap to grid when holding shift
        time = snapToGrid(time);
      }
      const value = Math.max(0, Math.min(1, 1 - (y / height)));

      lastTime = time;
      lastValue = value;

      // Update local state for smooth visual feedback
      setLocalPoints(prev =>
        prev.map(p =>
          p.id === dragPointId ? { ...p, time, value } : p
        )
      );
    };

    const handleMouseUp = () => {
      // Persist final position to store
      if (dragPointId) {
        updateAutomationPoint(trackId, laneId, dragPointId, lastTime, lastValue);
      }
      setIsDragging(false);
      setDragPointId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragPointId, pixelsPerBeat, height, trackId, laneId, updateAutomationPoint, snapToGrid]);

  // Handle double-click to delete point
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedPoint = findPointAt(x, y);
    if (clickedPoint) {
      deleteAutomationPoint(trackId, laneId, clickedPoint.id);
      setSelectedPointIds(prev => {
        const next = new Set(prev);
        next.delete(clickedPoint.id);
        return next;
      });
    }
  }, [findPointAt, trackId, laneId, deleteAutomationPoint]);

  // Handle curve type change from context menu
  const handleCurveTypeChange = useCallback((curveType: CurveType) => {
    if (!contextMenu) return;
    setAutomationPointCurve(trackId, laneId, contextMenu.pointId, curveType);
    setContextMenu(null);
  }, [trackId, laneId, contextMenu, setAutomationPointCurve]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPointIds.size === 0) return;

      // Delete selected points
      if (e.key === 'Delete' || e.key === 'Backspace') {
        selectedPointIds.forEach(id => {
          deleteAutomationPoint(trackId, laneId, id);
        });
        setSelectedPointIds(new Set());
      }

      // Select all (Cmd+A)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedPointIds(new Set(localPoints.map(p => p.id)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPointIds, localPoints, trackId, laneId, deleteAutomationPoint]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  return (
    <div
      ref={containerRef}
      className="relative cursor-crosshair select-none"
      style={{ height }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Parameter label */}
      <div className="absolute top-1 left-2 flex items-center gap-2 pointer-events-none">
        <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded font-medium">
          {getParameterLabel(parameter)}
        </span>
        {hoverPosition && (
          <span className="text-[9px] text-white/70 bg-black/40 px-1 py-0.5 rounded">
            {getParameterDisplay(parameter, hoverPosition.value)}
          </span>
        )}
      </div>

      {/* Point count indicator */}
      <div className="absolute top-1 right-2 text-[9px] text-white/40 pointer-events-none">
        {localPoints.length} pts
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#2c2c2e] border border-[#4a4a4c] rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] text-[#98989d] font-medium uppercase tracking-wide">
            Curve Type
          </div>
          {(['linear', 's-curve', 'exponential', 'logarithmic', 'step'] as CurveType[]).map((type) => (
            <button
              key={type}
              className="w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#0a84ff] transition-colors flex items-center gap-2"
              onClick={() => handleCurveTypeChange(type)}
            >
              <span className="w-4 text-center">
                {localPoints.find(p => p.id === contextMenu.pointId)?.curve === type && '✓'}
              </span>
              <span className="capitalize">{type.replace('-', ' ')}</span>
            </button>
          ))}
          <div className="border-t border-[#4a4a4c] my-1" />
          <button
            className="w-full px-3 py-1.5 text-left text-xs text-[#ff453a] hover:bg-[#ff453a]/20 transition-colors flex items-center gap-2"
            onClick={() => {
              deleteAutomationPoint(trackId, laneId, contextMenu.pointId);
              setContextMenu(null);
            }}
          >
            <span className="w-4 text-center">✕</span>
            Delete Point
          </button>
        </div>
      )}

      {/* Selection info */}
      {selectedPointIds.size > 1 && (
        <div className="absolute bottom-1 left-2 text-[9px] text-white/50 bg-black/40 px-1 py-0.5 rounded pointer-events-none">
          {selectedPointIds.size} selected
        </div>
      )}
    </div>
  );
}
