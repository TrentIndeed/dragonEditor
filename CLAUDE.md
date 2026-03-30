# Dragon Editor — Claude Session Context

This file is for Claude to read at the start of a new session. It describes the current state of the project, what's been built, what works, what's missing, and where to pick up.

## Project Summary

AI video editor with a 10-stage pipeline. The user uploads footage, picks a mode and content style, and the AI runs each stage sequentially. Each stage applies changes immediately; the user approves to keep or reverts to undo. Exports to MP4 or DaVinci Resolve (EDL/FCPXML/SRT).

**See `VIDEO_PIPELINE_CLAUDE_INSTRUCTIONS.md` for the full product spec.** That file is the source of truth for all features, UI layout, design system, and pipeline behavior.

## Current State: Functional Frontend + AI Pipeline via Claude CLI

All 10 pipeline stages are implemented with real AI calls via the Claude Code CLI (OAuth gateway — no API key needed). Falls back to rule-based mocks when the CLI is unavailable. Video playback, file import, timeline editing, and persistence all work.

### What's Built

- **Mode Selection Screen** — 3 modes, 5 content styles, project name input, Open Project File button
- **4-panel resizable editor** — Media Bin (with file picker, drag-drop, thumbnails, context menu), Preview/Transcript, Timeline (6 tracks), AI Chat Panel
- **All 10 pipeline stages** with real AI via Claude CLI + mock fallbacks:
  1. Trim & Cut (AI analyzes transcript for dead space/fillers/false starts, ripple-deletes gaps)
  2. Audio Setup (sync, normalize, noise reduction, ducking toggles)
  3. Zooms & Reframe (AI places dynamic zoom keyframes with easing curves)
  4. B-Roll & Overlays (AI identifies moments needing visual support)
  5. Captions (5 TikTok-authentic styles: Hormozi Punch, Karaoke Sweep, Clean Minimal, Speaker Labels, Bounce Pop)
  6. Sound Effects (AI places SFX from 14 built-in library based on transcript context)
  7. Color Correction (8 presets, auto white balance/exposure/skin tone)
  8. AI Self-Review (AI evaluates pacing, audio, captions, visual, color with score)
  9. Export & Upload (MP4 export with resolution/fps picker, or FCPXML/EDL/SRT project files)
  10. Thumbnail (AI generates 4 prompt variants in 2x2 grid)
- **Pipeline controls** — pause/stop/resume, run any stage independently, revert stages
- **Video playback** — `<video>` element synced to playhead, plays imported files
- **File import** — drag-drop or file picker, auto-categorizes by type, video thumbnails generated from frames
- **Timeline editing** — clip dragging with snap/magnetism, razor tool splits, linked video+audio clips, ripple delete
- **TikTok captions on video** — word-by-word highlight overlay with per-style rendering (stroke, shadow, animation, chunking)
- **Dynamic zoom effect** — keyframe interpolation engine with easing curves (ramp-in/hold/ramp-out)
- **B-Roll + zoom indicators** on video preview
- **Undo/redo** — 50-level history with Ctrl+Z / Ctrl+Shift+Z
- **Full keyboard shortcuts** — Space, V, B, H, J/K/L, Delete, Ctrl+S/Z/A/C/V/X, Home/End, arrows, N, [/]
- **Right-click context menus** on media items and timeline clips
- **Auto-save** every 30s to localStorage + IndexedDB (media files persist across reload)
- **.dragon project files** — save/load entire project state
- **DaVinci Resolve export** — EDL, FCPXML, SRT
- **MP4 export** — resolution (720p/1080p/4k), fps (24/30/60), render progress UI
- **251 unit/component tests** + 12 E2E tests + 11 visual regression tests + 4 AI visual validation tests

### AI Pipeline Architecture

```
Browser Component → callAI(prompt) → fetch('/api/ai')
    → Next.js API Route → execFileSync('claude', [...])
    → Claude CLI (OAuth, no API key) → Claude API
    → JSON response → parsed back
    → Falls back to rule-based mock if CLI unavailable
```

Each stage has an `*AI()` function (e.g., `generateTrimSuggestionsAI()`) that sends a detailed prompt with transcript/clip context to Claude and parses the JSON response. The mock fallback is the original rule-based function.

### What's NOT Built (Backend Work Needed)

1. **Real transcription** — Stage 1 uses `MOCK_TRANSCRIPT`. Need Whisper/Deepgram/AssemblyAI to transcribe from actual video audio.
2. **Audio processing** — `audio-setup.ts` returns mock analysis. Need FFmpeg for real normalization/noise reduction/LUFS metering.
3. **Video rendering** — Stage 9 simulates export. Need FFmpeg pipeline to apply cuts, zooms, overlays, captions, SFX, and color correction to produce a real output MP4.
4. **B-Roll generation** — Stage 4 suggests placements but doesn't generate footage. Need Runway/Kling (text-to-video) or Remotion (programmatic B-roll).
5. **Thumbnail image generation** — Stage 10 generates prompts but doesn't call an image API. Need Replicate/Gemini/DALL-E.
6. **Platform upload** — Stage 9 generates metadata but doesn't upload. Need YouTube/TikTok/Instagram OAuth + APIs.
7. **Waveform rendering** — `wavesurfer.js` not integrated. Audio tracks show colored blocks.
8. **Real-time collaboration** — single-user only.

### Known Issues

- **Dark Reader browser extension** causes hydration mismatch errors. Disable it for localhost.
- **Stale .next cache** — if CSS breaks after code changes, delete `.next/` and restart dev server.
- **Vitest transient init failures** — running all test files together sometimes fails on first attempt due to jsdom/fork race. Retry usually passes. Individual files always pass.

## Tech Stack

```
Next.js 15.5 (App Router) | TypeScript strict | Tailwind CSS v4
Zustand 5 | lucide-react | @dnd-kit
Vitest 4 + @testing-library/react + @vitejs/plugin-react
Playwright (E2E + visual regression + AI visual validation)
Claude Code CLI (OAuth gateway for AI calls)
IndexedDB (media file persistence)
```

## File Map

```
src/
  app/
    page.tsx                    # Routes: ModeSelectScreen or EditorLayout
    globals.css                 # Tailwind v4 @theme tokens (all design tokens here)
    api/ai/route.ts             # POST /api/ai — Claude CLI gateway (OAuth, no API key)
    layout.tsx                  # Root layout, Google Fonts (Inter, IBM Plex Sans, JetBrains Mono)
  components/
    mode-select/                # ModeSelectScreen, ModeCard, StylePicker
    layout/                     # EditorLayout, TopBar, ResizeHandle, KeyboardShortcuts,
                                #   PlaybackEngine, AutoSave, MediaRestorer
    media-bin/                  # MediaBin (tabs, file picker, drag-drop, context menu, thumbnails)
    preview/                    # PreviewPanel, VideoPreview (video+caption+zoom overlay),
                                #   TranscriptEditor, TransportControls
    timeline/                   # Timeline (hand pan), TimelineToolbar, TimeRuler,
                                #   Track (drop+razor+snap), Clip (drag+context menu+trash), Playhead (drag)
    ai-chat/                    # AIChatPanel, PipelineProgress (click-to-run/revert per stage),
                                #   10 approval cards (TrimApproval...ThumbnailApproval)
    shared/                     # ExportModal (MP4 + project files), ContextMenu
  stores/
    projectStore.ts             # Project config, localStorage persistence
    mediaStore.ts               # Media items, IndexedDB file storage, addFiles, restoreFromDB
    timelineStore.ts            # Clips, playhead, tools, snap/magnetism, linked clips,
                                #   splitClipAtPlayhead, markCutRegion (ripple delete)
    transcriptStore.ts          # Transcript lines, delete/restore, filler removal
    pipelineStore.ts            # 10 stages, stageSnapshots for revert, pause/stop/resume,
                                #   runSingleStage, revertStage
    chatStore.ts                # Messages
    captionStore.ts             # Caption blocks, style switching
    audioStore.ts               # Audio config
    zoomStore.ts                # Zoom suggestions + keyframes
    historyStore.ts             # 50-level undo/redo stack
    saveStore.ts                # Auto-save state, dirty tracking
  lib/
    types.ts                    # All TypeScript interfaces and type unions
    constants.ts                # PIPELINE_STAGES, colors, mode configs, style options
    ai.ts                       # callAI() — client-side fetch to /api/ai + JSON parser
    trim.ts                     # generateTrimSuggestionsAI() + rule-based fallback
    zooms.ts                    # generateZoomSuggestionsAI() + fallback + keyframe converter
    zoom-engine.ts              # Keyframe interpolation with easing curves (ramp/hold/ramp)
    captions.ts                 # 5 TikTok caption styles, word chunking, timeline clip converter
    sfx.ts                      # generateSFXPlacementsAI() + 14 built-in SFX library
    broll.ts                    # generateBRollSuggestionsAI() + keyword fallback
    audio-setup.ts              # Audio analysis, mic sync, normalization config
    color-correction.ts         # 8 color presets, auto-select per content style
    ai-review.ts                # runAIReviewWithClaude() + rule-based fallback
    export-pipeline.ts          # Platform metadata, resolution/quality configs
    thumbnail.ts                # generateThumbnailVariantsAI() + template fallback
    export-edl.ts               # CMX 3600 EDL generator
    export-fcpxml.ts            # FCPXML 1.11 generator (multi-track, markers)
    export-srt.ts               # SubRip SRT generator
    persist.ts                  # localStorage save/load/clear
    media-db.ts                 # IndexedDB for media file blobs (survives reload, any size)
    project-file.ts             # .dragon project file save/load
    claude-cli.ts               # Claude CLI binary finder (used by API route)
    mockData.ts                 # Mock transcript (20 lines), clips, trim suggestions
    utils.ts                    # formatTimecode, cn, generateId, clamp, px<->seconds
  __tests__/
    setup.ts                    # jsdom setup (matchMedia, scrollTo, URL, IndexedDB mocks)
    helpers.ts                  # resetAllStores(), setupEditorState()
    pipeline-integration.test.ts    # 53 tests
    captions.test.ts                # 32 tests
    stages-2-3-6.test.ts            # 44 tests
    stages-4-7-8-9-10.test.ts       # 31 tests
    components/                     # 91 React component tests across 7 files
e2e/
  full-pipeline.spec.ts             # 12 E2E flow tests (Playwright)
  visual-regression.spec.ts         # 11 screenshot baseline tests
  ai-visual-validation.spec.ts      # 4 Claude Vision tests (needs CLI)
```

## How to Run

```bash
npm install                 # install dependencies
npm run dev                 # start dev server (localhost:3000)
npm test                    # 251 unit/component tests (Vitest)
npm run test:e2e            # 12 E2E tests (Playwright)
npm run test:visual         # 11 visual regression tests
npm run test:visual:update  # regenerate screenshot baselines
npm run test:ai             # 4 AI visual validation tests (needs Claude CLI)
npm run test:all            # unit + e2e + visual
npm run build               # production build
```

## Pipeline Stage Flow

```
Stage runs → snapshot taken → changes applied to timeline immediately
→ approval card shows → user sees changes live
→ Approve = keep changes, advance to next stage
→ Revert = restore timeline from snapshot, undo all stage changes
```

Stages can be run independently (click play icon on any stage in the stepper), paused, stopped, or reverted. Each stage takes an undo snapshot before applying changes.

## What to Work on Next

Priority order for making this a real product:

1. **Real transcription** — integrate Whisper/Deepgram to replace mock transcript from actual video audio
2. **FFmpeg rendering** — apply cuts, zooms, overlays, captions, SFX, color to produce real MP4 output
3. **B-Roll generation** — Runway/Kling text-to-video or Remotion programmatic B-roll
4. **Thumbnail image generation** — Replicate/Gemini/DALL-E from the AI-generated prompts
5. **Platform upload** — YouTube/TikTok/Instagram OAuth + upload APIs
6. **Waveform rendering** — integrate wavesurfer.js for audio track visualization
7. **Clip trimming handles** — drag clip edges to trim in/out points (currently only drag to reposition)

## Conventions

- AI calls: async functions with `*AI()` suffix in `src/lib/`, call `/api/ai` route, fall back to rule-based mock on failure. Claude CLI handles OAuth (no API key in code).
- Colors: Tailwind v4 `@theme` tokens in `globals.css`, slate-blue tinted darks (#0B1120-#1E293B)
- Typography: Inter (headings), IBM Plex Sans (body), JetBrains Mono (timecodes/labels)
- Icons: lucide-react exclusively, `strokeWidth={1.5}`, sizes 12-22px
- Panel headers: 40px tall, `bg-bg-panel-header`, 12px mono uppercase labels
- Buttons: `rounded-lg`, `transition-all duration-200`, `cursor-pointer`
- Store pattern: Zustand with `getState()` for cross-store access. Never `.filter()` inside a selector — use `useMemo` instead. Stores import `useTimelineStore` directly (not via `require()`).
- Timeline: clips have `linkedClipId` for video+audio pairs. `markCutRegion` does ripple-delete. Snap threshold is 8px.
- Undo: `useHistoryStore.getState().pushSnapshot()` before any destructive action. Deep clone with `JSON.parse(JSON.stringify(...))`.
- Persistence: localStorage for state, IndexedDB for media file blobs. `.dragon` project files for full export.
- Test pattern: store/logic tests in `__tests__/`, component tests in `__tests__/components/`, E2E in `e2e/`. Use `resetAllStores()` in `beforeEach`. Visual regression baselines in `e2e/*.spec.ts-snapshots/`.
- Captions: 5 TikTok-authentic styles with per-word timing, phrase chunking, stroke/shadow/animation per style. Rendered as overlay in VideoPreview via `CaptionOverlay` component.
- Zooms: keyframe engine with easing curves in `zoom-engine.ts`. 3-phase lifecycle: ramp-in, hold, ramp-out.

## Videos Folder

There are 7 MP4 files in `videos/` (gitignored). Used in integration tests and for manual testing. Real video files — the app plays and processes them.
