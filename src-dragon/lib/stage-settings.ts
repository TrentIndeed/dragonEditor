/**
 * Stage Settings — configurable options for each pipeline stage.
 * These appear as a settings panel before the stage runs.
 */

export interface SettingToggle { type: 'toggle'; key: string; label: string; default: boolean }
export interface SettingSlider { type: 'slider'; key: string; label: string; min: number; max: number; step: number; default: number; unit?: string }
export interface SettingSelect { type: 'select'; key: string; label: string; options: { value: string; label: string }[]; default: string }

export type StageSetting = SettingToggle | SettingSlider | SettingSelect;

export interface StageSettingsConfig {
  title: string;
  description: string;
  settings: StageSetting[];
}

export const STAGE_SETTINGS: Record<string, StageSettingsConfig> = {
  trim: {
    title: 'Silence & Boring Content',
    description: 'Remove dead space, filler words, and false starts.',
    settings: [
      { type: 'toggle', key: 'trimSilence', label: 'Trim silence', default: true },
      { type: 'slider', key: 'silenceSensitivity', label: 'Silence sensitivity', min: 0, max: 100, step: 1, default: 50, unit: '%' },
      { type: 'toggle', key: 'removeBoring', label: 'Remove boring content', default: false },
      { type: 'select', key: 'detectionLayer', label: 'Track art detection layer', options: [
        { value: 'ai-assisted', label: 'AI-assisted' },
        { value: 'manual', label: 'Manual' },
        { value: 'aggressive', label: 'Aggressive' },
      ], default: 'ai-assisted' },
    ],
  },
  audio: {
    title: 'Audio Processing',
    description: 'Sync, normalize, and clean up audio.',
    settings: [
      { type: 'toggle', key: 'micSync', label: 'Auto-sync mic audio', default: true },
      { type: 'slider', key: 'targetLUFS', label: 'Target loudness', min: -24, max: -8, step: 1, default: -14, unit: ' LUFS' },
      { type: 'toggle', key: 'noiseReduction', label: 'Noise reduction', default: true },
      { type: 'select', key: 'noiseLevel', label: 'Noise reduction level', options: [
        { value: 'light', label: 'Light' },
        { value: 'medium', label: 'Medium' },
        { value: 'heavy', label: 'Heavy' },
      ], default: 'medium' },
      { type: 'toggle', key: 'audioDucking', label: 'Audio ducking', default: true },
    ],
  },
  zoom: {
    title: 'Zooms & Reframe',
    description: 'AI places dynamic zooms based on content.',
    settings: [
      { type: 'toggle', key: 'autoZoom', label: 'Auto-place zooms', default: true },
      { type: 'slider', key: 'zoomIntensity', label: 'Zoom intensity', min: 10, max: 100, step: 5, default: 50, unit: '%' },
      { type: 'select', key: 'zoomStyle', label: 'Zoom style', options: [
        { value: 'snap', label: 'Snap (quick)' },
        { value: 'smooth', label: 'Smooth (cinematic)' },
        { value: 'drift', label: 'Drift (Ken Burns)' },
        { value: 'mixed', label: 'Mixed' },
      ], default: 'mixed' },
      { type: 'toggle', key: 'faceTracking', label: 'Face tracking reframe', default: true },
    ],
  },
  broll: {
    title: 'B-Roll & Overlays',
    description: 'AI suggests visual overlays.',
    settings: [
      { type: 'toggle', key: 'autoBroll', label: 'Auto-suggest B-roll', default: true },
      { type: 'slider', key: 'maxSuggestions', label: 'Max suggestions', min: 1, max: 15, step: 1, default: 6 },
      { type: 'select', key: 'overlayMode', label: 'Default overlay mode', options: [
        { value: 'pip', label: 'Picture-in-Picture' },
        { value: 'full-overlay', label: 'Full overlay' },
        { value: 'pause-show', label: 'Pause & show' },
      ], default: 'full-overlay' },
    ],
  },
  caption: {
    title: 'Captions',
    description: 'TikTok-style captions with word timing.',
    settings: [
      { type: 'toggle', key: 'autoCaptions', label: 'Generate captions', default: true },
      { type: 'select', key: 'captionStyle', label: 'Caption style', options: [
        { value: 'hormozi', label: 'Hormozi Punch' },
        { value: 'karaoke', label: 'Karaoke Sweep' },
        { value: 'clean', label: 'Clean Minimal' },
        { value: 'speaker-labeled', label: 'Speaker Labels' },
        { value: 'bounce', label: 'Bounce Pop' },
      ], default: 'hormozi' },
      { type: 'slider', key: 'fontSize', label: 'Font size', min: 20, max: 60, step: 2, default: 42, unit: 'px' },
    ],
  },
  sfx: {
    title: 'Sound Effects',
    description: 'AI places SFX on cuts and emphasis.',
    settings: [
      { type: 'toggle', key: 'autoSfx', label: 'Auto-place SFX', default: true },
      { type: 'slider', key: 'sfxVolume', label: 'SFX volume', min: 0, max: 100, step: 5, default: 50, unit: '%' },
      { type: 'toggle', key: 'whooshOnCuts', label: 'Whoosh on cuts', default: true },
      { type: 'toggle', key: 'popOnEmphasis', label: 'Pop on emphasis', default: true },
    ],
  },
  color: {
    title: 'Color Correction',
    description: 'Auto white balance, exposure, and look.',
    settings: [
      { type: 'toggle', key: 'autoCorrect', label: 'Auto-correct', default: true },
      { type: 'toggle', key: 'skinToneProtect', label: 'Skin tone protection', default: true },
      { type: 'select', key: 'preset', label: 'Look preset', options: [
        { value: 'auto', label: 'Auto (style-based)' },
        { value: 'film', label: 'Film' },
        { value: 'warm', label: 'Warm' },
        { value: 'cool', label: 'Cool' },
        { value: 'cinematic', label: 'Cinematic' },
        { value: 'vibrant', label: 'Vibrant' },
        { value: 'moody', label: 'Moody' },
        { value: 'clean', label: 'Clean' },
      ], default: 'auto' },
    ],
  },
  review: {
    title: 'AI Self-Review',
    description: 'AI evaluates the assembled edit.',
    settings: [
      { type: 'toggle', key: 'checkPacing', label: 'Check pacing', default: true },
      { type: 'toggle', key: 'checkAudio', label: 'Check audio', default: true },
      { type: 'toggle', key: 'checkCaptions', label: 'Check captions', default: true },
      { type: 'toggle', key: 'checkVisual', label: 'Check visual flow', default: true },
    ],
  },
  export: {
    title: 'Export & Upload',
    description: 'Render and upload to platforms.',
    settings: [
      { type: 'select', key: 'quality', label: 'Quality', options: [
        { value: 'draft', label: 'Draft (fast)' },
        { value: 'standard', label: 'Standard' },
        { value: 'high', label: 'High' },
      ], default: 'high' },
      { type: 'select', key: 'fps', label: 'Frame rate', options: [
        { value: '24', label: '24 fps' },
        { value: '30', label: '30 fps' },
        { value: '60', label: '60 fps' },
      ], default: '30' },
    ],
  },
  thumbnail: {
    title: 'AI Thumbnail',
    description: 'Generate YouTube thumbnail variants.',
    settings: [
      { type: 'slider', key: 'variants', label: 'Number of variants', min: 2, max: 8, step: 1, default: 4 },
      { type: 'toggle', key: 'includeText', label: 'Include text overlay', default: true },
    ],
  },
};
