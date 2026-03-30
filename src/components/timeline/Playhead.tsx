'use client';

import { useCallback, useRef } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';

interface PlayheadProps {
  totalHeight: number;
}

export default function Playhead({ totalHeight }: PlayheadProps) {
  const playheadTime = useTimelineStore((s) => s.playheadTime);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const duration = useTimelineStore((s) => s.duration);
  const setPlayheadTime = useTimelineStore((s) => s.setPlayheadTime);
  const left = playheadTime * pixelsPerSecond;
  const dragRef = useRef<{ startX: number; startTime: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [playheadTime, pixelsPerSecond, duration, setPlayheadTime]);

  return (
    <div
      className="absolute top-0 z-20"
      style={{ left, height: totalHeight }}
    >
      {/* Triangle handle — draggable */}
      <div
        onMouseDown={handleMouseDown}
        className="w-[11px] h-[11px] -ml-[5px] cursor-col-resize relative z-30"
        style={{ marginTop: -2 }}
      >
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#22D3EE]" />
      </div>
      {/* Vertical line */}
      <div className="w-px bg-[#22D3EE] ml-0 pointer-events-none" style={{ height: totalHeight }} />
    </div>
  );
}
