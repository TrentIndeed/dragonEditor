'use client';

import { useEffect, useRef } from 'react';
import { useMediaStore } from '@/stores/mediaStore';

/**
 * Restores media file blob URLs from IndexedDB on page load.
 * Retries a few times since IndexedDB and store hydration can race.
 */
export default function MediaRestorer() {
  const items = useMediaStore((s) => s.items);
  const isRestoring = useMediaStore((s) => s.isRestoring);
  const restoreFromDB = useMediaStore((s) => s.restoreFromDB);
  const attemptRef = useRef(0);

  useEffect(() => {
    // Only run if there are items with empty URLs and not already restoring
    const needsRestore = items.some((i) => !i.url || i.url.length === 0);
    if (!needsRestore || isRestoring) return;
    if (attemptRef.current >= 3) return; // max 3 attempts

    attemptRef.current++;
    restoreFromDB();
  }, [items, isRestoring, restoreFromDB]);

  // Also run once on mount after a short delay (handles race with localStorage hydration)
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentItems = useMediaStore.getState().items;
      const needsRestore = currentItems.some((i) => !i.url || i.url.length === 0);
      if (needsRestore && !useMediaStore.getState().isRestoring) {
        useMediaStore.getState().restoreFromDB();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
