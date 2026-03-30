'use client';

import { useTimelineStore } from '@/stores/timelineStore';
import { MousePointer2, Scissors, Hand, Magnet, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TimelineToolbar() {
  const activeTool = useTimelineStore((s) => s.activeTool);
  const setActiveTool = useTimelineStore((s) => s.setActiveTool);
  const snapEnabled = useTimelineStore((s) => s.snapEnabled);
  const toggleSnap = useTimelineStore((s) => s.toggleSnap);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const setPixelsPerSecond = useTimelineStore((s) => s.setPixelsPerSecond);

  const tools = [
    { id: 'select' as const, icon: MousePointer2, label: 'Select (V)' },
    { id: 'razor' as const, icon: Scissors, label: 'Razor (B)' },
    { id: 'hand' as const, icon: Hand, label: 'Hand (H)' },
  ];

  return (
    <div className="h-[38px] bg-bg-panel-header border-b border-border-active flex items-center px-3 gap-1 shrink-0">
      {tools.map((tool) => (
        <button key={tool.id} onClick={() => setActiveTool(tool.id)} title={tool.label}
          className={cn('w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer',
            activeTool === tool.id ? 'bg-accent-primary/15 text-accent-primary' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover')}>
          <tool.icon size={15} strokeWidth={1.5} />
        </button>
      ))}

      <div className="h-4 w-px bg-border-active mx-2" />

      <button onClick={toggleSnap} title="Toggle snap"
        className={cn('w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer',
          snapEnabled ? 'bg-accent-primary/15 text-accent-primary' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover')}>
        <Magnet size={15} strokeWidth={1.5} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <button onClick={() => setPixelsPerSecond(pixelsPerSecond - 5)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-hover cursor-pointer transition-colors duration-200" title="Zoom out">
          <ZoomOut size={14} strokeWidth={1.5} />
        </button>
        <div className="w-[60px] h-1 bg-bg-active rounded-full relative">
          <div className="h-full bg-accent-primary/40 rounded-full transition-all duration-200" style={{ width: `${((pixelsPerSecond - 5) / 95) * 100}%` }} />
        </div>
        <button onClick={() => setPixelsPerSecond(pixelsPerSecond + 5)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-hover cursor-pointer transition-colors duration-200" title="Zoom in">
          <ZoomIn size={14} strokeWidth={1.5} />
        </button>
        <button onClick={() => setPixelsPerSecond(20)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-bg-hover ml-0.5 cursor-pointer transition-colors duration-200" title="Fit to view">
          <Maximize2 size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
