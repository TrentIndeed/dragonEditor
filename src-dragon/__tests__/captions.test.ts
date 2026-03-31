import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@/stores/projectStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useCaptionStore } from '@/stores/captionStore';
import { useChatStore } from '@/stores/chatStore';
import { useMediaStore } from '@/stores/mediaStore';
import {
  generateCaptionsFromTranscript,
  captionBlocksToTimelineClips,
  CAPTION_STYLES,
  STYLE_TO_CAPTION,
} from '@/lib/captions';
import { generateSRT } from '@/lib/export-srt';
import { generateEDL } from '@/lib/export-edl';
import { generateFCPXML } from '@/lib/export-fcpxml';
import { PIPELINE_STAGES } from '@/lib/constants';

function resetAllStores() {
  useProjectStore.setState({ config: null, isEditorOpen: false });
  useMediaStore.setState({ items: [], selectedId: null, activeTab: 'footage' });
  useTimelineStore.setState({
    clips: [], playheadTime: 0, isPlaying: false, duration: 60,
    pixelsPerSecond: 20, selectedClipIds: [], snapEnabled: true, activeTool: 'select',
  });
  useTranscriptStore.setState({ lines: [], highlightFillers: true });
  usePipelineStore.getState().resetPipeline();
  useCaptionStore.setState({ blocks: [], activeStyleId: 'karaoke', isGenerated: false });
  useChatStore.setState({ messages: [] });
}

// ════════════════════════════════════════════
describe('Stage 5: Captions', () => {
  beforeEach(() => {
    resetAllStores();
  });

  // ── Caption stage is enabled ──

  describe('Pipeline Configuration', () => {
    it('should have caption stage marked as implemented', () => {
      const captionStage = PIPELINE_STAGES.find((s) => s.id === 'caption');
      expect(captionStage).toBeTruthy();
      expect(captionStage!.implemented).toBe(true);
    });

    it('should have caption among implemented stages', () => {
      const stages = usePipelineStore.getState().stages;
      const implemented = stages.filter((s) => s.implemented);
      expect(implemented.length).toBe(10);
      expect(implemented.map((s) => s.id)).toContain('caption');
    });

    it('should advance from broll to caption after broll approval', () => {
      usePipelineStore.setState({ currentStageId: 'broll', isRunning: true });
      usePipelineStore.getState().setStageStatus('broll', 'awaiting-approval');
      usePipelineStore.getState().approveStage('broll');

      const state = usePipelineStore.getState();
      expect(state.stages.find((s) => s.id === 'broll')!.status).toBe('approved');
      expect(state.currentStageId).toBe('caption');
      expect(state.isRunning).toBe(true);
    });

    it('should advance to sfx after caption approval', () => {
      usePipelineStore.setState({ currentStageId: 'caption', isRunning: true });
      usePipelineStore.getState().setStageStatus('caption', 'awaiting-approval');
      usePipelineStore.getState().approveStage('caption');

      const state = usePipelineStore.getState();
      expect(state.stages.find((s) => s.id === 'caption')!.status).toBe('approved');
      expect(state.currentStageId).toBe('sfx');
      expect(state.isRunning).toBe(true);
    });
  });

  // ── Caption stage simulation ──

  describe('Caption Stage Execution', () => {
    it('should progress caption stage through running → reviewing → awaiting-approval', () => {
      vi.useFakeTimers();

      usePipelineStore.getState().runCaptionStage();

      let stage = usePipelineStore.getState().stages.find((s) => s.id === 'caption');
      expect(stage!.status).toBe('running');

      // Advance through progress intervals (5 * 250ms to reach 100%)
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(250);
      }

      stage = usePipelineStore.getState().stages.find((s) => s.id === 'caption');
      expect(stage!.status).toBe('reviewing');
      expect(stage!.progress).toBe(100);

      // After 1200ms review delay
      vi.advanceTimersByTime(1200);
      stage = usePipelineStore.getState().stages.find((s) => s.id === 'caption');
      expect(stage!.status).toBe('awaiting-approval');

      vi.useRealTimers();
    });

    it('should reject caption stage and reset progress', () => {
      usePipelineStore.getState().setStageStatus('caption', 'awaiting-approval');
      usePipelineStore.getState().setStageProgress('caption', 100);
      usePipelineStore.getState().rejectStage('caption');

      const stage = usePipelineStore.getState().stages.find((s) => s.id === 'caption');
      expect(stage!.status).toBe('rejected');
      expect(stage!.progress).toBe(0);
    });
  });

  // ── Caption styles ──

  describe('Caption Styles', () => {
    it('should define 5 caption styles', () => {
      expect(Object.keys(CAPTION_STYLES)).toHaveLength(5);
    });

    it('should have all required style properties', () => {
      for (const style of Object.values(CAPTION_STYLES)) {
        expect(style.id).toBeTruthy();
        expect(style.name).toBeTruthy();
        expect(style.description).toBeTruthy();
        expect(style.fontWeight).toBeGreaterThanOrEqual(400);
        expect(style.fontSizePx).toBeGreaterThan(0);
        expect(style.wordsPerChunk).toBeGreaterThan(0);
        expect(['center', 'lower-third', 'bottom']).toContain(style.position);
        expect(typeof style.speakerLabel).toBe('boolean');
        expect(typeof style.allCaps).toBe('boolean');
      }
    });

    it('should map each content style to a caption style', () => {
      const contentStyles = ['entertainment', 'education', 'podcast', 'high-retention', 'clickbait'] as const;
      for (const cs of contentStyles) {
        expect(STYLE_TO_CAPTION[cs]).toBeTruthy();
        expect(CAPTION_STYLES[STYLE_TO_CAPTION[cs]]).toBeTruthy();
      }
    });

    it('should map entertainment → hormozi', () => {
      expect(STYLE_TO_CAPTION['entertainment']).toBe('hormozi');
    });

    it('should map education → clean', () => {
      expect(STYLE_TO_CAPTION['education']).toBe('clean');
    });

    it('should map podcast → speaker-labeled', () => {
      expect(STYLE_TO_CAPTION['podcast']).toBe('speaker-labeled');
    });

    it('should map high-retention → bounce', () => {
      expect(STYLE_TO_CAPTION['high-retention']).toBe('bounce');
    });

    it('should map clickbait → hormozi', () => {
      expect(STYLE_TO_CAPTION['clickbait']).toBe('hormozi');
    });
  });

  // ── Caption generation from transcript ──

  describe('Caption Generation', () => {
    beforeEach(() => {
      useTranscriptStore.getState().loadMockData();
    });

    it('should generate captions from active transcript lines', () => {
      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'karaoke');

      expect(blocks.length).toBeGreaterThan(0);
      // Should skip the [silence] line (tl-5)
      const silenceBlock = blocks.find((b) => b.text.includes('[silence'));
      expect(silenceBlock).toBeUndefined();
    });

    it('should exclude deleted transcript lines from captions', () => {
      useTranscriptStore.getState().deleteLine('tl-1');
      useTranscriptStore.getState().deleteLine('tl-2');

      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'karaoke');

      const deletedBlock = blocks.find((b) => b.text.includes('Hey everyone'));
      expect(deletedBlock).toBeUndefined();
    });

    it('should preserve speaker info in caption blocks', () => {
      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'speaker-labeled');

      const withSpeaker = blocks.filter((b) => b.speaker);
      expect(withSpeaker.length).toBeGreaterThan(0);
      expect(withSpeaker[0].speaker).toBe('Speaker 1');
    });

    it('should generate timed words for each block', () => {
      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'bounce');

      for (const block of blocks) {
        expect(block.words.length).toBeGreaterThan(0);
        // Words should be within block time range
        for (const word of block.words) {
          expect(word.startTime).toBeGreaterThanOrEqual(block.startTime - 0.01);
          expect(word.endTime).toBeLessThanOrEqual(block.endTime + 0.01);
        }
      }
    });

    it('should mark emphasis words correctly', () => {
      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'karaoke');

      // Find a block with emphasis words (long words like "automatically", "exciting")
      const allWords = blocks.flatMap((b) => b.words);
      const emphasisWords = allWords.filter((w) => w.emphasis);
      expect(emphasisWords.length).toBeGreaterThan(0);
    });

    it('should apply the specified style ID to all blocks', () => {
      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'clean');

      for (const block of blocks) {
        expect(block.styleId).toBe('clean');
      }
    });

    it('should handle empty transcript', () => {
      useTranscriptStore.setState({ lines: [] });
      const blocks = generateCaptionsFromTranscript([], 'karaoke');
      expect(blocks).toEqual([]);
    });

    it('should handle transcript with all lines deleted', () => {
      const lines = useTranscriptStore.getState().lines.map((l) => ({ ...l, deleted: true }));
      const blocks = generateCaptionsFromTranscript(lines, 'karaoke');
      expect(blocks).toEqual([]);
    });
  });

  // ── Caption blocks → timeline clips ──

  describe('Caption Timeline Clips', () => {
    beforeEach(() => {
      useTranscriptStore.getState().loadMockData();
    });

    it('should convert caption blocks to timeline clips', () => {
      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'karaoke');
      const clips = captionBlocksToTimelineClips(blocks);

      expect(clips.length).toBe(blocks.length);
      for (const clip of clips) {
        expect(clip.trackType).toBe('caption');
        expect(clip.color).toBe('#F0B040');
        expect(clip.duration).toBeGreaterThan(0);
      }
    });

    it('should truncate long caption text in clip names', () => {
      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'karaoke');
      const clips = captionBlocksToTimelineClips(blocks);

      for (const clip of clips) {
        expect(clip.name.length).toBeLessThanOrEqual(33); // 30 + "..."
      }
    });

    it('should maintain timing from caption blocks', () => {
      const lines = useTranscriptStore.getState().lines;
      const blocks = generateCaptionsFromTranscript(lines, 'karaoke');
      const clips = captionBlocksToTimelineClips(blocks);

      for (let i = 0; i < clips.length; i++) {
        expect(clips[i].startTime).toBe(blocks[i].startTime);
        expect(clips[i].duration).toBeCloseTo(blocks[i].endTime - blocks[i].startTime, 5);
      }
    });
  });

  // ── Caption store ──

  describe('Caption Store', () => {
    beforeEach(() => {
      useTranscriptStore.getState().loadMockData();
    });

    it('should generate captions based on content style', () => {
      useCaptionStore.getState().generateCaptions('entertainment');
      const state = useCaptionStore.getState();

      expect(state.isGenerated).toBe(true);
      expect(state.activeStyleId).toBe('hormozi'); // entertainment → hormozi
      expect(state.blocks.length).toBeGreaterThan(0);
    });

    it('should change caption style and restyle all blocks', () => {
      useCaptionStore.getState().generateCaptions('entertainment');
      useCaptionStore.getState().setCaptionStyle('clean');

      const state = useCaptionStore.getState();
      expect(state.activeStyleId).toBe('clean');
      for (const block of state.blocks) {
        expect(block.styleId).toBe('clean');
      }
    });

    it('should regenerate captions with a different style', () => {
      useCaptionStore.getState().generateCaptions('entertainment');
      const countBefore = useCaptionStore.getState().blocks.length;

      useCaptionStore.getState().regenerateWithStyle('speaker-labeled');
      const state = useCaptionStore.getState();

      expect(state.activeStyleId).toBe('speaker-labeled');
      expect(state.blocks.length).toBeGreaterThan(0); // blocks count varies by wordsPerChunk
    });

    it('should edit a caption block text', () => {
      useCaptionStore.getState().generateCaptions('entertainment');
      const firstBlock = useCaptionStore.getState().blocks[0];

      useCaptionStore.getState().editBlockText(firstBlock.id, 'Edited caption');
      const edited = useCaptionStore.getState().blocks.find((b) => b.id === firstBlock.id);
      expect(edited!.text).toBe('Edited caption');
    });

    it('should remove a caption block', () => {
      useCaptionStore.getState().generateCaptions('entertainment');
      const countBefore = useCaptionStore.getState().blocks.length;
      const firstBlock = useCaptionStore.getState().blocks[0];

      useCaptionStore.getState().removeBlock(firstBlock.id);
      expect(useCaptionStore.getState().blocks.length).toBe(countBefore - 1);
      expect(useCaptionStore.getState().blocks.find((b) => b.id === firstBlock.id)).toBeUndefined();
    });

    it('should clear all captions', () => {
      useCaptionStore.getState().generateCaptions('entertainment');
      useCaptionStore.getState().clearCaptions();

      const state = useCaptionStore.getState();
      expect(state.blocks).toEqual([]);
      expect(state.isGenerated).toBe(false);
    });
  });

  // ── Full caption pipeline flow ──

  describe('Full Caption Pipeline Flow', () => {
    it('should complete: create project → approve prior stages → captions → approve → export', () => {
      // 1. Create project
      useProjectStore.getState().createProject('Caption E2E', 'shorts-editor', 'entertainment');

      // 2. Load data
      useMediaStore.getState().loadMockData();
      useTimelineStore.getState().loadMockData();
      useTranscriptStore.getState().loadMockData();

      // 3. Approve prior stages (trim → audio → zoom → broll) to reach caption
      usePipelineStore.setState({ currentStageId: 'trim', isRunning: true });
      for (const id of ['trim', 'audio', 'zoom', 'broll'] as const) {
        usePipelineStore.getState().setStageStatus(id, 'awaiting-approval');
        usePipelineStore.getState().approveStage(id);
      }

      // Should now be at caption stage
      expect(usePipelineStore.getState().currentStageId).toBe('caption');

      // 4. Generate captions
      useCaptionStore.getState().generateCaptions('entertainment');
      expect(useCaptionStore.getState().blocks.length).toBeGreaterThan(0);
      expect(useCaptionStore.getState().activeStyleId).toBe('hormozi');

      // 5. Add caption clips to timeline
      const captionClips = captionBlocksToTimelineClips(useCaptionStore.getState().blocks);
      for (const clip of captionClips) {
        useTimelineStore.getState().addClip(clip);
      }

      const timelineClips = useTimelineStore.getState().clips;
      const captionOnTimeline = timelineClips.filter((c) => c.trackType === 'caption');
      expect(captionOnTimeline.length).toBe(captionClips.length);

      // 6. Approve caption stage → advances to sfx
      usePipelineStore.getState().setStageStatus('caption', 'awaiting-approval');
      usePipelineStore.getState().approveStage('caption');

      expect(usePipelineStore.getState().stages.find((s) => s.id === 'caption')!.status).toBe('approved');
      // Advances to sfx after caption
      expect(usePipelineStore.getState().currentStageId).toBe('sfx');

      // 7. Verify exports include captions
      const allClips = useTimelineStore.getState().clips;
      const lines = useTranscriptStore.getState().lines;

      // EDL should have caption track clips
      const edl = generateEDL(allClips, 'Caption E2E', 30);
      expect(edl).toContain('TITLE: Caption E2E');
      // Caption clips should appear in EDL (they get V track since caption isn't A)
      expect(edl.split('\n').filter((l) => l.match(/^\d{3}/)).length).toBe(allClips.length);

      // SRT should contain active caption text
      const srt = generateSRT(lines);
      expect(srt).toContain('-->');
      expect(srt).toContain('Hey everyone');

      // FCPXML should include markers and assets
      const xml = generateFCPXML({
        title: 'Caption E2E', fps: 30, width: 1080, height: 1920,
        duration: 60, clips: allClips, transcriptLines: lines,
      });
      expect(xml).toContain('<fcpxml version="1.11">');
      expect(xml).toContain('<marker');
    });
  });
});
