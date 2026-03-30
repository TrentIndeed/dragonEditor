import { TrimSuggestion, TranscriptLine, TimelineClip } from './types';
import { generateId } from './utils';
import { FILLER_WORDS } from './constants';
import { callAI, parseAIJson } from './ai';

/**
 * Stage 1: Trim & Cut
 * AI analyzes transcript to find dead space, filler words, false starts.
 * Falls back to rule-based detection if AI is unavailable.
 */

export async function generateTrimSuggestionsAI(
  lines: TranscriptLine[],
  clips: TimelineClip[]
): Promise<TrimSuggestion[]> {
  const activeLines = lines.filter((l) => !l.deleted);
  if (activeLines.length === 0 && clips.length === 0) return [];

  const transcript = activeLines.map((l) =>
    `[${l.id}] ${l.startTime.toFixed(1)}-${l.endTime.toFixed(1)}s: ${l.text}`
  ).join('\n');

  const { result, usedAI } = await callAI(
    `You are a video editor AI. Analyze this transcript and find segments to cut.

TRANSCRIPT:
${transcript}

Find segments that should be removed:
- Dead space, silence, non-speech ([brackets] indicate non-speech)
- Filler word clusters (um, uh, like, you know, basically, literally, actually)
- False starts ("let me just", "hold on", "wait", "uh let me")
- Repeated takes or restarts

Return a JSON array of cut suggestions:
[
  {
    "startTime": 9.0,
    "endTime": 14.5,
    "reason": "Dead space — searching for something",
    "transcriptLineIds": ["tl-5"]
  }
]

Only include segments worth cutting. If the transcript is clean, return [].
Return ONLY the JSON array, no other text.`
  );

  if (usedAI && result) {
    const parsed = parseAIJson<Array<{ startTime: number; endTime: number; reason: string; transcriptLineIds: string[] }>>(result);
    if (parsed && Array.isArray(parsed)) {
      return parsed.map((s) => ({
        id: generateId(),
        startTime: s.startTime,
        endTime: s.endTime,
        reason: s.reason,
        accepted: null,
        transcriptLineIds: s.transcriptLineIds || [],
      }));
    }
  }

  // Fallback to rule-based
  return generateTrimSuggestions(lines, clips);
}

/** Rule-based fallback (original mock) */
export function generateTrimSuggestions(
  lines: TranscriptLine[],
  clips: TimelineClip[]
): TrimSuggestion[] {
  const suggestions: TrimSuggestion[] = [];
  const videoClips = clips.filter((c) => c.trackType === 'video');
  if (videoClips.length === 0 && lines.length === 0) return [];

  const activeLines = lines.filter((l) => !l.deleted);

  if (activeLines.length > 0) {
    for (const line of activeLines) {
      const text = line.text.toLowerCase();

      if (line.text.startsWith('[')) {
        suggestions.push({ id: generateId(), startTime: line.startTime, endTime: line.endTime, reason: `Dead space — ${line.text}`, accepted: null, transcriptLineIds: [line.id] });
        continue;
      }

      const words = text.split(/\s+/);
      const fillerCount = words.filter((w) => FILLER_WORDS.some((fw) => w === fw.toLowerCase())).length;
      if (words.length > 0 && fillerCount / words.length > 0.4 && words.length <= 10) {
        suggestions.push({ id: generateId(), startTime: line.startTime, endTime: line.endTime, reason: `Filler words: "${line.text}"`, accepted: null, transcriptLineIds: [line.id] });
        continue;
      }

      if (/^(let me just|hold on|wait|uh let me|um so)/.test(text)) {
        suggestions.push({ id: generateId(), startTime: line.startTime, endTime: line.endTime, reason: `False start: "${line.text}"`, accepted: null, transcriptLineIds: [line.id] });
      }
    }
  }

  if (activeLines.length === 0 && videoClips.length > 0) {
    const sorted = [...videoClips].sort((a, b) => a.startTime - b.startTime);
    const totalDuration = sorted[sorted.length - 1].startTime + sorted[sorted.length - 1].duration;
    const trimStart = totalDuration * 0.02;
    const trimEnd = totalDuration * 0.98;
    if (trimStart > 1) suggestions.push({ id: generateId(), startTime: 0, endTime: trimStart, reason: 'Trim intro padding', accepted: null, transcriptLineIds: [] });
    if (totalDuration - trimEnd > 1) suggestions.push({ id: generateId(), startTime: trimEnd, endTime: totalDuration, reason: 'Trim outro padding', accepted: null, transcriptLineIds: [] });
  }

  return suggestions;
}
