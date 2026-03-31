import { ThumbnailVariant, ContentStyle } from './types';
import { generateId } from './utils';
import { callAI, parseAIJson } from './ai';

/**
 * Stage 10: AI Thumbnail Generator
 * AI generates thumbnail prompts based on content and style.
 * Falls back to template-based prompts.
 */

export async function generateThumbnailVariantsAI(
  projectName: string,
  contentStyle: ContentStyle,
  transcript: string
): Promise<ThumbnailVariant[]> {
  const hook = transcript.split('.')[0] || projectName;

  const { result, usedAI } = await callAI(
    `You are a YouTube thumbnail designer AI. Generate 4 thumbnail concepts for this video.

VIDEO TITLE: "${projectName}"
CONTENT STYLE: ${contentStyle}
OPENING LINE: "${hook}"

For ${contentStyle} style:
${contentStyle === 'entertainment' ? '- Bold colors, shocked expressions, large text overlay, high contrast' : ''}
${contentStyle === 'education' ? '- Clean layout, professional, key stat or diagram, subtle gradient' : ''}
${contentStyle === 'podcast' ? '- Two speakers, split frame, microphone, conversation vibe' : ''}
${contentStyle === 'high-retention' ? '- Extreme close-up, dramatic lighting, curiosity gap text' : ''}
${contentStyle === 'clickbait' ? '- Shocked face, red circles, arrows, "YOU WON\'T BELIEVE" text' : ''}

Generate 4 variations, each with a different visual approach.

Return a JSON array:
[
  { "prompt": "YouTube thumbnail: face close-up with bold text '${hook}' overlay, ${contentStyle} style, variation 1" }
]

Return ONLY the JSON array of 4 items.`
  );

  if (usedAI && result) {
    const parsed = parseAIJson<Array<{ prompt: string }>>(result);
    if (parsed && Array.isArray(parsed) && parsed.length >= 2) {
      return parsed.slice(0, 4).map((p, i) => ({
        id: generateId(), prompt: p.prompt, imageUrl: '', selected: i === 0,
      }));
    }
  }

  return generateThumbnailVariants(projectName, contentStyle, transcript);
}

/** Template-based fallback */
export function generateThumbnailVariants(projectName: string, contentStyle: ContentStyle, transcript: string): ThumbnailVariant[] {
  const styleHints: Record<ContentStyle, string> = {
    'entertainment': 'bold colors, shocked expression, large text overlay, high contrast, YouTube thumbnail style',
    'education': 'clean layout, professional, key stat or diagram, subtle gradient background',
    'podcast': 'two speakers, split frame, microphone, conversation vibe, name lower-thirds',
    'high-retention': 'extreme close-up, dramatic lighting, curiosity gap text, bold arrow',
    'clickbait': 'shocked face, red circle, arrow pointing, "YOU WON\'T BELIEVE" text, emoji',
  };
  const hook = transcript.split('.')[0] || projectName;
  const hint = styleHints[contentStyle];

  return [
    { id: generateId(), prompt: `YouTube thumbnail: "${hook}" — ${hint}, variation 1: face close-up with text overlay`, imageUrl: '', selected: true },
    { id: generateId(), prompt: `YouTube thumbnail: "${hook}" — ${hint}, variation 2: split screen before/after`, imageUrl: '', selected: false },
    { id: generateId(), prompt: `YouTube thumbnail: "${hook}" — ${hint}, variation 3: bold centered text with background blur`, imageUrl: '', selected: false },
    { id: generateId(), prompt: `YouTube thumbnail: "${hook}" — ${hint}, variation 4: action shot with graphic elements`, imageUrl: '', selected: false },
  ];
}

export function selectThumbnail(variants: ThumbnailVariant[], selectedId: string): ThumbnailVariant[] {
  return variants.map((v) => ({ ...v, selected: v.id === selectedId }));
}

export function getSelectedThumbnail(variants: ThumbnailVariant[]): ThumbnailVariant | undefined {
  return variants.find((v) => v.selected);
}
