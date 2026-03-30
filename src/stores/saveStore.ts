import { create } from 'zustand';
import { saveState, loadState } from '@/lib/persist';

interface SaveStore {
  lastSavedAt: number | null;
  isDirty: boolean;
  autoSaveEnabled: boolean;
  markDirty: () => void;
  markSaved: () => void;
  toggleAutoSave: () => void;
}

const saved = typeof window !== 'undefined' ? loadState<{ lastSavedAt: number | null; autoSaveEnabled: boolean }>('save-meta') : null;

export const useSaveStore = create<SaveStore>((set, get) => ({
  lastSavedAt: saved?.lastSavedAt ?? null,
  isDirty: false,
  autoSaveEnabled: saved?.autoSaveEnabled ?? true,
  markDirty: () => set({ isDirty: true }),
  markSaved: () => {
    const now = Date.now();
    set({ isDirty: false, lastSavedAt: now });
    saveState('save-meta', { lastSavedAt: now, autoSaveEnabled: get().autoSaveEnabled });
  },
  toggleAutoSave: () => {
    set((s) => ({ autoSaveEnabled: !s.autoSaveEnabled }));
    saveState('save-meta', { lastSavedAt: get().lastSavedAt, autoSaveEnabled: get().autoSaveEnabled });
  },
}));
