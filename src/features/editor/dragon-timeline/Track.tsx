"use client";

import { useMemo, useCallback, useRef } from "react";
import {
  useDragonTimelineStore,
  type TrackType,
} from "../store/use-dragon-timeline";
import { cn } from "@/lib/utils";
import Clip from "./Clip";

interface TrackProps {
  type: TrackType;
  height: number;
  highlighted?: boolean;
}

export default function Track({ type, height, highlighted }: TrackProps) {
  const allClips = useDragonTimelineStore((s) => s.clips);
  const pixelsPerSecond = useDragonTimelineStore((s) => s.pixelsPerSecond);
  const duration = useDragonTimelineStore((s) => s.duration);
  const activeTool = useDragonTimelineStore((s) => s.activeTool);
  const splitClipAtPlayhead = useDragonTimelineStore((s) => s.splitClipAtPlayhead);
  const setPlayheadTime = useDragonTimelineStore((s) => s.setPlayheadTime);

  const clips = useMemo(
    () => allClips.filter((c) => c.trackType === type),
    [allClips, type]
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === "hand") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickTime = x / pixelsPerSecond;

      if (activeTool === "razor") {
        const clipAtTime = clips.find(
          (c) => clickTime >= c.startTime && clickTime < c.startTime + c.duration
        );
        if (clipAtTime) {
          setPlayheadTime(clickTime);
          splitClipAtPlayhead(clipAtTime.id);
        }
      } else {
        setPlayheadTime(Math.max(0, Math.min(clickTime, duration)));
      }
    },
    [activeTool, clips, pixelsPerSecond, duration, setPlayheadTime, splitClipAtPlayhead]
  );

  return (
    <div
      className={cn(
        "relative border-b border-border/30 transition-colors duration-100",
        highlighted && "bg-primary/5",
        activeTool === "razor" && "cursor-crosshair"
      )}
      style={{ height }}
      onClick={handleTrackClick}
    >
      {clips.map((clip) => (
        <Clip key={clip.id} clip={clip} pixelsPerSecond={pixelsPerSecond} trackHeight={height} />
      ))}
    </div>
  );
}
