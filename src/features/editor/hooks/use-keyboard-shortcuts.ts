"use client";

import { useEffect } from "react";
import { dispatch } from "@designcombo/events";
import {
  HISTORY_UNDO,
  HISTORY_REDO,
  ACTIVE_DELETE,
  ACTIVE_SPLIT,
} from "@designcombo/state";

/**
 * Global keyboard shortcuts for the editor.
 * Dispatches DesignCombo events.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              dispatch(HISTORY_REDO);
            } else {
              dispatch(HISTORY_UNDO);
            }
            return;
          case "y":
            e.preventDefault();
            dispatch(HISTORY_REDO);
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
        case "Backspace":
          dispatch(ACTIVE_DELETE);
          break;
        case " ":
          e.preventDefault();
          // Toggle play — handled by DesignCombo's player
          const playBtn = document.querySelector('[data-testid="play-button"]') as HTMLElement;
          playBtn?.click();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
