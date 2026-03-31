export type ProjectMode = 'shorts-editor' | 'shorts-extractor' | 'long-form';
export type ContentStyle = 'entertainment' | 'education' | 'podcast' | 'high-retention' | 'clickbait';

export type PipelineStageId =
  | 'trim'
  | 'audio'
  | 'zoom'
  | 'broll'
  | 'caption'
  | 'sfx'
  | 'color'
  | 'review'
  | 'export'
  | 'thumbnail';

export type PipelineStatus =
  | 'na'
  | 'pending'
  | 'running'
  | 'reviewing'
  | 'awaiting-approval'
  | 'approved'
  | 'rejected';

export interface PipelineStage {
  id: PipelineStageId;
  name: string;
  number: number;
  status: PipelineStatus;
  progress: number;
  color: string;
  implemented: boolean;
}

export interface ProjectConfig {
  id: string;
  name: string;
  mode: ProjectMode;
  style: ContentStyle;
  createdAt: number;
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'sfx' | 'ai-generated';
  duration?: number;
  width?: number;
  height?: number;
  url: string;
  thumbnailUrl?: string;
}

export type TrackType = 'video' | 'mic' | 'broll' | 'caption' | 'sfx' | 'music';

export interface TimelineClip {
  id: string;
  trackType: TrackType;
  name: string;
  startTime: number;
  duration: number;
  sourceOffset: number;
  color: string;
  linkedClipId?: string; // paired video<->audio clip
}

export interface TranscriptLine {
  id: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  text: string;
  deleted: boolean;
  edited: boolean;
  isFillerWord: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type: 'text' | 'approval-card' | 'clip-suggestion';
  stageId?: PipelineStageId;
}

export interface TrimSuggestion {
  id: string;
  startTime: number;
  endTime: number;
  reason: string;
  accepted: boolean | null;
  transcriptLineIds: string[];
}

export interface ZoomKeyframe {
  id: string;
  time: number;       // when the zoom starts
  duration: number;   // how long to reach target level
  holdDuration: number; // how long to hold at target level
  level: number;      // target zoom level (1.0 = no zoom)
  curveType: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'snap';
}

// ── Caption types ──

export type CaptionStyleId = 'hormozi' | 'karaoke' | 'clean' | 'speaker-labeled' | 'bounce';

export interface CaptionStyle {
  id: CaptionStyleId;
  name: string;
  description: string;
  wordsPerChunk: number;          // how many words shown at once
  fontSizePx: number;             // font size in px (for 1080-wide frame)
  fontWeight: number;             // 400-900
  position: 'center' | 'lower-third' | 'bottom';
  textColor: string;              // default word color
  activeColor: string;            // color of the currently-spoken word
  pastColor: string;              // color of already-spoken words
  futureColor: string;            // color of upcoming words
  strokePx: number;               // black outline width
  shadowStyle: string;            // text-shadow CSS
  bgStyle: 'none' | 'box' | 'frost';
  bgColor: string;                // background box color
  animation: 'pop' | 'sweep' | 'fade' | 'bounce' | 'none';
  activeScale: number;            // scale of active word (1.0 = no scale)
  allCaps: boolean;
  speakerLabel: boolean;
}

export interface CaptionBlock {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  styleId: CaptionStyleId;
  words: CaptionWord[];
}

export interface CaptionWord {
  text: string;
  startTime: number;
  endTime: number;
  emphasis: boolean;
}

// ── Audio Setup types ──

export interface AudioSetupConfig {
  micSynced: boolean;
  syncOffsetMs: number;
  normalizedLUFS: number;
  noiseReduction: boolean;
  noiseReductionLevel: 'light' | 'medium' | 'heavy';
  audioDucking: boolean;
}

export interface AudioAnalysis {
  peakLevel: number;
  avgLevel: number;
  noiseFloor: number;
  clipping: boolean;
  suggestedGain: number;
  hasBackgroundNoise: boolean;
}

// ── Zoom types ──

export type ZoomType = 'push-in' | 'snap' | 'drift' | 'pull-out';

export interface ZoomSuggestion {
  id: string;
  time: number;
  duration: number;
  level: number;
  type: ZoomType;
  reason: string;
  accepted: boolean | null;
}

// ── SFX types ──

export type SFXCategory = 'whoosh' | 'pop' | 'ding' | 'impact' | 'swoosh' | 'notification' | 'ambient' | 'typing' | 'bass-drop' | 'laugh';

export interface SFXItem {
  id: string;
  name: string;
  category: SFXCategory;
  duration: number;
  builtIn: boolean;
}

export interface SFXPlacement {
  id: string;
  sfxId: string;
  sfxName: string;
  time: number;
  duration: number;
  volume: number;
  reason: string;
  accepted: boolean | null;
}

// ── B-Roll types ──

export type OverlayMode = 'pip' | 'full-overlay' | 'pause-show';

export interface BRollSuggestion {
  id: string;
  time: number;
  duration: number;
  description: string;
  overlayMode: OverlayMode;
  reason: string;
  accepted: boolean | null;
}

// ── Color Correction types ──

export type ColorPresetId = 'film' | 'warm' | 'cool' | 'cinematic' | 'raw' | 'vibrant' | 'moody' | 'clean';

export interface ColorPreset {
  id: ColorPresetId;
  name: string;
  description: string;
  temperature: number; // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
  highlights: number;
  shadows: number;
}

export interface ColorCorrectionResult {
  presetId: ColorPresetId;
  whiteBalanceCorrected: boolean;
  exposureNormalized: boolean;
  skinToneProtected: boolean;
  sceneCount: number;
  scenesMatched: boolean;
}

// ── AI Review types ──

export interface ReviewFinding {
  id: string;
  category: 'pacing' | 'audio' | 'captions' | 'visual' | 'color';
  severity: 'info' | 'warning' | 'issue';
  timecode: number;
  description: string;
  suggestion: string;
}

// ── Export types ──

export type ExportPlatform = 'tiktok' | 'youtube' | 'instagram' | 'local';

export interface ExportConfig {
  platforms: ExportPlatform[];
  resolution: string;
  fps: number;
  format: 'mp4' | 'mov';
  quality: 'draft' | 'standard' | 'high';
}

export interface PlatformMetadata {
  platform: ExportPlatform;
  title: string;
  description: string;
  hashtags: string[];
}

// ── Thumbnail types ──

export interface ThumbnailVariant {
  id: string;
  prompt: string;
  imageUrl: string;
  selected: boolean;
}
