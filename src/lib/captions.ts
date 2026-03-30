import { TranscriptLine, CaptionBlock, CaptionWord, CaptionStyle, CaptionStyleId, ContentStyle } from './types';
import { generateId } from './utils';

// ── Caption style presets ──

export const CAPTION_STYLES: Record<CaptionStyleId, CaptionStyle> = {
  'karaoke': {
    id: 'karaoke',
    name: 'Karaoke Pop',
    description: 'Large bold text with word-by-word color highlights. Hormozi/MrBeast style.',
    fontWeight: 'extrabold',
    fontSize: 'xl',
    position: 'center',
    animation: 'word-highlight',
    highlight: true,
    speakerLabel: false,
    bgStyle: 'none',
  },
  'subtitle-bar': {
    id: 'subtitle-bar',
    name: 'Clean Subtitle',
    description: 'Clean subtitle bar with keyword highlighting. Professional and readable.',
    fontWeight: 'normal',
    fontSize: 'md',
    position: 'bottom',
    animation: 'fade',
    highlight: true,
    speakerLabel: false,
    bgStyle: 'box',
  },
  'speaker-labeled': {
    id: 'speaker-labeled',
    name: 'Speaker Labels',
    description: 'Lower-third captions with speaker name badges. Great for podcasts.',
    fontWeight: 'normal',
    fontSize: 'md',
    position: 'lower-third',
    animation: 'fade',
    highlight: false,
    speakerLabel: true,
    bgStyle: 'gradient',
  },
  'word-by-word': {
    id: 'word-by-word',
    name: 'Word by Word',
    description: 'Animated word-by-word reveal with emphasis scaling. Maximum retention.',
    fontWeight: 'bold',
    fontSize: 'lg',
    position: 'center',
    animation: 'typewriter',
    highlight: true,
    speakerLabel: false,
    bgStyle: 'none',
  },
  'bold-pop': {
    id: 'bold-pop',
    name: 'Bold Pop',
    description: 'Punchy pop-in captions with emoji-style energy. Clickbait-friendly.',
    fontWeight: 'extrabold',
    fontSize: 'xl',
    position: 'center',
    animation: 'pop',
    highlight: true,
    speakerLabel: false,
    bgStyle: 'none',
  },
};

// ── Map content style to recommended caption style ──

export const STYLE_TO_CAPTION: Record<ContentStyle, CaptionStyleId> = {
  'entertainment': 'karaoke',
  'education': 'subtitle-bar',
  'podcast': 'speaker-labeled',
  'high-retention': 'word-by-word',
  'clickbait': 'bold-pop',
};

// ── Generate caption blocks from transcript lines ──

export function generateCaptionsFromTranscript(
  lines: TranscriptLine[],
  styleId: CaptionStyleId
): CaptionBlock[] {
  const activeLines = lines.filter((l) => !l.deleted);
  const blocks: CaptionBlock[] = [];

  for (const line of activeLines) {
    // Skip non-speech lines (bracketed text like [silence])
    if (line.text.startsWith('[')) continue;

    const words = splitIntoWords(line.text, line.startTime, line.endTime);

    blocks.push({
      id: generateId(),
      startTime: line.startTime,
      endTime: line.endTime,
      text: line.text,
      speaker: line.speaker,
      styleId,
      words,
    });
  }

  return blocks;
}

// ── Split text into timed words ──

function splitIntoWords(text: string, startTime: number, endTime: number): CaptionWord[] {
  const rawWords = text.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const duration = endTime - startTime;
  const wordDuration = duration / rawWords.length;

  // Emphasis words: longer than 5 chars or ALL CAPS or contain "!"
  const emphasisPatterns = /^(amazing|incredible|important|powerful|critical|awesome|insane|literally|actually|automatically|absolutely)$/i;

  return rawWords.map((word, i) => ({
    text: word,
    startTime: startTime + i * wordDuration,
    endTime: startTime + (i + 1) * wordDuration,
    emphasis: word.length > 7 || word === word.toUpperCase() && word.length > 2 || emphasisPatterns.test(word),
  }));
}

// ── Convert caption blocks to timeline clips ──

export function captionBlocksToTimelineClips(blocks: CaptionBlock[]): import('./types').TimelineClip[] {
  return blocks.map((block) => ({
    id: `cap-${block.id}`,
    trackType: 'caption' as const,
    name: block.text.length > 30 ? block.text.substring(0, 30) + '...' : block.text,
    startTime: block.startTime,
    duration: block.endTime - block.startTime,
    sourceOffset: 0,
    color: '#F59E0B',
  }));
}
