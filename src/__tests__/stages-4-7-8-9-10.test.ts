import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@/stores/projectStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { useAudioStore } from '@/stores/audioStore';
import { useZoomStore } from '@/stores/zoomStore';
import { useCaptionStore } from '@/stores/captionStore';
import { generateBRollSuggestions, brollSuggestionsToTimelineClips, getBRollConfig } from '@/lib/broll';
import { runColorCorrection, autoSelectPreset, getAllPresets, COLOR_PRESETS } from '@/lib/color-correction';
import { runAIReview, getReviewScore } from '@/lib/ai-review';
import { generatePlatformMetadata, getResolutionForMode, DEFAULT_EXPORT_CONFIG } from '@/lib/export-pipeline';
import { generateThumbnailVariants, selectThumbnail, getSelectedThumbnail } from '@/lib/thumbnail';
import { PIPELINE_STAGES } from '@/lib/constants';

function resetAll() {
  useProjectStore.setState({ config: null, isEditorOpen: false });
  useMediaStore.setState({ items: [], selectedId: null, activeTab: 'footage' });
  useTimelineStore.setState({ clips: [], playheadTime: 0, isPlaying: false, duration: 60, pixelsPerSecond: 20, selectedClipIds: [], snapEnabled: true, activeTool: 'select' });
  useTranscriptStore.setState({ lines: [], highlightFillers: true });
  usePipelineStore.getState().resetPipeline();
  useAudioStore.getState().reset();
  useZoomStore.getState().reset();
  useCaptionStore.setState({ blocks: [], activeStyleId: 'karaoke', isGenerated: false });
  useChatStore.setState({ messages: [] });
}

// ════════════════════════════════════════════
// STAGE 4: B-ROLL & OVERLAYS
// ════════════════════════════════════════════

describe('Stage 4: B-Roll & Overlays', () => {
  beforeEach(() => { resetAll(); useTranscriptStore.getState().loadMockData(); });

  it('should be implemented', () => {
    expect(PIPELINE_STAGES.find((s) => s.id === 'broll')!.implemented).toBe(true);
  });

  it('should generate b-roll suggestions from transcript keywords', () => {
    const lines = useTranscriptStore.getState().lines;
    const suggestions = generateBRollSuggestions(lines, 'entertainment');
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.time).toBeGreaterThanOrEqual(0);
      expect(s.duration).toBeGreaterThan(0);
      expect(['pip', 'full-overlay', 'pause-show']).toContain(s.overlayMode);
      expect(s.reason).toBeTruthy();
      expect(s.accepted).toBeNull();
    }
  });

  it('should respect max suggestions per content style', () => {
    const lines = useTranscriptStore.getState().lines;
    const config = getBRollConfig('podcast');
    const suggestions = generateBRollSuggestions(lines, 'podcast');
    expect(suggestions.length).toBeLessThanOrEqual(config.maxSuggestions);
  });

  it('should convert accepted suggestions to timeline clips', () => {
    const lines = useTranscriptStore.getState().lines;
    const suggestions = generateBRollSuggestions(lines, 'entertainment').map((s) => ({ ...s, accepted: true as const }));
    const clips = brollSuggestionsToTimelineClips(suggestions as any);
    expect(clips.length).toBe(suggestions.length);
    for (const c of clips) {
      expect(c.trackType).toBe('broll');
      expect(c.color).toBe('#A855F7');
    }
  });

  it('should only include accepted suggestions in clips', () => {
    const lines = useTranscriptStore.getState().lines;
    const suggestions = generateBRollSuggestions(lines, 'entertainment').map((s, i) => ({ ...s, accepted: i === 0 ? true : false } as any));
    const clips = brollSuggestionsToTimelineClips(suggestions);
    expect(clips.length).toBe(1);
  });

  it('should run broll stage with progress', () => {
    vi.useFakeTimers();
    usePipelineStore.getState().runStage('broll');
    for (let i = 0; i < 5; i++) vi.advanceTimersByTime(250);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'broll')!.status).toBe('reviewing');
    vi.advanceTimersByTime(1200);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'broll')!.status).toBe('awaiting-approval');
    vi.useRealTimers();
  });
});

// ════════════════════════════════════════════
// STAGE 7: COLOR CORRECTION
// ════════════════════════════════════════════

describe('Stage 7: Color Correction', () => {
  beforeEach(() => { resetAll(); useTimelineStore.getState().loadMockData(); });

  it('should be implemented', () => {
    expect(PIPELINE_STAGES.find((s) => s.id === 'color')!.implemented).toBe(true);
  });

  it('should define 8 color presets', () => {
    const presets = getAllPresets();
    expect(presets.length).toBe(8);
    for (const p of presets) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
    }
  });

  it('should auto-select preset based on content style', () => {
    expect(autoSelectPreset('entertainment')).toBe('vibrant');
    expect(autoSelectPreset('education')).toBe('clean');
    expect(autoSelectPreset('podcast')).toBe('warm');
    expect(autoSelectPreset('high-retention')).toBe('cinematic');
    expect(autoSelectPreset('clickbait')).toBe('vibrant');
  });

  it('should run color correction and return results', () => {
    const clips = useTimelineStore.getState().clips;
    const result = runColorCorrection(clips, 'entertainment');
    expect(result.presetId).toBe('vibrant');
    expect(result.whiteBalanceCorrected).toBe(true);
    expect(result.exposureNormalized).toBe(true);
    expect(result.skinToneProtected).toBe(true);
    expect(result.sceneCount).toBeGreaterThan(0);
  });

  it('should run color stage with progress', () => {
    vi.useFakeTimers();
    usePipelineStore.getState().runStage('color');
    for (let i = 0; i < 4; i++) vi.advanceTimersByTime(200);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'color')!.status).toBe('reviewing');
    vi.advanceTimersByTime(1000);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'color')!.status).toBe('awaiting-approval');
    vi.useRealTimers();
  });
});

// ════════════════════════════════════════════
// STAGE 8: AI SELF-REVIEW
// ════════════════════════════════════════════

describe('Stage 8: AI Self-Review', () => {
  beforeEach(() => { resetAll(); useTimelineStore.getState().loadMockData(); useTranscriptStore.getState().loadMockData(); });

  it('should be implemented', () => {
    expect(PIPELINE_STAGES.find((s) => s.id === 'review')!.implemented).toBe(true);
  });

  it('should generate review findings', () => {
    const clips = useTimelineStore.getState().clips;
    const lines = useTranscriptStore.getState().lines;
    const findings = runAIReview(clips, lines, 60);
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(['pacing', 'audio', 'captions', 'visual', 'color']).toContain(f.category);
      expect(['info', 'warning', 'issue']).toContain(f.severity);
      expect(f.description).toBeTruthy();
      expect(f.suggestion).toBeTruthy();
    }
  });

  it('should calculate review score', () => {
    const findings = runAIReview(useTimelineStore.getState().clips, useTranscriptStore.getState().lines, 60);
    const { score, label } = getReviewScore(findings);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(label).toBeTruthy();
  });

  it('should flag missing captions', () => {
    const clips = useTimelineStore.getState().clips; // no caption clips
    const lines = useTranscriptStore.getState().lines;
    const findings = runAIReview(clips, lines, 60);
    const captionFinding = findings.find((f) => f.category === 'captions');
    expect(captionFinding).toBeTruthy();
  });

  it('should run review stage with progress', () => {
    vi.useFakeTimers();
    usePipelineStore.getState().runStage('review');
    for (let i = 0; i < 10; i++) vi.advanceTimersByTime(300);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'review')!.status).toBe('reviewing');
    vi.advanceTimersByTime(2000);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'review')!.status).toBe('awaiting-approval');
    vi.useRealTimers();
  });
});

// ════════════════════════════════════════════
// STAGE 9: EXPORT & UPLOAD
// ════════════════════════════════════════════

describe('Stage 9: Export & Upload', () => {
  beforeEach(() => { resetAll(); });

  it('should be implemented', () => {
    expect(PIPELINE_STAGES.find((s) => s.id === 'export')!.implemented).toBe(true);
  });

  it('should return correct resolution for each mode', () => {
    expect(getResolutionForMode('shorts-editor')).toBe('1080x1920');
    expect(getResolutionForMode('shorts-extractor')).toBe('1080x1920');
    expect(getResolutionForMode('long-form')).toBe('1920x1080');
  });

  it('should generate platform metadata', () => {
    const metadata = generatePlatformMetadata('Test Video', 'entertainment', ['youtube', 'tiktok']);
    expect(metadata.length).toBe(2);
    for (const m of metadata) {
      expect(m.title).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(m.hashtags.length).toBeGreaterThan(0);
    }
  });

  it('should generate hashtags per content style', () => {
    const ent = generatePlatformMetadata('T', 'entertainment', ['youtube']);
    const edu = generatePlatformMetadata('T', 'education', ['youtube']);
    expect(ent[0].hashtags).toContain('#entertainment');
    expect(edu[0].hashtags).toContain('#education');
  });

  it('should not include hashtags for local export', () => {
    const meta = generatePlatformMetadata('T', 'entertainment', ['local']);
    expect(meta[0].hashtags).toEqual([]);
  });

  it('should have default export config', () => {
    expect(DEFAULT_EXPORT_CONFIG.quality).toBe('high');
    expect(DEFAULT_EXPORT_CONFIG.format).toBe('mp4');
    expect(DEFAULT_EXPORT_CONFIG.fps).toBe(30);
  });

  it('should run export stage with progress', () => {
    vi.useFakeTimers();
    usePipelineStore.getState().runStage('export');
    for (let i = 0; i < 5; i++) vi.advanceTimersByTime(200);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'export')!.status).toBe('reviewing');
    vi.advanceTimersByTime(800);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'export')!.status).toBe('awaiting-approval');
    vi.useRealTimers();
  });
});

// ════════════════════════════════════════════
// STAGE 10: THUMBNAIL GENERATOR
// ════════════════════════════════════════════

describe('Stage 10: AI Thumbnail Generator', () => {
  beforeEach(() => { resetAll(); });

  it('should be implemented', () => {
    expect(PIPELINE_STAGES.find((s) => s.id === 'thumbnail')!.implemented).toBe(true);
  });

  it('should generate 4 thumbnail variants', () => {
    const variants = generateThumbnailVariants('Test', 'entertainment', 'Hello world. This is a test.');
    expect(variants.length).toBe(4);
    for (const v of variants) {
      expect(v.id).toBeTruthy();
      expect(v.prompt).toBeTruthy();
      expect(v.prompt).toContain('YouTube thumbnail');
    }
  });

  it('should have first variant selected by default', () => {
    const variants = generateThumbnailVariants('Test', 'entertainment', 'Test transcript.');
    expect(variants[0].selected).toBe(true);
    expect(variants.filter((v) => v.selected).length).toBe(1);
  });

  it('should select a different variant', () => {
    const variants = generateThumbnailVariants('Test', 'entertainment', 'Test.');
    const updated = selectThumbnail(variants, variants[2].id);
    expect(updated[2].selected).toBe(true);
    expect(updated[0].selected).toBe(false);
    expect(updated.filter((v) => v.selected).length).toBe(1);
  });

  it('should get the selected thumbnail', () => {
    const variants = generateThumbnailVariants('Test', 'entertainment', 'Test.');
    const selected = getSelectedThumbnail(variants);
    expect(selected).toBeTruthy();
    expect(selected!.id).toBe(variants[0].id);
  });

  it('should include style-specific hints in prompts', () => {
    const ent = generateThumbnailVariants('T', 'entertainment', 'Test.');
    const edu = generateThumbnailVariants('T', 'education', 'Test.');
    expect(ent[0].prompt).toContain('bold colors');
    expect(edu[0].prompt).toContain('professional');
  });

  it('should run thumbnail stage with progress', () => {
    vi.useFakeTimers();
    usePipelineStore.getState().runStage('thumbnail');
    for (let i = 0; i < 4; i++) vi.advanceTimersByTime(300);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'thumbnail')!.status).toBe('reviewing');
    vi.advanceTimersByTime(1500);
    expect(usePipelineStore.getState().stages.find((s) => s.id === 'thumbnail')!.status).toBe('awaiting-approval');
    vi.useRealTimers();
  });
});

// ════════════════════════════════════════════
// FULL 10-STAGE PIPELINE
// ════════════════════════════════════════════

describe('Full 10-Stage Pipeline', () => {
  beforeEach(() => { resetAll(); });

  it('should have all 10 stages implemented', () => {
    const stages = PIPELINE_STAGES;
    expect(stages.length).toBe(10);
    expect(stages.every((s) => s.implemented)).toBe(true);
  });

  it('should chain all 10 stages: approve each → pipeline completes', () => {
    useProjectStore.getState().createProject('Full Pipeline', 'shorts-editor', 'entertainment');
    usePipelineStore.setState({ currentStageId: 'trim', isRunning: true });

    const order: string[] = ['trim', 'audio', 'zoom', 'broll', 'caption', 'sfx', 'color', 'review', 'export', 'thumbnail'];

    for (let i = 0; i < order.length; i++) {
      const id = order[i] as any;
      expect(usePipelineStore.getState().currentStageId).toBe(id);
      usePipelineStore.getState().setStageStatus(id, 'awaiting-approval');
      usePipelineStore.getState().approveStage(id);

      if (i < order.length - 1) {
        expect(usePipelineStore.getState().currentStageId).toBe(order[i + 1]);
        expect(usePipelineStore.getState().isRunning).toBe(true);
      }
    }

    // After approving thumbnail (last stage), pipeline stops
    expect(usePipelineStore.getState().isRunning).toBe(false);
    expect(usePipelineStore.getState().currentStageId).toBeNull();

    // All 10 should be approved
    for (const id of order) {
      expect(usePipelineStore.getState().stages.find((s) => s.id === id)!.status).toBe('approved');
    }
  });
});
