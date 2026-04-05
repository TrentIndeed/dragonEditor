import { create } from "zustand";
import { useDragonTimelineStore, type TimelineClip } from "./use-dragon-timeline";

interface HistoryEntry {
  clips: TimelineClip[];
  duration: number;
}

interface HistoryStore {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 50;

function takeSnapshot(): HistoryEntry {
  const { clips, duration } = useDragonTimelineStore.getState();
  return {
    clips: JSON.parse(JSON.stringify(clips)),
    duration,
  };
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  undoStack: [],
  redoStack: [],

  pushSnapshot: () => {
    const snapshot = takeSnapshot();
    set((s) => ({
      undoStack: [...s.undoStack.slice(-(MAX_HISTORY - 1)), snapshot],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;

    const current = takeSnapshot();
    const previous = undoStack[undoStack.length - 1];

    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, current],
    }));

    useDragonTimelineStore.setState({
      clips: JSON.parse(JSON.stringify(previous.clips)),
      duration: previous.duration,
      selectedClipIds: [],
    });
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;

    const current = takeSnapshot();
    const next = redoStack[redoStack.length - 1];

    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, current],
    }));

    useDragonTimelineStore.setState({
      clips: JSON.parse(JSON.stringify(next.clips)),
      duration: next.duration,
      selectedClipIds: [],
    });
  },
}));
