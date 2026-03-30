import { create } from 'zustand';
import { TimelineClip } from '@/lib/types';
import { useTimelineStore } from './timelineStore';
import { saveState } from '@/lib/persist';

interface HistoryEntry {
  clips: TimelineClip[];
  duration: number;
  timestamp: number;
}

interface HistoryStore {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  maxHistory: number;
  /** Take a snapshot of current timeline state before a destructive action */
  pushSnapshot: () => void;
  /** Undo: restore the last snapshot, push current state to redo */
  undo: () => void;
  /** Redo: restore the next snapshot, push current state to undo */
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

function takeSnapshot(): HistoryEntry {
  const state = useTimelineStore.getState();
  return {
    clips: JSON.parse(JSON.stringify(state.clips)), // deep clone
    duration: state.duration,
    timestamp: Date.now(),
  };
}

function restoreSnapshot(entry: HistoryEntry) {
  useTimelineStore.setState({
    clips: JSON.parse(JSON.stringify(entry.clips)), // deep clone on restore too
    duration: entry.duration,
    selectedClipIds: [],
  });
  // Persist restored state
  saveState('timeline', {
    clips: entry.clips,
    duration: entry.duration,
    pixelsPerSecond: useTimelineStore.getState().pixelsPerSecond,
    snapEnabled: useTimelineStore.getState().snapEnabled,
    activeTool: useTimelineStore.getState().activeTool,
  });
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistory: 50,

  pushSnapshot: () => {
    const snapshot = takeSnapshot();
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(s.maxHistory - 1)), snapshot],
      redoStack: [], // clear redo on new action
    }));
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    // Save current state to redo stack
    const current = takeSnapshot();
    const previous = state.undoStack[state.undoStack.length - 1];

    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, current],
    }));

    restoreSnapshot(previous);
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    const current = takeSnapshot();
    const next = state.redoStack[state.redoStack.length - 1];

    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, current],
    }));

    restoreSnapshot(next);
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  clear: () => set({ undoStack: [], redoStack: [] }),
}));
