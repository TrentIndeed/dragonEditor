'use client';

import { useState, useEffect, useRef } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { formatTimecode } from '@/lib/utils';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export default function TransportControls() {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const togglePlayback = useTimelineStore((s) => s.togglePlayback);
  const duration = useTimelineStore((s) => s.duration);
  const setPlayheadTime = useTimelineStore((s) => s.setPlayheadTime);

  // Throttled timecode display — poll at 10fps instead of re-rendering every setState
  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDisplayTime(useTimelineStore.getState().playheadTime);
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="h-[44px] bg-bg-panel border-t border-border-active flex items-center justify-center gap-3 px-4 shrink-0">
      <button onClick={() => setPlayheadTime(0)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-all duration-200 cursor-pointer" title="Go to start">
        <SkipBack size={16} strokeWidth={1.5} />
      </button>

      <button onClick={togglePlayback} className="w-9 h-9 rounded-lg bg-accent-primary/15 border border-accent-primary/25 flex items-center justify-center text-accent-primary hover:bg-accent-primary/20 transition-all duration-200 cursor-pointer" title={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} className="ml-0.5" />}
      </button>

      <button onClick={() => setPlayheadTime(duration)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-all duration-200 cursor-pointer" title="Go to end">
        <SkipForward size={16} strokeWidth={1.5} />
      </button>

      <div className="ml-3 px-3 py-1.5 rounded-lg bg-bg-surface border border-border-active">
        <span className="text-[13px] font-mono font-medium text-text-primary tabular-nums">{formatTimecode(displayTime)}</span>
        <span className="text-[13px] font-mono text-text-faint mx-1.5">/</span>
        <span className="text-[13px] font-mono text-text-muted tabular-nums">{formatTimecode(duration)}</span>
      </div>
    </div>
  );
}
