import { create } from 'zustand';
import { TimelineClip, TrackType } from '@/lib/types';
import { MOCK_TIMELINE_CLIPS } from '@/lib/mockData';
import { generateId } from '@/lib/utils';
import { saveState, loadState } from '@/lib/persist';

const SNAP_THRESHOLD_PX = 8; // pixels within which clips magnetize

interface TimelineState {
  clips: TimelineClip[];
  duration: number;
  pixelsPerSecond: number;
  snapEnabled: boolean;
  activeTool: 'select' | 'razor' | 'hand';
}

interface TimelineStore extends TimelineState {
  playheadTime: number;
  isPlaying: boolean;
  selectedClipIds: string[];
  setPlayheadTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  setPixelsPerSecond: (pps: number) => void;
  setActiveTool: (tool: TimelineStore['activeTool']) => void;
  toggleSnap: () => void;
  selectClip: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  addClip: (clip: TimelineClip) => void;
  addLinkedClips: (videoClip: TimelineClip, audioClip: TimelineClip) => void;
  removeClip: (id: string) => void;
  moveClip: (id: string, newStartTime: number) => void;
  splitClipAtPlayhead: (id: string) => void;
  loadMockData: () => void;
  markCutRegion: (startTime: number, endTime: number) => void;
}

const saved = typeof window !== 'undefined' ? loadState<TimelineState>('timeline') : null;

function persist(state: TimelineStore) {
  saveState('timeline', {
    clips: state.clips,
    duration: state.duration,
    pixelsPerSecond: state.pixelsPerSecond,
    snapEnabled: state.snapEnabled,
    activeTool: state.activeTool,
  });
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  clips: saved?.clips ?? [],
  playheadTime: 0,
  isPlaying: false,
  duration: saved?.duration ?? 60,
  pixelsPerSecond: saved?.pixelsPerSecond ?? 20,
  selectedClipIds: [],
  snapEnabled: saved?.snapEnabled ?? true,
  activeTool: saved?.activeTool ?? 'select',
  setPlayheadTime: (time) => set({ playheadTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPixelsPerSecond: (pps) => { set({ pixelsPerSecond: Math.max(5, Math.min(100, pps)) }); persist(get()); },
  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleSnap: () => { set((s) => ({ snapEnabled: !s.snapEnabled })); persist(get()); },
  selectClip: (id, multi) => set((s) => ({
    selectedClipIds: multi ? [...s.selectedClipIds, id] : [id],
  })),
  clearSelection: () => set({ selectedClipIds: [] }),

  addClip: (clip) => { set((s) => ({ clips: [...s.clips, clip] })); persist(get()); },

  addLinkedClips: (videoClip, audioClip) => { set((s) => ({ clips: [...s.clips, videoClip, audioClip] })); persist(get()); },

  removeClip: (id) => {
    set((s) => {
      const clip = s.clips.find((c) => c.id === id);
      const linkedId = clip?.linkedClipId;
      const idsToRemove = new Set([id]);
      if (linkedId) idsToRemove.add(linkedId);
      return {
        clips: s.clips.filter((c) => !idsToRemove.has(c.id)),
        selectedClipIds: s.selectedClipIds.filter((cid) => !idsToRemove.has(cid)),
      };
    });
    persist(get());
  },

  moveClip: (id, newStartTime) => {
    set((s) => {
      const clip = s.clips.find((c) => c.id === id);
      if (!clip) return s;

      let snappedTime = Math.max(0, newStartTime);

      // Snap to other clip edges if snap is enabled
      if (s.snapEnabled) {
        const snapThreshold = SNAP_THRESHOLD_PX / s.pixelsPerSecond;
        const movingEnd = snappedTime + clip.duration;
        const linkedId = clip.linkedClipId;
        const otherClips = s.clips.filter((c) => c.id !== id && c.id !== linkedId && c.trackType === clip.trackType);

        for (const other of otherClips) {
          const otherEnd = other.startTime + other.duration;

          // Snap moving clip's start to other clip's end (magnet together)
          if (Math.abs(snappedTime - otherEnd) < snapThreshold) {
            snappedTime = otherEnd;
            break;
          }
          // Snap moving clip's end to other clip's start
          if (Math.abs(movingEnd - other.startTime) < snapThreshold) {
            snappedTime = other.startTime - clip.duration;
            break;
          }
          // Snap start-to-start
          if (Math.abs(snappedTime - other.startTime) < snapThreshold) {
            snappedTime = other.startTime;
            break;
          }
          // Snap end-to-end
          if (Math.abs(movingEnd - otherEnd) < snapThreshold) {
            snappedTime = otherEnd - clip.duration;
            break;
          }
        }

        // Snap to playhead
        if (Math.abs(snappedTime - s.playheadTime) < snapThreshold) {
          snappedTime = s.playheadTime;
        }
        if (Math.abs(movingEnd - s.playheadTime) < snapThreshold) {
          snappedTime = s.playheadTime - clip.duration;
        }

        // Snap to zero
        if (Math.abs(snappedTime) < snapThreshold) {
          snappedTime = 0;
        }

        snappedTime = Math.max(0, snappedTime);
      }

      const delta = snappedTime - clip.startTime;
      const linkedId = clip.linkedClipId;
      return {
        clips: s.clips.map((c) => {
          if (c.id === id) return { ...c, startTime: snappedTime };
          if (linkedId && c.id === linkedId) return { ...c, startTime: Math.max(0, c.startTime + delta) };
          return c;
        }),
      };
    });
  },

  splitClipAtPlayhead: (id) => {
    const state = get();
    const clip = state.clips.find((c) => c.id === id);
    if (!clip) return;
    const splitPoint = state.playheadTime - clip.startTime;
    if (splitPoint <= 0 || splitPoint >= clip.duration) return;

    const newId1 = generateId();
    const newId2 = generateId();
    const leftClip: TimelineClip = { ...clip, id: clip.id, duration: splitPoint, linkedClipId: undefined };
    const rightClip: TimelineClip = {
      ...clip, id: newId1,
      startTime: clip.startTime + splitPoint,
      duration: clip.duration - splitPoint,
      sourceOffset: clip.sourceOffset + splitPoint,
      linkedClipId: undefined,
    };

    let newClips = state.clips.filter((c) => c.id !== id);
    const linked = clip.linkedClipId ? state.clips.find((c) => c.id === clip.linkedClipId) : null;
    if (linked) {
      const linkedLeft: TimelineClip = { ...linked, id: linked.id, duration: splitPoint, linkedClipId: clip.id };
      const linkedRight: TimelineClip = {
        ...linked, id: newId2,
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
    persist(get());
  },

  loadMockData: () => { set({ clips: MOCK_TIMELINE_CLIPS, duration: 60 }); persist(get()); },

  markCutRegion: (startTime, endTime) => {
    const state = get();
    const cutDuration = endTime - startTime;

    // First pass: generate new IDs for right-side fragments so we can link them
    const rightFragmentIds = new Map<string, string>(); // oldClipId -> newRightFragmentId
    for (const clip of state.clips) {
      const clipEnd = clip.startTime + clip.duration;
      if (clip.startTime < endTime && clipEnd > endTime && clip.startTime < startTime) {
        // This clip will be split — right fragment needs a new ID
        rightFragmentIds.set(clip.id, generateId());
      } else if (clip.startTime >= startTime && clip.startTime < endTime && clipEnd > endTime) {
        // Clip starts inside cut but extends past — becomes a trimmed clip
        rightFragmentIds.set(clip.id, generateId());
      }
    }

    const newClips: TimelineClip[] = [];

    for (const clip of state.clips) {
      const clipEnd = clip.startTime + clip.duration;

      // Clip entirely before the cut — keep as-is
      if (clipEnd <= startTime) {
        newClips.push(clip);
        continue;
      }

      // Clip entirely inside the cut — remove it
      if (clip.startTime >= startTime && clipEnd <= endTime) {
        continue;
      }

      // Clip entirely after the cut — shift left (ripple)
      if (clip.startTime >= endTime) {
        newClips.push({ ...clip, startTime: clip.startTime - cutDuration });
        continue;
      }

      // Clip overlaps — split
      if (clip.startTime < startTime) {
        // Left fragment: keep original ID and linked reference
        newClips.push({ ...clip, duration: startTime - clip.startTime });
      }
      if (clipEnd > endTime) {
        const newId = rightFragmentIds.get(clip.id) || generateId();
        // Find linked clip's right fragment ID
        let newLinkedId: string | undefined;
        if (clip.linkedClipId) {
          newLinkedId = rightFragmentIds.get(clip.linkedClipId);
        }
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

    // Also update left fragments' linkedClipId if their linked clip was also split
    // (left fragments keep original IDs, so their links are still valid)

    const newDuration = Math.max(10, state.duration - cutDuration);
    set({ clips: newClips, duration: newDuration });
    persist(get());
  },
}));
