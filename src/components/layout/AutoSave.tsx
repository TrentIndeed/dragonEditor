'use client';

import { useEffect, useRef } from 'react';
import { useSaveStore } from '@/stores/saveStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useProjectStore } from '@/stores/projectStore';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

/**
 * Watches all stores for changes and marks dirty.
 * Auto-saves to localStorage every 30 seconds if dirty.
 */
export default function AutoSave() {
  const autoSaveEnabled = useSaveStore((s) => s.autoSaveEnabled);
  const markDirty = useSaveStore((s) => s.markDirty);
  const markSaved = useSaveStore((s) => s.markSaved);
  const isDirty = useSaveStore((s) => s.isDirty);

  // Watch stores for changes — mark dirty on any mutation
  const clips = useTimelineStore((s) => s.clips);
  const lines = useTranscriptStore((s) => s.lines);
  const stages = usePipelineStore((s) => s.stages);
  const messages = useChatStore((s) => s.messages);
  const mediaItems = useMediaStore((s) => s.items);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip first render (initial load from localStorage isn't a change)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    markDirty();
  }, [clips, lines, stages, messages, mediaItems, markDirty]);

  // Auto-save interval
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const timer = setInterval(() => {
      if (useSaveStore.getState().isDirty && useProjectStore.getState().isEditorOpen) {
        // The stores already persist to localStorage individually.
        // Just mark as saved to update the timestamp.
        useSaveStore.getState().markSaved();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(timer);
  }, [autoSaveEnabled]);

  return null;
}
