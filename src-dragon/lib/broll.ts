import { BRollSuggestion, OverlayMode, TranscriptLine, ContentStyle } from './types';
import { generateId } from './utils';
import { callAI, parseAIJson } from './ai';

/**
 * Stage 4: B-Roll & Overlays
 * AI identifies moments that need visual support.
 * Falls back to keyword matching.
 */

interface BRollConfig { maxSuggestions: number; preferredModes: OverlayMode[] }

const BROLL_CONFIGS: Record<ContentStyle, BRollConfig> = {
  'entertainment': { maxSuggestions: 6, preferredModes: ['full-overlay', 'pip'] },
  'education': { maxSuggestions: 8, preferredModes: ['pause-show', 'full-overlay', 'pip'] },
  'podcast': { maxSuggestions: 3, preferredModes: ['pip'] },
  'high-retention': { maxSuggestions: 7, preferredModes: ['full-overlay', 'pip'] },
  'clickbait': { maxSuggestions: 5, preferredModes: ['full-overlay', 'pip'] },
};

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

export async function generateBRollSuggestionsAI(
  lines: TranscriptLine[],
  contentStyle: ContentStyle
): Promise<BRollSuggestion[]> {
  const config = BROLL_CONFIGS[contentStyle];
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  if (activeLines.length === 0) return [];

  const transcript = activeLines.map((l) =>
    `${l.startTime.toFixed(1)}-${l.endTime.toFixed(1)}s: ${l.text}`
  ).join('\n');

  const { result, usedAI } = await callAI(
    `You are a video editor AI. Identify moments in this transcript that need B-roll or visual overlays.

TRANSCRIPT:
${transcript}

STYLE: ${contentStyle} (max ${config.maxSuggestions} suggestions)

Overlay modes:
- "pip" (picture-in-picture, small overlay)
- "full-overlay" (full screen cutaway)
- "pause-show" (freeze frame with annotation)

Look for moments where the speaker mentions something visual (showing, demonstrating, comparing, data, results, examples, tools, steps).

Return a JSON array:
[
  { "time": 14.5, "duration": 3.2, "description": "Screen recording of the tool", "overlayMode": "full-overlay", "reason": "Speaker says 'let me show you how it works'" }
]

Return ONLY the JSON array. Max ${config.maxSuggestions} suggestions.`
  );

  if (usedAI && result) {
    const parsed = parseAIJson<Array<{ time: number; duration: number; description: string; overlayMode: OverlayMode; reason: string }>>(result);
    if (parsed && Array.isArray(parsed)) {
      return parsed.slice(0, config.maxSuggestions).map((s) => ({
        id: generateId(), time: s.time, duration: s.duration,
        description: s.description, overlayMode: s.overlayMode, reason: s.reason, accepted: null,
      }));
    }
  }

  return generateBRollSuggestions(lines, contentStyle);
}

/** Rule-based fallback */
export function generateBRollSuggestions(lines: TranscriptLine[], contentStyle: ContentStyle): BRollSuggestion[] {
  const config = BROLL_CONFIGS[contentStyle];
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  const suggestions: BRollSuggestion[] = [];

  for (const line of activeLines) {
    if (suggestions.length >= config.maxSuggestions) break;
    const textLower = line.text.toLowerCase();
    for (const [keyword, info] of Object.entries(BROLL_KEYWORDS)) {
      if (textLower.includes(keyword) && suggestions.length < config.maxSuggestions) {
        const mode = config.preferredModes.includes(info.mode) ? info.mode : config.preferredModes[0];
        suggestions.push({ id: generateId(), time: line.startTime, duration: line.endTime - line.startTime, description: info.description, overlayMode: mode, reason: `"${line.text.substring(0, 40)}..." — ${info.description}`, accepted: null });
        break;
      }
    }
  }
  return suggestions;
}

export function brollSuggestionsToTimelineClips(suggestions: BRollSuggestion[]) {
  return suggestions.filter((s) => s.accepted === true).map((s) => ({
    id: `broll-${s.id}`, trackType: 'broll' as const, name: s.description.substring(0, 30),
    startTime: s.time, duration: s.duration, sourceOffset: 0, color: '#A060E0',
  }));
}

export function getBRollConfig(style: ContentStyle) { return BROLL_CONFIGS[style]; }
