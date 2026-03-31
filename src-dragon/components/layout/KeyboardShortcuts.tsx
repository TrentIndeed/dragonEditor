'use client';

import { useEffect } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useSaveStore } from '@/stores/saveStore';
import { saveProjectFile } from '@/lib/project-file';

export default function KeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const state = useTimelineStore.getState();
      const history = useHistoryStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // ── Ctrl/Cmd shortcuts ──
      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (shift) {
              // Ctrl+Shift+Z = Redo
              history.redo();
            } else {
              // Ctrl+Z = Undo
              history.undo();
            }
            return;
          case 'y':
            // Ctrl+Y = Redo (Windows style)
            e.preventDefault();
            history.redo();
            return;
          case 's':
            // Ctrl+S = Save
            e.preventDefault();
            saveProjectFile();
            useSaveStore.getState().markSaved();
            return;
          case 'a':
            // Ctrl+A = Select all clips
            e.preventDefault();
            useTimelineStore.setState({
              selectedClipIds: state.clips.map((c) => c.id),
            });
            return;
          case 'd':
            // Ctrl+D = Deselect all
            e.preventDefault();
            state.clearSelection();
            return;
          case 'c':
            // Ctrl+C = Copy (placeholder — stores selected clip IDs)
            e.preventDefault();
            if (state.selectedClipIds.length > 0) {
              const clipData = state.clips
                .filter((c) => state.selectedClipIds.includes(c.id))
                .map((c) => ({ ...c }));
              (window as any).__dragonClipboard = clipData;
            }
            return;
          case 'v':
            // Ctrl+V = Paste
            e.preventDefault();
            const clipboard = (window as any).__dragonClipboard as import('@/lib/types').TimelineClip[] | undefined;
            if (clipboard && clipboard.length > 0) {
              history.pushSnapshot();
              const { generateId } = require('@/lib/utils');
              for (const clip of clipboard) {
                state.addClip({
                  ...clip,
                  id: generateId(),
                  startTime: state.playheadTime,
                  linkedClipId: undefined,
                });
              }
            }
            return;
          case 'x':
            // Ctrl+X = Cut (copy + delete)
            e.preventDefault();
            if (state.selectedClipIds.length > 0) {
              const clipData = state.clips
                .filter((c) => state.selectedClipIds.includes(c.id))
                .map((c) => ({ ...c }));
              (window as any).__dragonClipboard = clipData;
              history.pushSnapshot();
              for (const id of [...state.selectedClipIds]) {
                state.removeClip(id);
              }
            }
            return;
        }
        return;
      }

      // ── Non-modifier shortcuts ──
      switch (e.key) {
        case ' ':
          e.preventDefault();
          state.togglePlayback();
          break;
        case 'v':
        case 'V':
          state.setActiveTool('select');
          break;
        case 'b':
        case 'B':
          state.setActiveTool('razor');
          break;
        case 'h':
        case 'H':
          state.setActiveTool('hand');
          break;
        case 'Delete':
        case 'Backspace':
          // Delete selected timeline clips first
          if (state.selectedClipIds.length > 0) {
            history.pushSnapshot();
            for (const id of [...state.selectedClipIds]) {
              state.removeClip(id);
            }
          }
          // If no clips selected, delete selected media bin item
          else {
            const mediaState = useMediaStore.getState();
            if (mediaState.selectedId) {
              mediaState.removeItem(mediaState.selectedId);
            }
          }
          break;
        case 'j':
        case 'J':
          // Reverse — step back
          state.setPlayheadTime(Math.max(0, state.playheadTime - (shift ? 1 : 5)));
          break;
        case 'k':
        case 'K':
          // Stop
          state.setIsPlaying(false);
          break;
        case 'l':
        case 'L':
          // Forward — step forward
          state.setPlayheadTime(Math.min(state.duration, state.playheadTime + (shift ? 1 : 5)));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          state.setPlayheadTime(Math.max(0, state.playheadTime - (shift ? 1 : 0.1)));
          break;
        case 'ArrowRight':
          e.preventDefault();
          state.setPlayheadTime(Math.min(state.duration, state.playheadTime + (shift ? 1 : 0.1)));
          break;
        case 'Home':
          e.preventDefault();
          state.setPlayheadTime(0);
          break;
        case 'End':
          e.preventDefault();
          state.setPlayheadTime(state.duration);
          break;
        case 'n':
        case 'N':
          // Toggle snap
          state.toggleSnap();
          break;
        case 'Escape':
          state.clearSelection();
          state.setIsPlaying(false);
          break;
        case '[':
          // Zoom out timeline
          state.setPixelsPerSecond(state.pixelsPerSecond - 5);
          break;
        case ']':
          // Zoom in timeline
          state.setPixelsPerSecond(state.pixelsPerSecond + 5);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return null;
}
