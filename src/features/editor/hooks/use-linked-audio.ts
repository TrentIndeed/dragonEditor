"use client";

import { useEffect } from "react";
import { subject, filter } from "@designcombo/events";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

/**
 * Listens for ADD_VIDEO events and automatically creates a linked audio track
 * from the same source, so video and audio stay together.
 */
export function useLinkedAudio() {
  useEffect(() => {
    const sub = subject
      .pipe(filter((e: any) => e.type === "add:video"))
      .subscribe((event: any) => {
        const payload = event.payload?.payload;
        if (!payload?.details?.src) return;

        // Auto-add audio track from the same video source
        setTimeout(() => {
          dispatch(ADD_AUDIO, {
            payload: {
              id: generateId(),
              type: "audio",
              details: {
                src: payload.details.src,
                volume: 100,
              },
              metadata: {
                linkedVideoId: payload.id,
              },
            },
            options: {},
          });
        }, 100); // Small delay to let video track settle first
      });

    return () => sub.unsubscribe();
  }, []);
}
