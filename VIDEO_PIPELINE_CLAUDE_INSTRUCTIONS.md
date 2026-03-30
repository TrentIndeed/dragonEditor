# AI Video Editor — Full Product & UI Spec for Claude

You are building a complete AI video editor. It has three modes, a professional timeline with drag-and-drop, transcript-based editing, and an AI pipeline that self-reviews its work after each stage. The user approves each stage before moving on.

This document defines EVERYTHING — modes, pipeline stages, UI panels, interactions, and the component architecture. Build the frontend in Next.js 14+ (App Router) with TypeScript and Tailwind. Use mock data first, wire backend later.

---

## PRODUCT MODES

The app has three primary modes selected at project creation. Each mode configures the pipeline differently.

### Mode 1: Shorts Editor
- Input: Raw footage (single clip, typically 1-15 minutes)
- Output: One polished vertical (9:16) short, 15-90 seconds
- Pipeline: Full pipeline runs on the single clip
- Use case: Creator records a take, wants a finished TikTok/Reel/Short

### Mode 2: Shorts Extractor
- Input: Long-form video (podcast, lecture, stream — 15 min to 3+ hours)
- Output: Multiple vertical (9:16) shorts extracted from the long video
- Pipeline: AI analyzes full transcript, detects viral moments, extracts multiple clips, processes each independently
- Use case: Repurpose a podcast into 5-10 shorts

### Mode 3: Long-Form Editor
- Input: Raw footage (single or multi-clip)
- Output: One polished horizontal (16:9) video
- Pipeline: Full pipeline runs but skips reframe-to-vertical, focuses on pacing, B-roll, and polish
- Use case: YouTube video, course content, documentary

### Content Style (sub-selection within each mode)

After selecting a mode, user picks a content style that affects how the AI makes creative decisions:

- **Entertainment** — fast pacing, frequent zooms, punchy hooks, sound effects on beats, energetic captions (Hormozi/MrBeast style)
- **Education** — moderate pacing, zooms on emphasis points, clean captions, pause-for-visuals approach, data overlays
- **Podcast** — minimal editing, multicam switching (if available), speaker-focused framing, lower-third names, chapter markers
- **High Retention** — AI optimizes every second for watch-time: strong hook in first 2s, pattern interrupts every 8-12s, payoff structure
- **Clickbait** — provocative hooks, cliffhanger cuts, emoji-heavy captions, trending sounds, open loops

The style selection is stored in project config and affects AI prompt templates throughout the pipeline.

---

## PIPELINE STAGES (8 Stages)

The pipeline runs in this order. Each stage has a progress bar, a visible status in the UI, and an AI self-review step at the end. The user can approve, reject, or edit before the next stage begins.

### Stage 1: Trim & Cut
- AI identifies dead space, false starts, repeated takes, awkward pauses
- Presents a list of suggested cuts with timecodes
- User can approve/reject individual cuts via timeline or transcript
- Transcript editing: user sees full transcript, deletes lines, AI automatically removes corresponding video segments

### Stage 2: Audio Setup
- If user has separate microphone audio: AI syncs it to the video audio using waveform cross-correlation
- Volume normalization: AI analyzes audio levels across the entire clip, normalizes to -14 LUFS (broadcast standard)
- Audio ducking: if background music is added, AI ducks music during speech
- Noise reduction: AI applies noise gate / spectral denoising if needed
- Output: stable, clean audio track synced to video

### Stage 3: Zooms & Reframe
- AI places zooms with taste based on content style:
  - Entertainment: zoom on punchlines, reactions, emphasis words (every 5-10s)
  - Education: zoom on key terms, demonstrations, diagrams
  - Podcast: minimal zoom, mostly speaker switching
  - High Retention: zoom as pattern interrupt every 8-12 seconds
- Zoom types: slow push-in (Ken Burns), quick snap zoom, subtle drift
- For Shorts modes: AI also reframes to 9:16 with face tracking
- User can drag zoom keyframes on timeline, adjust zoom level, add/remove zooms

### Stage 4: B-Roll & Overlays
- User adds supplementary media (videos, photos, graphics) to the media bin
- AI suggests placement points based on transcript context
- Three overlay modes (user picks per insertion):
  1. **Picture-in-Picture (PiP)**: Main video continues, supplementary media appears in a smaller window (corner placement, user can drag position/size)
  2. **Full overlay**: Supplementary media replaces the main video entirely for its duration (cutaway)
  3. **Pause & show**: Main video pauses, supplementary media plays/displays, then main video resumes
- User can drag overlay clips onto the timeline to manually place them
- AI reviews placement and suggests adjustments

#### B-Roll Sourcing — Three Buttons in Media Bin

The Media Bin has three dedicated buttons for sourcing B-roll, visible when the "B-Roll" or "AI Generated" tab is active:

**Button 1: "AI Generate"**
- Opens a modal with a text prompt field: "Describe the clip you want..."
- User types a description (e.g., "aerial shot of a city skyline at sunset, cinematic, 4 seconds")
- Backend sends to a text-to-video model (Runway / Kling / local model — configurable in settings)
- Progress bar shows generation status
- Generated clip appears in the "AI Generated" tab of the media bin
- User can drag it onto the B-Roll/Overlay timeline track
- Generation history saved — user can regenerate with different prompts

**Button 2: "Find Online"**
- Opens Pexels (pexels.com/search/videos/) or Pixabay (pixabay.com/videos/) in a new browser tab
- A small toast notification reminds the user: "Download clips and drag them into the media bin"
- User downloads free stock footage externally, then drags the files into the media bin drop zone
- Dropped files automatically go to the "Footage" tab

**Button 3: "Create with Remotion"**
- Opens a modal with a template picker for programmatic B-roll:
  - **Data Cards**: stat callouts, quote cards, key point slides
    - Fields: headline, stat/number, subtitle, brand color
    - Preview renders live as user fills in fields
  - **Animated Typography**: flying text, kinetic typography, word reveals
    - Fields: text content, animation style (typewriter, fly-in, scale-up, wave), duration
  - **Charts & Graphs**: bar, line, pie charts from data
    - Fields: chart type, data points (simple table input), title, colors
  - **Custom Prompt**: free-text description → Claude Code generates Remotion component via the Remotion agent skill
    - Field: "Describe what you want..." (e.g., "a countdown timer from 5 to 1 with glitch effect")
    - Uses Claude API + Remotion skill to generate and render
- All Remotion clips render at project resolution (1080x1920 for shorts, 1920x1080 for long-form)
- Generated clips appear in the "AI Generated" tab
- User can re-edit any Remotion clip by clicking "Edit" on it in the media bin (reopens the modal with saved params)

### Stage 5: Captions
- AI generates captions from transcript (already available from Stage 1)
- Applies caption style based on content style:
  - Entertainment: karaoke word-pop, large bold text, colored highlights
  - Education: clean subtitle bar, keyword highlighting
  - Podcast: speaker-labeled captions, lower-third style
  - High Retention: animated word-by-word with emphasis scaling
- Captions only on important/spoken parts (not on B-roll silence or music-only sections)
- User can edit caption text, timing, and style from the caption track on timeline
- Caption track is a separate timeline track — user can drag caption blocks

### Stage 6: Sound Effects
- AI places sound effects based on content style and transcript context:
  - Whoosh on transitions/cuts
  - Pop/ding on key points
  - Bass drop on punchlines
  - Subtle ambience under sections
  - Typing sounds on text overlays
- Sound effect library: built-in library of common SFX (whoosh, pop, ding, swoosh, impact, notification, laugh, etc.)
- User can also upload custom SFX to the media bin
- SFX appear as clips on a dedicated audio track in the timeline — fully draggable
- Volume per SFX adjustable

### Stage 7: Auto Color Correction
- AI analyzes the footage and automatically applies color correction:
  - White balance correction (neutralize color casts)
  - Exposure normalization (fix under/overexposed sections)
  - Contrast optimization (lift shadows, control highlights)
  - Saturation balancing (prevent over/under-saturation)
  - Skin tone protection (ensure faces look natural)
  - Scene-to-scene consistency (match color across cuts so the edit feels cohesive)
- Fully automatic: AI picks the best grade, user approves or rejects
- No manual sliders — this is a one-click stage. If user rejects, AI tries a different approach.
- The AI applies corrections per-scene (not a single flat grade across the whole video) to handle lighting changes
- Built-in look presets as fallback — if user says "make it warmer" or "cinematic look" in chat, AI applies a preset on top of the correction:
  - Film (orange/teal, lifted blacks, slight grain)
  - Warm (golden highlights, warm shadows)
  - Cool (blue-shifted, crisp contrast)
  - Cinematic (high contrast, desaturated midtones, teal shadows)
  - Raw (minimal processing, just white balance and exposure fix)
  - Vibrant (boosted saturation, punchy contrast)
  - Moody (crushed blacks, muted colors, warm highlights)
  - Clean (neutral, broadcast-standard, no stylistic look)
- No custom LUT upload — keep it simple
- Before/After toggle activates on the preview so user can compare corrected vs original
- Color correction applies to ALL visual content (main footage + B-roll overlays) for consistency

### Stage 8: AI Self-Review & Polish
- AI watches the complete assembled edit and evaluates:
  - Pacing: are there dead moments? Is the hook strong enough?
  - Audio: any volume spikes? Music/SFX balanced with speech?
  - Captions: any desync? Any missing captions on speech?
  - Visual flow: any jarring cuts? Zoom timing feel natural?
  - Color: any shots that don't match? Any blown highlights?
- AI reports findings in the chat panel with specific timecodes
- AI suggests fixes (e.g., "The section at 0:45-0:52 feels slow — consider cutting or adding a zoom")
- User approves final output or requests fixes

### Stage 9: Export & Upload
- Render final video (local ffmpeg)
- Export progress bar with ETA
- Upload to selected platforms (TikTok, YouTube, Instagram)
- AI generates platform-specific metadata (titles, descriptions, hashtags)
- User reviews metadata before upload

### Stage 10: AI Thumbnail Generator
- Only available for YouTube uploads (shorts and long-form). Skipped for TikTok/Instagram (they use the video's first frame or a frame picker).
- Uses **Nano Banana Pro** (Google Gemini image model) via Replicate API or direct Gemini API
- AI analyzes the video content, transcript, and title to auto-generate a thumbnail prompt
- Prompt includes: subject description, facial expression, text overlay (title/hook), background scene, style (photorealistic, bold colors, high contrast — YouTube thumbnail best practices)
- Generates 4 thumbnail variations at 1280x720 (YouTube standard)
- User previews all 4 in a grid, selects one or requests regeneration
- User can edit the prompt and regenerate, or type adjustments in chat ("make the text bigger", "change background to blue", "add shocked expression")
- Reference image support: user can upload a photo of themselves or a brand asset to guide the generation
- Selected thumbnail is uploaded alongside the video to YouTube
- Thumbnail history saved in project — user can regenerate later
- Approval card in chat shows the 4 thumbnails in a 2x2 grid with [Select] buttons and a [Regenerate] button

---

## TRANSCRIPT EDITING (Critical Feature)

This is a first-class feature, not a side panel. The transcript editor is accessible via a tab in the Preview Monitor area (toggle between Video Preview and Transcript View).

### Transcript View
- Full transcript displayed as a scrollable document
- Each line/sentence is a separate block with:
  - Timecode on the left (HH:MM:SS)
  - Speaker label (if diarized)
  - Text content (editable)
  - A small waveform snippet showing audio for that segment
- Current playback position highlighted (auto-scrolls to current line)
- Click a line to seek the video to that timecode

### Delete-to-cut
- User selects one or more transcript lines and presses Delete or clicks a trash icon
- The corresponding video/audio segments are marked for removal
- Timeline updates immediately — cut sections shown as striped/dimmed regions
- Cuts are non-destructive — user can restore deleted lines via Undo or by clicking "Restore" on the dimmed region
- This is the primary rough-cut workflow: read the transcript, delete the bad parts, done

### Edit text
- User can edit the transcript text directly (for caption accuracy)
- Editing text does NOT change the video — only affects captions
- Changed text shown with a subtle "edited" indicator

### Filler word highlighting
- AI highlights filler words (um, uh, like, you know, basically, literally, actually) in orange
- A "Remove all filler words" button at the top removes all highlighted words and their corresponding video segments in one click
- User can individually keep specific filler words by clicking "Keep" on each

---

## UI LAYOUT

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TOP BAR (44px)                                                          │
│  Logo | Mode Badge | Style Badge | Project Name | Pipeline Dots | Export │
├──────────────────┬───────────────────────────────┬───────────────────────┤
│                  │                               │                       │
│  MEDIA BIN       │   PREVIEW / TRANSCRIPT        │   AI CHAT PANEL       │
│  (260px)         │   (flexible center)           │   (380px)             │
│                  │                               │                       │
│  Tabs:           │   Tab bar:                    │   Pipeline progress   │
│  • Footage       │   [Video] [Transcript]        │   Chat messages       │
│  • Audio/SFX     │                               │   Approval cards      │
│  • Images        │   Video: player + controls    │   Clip cards          │
│  • AI Generated  │   Transcript: editable doc    │   Quick actions       │
│                  │                               │   Chat input          │
├──────────────────┴───────────────────────────────┴───────────────────────┤
│  TIMELINE (240px)                                                        │
│                                                                          │
│  Track 1: Video          [draggable clips, zoom keyframes]              │
│  Track 2: Mic Audio      [synced mic track, draggable]                  │
│  Track 3: B-Roll/Overlay [PiP, overlay, pause-show clips]              │
│  Track 4: Captions       [caption blocks, draggable, editable]          │
│  Track 5: SFX            [sound effect clips, draggable]               │
│  Track 6: Music          [background music, volume envelope]            │
│                                                                          │
│  [Playhead] [Time ruler] [Zoom controls]                                │
└──────────────────────────────────────────────────────────────────────────┘
```

All panels are resizable via drag handles. Panels remember sizes in localStorage.

---

## TIMELINE — Detailed Spec

### Tracks
- 6 tracks as listed above, each with a label column on the left (80px wide, shows track name + mute/solo/lock icons)
- Tracks are vertically resizable (drag the border between tracks)
- Each track has a fixed minimum height (30px) and a comfortable default (video: 60px, audio: 50px, others: 35px)

### Clips on tracks
- Clips are rectangular blocks on a track
- Draggable horizontally (snap to playhead, snap to other clip edges)
- Draggable between compatible tracks
- Resizable from left/right edges (trim in/out points)
- Right-click context menu: Cut, Copy, Delete, Split at Playhead, Adjust Speed, Properties
- Visual: clips show their name, duration, and a mini preview (thumbnails for video, waveform for audio)

### Clip colors by type
- Video: #4A6FA5 (blue-gray)
- Mic Audio: #4CAF50 (green)
- B-Roll/Overlay: #9C27B0 (purple)
- Captions: #FFB300 (yellow-orange)
- SFX: #00BCD4 (cyan)
- Music: #E91E63 (pink)

### Zoom keyframes (on video track)
- Small diamond markers showing zoom in/out points
- Draggable horizontally to adjust timing
- Click to select, then adjust zoom level in a popover (1.0x to 2.5x, with curve type: linear, ease-in, ease-out, snap)
- Displayed as a subtle curve line overlaid on the video track

### Playhead
- Vertical cyan line spanning all tracks, triangle handle at top, draggable
- Timecode display above the handle
- All tracks scroll relative to playhead during playback

### Timeline Toolbar (above timeline, 32px)
- Left: Selection tool (arrow), Razor tool (blade), Hand tool (pan)
- Center: Snap toggle (magnet icon), Ripple edit toggle
- Right: Zoom slider + fit-to-view button

### Interactions
- Multi-select with Shift+click or rectangle drag
- Ctrl+scroll to zoom timeline
- Timeline auto-scrolls to follow playhead during playback
- Drag media from Media Bin directly onto a timeline track to place it

---

## AI CHAT PANEL — Detailed Spec

### Pipeline Progress Section (collapsible, top of panel)
- Vertical stepper showing all 10 stages
- Each stage: icon, name, status (pending | running | reviewing | awaiting approval | approved | rejected), duration
- Running stage shows a progress bar inside the step
- "REVIEWING" state: after processing completes, status shows "AI Reviewing..." before presenting approval card
- Click completed stages to re-expand their approval card

### Approval Cards (one per stage, embedded in chat)
Each stage produces an approval card. See Pipeline Stages section above for what each card contains.
- All cards have: [Approve] and [Request Changes] buttons minimum
- Stage-specific cards have additional actions (e.g., "Open Transcript Editor" for Stage 1, "Preview Zooms" for Stage 3)
- Approved cards collapse to a single summary line with a green checkmark

### Chat Input (fixed bottom of panel)
- Text input with placeholder "Ask AI to make changes..."
- Send button (Enter to send, Shift+Enter for newline)
- Quick action pills above input: contextual to current stage
  - Stage 1: "Remove filler words" | "Keep all" | "Open transcript"
  - Stage 3: "More zooms" | "Less zooms" | "Only zoom on emphasis"
  - Stage 6: "Add whoosh on cuts" | "Remove all SFX" | "More subtle"
  - General: "Undo" | "Start over" | "Make it faster" | "Make it slower"

---

## MODE SELECTION SCREEN

Before the editor loads, show a mode selection screen:

- Dark theme (#0D0D0D background)
- Three mode cards (180px wide, #1A1A1A, 1px border, hover glow)
  - Shorts Editor: phone icon, "One clip → one short"
  - Shorts Extractor: scissors icon, "Long vid → many shorts"
  - Long-Form Editor: film icon, "Full edit of a video"
- Selected mode: cyan border + subtle glow
- Style selection: 5 pill toggles (Entertainment, Education, Podcast, High Retention, Clickbait)
- Project name input
- [Create Project] button → transitions to editor

---

## DESIGN SYSTEM

### Colors
```css
--bg-deep: #0D0D0D;
--bg-panel: #1A1A1A;
--bg-panel-header: #141414;
--bg-surface: #222222;
--bg-hover: #2A2A2A;
--bg-active: #333333;
--border-default: #2A2A2A;
--border-active: #3A3A3A;
--text-primary: #E0E0E0;
--text-secondary: #888888;
--text-muted: #555555;
--accent-primary: #00D4AA;
--accent-orange: #FF6B35;
--accent-red: #FF3B3B;
--accent-blue: #4A9EFF;
--accent-purple: #9C6AFF;
--clip-video: #4A6FA5;
--clip-mic: #4CAF50;
--clip-broll: #9C27B0;
--clip-caption: #FFB300;
--clip-sfx: #00BCD4;
--clip-music: #E91E63;

--stage-trim: #00D4AA;
--stage-audio: #4CAF50;
--stage-zoom: #4A9EFF;
--stage-broll: #9C6AFF;
--stage-caption: #FFB300;
--stage-sfx: #00BCD4;
--stage-color: #FF8A65;
--stage-review: #FF6B35;
--stage-export: #69F0AE;
--stage-thumbnail: #FFAB40;
```

### Typography
- UI: `'IBM Plex Sans'`, technical/chat: `'IBM Plex Mono'`
- Panel headers: 11px uppercase, --text-secondary, letter-spacing 1px
- Body: 13px --text-primary
- Small labels: 10px --text-muted
- Timecodes: 11px mono --text-secondary

### Components
- Panel headers: 28px tall, #141414, 1px bottom border
- Buttons: 28px tall, 3px radius, 1px border, 12px font
- Inputs: 30px tall, --bg-surface, 1px border, 3px radius
- Cards: --bg-surface, 1px border, 4px radius, 12px padding
- No border-radius larger than 6px
- Transitions: 150ms ease for hovers, 200ms for panels
- Icons: lucide-react exclusively, 16px default

---

## TECH STACK

```
Next.js 14+ (App Router), TypeScript strict, Tailwind CSS + CSS vars
Zustand (state), Radix UI (primitives), lucide-react (icons)
wavesurfer.js (waveforms), @dnd-kit (drag & drop), HTML5 <video>
IBM Plex Sans + IBM Plex Mono (Google Fonts)
```

---

## FILE STRUCTURE

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # Mode selection screen
│   ├── editor/page.tsx                 # Main editor
│   └── globals.css
├── components/
│   ├── mode-select/
│   │   ├── ModeSelectScreen.tsx
│   │   ├── ModeCard.tsx
│   │   └── StylePicker.tsx
│   ├── layout/
│   │   ├── EditorLayout.tsx
│   │   ├── TopBar.tsx
│   │   └── ResizeHandle.tsx
│   ├── media-bin/
│   │   ├── MediaBin.tsx
│   │   ├── MediaItem.tsx
│   │   ├── MediaUpload.tsx
│   │   ├── MediaTabs.tsx
│   │   ├── SFXLibrary.tsx
│   │   ├── BRollSourceButtons.tsx      # Three buttons: AI Generate, Find Online, Create with Remotion
│   │   ├── AIGenerateModal.tsx         # Text-to-video prompt modal (Runway/Kling)
│   │   └── RemotionCreateModal.tsx     # Template picker: data cards, typography, charts, custom prompt
│   ├── preview/
│   │   ├── PreviewPanel.tsx
│   │   ├── VideoPreview.tsx
│   │   ├── TranscriptEditor.tsx
│   │   ├── TranscriptLine.tsx
│   │   ├── FillerWordHighlight.tsx
│   │   ├── TransportControls.tsx
│   │   └── BeforeAfterToggle.tsx
│   ├── timeline/
│   │   ├── Timeline.tsx
│   │   ├── TimelineToolbar.tsx
│   │   ├── TimeRuler.tsx
│   │   ├── Playhead.tsx
│   │   ├── Track.tsx
│   │   ├── TrackHeader.tsx
│   │   ├── Clip.tsx
│   │   ├── ZoomKeyframe.tsx
│   │   ├── WaveformTrack.tsx
│   │   └── CaptionBlock.tsx
│   ├── ai-chat/
│   │   ├── AIChatPanel.tsx
│   │   ├── PipelineProgress.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── QuickActions.tsx
│   │   ├── ApprovalCard.tsx
│   │   ├── TrimApproval.tsx
│   │   ├── AudioApproval.tsx
│   │   ├── ZoomApproval.tsx
│   │   ├── BRollApproval.tsx
│   │   ├── CaptionApproval.tsx
│   │   ├── SFXApproval.tsx
│   │   ├── ColorApproval.tsx           # Stage 7 — before/after, preset override via chat
│   │   ├── ReviewApproval.tsx
│   │   ├── ExportApproval.tsx
│   │   ├── ThumbnailApproval.tsx       # Stage 10 — 2x2 thumbnail grid with select/regenerate
│   │   └── ClipSuggestionCard.tsx
│   └── shared/
│       ├── Button.tsx
│       ├── Badge.tsx
│       ├── ProgressBar.tsx
│       ├── Tooltip.tsx
│       ├── ContextMenu.tsx
│       └── Skeleton.tsx
├── stores/
│   ├── projectStore.ts
│   ├── mediaStore.ts
│   ├── timelineStore.ts
│   ├── transcriptStore.ts
│   ├── pipelineStore.ts
│   └── chatStore.ts
├── lib/
│   ├── types.ts
│   ├── constants.ts
│   ├── mockData.ts
│   ├── api.ts
│   └── utils.ts
└── styles/
    └── editor-theme.css
```

---

## IMPLEMENTATION ORDER

1. Theme + globals.css
2. ModeSelectScreen + ModeCard + StylePicker
3. EditorLayout + TopBar + ResizeHandle
4. MediaBin + MediaTabs + MediaUpload + MediaItem
5. BRollSourceButtons + AIGenerateModal + RemotionCreateModal
6. VideoPreview + TransportControls
7. Timeline + TimeRuler + Playhead (empty structure)
8. Track + TrackHeader + Clip (draggable with @dnd-kit)
9. WaveformTrack (wavesurfer.js)
10. TranscriptEditor + TranscriptLine + delete-to-cut
11. FillerWordHighlight + "Remove all filler words"
12. AIChatPanel + ChatMessage + ChatInput
13. PipelineProgress (10-stage stepper)
14. ApprovalCard + all stage-specific variants (Trim, Audio, Zoom, BRoll, Caption, SFX, Color, Review, Export, Thumbnail)
15. ZoomKeyframe (diamond markers on video track)
16. CaptionBlock (draggable caption clips)
17. SFXLibrary (built-in sound browser)
18. BeforeAfterToggle
19. QuickActions (contextual pill buttons)
20. ClipSuggestionCard (for Shorts Extractor)
21. ThumbnailApproval (2x2 grid with select/regenerate)
22. Stage overlay on preview monitor

After each step: `npm run dev`, verify component renders with mock data.

---

## PROGRESSIVE BUILD STRATEGY (Critical)

Claude must build the COMPLETE UI SHELL first, then fill in pipeline stages one at a time. The app must be functional and usable at every step — limited to what's implemented, but never broken.

### Phase 1: Full UI Shell (Steps 1-13 above)
Build the entire layout, all panels, timeline, transcript editor, chat panel, and pipeline stepper. All 10 pipeline stages appear in the stepper but show **"N/A — Not yet implemented"** in gray. The stepper is the source of truth for what's available.

At the end of Phase 1, the app should be fully navigable:
- Mode selection works → opens editor
- Media bin accepts file drops, shows thumbnails
- Video preview plays uploaded video with transport controls
- Timeline shows video clip, waveform renders
- Clips are draggable on the timeline
- Transcript tab shows a placeholder "Transcription will appear here after Stage 1"
- Chat panel works (can type messages, see system responses)
- Pipeline stepper shows all 10 stages as "N/A"
- Every panel resizes correctly

### Phase 2: Fill in stages one at a time (Steps 14-22 + backend wiring)

Each stage implementation follows this pattern:
1. Wire the backend call (or mock it)
2. Build the stage-specific approval card
3. Update the stepper — stage transitions from "N/A" to "Ready"
4. Test: user can run the pipeline, it executes implemented stages and skips unimplemented ones
5. The app remains fully functional — unimplemented stages show "N/A — Coming Soon" and are skipped in the pipeline flow

Stage fill-in order:
1. **Stage 1: Trim & Cut** — most impactful, enables transcript editing and delete-to-cut
2. **Stage 5: Captions** — high-value, visible result, works independently
3. **Stage 2: Audio Setup** — mic sync and normalization
4. **Stage 3: Zooms & Reframe** — zoom keyframe UI already built
5. **Stage 6: Sound Effects** — SFX library already built
6. **Stage 4: B-Roll & Overlays** — depends on AI generate + Remotion modals
7. **Stage 7: Color Correction** — auto color grade
8. **Stage 8: AI Self-Review** — needs all prior stages to review
9. **Stage 9: Export & Upload** — final output
10. **Stage 10: Thumbnail Generator** — Nano Banana Pro integration, last

### How "N/A" stages behave:
- In the pipeline stepper: grayed out, shows "N/A" label, no progress bar
- When the pipeline reaches an N/A stage: it automatically skips to the next implemented stage
- A system message appears in chat: "Stage 3 (Zooms) — not yet implemented, skipping."
- The user can still use the app with whatever stages ARE implemented
- If Stage 1 (Trim) is the only implemented stage, the user can still: upload → trim → export raw. That's a functional product.

### Why this matters:
- The app is ALWAYS demo-able and usable during development
- Each stage is a self-contained PR / deployment
- You can ship Stage 1 + Stage 5 (trim + captions) as an MVP and iterate
- No "big bang" launch where nothing works until everything works

---

## CRITICAL RULES

### UI
- NEVER white/light backgrounds. Everything #0D0D0D to #222222.
- NEVER border-radius > 6px. Most elements 3-4px.
- Panel headers: always 28px, #141414, 11px uppercase, 1px bottom border.
- No spinners. Skeleton states only.
- Tooltips on every icon button (Radix, 200ms delay).
- Min viewport: 1280x720.
- lucide-react for ALL icons.

### Pipeline
- Every stage has a progress bar in the stepper AND the preview overlay.
- Every stage has an AI self-review substep before presenting to user. Stepper shows "Reviewing..." between "Processing" and "Awaiting Approval".
- User MUST approve each stage. No auto-advancing.
- User can re-do any previous stage at any time.
- All edits non-destructive.

### Timeline
- Clips draggable horizontally and between compatible tracks.
- Clips resizable from left/right edges.
- Snap-to-playhead and snap-to-clip-edges (toggle with magnet).
- Multi-select: Shift+click or rectangle drag.
- Ctrl+scroll to zoom. Auto-scroll follows playhead during playback.
- Drag media from Media Bin onto timeline tracks.
- Right-click context menu on every clip.

### Transcript
- Delete line = mark corresponding video/audio for removal.
- Non-destructive, undoable. Deleted lines show strikethrough + "Restore".
- Timeline reflects deletions immediately.
- Filler words: orange highlight, individual "Keep" buttons, bulk "Remove all".

### Keyboard Shortcuts
- Space: play/pause
- J/K/L: reverse/pause/forward
- Delete: remove selected clips
- Cmd+Z: undo
- Cmd+S: save
- B: razor tool (split at playhead)
- V: selection tool
