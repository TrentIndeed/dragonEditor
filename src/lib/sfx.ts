import { SFXItem, SFXPlacement, SFXCategory, ContentStyle, TranscriptLine, TimelineClip } from './types';
import { generateId } from './utils';
import { callAI, parseAIJson } from './ai';

/**
 * Stage 6: Sound Effects
 * AI places SFX based on transcript context.
 * Falls back to rule-based placement.
 */

export const SFX_LIBRARY: SFXItem[] = [
  { id: 'sfx-whoosh-1', name: 'Whoosh Clean', category: 'whoosh', duration: 0.5, builtIn: true },
  { id: 'sfx-whoosh-2', name: 'Whoosh Heavy', category: 'whoosh', duration: 0.7, builtIn: true },
  { id: 'sfx-pop-1', name: 'Pop Bright', category: 'pop', duration: 0.2, builtIn: true },
  { id: 'sfx-pop-2', name: 'Pop Soft', category: 'pop', duration: 0.3, builtIn: true },
  { id: 'sfx-ding-1', name: 'Ding Notification', category: 'ding', duration: 0.6, builtIn: true },
  { id: 'sfx-ding-2', name: 'Ding Success', category: 'ding', duration: 0.8, builtIn: true },
  { id: 'sfx-impact-1', name: 'Impact Bass', category: 'impact', duration: 0.4, builtIn: true },
  { id: 'sfx-impact-2', name: 'Impact Cinematic', category: 'impact', duration: 1.2, builtIn: true },
  { id: 'sfx-swoosh-1', name: 'Swoosh Fast', category: 'swoosh', duration: 0.3, builtIn: true },
  { id: 'sfx-notif-1', name: 'Notification Ping', category: 'notification', duration: 0.4, builtIn: true },
  { id: 'sfx-ambient-1', name: 'Room Tone', category: 'ambient', duration: 5.0, builtIn: true },
  { id: 'sfx-typing-1', name: 'Keyboard Typing', category: 'typing', duration: 2.0, builtIn: true },
  { id: 'sfx-bass-1', name: 'Bass Drop', category: 'bass-drop', duration: 1.5, builtIn: true },
  { id: 'sfx-laugh-1', name: 'Laugh Track', category: 'laugh', duration: 1.0, builtIn: true },
];

const SFX_NAMES = SFX_LIBRARY.map((s) => `${s.name} (${s.category}, ${s.duration}s)`).join(', ');

export async function generateSFXPlacementsAI(
  lines: TranscriptLine[],
  clips: TimelineClip[],
  contentStyle: ContentStyle
): Promise<SFXPlacement[]> {
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  const videoClips = clips.filter((c) => c.trackType === 'video');

  const transcript = activeLines.map((l) =>
    `${l.startTime.toFixed(1)}-${l.endTime.toFixed(1)}s: ${l.text}`
  ).join('\n');

  const cutPoints = videoClips.length > 1
    ? videoClips.slice(1).map((c) => c.startTime.toFixed(1) + 's').join(', ')
    : 'none';

  const { result, usedAI } = await callAI(
    `You are a video editor AI. Place sound effects on this video.

TRANSCRIPT:
${transcript}

CUT POINTS: ${cutPoints}
STYLE: ${contentStyle}

Available SFX: ${SFX_NAMES}

Rules:
- Place whooshes on cuts/transitions
- Place pops/dings on emphasis words or key points
- Place bass drops on dramatic moments or punchlines
- ${contentStyle === 'podcast' ? 'Minimal SFX, just subtle transitions' : contentStyle === 'entertainment' ? 'Frequent, punchy SFX' : 'Moderate, tasteful SFX'}
- Set volume 0.0-1.0 (lower for subtle, higher for impact)

Return a JSON array:
[
  { "sfxName": "Whoosh Clean", "sfxCategory": "whoosh", "time": 14.5, "duration": 0.5, "volume": 0.6, "reason": "Whoosh on cut point" }
]

Return ONLY the JSON array.`
  );

  if (usedAI && result) {
    const parsed = parseAIJson<Array<{ sfxName: string; sfxCategory: string; time: number; duration: number; volume: number; reason: string }>>(result);
    if (parsed && Array.isArray(parsed)) {
      return parsed.map((s) => {
        const sfx = SFX_LIBRARY.find((lib) => lib.name === s.sfxName) || SFX_LIBRARY.find((lib) => lib.category === s.sfxCategory) || SFX_LIBRARY[0];
        return {
          id: generateId(), sfxId: sfx.id, sfxName: sfx.name,
          time: s.time, duration: s.duration || sfx.duration, volume: s.volume || 0.5,
          reason: s.reason, accepted: null,
        };
      });
    }
  }

  return generateSFXPlacements(lines, clips, contentStyle);
}

/** Rule-based fallback */
export function generateSFXPlacements(lines: TranscriptLine[], clips: TimelineClip[], contentStyle: ContentStyle): SFXPlacement[] {
  const rules = getSFXRules(contentStyle);
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  const placements: SFXPlacement[] = [];
  const usedTimes = new Set<number>();
  const videoClips = clips.filter((c) => c.trackType === 'video').sort((a, b) => a.startTime - b.startTime);

  const cutRule = rules.find((r) => r.trigger === 'cut');
  if (cutRule) {
    for (let i = 1; i < videoClips.length; i++) {
      const cutTime = videoClips[i].startTime;
      if (usedTimes.has(Math.round(cutTime))) continue;
      const sfx = pickSFX(cutRule.categories);
      if (sfx) { placements.push({ id: generateId(), sfxId: sfx.id, sfxName: sfx.name, time: cutTime, duration: sfx.duration, volume: cutRule.volume, reason: `Whoosh on cut at ${formatTime(cutTime)}`, accepted: null }); usedTimes.add(Math.round(cutTime)); }
    }
  }

  const emphasisRule = rules.find((r) => r.trigger === 'emphasis' || r.trigger === 'key-point');
  if (emphasisRule) {
    for (let i = 0; i < activeLines.length; i += 3) {
      const line = activeLines[i];
      if (usedTimes.has(Math.round(line.startTime))) continue;
      const sfx = pickSFX(emphasisRule.categories);
      if (sfx) { placements.push({ id: generateId(), sfxId: sfx.id, sfxName: sfx.name, time: line.startTime, duration: sfx.duration, volume: emphasisRule.volume, reason: `${sfx.category} on emphasis: "${line.text.substring(0, 30)}..."`, accepted: null }); usedTimes.add(Math.round(line.startTime)); }
    }
  }

  const punchlineRule = rules.find((r) => r.trigger === 'punchline');
  if (punchlineRule && activeLines.length > 3) {
    const line = activeLines[Math.floor(activeLines.length * 0.8)];
    if (line && !usedTimes.has(Math.round(line.startTime))) {
      const sfx = pickSFX(punchlineRule.categories);
      if (sfx) placements.push({ id: generateId(), sfxId: sfx.id, sfxName: sfx.name, time: line.startTime, duration: sfx.duration, volume: punchlineRule.volume, reason: `${sfx.category} on punchline`, accepted: null });
    }
  }

  return placements.sort((a, b) => a.time - b.time);
}

interface SFXRule { trigger: string; categories: SFXCategory[]; volume: number }
const SFX_RULES: Record<ContentStyle, SFXRule[]> = {
  'entertainment': [{ trigger: 'cut', categories: ['whoosh', 'swoosh'], volume: 0.6 }, { trigger: 'emphasis', categories: ['pop', 'ding'], volume: 0.5 }, { trigger: 'punchline', categories: ['bass-drop', 'impact'], volume: 0.7 }],
  'education': [{ trigger: 'key-point', categories: ['ding', 'pop'], volume: 0.3 }, { trigger: 'transition', categories: ['whoosh'], volume: 0.25 }],
  'podcast': [{ trigger: 'transition', categories: ['whoosh'], volume: 0.2 }],
  'high-retention': [{ trigger: 'cut', categories: ['whoosh', 'swoosh'], volume: 0.5 }, { trigger: 'emphasis', categories: ['pop', 'impact'], volume: 0.6 }, { trigger: 'punchline', categories: ['bass-drop'], volume: 0.7 }, { trigger: 'text-overlay', categories: ['typing'], volume: 0.3 }],
  'clickbait': [{ trigger: 'cut', categories: ['whoosh', 'swoosh'], volume: 0.7 }, { trigger: 'emphasis', categories: ['pop', 'ding', 'notification'], volume: 0.6 }, { trigger: 'punchline', categories: ['bass-drop', 'impact'], volume: 0.8 }],
};

function pickSFX(categories: SFXCategory[]): SFXItem | null {
  const matching = SFX_LIBRARY.filter((s) => categories.includes(s.category));
  return matching.length > 0 ? matching[Math.floor(Math.random() * matching.length)] : null;
}
function formatTime(s: number) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }
export function sfxPlacementsToTimelineClips(placements: SFXPlacement[]): TimelineClip[] {
  return placements.filter((p) => p.accepted === true).map((p) => ({ id: `sfx-${p.id}`, trackType: 'sfx' as const, name: p.sfxName, startTime: p.time, duration: p.duration, sourceOffset: 0, color: '#06B6D4' }));
}
export function getSFXRules(style: ContentStyle) { return SFX_RULES[style]; }
