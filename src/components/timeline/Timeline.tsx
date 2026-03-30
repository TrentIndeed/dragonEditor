'use client';

import { useRef, useCallback } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import TimelineToolbar from './TimelineToolbar';
import TimeRuler from './TimeRuler';
import Playhead from './Playhead';
import Track from './Track';
import { TRACK_COLORS, TRACK_HEIGHTS } from '@/lib/constants';
import { TrackType } from '@/lib/types';
import { cn } from '@/lib/utils';

const TRACKS: { type: TrackType; label: string }[] = [
  { type: 'video', label: 'Video' },
  { type: 'mic', label: 'Mic Audio' },
  { type: 'broll', label: 'B-Roll' },
  { type: 'caption', label: 'Captions' },
  { type: 'sfx', label: 'SFX' },
  { type: 'music', label: 'Music' },
];

export default function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const duration = useTimelineStore((s) => s.duration);
  const activeTool = useTimelineStore((s) => s.activeTool);
  const setPixelsPerSecond = useTimelineStore((s) => s.setPixelsPerSecond);
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

  const timelineWidth = duration * pixelsPerSecond + 200;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setPixelsPerSecond(pixelsPerSecond + (e.deltaY > 0 ? -2 : 2));
    } else if (activeTool === 'hand') {
      // Hand tool: scroll horizontally with wheel
      e.preventDefault();
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  }, [pixelsPerSecond, setPixelsPerSecond, activeTool]);

  // Hand tool: click-drag to pan the timeline
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'hand') return;
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
      const dx = ev.clientX - panRef.current.startX;
      const dy = ev.clientY - panRef.current.startY;
      scrollRef.current.scrollLeft = panRef.current.scrollLeft - dx;
      scrollRef.current.scrollTop = panRef.current.scrollTop - dy;
    };

    const handleMouseUp = () => {
      panRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [activeTool]);

  return (
    <div className="flex flex-col h-full bg-bg-panel">
      <TimelineToolbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Track Labels */}
        <div className="w-[90px] shrink-0 border-r border-border-active bg-bg-panel-header">
          <div className="h-[26px] border-b border-border-active" />
          {TRACKS.map((track) => (
            <div
              key={track.type}
              className="flex items-center px-3 border-b border-border-default/40"
              style={{ height: TRACK_HEIGHTS[track.type] }}
            >
              <div className="flex items-center gap-2">
                <div className="w-[5px] h-[5px] rounded-full" style={{ background: TRACK_COLORS[track.type] }} />
                <span className="text-[11px] font-medium text-text-muted">{track.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable timeline area */}
        <div
          ref={scrollRef}
          className={cn(
            'flex-1 overflow-x-auto overflow-y-hidden relative',
            activeTool === 'hand' && 'cursor-grab active:cursor-grabbing'
          )}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
        >
          <div style={{ width: timelineWidth, position: 'relative' }}>
            <TimeRuler width={timelineWidth} />
            <div className="relative">
              {TRACKS.map((track) => (
                <Track key={track.type} type={track.type} height={TRACK_HEIGHTS[track.type]} />
              ))}
              <Playhead totalHeight={TRACKS.reduce((sum, t) => sum + TRACK_HEIGHTS[t.type], 0)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
