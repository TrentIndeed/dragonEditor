# AI Pipeline Implementation Plan

End-to-end plan to build a production-quality AI video editing pipeline.
Each stage maps to the research in the attached document and the platform rules in PLATFORM_RULES.md.

---

## Current State

| Stage | Status | What it does now |
|-------|--------|-----------------|
| 1. Trim & Cut | **Working** | Whisper transcription, silence detection (>1s), beginning repeat detection, ripple delete, cut-aware playback |
| 2. Audio Setup | Stub | Returns message about normalization. No audio processing |
| 3. Zooms & Reframe | Partial | Generates keyframes, applies scale transform in preview. Not AI-driven |
| 4. B-Roll & Overlays | Stub | Returns message. No B-roll added |
| 5. Captions | Partial | Creates placeholder caption blocks. Not from real transcript |
| 6. Sound Effects | Partial | Places whoosh/pop at fixed intervals. Not content-aware |
| 7. Color Correction | Stub | Returns message. No color applied |
| 8. AI Self-Review | Stub | Counts items and scores. No real analysis |
| 9. Export & Upload | Stub | Message only |
| 10. Thumbnail | Stub | Message only |

### Infrastructure Available
- Local Whisper server (faster-whisper, base.en, word-level timestamps)
- Web Audio API for audio extraction in browser
- Remotion player with CutAwareVideo for trimmed playback
- Dragon timeline (Zustand) synced to DesignCombo player
- DesignCombo state manager for Remotion rendering

---

## Implementation Plan

### Phase 1: Perfect the Trim Stage (Current Priority)
**Goal**: Reliable, content-aware cutting that never removes speech.

- [x] Whisper transcription with word-level timestamps
- [x] Silence detection and removal
- [x] Beginning repeat detection
- [x] Safety padding on cuts
- [x] Cut-aware video playback (CutAwareVideo)
- [x] Unit test with real video transcript
- [ ] **Improve repeat/false-start detection**: Use AI (Claude) to analyze the full transcript and identify repeated sentences, false starts, and "ums" that should be cut. Send the transcript + word timestamps to Claude and ask it to return cut regions. This is smarter than regex pattern matching.
- [ ] **Filler word removal**: Option to cut "um", "uh", "like", "you know" with enough surrounding context that the cut sounds natural
- [ ] **Pacing enforcement**: After silence removal, check if any remaining shot exceeds 5 seconds without a visual change (feeds into zoom stage)

### Phase 2: Real Captions from Transcript
**Goal**: TikTok-authentic captions generated from the actual Whisper transcript.

**Implementation**:
1. The transcript already exists from Stage 1 — store it globally so Stage 5 can use it
2. Convert word-level timestamps into caption chunks (3-7 words, 1-3 seconds)
3. Apply the selected caption style:
   - **Hormozi Bold**: Montserrat Bold, white + black stroke, yellow keyword highlights, uppercase, word-by-word pop
   - **Karaoke Sweep**: Each word highlights as spoken
   - **Clean Minimal**: Poppins, white + subtle shadow, lowercase, static
   - **Bounce Pop**: Bebas Neue, scale animation per word
   - **Speaker Labels**: Speaker identification + clean text
4. Render as overlay on the Remotion player (CaptionOverlay component exists)
5. Position in safe zone (center 60%, avoid bottom 480px for TikTok)
6. Keyword detection: automatically highlight important words (numbers, proper nouns, emotional words) in accent color

**Rules from research**:
- 48-62px font size at 1080x1920
- Max 28-36 characters per line
- Word-by-word animation for high-energy, static for calm content

### Phase 3: AI-Driven Zooms
**Goal**: Punch-in zooms triggered by vocal emphasis, not fixed intervals.

**Implementation**:
1. Analyze audio energy from the Whisper transcript (word probability = confidence = emphasis)
2. Detect emphasis moments: louder words (low probability often = unclear = less emphasis), punchlines, data points, questions
3. Place 1.2x-1.5x punch-in zooms at these moments
4. Rules:
   - Never zoom during the first 1.5 seconds (hook needs stability)
   - Minimum 3 seconds between zooms
   - Zoom duration: 0.5-1s ramp in, 1-2s hold, 0.5-1s ramp out
   - Ages 13-24: zoom every 15-25 seconds
   - Ages 25+: zoom every 20-40 seconds
5. The zoom engine already exists (`zoom-engine.ts`) — just need smarter placement

**Enhancement**: Send transcript to Claude with instruction "identify the 5-8 most impactful moments for zoom emphasis" and get back timestamps.

### Phase 4: Sound Effects (Content-Aware)
**Goal**: SFX placed at contextually appropriate moments.

**Implementation**:
1. Analyze transcript for SFX trigger moments:
   - Transition words ("but", "however", "so") → whoosh
   - Numbers/stats → ding/pop
   - Emotional peaks → bass drop
   - New topics → subtle transition sound
2. Place SFX every 5-15 seconds (research benchmark)
3. Audio levels: SFX at -10 to -20dB, never overpower speech
4. 14 built-in SFX already exist in the library
5. Beat-sync option: detect BPM of background music, place cuts on beats

**Rules from research**:
- Whoosh effects bridge transitions (under 2 seconds)
- Dings signal new topics or positive confirmations
- Bass drops mark major reveals
- Pop effects punctuate text appearances

### Phase 5: B-Roll & Overlays
**Goal**: Visual variety to maintain the 3-5 second refresh rate.

**Implementation**:
1. Analyze transcript for B-roll trigger moments (nouns, descriptions, demonstrations)
2. Options for B-roll source:
   - **Stock footage**: Pexels/Pixabay API (free) based on keyword extraction
   - **AI-generated**: Runway Gen-4 or Kling (text-to-video from transcript context)
   - **Screenshot/image**: For stats, quotes, references
3. Rules:
   - 50-80% B-roll for short-form, 40-50% for tutorials
   - B-roll clips: 3-5 seconds (short-form), 5-8 seconds (long-form)
   - Never leave talking head >5-7 seconds without visual change
   - Images: 2-4 seconds with slide-in/scale-up animation
   - Memes: max 1-3 per 30 seconds, 1-2 seconds each

**Phase 5b: Pattern Interrupts**:
- Progress bar at bottom edge
- Emoji animations matched to transcript keywords (2-4 per 30 seconds)
- Screen shake at comedic/dramatic moments

### Phase 6: Audio Processing
**Goal**: Professional audio without manual mixing.

**Implementation**:
1. **Normalization**: Target -6 to -12dB for dialogue (LUFS metering)
2. **Noise reduction**: Spectral gating on non-speech segments
3. **Background music**: Auto-duck music under speech
   - Speech present: music at -18 to -22dB
   - No speech: music at -8 to -12dB
   - Calm narration: music at -25dB
4. **Strategic silence**: 0.3s pauses at natural breathing points
5. Requires FFmpeg or Web Audio API processing

**Future**: ElevenLabs integration for AI voiceover

### Phase 7: Color Correction
**Goal**: Consistent, platform-optimized color grading.

**Implementation**:
1. Auto white balance and exposure correction
2. Skin tone protection
3. Platform presets:
   - TikTok: Slightly saturated, warm tones, high contrast
   - Instagram: Clean, slightly desaturated, polished
   - YouTube: Natural with slight contrast boost
4. Apply via CSS filters on the Remotion player or FFmpeg for export
5. 8 presets already defined in `color-correction.ts`

### Phase 8: AI Self-Review
**Goal**: Score the edit and suggest improvements before export.

**Implementation**:
1. Send the full edit state to Claude:
   - Transcript with cuts applied
   - Caption coverage %
   - Zoom frequency and placement
   - B-roll coverage %
   - Audio levels
   - Total duration
   - Platform target
2. Score categories (0-100 each):
   - Pacing: Are visual changes happening every 3-5 seconds?
   - Hook: Does the first 3 seconds have layered hooks?
   - Captions: Full coverage? Readable? In safe zone?
   - Audio: Proper levels? Music present? SFX frequency?
   - Visual variety: Enough B-roll? Zoom frequency appropriate?
3. Specific suggestions: "Add a zoom at 0:23 where you say the price" etc.

### Phase 9: Export
**Goal**: Platform-ready output files.

**Implementation**:
1. **MP4 render**: Use Remotion's rendering pipeline (or FFmpeg)
   - Apply all cuts, zooms, captions, B-roll, SFX, color as baked-in effects
   - Resolution: 1080x1920 (9:16) for short-form, 1920x1080 for YouTube
   - FPS: 30 (standard), 60 (high motion)
2. **Platform formatting**:
   - Remove watermarks from source
   - Adjust safe zones per platform
   - Stagger export with platform-specific hooks
3. **Project file export**: EDL, FCPXML, SRT for DaVinci Resolve handoff
4. **Cost target**: ~$0.10-$1.00 per 60-second short via cloud rendering

### Phase 10: Thumbnail Generation
**Goal**: High-CTR thumbnails from the video.

**Implementation**:
1. Extract 4-6 candidate frames (highest motion, facial expression, composition)
2. Send to image generation AI with prompt based on:
   - Video title/topic from transcript
   - Single focal point rule
   - Exaggerated facial emotion requirement
   - 3-5 bold words overlay
   - High contrast (30%+ brightness differential)
3. Present 2x2 grid of options for user to pick
4. Use Replicate/DALL-E/Gemini for generation

---

## Priority Order

1. **Phase 2 (Captions)** — Highest impact, transcript already available
2. **Phase 3 (Zooms)** — Engine exists, just needs smart placement
3. **Phase 4 (SFX)** — Library exists, needs content-aware triggers
4. **Phase 6 (Audio)** — Requires FFmpeg, big quality jump
5. **Phase 5 (B-Roll)** — Requires external API, biggest visual improvement
6. **Phase 7 (Color)** — CSS filters for preview, FFmpeg for export
7. **Phase 8 (Review)** — Claude API call with full state
8. **Phase 9 (Export)** — Remotion rendering or FFmpeg pipeline
9. **Phase 10 (Thumbnail)** — Image generation API
10. **Phase 1 improvements** — AI-driven repeat detection via Claude

---

## Platform Mode Selection

When the user selects a platform mode at project start, the pipeline adjusts all parameters:

| Parameter | TikTok | Reels | Shorts | YouTube |
|-----------|--------|-------|--------|---------|
| Target length | 21-34s | 7-15s | 30-60s | 8-20min |
| Cut frequency | 1-3s | 1-3s | 2-4s | 4-7s |
| Zoom interval | 15-25s | 15-25s | 15-25s | 20-40s |
| B-roll % | 50-80% | 50-80% | 50-80% | 40-50% |
| Caption style | Bold animated | Minimal/aesthetic | Bold animated | Clean static |
| SFX frequency | Every 5-15s | Every 10-20s | Every 5-15s | Every 15-30s |
| Safe zone bottom | 480px | 320px | 270px | 0px |
| Music level | -18 to -22dB | -18 to -22dB | -18 to -22dB | -18 to -25dB |
| Hook window | 1.7s | 1.7s | 3s | 30s |
| Completion target | 70% | 70% | 50% viewed | 70% AVD |
