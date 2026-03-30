'use client';

import { useTimelineStore } from '@/stores/timelineStore';
import { formatTimecode } from '@/lib/utils';

interface TimeRulerProps {
  width: number;
}

export default function TimeRuler({ width }: TimeRulerProps) {
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const setPlayheadTime = useTimelineStore((s) => s.setPlayheadTime);
  const duration = useTimelineStore((s) => s.duration);

  const tickInterval = pixelsPerSecond >= 40 ? 1 : pixelsPerSecond >= 15 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += tickInterval) {
    ticks.push(t);
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    setPlayheadTime(Math.max(0, Math.min(time, duration)));
  };

  return (
    <div
      className="h-[24px] border-b border-border-default relative cursor-pointer bg-bg-panel-header"
      style={{ width }}
      onClick={handleClick}
    >
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: t * pixelsPerSecond }}
        >
          <span className="text-[9px] font-mono text-text-faint px-1 tabular-nums">{formatTimecode(t)}</span>
          <div className="w-px h-[5px] bg-border-default" />
        </div>
      ))}
    </div>
  );
}
