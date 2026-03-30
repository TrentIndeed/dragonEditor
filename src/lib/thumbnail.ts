import { ThumbnailVariant, ContentStyle } from './types';
import { generateId } from './utils';

/**
 * Stage 10: AI Thumbnail Generator
 * Generates 4 thumbnail variants using AI (mock for now).
 * Only for YouTube uploads (shorts and long-form).
 */

export function generateThumbnailPrompts(
  projectName: string,
  contentStyle: ContentStyle,
  transcript: string
): string[] {
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
    `YouTube thumbnail: "${hook}" — ${hint}, variation 1: face close-up with text overlay`,
    `YouTube thumbnail: "${hook}" — ${hint}, variation 2: split screen before/after`,
    `YouTube thumbnail: "${hook}" — ${hint}, variation 3: bold centered text with background blur`,
    `YouTube thumbnail: "${hook}" — ${hint}, variation 4: action shot with graphic elements`,
  ];
}

export function generateThumbnailVariants(
  projectName: string,
  contentStyle: ContentStyle,
  transcript: string
): ThumbnailVariant[] {
  const prompts = generateThumbnailPrompts(projectName, contentStyle, transcript);

  return prompts.map((prompt, i) => ({
    id: generateId(),
    prompt,
    imageUrl: '', // Would be filled by AI image generation API
    selected: i === 0, // First variant selected by default
  }));
}

export function selectThumbnail(variants: ThumbnailVariant[], selectedId: string): ThumbnailVariant[] {
  return variants.map((v) => ({ ...v, selected: v.id === selectedId }));
}

export function getSelectedThumbnail(variants: ThumbnailVariant[]): ThumbnailVariant | undefined {
  return variants.find((v) => v.selected);
}
