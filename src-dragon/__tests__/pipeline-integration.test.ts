import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { useProjectStore } from '@/stores/projectStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { generateEDL } from '@/lib/export-edl';
import { generateFCPXML } from '@/lib/export-fcpxml';
import { generateSRT } from '@/lib/export-srt';
import { FILLER_LINE_IDS, MOCK_TRIM_SUGGESTIONS } from '@/lib/mockData';
import { TimelineClip, MediaItem } from '@/lib/types';

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const VIDEOS_DIR = path.resolve(__dirname, '../../videos');

function getVideoFiles(): string[] {
  if (!fs.existsSync(VIDEOS_DIR)) return [];
  return fs.readdirSync(VIDEOS_DIR).filter((f) => f.endsWith('.mp4'));
}

function makeMediaItem(filename: string, index: number): MediaItem {
  const filePath = path.join(VIDEOS_DIR, filename);
  const stats = fs.statSync(filePath);
  return {
    id: `video-${index}`,
    name: filename,
    type: 'video',
    duration: 60, // mock duration since we can't parse mp4 headers in pure JS
    url: filePath,
    thumbnailUrl: '',
  };
}

function makeClip(filename: string, index: number): TimelineClip {
  return {
    id: `clip-${index}`,
    trackType: 'video',
    name: filename,
    startTime: index * 60,
    duration: 60,
    sourceOffset: 0,
    color: '#3B82F6',
  };
}

// ────────────────────────────────────────────
// Reset all stores between tests
// ────────────────────────────────────────────

function resetAllStores() {
  useProjectStore.setState({ config: null, isEditorOpen: false });
  useMediaStore.setState({ items: [], selectedId: null, activeTab: 'footage' });
  useTimelineStore.setState({
    clips: [],
    playheadTime: 0,
    isPlaying: false,
    duration: 60,
    pixelsPerSecond: 20,
    selectedClipIds: [],
    snapEnabled: true,
    activeTool: 'select',
  });
  useTranscriptStore.setState({ lines: [], highlightFillers: true });
  usePipelineStore.getState().resetPipeline();
  useChatStore.setState({ messages: [] });
}

// ════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════

describe('Dragon Editor — Full Pipeline Integration', () => {
  beforeEach(() => {
    resetAllStores();
  });

  // ──────────────────────────────────────────
  // 1. Video files exist in /videos
  // ──────────────────────────────────────────

  describe('Video Import', () => {
    it('should find video files in the videos/ folder', () => {
      const files = getVideoFiles();
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) {
        expect(f).toMatch(/\.mp4$/);
        const filePath = path.join(VIDEOS_DIR, f);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('should import all video files into the media store', () => {
      const files = getVideoFiles();
      const store = useMediaStore.getState();

      files.forEach((f, i) => {
        store.addItem(makeMediaItem(f, i));
      });

      const state = useMediaStore.getState();
      expect(state.items.length).toBe(files.length);
      for (const item of state.items) {
        expect(item.type).toBe('video');
        expect(item.name).toMatch(/\.mp4$/);
        expect(item.duration).toBeGreaterThan(0);
      }
    });

    it('should place imported clips on the timeline', () => {
      const files = getVideoFiles();
      const timeline = useTimelineStore.getState();

      files.forEach((f, i) => {
        timeline.addClip(makeClip(f, i));
      });

      const state = useTimelineStore.getState();
      expect(state.clips.length).toBe(files.length);
      // Clips should be sequential (no overlaps)
      const sorted = [...state.clips].sort((a, b) => a.startTime - b.startTime);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].startTime).toBeGreaterThanOrEqual(
          sorted[i - 1].startTime + sorted[i - 1].duration
        );
      }
    });
  });

  // ──────────────────────────────────────────
  // 2. Project creation
  // ──────────────────────────────────────────

  describe('Project Creation', () => {
    it('should create a project with correct config', () => {
      useProjectStore.getState().createProject('Test Project', 'shorts-editor', 'entertainment');
      const state = useProjectStore.getState();

      expect(state.config).not.toBeNull();
      expect(state.config!.name).toBe('Test Project');
      expect(state.config!.mode).toBe('shorts-editor');
      expect(state.config!.style).toBe('entertainment');
      expect(state.config!.id).toBeTruthy();
      expect(state.config!.createdAt).toBeGreaterThan(0);
      expect(state.isEditorOpen).toBe(true);
    });

    it('should create projects in all three modes', () => {
      const modes = ['shorts-editor', 'shorts-extractor', 'long-form'] as const;
      for (const mode of modes) {
        resetAllStores();
        useProjectStore.getState().createProject(`${mode} project`, mode, 'education');
        const state = useProjectStore.getState();
        expect(state.config!.mode).toBe(mode);
        expect(state.isEditorOpen).toBe(true);
      }
    });

    it('should reset project back to selection screen', () => {
      useProjectStore.getState().createProject('Test', 'long-form', 'podcast');
      expect(useProjectStore.getState().isEditorOpen).toBe(true);

      useProjectStore.getState().resetProject();
      expect(useProjectStore.getState().isEditorOpen).toBe(false);
      expect(useProjectStore.getState().config).toBeNull();
    });
  });

  // ──────────────────────────────────────────
  // 3. Stage 1: Trim & Cut
  // ──────────────────────────────────────────

  describe('Stage 1: Trim & Cut', () => {
    beforeEach(() => {
      useProjectStore.getState().createProject('Trim Test', 'shorts-editor', 'entertainment');
      useMediaStore.getState().loadMockData();
      useTimelineStore.getState().loadMockData();
      useTranscriptStore.getState().loadMockData();
    });

    it('should load mock transcript with 20 lines', () => {
      const lines = useTranscriptStore.getState().lines;
      expect(lines.length).toBe(20);
      expect(lines[0].text).toContain('Hey everyone');
      expect(lines.every((l) => !l.deleted)).toBe(true);
    });

    it('should load mock timeline with video + mic clips', () => {
      const clips = useTimelineStore.getState().clips;
      expect(clips.length).toBe(2);
      expect(clips.find((c) => c.trackType === 'video')).toBeTruthy();
      expect(clips.find((c) => c.trackType === 'mic')).toBeTruthy();
    });

    it('should delete a transcript line and mark it deleted', () => {
      useTranscriptStore.getState().deleteLine('tl-5');
      const line = useTranscriptStore.getState().lines.find((l) => l.id === 'tl-5');
      expect(line!.deleted).toBe(true);
    });

    it('should restore a deleted transcript line', () => {
      useTranscriptStore.getState().deleteLine('tl-5');
      useTranscriptStore.getState().restoreLine('tl-5');
      const line = useTranscriptStore.getState().lines.find((l) => l.id === 'tl-5');
      expect(line!.deleted).toBe(false);
    });

    it('should remove all filler words at once', () => {
      useTranscriptStore.getState().removeAllFillerWords();
      const state = useTranscriptStore.getState();
      for (const id of FILLER_LINE_IDS) {
        const line = state.lines.find((l) => l.id === id);
        expect(line!.deleted).toBe(true);
      }
      // Non-filler lines should still be active
      const nonFiller = state.lines.filter((l) => !FILLER_LINE_IDS.includes(l.id));
      expect(nonFiller.every((l) => !l.deleted)).toBe(true);
    });

    it('should restore all deleted lines', () => {
      useTranscriptStore.getState().removeAllFillerWords();
      useTranscriptStore.getState().restoreAll();
      const state = useTranscriptStore.getState();
      expect(state.lines.every((l) => !l.deleted)).toBe(true);
    });

    it('should edit transcript text without affecting video', () => {
      useTranscriptStore.getState().editLineText('tl-1', 'Edited line text');
      const line = useTranscriptStore.getState().lines.find((l) => l.id === 'tl-1');
      expect(line!.text).toBe('Edited line text');
      expect(line!.edited).toBe(true);
      // Timeline should be unaffected
      const clips = useTimelineStore.getState().clips;
      expect(clips.length).toBe(2);
    });

    it('should mark cut regions on the timeline with ripple delete', () => {
      // Cut a region in the middle of the video clip (9s to 14.5s)
      useTimelineStore.getState().markCutRegion(9.0, 14.5);
      const after = useTimelineStore.getState().clips;
      // The video clip (0-60s) splits into: [0-9] and [9-54.5] (rippled left)
      // The mic clip (0-60s) splits similarly
      // So we go from 2 clips to 4 clips
      expect(after.length).toBe(4);

      // Total duration of video clips should be 60 - 5.5 = 54.5s
      const videoClips = after.filter((c) => c.trackType === 'video');
      const totalDuration = videoClips.reduce((sum, c) => sum + c.duration, 0);
      expect(totalDuration).toBeCloseTo(54.5, 1);

      // Second clip should start right where the first ends (no gap)
      const sorted = videoClips.sort((a, b) => a.startTime - b.startTime);
      if (sorted.length === 2) {
        expect(sorted[1].startTime).toBeCloseTo(sorted[0].startTime + sorted[0].duration, 5);
      }
    });

    it('should apply trim suggestions (accept/reject)', () => {
      const suggestions = MOCK_TRIM_SUGGESTIONS;

      // Accept first suggestion (dead space at 9-14.5s)
      const s1 = suggestions[0];
      useTranscriptStore.getState().deleteLines(s1.transcriptLineIds);
      useTimelineStore.getState().markCutRegion(s1.startTime, s1.endTime);

      // Verify transcript line deleted
      const deletedLine = useTranscriptStore.getState().lines.find((l) => l.id === 'tl-5');
      expect(deletedLine!.deleted).toBe(true);

      // Verify cut was applied — clips should be rippled together with no gap
      const clips = useTimelineStore.getState().clips;
      const videoClips = clips.filter((c) => c.trackType === 'video').sort((a, b) => a.startTime - b.startTime);
      if (videoClips.length >= 2) {
        // Second clip starts where first ends (ripple delete)
        expect(videoClips[1].startTime).toBeCloseTo(videoClips[0].startTime + videoClips[0].duration, 1);
      }
    });
  });

  // ──────────────────────────────────────────
  // 4. Pipeline progression
  // ──────────────────────────────────────────

  describe('Pipeline Stages', () => {
    beforeEach(() => {
      useProjectStore.getState().createProject('Pipeline Test', 'shorts-editor', 'entertainment');
    });

    it('should initialize with all 10 stages implemented', () => {
      const stages = usePipelineStore.getState().stages;
      const implemented = stages.filter((s) => s.implemented);
      expect(implemented.length).toBe(10);
    });

    it('should have all 10 stages defined', () => {
      const stages = usePipelineStore.getState().stages;
      expect(stages.length).toBe(10);
      const ids = stages.map((s) => s.id);
      expect(ids).toEqual([
        'trim', 'audio', 'zoom', 'broll', 'caption',
        'sfx', 'color', 'review', 'export', 'thumbnail',
      ]);
    });

    it('should have no N/A stages (all implemented)', () => {
      const stages = usePipelineStore.getState().stages;
      const naStages = stages.filter((s) => !s.implemented);
      expect(naStages.length).toBe(0);
    });

    it('should start pipeline and set trim stage to running', () => {
      // Use fake timers so we don't wait for real intervals
      vi.useFakeTimers();

      usePipelineStore.getState().startPipeline();
      const state = usePipelineStore.getState();

      expect(state.isRunning).toBe(true);
      expect(state.currentStageId).toBe('trim');

      const trimStage = state.stages.find((s) => s.id === 'trim');
      expect(trimStage!.status).toBe('running');

      vi.useRealTimers();
    });

    it('should progress trim stage through running → reviewing → awaiting-approval', () => {
      vi.useFakeTimers();

      usePipelineStore.getState().startPipeline();

      // Advance through all progress intervals (7 * 300ms to reach 100%)
      for (let i = 0; i < 7; i++) {
        vi.advanceTimersByTime(300);
      }

      // Should now be in 'reviewing'
      let trimStage = usePipelineStore.getState().stages.find((s) => s.id === 'trim');
      expect(trimStage!.status).toBe('reviewing');
      expect(trimStage!.progress).toBe(100);

      // After 1500ms review delay, should be 'awaiting-approval'
      vi.advanceTimersByTime(1500);
      trimStage = usePipelineStore.getState().stages.find((s) => s.id === 'trim');
      expect(trimStage!.status).toBe('awaiting-approval');

      vi.useRealTimers();
    });

    it('should approve trim stage and advance to audio stage', () => {
      usePipelineStore.getState().setStageStatus('trim', 'awaiting-approval');
      usePipelineStore.setState({ currentStageId: 'trim', isRunning: true });

      usePipelineStore.getState().approveStage('trim');

      const state = usePipelineStore.getState();
      const trimStage = state.stages.find((s) => s.id === 'trim');
      expect(trimStage!.status).toBe('approved');
      // Should advance to audio (next implemented stage)
      expect(state.currentStageId).toBe('audio');
      expect(state.isRunning).toBe(true);
    });

    it('should reject trim stage and allow re-run', () => {
      usePipelineStore.getState().setStageStatus('trim', 'awaiting-approval');
      usePipelineStore.getState().rejectStage('trim');

      const trimStage = usePipelineStore.getState().stages.find((s) => s.id === 'trim');
      expect(trimStage!.status).toBe('rejected');
      expect(trimStage!.progress).toBe(0);
    });

    it('should reset pipeline to initial state', () => {
      usePipelineStore.getState().setStageStatus('trim', 'approved');
      usePipelineStore.setState({ currentStageId: 'trim', isRunning: true });

      usePipelineStore.getState().resetPipeline();

      const state = usePipelineStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentStageId).toBeNull();
      const trimStage = state.stages.find((s) => s.id === 'trim');
      expect(trimStage!.status).toBe('pending');
    });
  });

  // ──────────────────────────────────────────
  // 5. Timeline operations
  // ──────────────────────────────────────────

  describe('Timeline Operations', () => {
    beforeEach(() => {
      useTimelineStore.getState().loadMockData();
    });

    it('should split clip at playhead', () => {
      const videoClip = useTimelineStore.getState().clips.find((c) => c.trackType === 'video');
      useTimelineStore.getState().setPlayheadTime(30);
      useTimelineStore.getState().splitClipAtPlayhead(videoClip!.id);

      const clips = useTimelineStore.getState().clips.filter((c) => c.trackType === 'video');
      expect(clips.length).toBe(2);

      const sorted = clips.sort((a, b) => a.startTime - b.startTime);
      expect(sorted[0].duration).toBe(30);
      expect(sorted[1].startTime).toBe(30);
      expect(sorted[1].duration).toBe(30);
    });

    it('should not split clip when playhead is outside', () => {
      const videoClip = useTimelineStore.getState().clips.find((c) => c.trackType === 'video');
      useTimelineStore.getState().setPlayheadTime(0); // at start — no split
      useTimelineStore.getState().splitClipAtPlayhead(videoClip!.id);

      const clips = useTimelineStore.getState().clips.filter((c) => c.trackType === 'video');
      expect(clips.length).toBe(1);
    });

    it('should select and deselect clips', () => {
      const clips = useTimelineStore.getState().clips;
      useTimelineStore.getState().selectClip(clips[0].id);
      expect(useTimelineStore.getState().selectedClipIds).toEqual([clips[0].id]);

      useTimelineStore.getState().selectClip(clips[1].id, true); // multi-select
      expect(useTimelineStore.getState().selectedClipIds).toEqual([clips[0].id, clips[1].id]);

      useTimelineStore.getState().clearSelection();
      expect(useTimelineStore.getState().selectedClipIds).toEqual([]);
    });

    it('should move a clip', () => {
      const videoClip = useTimelineStore.getState().clips.find((c) => c.trackType === 'video');
      useTimelineStore.getState().moveClip(videoClip!.id, 10);
      const moved = useTimelineStore.getState().clips.find((c) => c.id === videoClip!.id);
      expect(moved!.startTime).toBe(10);
    });

    it('should clamp move to not go negative', () => {
      const videoClip = useTimelineStore.getState().clips.find((c) => c.trackType === 'video');
      useTimelineStore.getState().moveClip(videoClip!.id, -5);
      const moved = useTimelineStore.getState().clips.find((c) => c.id === videoClip!.id);
      expect(moved!.startTime).toBe(0);
    });

    it('should remove a clip', () => {
      const videoClip = useTimelineStore.getState().clips.find((c) => c.trackType === 'video');
      useTimelineStore.getState().removeClip(videoClip!.id);
      expect(useTimelineStore.getState().clips.find((c) => c.id === videoClip!.id)).toBeUndefined();
    });

    it('should toggle playback', () => {
      expect(useTimelineStore.getState().isPlaying).toBe(false);
      useTimelineStore.getState().togglePlayback();
      expect(useTimelineStore.getState().isPlaying).toBe(true);
      useTimelineStore.getState().togglePlayback();
      expect(useTimelineStore.getState().isPlaying).toBe(false);
    });

    it('should clamp pixelsPerSecond to 5-100', () => {
      useTimelineStore.getState().setPixelsPerSecond(2);
      expect(useTimelineStore.getState().pixelsPerSecond).toBe(5);
      useTimelineStore.getState().setPixelsPerSecond(200);
      expect(useTimelineStore.getState().pixelsPerSecond).toBe(100);
    });

    it('should toggle snap and tools', () => {
      useTimelineStore.getState().toggleSnap();
      expect(useTimelineStore.getState().snapEnabled).toBe(false);
      useTimelineStore.getState().setActiveTool('razor');
      expect(useTimelineStore.getState().activeTool).toBe('razor');
    });
  });

  // ──────────────────────────────────────────
  // 6. Chat store
  // ──────────────────────────────────────────

  describe('Chat Store', () => {
    it('should add messages with correct roles', () => {
      const chat = useChatStore.getState();
      chat.addMessage('user', 'Hello');
      chat.addMessage('assistant', 'Hi there');
      chat.addMessage('system', 'Pipeline started');

      const messages = useChatStore.getState().messages;
      expect(messages.length).toBe(3);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('system');
    });

    it('should clear all messages', () => {
      useChatStore.getState().addMessage('user', 'test');
      useChatStore.getState().clearMessages();
      expect(useChatStore.getState().messages.length).toBe(0);
    });

    it('should generate unique IDs for each message', () => {
      const chat = useChatStore.getState();
      chat.addMessage('user', 'A');
      chat.addMessage('user', 'B');
      const msgs = useChatStore.getState().messages;
      expect(msgs[0].id).not.toBe(msgs[1].id);
    });
  });

  // ──────────────────────────────────────────
  // 7. Export — EDL
  // ──────────────────────────────────────────

  describe('Export: EDL', () => {
    it('should generate valid EDL from timeline clips', () => {
      useTimelineStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;
      const edl = generateEDL(clips, 'Test Export', 30);

      expect(edl).toContain('TITLE: Test Export');
      expect(edl).toContain('FCM: NON-DROP FRAME');
      expect(edl).toContain('raw_footage.mp4');
      expect(edl).toContain('mic_audio.wav');
      // Should have timecodes in SMPTE format
      expect(edl).toMatch(/\d{2}:\d{2}:\d{2}:\d{2}/);
    });

    it('should generate EDL with correct event numbers', () => {
      useTimelineStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;
      const edl = generateEDL(clips, 'Test', 30);
      expect(edl).toContain('001');
      expect(edl).toContain('002');
    });

    it('should map track types to correct channel codes', () => {
      const clips: TimelineClip[] = [
        { id: '1', trackType: 'video', name: 'vid.mp4', startTime: 0, duration: 10, sourceOffset: 0, color: '#fff' },
        { id: '2', trackType: 'mic', name: 'mic.wav', startTime: 0, duration: 10, sourceOffset: 0, color: '#fff' },
        { id: '3', trackType: 'sfx', name: 'sfx.wav', startTime: 0, duration: 5, sourceOffset: 0, color: '#fff' },
        { id: '4', trackType: 'music', name: 'bg.mp3', startTime: 0, duration: 10, sourceOffset: 0, color: '#fff' },
      ];
      const edl = generateEDL(clips, 'Channel Test', 30);
      expect(edl).toContain(' V ');
      expect(edl).toContain(' A ');
      expect(edl).toContain(' A2 ');
      expect(edl).toContain(' A3 ');
    });

    it('should handle empty clip list', () => {
      const edl = generateEDL([], 'Empty', 30);
      expect(edl).toContain('TITLE: Empty');
      expect(edl).not.toContain('001');
    });

    it('should generate EDL after trim cuts are applied', () => {
      useTimelineStore.getState().loadMockData();
      // Apply a cut
      useTimelineStore.getState().markCutRegion(9.0, 14.5);
      const clips = useTimelineStore.getState().clips;
      const edl = generateEDL(clips, 'After Trim', 30);
      // Should have more events since clips were split
      expect(edl).toContain('001');
      expect(edl).toContain('002');
      expect(edl).toContain('003');
    });
  });

  // ──────────────────────────────────────────
  // 8. Export — FCPXML
  // ──────────────────────────────────────────

  describe('Export: FCPXML', () => {
    it('should generate valid FCPXML structure', () => {
      useTimelineStore.getState().loadMockData();
      useTranscriptStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;
      const lines = useTranscriptStore.getState().lines;

      const xml = generateFCPXML({
        title: 'FCPXML Test',
        fps: 30,
        width: 1080,
        height: 1920,
        duration: 60,
        clips,
        transcriptLines: lines,
      });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<!DOCTYPE fcpxml>');
      expect(xml).toContain('<fcpxml version="1.11">');
      expect(xml).toContain('</fcpxml>');
      expect(xml).toContain('FCPXML Test');
    });

    it('should include asset resources for source files', () => {
      useTimelineStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;

      const xml = generateFCPXML({
        title: 'Asset Test',
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 60,
        clips,
      });

      expect(xml).toContain('<asset id=');
      expect(xml).toContain('raw_footage.mp4');
      expect(xml).toContain('mic_audio.wav');
      expect(xml).toContain('<media-rep');
    });

    it('should include transcript lines as markers', () => {
      useTimelineStore.getState().loadMockData();
      useTranscriptStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;
      const lines = useTranscriptStore.getState().lines;

      const xml = generateFCPXML({
        title: 'Marker Test',
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 60,
        clips,
        transcriptLines: lines,
      });

      expect(xml).toContain('<marker');
      expect(xml).toContain('Hey everyone');
    });

    it('should skip deleted transcript markers', () => {
      useTimelineStore.getState().loadMockData();
      useTranscriptStore.getState().loadMockData();
      useTranscriptStore.getState().deleteLine('tl-5');

      const clips = useTimelineStore.getState().clips;
      const lines = useTranscriptStore.getState().lines;

      const xml = generateFCPXML({
        title: 'Skip Test',
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 60,
        clips,
        transcriptLines: lines,
      });

      // tl-5 text should NOT appear as a marker
      expect(xml).not.toContain('searching for something');
    });

    it('should use correct resolution for shorts vs long-form', () => {
      useTimelineStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;

      const shortsXml = generateFCPXML({
        title: 'Shorts', fps: 30, width: 1080, height: 1920, duration: 60, clips,
      });
      expect(shortsXml).toContain('width="1080"');
      expect(shortsXml).toContain('height="1920"');

      const longFormXml = generateFCPXML({
        title: 'Long', fps: 30, width: 1920, height: 1080, duration: 60, clips,
      });
      expect(longFormXml).toContain('width="1920"');
      expect(longFormXml).toContain('height="1080"');
    });

    it('should use rational time format', () => {
      useTimelineStore.getState().loadMockData();
      const clips = useTimelineStore.getState().clips;

      const xml = generateFCPXML({
        title: 'Time Test', fps: 30, width: 1920, height: 1080, duration: 60, clips,
      });

      // FCP rational time looks like "1800/30s" for 60 seconds at 30fps
      expect(xml).toMatch(/\d+\/30s/);
    });
  });

  // ──────────────────────────────────────────
  // 9. Export — SRT
  // ──────────────────────────────────────────

  describe('Export: SRT', () => {
    beforeEach(() => {
      useTranscriptStore.getState().loadMockData();
    });

    it('should generate valid SRT format', () => {
      const lines = useTranscriptStore.getState().lines;
      const srt = generateSRT(lines);

      // SRT starts with sequence number 1
      expect(srt).toMatch(/^1\n/);
      // Contains timestamp format HH:MM:SS,mmm --> HH:MM:SS,mmm
      expect(srt).toMatch(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);
      // Contains text
      expect(srt).toContain('Hey everyone');
    });

    it('should include speaker names in bold', () => {
      const lines = useTranscriptStore.getState().lines;
      const srt = generateSRT(lines);
      expect(srt).toContain('<b>Speaker 1:</b>');
    });

    it('should exclude deleted lines', () => {
      useTranscriptStore.getState().deleteLine('tl-5');
      const lines = useTranscriptStore.getState().lines;
      const srt = generateSRT(lines);
      expect(srt).not.toContain('searching for something');
    });

    it('should exclude all filler-deleted lines', () => {
      useTranscriptStore.getState().removeAllFillerWords();
      const lines = useTranscriptStore.getState().lines;
      const srt = generateSRT(lines);
      // Active count should be 20 - 6 filler lines = 14
      const entryCount = (srt.match(/\n\d+\n/g) || []).length + 1; // +1 for first entry
      expect(entryCount).toBe(14);
    });

    it('should handle empty transcript', () => {
      useTranscriptStore.setState({ lines: [] });
      const srt = generateSRT(useTranscriptStore.getState().lines);
      expect(srt.trim()).toBe('');
    });

    it('should maintain correct sequential numbering after deletions', () => {
      useTranscriptStore.getState().deleteLine('tl-1');
      useTranscriptStore.getState().deleteLine('tl-2');
      const lines = useTranscriptStore.getState().lines;
      const srt = generateSRT(lines);

      // First entry should be numbered 1, not 3
      const firstLine = srt.split('\n')[0];
      expect(firstLine).toBe('1');
    });
  });

  // ──────────────────────────────────────────
  // 10. Full end-to-end workflow with real video
  // ──────────────────────────────────────────

  describe('End-to-End: Import Video → Trim → Export', () => {
    it('should complete full workflow: create project → import video → trim → export all formats', () => {
      const videoFiles = getVideoFiles();
      if (videoFiles.length === 0) {
        console.warn('No video files found in videos/ — skipping e2e');
        return;
      }

      // 1. Create project
      useProjectStore.getState().createProject('E2E Test', 'shorts-editor', 'high-retention');
      expect(useProjectStore.getState().isEditorOpen).toBe(true);

      // 2. Import first video into media store
      const filename = videoFiles[0];
      const media = makeMediaItem(filename, 0);
      useMediaStore.getState().addItem(media);
      expect(useMediaStore.getState().items.length).toBe(1);
      expect(useMediaStore.getState().items[0].name).toBe(filename);

      // 3. Place clip on timeline
      const clip = makeClip(filename, 0);
      useTimelineStore.getState().addClip(clip);
      expect(useTimelineStore.getState().clips.length).toBe(1);

      // 4. Load transcript (mock — real transcription would need a backend)
      useTranscriptStore.getState().loadMockData();
      expect(useTranscriptStore.getState().lines.length).toBe(20);

      // 5. Apply trim cuts
      useTranscriptStore.getState().deleteLine('tl-5'); // delete dead space line
      useTimelineStore.getState().markCutRegion(9.0, 14.5); // cut corresponding timeline region

      const transcriptDeleted = useTranscriptStore.getState().lines.find((l) => l.id === 'tl-5');
      expect(transcriptDeleted!.deleted).toBe(true);

      const clipsAfterCut = useTimelineStore.getState().clips;
      expect(clipsAfterCut.length).toBe(2); // original split into 2

      // 6. Remove filler words
      useTranscriptStore.getState().removeAllFillerWords();
      const activeLines = useTranscriptStore.getState().lines.filter((l) => !l.deleted);
      expect(activeLines.length).toBeLessThan(20);

      // 7. Approve trim stage
      usePipelineStore.getState().setStageStatus('trim', 'awaiting-approval');
      usePipelineStore.setState({ currentStageId: 'trim', isRunning: true });
      usePipelineStore.getState().approveStage('trim');
      expect(usePipelineStore.getState().stages.find((s) => s.id === 'trim')!.status).toBe('approved');

      // 8. Export EDL
      const finalClips = useTimelineStore.getState().clips;
      const edl = generateEDL(finalClips, 'E2E Test', 30);
      expect(edl).toContain('TITLE: E2E Test');
      expect(edl).toContain(filename.replace(/[^a-zA-Z0-9_.\-]/g, '_').substring(0, 32));
      expect(edl.split('\n').filter((l) => l.match(/^\d{3}/))).toHaveLength(finalClips.length);

      // 9. Export FCPXML
      const lines = useTranscriptStore.getState().lines;
      const xml = generateFCPXML({
        title: 'E2E Test',
        fps: 30,
        width: 1080,
        height: 1920,
        duration: 60,
        clips: finalClips,
        transcriptLines: lines,
      });
      expect(xml).toContain('<fcpxml version="1.11">');
      expect(xml).toContain('E2E Test');
      // Deleted transcript lines should NOT appear as markers
      expect(xml).not.toContain('searching for something');

      // 10. Export SRT
      const srt = generateSRT(lines);
      expect(srt).toContain('-->');
      // Should not contain deleted filler lines
      const deletedFillerTexts = useTranscriptStore.getState().lines
        .filter((l) => l.deleted)
        .map((l) => l.text);
      for (const text of deletedFillerTexts) {
        expect(srt).not.toContain(text);
      }
    });
  });
});
