import { create } from 'zustand';
import { ZoomSuggestion, ZoomKeyframe, ContentStyle } from '@/lib/types';
import { generateZoomSuggestionsAI, zoomSuggestionsToKeyframes } from '@/lib/zooms';
import { useTranscriptStore } from './transcriptStore';
import { useTimelineStore } from './timelineStore';

interface ZoomStore {
  suggestions: ZoomSuggestion[];
  keyframes: ZoomKeyframe[];
  isGenerated: boolean;
  generateZooms: (contentStyle: ContentStyle) => void;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  applyKeyframes: () => void;
  reset: () => void;
}

export const useZoomStore = create<ZoomStore>((set, get) => ({
  suggestions: [],
  keyframes: [],
  isGenerated: false,

  generateZooms: async (contentStyle) => {
    const lines = useTranscriptStore.getState().lines;
    const duration = useTimelineStore.getState().duration;
    const suggestions = await generateZoomSuggestionsAI(lines, contentStyle, duration);
    set({ suggestions, isGenerated: true, keyframes: [] });
  },

  acceptSuggestion: (id) => set((s) => ({
    suggestions: s.suggestions.map((z) => z.id === id ? { ...z, accepted: true } : z),
  })),

  rejectSuggestion: (id) => set((s) => ({
    suggestions: s.suggestions.map((z) => z.id === id ? { ...z, accepted: false } : z),
  })),

  acceptAll: () => set((s) => ({
    suggestions: s.suggestions.map((z) => ({ ...z, accepted: true })),
  })),

  rejectAll: () => set((s) => ({
    suggestions: s.suggestions.map((z) => ({ ...z, accepted: false })),
  })),

  applyKeyframes: () => {
    const keyframes = zoomSuggestionsToKeyframes(get().suggestions);
    set({ keyframes });
  },

  reset: () => set({ suggestions: [], keyframes: [], isGenerated: false }),
}));
