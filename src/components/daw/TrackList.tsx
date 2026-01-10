/**
 * DAW Track List - Track headers with controls
 */

import { useState } from 'react';
import { useDAWStore } from '../../store/dawStore';
import type { DAWTrack, AutomationParameter } from '../../types/daw';
import { TRACK_COLORS } from '../../types/daw';
import { AutomationLane } from './AutomationLane';

// Folder Track Header Component - Logic Pro style Track Stack
function FolderTrackHeader({ track, childTracks }: { track: DAWTrack; childTracks: DAWTrack[] }) {
  const {
    view,
    selectTrack,
    setTrackName,
    setTrackColor,
    setTrackVolume,
    toggleFolderCollapsed,
    toggleTrackMute,
    toggleTrackSolo,
    deleteTrack,
    ungroupFolder,
    moveTracksToFolder,
    setStackType,
  } = useDAWStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isSelected = view.selectedTrackIds.includes(track.id);
  const isCollapsed = track.isCollapsed ?? false;
  const stackType = track.stackType ?? 'folder';
  const isSummingStack = stackType === 'summing';

  // Calculate combined mute/solo state from children
  const allChildrenMuted = childTracks.length > 0 && childTracks.every(t => t.muted);
  const someChildrenMuted = childTracks.some(t => t.muted);
  const allChildrenSoloed = childTracks.length > 0 && childTracks.every(t => t.solo);
  const someChildrenSoloed = childTracks.some(t => t.solo);

  const handleMuteAll = () => {
    const newMuteState = !allChildrenMuted;
    childTracks.forEach(child => {
      if (child.muted !== newMuteState) {
        toggleTrackMute(child.id);
      }
    });
  };

  const handleSoloAll = () => {
    const newSoloState = !allChildrenSoloed;
    childTracks.forEach(child => {
      if (child.solo !== newSoloState) {
        toggleTrackSolo(child.id);
      }
    });
  };

  return (
    <div
      className={`relative border-b border-[#3a3a3c] cursor-pointer transition-colors ${
        isSelected ? 'bg-[#3a3a3c]' : 'hover:bg-[#323234]'
      }`}
      onClick={(e) => selectTrack(track.id, e.metaKey || e.ctrlKey || e.shiftKey)}
      style={{
        backgroundColor: isSelected ? undefined : '#2a2a2c',
        height: isCollapsed ? 32 : 56, // Taller when expanded
        borderLeft: `3px solid ${track.color}`,
      }}
    >
      {/* Top Row - Collapse button, icon, name */}
      <div className="flex items-center px-2 h-8">
        {/* Collapse/Expand Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFolderCollapsed(track.id);
          }}
          className="w-5 h-5 flex items-center justify-center text-[#98989d] hover:text-white mr-1"
        >
          <svg
            className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        {/* Stack Type Icon */}
        <div
          className="w-5 h-5 mr-2 flex items-center justify-center rounded"
          style={{ backgroundColor: track.color + '40' }}
        >
          {isSummingStack ? (
            // Summing stack icon (audio summing)
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={track.color}>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
              <path d="M7 12h4V7h2v5h4v2h-4v5h-2v-5H7z"/>
            </svg>
          ) : (
            // Folder stack icon
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={track.color}>
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          )}
        </div>

        {/* Folder Name */}
        {isEditing ? (
          <input
            type="text"
            value={track.name}
            onChange={(e) => setTrackName(track.id, e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="flex-1 bg-[#1c1c1e] text-white text-xs px-1 py-0.5 rounded focus:outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs text-white font-medium truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {track.name}
            <span className="text-[#98989d] ml-1.5 font-normal text-[10px]">
              {childTracks.length} {isSummingStack ? '∑' : ''}
            </span>
          </span>
        )}

        {/* Mute All */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMuteAll();
          }}
          className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded transition-colors mr-1 ${
            allChildrenMuted
              ? 'bg-[#ff9500] text-white'
              : someChildrenMuted
              ? 'bg-[#ff9500]/50 text-white'
              : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
          }`}
          title="Mute All"
        >
          M
        </button>

        {/* Solo All */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSoloAll();
          }}
          className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded transition-colors mr-1 ${
            allChildrenSoloed
              ? 'bg-[#ffd60a] text-black'
              : someChildrenSoloed
              ? 'bg-[#ffd60a]/50 text-black'
              : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
          }`}
          title="Solo All"
        >
          S
        </button>

        {/* Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="w-5 h-5 flex items-center justify-center text-[#98989d] hover:text-white rounded hover:bg-[#3a3a3c]"
        >
          •••
        </button>
      </div>

      {/* Bottom Row - Volume/controls (shown when expanded) */}
      {!isCollapsed && (
        <div className="flex items-center px-2 h-6 gap-2">
          {/* Stack Type Toggle */}
          <div className="flex items-center bg-[#1c1c1e] rounded p-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStackType?.(track.id, 'folder');
              }}
              className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                !isSummingStack
                  ? 'bg-[#8b5cf6] text-white'
                  : 'text-[#98989d] hover:text-white'
              }`}
              title="Folder Stack - Groups tracks visually"
            >
              Folder
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStackType?.(track.id, 'summing');
              }}
              className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                isSummingStack
                  ? 'bg-[#30d158] text-white'
                  : 'text-[#98989d] hover:text-white'
              }`}
              title="Summing Stack - Routes audio through stack"
            >
              Sum
            </button>
          </div>

          {/* Volume Control (only for summing stacks) */}
          {isSummingStack && (
            <div className="flex-1 flex items-center gap-1">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={track.volume}
                onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 h-1 accent-[#30d158]"
              />
              <span className="text-[9px] text-[#98989d] w-6 text-right font-mono">
                {Math.round(track.volume * 100)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-2 top-8 z-50 bg-[#2c2c2e] border border-[#3a3a3c] rounded-lg shadow-xl py-1 min-w-44">
            {/* Stack Type Section */}
            <div className="px-3 py-1.5 text-[10px] text-[#98989d] uppercase tracking-wider">
              Stack Type
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStackType?.(track.id, 'folder');
              }}
              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#3a3a3c] flex items-center gap-2 ${
                !isSummingStack ? 'text-[#8b5cf6]' : 'text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
              Folder Stack
              {!isSummingStack && <span className="ml-auto">✓</span>}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStackType?.(track.id, 'summing');
              }}
              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#3a3a3c] flex items-center gap-2 ${
                isSummingStack ? 'text-[#30d158]' : 'text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                <path d="M7 12h4V7h2v5h4v2h-4v5h-2v-5H7z"/>
              </svg>
              Summing Stack
              {isSummingStack && <span className="ml-auto">✓</span>}
            </button>

            <div className="h-px bg-[#3a3a3c] my-1" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#3a3a3c] flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded" style={{ backgroundColor: track.color }} />
              Change Color
            </button>
            {showColorPicker && (
              <div className="px-3 py-2 grid grid-cols-6 gap-1">
                {TRACK_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackColor(track.id, color);
                      setShowColorPicker(false);
                      setShowMenu(false);
                    }}
                    className={`w-5 h-5 rounded hover:scale-110 transition-transform ${
                      color === track.color ? 'ring-2 ring-white ring-offset-1 ring-offset-[#2c2c2e]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
            <div className="h-px bg-[#3a3a3c] my-1" />
            <button
              onClick={() => {
                ungroupFolder(track.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-[#ff9500] hover:bg-[#3a3a3c]"
            >
              Ungroup Stack
            </button>
            <button
              onClick={() => {
                deleteTrack(track.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-[#ff453a] hover:bg-[#3a3a3c]"
            >
              Delete Stack & Tracks
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TrackHeader({ track, isInFolder = false }: { track: DAWTrack; isInFolder?: boolean }) {
  const {
    view,
    selectTrack,
    setTrackName,
    setTrackColor,
    setTrackVolume,
    toggleTrackMute,
    toggleTrackSolo,
    toggleTrackArm,
    toggleTrackAutomation,
    deleteTrack,
    duplicateTrack,
    openEditor,
    freezeTrack,
    unfreezeTrack,
    bounceTrack,
    project,
  } = useDAWStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isSelected = view.selectedTrackIds.includes(track.id);

  const getTrackIcon = () => {
    switch (track.type) {
      case 'audio':
        // Waveform icon for audio tracks
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        );
      case 'software-instrument':
      case 'midi':
        // Piano/keyboard icon for MIDI/instrument tracks
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 15H3V5h3v7h2V5h2v7h2V5h2v7h2V5h3v13h-9z" />
          </svg>
        );
      case 'drummer':
        // Drum icon for drummer tracks
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 4.69 2 8v8c0 3.31 4.48 6 10 6s10-2.69 10-6V8c0-3.31-4.48-6-10-6zm0 14c-4.41 0-8-1.79-8-4V9.89c1.75 1.3 4.66 2.11 8 2.11s6.25-.81 8-2.11V12c0 2.21-3.59 4-8 4z"/>
            <circle cx="8" cy="10" r="1.5"/>
            <circle cx="16" cy="10" r="1.5"/>
            <circle cx="12" cy="8" r="2"/>
          </svg>
        );
      case 'bus':
        // Bus/send icon
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 11v2h12v2l4-3-4-3v2H4zm16-7H8c-1.1 0-2 .9-2 2v3h2V6h12v12H8v-3H6v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
          </svg>
        );
      case 'master':
        // Master fader icon
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
          </svg>
        );
      default:
        // Generic track icon
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`relative h-20 border-b border-[#3a3a3c] flex flex-col py-1 cursor-pointer transition-colors ${
        isSelected ? 'bg-[#3a3a3c]' : 'hover:bg-[#323234]'
      } ${track.frozen ? 'opacity-75' : ''}`}
      onClick={(e) => selectTrack(track.id, e.metaKey || e.ctrlKey || e.shiftKey)}
      onDoubleClick={() => {
        const firstRegion = track.regions[0];
        if (firstRegion) {
          openEditor(track.id, firstRegion);
        }
      }}
      style={{ height: track.height, paddingLeft: isInFolder ? 24 : 8 }}
    >
      {/* Track Name Row */}
      <div className="flex items-center gap-2 mb-1 pr-2">
        {isInFolder && (
          <div className="w-1 h-full absolute left-2 top-0 bg-[#8b5cf6]/30 rounded" />
        )}
        <div
          className="w-3 h-3 rounded"
          style={{ backgroundColor: track.color }}
        />
        <span style={{ color: track.color }}>{getTrackIcon()}</span>
        {isEditing ? (
          <input
            type="text"
            value={track.name}
            onChange={(e) => setTrackName(track.id, e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="flex-1 bg-[#2c2c2e] text-white text-xs px-1 py-0.5 rounded focus:outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs text-white truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {track.name}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="w-5 h-5 flex items-center justify-center text-[#98989d] hover:text-white rounded hover:bg-[#3a3a3c]"
        >
          •••
        </button>
      </div>

      {/* Track Controls Row */}
      <div className="flex items-center gap-1">
        {/* Mute */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTrackMute(track.id);
          }}
          className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-colors ${
            track.muted
              ? 'bg-[#ff9500] text-white'
              : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
          }`}
          title="Mute"
        >
          M
        </button>

        {/* Solo */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTrackSolo(track.id);
          }}
          className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-colors ${
            track.solo
              ? 'bg-[#ffd60a] text-black'
              : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
          }`}
          title="Solo"
        >
          S
        </button>

        {/* Record Arm */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTrackArm(track.id);
          }}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
            track.armed
              ? 'bg-[#ff453a] text-white'
              : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
          }`}
          title="Record"
        >
          <div className={`w-2 h-2 rounded-full ${track.armed ? 'bg-current animate-pulse' : 'border border-current'}`} />
        </button>

        {/* Automation Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTrackAutomation(track.id);
          }}
          className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-colors ${
            track.showAutomation
              ? 'bg-[#bf5af2] text-white'
              : 'text-[#98989d] hover:text-white hover:bg-[#3a3a3c]'
          }`}
          title="Automation"
        >
          A
        </button>

        {/* Volume Slider */}
        <div className="flex-1 flex items-center gap-1">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.volume}
            onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 h-1 accent-[#0a84ff]"
          />
          <span className="text-[10px] text-[#98989d] w-8 text-right font-mono">
            {Math.round(track.volume * 100)}
          </span>
        </div>
      </div>

      {/* Freeze Indicator */}
      {track.frozen && (
        <div className="absolute inset-0 bg-[#5ac8fa]/10 pointer-events-none flex items-center justify-center">
          <div className="flex items-center gap-1 bg-[#5ac8fa] text-white text-[10px] px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z"/>
            </svg>
            Frozen
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-2 top-8 z-50 bg-[#2c2c2e] border border-[#3a3a3c] rounded-lg shadow-xl py-1 min-w-40">
            <button
              onClick={() => {
                duplicateTrack(track.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#3a3a3c]"
            >
              Duplicate Track
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-white hover:bg-[#3a3a3c] flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded" style={{ backgroundColor: track.color }} />
              Change Color
            </button>
            {showColorPicker && (
              <div className="px-3 py-2 grid grid-cols-6 gap-1">
                {TRACK_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackColor(track.id, color);
                      setShowColorPicker(false);
                      setShowMenu(false);
                    }}
                    className={`w-5 h-5 rounded hover:scale-110 transition-transform ${
                      color === track.color ? 'ring-2 ring-white ring-offset-1 ring-offset-[#2c2c2e]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
            <div className="h-px bg-[#3a3a3c] my-1" />
            {track.frozen ? (
              <button
                onClick={() => {
                  unfreezeTrack(track.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#5ac8fa] hover:bg-[#3a3a3c] flex items-center gap-2"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z"/>
                </svg>
                Unfreeze Track
              </button>
            ) : (
              <button
                onClick={() => {
                  freezeTrack(track.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-[#5ac8fa] hover:bg-[#3a3a3c] flex items-center gap-2"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z"/>
                </svg>
                Freeze Track
              </button>
            )}
            <button
              onClick={() => {
                bounceTrack(track.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-[#30d158] hover:bg-[#3a3a3c] flex items-center gap-2"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Bounce in Place
            </button>
            <div className="h-px bg-[#3a3a3c] my-1" />
            <button
              onClick={() => {
                deleteTrack(track.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-[#ff453a] hover:bg-[#3a3a3c]"
            >
              Delete Track
            </button>
          </div>
        </>
      )}

      {/* Automation Lanes */}
      {track.showAutomation && track.automationLanes.length > 0 && (
        <div className="border-t border-[#3a3a3c] mt-1">
          {track.automationLanes.map((lane) => (
            <div key={lane.id} className="flex items-center gap-2 px-2 py-1">
              <span className="text-[10px] text-[#98989d] w-12 truncate">{lane.parameter}</span>
              <div className="flex-1 h-4 bg-[#1c1c1e] rounded overflow-hidden">
                {/* Mini automation preview */}
                <svg className="w-full h-full" viewBox="0 0 100 16" preserveAspectRatio="none">
                  <path
                    d={`M0,${8 + (lane.points[0]?.value ?? 0.5) * -6} ${lane.points.map((p, i) =>
                      `L${(p.time / 16) * 100},${8 + (1 - p.value) * 6}`
                    ).join(' ')} L100,${8 + (1 - (lane.points[lane.points.length - 1]?.value ?? 0.5)) * 6}`}
                    fill="none"
                    stroke={track.color}
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TrackList() {
  const { project, addTrack, createFolderTrack, groupSelectedTracksIntoFolder, view } = useDAWStore();
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (!project) return null;

  // Group tracks by folder - get folder tracks and their children
  const folderTracks = project.tracks.filter(t => t.type === 'folder');
  const tracksInFolders = new Set(project.tracks.filter(t => t.groupId).map(t => t.id));
  const topLevelTracks = project.tracks.filter(t => !t.groupId && t.type !== 'folder');

  // Build the render list with proper ordering
  const renderList: { track: DAWTrack; isInFolder: boolean; isVisible: boolean; childTracks?: DAWTrack[] }[] = [];

  project.tracks.forEach(track => {
    if (track.type === 'folder') {
      // Find all children of this folder
      const childTracks = project.tracks.filter(t => t.groupId === track.id);
      renderList.push({ track, isInFolder: false, isVisible: true, childTracks });

      // Add child tracks (only if folder is not collapsed)
      if (!track.isCollapsed) {
        childTracks.forEach(childTrack => {
          renderList.push({ track: childTrack, isInFolder: true, isVisible: true });
        });
      }
    } else if (!track.groupId) {
      // Top-level track (not in a folder)
      renderList.push({ track, isInFolder: false, isVisible: true });
    }
    // Skip tracks that are in a folder - they're handled above
  });

  const selectedCount = view.selectedTrackIds.length;
  const canGroupToFolder = selectedCount >= 2;

  return (
    <div className="flex-1 overflow-y-auto">
      {renderList.map(({ track, isInFolder, childTracks }) => {
        if (track.type === 'folder') {
          return (
            <FolderTrackHeader
              key={track.id}
              track={track}
              childTracks={childTracks || []}
            />
          );
        }
        return (
          <TrackHeader key={track.id} track={track} isInFolder={isInFolder} />
        );
      })}

      {/* Add Track Button */}
      <div className="p-2 space-y-1">
        {/* Group to Folder Button (when multiple tracks selected) */}
        {canGroupToFolder && (
          <button
            onClick={() => groupSelectedTracksIntoFolder()}
            className="w-full h-8 flex items-center justify-center gap-2 text-[#8b5cf6] hover:text-white border border-[#8b5cf6] hover:bg-[#8b5cf6] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
            <span className="text-xs">Group {selectedCount} Tracks to Folder</span>
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={`w-full h-8 flex items-center justify-center gap-2 text-[#98989d] hover:text-white border border-dashed rounded-lg transition-colors ${
              showAddMenu ? 'border-[#0a84ff] text-white' : 'border-[#3a3a3c] hover:border-[#98989d]'
            }`}
          >
            <span className="text-lg">+</span>
            <span className="text-xs">Add Track</span>
          </button>
          {showAddMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAddMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-50 bg-[#2c2c2e] border border-[#3a3a3c] rounded-lg shadow-xl py-1 min-w-40">
                <button
                  onClick={() => {
                    addTrack('audio');
                    setShowAddMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-[#3a3a3c] flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[#30d158]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  Audio Track
                </button>
                <button
                  onClick={() => {
                    addTrack('software-instrument');
                    setShowAddMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-[#3a3a3c] flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[#0a84ff]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                  </svg>
                  Software Instrument
                </button>
                <button
                  onClick={() => {
                    addTrack('drummer');
                    setShowAddMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-[#3a3a3c] flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[#ff9500]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 11h3v1H2zm3.17-3.66.59 1.28 1.28-.6-.59-1.27zm4.66-2.37-.59 1.28 1.28.6.59-1.28zM12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z" />
                  </svg>
                  Drummer
                </button>
                <button
                  onClick={() => {
                    addTrack('midi');
                    setShowAddMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-[#3a3a3c] flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[#bf5af2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 15H3V5h3v7h2V5h2v7h2V5h2v7h2V5h3v13h-9z" />
                  </svg>
                  External MIDI
                </button>
                <div className="h-px bg-[#3a3a3c] my-1" />
                <button
                  onClick={() => {
                    createFolderTrack();
                    setShowAddMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-[#3a3a3c] flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[#8b5cf6]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                  Folder Track
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
