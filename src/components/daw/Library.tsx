/**
 * DAW Library Panel - Instruments, loops, samples browser
 */

import { useState, useRef, useCallback } from 'react';
import { useDAWStore, dawAudioEngine } from '../../store/dawStore';
import { BUILT_IN_PLUGINS, BUILT_IN_INSTRUMENTS } from '../../audio/DAWAudioEngine';
import { LoopBrowser } from './LoopBrowser';

type LibraryTab = 'instruments' | 'effects' | 'loops' | 'samples';

const LOOP_CATEGORIES = [
  { id: 'drums', name: 'Drums', count: 128 },
  { id: 'bass', name: 'Bass', count: 64 },
  { id: 'synth', name: 'Synths', count: 96 },
  { id: 'guitar', name: 'Guitar', count: 48 },
  { id: 'keys', name: 'Keys', count: 72 },
  { id: 'vocals', name: 'Vocals', count: 32 },
  { id: 'fx', name: 'FX', count: 56 },
];

// Individual samples that can be dragged to tracks
interface Sample {
  id: string;
  name: string;
  category: 'kick' | 'snare' | 'hihat' | 'clap' | 'perc' | 'crash' | 'openhat' | 'ride' | 'shaker' | 'cowbell';
  url: string;
  duration: number; // in beats at 120 BPM
}

const AVAILABLE_SAMPLES: Sample[] = [
  // Kicks
  { id: 'kick-808', name: 'Kick 808', category: 'kick', url: '/samples/kick-808.mp3', duration: 1 },
  { id: 'kick-acoustic01', name: 'Kick Acoustic', category: 'kick', url: '/samples/kick-acoustic01.mp3', duration: 1 },
  { id: 'kick-deep', name: 'Kick Deep', category: 'kick', url: '/samples/kick-deep.mp3', duration: 1 },
  { id: 'kick-heavy', name: 'Kick Heavy', category: 'kick', url: '/samples/kick-heavy.mp3', duration: 1 },
  { id: 'kick-electro01', name: 'Kick Electro', category: 'kick', url: '/samples/kick-electro01.mp3', duration: 1 },
  { id: 'kick-vinyl01', name: 'Kick Vinyl', category: 'kick', url: '/samples/kick-vinyl01.mp3', duration: 1 },
  // Snares
  { id: 'snare-808', name: 'Snare 808', category: 'snare', url: '/samples/snare-808.mp3', duration: 1 },
  { id: 'snare-acoustic01', name: 'Snare Acoustic', category: 'snare', url: '/samples/snare-acoustic01.mp3', duration: 1 },
  { id: 'snare-analog', name: 'Snare Analog', category: 'snare', url: '/samples/snare-analog.mp3', duration: 1 },
  { id: 'snare-big', name: 'Snare Big', category: 'snare', url: '/samples/snare-big.mp3', duration: 1 },
  { id: 'snare-brute', name: 'Snare Brute', category: 'snare', url: '/samples/snare-brute.mp3', duration: 1 },
  // Hi-hats
  { id: 'hihat-808', name: 'Hi-hat 808', category: 'hihat', url: '/samples/hihat-808.mp3', duration: 0.25 },
  { id: 'hihat-acoustic01', name: 'Hi-hat Acoustic', category: 'hihat', url: '/samples/hihat-acoustic01.mp3', duration: 0.25 },
  { id: 'hihat-analog', name: 'Hi-hat Analog', category: 'hihat', url: '/samples/hihat-analog.mp3', duration: 0.25 },
  { id: 'hihat-digital', name: 'Hi-hat Digital', category: 'hihat', url: '/samples/hihat-digital.mp3', duration: 0.25 },
  { id: 'hihat-electro', name: 'Hi-hat Electro', category: 'hihat', url: '/samples/hihat-electro.mp3', duration: 0.25 },
  // Open hats
  { id: 'openhat-808', name: 'Open Hat 808', category: 'openhat', url: '/samples/openhat-808.mp3', duration: 0.5 },
  { id: 'openhat-acoustic01', name: 'Open Hat Acoustic', category: 'openhat', url: '/samples/openhat-acoustic01.mp3', duration: 0.5 },
  { id: 'openhat-analog', name: 'Open Hat Analog', category: 'openhat', url: '/samples/openhat-analog.mp3', duration: 0.5 },
  // Claps
  { id: 'clap-808', name: 'Clap 808', category: 'clap', url: '/samples/clap-808.mp3', duration: 0.5 },
  { id: 'clap-analog', name: 'Clap Analog', category: 'clap', url: '/samples/clap-analog.mp3', duration: 0.5 },
  { id: 'clap-fat', name: 'Clap Fat', category: 'clap', url: '/samples/clap-fat.mp3', duration: 0.5 },
  { id: 'clap-tape', name: 'Clap Tape', category: 'clap', url: '/samples/clap-tape.mp3', duration: 0.5 },
  // Percussion
  { id: 'perc-808', name: 'Perc 808', category: 'perc', url: '/samples/perc-808.mp3', duration: 0.25 },
  { id: 'perc-tambo', name: 'Tambourine', category: 'perc', url: '/samples/perc-tambo.mp3', duration: 0.25 },
  { id: 'perc-tribal', name: 'Tribal Perc', category: 'perc', url: '/samples/perc-tribal.mp3', duration: 0.5 },
  { id: 'perc-metal', name: 'Metal Perc', category: 'perc', url: '/samples/perc-metal.mp3', duration: 0.25 },
  // Crashes
  { id: 'crash-808', name: 'Crash 808', category: 'crash', url: '/samples/crash-808.mp3', duration: 2 },
  { id: 'crash-acoustic', name: 'Crash Acoustic', category: 'crash', url: '/samples/crash-acoustic.mp3', duration: 2 },
  // Rides
  { id: 'ride-acoustic01', name: 'Ride Acoustic', category: 'ride', url: '/samples/ride-acoustic01.mp3', duration: 0.5 },
  // Shakers
  { id: 'shaker-analog', name: 'Shaker Analog', category: 'shaker', url: '/samples/shaker-analog.mp3', duration: 0.25 },
  { id: 'shaker-shuffle', name: 'Shaker Shuffle', category: 'shaker', url: '/samples/shaker-shuffle.mp3', duration: 0.5 },
  // Cowbell
  { id: 'cowbell-808', name: 'Cowbell 808', category: 'cowbell', url: '/samples/cowbell-808.mp3', duration: 0.25 },
];

const SAMPLE_CATEGORIES = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'perc', 'crash', 'ride', 'shaker', 'cowbell'] as const;

const CATEGORY_ICONS_SAMPLES: Record<Sample['category'], string> = {
  kick: '🥁',
  snare: '🪘',
  hihat: '🎵',
  openhat: '🎶',
  clap: '👏',
  perc: '🔔',
  crash: '💥',
  ride: '🔊',
  shaker: '🎼',
  cowbell: '🔔',
};

export function Library() {
  const { project, view, importMidiFile } = useDAWStore();
  const [activeTab, setActiveTab] = useState<LibraryTab>('instruments');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('synth');
  const [isImporting, setIsImporting] = useState(false);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const midiFileInputRef = useRef<HTMLInputElement>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Sample preview functionality
  const handlePreviewSample = useCallback(async (sample: Sample) => {
    // Stop currently playing preview
    if (previewSourceRef.current) {
      previewSourceRef.current.stop();
      previewSourceRef.current = null;
    }

    // If clicking same sample, just stop
    if (playingSampleId === sample.id) {
      setPlayingSampleId(null);
      return;
    }

    try {
      setPlayingSampleId(sample.id);

      // Ensure audio engine is initialized before loading samples
      if (!dawAudioEngine.context) {
        await dawAudioEngine.init();
      }

      const buffer = await dawAudioEngine.loadSample(sample.url);
      const ctx = dawAudioEngine.context;
      if (!ctx) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPlayingSampleId(null);
        previewSourceRef.current = null;
      };
      source.start();
      previewSourceRef.current = source;
    } catch (err) {
      console.error('[Library] Sample preview error:', err);
      setPlayingSampleId(null);
    }
  }, [playingSampleId]);

  const handleMidiImport = async (file: File) => {
    if (!file.name.match(/\.(mid|midi)$/i)) {
      return;
    }

    setIsImporting(true);
    try {
      await importMidiFile(file);
    } catch {
      // MIDI import failed silently
    } finally {
      setIsImporting(false);
    }
  };

  const handleMidiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMidiImport(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const tabs: { id: LibraryTab; label: string }[] = [
    { id: 'instruments', label: 'Inst' },
    { id: 'effects', label: 'FX' },
    { id: 'loops', label: 'Loops' },
    { id: 'samples', label: 'Samples' },
  ];

  const filteredInstruments = BUILT_IN_INSTRUMENTS.filter(
    inst => inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEffects = BUILT_IN_PLUGINS.filter(
    effect => effect.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[#3a3a3c]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-[#0a84ff]'
                : 'text-[#98989d] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98989d]"
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
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#1c1c1e] text-white text-xs rounded-lg border border-[#3a3a3c] focus:outline-none focus:border-[#0a84ff] placeholder-[#98989d]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'instruments' && (
          <div className="p-2 space-y-1">
            {/* Categories */}
            <div className="mb-2">
              <div
                className="flex items-center gap-2 py-1.5 px-2 text-xs text-[#98989d] hover:text-white cursor-pointer rounded hover:bg-[#3a3a3c]"
                onClick={() => setExpandedCategory(expandedCategory === 'synth' ? null : 'synth')}
              >
                <span className={`transform transition-transform ${expandedCategory === 'synth' ? 'rotate-90' : ''}`}>▶</span>
                <span>Synthesizers</span>
              </div>
              {expandedCategory === 'synth' && (
                <div className="ml-4 space-y-0.5">
                  {filteredInstruments
                    .filter(i => i.category === 'synth')
                    .map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center gap-2 py-1.5 px-2 text-xs text-white cursor-pointer rounded hover:bg-[#3a3a3c]"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('instrument', inst.id);
                        }}
                      >
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-[#0a84ff] to-[#bf5af2] flex items-center justify-center text-[10px]">
                          🎹
                        </div>
                        <span>{inst.name}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="mb-2">
              <div
                className="flex items-center gap-2 py-1.5 px-2 text-xs text-[#98989d] hover:text-white cursor-pointer rounded hover:bg-[#3a3a3c]"
                onClick={() => setExpandedCategory(expandedCategory === 'sampler' ? null : 'sampler')}
              >
                <span className={`transform transition-transform ${expandedCategory === 'sampler' ? 'rotate-90' : ''}`}>▶</span>
                <span>Samplers</span>
              </div>
              {expandedCategory === 'sampler' && (
                <div className="ml-4 space-y-0.5">
                  {filteredInstruments
                    .filter(i => i.category === 'sampler')
                    .map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center gap-2 py-1.5 px-2 text-xs text-white cursor-pointer rounded hover:bg-[#3a3a3c]"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('instrument', inst.id);
                        }}
                      >
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-[#ff9500] to-[#ff453a] flex items-center justify-center text-[10px]">
                          🥁
                        </div>
                        <span>{inst.name}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="p-2 space-y-1">
            {['eq', 'compressor', 'reverb', 'delay', 'distortion', 'modulation', 'utility'].map(category => {
              const categoryEffects = filteredEffects.filter(e => e.category === category);
              if (!categoryEffects.length) return null;

              return (
                <div key={category} className="mb-2">
                  <div className="py-1 px-2 text-[10px] uppercase tracking-wider text-[#98989d]">
                    {category}
                  </div>
                  {categoryEffects.map((effect) => (
                    <div
                      key={effect.id}
                      className="flex items-center gap-2 py-1.5 px-2 text-xs text-white cursor-pointer rounded hover:bg-[#3a3a3c]"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('effect', effect.id);
                      }}
                    >
                      <div className="w-5 h-5 rounded bg-[#3a3a3c] flex items-center justify-center text-[10px]">
                        {category === 'eq' && '〰'}
                        {category === 'compressor' && '📉'}
                        {category === 'reverb' && '🌊'}
                        {category === 'delay' && '📡'}
                        {category === 'distortion' && '🔊'}
                        {category === 'modulation' && '🔄'}
                        {category === 'utility' && '⚙'}
                      </div>
                      <span>{effect.name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'loops' && (
          <LoopBrowser compact />
        )}

        {activeTab === 'samples' && (
          <div className="p-2 space-y-1">
            {SAMPLE_CATEGORIES.map((category) => {
              const categorySamples = AVAILABLE_SAMPLES.filter(s => s.category === category);
              if (categorySamples.length === 0) return null;

              return (
                <div key={category} className="mb-2">
                  <div
                    className="flex items-center gap-2 py-1.5 px-2 text-xs text-[#98989d] hover:text-white cursor-pointer rounded hover:bg-[#3a3a3c]"
                    onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  >
                    <span className={`transform transition-transform ${expandedCategory === category ? 'rotate-90' : ''}`}>▶</span>
                    <span>{CATEGORY_ICONS_SAMPLES[category]}</span>
                    <span className="capitalize">{category === 'hihat' ? 'Hi-Hats' : category === 'openhat' ? 'Open Hats' : category + 's'}</span>
                    <span className="text-[10px] text-[#636366]">({categorySamples.length})</span>
                  </div>
                  {expandedCategory === category && (
                    <div className="ml-4 space-y-0.5">
                      {categorySamples.map((sample) => (
                        <div
                          key={sample.id}
                          className="flex items-center gap-2 py-1.5 px-2 text-xs text-white cursor-grab active:cursor-grabbing rounded hover:bg-[#3a3a3c] transition-colors group"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('sample', JSON.stringify(sample));
                            e.dataTransfer.effectAllowed = 'copy';
                            // Add visual feedback
                            const dragImage = document.createElement('div');
                            dragImage.textContent = sample.name;
                            dragImage.className = 'bg-[#0a84ff] text-white text-xs px-2 py-1 rounded';
                            dragImage.style.position = 'absolute';
                            dragImage.style.top = '-1000px';
                            document.body.appendChild(dragImage);
                            e.dataTransfer.setDragImage(dragImage, 0, 0);
                            setTimeout(() => document.body.removeChild(dragImage), 0);
                          }}
                        >
                          {/* Preview button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewSample(sample);
                            }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                              playingSampleId === sample.id
                                ? 'bg-[#30d158] text-white'
                                : 'bg-[#3a3a3c] text-[#98989d] hover:bg-[#4a4a4c] hover:text-white'
                            }`}
                            title="Preview"
                          >
                            {playingSampleId === sample.id ? (
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-[#ff9500] to-[#ff453a] flex items-center justify-center text-[10px]">
                            {CATEGORY_ICONS_SAMPLES[sample.category]}
                          </div>
                          <div className="flex-1 truncate">{sample.name}</div>
                          <span className="text-[10px] text-[#636366]">{sample.duration}b</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Import & Quick Help */}
      <div className="p-2 border-t border-[#3a3a3c] space-y-2">
        {/* Hidden MIDI file input */}
        <input
          ref={midiFileInputRef}
          type="file"
          accept=".mid,.midi"
          className="hidden"
          onChange={handleMidiFileSelect}
        />

        {/* Import MIDI button */}
        <button
          onClick={() => midiFileInputRef.current?.click()}
          disabled={isImporting}
          className="w-full py-1.5 px-3 text-xs font-medium rounded bg-[#0a84ff] hover:bg-[#0070d4] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
        >
          {isImporting ? (
            <>
              <span className="animate-spin">⏳</span>
              Importing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Import MIDI
            </>
          )}
        </button>

        <p className="text-[10px] text-[#98989d] text-center">
          Drag items to tracks or import MIDI files
        </p>
      </div>
    </div>
  );
}
