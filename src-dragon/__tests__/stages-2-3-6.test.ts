import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@/stores/projectStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useAudioStore } from '@/stores/audioStore';
import { useZoomStore } from '@/stores/zoomStore';
import { useChatStore } from '@/stores/chatStore';
import { useCaptionStore } from '@/stores/captionStore';
import { runAudioSetup, analyzeAudio, detectMicSync, DEFAULT_AUDIO_CONFIG } from '@/lib/audio-setup';
import { generateZoomSuggestions, zoomSuggestionsToKeyframes, getZoomConfig } from '@/lib/zooms';
import { generateSFXPlacements, sfxPlacementsToTimelineClips, SFX_LIBRARY, getSFXRules } from '@/lib/sfx';
import { PIPELINE_STAGES } from '@/lib/constants';

function resetAll() {
  useProjectStore.setState({ config: null, isEditorOpen: false });
  useMediaStore.setState({ items: [], selectedId: null, activeTab: 'footage' });
  useTimelineStore.setState({
    clips: [], playheadTime: 0, isPlaying: false, duration: 60,
    pixelsPerSecond: 20, selectedClipIds: [], snapEnabled: true, activeTool: 'select',
  });
  useTranscriptStore.setState({ lines: [], highlightFillers: true });
  usePipelineStore.getState().resetPipeline();
  useAudioStore.getState().reset();
  useZoomStore.getState().reset();
  useCaptionStore.setState({ blocks: [], activeStyleId: 'karaoke', isGenerated: false });
  useChatStore.setState({ messages: [] });
}

// ════════════════════════════════════════════
// STAGE 2: AUDIO SETUP
// ════════════════════════════════════════════

describe('Stage 2: Audio Setup', () => {
  beforeEach(() => { resetAll(); });

  describe('Pipeline Config', () => {
    it('should have audio stage implemented', () => {
      expect(PIPELINE_STAGES.find((s) => s.id === 'audio')!.implemented).toBe(true);
    });

    it('should run audio stage after trim approval', () => {
      usePipelineStore.setState({ currentStageId: 'trim', isRunning: true });
      usePipelineStore.getState().setStageStatus('trim', 'awaiting-approval');
      usePipelineStore.getState().approveStage('trim');
      expect(usePipelineStore.getState().currentStageId).toBe('audio');
    });
  });

  describe('Audio Analysis', () => {
    it('should analyze audio and return metrics', () => {
      useTimelineStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;
      const analysis = analyzeAudio(clips);

      expect(analysis.peakLevel).toBeLessThan(0);
      expect(analysis.avgLevel).toBeLessThan(0);
      expect(analysis.noiseFloor).toBeLessThan(analysis.avgLevel);
      expect(typeof analysis.clipping).toBe('boolean');
      expect(analysis.suggestedGain).toBeGreaterThan(0);
    });

    it('should detect mic sync offset', () => {
      useTimelineStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;
      const video = clips.filter((c) => c.trackType === 'video');
      const mic = clips.filter((c) => c.trackType === 'mic');
      const offset = detectMicSync(video, mic);
      expect(typeof offset).toBe('number');
    });

    it('should return 0 offset when no mic clips', () => {
      const offset = detectMicSync([], []);
      expect(offset).toBe(0);
    });
  });

  describe('Audio Setup Processing', () => {
    it('should produce a full audio setup result', () => {
      useTimelineStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;
      const result = runAudioSetup(clips);

      expect(result.config.micSynced).toBe(true);
      expect(result.config.normalizedLUFS).toBe(-14);
      expect(result.config.noiseReduction).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.analysis).toBeTruthy();
    });

    it('should include sync, normalize, and noise reduction changes', () => {
      useTimelineStore.getState().loadMockData();
      const result = runAudioSetup(useTimelineStore.getState().clips);
      const changeText = result.changes.join(' ');
      expect(changeText).toContain('synced');
      expect(changeText).toContain('normalized');
      expect(changeText).toContain('Noise reduction');
    });
  });

  describe('Audio Store', () => {
    beforeEach(() => { useTimelineStore.getState().loadMockData(); });

    it('should process audio and store results', () => {
      useAudioStore.getState().processAudio();
      const state = useAudioStore.getState();
      expect(state.isProcessed).toBe(true);
      expect(state.analysis).toBeTruthy();
      expect(state.changes.length).toBeGreaterThan(0);
    });

    it('should toggle noise reduction', () => {
      useAudioStore.getState().processAudio();
      const before = useAudioStore.getState().config.noiseReduction;
      useAudioStore.getState().toggleNoiseReduction();
      expect(useAudioStore.getState().config.noiseReduction).toBe(!before);
    });

    it('should set noise reduction level', () => {
      useAudioStore.getState().setNoiseReductionLevel('heavy');
      expect(useAudioStore.getState().config.noiseReductionLevel).toBe('heavy');
    });

    it('should toggle audio ducking', () => {
      useAudioStore.getState().processAudio();
      const before = useAudioStore.getState().config.audioDucking;
      useAudioStore.getState().toggleAudioDucking();
      expect(useAudioStore.getState().config.audioDucking).toBe(!before);
    });

    it('should reset to defaults', () => {
      useAudioStore.getState().processAudio();
      useAudioStore.getState().reset();
      const state = useAudioStore.getState();
      expect(state.isProcessed).toBe(false);
      expect(state.analysis).toBeNull();
      expect(state.config).toEqual(DEFAULT_AUDIO_CONFIG);
    });
  });

  describe('Stage Execution', () => {
    it('should progress audio stage running → reviewing → awaiting-approval', () => {
      vi.useFakeTimers();
      usePipelineStore.getState().runAudioStage();

      for (let i = 0; i < 4; i++) vi.advanceTimersByTime(200);
      let stage = usePipelineStore.getState().stages.find((s) => s.id === 'audio');
      expect(stage!.status).toBe('reviewing');

      vi.advanceTimersByTime(1000);
      stage = usePipelineStore.getState().stages.find((s) => s.id === 'audio');
      expect(stage!.status).toBe('awaiting-approval');
      vi.useRealTimers();
    });
  });
});

// ════════════════════════════════════════════
// STAGE 3: ZOOMS & REFRAME
// ════════════════════════════════════════════

describe('Stage 3: Zooms & Reframe', () => {
  beforeEach(() => { resetAll(); });

  describe('Pipeline Config', () => {
    it('should have zoom stage implemented', () => {
      expect(PIPELINE_STAGES.find((s) => s.id === 'zoom')!.implemented).toBe(true);
    });

    it('should run zoom stage after audio approval', () => {
      usePipelineStore.setState({ currentStageId: 'audio', isRunning: true });
      usePipelineStore.getState().setStageStatus('audio', 'awaiting-approval');
      usePipelineStore.getState().approveStage('audio');
      expect(usePipelineStore.getState().currentStageId).toBe('zoom');
    });
  });

  describe('Zoom Configs', () => {
    it('should define zoom config for each content style', () => {
      const styles = ['entertainment', 'education', 'podcast', 'high-retention', 'clickbait'] as const;
      for (const style of styles) {
        const config = getZoomConfig(style);
        expect(config.intervalRange[0]).toBeLessThan(config.intervalRange[1]);
        expect(config.preferredTypes.length).toBeGreaterThan(0);
        expect(config.zoomLevel[0]).toBeLessThan(config.zoomLevel[1]);
      }
    });

    it('entertainment should have shorter intervals than podcast', () => {
      const ent = getZoomConfig('entertainment');
      const pod = getZoomConfig('podcast');
      expect(ent.intervalRange[0]).toBeLessThan(pod.intervalRange[0]);
    });
  });

  describe('Zoom Suggestion Generation', () => {
    beforeEach(() => { useTranscriptStore.getState().loadMockData(); });

    it('should generate zoom suggestions from transcript', () => {
      const lines = useTranscriptStore.getState().lines;
      const suggestions = generateZoomSuggestions(lines, 'entertainment', 60);
      expect(suggestions.length).toBeGreaterThan(0);
      for (const s of suggestions) {
        expect(s.time).toBeGreaterThanOrEqual(0);
        expect(s.time).toBeLessThanOrEqual(60);
        expect(s.level).toBeGreaterThan(1);
        expect(s.duration).toBeGreaterThan(0);
        expect(['push-in', 'snap', 'drift', 'pull-out']).toContain(s.type);
        expect(s.reason).toBeTruthy();
        expect(s.accepted).toBeNull();
      }
    });

    it('should generate more zooms for entertainment than podcast', () => {
      const lines = useTranscriptStore.getState().lines;
      const ent = generateZoomSuggestions(lines, 'entertainment', 60);
      const pod = generateZoomSuggestions(lines, 'podcast', 60);
      expect(ent.length).toBeGreaterThanOrEqual(pod.length);
    });

    it('should handle empty transcript', () => {
      const suggestions = generateZoomSuggestions([], 'entertainment', 60);
      expect(suggestions).toEqual([]);
    });
  });

  describe('Zoom Keyframes', () => {
    beforeEach(() => { useTranscriptStore.getState().loadMockData(); });

    it('should convert accepted suggestions to keyframes', () => {
      const lines = useTranscriptStore.getState().lines;
      const suggestions = generateZoomSuggestions(lines, 'entertainment', 60);
      // Accept some
      const accepted = suggestions.map((s, i) => ({ ...s, accepted: i % 2 === 0 ? true : false } as const));
      const keyframes = zoomSuggestionsToKeyframes(accepted as any);
      expect(keyframes.length).toBe(accepted.filter((s) => s.accepted).length);
      for (const kf of keyframes) {
        expect(kf.level).toBeGreaterThan(1);
        expect(['linear', 'ease-in', 'ease-out', 'snap']).toContain(kf.curveType);
      }
    });

    it('should return empty keyframes when none accepted', () => {
      const suggestions = generateZoomSuggestions(useTranscriptStore.getState().lines, 'entertainment', 60);
      const rejected = suggestions.map((s) => ({ ...s, accepted: false as const }));
      expect(zoomSuggestionsToKeyframes(rejected as any)).toEqual([]);
    });
  });

  describe('Zoom Store', () => {
    beforeEach(() => {
      useTranscriptStore.getState().loadMockData();
      useTimelineStore.getState().loadMockData();
    });

    it('should generate zooms from content style', async () => {
      await useZoomStore.getState().generateZooms('entertainment');
      const state = useZoomStore.getState();
      expect(state.isGenerated).toBe(true);
      expect(state.suggestions.length).toBeGreaterThan(0);
    });

    it('should accept and reject individual suggestions', async () => {
      await useZoomStore.getState().generateZooms('entertainment');
      const first = useZoomStore.getState().suggestions[0];
      useZoomStore.getState().acceptSuggestion(first.id);
      expect(useZoomStore.getState().suggestions.find((s) => s.id === first.id)!.accepted).toBe(true);

      const second = useZoomStore.getState().suggestions[1];
      useZoomStore.getState().rejectSuggestion(second.id);
      expect(useZoomStore.getState().suggestions.find((s) => s.id === second.id)!.accepted).toBe(false);
    });

    it('should accept/reject all', async () => {
      await useZoomStore.getState().generateZooms('entertainment');
      useZoomStore.getState().acceptAll();
      expect(useZoomStore.getState().suggestions.every((s) => s.accepted === true)).toBe(true);

      useZoomStore.getState().rejectAll();
      expect(useZoomStore.getState().suggestions.every((s) => s.accepted === false)).toBe(true);
    });

    it('should apply keyframes from accepted suggestions', async () => {
      await useZoomStore.getState().generateZooms('entertainment');
      useZoomStore.getState().acceptAll();
      useZoomStore.getState().applyKeyframes();
      expect(useZoomStore.getState().keyframes.length).toBe(useZoomStore.getState().suggestions.length);
    });

    it('should reset zoom state', async () => {
      await useZoomStore.getState().generateZooms('entertainment');
      useZoomStore.getState().reset();
      expect(useZoomStore.getState().suggestions).toEqual([]);
      expect(useZoomStore.getState().isGenerated).toBe(false);
    });
  });

  describe('Stage Execution', () => {
    it('should progress zoom stage running → reviewing → awaiting-approval', () => {
      vi.useFakeTimers();
      usePipelineStore.getState().runZoomStage();

      for (let i = 0; i < 5; i++) vi.advanceTimersByTime(250);
      let stage = usePipelineStore.getState().stages.find((s) => s.id === 'zoom');
      expect(stage!.status).toBe('reviewing');

      vi.advanceTimersByTime(1200);
      stage = usePipelineStore.getState().stages.find((s) => s.id === 'zoom');
      expect(stage!.status).toBe('awaiting-approval');
      vi.useRealTimers();
    });
  });
});

// ════════════════════════════════════════════
// STAGE 6: SOUND EFFECTS
// ════════════════════════════════════════════

describe('Stage 6: Sound Effects', () => {
  beforeEach(() => { resetAll(); });

  describe('Pipeline Config', () => {
    it('should have sfx stage implemented', () => {
      expect(PIPELINE_STAGES.find((s) => s.id === 'sfx')!.implemented).toBe(true);
    });

    it('should run sfx stage after caption approval', () => {
      usePipelineStore.setState({ currentStageId: 'caption', isRunning: true });
      usePipelineStore.getState().setStageStatus('caption', 'awaiting-approval');
      usePipelineStore.getState().approveStage('caption');
      expect(usePipelineStore.getState().currentStageId).toBe('sfx');
    });
  });

  describe('SFX Library', () => {
    it('should have 14 built-in sound effects', () => {
      expect(SFX_LIBRARY.length).toBe(14);
      expect(SFX_LIBRARY.every((s) => s.builtIn)).toBe(true);
    });

    it('should cover all SFX categories', () => {
      const categories = new Set(SFX_LIBRARY.map((s) => s.category));
      expect(categories.size).toBeGreaterThanOrEqual(8);
      expect(categories).toContain('whoosh');
      expect(categories).toContain('pop');
      expect(categories).toContain('bass-drop');
    });

    it('should have positive durations for all SFX', () => {
      for (const sfx of SFX_LIBRARY) {
        expect(sfx.duration).toBeGreaterThan(0);
      }
    });
  });

  describe('SFX Rules', () => {
    it('should define rules for each content style', () => {
      const styles = ['entertainment', 'education', 'podcast', 'high-retention', 'clickbait'] as const;
      for (const style of styles) {
        const rules = getSFXRules(style);
        expect(rules.length).toBeGreaterThan(0);
        for (const rule of rules) {
          expect(rule.volume).toBeGreaterThan(0);
          expect(rule.volume).toBeLessThanOrEqual(1);
          expect(rule.categories.length).toBeGreaterThan(0);
        }
      }
    });

    it('entertainment should have more rules than podcast', () => {
      expect(getSFXRules('entertainment').length).toBeGreaterThan(getSFXRules('podcast').length);
    });
  });

  describe('SFX Placement Generation', () => {
    beforeEach(() => {
      useTranscriptStore.getState().loadMockData();
      useTimelineStore.getState().loadMockData();
    });

    it('should generate placements from transcript and clips', () => {
      const lines = useTranscriptStore.getState().lines;
      const clips = useTimelineStore.getState().clips;
      const placements = generateSFXPlacements(lines, clips, 'entertainment');

      expect(placements.length).toBeGreaterThan(0);
      for (const p of placements) {
        expect(p.time).toBeGreaterThanOrEqual(0);
        expect(p.duration).toBeGreaterThan(0);
        expect(p.volume).toBeGreaterThan(0);
        expect(p.sfxName).toBeTruthy();
        expect(p.reason).toBeTruthy();
        expect(p.accepted).toBeNull();
      }
    });

    it('should generate more SFX for entertainment than podcast', () => {
      const lines = useTranscriptStore.getState().lines;
      const clips = useTimelineStore.getState().clips;
      const ent = generateSFXPlacements(lines, clips, 'entertainment');
      const pod = generateSFXPlacements(lines, clips, 'podcast');
      expect(ent.length).toBeGreaterThanOrEqual(pod.length);
    });

    it('should generate placements sorted by time', () => {
      const lines = useTranscriptStore.getState().lines;
      const clips = useTimelineStore.getState().clips;
      const placements = generateSFXPlacements(lines, clips, 'entertainment');
      for (let i = 1; i < placements.length; i++) {
        expect(placements[i].time).toBeGreaterThanOrEqual(placements[i - 1].time);
      }
    });

    it('should handle empty transcript', () => {
      const clips = useTimelineStore.getState().clips;
      const placements = generateSFXPlacements([], clips, 'entertainment');
      // May still have cut-based placements
      expect(Array.isArray(placements)).toBe(true);
    });
  });

  describe('SFX Timeline Clips', () => {
    it('should convert accepted placements to timeline clips', () => {
      useTranscriptStore.getState().loadMockData();
      useTimelineStore.getState().loadMockData();
      const lines = useTranscriptStore.getState().lines;
      const clips = useTimelineStore.getState().clips;
      const placements = generateSFXPlacements(lines, clips, 'entertainment')
        .map((p) => ({ ...p, accepted: true as const }));

      const timelineClips = sfxPlacementsToTimelineClips(placements);
      expect(timelineClips.length).toBe(placements.length);
      for (const clip of timelineClips) {
        expect(clip.trackType).toBe('sfx');
        expect(clip.color).toBe('#50B0D0');
      }
    });

    it('should only include accepted placements', () => {
      useTranscriptStore.getState().loadMockData();
      useTimelineStore.getState().loadMockData();
      const lines = useTranscriptStore.getState().lines;
      const clips = useTimelineStore.getState().clips;
      const placements = generateSFXPlacements(lines, clips, 'entertainment')
        .map((p, i) => ({ ...p, accepted: (i % 2 === 0 ? true : false) as any }));

      const timelineClips = sfxPlacementsToTimelineClips(placements);
      expect(timelineClips.length).toBe(placements.filter((p) => p.accepted === true).length);
    });
  });

  describe('Stage Execution', () => {
    it('should progress sfx stage running → reviewing → awaiting-approval', () => {
      vi.useFakeTimers();
      usePipelineStore.getState().runSFXStage();

      for (let i = 0; i < 4; i++) vi.advanceTimersByTime(200);
      let stage = usePipelineStore.getState().stages.find((s) => s.id === 'sfx');
      expect(stage!.status).toBe('reviewing');

      vi.advanceTimersByTime(1000);
      stage = usePipelineStore.getState().stages.find((s) => s.id === 'sfx');
      expect(stage!.status).toBe('awaiting-approval');
      vi.useRealTimers();
    });
  });
});

// ════════════════════════════════════════════
// FULL PIPELINE FLOW: ALL 5 STAGES
// ════════════════════════════════════════════

describe('Full Pipeline: Trim → Audio → Zoom → Caption → SFX', () => {
  beforeEach(() => { resetAll(); });

  it('should chain all 5 implemented stages correctly', () => {
    useProjectStore.getState().createProject('Full Flow', 'shorts-editor', 'entertainment');

    const stages = usePipelineStore.getState().stages;
    const implemented = stages.filter((s) => s.implemented).map((s) => s.id);
    expect(implemented).toEqual(['trim', 'audio', 'zoom', 'broll', 'caption', 'sfx', 'color', 'review', 'export', 'thumbnail']);

    // Simulate full chain
    usePipelineStore.setState({ currentStageId: 'trim', isRunning: true });

    // Approve trim → advances to audio
    usePipelineStore.getState().setStageStatus('trim', 'awaiting-approval');
    usePipelineStore.getState().approveStage('trim');
    expect(usePipelineStore.getState().currentStageId).toBe('audio');

    // Approve audio → advances to zoom
    usePipelineStore.getState().setStageStatus('audio', 'awaiting-approval');
    usePipelineStore.getState().approveStage('audio');
    expect(usePipelineStore.getState().currentStageId).toBe('zoom');

    // Approve zoom → advances to broll
    usePipelineStore.getState().setStageStatus('zoom', 'awaiting-approval');
    usePipelineStore.getState().approveStage('zoom');
    expect(usePipelineStore.getState().currentStageId).toBe('broll');

    // Approve broll → advances to caption
    usePipelineStore.getState().setStageStatus('broll', 'awaiting-approval');
    usePipelineStore.getState().approveStage('broll');
    expect(usePipelineStore.getState().currentStageId).toBe('caption');

    // Approve caption → advances to sfx
    usePipelineStore.getState().setStageStatus('caption', 'awaiting-approval');
    usePipelineStore.getState().approveStage('caption');
    expect(usePipelineStore.getState().currentStageId).toBe('sfx');

    // Approve sfx → advances to color (not pipeline stop anymore)
    usePipelineStore.getState().setStageStatus('sfx', 'awaiting-approval');
    usePipelineStore.getState().approveStage('sfx');
    expect(usePipelineStore.getState().currentStageId).toBe('color');
    expect(usePipelineStore.getState().isRunning).toBe(true);

    // First 5 should be approved
    for (const id of ['trim', 'audio', 'zoom', 'caption', 'sfx']) {
      expect(usePipelineStore.getState().stages.find((s) => s.id === id)!.status).toBe('approved');
    }
  });
});
