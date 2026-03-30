import { TrimSuggestion, TranscriptLine, TimelineClip } from './types';
import { generateId } from './utils';
import { FILLER_WORDS } from './constants';

/**
 * Generate trim suggestions based on actual transcript lines and timeline clips.
 * Detects: filler words, silence/dead space, repeated starts.
 */
export function generateTrimSuggestions(
  lines: TranscriptLine[],
  clips: TimelineClip[]
): TrimSuggestion[] {
  const suggestions: TrimSuggestion[] = [];
  const videoClips = clips.filter((c) => c.trackType === 'video');
  if (videoClips.length === 0 && lines.length === 0) return [];

  const activeLines = lines.filter((l) => !l.deleted);

  // If we have transcript lines, generate suggestions from them
  if (activeLines.length > 0) {
    for (const line of activeLines) {
      const text = line.text.toLowerCase();

      // Detect bracketed non-speech (silence, searching, etc.)
      if (line.text.startsWith('[')) {
        suggestions.push({
          id: generateId(),
          startTime: line.startTime,
          endTime: line.endTime,
          reason: `Dead space — ${line.text}`,
          accepted: null,
          transcriptLineIds: [line.id],
        });
        continue;
      }

      // Detect lines that are mostly filler words
      const words = text.split(/\s+/);
      const fillerCount = words.filter((w) =>
        FILLER_WORDS.some((fw) => w === fw.toLowerCase() || text.includes(fw.toLowerCase()))
      ).length;
      const fillerRatio = words.length > 0 ? fillerCount / words.length : 0;

      if (fillerRatio > 0.4 && words.length <= 10) {
        suggestions.push({
          id: generateId(),
          startTime: line.startTime,
          endTime: line.endTime,
          reason: `Filler words: "${line.text}"`,
          accepted: null,
          transcriptLineIds: [line.id],
        });
        continue;
      }

      // Detect false starts ("let me just", "hold on", "wait")
      if (/^(let me just|hold on|wait|uh let me|um so)/.test(text)) {
        suggestions.push({
          id: generateId(),
          startTime: line.startTime,
          endTime: line.endTime,
          reason: `False start: "${line.text}"`,
          accepted: null,
          transcriptLineIds: [line.id],
        });
      }
    }
  }

  // If no transcript but we have clips, suggest trimming gaps
  if (activeLines.length === 0 && videoClips.length > 0) {
    const sorted = [...videoClips].sort((a, b) => a.startTime - b.startTime);
    const totalDuration = sorted[sorted.length - 1].startTime + sorted[sorted.length - 1].duration;

    // Suggest trimming first and last 5% as intro/outro padding
    const trimStart = totalDuration * 0.02;
    const trimEnd = totalDuration * 0.98;
    if (trimStart > 1) {
      suggestions.push({
        id: generateId(),
        startTime: 0,
        endTime: trimStart,
        reason: 'Trim intro padding',
        accepted: null,
        transcriptLineIds: [],
      });
    }
    if (totalDuration - trimEnd > 1) {
      suggestions.push({
        id: generateId(),
        startTime: trimEnd,
        endTime: totalDuration,
        reason: 'Trim outro padding',
        accepted: null,
        transcriptLineIds: [],
      });
    }
  }

  return suggestions;
}
