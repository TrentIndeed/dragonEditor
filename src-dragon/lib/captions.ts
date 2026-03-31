import { TranscriptLine, CaptionBlock, CaptionWord, CaptionStyle, CaptionStyleId, ContentStyle } from './types';
import { generateId } from './utils';

// ── TikTok-Authentic Caption Styles ──

export const CAPTION_STYLES: Record<CaptionStyleId, CaptionStyle> = {
  'hormozi': {
    id: 'hormozi',
    name: 'Hormozi Punch',
    description: '1-3 words at a time, all caps, key words in yellow. Maximum impact.',
    wordsPerChunk: 3,
    fontSizePx: 48,
    fontWeight: 900,
    position: 'center',
    textColor: '#FFFFFF',
    activeColor: '#FFE500',
    pastColor: '#FFFFFF',
    futureColor: 'rgba(255,255,255,0.35)',
    strokePx: 3,
    shadowStyle: '3px 3px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
    bgStyle: 'none',
    bgColor: '',
    animation: 'pop',
    activeScale: 1.15,
    allCaps: true,
    speakerLabel: false,
  },
  'karaoke': {
    id: 'karaoke',
    name: 'Karaoke Sweep',
    description: 'Word-by-word color sweep through phrases. Classic TikTok/CapCut style.',
    wordsPerChunk: 5,
    fontSizePx: 36,
    fontWeight: 700,
    position: 'center',
    textColor: 'rgba(255,255,255,0.45)',
    activeColor: '#FFD700',
    pastColor: '#FFFFFF',
    futureColor: 'rgba(255,255,255,0.35)',
    strokePx: 2,
    shadowStyle: '2px 2px 4px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.4)',
    bgStyle: 'box',
    bgColor: 'rgba(0,0,0,0.45)',
    animation: 'sweep',
    activeScale: 1.08,
    allCaps: false,
    speakerLabel: false,
  },
  'clean': {
    id: 'clean',
    name: 'Clean Minimal',
    description: 'Subtle white text in the lower third. Professional and understated.',
    wordsPerChunk: 8,
    fontSizePx: 26,
    fontWeight: 500,
    position: 'lower-third',
    textColor: '#FFFFFF',
    activeColor: '#FFFFFF',
    pastColor: 'rgba(255,255,255,0.7)',
    futureColor: 'rgba(255,255,255,0.7)',
    strokePx: 0,
    shadowStyle: '1px 1px 3px rgba(0,0,0,0.6)',
    bgStyle: 'frost',
    bgColor: 'rgba(0,0,0,0.35)',
    animation: 'fade',
    activeScale: 1.0,
    allCaps: false,
    speakerLabel: false,
  },
  'speaker-labeled': {
    id: 'speaker-labeled',
    name: 'Speaker Labels',
    description: 'Lower-third with speaker name badge. Great for podcasts and interviews.',
    wordsPerChunk: 6,
    fontSizePx: 28,
    fontWeight: 500,
    position: 'lower-third',
    textColor: '#FFFFFF',
    activeColor: '#7C6BF0',
    pastColor: '#FFFFFF',
    futureColor: 'rgba(255,255,255,0.5)',
    strokePx: 1,
    shadowStyle: '1px 2px 4px rgba(0,0,0,0.7)',
    bgStyle: 'frost',
    bgColor: 'rgba(0,0,0,0.45)',
    animation: 'fade',
    activeScale: 1.0,
    allCaps: false,
    speakerLabel: true,
  },
  'bounce': {
    id: 'bounce',
    name: 'Bounce Pop',
    description: 'Words bounce in one at a time. High energy MrBeast style.',
    wordsPerChunk: 4,
    fontSizePx: 42,
    fontWeight: 800,
    position: 'center',
    textColor: '#FFFFFF',
    activeColor: '#FF1493',
    pastColor: '#FFFFFF',
    futureColor: 'rgba(255,255,255,0.2)',
    strokePx: 2,
    shadowStyle: '2px 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.5)',
    bgStyle: 'none',
    bgColor: '',
    animation: 'bounce',
    activeScale: 1.2,
    allCaps: true,
    speakerLabel: false,
  },
};

// ── Map content style to recommended caption style ──

export const STYLE_TO_CAPTION: Record<ContentStyle, CaptionStyleId> = {
  'entertainment': 'hormozi',
  'education': 'clean',
  'podcast': 'speaker-labeled',
  'high-retention': 'bounce',
  'clickbait': 'hormozi',
};

// ── Generate caption blocks with word-level timing ──

export function generateCaptionsFromTranscript(
  lines: TranscriptLine[],
  styleId: CaptionStyleId
): CaptionBlock[] {
  const activeLines = lines.filter((l) => !l.deleted);
  const style = CAPTION_STYLES[styleId];
  const blocks: CaptionBlock[] = [];

  for (const line of activeLines) {
    if (line.text.startsWith('[')) continue;

    const words = splitIntoWords(line.text, line.startTime, line.endTime);
    const chunks = chunkWords(words, style.wordsPerChunk);

    for (const chunk of chunks) {
      if (chunk.length === 0) continue;
      blocks.push({
        id: generateId(),
        startTime: chunk[0].startTime,
        endTime: chunk[chunk.length - 1].endTime,
        text: chunk.map((w) => w.text).join(' '),
        speaker: line.speaker,
        styleId,
        words: chunk,
      });
    }
  }

  return blocks;
}

/** Split text into timed words */
function splitIntoWords(text: string, startTime: number, endTime: number): CaptionWord[] {
  const rawWords = text.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const duration = endTime - startTime;
  const wordDuration = duration / rawWords.length;

  const emphasisPatterns = /^(amazing|incredible|important|powerful|critical|awesome|insane|literally|actually|automatically|absolutely|never|always|every|million|billion|free|secret|hack)$/i;

  return rawWords.map((word, i) => ({
    text: word,
    startTime: startTime + i * wordDuration,
    endTime: startTime + (i + 1) * wordDuration,
    emphasis: word.length > 7 || emphasisPatterns.test(word),
  }));
}

/** Chunk words into groups at natural phrase boundaries */
function chunkWords(words: CaptionWord[], maxPerChunk: number): CaptionWord[][] {
  if (words.length <= maxPerChunk) return [words];

  const chunks: CaptionWord[][] = [];
  let current: CaptionWord[] = [];

  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);

    const isChunkFull = current.length >= maxPerChunk;
    const isNaturalBreak = current.length >= Math.max(2, maxPerChunk - 1) &&
      /[,.:;!?]$/.test(words[i].text);

    if (isChunkFull || isNaturalBreak) {
      chunks.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    if (chunks.length > 0 && current.length <= 2) {
      chunks[chunks.length - 1].push(...current);
    } else {
      chunks.push(current);
    }
  }

  return chunks;
}

// ── Convert to timeline clips ──

export function captionBlocksToTimelineClips(blocks: CaptionBlock[]): import('./types').TimelineClip[] {
  return blocks.map((block) => ({
    id: `cap-${block.id}`,
    trackType: 'caption' as const,
    name: block.text.length > 30 ? block.text.substring(0, 30) + '...' : block.text,
    startTime: block.startTime,
    duration: block.endTime - block.startTime,
    sourceOffset: 0,
    color: '#F0B040',
  }));
}
