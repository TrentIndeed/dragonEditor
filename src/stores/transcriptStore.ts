import { create } from 'zustand';
import { TranscriptLine } from '@/lib/types';
import { MOCK_TRANSCRIPT, FILLER_LINE_IDS } from '@/lib/mockData';
import { FILLER_WORDS } from '@/lib/constants';
import { saveState, loadState } from '@/lib/persist';

interface TranscriptStore {
  lines: TranscriptLine[];
  highlightFillers: boolean;
  deleteLine: (id: string) => void;
  restoreLine: (id: string) => void;
  editLineText: (id: string, text: string) => void;
  deleteLines: (ids: string[]) => void;
  restoreAll: () => void;
  removeAllFillerWords: () => void;
  toggleFillerHighlight: () => void;
  loadMockData: () => void;
  getActiveLines: () => TranscriptLine[];
}

const saved = typeof window !== 'undefined' ? loadState<{ lines: TranscriptLine[] }>('transcript') : null;

function persist(lines: TranscriptLine[]) {
  saveState('transcript', { lines });
}

export const useTranscriptStore = create<TranscriptStore>((set, get) => ({
  lines: saved?.lines ?? [],
  highlightFillers: true,
  deleteLine: (id) => { set((s) => ({ lines: s.lines.map((l) => l.id === id ? { ...l, deleted: true } : l) })); persist(get().lines); },
  restoreLine: (id) => { set((s) => ({ lines: s.lines.map((l) => l.id === id ? { ...l, deleted: false } : l) })); persist(get().lines); },
  editLineText: (id, text) => { set((s) => ({ lines: s.lines.map((l) => l.id === id ? { ...l, text, edited: true } : l) })); persist(get().lines); },
  deleteLines: (ids) => { set((s) => ({ lines: s.lines.map((l) => ids.includes(l.id) ? { ...l, deleted: true } : l) })); persist(get().lines); },
  restoreAll: () => { set((s) => ({ lines: s.lines.map((l) => ({ ...l, deleted: false })) })); persist(get().lines); },
  removeAllFillerWords: () => { set((s) => ({ lines: s.lines.map((l) => FILLER_LINE_IDS.includes(l.id) ? { ...l, deleted: true } : l) })); persist(get().lines); },
  toggleFillerHighlight: () => set((s) => ({ highlightFillers: !s.highlightFillers })),
  loadMockData: () => { set({ lines: MOCK_TRANSCRIPT }); persist(MOCK_TRANSCRIPT); },
  getActiveLines: () => get().lines.filter((l) => !l.deleted),
}));
