# Cowboy Beatbox - Drum Machine

A professional drum machine / beat sequencer built with React, TypeScript, and Web Audio API.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite + Bun
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Audio**: Web Audio API with custom effects chain

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Type check
bun run typecheck

# Build for production
bun run build

# Preview production build
bun run preview
```

## Deployment

The app is deployed to Fly.io at https://sequence.fly.dev/

### Deploy to Fly

```bash
bun run deploy
```

Or directly:

```bash
flyctl deploy --now
```

### Fly Configuration

- **App name**: sequence
- **Region**: sjc (San Jose)
- **Internal port**: 8080 (nginx)
- **Auto-scaling**: Machines auto-stop when idle

## Project Structure

```
src/
  audio/           # Web Audio API engine and effects
    AudioEngine.ts # Main audio engine
    Scheduler.ts   # Step sequencer timing
    effects/       # Distortion, delay, reverb
  components/      # React components
    App.tsx        # Main app component
    Sequencer.tsx  # Grid sequencer UI
    TrackRow.tsx   # Individual track controls
    Transport.tsx  # Play/stop, BPM, swing
    EffectsPanel.tsx # Per-track effects
  data/            # Kits and presets
  hooks/           # Custom React hooks
  store/           # Zustand state management
  types/           # TypeScript types
public/
  samples/         # Audio samples (mp3/wav)
```

## GitHub Repository

https://github.com/samheutmaker/sequence
