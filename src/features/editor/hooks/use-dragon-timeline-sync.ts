"use client";

import { useEffect, useRef } from "react";
import { useDragonTimelineStore } from "../store/use-dragon-timeline";
import useMediaStore from "../store/use-media-store";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

/**
 * On mount, re-populate DesignCombo's player from persisted Dragon timeline clips.
 * Waits for media blob URLs to be restored from IndexedDB before dispatching.
 */
export function useDragonTimelineSync() {
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) return;

    // Wait for media URLs to be restored from IndexedDB
    const interval = setInterval(() => {
      const clips = useDragonTimelineStore.getState().clips;
      if (clips.length === 0) {
        // No clips to restore — stop polling
        clearInterval(interval);
        syncedRef.current = true;
        return;
      }

      // Check if any video clip has a restored src
      const videoClips = clips.filter((c) => c.trackType === "video");
      const hasRestoredSrc = videoClips.some((c) => c.src && c.src.length > 0 && c.src.startsWith("blob:"));

      // Also check media store for restored URLs
      const mediaItems = useMediaStore.getState().items;
      const hasMediaUrls = mediaItems.some((m) => m.url && m.url.startsWith("blob:"));

      if (!hasRestoredSrc && !hasMediaUrls) return; // Still waiting for IndexedDB restore

      clearInterval(interval);
      syncedRef.current = true;

      // Build a name→url map from media store
      const urlMap: Record<string, string> = {};
      const thumbMap: Record<string, string> = {};
      for (const m of mediaItems) {
        if (m.url && m.url.startsWith("blob:")) {
          urlMap[m.name] = m.url;
          if (m.thumbnailUrl) thumbMap[m.name] = m.thumbnailUrl;
        }
      }

      // Dispatch each unique video/audio/image to DesignCombo
      const dispatched = new Set<string>();
      for (const clip of clips) {
        const baseName = clip.name.replace(/ \(audio\)$/, "");
        if (dispatched.has(baseName)) continue;

        const src = (clip.src && clip.src.startsWith("blob:")) ? clip.src : urlMap[baseName];
        if (!src) continue;

        dispatched.add(baseName);
        const previewUrl = clip.thumbnailUrl || thumbMap[baseName] || "";

        if (clip.trackType === "video") {
          dispatch(ADD_VIDEO, {
            payload: { id: generateId(), details: { src }, metadata: { previewUrl } },
            options: { resourceId: "main", scaleMode: "fit" },
          });
        } else if (clip.trackType === "broll") {
          dispatch(ADD_IMAGE, {
            payload: { id: generateId(), details: { src }, metadata: {} },
            options: {},
          });
        } else if (clip.trackType === "music") {
          dispatch(ADD_AUDIO, {
            payload: { id: generateId(), details: { src }, metadata: {} },
            options: {},
          });
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);
}
