import { create } from 'zustand';
import { ChatMessage, PipelineStageId } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { saveState, loadState } from '@/lib/persist';

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (role: ChatMessage['role'], content: string, type?: ChatMessage['type'], stageId?: PipelineStageId) => void;
  clearMessages: () => void;
}

const saved = typeof window !== 'undefined' ? loadState<{ messages: ChatMessage[] }>('chat') : null;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: saved?.messages ?? [
    {
      id: 'sys-1',
      role: 'system',
      content: 'Welcome to Dragon Editor. Upload your footage and start the pipeline when ready.',
      timestamp: Date.now(),
      type: 'text',
    },
  ],
  addMessage: (role, content, type = 'text', stageId) => {
    set((s) => ({
      messages: [...s.messages, { id: generateId(), role, content, timestamp: Date.now(), type, stageId }],
    }));
    saveState('chat', { messages: get().messages });
  },
  clearMessages: () => {
    set({ messages: [] });
    saveState('chat', { messages: [] });
  },
}));
