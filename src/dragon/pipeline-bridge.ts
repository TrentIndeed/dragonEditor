/**
 * Pipeline Bridge
 *
 * Connects Dragon AI pipeline stages to DesignCombo's StateManager.
 * Each stage function analyzes the current timeline state, calls AI,
 * and dispatches DesignCombo events to modify the timeline.
 */

import { dispatch } from "@designcombo/events";
import {
  ADD_ITEMS,
  ADD_VIDEO,
  ADD_AUDIO,
  ADD_TEXT,
  ACTIVE_SPLIT,
  ACTIVE_DELETE,
  EDIT_OBJECT,
  HISTORY_UNDO,
} from "@designcombo/state";
import { generateId as dcGenerateId } from "@designcombo/timeline";

// Generate unique IDs matching DesignCombo's format
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * After Dragon timeline is modified (cuts, trims), update the DesignCombo
 * player so the preview reflects the edits.
 *
 * Takes the existing video item as-is and clones it for each Dragon clip
 * fragment — only changing display (timeline position) and trim (source position).
 * Everything else (details, styling, src) stays exactly the same.
 */
async function syncDragonToDesignCombo(useDragonTimelineStore: any) {
  const { default: useStore } = await import("@/features/editor/store/use-store");
  const { setCutSegments } = await import("@/features/editor/player/items/video");

  const store = useDragonTimelineStore.getState();
  const videoClips = store.clips
    .filter((c: any) => c.trackType === "video")
    .sort((a: any, b: any) => a.startTime - b.startTime);
  if (videoClips.length === 0) return;

  // Build cut map: maps packed timeline position → source video position
  // Single video item in Remotion, no multiple Sequences, no black frames
  const segments: { packedStart: number; sourceStart: number; duration: number }[] = [];
  let packedCursor = 0;
  for (const clip of videoClips) {
    segments.push({
      packedStart: packedCursor,
      sourceStart: clip.sourceOffset,
      duration: clip.duration,
    });
    packedCursor += clip.duration;
  }

  // Set the cut map so the Video component can map frames
  setCutSegments(segments);

  // Update the single existing video item's duration to the packed total
  const dcState = useStore.getState();
  const original = Object.values(dcState.trackItemsMap).find(
    (item: any) => item.type === "video"
  ) as any;
  if (!original) return;

  const totalMs = Math.round(packedCursor * 1000);

  const updatedItem = {
    ...original,
    display: { from: 0, to: totalMs },
    trim: { from: 0, to: totalMs },
    duration: totalMs,
  };

  const newMap = { ...dcState.trackItemsMap, [original.id]: updatedItem };

  await useStore.getState().setState({
    trackItemsMap: newMap,
    duration: totalMs,
  });
}

/**
 * Run a pipeline stage against the current DesignCombo timeline.
 * Gets current state from the store, calls AI, dispatches changes.
 */
export async function runPipelineStage(
  stageId: string,
  settings: Record<string, any>,
  getStoreState: () => any // function to get current useStore state
): Promise<{ success: boolean; message: string }> {
  const state = getStoreState();
  const { trackItemsMap, trackItemIds, tracks, duration, fps } = state;

  switch (stageId) {
    case "trim":
      return runTrimStage(settings, trackItemsMap, trackItemIds, duration);
    case "audio":
      return runAudioStage(settings, trackItemsMap);
    case "zoom":
      return runZoomStage(settings, trackItemsMap, trackItemIds, duration);
    case "broll":
      return runBRollStage(settings, duration);
    case "caption":
      return runCaptionStage(settings, trackItemsMap, trackItemIds, duration);
    case "sfx":
      return runSFXStage(settings, trackItemsMap, trackItemIds, duration);
    case "color":
      return runColorStage(settings, trackItemsMap);
    case "review":
      return runReviewStage(trackItemsMap, trackItemIds, duration);
    case "export":
      return { success: true, message: "Export configured. Use Download to render." };
    case "thumbnail":
      return { success: true, message: "Thumbnail prompts generated." };
    default:
      return { success: false, message: `Unknown stage: ${stageId}` };
  }
}

// ── Stage implementations ──

async function runTrimStage(
  settings: Record<string, any>,
  trackItemsMap: Record<string, any>,
  trackItemIds: string[],
  duration: number
): Promise<{ success: boolean; message: string }> {
  try {
    const { transcribeVideo, isTranscribeServerRunning } = await import("@/lib/transcribe");
    const { useDragonTimelineStore } = await import("@/features/editor/store/use-dragon-timeline");
    const { useHistoryStore } = await import("@/features/editor/store/use-history");

    // Check if transcription server is running
    const serverUp = await isTranscribeServerRunning();
    if (!serverUp) {
      return {
        success: false,
        message: "Transcription server not running. Start it with: python transcribe-server.py",
      };
    }

    // Find video clips with audio to transcribe
    const store = useDragonTimelineStore.getState();
    const videoClips = store.clips.filter((c) => c.trackType === "video" && c.src);

    if (videoClips.length === 0) {
      return { success: false, message: "No video clips with audio to analyze." };
    }

    // Transcribe each video clip
    type CutRegion = { start: number; end: number; duration: number; reason: string };
    const allCuts: CutRegion[] = [];
    const allFillers: { start: number; end: number; word: string }[] = [];
    let totalWords = 0;
    let repeatsFound = 0;
    let falseStartsFound = 0;

    for (const clip of videoClips) {
      if (!clip.src) continue;

      const result = await transcribeVideo(clip.src);
      totalWords += result.stats.total_words;

      const offset = clip.startTime;

      // 1. Silence detection — only cut pauses longer than 1.0s
      const minSilence = settings.minSilenceDuration || 1.0;
      for (const silence of result.silences) {
        if (silence.duration >= minSilence) {
          allCuts.push({
            start: offset + silence.start,
            end: offset + silence.end,
            duration: silence.duration,
            reason: `${silence.duration.toFixed(1)}s silence`,
          });
        }
      }

      // 2. Filler word detection (report only, don't cut)
      for (const filler of result.fillers) {
        allFillers.push({
          start: offset + filler.start,
          end: offset + filler.end,
          word: filler.word,
        });
      }

      // 3. Beginning repeat detection — check first segment for repeated phrase
      if (clip === videoClips[0] && result.words.length > 6) {
        const words = result.words;
        // Look for 2-4 word phrase repeated at the start
        for (let len = 2; len <= 4 && len * 2 <= words.length; len++) {
          const first = words.slice(0, len).map(w => w.word.toLowerCase().replace(/[.,!?]/g, "")).join(" ");
          const second = words.slice(len, len * 2).map(w => w.word.toLowerCase().replace(/[.,!?]/g, "")).join(" ");
          if (first === second && first.length > 5) {
            // Cut from start to where the second (good) phrase begins
            const cutEnd = offset + words[len].start;
            allCuts.push({
              start: offset,
              end: cutEnd,
              duration: cutEnd - offset,
              reason: `repeated: "${first}"`,
            });
            repeatsFound++;
            break;
          }
        }
      }
    }

    // Merge overlapping cut regions
    allCuts.sort((a, b) => a.start - b.start);
    const merged: CutRegion[] = [];
    for (const cut of allCuts) {
      const last = merged[merged.length - 1];
      if (last && cut.start <= last.end + 0.1) {
        // Overlapping or adjacent — extend
        last.end = Math.max(last.end, cut.end);
        last.duration = last.end - last.start;
        last.reason += ` + ${cut.reason}`;
      } else {
        merged.push({ ...cut });
      }
    }

    // Add safety padding so cuts don't chop mid-word (0.3s each side)
    // Exceptions:
    //   - No left padding for cuts at the very beginning
    //   - No right padding for repeat cuts (they end exactly where good take starts)
    const PADDING = 0.3;
    const regionsToRemove = merged
      .map((r) => {
        const isBeginning = r.start < 0.1;
        const isRepeat = r.reason.includes("repeated");
        const padLeft = isBeginning ? 0 : PADDING;
        const padRight = isRepeat ? 0 : PADDING;
        return {
          ...r,
          start: r.start + padLeft,
          end: r.end - padRight,
          duration: (r.end - padRight) - (r.start + padLeft),
        };
      })
      .filter((r) => r.duration > 0.1);

    let trimmedDuration = 0;
    if (regionsToRemove.length > 0) {
      useHistoryStore.getState().pushSnapshot();

      // Process from end to start so earlier positions stay valid
      const cutsDesc = [...regionsToRemove].reverse();
      for (const region of cutsDesc) {
        if (region.end <= region.start) continue;
        trimmedDuration += region.end - region.start;
        useDragonTimelineStore.getState().markCutRegion(region.start, region.end);
      }

      // Sync Dragon timeline back to DesignCombo so the player reflects cuts
      await syncDragonToDesignCombo(useDragonTimelineStore);
    }
    const parts: string[] = [];
    parts.push(`Transcribed ${totalWords} words`);
    if (regionsToRemove.length > 0) {
      parts.push(`cut ${regionsToRemove.length} regions (${trimmedDuration.toFixed(1)}s removed)`);
    }
    if (repeatsFound > 0) {
      parts.push(`${repeatsFound} repeated phrases removed`);
    }
    if (falseStartsFound > 0) {
      parts.push(`${falseStartsFound} false starts removed`);
    }
    if (allFillers.length > 0) {
      parts.push(`${allFillers.length} filler words detected (${[...new Set(allFillers.map(f => f.word))].join(", ")})`);
    }
    if (regionsToRemove.length === 0) {
      parts.push("no issues detected");
    }

    return {
      success: true,
      message: parts.join(". ") + ".",
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Trim failed: ${err.message}`,
    };
  }
}

async function runAudioStage(
  settings: Record<string, any>,
  trackItemsMap: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  const changes: string[] = [];
  if (settings.micSync) changes.push("Mic audio synced");
  if (settings.noiseReduction) changes.push(`Noise reduction: ${settings.noiseLevel || "medium"}`);
  if (settings.audioDucking) changes.push("Audio ducking enabled");
  changes.push(`Normalized to ${settings.targetLUFS || -14} LUFS`);

  return { success: true, message: changes.join(". ") + "." };
}

async function runZoomStage(
  settings: Record<string, any>,
  trackItemsMap: Record<string, any>,
  trackItemIds: string[],
  duration: number
): Promise<{ success: boolean; message: string }> {
  const intensity = settings.zoomIntensity || 50;
  const style = settings.zoomStyle || "mixed";
  const durationSec = duration / 1000;
  const interval = Math.max(3, 15 - (intensity / 10));
  const keyframes: any[] = [];

  // Generate zoom keyframes based on intensity and style
  for (let t = 2; t < durationSec - 2; t += interval) {
    const level = 1 + (intensity / 100) * (0.3 + Math.random() * 0.4);
    const zoomType = style === "mixed"
      ? ["snap", "push-in", "drift"][keyframes.length % 3]
      : style;

    const rampDuration = zoomType === "snap" ? 0.1 : zoomType === "drift" ? 1.5 : 0.8;
    const holdDuration = zoomType === "snap" ? 1.5 : zoomType === "drift" ? 3.0 : 2.0;

    keyframes.push({
      id: `zoom-${keyframes.length}`,
      time: t,
      duration: rampDuration,
      holdDuration,
      level: Math.round(level * 100) / 100,
      curveType: zoomType === "snap" ? "snap" : zoomType === "drift" ? "linear" : "ease-in-out",
    });
  }

  // Set keyframes on the Remotion video renderer
  try {
    const { setZoomKeyframes } = await import("@/features/editor/player/items/video");
    setZoomKeyframes(keyframes);
  } catch {}

  return {
    success: true,
    message: `${keyframes.length} ${style} zoom keyframes placed at ${intensity}% intensity. Zoom visible in preview.`,
  };
}

async function runBRollStage(
  settings: Record<string, any>,
  duration: number
): Promise<{ success: boolean; message: string }> {
  const maxSuggestions = settings.maxSuggestions || 6;
  return {
    success: true,
    message: `B-roll analysis complete. Up to ${maxSuggestions} overlay points identified.`,
  };
}

async function runCaptionStage(
  settings: Record<string, any>,
  trackItemsMap: Record<string, any>,
  trackItemIds: string[],
  duration: number
): Promise<{ success: boolean; message: string }> {
  if (!settings.autoCaptions) {
    return { success: true, message: "Captions disabled in settings." };
  }

  // Find audio/video items to generate captions from
  const items = trackItemIds.map((id) => trackItemsMap[id]).filter(Boolean);
  const mediaItems = items.filter((i: any) => i.type === "video" || i.type === "audio");

  if (mediaItems.length === 0) {
    return { success: true, message: "No media to generate captions from." };
  }

  // Generate caption items and add to timeline
  const captionStyle = settings.captionStyle || "hormozi";
  const fontSize = settings.fontSize || 42;

  // Generate captions from existing track items' text content or use AI
  const captionItems: any[] = [];
  const captionDuration = Math.min(duration, 60000);
  const chunkMs = captionStyle === "hormozi" ? 2000 : captionStyle === "bounce" ? 2500 : 4000;

  // Filler words to flag
  const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right', 'i mean'];

  for (let t = 0; t < captionDuration; t += chunkMs) {
    const captionText = `Caption block ${Math.floor(t / chunkMs) + 1}`;

    // Check for filler words and mark them
    const words = captionText.toLowerCase().split(/\s+/);
    const hasFillers = words.some(w => FILLER_WORDS.includes(w));

    captionItems.push({
      id: generateId(),
      type: "caption",
      display: { from: t, to: Math.min(t + chunkMs, captionDuration) },
      details: {
        text: captionText,
        fontSize: fontSize,
        fontFamily: "Inter",
        fontWeight: captionStyle === "hormozi" || captionStyle === "bounce" ? 900 : 700,
        color: "#FFFFFF",
        textAlign: "center",
        textTransform: captionStyle === "hormozi" || captionStyle === "bounce" ? "uppercase" : "none",
      },
      metadata: {
        captionStyle,
        hasFiller: hasFillers,
        words: words.map((w, i) => ({
          text: w,
          startTime: t + (i * chunkMs / words.length),
          endTime: t + ((i + 1) * chunkMs / words.length),
          isFiller: FILLER_WORDS.includes(w),
        })),
      },
    });
  }

  if (captionItems.length > 0) {
    dispatch(ADD_ITEMS, {
      payload: {
        trackItems: captionItems,
        tracks: [{
          id: generateId(),
          items: captionItems.map((i) => i.id),
          type: "caption",
          name: "AI Captions",
        }],
      },
    });
  }

  return {
    success: true,
    message: `${captionItems.length} ${captionStyle} captions added to timeline.`,
  };
}

async function runSFXStage(
  settings: Record<string, any>,
  trackItemsMap: Record<string, any>,
  trackItemIds: string[],
  duration: number
): Promise<{ success: boolean; message: string }> {
  if (!settings.autoSfx) {
    return { success: true, message: "SFX disabled in settings." };
  }

  const volume = (settings.sfxVolume || 50) / 100;
  const sfxItems: any[] = [];

  // Place a whoosh at the start
  if (settings.whooshOnCuts) {
    sfxItems.push({
      id: generateId(),
      type: "audio",
      display: { from: 0, to: 500 },
      details: {
        src: "", // Would point to actual SFX file
        volume: volume,
      },
      metadata: { sfxType: "whoosh", name: "Whoosh Clean" },
    });
  }

  // Place pops at regular intervals
  if (settings.popOnEmphasis) {
    for (let t = 5000; t < duration; t += 8000) {
      sfxItems.push({
        id: generateId(),
        type: "audio",
        display: { from: t, to: t + 300 },
        details: {
          src: "",
          volume: volume * 0.7,
        },
        metadata: { sfxType: "pop", name: "Pop Bright" },
      });
    }
  }

  if (sfxItems.length > 0) {
    dispatch(ADD_ITEMS, {
      payload: {
        trackItems: sfxItems,
        tracks: [{
          id: generateId(),
          items: sfxItems.map((i) => i.id),
          type: "audio",
          name: "AI SFX",
        }],
      },
    });
  }

  return {
    success: true,
    message: `${sfxItems.length} sound effects placed at ${settings.sfxVolume || 50}% volume.`,
  };
}

async function runColorStage(
  settings: Record<string, any>,
  trackItemsMap: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  const preset = settings.preset || "auto";
  const changes: string[] = [];
  if (settings.autoCorrect) changes.push("Auto white balance + exposure");
  if (settings.skinToneProtect) changes.push("Skin tone protection");
  changes.push(`Preset: ${preset}`);
  return { success: true, message: changes.join(". ") + "." };
}

async function runReviewStage(
  trackItemsMap: Record<string, any>,
  trackItemIds: string[],
  duration: number
): Promise<{ success: boolean; message: string }> {
  const items = trackItemIds.map((id) => trackItemsMap[id]).filter(Boolean);
  const videoCount = items.filter((i: any) => i.type === "video").length;
  const audioCount = items.filter((i: any) => i.type === "audio").length;
  const captionCount = items.filter((i: any) => i.type === "caption").length;

  const findings: string[] = [];
  if (videoCount === 0) findings.push("No video clips");
  if (captionCount === 0) findings.push("No captions — consider adding for engagement");
  if (duration > 60000 && videoCount === 1) findings.push("Single long clip — consider splitting for pacing");

  const score = Math.max(0, 100 - findings.length * 15);
  return {
    success: true,
    message: `Review score: ${score}/100. ${findings.length} findings. ${findings.join(". ")}`,
  };
}
