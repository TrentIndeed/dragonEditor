import { create } from 'zustand';
import { ProjectConfig, ProjectMode, ContentStyle } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { saveState, loadState, clearAllState } from '@/lib/persist';
import { clearAllMediaFiles } from '@/lib/media-db';

interface ProjectStore {
  config: ProjectConfig | null;
  isEditorOpen: boolean;
  createProject: (name: string, mode: ProjectMode, style: ContentStyle) => void;
  resetProject: () => void;
}

const saved = typeof window !== 'undefined' ? loadState<{ config: ProjectConfig | null; isEditorOpen: boolean }>('project') : null;

export const useProjectStore = create<ProjectStore>((set) => ({
  config: saved?.config ?? null,
  isEditorOpen: saved?.isEditorOpen ?? false,
  createProject: (name, mode, style) => {
    const state = {
      config: { id: generateId(), name, mode, style, createdAt: Date.now() },
      isEditorOpen: true,
    };
    set(state);
    saveState('project', state);
  },
  resetProject: () => {
    set({ config: null, isEditorOpen: false });
    clearAllState();
    clearAllMediaFiles();
  },
}));
