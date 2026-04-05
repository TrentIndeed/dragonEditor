import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Types ──────────────────────────────────────────────────────────────────

export type TrackType = "video" | "mic" | "broll" | "caption" | "sfx" | "music";

export interface TimelineClip {
  id: string;
  trackType: TrackType;
  name: string;
  startTime: number; // seconds
  duration: number; // seconds
  sourceOffset: number;
  color: string;
  linkedClipId?: string;
  src?: string;
  thumbnailUrl?: string;
}

export type TimelineTool = "select" | "razor" | "hand";

// ── Constants ──────────────────────────────────────────────────────────────

export const TRACK_COLORS: Record<TrackType, string> = {
  video: "#3B82F6",
  mic: "#22C55E",
  broll: "#A855F7",
  caption: "#F59E0B",
  sfx: "#EF4444",
  music: "#EC4899",
};

export const TRACK_HEIGHTS: Record<TrackType, number> = {
  video: 48,
  mic: 40,
  broll: 44,
  caption: 36,
  sfx: 36,
  music: 40,
};

const SNAP_THRESHOLD_PX = 8;

// ── Helpers ────────────────────────────────────────────────────────────────

function genId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < 12; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

// ── Store ──────────────────────────────────────────────────────────────────

interface DragonTimelineStore {
  clips: TimelineClip[];
  playheadTime: number;
  duration: number; // seconds
  pixelsPerSecond: number;
  snapEnabled: boolean;
  activeTool: TimelineTool;
  selectedClipIds: string[];

  setPlayheadTime: (t: number) => void;
  setPixelsPerSecond: (pps: number) => void;
  setActiveTool: (tool: TimelineTool) => void;
  toggleSnap: () => void;
  selectClip: (id: string, multi?: boolean) => void;
  clearSelection: () => void;

  addClip: (clip: TimelineClip) => void;
  addLinkedClips: (video: TimelineClip, audio: TimelineClip) => void;
  removeClip: (id: string) => void;
  moveClip: (id: string, newStartTime: number) => void;
  splitClipAtPlayhead: (id: string) => void;
  markCutRegion: (startTime: number, endTime: number) => void;
  setDuration: (d: number) => void;
}

export const useDragonTimelineStore = create<DragonTimelineStore>()(persist((set, get) => ({
  clips: [],
  playheadTime: 0,
  duration: 60,
  pixelsPerSecond: 20,
  selectedClipIds: [],
  snapEnabled: true,
  activeTool: "select",

  setPlayheadTime: (t) => set({ playheadTime: t }),
  setDuration: (d) => set({ duration: d }),

  setPixelsPerSecond: (pps) =>
    set({ pixelsPerSecond: Math.max(5, Math.min(100, pps)) }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  selectClip: (id, multi) =>
    set((s) => ({
      selectedClipIds: multi ? [...s.selectedClipIds, id] : [id],
    })),

  clearSelection: () => set({ selectedClipIds: [] }),

  addClip: (clip) =>
    set((s) => {
      const newEnd = clip.startTime + clip.duration;
      return {
        clips: [...s.clips, clip],
        duration: newEnd > s.duration ? newEnd + 10 : s.duration,
      };
    }),

  addLinkedClips: (video, audio) =>
    set((s) => {
      const newEnd = Math.max(video.startTime + video.duration, audio.startTime + audio.duration);
      return {
        clips: [...s.clips, video, audio],
        duration: newEnd > s.duration ? newEnd + 10 : s.duration,
      };
    }),

  removeClip: (id) =>
    set((s) => {
      const clip = s.clips.find((c) => c.id === id);
      const idsToRemove = new Set([id]);
      if (clip?.linkedClipId) idsToRemove.add(clip.linkedClipId);
      return {
        clips: s.clips.filter((c) => !idsToRemove.has(c.id)),
        selectedClipIds: s.selectedClipIds.filter((cid) => !idsToRemove.has(cid)),
      };
    }),

  moveClip: (id, newStartTime) =>
    set((s) => {
      const clip = s.clips.find((c) => c.id === id);
      if (!clip) return s;

      let snapped = Math.max(0, newStartTime);

      if (s.snapEnabled) {
        const threshold = SNAP_THRESHOLD_PX / s.pixelsPerSecond;
        const movingEnd = snapped + clip.duration;
        const linkedId = clip.linkedClipId;
        const others = s.clips.filter(
          (c) => c.id !== id && c.id !== linkedId && c.trackType === clip.trackType
        );

        for (const o of others) {
          const oEnd = o.startTime + o.duration;
          if (Math.abs(snapped - oEnd) < threshold) { snapped = oEnd; break; }
          if (Math.abs(movingEnd - o.startTime) < threshold) { snapped = o.startTime - clip.duration; break; }
          if (Math.abs(snapped - o.startTime) < threshold) { snapped = o.startTime; break; }
          if (Math.abs(movingEnd - oEnd) < threshold) { snapped = oEnd - clip.duration; break; }
        }

        if (Math.abs(snapped - s.playheadTime) < threshold) snapped = s.playheadTime;
        if (Math.abs(snapped + clip.duration - s.playheadTime) < threshold) snapped = s.playheadTime - clip.duration;
        if (Math.abs(snapped) < threshold) snapped = 0;
        snapped = Math.max(0, snapped);
      }

      const delta = snapped - clip.startTime;
      const linkedId = clip.linkedClipId;
      return {
        clips: s.clips.map((c) => {
          if (c.id === id) return { ...c, startTime: snapped };
          if (linkedId && c.id === linkedId) return { ...c, startTime: Math.max(0, c.startTime + delta) };
          return c;
        }),
      };
    }),

  splitClipAtPlayhead: (id) => {
    const state = get();
    const clip = state.clips.find((c) => c.id === id);
    if (!clip) return;
    const splitPoint = state.playheadTime - clip.startTime;
    if (splitPoint <= 0 || splitPoint >= clip.duration) return;

    const newId1 = genId();
    const newId2 = genId();
    const leftClip: TimelineClip = { ...clip, duration: splitPoint, linkedClipId: undefined };
    const rightClip: TimelineClip = {
      ...clip,
      id: newId1,
      startTime: clip.startTime + splitPoint,
      duration: clip.duration - splitPoint,
      sourceOffset: clip.sourceOffset + splitPoint,
      linkedClipId: undefined,
    };

    let newClips = state.clips.filter((c) => c.id !== id);
    const linked = clip.linkedClipId ? state.clips.find((c) => c.id === clip.linkedClipId) : null;
    if (linked) {
      const linkedLeft: TimelineClip = { ...linked, duration: splitPoint, linkedClipId: clip.id };
      const linkedRight: TimelineClip = {
        ...linked,
        id: newId2,
        startTime: linked.startTime + splitPoint,
        duration: linked.duration - splitPoint,
        sourceOffset: linked.sourceOffset + splitPoint,
        linkedClipId: newId1,
      };
      leftClip.linkedClipId = linked.id;
      rightClip.linkedClipId = newId2;
      newClips = newClips.filter((c) => c.id !== linked.id);
      newClips.push(leftClip, rightClip, linkedLeft, linkedRight);
    } else {
      newClips.push(leftClip, rightClip);
    }

    set({ clips: newClips });
  },

  markCutRegion: (startTime, endTime) => {
    const state = get();
    const cutDuration = endTime - startTime;
    const rightFragmentIds = new Map<string, string>();

    for (const clip of state.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (
        (clip.startTime < endTime && clipEnd > endTime && clip.startTime < startTime) ||
        (clip.startTime >= startTime && clip.startTime < endTime && clipEnd > endTime)
      ) {
        rightFragmentIds.set(clip.id, genId());
      }
    }

    const newClips: TimelineClip[] = [];
    for (const clip of state.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd <= startTime) { newClips.push(clip); continue; }
      if (clip.startTime >= startTime && clipEnd <= endTime) continue;
      if (clip.startTime >= endTime) {
        newClips.push({ ...clip, startTime: clip.startTime - cutDuration });
        continue;
      }
      if (clip.startTime < startTime) {
        newClips.push({ ...clip, duration: startTime - clip.startTime });
      }
      if (clipEnd > endTime) {
        const newId = rightFragmentIds.get(clip.id) || genId();
        let newLinkedId: string | undefined;
        if (clip.linkedClipId) newLinkedId = rightFragmentIds.get(clip.linkedClipId);
        newClips.push({
          ...clip,
          id: newId,
          startTime: startTime,
          duration: clipEnd - endTime,
          sourceOffset: clip.sourceOffset + (endTime - clip.startTime),
          linkedClipId: newLinkedId || clip.linkedClipId,
        });
      }
    }

    set({ clips: newClips, duration: Math.max(10, state.duration - cutDuration) });
  },
}), {
  name: "dragon-timeline",
  partialize: (state) => ({
    clips: state.clips.map((c) => ({
      ...c,
      // blob URLs die on reload — clear them, keep data: URL thumbnails
      src: c.src?.startsWith("blob:") ? "" : c.src,
      thumbnailUrl: c.thumbnailUrl?.startsWith("data:") ? c.thumbnailUrl : undefined,
    })),
    duration: state.duration,
    pixelsPerSecond: state.pixelsPerSecond,
    snapEnabled: state.snapEnabled,
  }),
}));
