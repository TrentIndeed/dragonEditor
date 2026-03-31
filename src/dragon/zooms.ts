import { ZoomSuggestion, ZoomKeyframe, ZoomType, ContentStyle, TranscriptLine } from './types';
import { generateId } from './utils';
import { callAI, parseAIJson } from './ai';

/**
 * Stage 3: Zooms & Reframe
 * AI places zooms based on content and style.
 * Falls back to interval-based placement.
 */

interface ZoomConfig {
  intervalRange: [number, number];
  preferredTypes: ZoomType[];
  zoomLevel: [number, number];
}

const ZOOM_CONFIGS: Record<ContentStyle, ZoomConfig> = {
  'entertainment': { intervalRange: [5, 10], preferredTypes: ['snap', 'push-in'], zoomLevel: [1.2, 1.8] },
  'education': { intervalRange: [10, 20], preferredTypes: ['push-in', 'drift'], zoomLevel: [1.1, 1.4] },
  'podcast': { intervalRange: [15, 30], preferredTypes: ['drift', 'push-in'], zoomLevel: [1.05, 1.2] },
  'high-retention': { intervalRange: [8, 12], preferredTypes: ['snap', 'push-in', 'pull-out'], zoomLevel: [1.3, 2.0] },
  'clickbait': { intervalRange: [4, 8], preferredTypes: ['snap', 'push-in'], zoomLevel: [1.3, 2.0] },
};

export async function generateZoomSuggestionsAI(
  lines: TranscriptLine[],
  contentStyle: ContentStyle,
  duration: number
): Promise<ZoomSuggestion[]> {
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  if (activeLines.length === 0) return [];

  const transcript = activeLines.map((l) =>
    `${l.startTime.toFixed(1)}-${l.endTime.toFixed(1)}s: ${l.text}`
  ).join('\n');

  const { result, usedAI } = await callAI(
    `You are a video editor AI. Place zoom keyframes on this video based on the transcript and "${contentStyle}" content style.

TRANSCRIPT:
${transcript}

DURATION: ${duration}s
STYLE: ${contentStyle}

Zoom types: "push-in" (slow zoom in), "snap" (quick zoom), "drift" (subtle movement), "pull-out" (zoom out reveal)

Rules for ${contentStyle}:
- Entertainment: snap zooms every 5-10s on emphasis, 1.2-1.8x
- Education: gentle push-ins on key points every 10-20s, 1.1-1.4x
- Podcast: subtle drifts every 15-30s, 1.05-1.2x
- High retention: frequent snaps and pull-outs every 8-12s, 1.3-2.0x
- Clickbait: rapid snaps every 4-8s, 1.3-2.0x

Place zooms at moments of emphasis, topic changes, or key points.

Return a JSON array:
[
  { "time": 5.0, "duration": 1.5, "level": 1.3, "type": "snap", "reason": "Emphasis on 'exciting'" }
]

Return ONLY the JSON array.`
  );

  if (usedAI && result) {
    const parsed = parseAIJson<Array<{ time: number; duration: number; level: number; type: ZoomType; reason: string }>>(result);
    if (parsed && Array.isArray(parsed)) {
      return parsed.map((s) => ({
        id: generateId(),
        time: s.time,
        duration: s.duration || 1.5,
        level: s.level,
        type: s.type,
        reason: s.reason,
        accepted: null,
      }));
    }
  }

  return generateZoomSuggestions(lines, contentStyle, duration);
}

/** Rule-based fallback */
export function generateZoomSuggestions(
  lines: TranscriptLine[],
  contentStyle: ContentStyle,
  duration: number
): ZoomSuggestion[] {
  const config = ZOOM_CONFIGS[contentStyle];
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  const suggestions: ZoomSuggestion[] = [];
  const [minInterval] = config.intervalRange;
  let lastZoomTime = 0;

  for (const line of activeLines) {
    if (line.startTime - lastZoomTime < minInterval) continue;
    if (line.startTime > duration) break;
    const typeIndex = suggestions.length % config.preferredTypes.length;
    const type = config.preferredTypes[typeIndex];
    const [minLevel, maxLevel] = config.zoomLevel;
    const level = minLevel + (Math.random() * 0.3 + 0.2) * (maxLevel - minLevel);
    const zoomDuration = type === 'snap' ? 0.3 : type === 'drift' ? 3.0 : 1.5;

    suggestions.push({
      id: generateId(), time: line.startTime, duration: zoomDuration,
      level: Math.round(level * 100) / 100, type,
      reason: `${type === 'snap' ? 'Quick snap' : type === 'push-in' ? 'Slow push-in' : type === 'drift' ? 'Subtle drift' : 'Pull-out'} on: "${line.text.substring(0, 40)}..."`,
      accepted: null,
    });
    lastZoomTime = line.startTime;
  }
  return suggestions;
}

export function zoomSuggestionsToKeyframes(suggestions: ZoomSuggestion[]): ZoomKeyframe[] {
  return suggestions.filter((s) => s.accepted === true).map((s) => {
    // Map zoom type to keyframe timing
    let rampDuration: number;
    let holdDuration: number;
    let curveType: ZoomKeyframe['curveType'];

    switch (s.type) {
      case 'snap':
        rampDuration = 0.1;   // near-instant
        holdDuration = 1.5;   // hold the zoom
        curveType = 'snap';
        break;
      case 'push-in':
        rampDuration = 0.8;   // smooth ramp
        holdDuration = 2.0;
        curveType = 'ease-in-out';
        break;
      case 'drift':
        rampDuration = 1.5;   // slow drift
        holdDuration = 3.0;
        curveType = 'linear';
        break;
      case 'pull-out':
        rampDuration = 0.6;
        holdDuration = 1.0;
        curveType = 'ease-out';
        break;
      default:
        rampDuration = 0.5;
        holdDuration = 1.5;
        curveType = 'ease-in-out';
    }

    return {
      id: generateId(),
      time: s.time,
      duration: rampDuration,
      holdDuration,
      level: s.level,
      curveType,
    };
  });
}

export function getZoomConfig(style: ContentStyle): ZoomConfig {
  return ZOOM_CONFIGS[style];
}
