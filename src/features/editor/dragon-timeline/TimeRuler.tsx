"use client";

import { useCallback } from "react";
import { useDragonTimelineStore } from "../store/use-dragon-timeline";

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TimeRulerProps {
  width: number;
}

export default function TimeRuler({ width }: TimeRulerProps) {
  const pixelsPerSecond = useDragonTimelineStore((s) => s.pixelsPerSecond);
  const setPlayheadTime = useDragonTimelineStore((s) => s.setPlayheadTime);
  const duration = useDragonTimelineStore((s) => s.duration);

  const tickInterval =
    pixelsPerSecond >= 40 ? 1 : pixelsPerSecond >= 15 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += tickInterval) {
    ticks.push(t);
  }

  const seekToX = useCallback((clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    const time = x / pixelsPerSecond;
    setPlayheadTime(Math.max(0, Math.min(time, duration)));
  }, [pixelsPerSecond, duration, setPlayheadTime]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekToX(e.clientX, rect);

    const handleMove = (ev: MouseEvent) => {
      seekToX(ev.clientX, rect);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, [seekToX]);

  return (
    <div
      className="h-[24px] border-b border-border/60 relative cursor-pointer bg-card"
      style={{ width }}
      onMouseDown={handleMouseDown}
    >
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: t * pixelsPerSecond }}
        >
          <span className="text-[9px] font-mono text-muted-foreground/60 px-1 tabular-nums">
            {formatTimecode(t)}
          </span>
          <div className="w-px h-[5px] bg-border/60" />
        </div>
      ))}
    </div>
  );
}
