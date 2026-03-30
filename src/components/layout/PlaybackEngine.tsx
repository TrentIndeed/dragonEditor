'use client';

import { useEffect, useRef } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';

const PLAYHEAD_UPDATE_INTERVAL = 100;

export default function PlaybackEngine() {
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const startPlayheadRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const state = useTimelineStore.getState();
    startTimeRef.current = performance.now();
    startPlayheadRef.current = state.playheadTime;

    // Find end of last clip (not timeline duration which can be much longer)
    const lastClipEnd = state.clips.length > 0
      ? Math.max(...state.clips.map((c) => c.startTime + c.duration))
      : state.duration;
    const endTime = Math.min(state.duration, lastClipEnd);

    intervalRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const newTime = startPlayheadRef.current + elapsed;

      if (newTime >= endTime) {
        useTimelineStore.setState({ playheadTime: endTime, isPlaying: false });
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      useTimelineStore.setState({ playheadTime: newTime });
    }, PLAYHEAD_UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying]);

  return null;
}
