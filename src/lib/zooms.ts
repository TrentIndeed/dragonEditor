import { ZoomSuggestion, ZoomKeyframe, ZoomType, ContentStyle, TranscriptLine, TimelineClip } from './types';
import { generateId } from './utils';

/**
 * Stage 3: Zooms & Reframe
 * - AI places zooms based on content style
 * - Zoom types: push-in, snap, drift, pull-out
 * - For Shorts: also reframes to 9:16 with face tracking
 */

interface ZoomConfig {
  intervalRange: [number, number]; // seconds between zooms
  preferredTypes: ZoomType[];
  zoomLevel: [number, number]; // min/max zoom
}

const ZOOM_CONFIGS: Record<ContentStyle, ZoomConfig> = {
  'entertainment': {
    intervalRange: [5, 10],
    preferredTypes: ['snap', 'push-in'],
    zoomLevel: [1.2, 1.8],
  },
  'education': {
    intervalRange: [10, 20],
    preferredTypes: ['push-in', 'drift'],
    zoomLevel: [1.1, 1.4],
  },
  'podcast': {
    intervalRange: [15, 30],
    preferredTypes: ['drift', 'push-in'],
    zoomLevel: [1.05, 1.2],
  },
  'high-retention': {
    intervalRange: [8, 12],
    preferredTypes: ['snap', 'push-in', 'pull-out'],
    zoomLevel: [1.3, 2.0],
  },
  'clickbait': {
    intervalRange: [4, 8],
    preferredTypes: ['snap', 'push-in'],
    zoomLevel: [1.3, 2.0],
  },
};

/** Generate zoom suggestions from transcript and content style */
export function generateZoomSuggestions(
  lines: TranscriptLine[],
  contentStyle: ContentStyle,
  duration: number
): ZoomSuggestion[] {
  const config = ZOOM_CONFIGS[contentStyle];
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  const suggestions: ZoomSuggestion[] = [];

  const [minInterval, maxInterval] = config.intervalRange;
  const avgInterval = (minInterval + maxInterval) / 2;

  // Place zooms at intervals, anchored to transcript lines
  let lastZoomTime = 0;

  for (const line of activeLines) {
    if (line.startTime - lastZoomTime < minInterval) continue;
    if (line.startTime > duration) break;

    // Pick a zoom type
    const typeIndex = suggestions.length % config.preferredTypes.length;
    const type = config.preferredTypes[typeIndex];

    // Pick a zoom level
    const [minLevel, maxLevel] = config.zoomLevel;
    const level = minLevel + (Math.random() * 0.3 + 0.2) * (maxLevel - minLevel);

    // Duration depends on type
    const zoomDuration = type === 'snap' ? 0.3 : type === 'drift' ? 3.0 : 1.5;

    suggestions.push({
      id: generateId(),
      time: line.startTime,
      duration: zoomDuration,
      level: Math.round(level * 100) / 100,
      type,
      reason: getZoomReason(line, type),
      accepted: null,
    });

    lastZoomTime = line.startTime;
  }

  return suggestions;
}

function getZoomReason(line: TranscriptLine, type: ZoomType): string {
  const text = line.text.substring(0, 40);
  switch (type) {
    case 'snap': return `Quick snap zoom on emphasis: "${text}..."`;
    case 'push-in': return `Slow push-in for emphasis: "${text}..."`;
    case 'drift': return `Subtle drift during: "${text}..."`;
    case 'pull-out': return `Pull-out reveal at: "${text}..."`;
  }
}

/** Convert accepted zoom suggestions to keyframes */
export function zoomSuggestionsToKeyframes(suggestions: ZoomSuggestion[]): ZoomKeyframe[] {
  return suggestions
    .filter((s) => s.accepted === true)
    .map((s) => ({
      id: generateId(),
      time: s.time,
      level: s.level,
      curveType: s.type === 'snap' ? 'snap' as const
        : s.type === 'drift' ? 'linear' as const
        : 'ease-out' as const,
    }));
}

/** Get the zoom config for a content style */
export function getZoomConfig(style: ContentStyle): ZoomConfig {
  return ZOOM_CONFIGS[style];
}
