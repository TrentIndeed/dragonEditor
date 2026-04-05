"use client";

import { useCallback, useRef } from "react";
import { useDragonTimelineStore } from "../store/use-dragon-timeline";

interface PlayheadProps {
  totalHeight: number;
}

export default function Playhead({ totalHeight }: PlayheadProps) {
  const playheadTime = useDragonTimelineStore((s) => s.playheadTime);
  const pixelsPerSecond = useDragonTimelineStore((s) => s.pixelsPerSecond);
  const duration = useDragonTimelineStore((s) => s.duration);
  const setPlayheadTime = useDragonTimelineStore((s) => s.setPlayheadTime);
  const left = playheadTime * pixelsPerSecond;
  const dragRef = useRef<{ startX: number; startTime: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { startX: e.clientX, startTime: playheadTime };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const deltaX = ev.clientX - dragRef.current.startX;
        const deltaTime = deltaX / pixelsPerSecond;
        const newTime = Math.max(0, Math.min(duration, dragRef.current.startTime + deltaTime));
        setPlayheadTime(newTime);
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [playheadTime, pixelsPerSecond, duration, setPlayheadTime]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: left - 8,
        top: 0,
        width: 16,
        height: totalHeight,
        zIndex: 50,
        cursor: "col-resize",
      }}
    >
      {/* Triangle */}
      <svg width="16" height="10" viewBox="0 0 16 10" style={{ display: "block" }}>
        <polygon points="0,0 16,0 8,10" fill="#3B82F6" />
      </svg>
      {/* Line */}
      <div style={{
        position: "absolute",
        left: 7,
        top: 0,
        width: 2,
        height: totalHeight,
        backgroundColor: "#3B82F6",
      }} />
    </div>
  );
}
