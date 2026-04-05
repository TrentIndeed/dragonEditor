"use client";

import { useEffect } from "react";
import { dispatch } from "@designcombo/events";
import {
  ACTIVE_DELETE,
  ACTIVE_SPLIT,
} from "@designcombo/state";
import { useDragonTimelineStore } from "../store/use-dragon-timeline";
import { useHistoryStore } from "../store/use-history";
import useStore from "../store/use-store";

/**
 * Global keyboard shortcuts for the editor.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const { playerRef, fps, duration } = useStore.getState();

      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              useHistoryStore.getState().redo();
            } else {
              useHistoryStore.getState().undo();
            }
            return;
          case "y":
            e.preventDefault();
            useHistoryStore.getState().redo();
            return;
          case "b":
            e.preventDefault();
            dispatch(ACTIVE_SPLIT, {});
            return;
        }
        return;
      }

      switch (e.key) {
        case "Delete":
        case "Backspace": {
          const dtStore = useDragonTimelineStore.getState();
          if (dtStore.selectedClipIds.length > 0) {
            useHistoryStore.getState().pushSnapshot();
            for (const id of dtStore.selectedClipIds) {
              dtStore.removeClip(id);
            }
          }
          dispatch(ACTIVE_DELETE);
          break;
        }

        // Playback
        case " ":
          e.preventDefault();
          const playBtn = document.querySelector('[data-testid="play-button"]') as HTMLElement;
          playBtn?.click();
          break;

        // Home — go to beginning
        case "Home":
          e.preventDefault();
          useDragonTimelineStore.getState().setPlayheadTime(0);
          playerRef?.current?.seekTo(0);
          break;

        // End — go to end
        case "End":
          e.preventDefault();
          const endTime = useDragonTimelineStore.getState().duration;
          useDragonTimelineStore.getState().setPlayheadTime(endTime);
          playerRef?.current?.seekTo(Math.round(endTime * (fps || 30)));
          break;

        // Left arrow — step back 1 second (or 5 with shift)
        case "ArrowLeft": {
          e.preventDefault();
          const stepSec = e.shiftKey ? 5 : 1;
          const curTime = useDragonTimelineStore.getState().playheadTime;
          const newTime = Math.max(0, curTime - stepSec);
          useDragonTimelineStore.getState().setPlayheadTime(newTime);
          playerRef?.current?.seekTo(Math.round(newTime * (fps || 30)));
          break;
        }

        // Right arrow — step forward 1 second (or 5 with shift)
        case "ArrowRight": {
          e.preventDefault();
          const stepSec = e.shiftKey ? 5 : 1;
          const curTime = useDragonTimelineStore.getState().playheadTime;
          const maxTime = useDragonTimelineStore.getState().duration;
          const newTime = Math.min(maxTime, curTime + stepSec);
          useDragonTimelineStore.getState().setPlayheadTime(newTime);
          playerRef?.current?.seekTo(Math.round(newTime * (fps || 30)));
          break;
        }

        // J — reverse / slow down
        case "j":
        case "J":
          // Seek back 5 seconds
          {
            const cur = useDragonTimelineStore.getState().playheadTime;
            const newTime = Math.max(0, cur - 5);
            useDragonTimelineStore.getState().setPlayheadTime(newTime);
            playerRef?.current?.seekTo(Math.round(newTime * (fps || 30)));
          }
          break;

        // K — pause
        case "k":
        case "K":
          playerRef?.current?.pause();
          break;

        // L — play / speed up
        case "l":
        case "L":
          playerRef?.current?.play();
          break;

        // Tools
        case "v":
        case "V":
          useDragonTimelineStore.getState().setActiveTool("select");
          break;
        case "b":
        case "B":
          useDragonTimelineStore.getState().setActiveTool("razor");
          break;
        case "h":
        case "H":
          useDragonTimelineStore.getState().setActiveTool("hand");
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
