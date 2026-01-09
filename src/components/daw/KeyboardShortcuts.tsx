/**
 * Keyboard Shortcuts Overlay - Logic Pro style command display
 */

import { useState, useEffect } from 'react';
import { useDAWStore } from '../../store/dawStore';

interface ShortcutCategory {
  name: string;
  shortcuts: {
    key: string;
    description: string;
    modifiers?: string[];
  }[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    name: 'Transport',
    shortcuts: [
      { key: 'Space', description: 'Play / Pause' },
      { key: 'Enter', description: 'Stop & Go to Start' },
      { key: 'R', description: 'Toggle Recording' },
      { key: 'M', description: 'Toggle Metronome' },
      { key: 'L', description: 'Toggle Loop' },
      { key: ',', description: 'Previous Bar' },
      { key: '.', description: 'Next Bar' },
      { key: 'Left', description: 'Nudge Back 1 Beat' },
      { key: 'Right', description: 'Nudge Forward 1 Beat' },
      { key: 'Home', description: 'Go to Start' },
      { key: 'End', description: 'Go to End' },
    ],
  },
  {
    name: 'Tools',
    shortcuts: [
      { key: 'T', description: 'Pointer Tool' },
      { key: 'P', description: 'Pencil Tool' },
      { key: 'S', description: 'Scissors Tool' },
      { key: 'G', description: 'Glue Tool' },
      { key: 'E', description: 'Eraser Tool' },
      { key: 'Z', description: 'Zoom Tool' },
      { key: 'U', description: 'Mute Tool' },
      { key: 'A', description: 'Automation Tool' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { key: 'A', modifiers: ['Cmd'], description: 'Select All' },
      { key: 'D', modifiers: ['Cmd'], description: 'Duplicate' },
      { key: 'C', modifiers: ['Cmd'], description: 'Copy' },
      { key: 'V', modifiers: ['Cmd'], description: 'Paste' },
      { key: 'X', modifiers: ['Cmd'], description: 'Cut' },
      { key: 'Z', modifiers: ['Cmd'], description: 'Undo' },
      { key: 'Z', modifiers: ['Cmd', 'Shift'], description: 'Redo' },
      { key: 'Delete', description: 'Delete Selected' },
      { key: 'Escape', description: 'Clear Selection' },
    ],
  },
  {
    name: 'Navigation',
    shortcuts: [
      { key: '+', modifiers: ['Cmd'], description: 'Zoom In' },
      { key: '-', modifiers: ['Cmd'], description: 'Zoom Out' },
      { key: '0', modifiers: ['Cmd'], description: 'Fit to Window' },
      { key: 'Arrow Keys', description: 'Navigate' },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { key: 'Y', description: 'Toggle Library' },
      { key: 'I', description: 'Toggle Inspector' },
      { key: 'X', description: 'Toggle Mixer' },
      { key: 'B', description: 'Toggle Smart Controls' },
    ],
  },
  {
    name: 'Tracks',
    shortcuts: [
      { key: 'N', modifiers: ['Cmd', 'Option'], description: 'New Track' },
      { key: 'Backspace', modifiers: ['Cmd'], description: 'Delete Track' },
      { key: 'Up/Down', description: 'Select Track' },
    ],
  },
];

function ShortcutKey({ keyName, modifiers }: { keyName: string; modifiers?: string[] }) {
  const renderKey = (k: string) => {
    // Replace common key names with symbols
    const keyMap: Record<string, string> = {
      'Cmd': '⌘',
      'Option': '⌥',
      'Alt': '⌥',
      'Shift': '⇧',
      'Ctrl': '⌃',
      'Enter': '↵',
      'Space': '␣',
      'Delete': '⌫',
      'Backspace': '⌫',
      'Escape': 'esc',
      'Tab': '⇥',
      'Up': '↑',
      'Down': '↓',
      'Left': '←',
      'Right': '→',
    };
    return keyMap[k] || k;
  };

  return (
    <div className="flex items-center gap-1">
      {modifiers?.map((mod, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 bg-[#3a3a3c] rounded text-xs font-medium text-white"
        >
          {renderKey(mod)}
        </span>
      ))}
      <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 bg-[#3a3a3c] rounded text-xs font-medium text-white">
        {renderKey(keyName)}
      </span>
    </div>
  );
}

export function KeyboardShortcuts() {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Listen for ? key to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show with ? or Cmd+K
      if (e.key === '?' || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        setIsVisible(true);
      }
      // Close with Escape
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (!isVisible) return null;

  // Filter shortcuts based on search
  const filteredCategories = SHORTCUT_CATEGORIES.map(category => ({
    ...category,
    shortcuts: category.shortcuts.filter(
      s => s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.key.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(c => c.shortcuts.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setIsVisible(false)}
    >
      <div
        className="w-[700px] max-h-[80vh] bg-[#2c2c2e] rounded-xl shadow-2xl overflow-hidden border border-[#3a3a3c]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#3a3a3c]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="w-6 h-6 flex items-center justify-center text-[#98989d] hover:text-white rounded hover:bg-[#3a3a3c]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98989d]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full h-9 pl-10 pr-4 bg-[#1c1c1e] text-white text-sm rounded-lg border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff]"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          <div className="grid grid-cols-2 gap-6">
            {filteredCategories.map((category) => (
              <div key={category.name}>
                <h3 className="text-xs uppercase tracking-wider text-[#0a84ff] font-semibold mb-3">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#3a3a3c]"
                    >
                      <span className="text-sm text-[#98989d]">{shortcut.description}</span>
                      <ShortcutKey keyName={shortcut.key} modifiers={shortcut.modifiers} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#3a3a3c] flex items-center justify-center gap-4 text-[10px] text-[#98989d]">
          <span>Press <ShortcutKey keyName="?" /> to toggle</span>
          <span>Press <ShortcutKey keyName="Escape" /> to close</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Shortcuts Bar - Shows current modifier keys
 */
export function QuickShortcutsBar() {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newKeys = new Set(pressedKeys);
      if (e.metaKey) newKeys.add('Cmd');
      if (e.altKey) newKeys.add('Option');
      if (e.shiftKey) newKeys.add('Shift');
      if (e.ctrlKey) newKeys.add('Ctrl');
      setPressedKeys(newKeys);
    };

    const handleKeyUp = () => {
      setPressedKeys(new Set());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pressedKeys]);

  if (pressedKeys.size === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#2c2c2e]/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-xl border border-[#3a3a3c]">
      <div className="flex items-center gap-2">
        {Array.from(pressedKeys).map((key) => (
          <span
            key={key}
            className="inline-flex items-center justify-center min-w-8 h-8 px-2 bg-[#0a84ff] rounded text-sm font-medium text-white"
          >
            {key === 'Cmd' ? '⌘' : key === 'Option' ? '⌥' : key === 'Shift' ? '⇧' : key}
          </span>
        ))}
      </div>
    </div>
  );
}
