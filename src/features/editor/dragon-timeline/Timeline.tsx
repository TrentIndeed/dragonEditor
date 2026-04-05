"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import {
  useDragonTimelineStore,
  TRACK_COLORS,
  TRACK_HEIGHTS,
  type TrackType,
} from "../store/use-dragon-timeline";
import { useHistoryStore } from "../store/use-history";
import TimelineToolbar from "./TimelineToolbar";
import TimeRuler from "./TimeRuler";
import Playhead from "./Playhead";
import Track from "./Track";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { lockFloating, unlockFloating, dragData } from "@/components/shared/draggable";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

const TRACKS: { type: TrackType; label: string }[] = [
  { type: "video", label: "Video" },
  { type: "mic", label: "Mic Audio" },
  { type: "broll", label: "B-Roll" },
  { type: "caption", label: "Captions" },
  { type: "sfx", label: "SFX" },
  { type: "music", label: "Music" },
];

const SNAP_PX = 40;

/** Map media type → the track it should land on */
const MEDIA_TARGET_TRACK: Record<string, TrackType> = {
  video: "video",
  audio: "music",
  image: "broll",
};

function genId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < 12; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function snapToNearest(rawTime: number, points: number[], threshold: number): number {
  let best = rawTime;
  let bestDist = threshold;
  for (const p of points) {
    const d = Math.abs(rawTime - p);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}

/** Get the pixel offset from the top of the tracks area to a specific track */
function getTrackTopOffset(trackType: TrackType): number {
  let offset = 0;
  for (const t of TRACKS) {
    if (t.type === trackType) return offset;
    offset += TRACK_HEIGHTS[t.type];
  }
  return 0;
}

export default function DragonTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tracksAreaRef = useRef<HTMLDivElement>(null);
  const pixelsPerSecond = useDragonTimelineStore((s) => s.pixelsPerSecond);
  const duration = useDragonTimelineStore((s) => s.duration);
  const activeTool = useDragonTimelineStore((s) => s.activeTool);
  const setPixelsPerSecond = useDragonTimelineStore((s) => s.setPixelsPerSecond);
  const setPlayheadTime = useDragonTimelineStore((s) => s.setPlayheadTime);
  const allClips = useDragonTimelineStore((s) => s.clips);
  const addClip = useDragonTimelineStore((s) => s.addClip);
  const addLinkedClips = useDragonTimelineStore((s) => s.addLinkedClips);
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const lastSnappedTime = useRef<number>(0);
  const [snapLine, setSnapLine] = useState<number | null>(null);
  const [highlightTrack, setHighlightTrack] = useState<TrackType | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const timelineWidth = duration * pixelsPerSecond + 200;

  // ── Sync with Remotion player ────────────────────────────────────────────
  const { playerRef, fps } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const syncingFromPlayer = useRef(false);
  const syncingFromDragon = useRef(false);

  useEffect(() => {
    if (syncingFromDragon.current) return;
    syncingFromPlayer.current = true;
    const timeInSeconds = currentFrame / (fps || 30);
    setPlayheadTime(timeInSeconds);
    syncingFromPlayer.current = false;
  }, [currentFrame, fps, setPlayheadTime]);

  useEffect(() => {
    const unsub = useDragonTimelineStore.subscribe((state, prev) => {
      if (state.playheadTime === prev.playheadTime) return;
      if (syncingFromPlayer.current) return;
      syncingFromDragon.current = true;
      const frame = Math.round(state.playheadTime * (fps || 30));
      playerRef?.current?.seekTo(frame);
      syncingFromDragon.current = false;
    });
    return unsub;
  }, [playerRef, fps]);

  // ── Drag and drop — handled at timeline level ────────────────────────────

  const handleTimelineDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/dragon-media")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    // Figure out which track this media should go to
    const mediaType = dragData?.type || "video";
    const targetTrack = MEDIA_TARGET_TRACK[mediaType];
    if (!targetTrack) return;

    setHighlightTrack(targetTrack);

    // Calculate X position relative to scrollable area
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const scrollRect = scrollEl.getBoundingClientRect();
    const x = e.clientX - scrollRect.left + scrollEl.scrollLeft;
    const rawTime = Math.max(0, x / pixelsPerSecond);

    // Snap points from clips on the target track
    const trackClips = allClips.filter((c) => c.trackType === targetTrack);
    const snapPoints: number[] = [0];
    for (const c of trackClips) {
      snapPoints.push(c.startTime, c.startTime + c.duration);
    }
    const threshold = SNAP_PX / pixelsPerSecond;
    const snappedTime = snapToNearest(rawTime, snapPoints, threshold);
    lastSnappedTime.current = snappedTime;

    const snappedPx = snappedTime * pixelsPerSecond;
    const isSnapped = snappedTime !== rawTime;
    setSnapLine(isSnapped ? snappedPx : null);

    // Lock floating preview to the correct track row
    const tracksArea = tracksAreaRef.current;
    if (tracksArea) {
      const tracksRect = tracksArea.getBoundingClientRect();
      const trackTop = getTrackTopOffset(targetTrack);
      const trackH = TRACK_HEIGHTS[targetTrack];

      lockFloating(
        scrollRect.left + snappedPx - scrollEl.scrollLeft,
        tracksRect.top + trackTop + 2,
        Math.min(80, 80),
        trackH - 4,
      );
    }
  }, [pixelsPerSecond, allClips]);

  const handleTimelineDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setSnapLine(null);
    setHighlightTrack(null);
    unlockFloating();
  }, []);

  const handleTimelineDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setSnapLine(null);
    setHighlightTrack(null);
    unlockFloating();

    const data = e.dataTransfer.getData("application/dragon-media");
    if (!data) return;

    let raw: any;
    try { raw = JSON.parse(data); } catch { return; }

    const mediaType = raw.type || "video";
    const targetTrack = MEDIA_TARGET_TRACK[mediaType];
    if (!targetTrack) return;

    const name = raw.name || "Media";
    const clipDuration = raw.duration ? raw.duration / 1000 : 5;
    const src = raw.details?.src || raw.src;
    const thumbnailUrl = raw.metadata?.previewUrl || raw.thumbnailUrl;
    const startTime = lastSnappedTime.current;

    useHistoryStore.getState().pushSnapshot();

    if (mediaType === "video") {
      const videoId = genId();
      const audioId = genId();
      addLinkedClips(
        { id: videoId, trackType: "video", name, startTime, duration: clipDuration, sourceOffset: 0, color: TRACK_COLORS.video, linkedClipId: audioId, src, thumbnailUrl },
        { id: audioId, trackType: "mic", name: name + " (audio)", startTime, duration: clipDuration, sourceOffset: 0, color: TRACK_COLORS.mic, linkedClipId: videoId, src }
      );
    } else {
      addClip({
        id: genId(), trackType: targetTrack, name, startTime, duration: clipDuration,
        sourceOffset: 0, color: TRACK_COLORS[targetTrack], src, thumbnailUrl,
      });
    }

    // Dispatch to DesignCombo for preview player
    if (src) {
      if (mediaType === "video") {
        dispatch(ADD_VIDEO, {
          payload: { id: generateId(), details: { src }, metadata: { previewUrl: thumbnailUrl || "" } },
          options: { resourceId: "main", scaleMode: "fit" },
        });
      } else if (mediaType === "image") {
        dispatch(ADD_IMAGE, { payload: { id: generateId(), details: { src }, metadata: {} }, options: {} });
      } else if (mediaType === "audio") {
        dispatch(ADD_AUDIO, { payload: { id: generateId(), details: { src }, metadata: {} }, options: {} });
      }
    }

    // Auto-zoom to fit
    requestAnimationFrame(() => {
      const store = useDragonTimelineStore.getState();
      const allEnd = Math.max(...store.clips.map((c) => c.startTime + c.duration), 1);
      const scrollContainer = scrollRef.current;
      if (scrollContainer) {
        const visibleWidth = scrollContainer.clientWidth - 40;
        const idealPps = Math.max(5, Math.min(100, visibleWidth / (allEnd + 2)));
        store.setPixelsPerSecond(idealPps);
      }
    });
  }, [pixelsPerSecond, allClips, addClip, addLinkedClips]);

  // ── Scroll / pan handlers ────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setPixelsPerSecond(pixelsPerSecond + (e.deltaY > 0 ? -2 : 2));
      } else if (activeTool === "hand") {
        e.preventDefault();
        if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY;
      }
    },
    [pixelsPerSecond, setPixelsPerSecond, activeTool]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "hand") return;
      if (!scrollRef.current) return;
      e.preventDefault();

      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: scrollRef.current.scrollLeft,
        scrollTop: scrollRef.current.scrollTop,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!panRef.current || !scrollRef.current) return;
        scrollRef.current.scrollLeft = panRef.current.scrollLeft - (ev.clientX - panRef.current.startX);
        scrollRef.current.scrollTop = panRef.current.scrollTop - (ev.clientY - panRef.current.startY);
      };

      const handleMouseUp = () => {
        panRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
      };

      document.body.style.cursor = "grabbing";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [activeTool]
  );

  // ── Marquee selection ──────────────────────────────────────────────────
  const handleMarqueeDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "select") return;
      // Only start marquee on empty space (not on clips)
      if ((e.target as HTMLElement).closest("[data-clip]")) return;
      if (!tracksAreaRef.current || !scrollRef.current) return;

      const rect = tracksAreaRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left + scrollRef.current.scrollLeft;
      const startY = e.clientY - rect.top;

      // Clear previous selection
      useDragonTimelineStore.getState().clearSelection();

      const handleMove = (ev: MouseEvent) => {
        const curX = ev.clientX - rect.left + scrollRef.current!.scrollLeft;
        const curY = ev.clientY - rect.top;
        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const w = Math.abs(curX - startX);
        const h = Math.abs(curY - startY);
        setMarquee({ x, y, w, h });

        // Find clips that overlap the marquee rectangle
        const store = useDragonTimelineStore.getState();
        const selected: string[] = [];
        let trackY = 0;
        for (const track of TRACKS) {
          const trackH = TRACK_HEIGHTS[track.type];
          const trackClips = store.clips.filter((c) => c.trackType === track.type);
          for (const clip of trackClips) {
            const clipLeft = clip.startTime * pixelsPerSecond;
            const clipRight = clipLeft + clip.duration * pixelsPerSecond;
            const clipTop = trackY;
            const clipBottom = trackY + trackH;
            // Check overlap
            if (clipRight > x && clipLeft < x + w && clipBottom > y && clipTop < y + h) {
              selected.push(clip.id);
            }
          }
          trackY += trackH;
        }

        useDragonTimelineStore.setState({ selectedClipIds: selected });
      };

      const handleUp = () => {
        setMarquee(null);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [activeTool, pixelsPerSecond]
  );

  const totalTrackHeight = TRACKS.reduce((sum, t) => sum + TRACK_HEIGHTS[t.type], 0);

  return (
    <div className="flex flex-col bg-card border-t border-border/80" style={{ height: 300 }}>
      <TimelineToolbar />
      <div
        className="flex-1 flex overflow-hidden"
        onDragOver={handleTimelineDragOver}
        onDragLeave={handleTimelineDragLeave}
        onDrop={handleTimelineDrop}
      >
        {/* Track Labels */}
        <div className="w-[90px] shrink-0 border-r border-border/60 bg-card">
          <div className="h-[24px] border-b border-border/60" />
          {TRACKS.map((track) => (
            <div
              key={track.type}
              className={cn(
                "flex items-center px-3 border-b border-border/30 transition-colors duration-100",
                highlightTrack === track.type && "bg-primary/10"
              )}
              style={{ height: TRACK_HEIGHTS[track.type] }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ background: TRACK_COLORS[track.type] }}
                />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {track.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable timeline area */}
        <div
          ref={scrollRef}
          className={cn(
            "flex-1 overflow-x-auto overflow-y-hidden relative",
            activeTool === "hand" && "cursor-grab active:cursor-grabbing"
          )}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
        >
          <div style={{ width: timelineWidth, position: "relative" }}>
            <TimeRuler width={timelineWidth} />
            <div className="relative" ref={tracksAreaRef} onMouseDown={handleMarqueeDown}>
              {TRACKS.map((track) => (
                <Track
                  key={track.type}
                  type={track.type}
                  height={TRACK_HEIGHTS[track.type]}
                  highlighted={highlightTrack === track.type || (highlightTrack === "video" && track.type === "mic")}
                />
              ))}
              <Playhead totalHeight={totalTrackHeight} />

              {/* Snap line across all tracks */}
              {snapLine !== null && (
                <div
                  className="absolute top-0 pointer-events-none z-30"
                  style={{
                    left: snapLine,
                    width: 2,
                    height: totalTrackHeight,
                    backgroundColor: "#fff",
                    opacity: 0.8,
                    boxShadow: "0 0 8px rgba(255,255,255,0.5)",
                  }}
                />
              )}

              {/* Marquee selection rectangle */}
              {marquee && (
                <div
                  className="absolute pointer-events-none z-40 border border-primary/60 bg-primary/10 rounded-sm"
                  style={{
                    left: marquee.x,
                    top: marquee.y,
                    width: marquee.w,
                    height: marquee.h,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
