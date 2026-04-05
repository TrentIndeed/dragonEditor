"use client";

import { useDragonTimelineStore } from "../store/use-dragon-timeline";
import {
  MousePointer2,
  Scissors,
  Hand,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TimelineToolbar() {
  const activeTool = useDragonTimelineStore((s) => s.activeTool);
  const setActiveTool = useDragonTimelineStore((s) => s.setActiveTool);
  const snapEnabled = useDragonTimelineStore((s) => s.snapEnabled);
  const toggleSnap = useDragonTimelineStore((s) => s.toggleSnap);
  const pixelsPerSecond = useDragonTimelineStore((s) => s.pixelsPerSecond);
  const setPixelsPerSecond = useDragonTimelineStore((s) => s.setPixelsPerSecond);

  const tools = [
    { id: "select" as const, icon: MousePointer2, label: "Select (V)" },
    { id: "razor" as const, icon: Scissors, label: "Razor (B)" },
    { id: "hand" as const, icon: Hand, label: "Hand (H)" },
  ];

  return (
    <div className="h-[38px] bg-card border-b border-border/80 flex items-center px-3 gap-1 shrink-0">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
          className={cn(
            "w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer",
            activeTool === tool.id
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <tool.icon size={15} strokeWidth={1.5} />
        </button>
      ))}

      <div className="h-4 w-px bg-border/80 mx-2" />

      <button
        onClick={toggleSnap}
        title="Toggle snap"
        className={cn(
          "w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer",
          snapEnabled
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <Magnet size={15} strokeWidth={1.5} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setPixelsPerSecond(pixelsPerSecond - 5)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors duration-200"
          title="Zoom out"
        >
          <ZoomOut size={14} strokeWidth={1.5} />
        </button>
        <div className="w-[60px] h-1 bg-border rounded-full relative">
          <div
            className="h-full bg-primary/40 rounded-full transition-all duration-200"
            style={{ width: `${((pixelsPerSecond - 5) / 95) * 100}%` }}
          />
        </div>
        <button
          onClick={() => setPixelsPerSecond(pixelsPerSecond + 5)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors duration-200"
          title="Zoom in"
        >
          <ZoomIn size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => setPixelsPerSecond(20)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent ml-0.5 cursor-pointer transition-colors duration-200"
          title="Fit to view"
        >
          <Maximize2 size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
