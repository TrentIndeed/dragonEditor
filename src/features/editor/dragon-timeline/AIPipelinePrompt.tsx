"use client";

import { useState, useCallback, useEffect } from "react";
import { useDragonTimelineStore } from "../store/use-dragon-timeline";
import { useHistoryStore } from "../store/use-history";
import useLayoutStore from "../store/use-layout-store";
import useStore from "../store/use-store";
import { runPipelineStage } from "@/dragon/pipeline-bridge";
import {
  Sparkles, Scissors, AudioLines, Move, Layers, Captions,
  Volume2, Palette, Brain, Download, ImageIcon, Loader2, Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "trim", name: "Trim & Cut", icon: Scissors },
  { id: "audio", name: "Audio Setup", icon: AudioLines },
  { id: "zoom", name: "Zooms & Reframe", icon: Move },
  { id: "broll", name: "B-Roll & Overlays", icon: Layers },
  { id: "caption", name: "Captions", icon: Captions },
  { id: "sfx", name: "Sound Effects", icon: Volume2 },
  { id: "color", name: "Color Correction", icon: Palette },
  { id: "review", name: "AI Self-Review", icon: Brain },
  { id: "export", name: "Export & Upload", icon: Download },
  { id: "thumbnail", name: "Thumbnail", icon: ImageIcon },
] as const;

export default function AIPipelinePrompt() {
  const clips = useDragonTimelineStore((s) => s.clips);
  const { setActiveMenuItem, setShowMenuItem } = useLayoutStore();
  const [completedStages, setCompletedStages] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("dragon-pipeline-stages") || "[]");
    } catch { return []; }
  });
  const [runningStage, setRunningStage] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  // Persist completed stages
  useEffect(() => {
    localStorage.setItem("dragon-pipeline-stages", JSON.stringify(completedStages));
  }, [completedStages]);

  const hasClips = clips.length > 0;
  const nextStage = STAGES.find((s) => !completedStages.includes(s.id));
  const lastCompleted = completedStages.length > 0 ? completedStages[completedStages.length - 1] : null;
  const lastCompletedStage = lastCompleted ? STAGES.find((s) => s.id === lastCompleted) : null;

  const openPipeline = useCallback(() => {
    setActiveMenuItem("ai-pipeline" as any);
    setShowMenuItem(true);
  }, [setActiveMenuItem, setShowMenuItem]);

  const runNextStage = useCallback(async () => {
    if (!nextStage || runningStage) return;
    setRunningStage(nextStage.id);
    setLastMessage(null);

    try {
      const result = await runPipelineStage(
        nextStage.id,
        {},
        () => useStore.getState()
      );
      setLastMessage(result.message);
      if (result.success) {
        setCompletedStages((prev) => [...prev, nextStage.id]);
      }
    } catch (err: any) {
      setLastMessage(`Error: ${err.message}`);
    }

    setRunningStage(null);
  }, [nextStage, runningStage]);

  const undoLastStage = useCallback(() => {
    if (completedStages.length === 0) return;
    useHistoryStore.getState().undo();
    setCompletedStages((prev) => prev.slice(0, -1));
    setLastMessage(null);
  }, [completedStages]);

  if (!hasClips) return null;

  const NextIcon = nextStage?.icon || Sparkles;

  return (
    <div className="flex items-center justify-center gap-2 py-1.5 bg-card border-t border-border/50">
      <button
        onClick={openPipeline}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium cursor-pointer transition-all duration-200"
      >
        <Sparkles size={14} strokeWidth={1.5} />
        AI Pipeline
      </button>

      {nextStage && (
        <button
          onClick={runNextStage}
          disabled={!!runningStage}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200",
            runningStage
              ? "bg-primary/20 text-primary/60"
              : "bg-primary/15 hover:bg-primary/25 text-primary animate-pulse hover:animate-none"
          )}
        >
          {runningStage === nextStage.id ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <NextIcon size={14} strokeWidth={1.5} />
          )}
          {runningStage === nextStage.id ? `Running ${nextStage.name}...` : nextStage.name}
        </button>
      )}

      {completedStages.length > 0 && (
        <button
          onClick={undoLastStage}
          disabled={!!runningStage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium cursor-pointer transition-all duration-200"
        >
          <Undo2 size={13} strokeWidth={1.5} />
          Undo {lastCompletedStage?.name || "Stage"}
        </button>
      )}

      {completedStages.length > 0 && (
        <span className="text-[10px] text-muted-foreground/60">
          {completedStages.length}/{STAGES.length}
        </span>
      )}

      {lastMessage && (
        <span className="text-[10px] text-muted-foreground/60 ml-1 max-w-[300px] truncate" title={lastMessage}>
          {lastMessage}
        </span>
      )}
    </div>
  );
}
