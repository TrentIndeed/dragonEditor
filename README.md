# Dragon Editor

AI-powered video editing pipeline. Upload raw footage, and the AI runs a 10-stage pipeline that trims, syncs audio, places zooms, generates captions, adds sound effects, color grades, and exports to DaVinci Resolve or directly to YouTube/TikTok/Instagram.

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Run Tests

```bash
npm test              # run all 250 tests once
npm run test:watch    # watch mode
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
AI finds dead space, false starts, repeated takes, filler words. You see a list of suggested cuts with timecodes and reasons. Accept or reject each cut individually. You can also switch to the **Transcript** tab and delete lines directly - the corresponding video is removed from the timeline.

- "Remove fillers" button deletes all filler words (um, uh, like, you know, etc.) in one click
- Deleted lines show strikethrough with a "Restore" button
- All edits are non-destructive and undoable

**Stage 2: Audio Setup**
AI syncs mic audio to video, normalizes volume to -14 LUFS, applies noise reduction, enables audio ducking. You see audio analysis metrics (peak level, average level, noise floor, gain applied) and can toggle noise reduction level (light/medium/heavy) and audio ducking on/off.

**Stage 3: Zooms & Reframe**
AI places zoom keyframes based on your content style. Entertainment gets a snap zoom every 5-10 seconds. Podcast gets subtle drifts every 15-30 seconds. You see each suggestion with timecode, zoom type (Push In, Snap, Drift, Pull Out), zoom level, and reason. Accept/reject individually or use "Accept All"/"Reject All".

**Stage 4: B-Roll & Overlays**
AI scans the transcript for keywords (show, look, example, data, step, tool, result) and suggests overlay placements. Three modes: Picture-in-Picture, Full Overlay (cutaway), Pause & Show. Accept or reject each suggestion.

**Stage 5: Captions**
AI generates captions from the transcript. Picks a style based on your content style:

| Content Style | Caption Style | Look |
|---|---|---|
| Entertainment | Karaoke Pop | Extra-bold, word-by-word color highlights |
| Education | Clean Subtitle | Subtitle bar with keyword highlighting |
| Podcast | Speaker Labels | Lower-third with speaker name badges |
| High Retention | Word by Word | Typewriter animation with emphasis scaling |
| Clickbait | Bold Pop | Punchy pop-in, centered, extra-bold |

You can switch between styles, preview how captions look, and remove individual caption blocks.

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

### 5. Export to DaVinci Resolve

Click the **Export** button in the top bar at any time. Three formats:

| Format | What transfers | How to import in Resolve |
|--------|---------------|--------------------------|
| **EDL** (.edl) | Cuts, timecodes, clip names (single video track) | File > Import > Timeline > EDL |
| **FCPXML** (.fcpxml) | Multi-track, clips, audio, transcript markers | File > Import > Timeline > FCPXML |
| **SRT** (.srt) | Captions with timecodes and speaker labels | Media Pool > Import Subtitle |

Pick your frame rate (24/25/30/60) and click Export. The file downloads to your browser.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| V | Selection tool |
| B | Razor tool |
| Ctrl+Scroll | Zoom timeline |

---

## How It Works

### Architecture

```
Next.js 14+ (App Router) + TypeScript + Tailwind CSS v4
Zustand (state management) + lucide-react (icons)
```

The app is a single-page application. The home page (`src/app/page.tsx`) switches between `ModeSelectScreen` and `EditorLayout` based on the project store state.

### State Management

All state lives in 9 Zustand stores. Components subscribe to slices of state and re-render only when their slice changes.

| Store | File | State |
|-------|------|-------|
| `projectStore` | `src/stores/projectStore.ts` | Project config (name, mode, style), editor open/closed |
| `mediaStore` | `src/stores/mediaStore.ts` | Imported media items, active tab, selection |
| `timelineStore` | `src/stores/timelineStore.ts` | Clips on 6 tracks, playhead, zoom level, selection, tools, snap |
| `transcriptStore` | `src/stores/transcriptStore.ts` | Transcript lines, delete/restore, filler word detection |
| `pipelineStore` | `src/stores/pipelineStore.ts` | 10 pipeline stages with status/progress, stage runners |
| `chatStore` | `src/stores/chatStore.ts` | Chat messages (user/assistant/system), approval cards |
| `captionStore` | `src/stores/captionStore.ts` | Caption blocks, active style, generation state |
| `audioStore` | `src/stores/audioStore.ts` | Audio config (sync, normalize, denoise, ducking), analysis results |
| `zoomStore` | `src/stores/zoomStore.ts` | Zoom suggestions, accepted/rejected, keyframes |

### Pipeline Engine

The pipeline is driven by `pipelineStore`. When a stage is approved, `advanceToNextStage()` finds the next implemented stage and calls `runStage(id)`. Each stage runner:

1. Sets status to `running`
2. Increments progress on an interval timer
3. At 100%, sets status to `reviewing`
4. After a delay, sets status to `awaiting-approval`
5. The chat panel detects `awaiting-approval` and renders the stage's approval card

```
runStage(id) -> setStatus('running') -> progress timer -> setStatus('reviewing')
    -> delay -> setStatus('awaiting-approval') -> approval card renders
    -> user clicks Approve -> approveStage(id) -> advanceToNextStage()
```

### Stage Logic

Each stage has a logic file in `src/lib/` that contains pure functions (no React, no side effects):

| Stage | Logic File | Key Functions |
|-------|-----------|---------------|
| 1. Trim | `mockData.ts` | Mock trim suggestions with timecodes and reasons |
| 2. Audio | `audio-setup.ts` | `analyzeAudio()`, `detectMicSync()`, `runAudioSetup()` |
| 3. Zoom | `zooms.ts` | `generateZoomSuggestions()`, `zoomSuggestionsToKeyframes()` |
| 4. B-Roll | `broll.ts` | `generateBRollSuggestions()`, `brollSuggestionsToTimelineClips()` |
| 5. Caption | `captions.ts` | `generateCaptionsFromTranscript()`, `captionBlocksToTimelineClips()` |
| 6. SFX | `sfx.ts` | `generateSFXPlacements()`, `sfxPlacementsToTimelineClips()` |
| 7. Color | `color-correction.ts` | `runColorCorrection()`, `autoSelectPreset()`, 8 preset definitions |
| 8. Review | `ai-review.ts` | `runAIReview()`, `getReviewScore()` |
| 9. Export | `export-pipeline.ts` | `generatePlatformMetadata()`, quality/format configs |
| 10. Thumbnail | `thumbnail.ts` | `generateThumbnailVariants()`, `selectThumbnail()` |

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

- Dark theme: `#09090B` to `#18181B` background layers, zinc-based text hierarchy
- Typography: Inter (headings), DM Sans (body), JetBrains Mono (timecodes/labels)
- Accent: cyan `#22D3EE` primary, orange/red/blue/purple/green for stages
- All icons from lucide-react with `strokeWidth={1.5}`
- Panels resizable via drag handles
- Reduced motion support via `prefers-reduced-motion`

### File Structure

```
src/
  app/
    layout.tsx              # Root layout, font loading
    page.tsx                # Routes between ModeSelect and Editor
    globals.css             # Tailwind v4 theme tokens, scrollbar, selection
  components/
    mode-select/            # Project creation screen
    layout/                 # TopBar, EditorLayout, ResizeHandle
    media-bin/              # Media import panel
    preview/                # Video preview, transcript editor, transport
    timeline/               # Timeline, tracks, clips, playhead, toolbar
    ai-chat/                # Chat panel, pipeline progress, 10 approval cards
    shared/                 # ExportModal
  stores/                   # 9 Zustand stores
  lib/                      # Pure logic: types, constants, stage logic, export utils
  __tests__/
    pipeline-integration.test.ts    # 53 store/logic tests
    captions.test.ts                # 32 caption stage tests
    stages-2-3-6.test.ts            # 44 audio/zoom/sfx tests
    stages-4-7-8-9-10.test.ts       # 31 broll/color/review/export/thumbnail tests
    components/
      mode-select.test.tsx          # 11 component tests
      timeline.test.tsx             # 16 component tests
      transcript.test.tsx           # 12 component tests
      preview.test.tsx              # 8 component tests
      ai-chat.test.tsx              # 22 component tests
      media-export.test.tsx         # 13 component tests
      editor-layout.test.tsx        # 8 component tests
```

### Tech Stack

| Dependency | Purpose |
|-----------|---------|
| Next.js 15 | App Router, React framework |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling with `@theme` tokens |
| Zustand | Lightweight state management |
| lucide-react | Icon library |
| @dnd-kit | Drag and drop (timeline clips, media bin) |
| Vitest | Test runner |
| @testing-library/react | Component testing |
| @vitejs/plugin-react | JSX transform for tests |
