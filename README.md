# Dragon Editor

AI-powered video editing pipeline. Upload raw footage, and the AI runs a 10-stage pipeline that trims, syncs audio, places zooms, generates captions, adds sound effects, color grades, and exports to MP4 or DaVinci Resolve. Uses Claude Code CLI for AI calls (OAuth — no API key needed).

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Enable AI Pipeline (optional)

The pipeline works without AI (uses rule-based fallbacks). To enable real AI analysis:

```bash
npm install -g @anthropic-ai/claude-code   # install Claude CLI
claude "hello"                              # one-time OAuth login (opens browser)
```

Once authenticated, all pipeline stages use Claude to analyze your footage.

## Run Tests

```bash
npm test                    # 251 unit/component tests (Vitest)
npm run test:e2e            # 12 E2E tests (Playwright)
npm run test:visual         # 11 visual regression screenshot tests
npm run test:visual:update  # regenerate screenshot baselines
npm run test:ai             # 4 AI-powered visual validation tests
npm run test:all            # unit + e2e + visual
npm run test:watch          # watch mode (unit tests only)
```

---

## How to Use

### 1. Create a Project

When you open the app, you see the **Mode Selection Screen**.

**Pick a mode:**

| Mode | Input | Output |
|------|-------|--------|
| **Shorts Editor** | One raw clip (1-15 min) | One polished 9:16 short (15-90s) |
| **Shorts Extractor** | Long-form video (15 min - 3+ hrs) | Multiple 9:16 shorts extracted from it |
| **Long-Form Editor** | One or more raw clips | One polished 16:9 video |

**Pick a content style** that controls how the AI makes creative decisions:

- **Entertainment** - fast pacing, frequent zooms, punchy hooks, sound effects on beats
- **Education** - moderate pacing, zooms on emphasis points, clean captions
- **Podcast** - minimal editing, speaker-focused framing, lower-third names
- **High Retention** - optimizes every second for watch-time, pattern interrupts every 8-12s
- **Clickbait** - provocative hooks, cliffhanger cuts, emoji-heavy captions

Type a **project name** and click **Create Project**.

### 2. The Editor

The editor has four panels, all resizable by dragging the borders between them:

```
+------------------+-------------------------+-------------------+
|                  |                         |                   |
|   Media Bin      |   Preview / Transcript  |   AI Chat Panel   |
|   (left)         |   (center)              |   (right)         |
|                  |                         |                   |
+------------------+-------------------------+-------------------+
|                                                                |
|   Timeline (bottom)                                            |
|   Video | Mic | B-Roll | Captions | SFX | Music               |
+----------------------------------------------------------------+
```

- **Media Bin** - drag and drop your video/audio/image files here. Tabs for Footage, Audio, Images, AI Generated.
- **Preview** - video player with transport controls (play, pause, skip). Toggle to **Transcript** view to see and edit the transcript.
- **AI Chat Panel** - pipeline progress stepper, approval cards, chat input. This is where you interact with the AI.
- **Timeline** - 6 tracks with draggable clips. Select tool (V), Razor tool (B), Hand tool (H). Snap toggle. Ctrl+scroll to zoom.

### 3. Start the Pipeline

Click **"Start pipeline"** in the AI Chat Panel. The pipeline runs 10 stages in order. After each stage, the AI presents an approval card. You approve or reject before the next stage begins.

### 4. The 10 Pipeline Stages

Each stage shows a progress bar, then "AI Reviewing...", then an approval card.

**Stage 1: Trim & Cut**
AI analyzes the transcript to find dead space, false starts, filler word clusters, and repeated takes. Changes are applied immediately — you see cuts happen on the timeline in real-time. Approve to keep, or Revert to undo all cuts.

- Cuts use **ripple delete** — removes the section and closes the gap (no holes)
- Linked video+audio clips stay in sync through cuts
- Each cut is individually undoable with Ctrl+Z
- You can also switch to the **Transcript** tab and delete lines directly

**Stage 2: Audio Setup**
AI syncs mic audio to video, normalizes volume to -14 LUFS, applies noise reduction, enables audio ducking. You see audio analysis metrics (peak level, average level, noise floor, gain applied) and can toggle noise reduction level (light/medium/heavy) and audio ducking on/off.

**Stage 3: Zooms & Reframe**
AI places dynamic zoom keyframes based on your content style. Each zoom has a 3-phase lifecycle: **ramp-in** (smooth scale up) → **hold** (stay at zoom level) → **ramp-out** (scale back to 1x). Easing curves vary by type:

- **Snap**: instant zoom in 0.1s, hold 1.5s (Hormozi style)
- **Push-in**: smooth 0.8s ease-in-out, hold 2s (cinematic)
- **Drift**: slow 1.5s linear, hold 3s (Ken Burns)
- **Pull-out**: 0.6s ease-out reveal, hold 1s

You see the zoom effect live on the video preview with a scale indicator and progress bar.

**Stage 4: B-Roll & Overlays**
AI scans the transcript for keywords (show, look, example, data, step, tool, result) and suggests overlay placements. Three modes: Picture-in-Picture, Full Overlay (cutaway), Pause & Show. Accept or reject each suggestion.

**Stage 5: Captions**
AI generates TikTok-authentic captions with per-word timing and phrase-based chunking. Words are grouped into 2-8 word chunks at natural phrase boundaries. Each word gets individual highlight timing synced to speech.

| Content Style | Caption Style | Words/chunk | Animation | Look |
|---|---|---|---|---|
| Entertainment | **Hormozi Punch** | 1-3 | Pop (scale 1.15x) | ALL CAPS, yellow key words (#FFE500), heavy stroke |
| Education | **Clean Minimal** | 8 | Fade | White text, frosted glass background, lower-third |
| Podcast | **Speaker Labels** | 6 | Fade | Speaker name badge, sky blue highlights |
| High Retention | **Bounce Pop** | 4 | Bounce (scale 1.2x + translateY) | ALL CAPS, hot pink (#FF1493), words invisible until spoken |
| Clickbait | **Hormozi Punch** | 1-3 | Pop | Same as entertainment |

Also available: **Karaoke Sweep** — classic TikTok/CapCut word-by-word gold highlight with black box background.

Captions render live on the video preview with stroke, shadow, and animation per style. Switch between styles instantly.

**Stage 6: Sound Effects**
AI places sound effects from a built-in library of 14 SFX (whoosh, pop, ding, impact, swoosh, notification, ambient, typing, bass drop, laugh). Placement rules depend on content style - entertainment gets whooshes on cuts, pops on emphasis, bass drops on punchlines. Podcast gets minimal transition whooshes. Accept/reject each placement.

**Stage 7: Color Correction**
Fully automatic. AI analyzes the footage, corrects white balance, normalizes exposure, protects skin tones, and matches colors across scenes. Then applies a look preset:

Film, Warm, Cool, Cinematic, Raw, Vibrant, Moody, Clean

The preset is auto-selected based on your content style (e.g., entertainment gets Vibrant, high-retention gets Cinematic). You can switch presets before approving.

**Stage 8: AI Self-Review**
AI watches the complete assembled edit and evaluates pacing, audio, captions, visual flow, and color. Reports findings with severity levels (issue/warning/info), specific timecodes, and fix suggestions. Gives an overall score out of 100.

**Stage 9: Export & Upload**
Configure export: pick platforms (Local, YouTube, TikTok, Instagram), quality (Draft/Standard/High), format (MP4/MOV), resolution (auto-set from mode). AI generates platform-specific metadata (title, description, hashtags).

**Stage 10: AI Thumbnail Generator**
For YouTube uploads. AI generates 4 thumbnail variants with style-specific prompts (bold colors for entertainment, professional layout for education, etc.). Select one from a 2x2 grid or regenerate with new prompts.

### 5. Export

Click **Export** in the top bar. Two tabs:

**Export Video** (default) — renders MP4:
- Resolution: 720p / 1080p / 4k (auto-adapts to vertical/horizontal)
- Frame rate: 24 / 30 / 60 fps
- Progress bar during render

**Project File** — for DaVinci Resolve:

| Format | What transfers | How to import |
|--------|---------------|--------------|
| **FCPXML** (.fcpxml) | Multi-track, clips, audio, transcript markers | File > Import > Timeline > FCPXML |
| **EDL** (.edl) | Cuts, timecodes, clip names | File > Import > Timeline > EDL |
| **SRT** (.srt) | Captions with timecodes | Media Pool > Import Subtitle |

### 6. Save & Persistence

- **Ctrl+S** or **Save button** — downloads a `.dragon` project file (JSON with all state)
- **Auto-save** every 30 seconds to localStorage
- **Media files** stored in IndexedDB — survive page reload (any file size)
- **Open Project File** — load a `.dragon` file from the start screen or top bar
- Orange dot in top bar indicates unsaved changes

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Play / Pause |
| **V** | Selection tool |
| **B** | Razor tool |
| **H** | Hand tool (pan timeline) |
| **N** | Toggle snap |
| **Delete / Backspace** | Delete selected clips or media |
| **J / L** | Step back / forward 5s (Shift: 1s) |
| **K** | Stop playback |
| **Left / Right** | Nudge playhead 0.1s (Shift: 1s) |
| **Home / End** | Go to start / end |
| **[ / ]** | Zoom timeline out / in |
| **Escape** | Deselect all, stop playback |
| **Ctrl+Z** | Undo |
| **Ctrl+Shift+Z / Ctrl+Y** | Redo |
| **Ctrl+S** | Save project file |
| **Ctrl+A** | Select all clips |
| **Ctrl+C / V / X** | Copy / Paste / Cut clips |
| **Ctrl+D** | Deselect all |
| **Ctrl+Scroll** | Zoom timeline |

---

## How It Works

### Architecture

```
Next.js 15.5 (App Router) | TypeScript strict | Tailwind CSS v4
Zustand 5 | lucide-react | @dnd-kit
Claude Code CLI (OAuth AI gateway) | IndexedDB (media persistence)
Vitest + @testing-library/react | Playwright (E2E + visual)
```

### AI Pipeline Architecture

All AI calls route through the Claude Code CLI — no API key needed:

```
Browser → callAI(prompt) → fetch('/api/ai')
  → Next.js API Route → execFileSync('claude', [...])
  → Claude CLI (OAuth via Claude Max/Pro subscription)
  → Claude API → JSON response → parsed back
  → Falls back to rule-based mock if CLI unavailable
```

### State Management

All state lives in 11 Zustand stores with localStorage + IndexedDB persistence:

| Store | Key State |
|-------|-----------|
| `projectStore` | Project config, editor open/closed |
| `mediaStore` | Media items, IndexedDB file blobs, thumbnails |
| `timelineStore` | Clips (6 tracks), playhead, tools, snap, linked clips |
| `transcriptStore` | Transcript lines, delete/restore |
| `pipelineStore` | 10 stages, stageSnapshots for revert, pause/stop |
| `chatStore` | Messages |
| `captionStore` | Caption blocks, active style |
| `audioStore` | Audio config |
| `zoomStore` | Zoom suggestions + keyframes |
| `historyStore` | 50-level undo/redo stack |
| `saveStore` | Auto-save state, dirty tracking |

### Pipeline Engine

```
Stage starts → snapshot taken → changes applied to timeline immediately
→ approval card shows → user sees changes live on video preview
→ Approve = keep changes, advance    Revert = restore from snapshot
```

Stages can be run independently, paused, stopped, or reverted.

### Stage Logic

Each stage has an async AI function + rule-based fallback:

| Stage | Logic File | AI Function | Fallback |
|-------|-----------|-------------|----------|
| 1. Trim | `trim.ts` | `generateTrimSuggestionsAI()` | Filler/bracket detection |
| 2. Audio | `audio-setup.ts` | (mock) | `runAudioSetup()` |
| 3. Zoom | `zooms.ts` | `generateZoomSuggestionsAI()` | Interval placement |
| 4. B-Roll | `broll.ts` | `generateBRollSuggestionsAI()` | Keyword matching |
| 5. Caption | `captions.ts` | (rule-based) | 5 TikTok styles, word chunking |
| 6. SFX | `sfx.ts` | `generateSFXPlacementsAI()` | Trigger-based rules |
| 7. Color | `color-correction.ts` | (rule-based) | `autoSelectPreset()` |
| 8. Review | `ai-review.ts` | `runAIReviewWithClaude()` | Gap/coverage checks |
| 9. Export | `export-pipeline.ts` | (config only) | Platform metadata |
| 10. Thumbnail | `thumbnail.ts` | `generateThumbnailVariantsAI()` | Template prompts |

Additional engine: `zoom-engine.ts` — keyframe interpolation with easing curves (ramp-in/hold/ramp-out)

### Export Formats

Three export utilities for DaVinci Resolve interoperability:

| File | Format | Details |
|------|--------|---------|
| `export-edl.ts` | CMX 3600 EDL | SMPTE timecodes, track channels (V/A/A2/A3), clip name comments |
| `export-fcpxml.ts` | FCPXML 1.11 | Rational time, asset resources, connected storylines, transcript markers |
| `export-srt.ts` | SubRip SRT | Millisecond timing, speaker labels in bold tags |

### Component Tree

```
page.tsx
  ModeSelectScreen (when no project)
    ModeCard (x3)
    StylePicker
  EditorLayout (when project open)
    TopBar
      ExportModal
    MediaBin
    PreviewPanel
      VideoPreview + TransportControls
      TranscriptEditor
    Timeline
      TimelineToolbar
      TimeRuler
      Track (x6)
        Clip (per track)
      Playhead
    AIChatPanel
      PipelineProgress
      TrimApproval / AudioApproval / ZoomApproval / BRollApproval /
      CaptionApproval / SFXApproval / ColorApproval / ReviewApproval /
      ExportApproval / ThumbnailApproval
```

### UI Design

- Dark theme: slate-blue tinted (`#0B1120` to `#1E293B`), not pure black
- Typography: Inter (headings), IBM Plex Sans (body), JetBrains Mono (timecodes)
- Accent: sky blue `#38BDF8` primary, per-stage colors for pipeline
- All icons from lucide-react with `strokeWidth={1.5}`
- Panels resizable via drag handles
- Right-click context menus on media and clips
- Reduced motion support via `prefers-reduced-motion`

### File Structure

```
src/
  app/
    layout.tsx                  # Root layout, Google Fonts
    page.tsx                    # Routes: ModeSelectScreen or EditorLayout
    globals.css                 # Tailwind v4 @theme tokens
    api/ai/route.ts             # Claude CLI gateway (POST /api/ai)
  components/
    mode-select/                # ModeSelectScreen, ModeCard, StylePicker
    layout/                     # EditorLayout, TopBar, ResizeHandle, KeyboardShortcuts,
                                #   PlaybackEngine, AutoSave, MediaRestorer
    media-bin/                  # MediaBin (file picker, drag-drop, thumbnails, context menu)
    preview/                    # PreviewPanel, VideoPreview (video+caption+zoom+broll overlay),
                                #   TranscriptEditor, TransportControls
    timeline/                   # Timeline (hand pan), Track (drop+razor+snap),
                                #   Clip (drag+context menu+linked), Playhead (drag)
    ai-chat/                    # AIChatPanel, PipelineProgress, 10 approval cards
    shared/                     # ExportModal (MP4 + project files), ContextMenu
  stores/                       # 11 Zustand stores (see above)
  lib/                          # AI functions, stage logic, zoom engine, export utils,
                                #   persistence, types, constants
  __tests__/                    # 251 unit/component tests
e2e/
  full-pipeline.spec.ts         # 12 E2E flow tests
  visual-regression.spec.ts     # 11 screenshot baseline tests
  ai-visual-validation.spec.ts  # 4 Claude Vision tests
```

### Tech Stack

| Dependency | Purpose |
|-----------|---------|
| Next.js 15.5 | App Router, API routes |
| TypeScript strict | Type safety |
| Tailwind CSS v4 | Styling with `@theme` tokens |
| Zustand 5 | State management |
| lucide-react | Icons |
| Claude Code CLI | AI calls via OAuth (no API key) |
| IndexedDB | Media file persistence |
| Vitest + RTL | Unit/component tests |
| Playwright | E2E + visual regression + AI validation |
