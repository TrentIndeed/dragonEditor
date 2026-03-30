'use client';

import { useRef, useCallback, useState } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useHistoryStore } from '@/stores/historyStore';
import { TimelineClip } from '@/lib/types';
import { cn, formatTimecode } from '@/lib/utils';
import { saveState } from '@/lib/persist';
import { Link, Trash2, Scissors, Copy, ClipboardPaste } from 'lucide-react';

interface ClipProps {
  clip: TimelineClip;
  pixelsPerSecond: number;
  trackHeight: number;
}

interface MenuPos { x: number; y: number; }

export default function Clip({ clip, pixelsPerSecond, trackHeight }: ClipProps) {
  const selectedClipIds = useTimelineStore((s) => s.selectedClipIds);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const moveClip = useTimelineStore((s) => s.moveClip);
  const removeClip = useTimelineStore((s) => s.removeClip);
  const splitClipAtPlayhead = useTimelineStore((s) => s.splitClipAtPlayhead);
  const activeTool = useTimelineStore((s) => s.activeTool);
  const isSelected = selectedClipIds.includes(clip.id);
  const dragRef = useRef<{ startX: number; startTime: number } | null>(null);
  const [menu, setMenu] = useState<MenuPos | null>(null);

  const left = clip.startTime * pixelsPerSecond;
  const width = clip.duration * pixelsPerSecond;

  const handleDelete = useCallback(() => {
    useHistoryStore.getState().pushSnapshot();
    removeClip(clip.id);
  }, [clip.id, removeClip]);

  const handleSplit = useCallback(() => {
    const playhead = useTimelineStore.getState().playheadTime;
    if (playhead > clip.startTime && playhead < clip.startTime + clip.duration) {
      useHistoryStore.getState().pushSnapshot();
      splitClipAtPlayhead(clip.id);
    }
  }, [clip.id, clip.startTime, clip.duration, splitClipAtPlayhead]);

  const handleCopy = useCallback(() => {
    (window as any).__dragonClipboard = [{ ...clip }];
  }, [clip]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectClip(clip.id, false);
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 200) });
  }, [clip.id, selectClip]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (activeTool === 'razor' || activeTool === 'hand') return;
    e.stopPropagation();
    selectClip(clip.id, e.shiftKey);

    useHistoryStore.getState().pushSnapshot();

    const startX = e.clientX;
    const startTime = clip.startTime;
    dragRef.current = { startX, startTime };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const deltaX = ev.clientX - dragRef.current.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newTime = Math.max(0, dragRef.current.startTime + deltaTime);
      moveClip(clip.id, newTime);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const s = useTimelineStore.getState();
      saveState('timeline', { clips: s.clips, duration: s.duration, pixelsPerSecond: s.pixelsPerSecond, snapEnabled: s.snapEnabled, activeTool: s.activeTool });
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [clip.id, clip.startTime, pixelsPerSecond, selectClip, moveClip, activeTool]);

  // Close context menu on outside click
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        className={cn(
          'absolute top-[2px] rounded-md cursor-grab active:cursor-grabbing transition-shadow duration-150 overflow-hidden border group/clip',
          isSelected ? 'border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.1)]' : 'border-white/[0.06]'
        )}
        style={{
          left,
          width: Math.max(width, 4),
          height: trackHeight - 4,
          backgroundColor: clip.color,
          opacity: isSelected ? 0.95 : 0.8,
        }}
      >
        <div className="flex items-center h-full px-2 gap-1">
          {clip.linkedClipId && <Link size={8} strokeWidth={2} className="text-white/40 shrink-0" />}
          <span className="text-[10px] text-white/80 truncate font-medium tracking-wide">{clip.name}</span>
          <div className="flex-1" />
          {/* Trash button */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="w-5 h-5 rounded flex items-center justify-center text-white/0 group-hover/clip:text-white/40 hover:!text-red-400 hover:bg-red-400/20 transition-all duration-150 cursor-pointer shrink-0"
            title="Delete clip"
          >
            <Trash2 size={10} strokeWidth={2} />
          </button>
        </div>
        <div className="absolute top-0 left-0 w-[3px] h-full cursor-w-resize hover:bg-white/20 transition-colors duration-150" />
        <div className="absolute top-0 right-0 w-[3px] h-full cursor-e-resize hover:bg-white/20 transition-colors duration-150" />
      </div>

      {/* Context menu */}
      {menu && (
        <ClipContextMenu
          pos={menu}
          clipName={clip.name}
          clipDuration={clip.duration}
          clipStart={clip.startTime}
          onDelete={handleDelete}
          onSplit={handleSplit}
          onCopy={handleCopy}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

function ClipContextMenu({ pos, clipName, clipDuration, clipStart, onDelete, onSplit, onCopy, onClose }: {
  pos: MenuPos;
  clipName: string;
  clipDuration: number;
  clipStart: number;
  onDelete: () => void;
  onSplit: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  const handleClick = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) onClose();
  }, [onClose]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useState(() => {
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  });

  const playhead = useTimelineStore.getState().playheadTime;
  const canSplit = playhead > clipStart && playhead < clipStart + clipDuration;

  const items = [
    { label: `${clipName}`, header: true },
    { label: `${formatTimecode(clipStart)} — ${formatTimecode(clipStart + clipDuration)}`, header: true },
    { separator: true },
    { label: 'Split at Playhead', icon: <Scissors size={13} />, action: onSplit, disabled: !canSplit },
    { label: 'Copy', icon: <Copy size={13} />, action: onCopy },
    { separator: true },
    { label: 'Delete', icon: <Trash2 size={13} />, action: onDelete, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[200px] bg-bg-panel border border-border-active rounded-lg shadow-2xl py-1 overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item, i) => {
        if (item.separator) return <div key={i} className="h-px bg-border-active my-1" />;
        if (item.header) return (
          <div key={i} className="px-3 py-1 text-[11px] text-text-faint font-mono truncate">{item.label}</div>
        );
        return (
          <button
            key={i}
            onClick={() => { item.action?.(); onClose(); }}
            disabled={item.disabled}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
              item.danger ? 'text-accent-red hover:bg-accent-red/10' : 'text-text-primary hover:bg-bg-hover'
            )}
          >
            {item.icon && <span className="w-4 flex items-center justify-center shrink-0 text-text-muted">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
