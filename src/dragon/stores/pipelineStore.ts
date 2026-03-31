import { create } from 'zustand';
import { PipelineStage, PipelineStageId, PipelineStatus, TimelineClip } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/constants';
import { saveState, loadState } from '@/lib/persist';
import { useTimelineStore } from '@/stores/timelineStore';

/** Snapshot of timeline state taken before a stage applies its changes */
interface StageSnapshot {
  clips: TimelineClip[];
  duration: number;
}

interface PipelineStore {
  stages: PipelineStage[];
  currentStageId: PipelineStageId | null;
  isRunning: boolean;
  isPaused: boolean;
  activeTimers: ReturnType<typeof setInterval>[];
  stageSnapshots: Record<string, StageSnapshot>;
  takeStageSnapshot: (id: PipelineStageId) => void;
  setStageStatus: (id: PipelineStageId, status: PipelineStatus) => void;
  setStageProgress: (id: PipelineStageId, progress: number) => void;
  startPipeline: () => void;
  pausePipeline: () => void;
  resumePipeline: () => void;
  stopPipeline: () => void;
  approveStage: (id: PipelineStageId) => void;
  rejectStage: (id: PipelineStageId) => void;
  revertStage: (id: PipelineStageId) => void;
  runSingleStage: (id: PipelineStageId) => void;
  advanceToNextStage: () => void;
  resetPipeline: () => void;
  runStage: (id: PipelineStageId) => void;
  runTrimStage: () => void;
  runAudioStage: () => void;
  runZoomStage: () => void;
  runCaptionStage: () => void;
  runSFXStage: () => void;
}

const saved = typeof window !== 'undefined' ? loadState<{ stages: PipelineStage[]; currentStageId: PipelineStageId | null }>('pipeline') : null;

function persist(state: { stages: PipelineStage[]; currentStageId: PipelineStageId | null }) {
  saveState('pipeline', { stages: state.stages, currentStageId: state.currentStageId });
}

function clearTimers(timers: ReturnType<typeof setInterval>[]) {
  for (const t of timers) clearInterval(t);
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  stages: saved?.stages ?? PIPELINE_STAGES.map((s) => ({ ...s })),
  currentStageId: saved?.currentStageId ?? null,
  isRunning: false,
  isPaused: false,
  activeTimers: [],
  stageSnapshots: {},

  takeStageSnapshot: (id) => {
    const timeline = useTimelineStore.getState();
    const snapshot = {
      clips: JSON.parse(JSON.stringify(timeline.clips)),
      duration: timeline.duration,
    };
    set((s) => ({
      stageSnapshots: { ...s.stageSnapshots, [id]: snapshot },
    }));
  },

  setStageStatus: (id, status) => { set((s) => ({ stages: s.stages.map((st) => st.id === id ? { ...st, status } : st) })); persist(get()); },
  setStageProgress: (id, progress) => set((s) => ({ stages: s.stages.map((st) => st.id === id ? { ...st, progress } : st) })),

  startPipeline: () => {
    const state = get();
    // Find first stage that hasn't been approved yet
    const firstPending = state.stages.find((s) => s.implemented && s.status !== 'approved');
    if (firstPending) {
      set({ isRunning: true, isPaused: false, currentStageId: firstPending.id });
      get().runStage(firstPending.id);
    }
  },

  pausePipeline: () => {
    const state = get();
    clearTimers(state.activeTimers);
    set({ isPaused: true, activeTimers: [] });
    // Set current running stage to pending (preserves progress)
    if (state.currentStageId) {
      const stage = state.stages.find((s) => s.id === state.currentStageId);
      if (stage && (stage.status === 'running' || stage.status === 'reviewing')) {
        get().setStageStatus(state.currentStageId, 'pending');
      }
    }
    persist(get());
  },

  resumePipeline: () => {
    const state = get();
    if (!state.isPaused || !state.currentStageId) return;
    set({ isPaused: false });
    get().runStage(state.currentStageId);
  },

  stopPipeline: () => {
    clearTimers(get().activeTimers);
    const currentId = get().currentStageId;
    if (currentId) {
      const stage = get().stages.find((s) => s.id === currentId);
      if (stage && stage.status !== 'approved') {
        get().setStageStatus(currentId, 'pending');
        get().setStageProgress(currentId, 0);
      }
    }
    set({ isRunning: false, isPaused: false, currentStageId: null, activeTimers: [] });
    persist(get());
  },

  approveStage: (id) => {
    set((s) => ({ stages: s.stages.map((st) => st.id === id ? { ...st, status: 'approved' } : st) }));
    persist(get());
    get().advanceToNextStage();
  },

  rejectStage: (id) => {
    // Revert timeline to the snapshot taken before this stage ran
    const snapshot = get().stageSnapshots[id];
    if (snapshot) {
      useTimelineStore.setState({
        clips: snapshot.clips,
        duration: snapshot.duration,
        selectedClipIds: [],
      });
      saveState('timeline', {
        clips: snapshot.clips,
        duration: snapshot.duration,
        pixelsPerSecond: useTimelineStore.getState().pixelsPerSecond,
        snapEnabled: useTimelineStore.getState().snapEnabled,
        activeTool: useTimelineStore.getState().activeTool,
      });
    }
    set((s) => ({
      stages: s.stages.map((st) => st.id === id ? { ...st, status: 'rejected', progress: 0 } : st),
      stageSnapshots: { ...s.stageSnapshots, [id]: undefined as any },
    }));
    persist(get());
  },

  /** Reset a stage back to pending — undoes its approval and clears progress */
  revertStage: (id) => {
    set((s) => ({ stages: s.stages.map((st) => st.id === id ? { ...st, status: 'pending', progress: 0 } : st) }));
    persist(get());
  },

  /** Run a single stage independently, regardless of pipeline order */
  runSingleStage: (id) => {
    const stage = get().stages.find((s) => s.id === id);
    if (!stage || !stage.implemented) return;
    // Reset stage first
    get().setStageStatus(id, 'pending');
    get().setStageProgress(id, 0);
    // Set as current and run
    set({ isRunning: true, isPaused: false, currentStageId: id });
    get().runStage(id);
  },

  advanceToNextStage: () => {
    const state = get();
    const currentIndex = state.stages.findIndex((s) => s.id === state.currentStageId);
    const nextStages = state.stages.slice(currentIndex + 1);
    const nextImplemented = nextStages.find((s) => s.implemented);
    if (nextImplemented) {
      set({ currentStageId: nextImplemented.id });
      persist(get());
      get().runStage(nextImplemented.id);
    } else {
      set({ isRunning: false, isPaused: false, currentStageId: null });
      persist(get());
    }
  },

  resetPipeline: () => {
    clearTimers(get().activeTimers);
    set({ stages: PIPELINE_STAGES.map((s) => ({ ...s })), currentStageId: null, isRunning: false, isPaused: false, activeTimers: [] });
    persist(get());
  },

  runStage: (id) => {
    if (get().isPaused) return;

    // Snapshot timeline state before this stage makes any changes
    get().takeStageSnapshot(id);

    const runSimple = (stageId: PipelineStageId, step: number, interval: number, reviewDelay: number) => {
      get().setStageStatus(stageId, 'running');
      let progress = get().stages.find((s) => s.id === stageId)?.progress ?? 0;
      const timer = setInterval(() => {
        if (get().isPaused) { clearInterval(timer); return; }
        progress += step;
        if (progress >= 100) {
          clearInterval(timer);
          set((s) => ({ activeTimers: s.activeTimers.filter((t) => t !== timer) }));
          get().setStageProgress(stageId, 100);
          get().setStageStatus(stageId, 'reviewing');
          const reviewTimer = setTimeout(() => {
            if (!get().isPaused) get().setStageStatus(stageId, 'awaiting-approval');
          }, reviewDelay);
          return;
        }
        get().setStageProgress(stageId, progress);
      }, interval);
      set((s) => ({ activeTimers: [...s.activeTimers, timer] }));
    };

    switch (id) {
      case 'trim': get().runTrimStage(); break;
      case 'audio': get().runAudioStage(); break;
      case 'zoom': get().runZoomStage(); break;
      case 'caption': get().runCaptionStage(); break;
      case 'sfx': get().runSFXStage(); break;
      case 'broll': runSimple('broll', 20, 250, 1200); break;
      case 'color': runSimple('color', 25, 200, 1000); break;
      case 'review': runSimple('review', 10, 300, 2000); break;
      case 'export': runSimple('export', 20, 200, 800); break;
      case 'thumbnail': runSimple('thumbnail', 25, 300, 1500); break;
      default: break;
    }
  },

  runTrimStage: () => {
    get().setStageStatus('trim', 'running');
    let progress = 0;
    const timer = setInterval(() => {
      if (get().isPaused) { clearInterval(timer); return; }
      progress += 15;
      if (progress >= 100) {
        clearInterval(timer);
        set((s) => ({ activeTimers: s.activeTimers.filter((t) => t !== timer) }));
        get().setStageProgress('trim', 100);
        get().setStageStatus('trim', 'reviewing');
        setTimeout(() => { if (!get().isPaused) get().setStageStatus('trim', 'awaiting-approval'); }, 1500);
        return;
      }
      get().setStageProgress('trim', progress);
    }, 300);
    set((s) => ({ activeTimers: [...s.activeTimers, timer] }));
  },

  runAudioStage: () => {
    get().setStageStatus('audio', 'running');
    let progress = 0;
    const timer = setInterval(() => {
      if (get().isPaused) { clearInterval(timer); return; }
      progress += 25;
      if (progress >= 100) {
        clearInterval(timer);
        set((s) => ({ activeTimers: s.activeTimers.filter((t) => t !== timer) }));
        get().setStageProgress('audio', 100);
        get().setStageStatus('audio', 'reviewing');
        setTimeout(() => { if (!get().isPaused) get().setStageStatus('audio', 'awaiting-approval'); }, 1000);
        return;
      }
      get().setStageProgress('audio', progress);
    }, 200);
    set((s) => ({ activeTimers: [...s.activeTimers, timer] }));
  },

  runZoomStage: () => {
    get().setStageStatus('zoom', 'running');
    let progress = 0;
    const timer = setInterval(() => {
      if (get().isPaused) { clearInterval(timer); return; }
      progress += 20;
      if (progress >= 100) {
        clearInterval(timer);
        set((s) => ({ activeTimers: s.activeTimers.filter((t) => t !== timer) }));
        get().setStageProgress('zoom', 100);
        get().setStageStatus('zoom', 'reviewing');
        setTimeout(() => { if (!get().isPaused) get().setStageStatus('zoom', 'awaiting-approval'); }, 1200);
        return;
      }
      get().setStageProgress('zoom', progress);
    }, 250);
    set((s) => ({ activeTimers: [...s.activeTimers, timer] }));
  },

  runCaptionStage: () => {
    get().setStageStatus('caption', 'running');
    let progress = 0;
    const timer = setInterval(() => {
      if (get().isPaused) { clearInterval(timer); return; }
      progress += 20;
      if (progress >= 100) {
        clearInterval(timer);
        set((s) => ({ activeTimers: s.activeTimers.filter((t) => t !== timer) }));
        get().setStageProgress('caption', 100);
        get().setStageStatus('caption', 'reviewing');
        setTimeout(() => { if (!get().isPaused) get().setStageStatus('caption', 'awaiting-approval'); }, 1200);
        return;
      }
      get().setStageProgress('caption', progress);
    }, 250);
    set((s) => ({ activeTimers: [...s.activeTimers, timer] }));
  },

  runSFXStage: () => {
    get().setStageStatus('sfx', 'running');
    let progress = 0;
    const timer = setInterval(() => {
      if (get().isPaused) { clearInterval(timer); return; }
      progress += 25;
      if (progress >= 100) {
        clearInterval(timer);
        set((s) => ({ activeTimers: s.activeTimers.filter((t) => t !== timer) }));
        get().setStageProgress('sfx', 100);
        get().setStageStatus('sfx', 'reviewing');
        setTimeout(() => { if (!get().isPaused) get().setStageStatus('sfx', 'awaiting-approval'); }, 1000);
        return;
      }
      get().setStageProgress('sfx', progress);
    }, 200);
    set((s) => ({ activeTimers: [...s.activeTimers, timer] }));
  },
}));
