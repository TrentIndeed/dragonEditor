"use client";

import { useEffect } from "react";
import { subject, filter } from "@designcombo/events";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import useStore from "../store/use-store";

/**
 * Listens for delete events and shifts subsequent items left
 * to close the gap (ripple delete behavior).
 */
export function useRippleDelete() {
  useEffect(() => {
    const sub = subject
      .pipe(filter((e: any) => e.type === "active:delete"))
      .subscribe(() => {
        // After delete, check for gaps and close them
        setTimeout(() => {
          const state = useStore.getState();
          const { trackItemsMap, trackItemIds, tracks } = state;

          if (!tracks || !trackItemIds) return;

          // Group items by track
          const trackGroups: Record<string, any[]> = {};
          for (const track of tracks) {
            trackGroups[track.id] = track.items
              .map((itemId: string) => trackItemsMap[itemId])
              .filter(Boolean)
              .sort((a: any, b: any) => (a.display?.from || 0) - (b.display?.from || 0));
          }

          // For each track, find gaps and shift items left
          const updates: Record<string, any> = {};

          for (const [trackId, items] of Object.entries(trackGroups)) {
            if (items.length < 2) continue;

            for (let i = 1; i < items.length; i++) {
              const prev = items[i - 1];
              const curr = items[i];
              if (!prev.display || !curr.display) continue;

              const prevEnd = prev.display.to;
              const currStart = curr.display.from;
              const gap = currStart - prevEnd;

              // If there's a gap > 100ms, close it
              if (gap > 100) {
                const duration = curr.display.to - curr.display.from;
                updates[curr.id] = {
                  display: { from: prevEnd, to: prevEnd + duration },
                };
                // Update the item reference for next iteration
                curr.display = { from: prevEnd, to: prevEnd + duration };
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            dispatch(EDIT_OBJECT, { payload: updates });
          }
        }, 100); // Small delay to let delete complete first
      });

    return () => sub.unsubscribe();
  }, []);
}
