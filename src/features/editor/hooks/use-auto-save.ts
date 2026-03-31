"use client";

import { useEffect, useRef } from "react";
import useStore from "../store/use-store";

const SAVE_KEY = "dragon-editor:designcombo-state";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

/**
 * Auto-saves DesignCombo timeline state to localStorage every 30 seconds.
 * Restores on page load if available.
 */
export function useAutoSave() {
  const lastSaveRef = useRef(0);

  useEffect(() => {
    // Auto-save interval
    const timer = setInterval(() => {
      const state = useStore.getState();
      if (!state.trackItemIds || state.trackItemIds.length === 0) return;

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
        lastSaveRef.current = Date.now();
      } catch {
        // localStorage full — silently ignore
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(timer);
  }, []);
}

/** Get saved state from localStorage (call on app init) */
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
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}
