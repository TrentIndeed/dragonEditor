import { SFXItem, SFXPlacement, SFXCategory, ContentStyle, TranscriptLine, TimelineClip } from './types';
import { generateId } from './utils';

/**
 * Stage 6: Sound Effects
 * - Built-in SFX library
 * - AI places SFX based on content style and transcript context
 */

// ── Built-in SFX Library ──

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

// ── Style-based SFX rules ──

interface SFXRule {
  trigger: 'cut' | 'emphasis' | 'key-point' | 'punchline' | 'transition' | 'text-overlay';
  categories: SFXCategory[];
  volume: number; // 0-1
}

const SFX_RULES: Record<ContentStyle, SFXRule[]> = {
  'entertainment': [
    { trigger: 'cut', categories: ['whoosh', 'swoosh'], volume: 0.6 },
    { trigger: 'emphasis', categories: ['pop', 'ding'], volume: 0.5 },
    { trigger: 'punchline', categories: ['bass-drop', 'impact'], volume: 0.7 },
  ],
  'education': [
    { trigger: 'key-point', categories: ['ding', 'pop'], volume: 0.3 },
    { trigger: 'transition', categories: ['whoosh'], volume: 0.25 },
  ],
  'podcast': [
    { trigger: 'transition', categories: ['whoosh'], volume: 0.2 },
  ],
  'high-retention': [
    { trigger: 'cut', categories: ['whoosh', 'swoosh'], volume: 0.5 },
    { trigger: 'emphasis', categories: ['pop', 'impact'], volume: 0.6 },
    { trigger: 'punchline', categories: ['bass-drop'], volume: 0.7 },
    { trigger: 'text-overlay', categories: ['typing'], volume: 0.3 },
  ],
  'clickbait': [
    { trigger: 'cut', categories: ['whoosh', 'swoosh'], volume: 0.7 },
    { trigger: 'emphasis', categories: ['pop', 'ding', 'notification'], volume: 0.6 },
    { trigger: 'punchline', categories: ['bass-drop', 'impact'], volume: 0.8 },
  ],
};

/** Generate SFX placements from transcript and content style */
export function generateSFXPlacements(
  lines: TranscriptLine[],
  clips: TimelineClip[],
  contentStyle: ContentStyle
): SFXPlacement[] {
  const rules = SFX_RULES[contentStyle];
  const activeLines = lines.filter((l) => !l.deleted && !l.text.startsWith('['));
  const placements: SFXPlacement[] = [];
  const usedTimes = new Set<number>();

  // Place SFX at cuts (gaps between clips)
  const videoClips = clips.filter((c) => c.trackType === 'video').sort((a, b) => a.startTime - b.startTime);
  const cutRule = rules.find((r) => r.trigger === 'cut');
  if (cutRule) {
    for (let i = 1; i < videoClips.length; i++) {
      const cutTime = videoClips[i].startTime;
      if (usedTimes.has(Math.round(cutTime))) continue;
      const sfx = pickSFX(cutRule.categories);
      if (sfx) {
        placements.push({
          id: generateId(),
          sfxId: sfx.id,
          sfxName: sfx.name,
          time: cutTime,
          duration: sfx.duration,
          volume: cutRule.volume,
          reason: `Whoosh on cut at ${formatTime(cutTime)}`,
          accepted: null,
        });
        usedTimes.add(Math.round(cutTime));
      }
    }
  }

  // Place SFX on emphasis words / key points
  const emphasisRule = rules.find((r) => r.trigger === 'emphasis' || r.trigger === 'key-point');
  if (emphasisRule) {
    for (let i = 0; i < activeLines.length; i += 3) { // every 3rd line
      const line = activeLines[i];
      if (usedTimes.has(Math.round(line.startTime))) continue;
      const sfx = pickSFX(emphasisRule.categories);
      if (sfx) {
        placements.push({
          id: generateId(),
          sfxId: sfx.id,
          sfxName: sfx.name,
          time: line.startTime,
          duration: sfx.duration,
          volume: emphasisRule.volume,
          reason: `${sfx.category} on emphasis: "${line.text.substring(0, 30)}..."`,
          accepted: null,
        });
        usedTimes.add(Math.round(line.startTime));
      }
    }
  }

  // Place bass drop on punchlines (last 20% of content)
  const punchlineRule = rules.find((r) => r.trigger === 'punchline');
  if (punchlineRule && activeLines.length > 3) {
    const punchlineIndex = Math.floor(activeLines.length * 0.8);
    const line = activeLines[punchlineIndex];
    if (line && !usedTimes.has(Math.round(line.startTime))) {
      const sfx = pickSFX(punchlineRule.categories);
      if (sfx) {
        placements.push({
          id: generateId(),
          sfxId: sfx.id,
          sfxName: sfx.name,
          time: line.startTime,
          duration: sfx.duration,
          volume: punchlineRule.volume,
          reason: `${sfx.category} on punchline: "${line.text.substring(0, 30)}..."`,
          accepted: null,
        });
      }
    }
  }

  return placements.sort((a, b) => a.time - b.time);
}

function pickSFX(categories: SFXCategory[]): SFXItem | null {
  const matching = SFX_LIBRARY.filter((s) => categories.includes(s.category));
  if (matching.length === 0) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Convert accepted SFX placements to timeline clips */
export function sfxPlacementsToTimelineClips(placements: SFXPlacement[]): TimelineClip[] {
  return placements
    .filter((p) => p.accepted === true)
    .map((p) => ({
      id: `sfx-${p.id}`,
      trackType: 'sfx' as const,
      name: p.sfxName,
      startTime: p.time,
      duration: p.duration,
      sourceOffset: 0,
      color: '#06B6D4',
    }));
}

/** Get SFX rules for a content style */
export function getSFXRules(style: ContentStyle) {
  return SFX_RULES[style];
}
