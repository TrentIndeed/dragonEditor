# Dragon Editor — Claude Session Context

This file is for Claude to read at the start of a new session. It describes the current state of the project, what's been built, what works, what's missing, and where to pick up.

## Project Summary

AI video editor with a 10-stage pipeline. The user uploads footage, picks a mode and content style, and the AI runs each stage sequentially. The user approves each stage before the next begins. Exports to DaVinci Resolve via EDL/FCPXML/SRT.

**See `VIDEO_PIPELINE_CLAUDE_INSTRUCTIONS.md` for the full product spec.** That file is the source of truth for all features, UI layout, design system, and pipeline behavior.

## Current State: Frontend Complete, No Backend

The entire frontend UI shell and all 10 pipeline stages are implemented with mock data. There is no backend — all AI analysis, transcription, video processing, and file handling are simulated with deterministic mock functions. The app is fully functional for demo purposes.

### What's Built

- **Mode Selection Screen** — 3 modes, 5 content styles, project name input
- **4-panel resizable editor** — Media Bin, Preview/Transcript, Timeline (6 tracks), AI Chat Panel
- **All 10 pipeline stages** with progress simulation, AI review substep, and approval cards:
  1. Trim & Cut (transcript delete-to-cut, filler word removal)
  2. Audio Setup (sync, normalize, noise reduction, ducking)
  3. Zooms & Reframe (style-specific keyframes, accept/reject per suggestion)
  4. B-Roll & Overlays (keyword-triggered PiP/overlay/pause-show suggestions)
  5. Captions (5 styles mapped to content styles, word timing, emphasis)
  6. Sound Effects (14 built-in SFX, style-specific placement rules)
  7. Color Correction (8 presets, auto white balance/exposure/skin tone)
  8. AI Self-Review (pacing, audio, captions, visual, color findings with score)
  9. Export & Upload (platform picker, quality, metadata generation)
  10. Thumbnail (4 AI prompt variants in 2x2 grid)
- **DaVinci Resolve export** — EDL, FCPXML, SRT via modal in TopBar
- **250 tests** — 160 store/logic unit tests + 90 React component tests

### What's NOT Built (Backend Work Needed)

These are the major gaps between the current mock frontend and a real product:

1. **Transcription** — Stage 1 uses `MOCK_TRANSCRIPT`. Need Whisper/Deepgram/AssemblyAI integration to generate real transcripts from uploaded video audio.

2. **Video playback** — `VideoPreview` shows a placeholder. Need to wire `<video>` element to actually play uploaded files (via `URL.createObjectURL` or a media server).

3. **File upload handling** — `MediaBin` has drag-drop UI but `handleDrop` is a no-op. Need to read dropped files, generate thumbnails, extract metadata (duration, resolution).

4. **Audio processing** — `audio-setup.ts` returns mock analysis. Need real waveform cross-correlation (mic sync), FFmpeg for normalization/noise reduction, LUFS metering.

5. **AI analysis for each stage** — All `generate*` functions in `src/lib/` use pattern matching and mock data. Each needs an actual AI backend (Claude API calls with stage-specific prompts and the transcript/video context).

6. **Video rendering** — Stage 9 simulates export. Need FFmpeg pipeline to apply cuts, zooms, overlays, captions, SFX, and color correction to produce a real output file.

7. **B-Roll generation** — Stage 4's "AI Generate" button (text-to-video via Runway/Kling) and "Create with Remotion" (programmatic B-roll) are not wired.

8. **Thumbnail generation** — Stage 10 generates prompts but doesn't call an image generation API. Need Replicate/Gemini integration.

9. **Platform upload** — Stage 9 generates metadata but doesn't actually upload to YouTube/TikTok/Instagram. Need OAuth + platform APIs.

10. **Waveform rendering** — `wavesurfer.js` is in the spec but not integrated. Audio tracks show colored blocks, not real waveforms.

11. **Drag-and-drop on timeline** — `@dnd-kit` is installed but clip dragging is visual only (click-to-select works, but actual drag repositioning is not implemented).

12. **Keyboard shortcuts** — Only Space (play/pause) is partially wired via transport controls. J/K/L, Delete, Cmd+Z, Cmd+S, B, V are not implemented.

13. **localStorage persistence** — Panel sizes reset on refresh. The spec says to persist in localStorage.

### Known Issues

- **Dark Reader browser extension** causes hydration mismatch errors. Users need to disable it for localhost. Not a code bug.
- **Tailwind v4 `@theme` tokens** — custom colors like `bg-bg-deep` work in the browser but don't show in IDE intellisense since they're defined via `@theme` not `tailwind.config`.
- **`font-heading` / `font-body`** — defined in `@theme` as `--font-heading` and `--font-body` but Tailwind v4 generates `font-heading` only if explicitly referenced. Some components use `font-heading` class which may not resolve. If fonts look wrong, check that the Google Fonts `<link>` in `layout.tsx` is loading.

## Tech Stack

```
Next.js 15.5 (App Router) | TypeScript strict | Tailwind CSS v4
Zustand 5 | lucide-react | @dnd-kit
Vitest 4 + @testing-library/react (250 tests)
```

## File Map

```
src/
  app/page.tsx                  # Routes: ModeSelectScreen or EditorLayout
  app/globals.css               # Tailwind v4 @theme tokens (all design tokens here)
  components/
    mode-select/                # ModeSelectScreen, ModeCard, StylePicker
    layout/                     # EditorLayout, TopBar (with ExportModal), ResizeHandle
    media-bin/                  # MediaBin (tabs, drop zone)
    preview/                    # PreviewPanel, VideoPreview, TranscriptEditor, TransportControls
    timeline/                   # Timeline, TimelineToolbar, TimeRuler, Track, Clip, Playhead
    ai-chat/                    # AIChatPanel, PipelineProgress, 10 approval card components
    shared/                     # ExportModal (EDL/FCPXML/SRT)
  stores/                       # 9 Zustand stores (see README for details)
  lib/
    types.ts                    # All TypeScript interfaces and type unions
    constants.ts                # PIPELINE_STAGES array, colors, mode configs, style options
    mockData.ts                 # Mock transcript (20 lines), clips, trim suggestions
    utils.ts                    # formatTimecode, cn, generateId, clamp, px<->seconds
    captions.ts                 # 5 caption styles, transcript->caption generation
    zooms.ts                    # Style-specific zoom configs, suggestion generation
    sfx.ts                      # 14 built-in SFX, style-specific placement rules
    audio-setup.ts              # Audio analysis, mic sync, normalization config
    broll.ts                    # Keyword-triggered B-roll suggestions
    color-correction.ts         # 8 color presets, auto-select per content style
    ai-review.ts                # Review findings generator, score calculator
    export-pipeline.ts          # Platform metadata, resolution/quality/format configs
    thumbnail.ts                # 4 thumbnail prompt variants per style
    export-edl.ts               # CMX 3600 EDL generator
    export-fcpxml.ts            # FCPXML 1.11 generator (multi-track, markers)
    export-srt.ts               # SubRip SRT generator
  __tests__/
    setup.ts                    # jsdom setup (matchMedia, scrollTo, URL mocks)
    helpers.ts                  # resetAllStores(), setupEditorState()
    pipeline-integration.test.ts    # 53 tests (project, import, trim, timeline, chat, exports)
    captions.test.ts                # 32 tests
    stages-2-3-6.test.ts            # 44 tests (audio, zoom, sfx)
    stages-4-7-8-9-10.test.ts       # 31 tests (broll, color, review, export, thumbnail)
    components/                     # 90 React component tests across 7 files
```

## How to Run

```bash
npm install           # install dependencies
npm run dev           # start dev server (localhost:3000)
npm test              # run all 250 tests
npm run build         # production build
```

## Pipeline Stage Order (implemented)

```
1. Trim & Cut        ->  pipelineStore.runTrimStage()
2. Audio Setup       ->  pipelineStore.runAudioStage()
3. Zooms & Reframe   ->  pipelineStore.runZoomStage()
4. B-Roll & Overlays ->  pipelineStore.runStage('broll')
5. Captions          ->  pipelineStore.runCaptionStage()
6. Sound Effects     ->  pipelineStore.runSFXStage()
7. Color Correction  ->  pipelineStore.runStage('color')
8. AI Self-Review    ->  pipelineStore.runStage('review')
9. Export & Upload   ->  pipelineStore.runStage('export')
10. Thumbnail        ->  pipelineStore.runStage('thumbnail')
```

Each stage: `running` -> progress increments -> `reviewing` -> delay -> `awaiting-approval` -> user approves -> `approved` -> `advanceToNextStage()`.

## What to Work on Next

Priority order for making this a real product:

1. **Video playback** — wire `<video>` in VideoPreview to play uploaded files
2. **File upload** — handle dropped files in MediaBin, extract duration/metadata
3. **Real transcription** — integrate Whisper/Deepgram, replace mock transcript
4. **Timeline drag** — implement actual clip repositioning with @dnd-kit
5. **Keyboard shortcuts** — global key handler for Space, V, B, J/K/L, Delete, Cmd+Z
6. **Backend API** — Next.js API routes or separate server for AI processing
7. **FFmpeg rendering** — apply edits to produce real video output
8. **Waveform rendering** — integrate wavesurfer.js for audio track visualization

## Conventions

- All colors defined as Tailwind v4 `@theme` tokens in `globals.css`, referenced as `bg-bg-deep`, `text-accent-primary`, etc.
- Icons: lucide-react exclusively, `strokeWidth={1.5}`, sizes 10-22px
- Panel headers: 36px tall, `bg-bg-panel-header`, 11px mono uppercase labels
- Buttons: `rounded-lg`, `transition-all duration-200`, `cursor-pointer`
- Font sizes: 9-14px range, never larger. Timecodes always `font-mono tabular-nums`
- Store pattern: Zustand with `getState()` for cross-store access. Components use selectors to subscribe to specific slices. Never `.filter()` inside a selector — use `useMemo` instead (see Track.tsx fix).
- Test pattern: store/logic tests in root `__tests__/`, component tests in `__tests__/components/`. Use `resetAllStores()` from helpers in `beforeEach`. Use `setupEditorState()` when you need a project + mock data loaded.
- All stage logic is pure functions in `src/lib/` — no React, no side effects. Stores call these functions. Components read from stores.

## Videos Folder

There are 7 MP4 files in `videos/` that the user recorded. These are used in the integration tests (`pipeline-integration.test.ts` checks they exist and can be "imported"). They are real video files but the app doesn't actually play or process them yet.
