"use client";

import { useEffect, useRef } from "react";
import { subject, filter } from "@designcombo/events";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import useStore from "../store/use-store";

const SNAP_THRESHOLD_MS = 200; // 200ms snap threshold

/**
 * Listens for timeline item drag/move events and snaps items
 * to edges of neighboring items when within threshold.
 */
export function useSnap() {
  const snapEnabled = useRef(true);

  useEffect(() => {
    // Listen for edit:object events (item position changes)
    const sub = subject
      .pipe(filter((e: any) => e.type === "edit:object"))
      .subscribe((event: any) => {
        if (!snapEnabled.current) return;

        const payload = event.payload?.payload;
        if (!payload?.display) return;

        const state = useStore.getState();
        const { trackItemsMap, trackItemIds } = state;
        const movingFrom = payload.display.from;
        const movingTo = payload.display.to;

        // Find all other items on the same track
        const otherItems = trackItemIds
          .map((id: string) => trackItemsMap[id])
          .filter((item: any) => item && item.id !== payload.id);

        for (const other of otherItems) {
          if (!other.display) continue;
          const otherFrom = other.display.from;
          const otherTo = other.display.to;

          // Snap moving item's start to other item's end
          if (Math.abs(movingFrom - otherTo) < SNAP_THRESHOLD_MS) {
            const duration = movingTo - movingFrom;
            dispatch(EDIT_OBJECT, {
              payload: {
                [payload.id]: { display: { from: otherTo, to: otherTo + duration } },
              },
            });
            return;
          }

          // Snap moving item's end to other item's start
          if (Math.abs(movingTo - otherFrom) < SNAP_THRESHOLD_MS) {
            const duration = movingTo - movingFrom;
            dispatch(EDIT_OBJECT, {
              payload: {
                [payload.id]: { display: { from: otherFrom - duration, to: otherFrom } },
              },
            });
            return;
          }
        }
      });

    return () => sub.unsubscribe();
  }, []);
}
