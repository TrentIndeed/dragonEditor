import { create } from 'zustand';
import { CaptionBlock, CaptionStyleId, ContentStyle } from '@/lib/types';
import { generateCaptionsFromTranscript, STYLE_TO_CAPTION, CAPTION_STYLES } from '@/lib/captions';
import { useTranscriptStore } from './transcriptStore';

interface CaptionStore {
  blocks: CaptionBlock[];
  activeStyleId: CaptionStyleId;
  isGenerated: boolean;
  generateCaptions: (contentStyle: ContentStyle) => void;
  setCaptionStyle: (styleId: CaptionStyleId) => void;
  regenerateWithStyle: (styleId: CaptionStyleId) => void;
  editBlockText: (blockId: string, text: string) => void;
  removeBlock: (blockId: string) => void;
  clearCaptions: () => void;
}

export const useCaptionStore = create<CaptionStore>((set, get) => ({
  blocks: [],
  activeStyleId: 'karaoke',
  isGenerated: false,

  generateCaptions: (contentStyle) => {
    const styleId = STYLE_TO_CAPTION[contentStyle];
    const lines = useTranscriptStore.getState().lines;
    const blocks = generateCaptionsFromTranscript(lines, styleId);
    set({ blocks, activeStyleId: styleId, isGenerated: true });
  },

  setCaptionStyle: (styleId) => {
    const state = get();
    // Re-style existing blocks
    const blocks = state.blocks.map((b) => ({ ...b, styleId }));
    set({ blocks, activeStyleId: styleId });
  },

  regenerateWithStyle: (styleId) => {
    const lines = useTranscriptStore.getState().lines;
    const blocks = generateCaptionsFromTranscript(lines, styleId);
    set({ blocks, activeStyleId: styleId, isGenerated: true });
  },

  editBlockText: (blockId, text) => set((s) => ({
    blocks: s.blocks.map((b) => b.id === blockId ? { ...b, text } : b),
  })),

  removeBlock: (blockId) => set((s) => ({
    blocks: s.blocks.filter((b) => b.id !== blockId),
  })),

  clearCaptions: () => set({ blocks: [], isGenerated: false }),
}));
