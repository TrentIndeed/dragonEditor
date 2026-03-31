import { PipelineStage, PipelineStageId } from './types';

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'trim', name: 'Trim & Cut', number: 1, status: 'pending', progress: 0, color: 'var(--color-stage-trim)', implemented: true },
  { id: 'audio', name: 'Audio Setup', number: 2, status: 'pending', progress: 0, color: 'var(--color-stage-audio)', implemented: true },
  { id: 'zoom', name: 'Zooms & Reframe', number: 3, status: 'pending', progress: 0, color: 'var(--color-stage-zoom)', implemented: true },
  { id: 'broll', name: 'B-Roll & Overlays', number: 4, status: 'pending', progress: 0, color: 'var(--color-stage-broll)', implemented: true },
  { id: 'caption', name: 'Captions', number: 5, status: 'pending', progress: 0, color: 'var(--color-stage-caption)', implemented: true },
  { id: 'sfx', name: 'Sound Effects', number: 6, status: 'pending', progress: 0, color: 'var(--color-stage-sfx)', implemented: true },
  { id: 'color', name: 'Color Correction', number: 7, status: 'pending', progress: 0, color: 'var(--color-stage-color)', implemented: true },
  { id: 'review', name: 'AI Self-Review', number: 8, status: 'pending', progress: 0, color: 'var(--color-stage-review)', implemented: true },
  { id: 'export', name: 'Export & Upload', number: 9, status: 'pending', progress: 0, color: 'var(--color-stage-export)', implemented: true },
  { id: 'thumbnail', name: 'Thumbnail', number: 10, status: 'pending', progress: 0, color: 'var(--color-stage-thumbnail)', implemented: true },
];

export const STAGE_COLORS: Record<PipelineStageId, string> = {
  trim: '#7C6BF0',
  audio: '#50D0A0',
  zoom: '#6BA0F0',
  broll: '#A07BF0',
  caption: '#F0D060',
  sfx: '#50B0D0',
  color: '#F0A050',
  review: '#F08050',
  export: '#50D0A0',
  thumbnail: '#F0D060',
};

export const TRACK_COLORS: Record<string, string> = {
  video: '#6B80F0',
  mic: '#50C080',
  broll: '#A060E0',
  caption: '#F0B040',
  sfx: '#50B0D0',
  music: '#E060A0',
};

export const TRACK_HEIGHTS: Record<string, number> = {
  video: 60,
  mic: 50,
  broll: 35,
  caption: 35,
  sfx: 35,
  music: 35,
};

export const MODE_CONFIG = {
  'shorts-editor': { label: 'Shorts Editor', description: 'One clip → one short', icon: 'Smartphone' as const, aspect: '9:16' },
  'shorts-extractor': { label: 'Shorts Extractor', description: 'Long vid → many shorts', icon: 'Scissors' as const, aspect: '9:16' },
  'long-form': { label: 'Long-Form Editor', description: 'Full edit of a video', icon: 'Film' as const, aspect: '16:9' },
};

export const STYLE_OPTIONS = [
  { id: 'entertainment' as const, label: 'Entertainment' },
  { id: 'education' as const, label: 'Education' },
  { id: 'podcast' as const, label: 'Podcast' },
  { id: 'high-retention' as const, label: 'High Retention' },
  { id: 'clickbait' as const, label: 'Clickbait' },
];

export const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right', 'I mean'];
