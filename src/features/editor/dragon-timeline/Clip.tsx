"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import {
  useDragonTimelineStore,
  type TimelineClip,
} from "../store/use-dragon-timeline";
import { cn } from "@/lib/utils";
import { Link, Trash2, Scissors, Copy } from "lucide-react";

interface ClipProps {
  clip: TimelineClip;
  pixelsPerSecond: number;
  trackHeight: number;
}

interface MenuPos {
  x: number;
  y: number;
}

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Clip({ clip, pixelsPerSecond, trackHeight }: ClipProps) {
  const selectedClipIds = useDragonTimelineStore((s) => s.selectedClipIds);
  const selectClip = useDragonTimelineStore((s) => s.selectClip);
  const moveClip = useDragonTimelineStore((s) => s.moveClip);
  const removeClip = useDragonTimelineStore((s) => s.removeClip);
  const splitClipAtPlayhead = useDragonTimelineStore((s) => s.splitClipAtPlayhead);
  const activeTool = useDragonTimelineStore((s) => s.activeTool);
  const isSelected = selectedClipIds.includes(clip.id);
  const dragRef = useRef<{ startX: number; startTime: number } | null>(null);
  const [menu, setMenu] = useState<MenuPos | null>(null);

  const left = clip.startTime * pixelsPerSecond;
  const width = clip.duration * pixelsPerSecond;

  const handleDelete = useCallback(() => {
    removeClip(clip.id);
  }, [clip.id, removeClip]);

  const handleSplit = useCallback(() => {
    const playhead = useDragonTimelineStore.getState().playheadTime;
    if (playhead > clip.startTime && playhead < clip.startTime + clip.duration) {
      splitClipAtPlayhead(clip.id);
    }
  }, [clip.id, clip.startTime, clip.duration, splitClipAtPlayhead]);

  const handleCopy = useCallback(() => {
    (window as any).__dragonClipboard = [{ ...clip }];
  }, [clip]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectClip(clip.id, false);
      setMenu({
        x: Math.min(e.clientX, window.innerWidth - 200),
        y: Math.min(e.clientY, window.innerHeight - 200),
      });
    },
    [clip.id, selectClip]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (activeTool === "razor" || activeTool === "hand") return;
      e.stopPropagation();
      selectClip(clip.id, e.shiftKey);

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
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [clip.id, clip.startTime, pixelsPerSecond, selectClip, moveClip, activeTool]
  );

  return (
    <>
      <div
        data-clip
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        className={cn(
          "absolute top-[2px] rounded-md cursor-grab active:cursor-grabbing transition-shadow duration-150 overflow-hidden border group/clip",
          isSelected
            ? "border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.1)]"
            : "border-white/[0.06]"
        )}
        style={{
          left,
          width: Math.max(width, 4),
          height: trackHeight - 4,
          backgroundColor: clip.color,
          opacity: isSelected ? 0.95 : 0.8,
        }}
      >
        {clip.thumbnailUrl && (
          <img
            src={clip.thumbnailUrl}
            alt=""
            className="absolute left-0 top-0 h-full object-cover opacity-60 rounded-l-md"
            style={{ width: Math.min(width, (trackHeight - 4) * 16 / 9) }}
            draggable={false}
          />
        )}
        {!clip.thumbnailUrl && (clip.trackType === "mic" || clip.trackType === "music" || clip.trackType === "sfx") && (
          <div className="absolute inset-0 flex items-end justify-center gap-[2px] px-1 py-1 opacity-30 overflow-hidden">
            {Array.from({ length: Math.max(4, Math.floor(width / 4)) }, (_, i) => (
              <div
                key={i}
                className="w-[2px] bg-white rounded-full shrink-0"
                style={{ height: `${20 + Math.sin(i * 0.7) * 30 + Math.cos(i * 1.3) * 25}%` }}
              />
            ))}
          </div>
        )}
        <div className="relative flex items-center h-full px-2 gap-1"
          style={clip.thumbnailUrl ? { paddingLeft: Math.min(width, (trackHeight - 4) * 16 / 9) + 4 } : undefined}
        >
          {clip.linkedClipId && (
            <Link size={8} strokeWidth={2} className="text-white/40 shrink-0" />
          )}
          <span className="text-[10px] text-white/80 truncate font-medium tracking-wide drop-shadow-sm">
            {clip.name}
          </span>
          <div className="flex-1" />
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="w-5 h-5 rounded flex items-center justify-center text-white/0 group-hover/clip:text-white/40 hover:!text-red-400 hover:bg-red-400/20 transition-all duration-150 cursor-pointer shrink-0"
            title="Delete clip"
          >
            <Trash2 size={10} strokeWidth={2} />
          </button>
        </div>
        {/* Trim handles */}
        <div className="absolute top-0 left-0 w-[3px] h-full cursor-w-resize hover:bg-white/20 transition-colors duration-150" />
        <div className="absolute top-0 right-0 w-[3px] h-full cursor-e-resize hover:bg-white/20 transition-colors duration-150" />
      </div>

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

function ClipContextMenu({
  pos,
  clipName,
  clipDuration,
  clipStart,
  onDelete,
  onSplit,
  onCopy,
  onClose,
}: {
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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const playhead = useDragonTimelineStore.getState().playheadTime;
  const canSplit = playhead > clipStart && playhead < clipStart + clipDuration;

  const items = [
    { label: clipName, header: true },
    {
      label: `${formatTimecode(clipStart)} — ${formatTimecode(clipStart + clipDuration)}`,
      header: true,
    },
    { separator: true },
    {
      label: "Split at Playhead",
      icon: <Scissors size={13} />,
      action: onSplit,
      disabled: !canSplit,
    },
    { label: "Copy", icon: <Copy size={13} />, action: onCopy },
    { separator: true },
    { label: "Delete", icon: <Trash2 size={13} />, action: onDelete, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[200px] bg-card border border-border rounded-lg shadow-2xl py-1 overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item, i) => {
        if ("separator" in item && item.separator)
          return <div key={i} className="h-px bg-border my-1" />;
        if ("header" in item && item.header)
          return (
            <div key={i} className="px-3 py-1 text-[11px] text-muted-foreground/60 font-mono truncate">
              {item.label}
            </div>
          );
        return (
          <button
            key={i}
            onClick={() => {
              (item as any).action?.();
              onClose();
            }}
            disabled={(item as any).disabled}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
              (item as any).danger
                ? "text-destructive hover:bg-destructive/10"
                : "text-foreground hover:bg-accent"
            )}
          >
            {"icon" in item && item.icon && (
              <span className="w-4 flex items-center justify-center shrink-0 text-muted-foreground">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
