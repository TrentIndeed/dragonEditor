import { ExportConfig, ExportPlatform, PlatformMetadata, ContentStyle } from './types';

/**
 * Stage 9: Export & Upload
 * Render final video, generate platform-specific metadata, upload.
 */

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  platforms: ['local'],
  resolution: '1080x1920',
  fps: 30,
  format: 'mp4',
  quality: 'high',
};

export function getResolutionForMode(mode: string): string {
  return mode === 'long-form' ? '1920x1080' : '1080x1920';
}

/** Generate platform metadata from project info */
export function generatePlatformMetadata(
  projectName: string,
  contentStyle: ContentStyle,
  platforms: ExportPlatform[]
): PlatformMetadata[] {
  const hashtags = getHashtagsForStyle(contentStyle);

  return platforms.map((platform) => ({
    platform,
    title: generateTitle(projectName, platform),
    description: generateDescription(projectName, contentStyle, platform),
    hashtags: platform === 'local' ? [] : hashtags,
  }));
}

function generateTitle(name: string, platform: ExportPlatform): string {
  switch (platform) {
    case 'tiktok': return name.length > 50 ? name.substring(0, 47) + '...' : name;
    case 'youtube': return name;
    case 'instagram': return name.length > 40 ? name.substring(0, 37) + '...' : name;
    case 'local': return name;
  }
}

function generateDescription(name: string, style: ContentStyle, platform: ExportPlatform): string {
  const styleDescriptions: Record<ContentStyle, string> = {
    'entertainment': 'Entertainment content',
    'education': 'Educational content',
    'podcast': 'Podcast clip',
    'high-retention': 'High-retention content',
    'clickbait': 'Viral content',
  };
  if (platform === 'local') return '';
  return `${styleDescriptions[style]} — edited with Dragon Editor AI`;
}

function getHashtagsForStyle(style: ContentStyle): string[] {
  const base = ['#edit', '#content', '#creator'];
  const styleSpecific: Record<ContentStyle, string[]> = {
    'entertainment': ['#entertainment', '#funny', '#viral', '#trending'],
    'education': ['#education', '#learn', '#tutorial', '#howto'],
    'podcast': ['#podcast', '#clips', '#conversation', '#interview'],
    'high-retention': ['#fyp', '#viral', '#mustwatch', '#trending'],
    'clickbait': ['#viral', '#shocking', '#youwouldntbelieve', '#fyp'],
  };
  return [...base, ...styleSpecific[style]];
}

export function getExportFormats() {
  return [
    { id: 'mp4' as const, label: 'MP4 (H.264)', description: 'Universal compatibility' },
    { id: 'mov' as const, label: 'MOV (ProRes)', description: 'Higher quality, larger file' },
  ];
}

export function getQualityOptions() {
  return [
    { id: 'draft' as const, label: 'Draft', description: 'Fast render, lower quality' },
    { id: 'standard' as const, label: 'Standard', description: 'Balanced speed and quality' },
    { id: 'high' as const, label: 'High', description: 'Best quality, slower render' },
  ];
}
