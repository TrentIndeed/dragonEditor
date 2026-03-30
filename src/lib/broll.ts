import { BRollSuggestion, OverlayMode, TranscriptLine, ContentStyle } from './types';
import { generateId } from './utils';

/**
 * Stage 4: B-Roll & Overlays
 * AI suggests placement points based on transcript context.
 * Three overlay modes: PiP, full overlay, pause & show.
 */

const BROLL_KEYWORDS: Record<string, { description: string; mode: OverlayMode }> = {
  'show': { description: 'Screen recording or demo footage', mode: 'full-overlay' },
  'look': { description: 'Visual example or reference image', mode: 'full-overlay' },
  'example': { description: 'Example footage or screenshot', mode: 'pip' },
  'data': { description: 'Data visualization or chart', mode: 'pause-show' },
  'step': { description: 'Step-by-step walkthrough footage', mode: 'full-overlay' },
  'tool': { description: 'Product or tool demonstration', mode: 'pip' },
  'result': { description: 'Results screenshot or comparison', mode: 'pause-show' },
  'works': { description: 'How-it-works explanation visual', mode: 'full-overlay' },
};

interface BRollConfig {
  maxSuggestions: number;
  preferredModes: OverlayMode[];
}

const BROLL_CONFIGS: Record<ContentStyle, BRollConfig> = {
  'entertainment': { maxSuggestions: 6, preferredModes: ['full-overlay', 'pip'] },
  'education': { maxSuggestions: 8, preferredModes: ['pause-show', 'full-overlay', 'pip'] },
  'podcast': { maxSuggestions: 3, preferredModes: ['pip'] },
  'high-retention': { maxSuggestions: 7, preferredModes: ['full-overlay', 'pip'] },
  'clickbait': { maxSuggestions: 5, preferredModes: ['full-overlay', 'pip'] },
};

export function generateBRollSuggestions(
  lines: TranscriptLine[],
  contentStyle: ContentStyle
): BRollSuggestion[] {
  const config = BROLL_CONFIGS[contentStyle];
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  const suggestions: BRollSuggestion[] = [];

  for (const line of activeLines) {
    if (suggestions.length >= config.maxSuggestions) break;
    const textLower = line.text.toLowerCase();

    for (const [keyword, info] of Object.entries(BROLL_KEYWORDS)) {
      if (textLower.includes(keyword) && suggestions.length < config.maxSuggestions) {
        const mode = config.preferredModes.includes(info.mode)
          ? info.mode
          : config.preferredModes[0];

        suggestions.push({
          id: generateId(),
          time: line.startTime,
          duration: line.endTime - line.startTime,
          description: info.description,
          overlayMode: mode,
          reason: `"${line.text.substring(0, 40)}..." — ${info.description}`,
          accepted: null,
        });
        break; // one suggestion per line
      }
    }
  }

  return suggestions;
}

export function brollSuggestionsToTimelineClips(suggestions: BRollSuggestion[]) {
  return suggestions
    .filter((s) => s.accepted === true)
    .map((s) => ({
      id: `broll-${s.id}`,
      trackType: 'broll' as const,
      name: s.description.substring(0, 30),
      startTime: s.time,
      duration: s.duration,
      sourceOffset: 0,
      color: '#A855F7',
    }));
}

export function getBRollConfig(style: ContentStyle) {
  return BROLL_CONFIGS[style];
}
