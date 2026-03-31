"use client";

import { useEffect, useRef } from "react";
import useStore from "../store/use-store";

const SAVE_KEY = "dragon-editor:designcombo-state";
const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

/**
 * Auto-saves DesignCombo timeline state to localStorage every 10 seconds.
 * Also saves on every significant state change (add/remove items).
 */
export function useAutoSave() {
  const prevCountRef = useRef(0);

  useEffect(() => {
    const save = () => {
      const state = useStore.getState();
      if (!state.trackItemIds || state.trackItemIds.length === 0) {
        // Clear saved state if timeline is empty
        try { localStorage.removeItem(SAVE_KEY); } catch {}
        return;
      }

      try {
        const saveData = {
          trackItemIds: state.trackItemIds,
          trackItemsMap: state.trackItemsMap,
          tracks: state.tracks,
          duration: state.duration,
          transitionIds: state.transitionIds,
          transitionsMap: state.transitionsMap,
          savedAt: Date.now(),
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      } catch {}
    };

    // Save on interval
    const timer = setInterval(save, AUTO_SAVE_INTERVAL);

    // Also subscribe to store changes — save when items change
    const unsub = useStore.subscribe((state) => {
      const count = state.trackItemIds?.length || 0;
      if (count !== prevCountRef.current) {
        prevCountRef.current = count;
        // Debounce slightly
        setTimeout(save, 500);
      }
    });

    return () => {
      clearInterval(timer);
      unsub();
    };
  }, []);
}

/** Get saved state from localStorage */
export function getSavedDesignState(): any | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Clear saved state */
export function clearSavedDesignState() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}
