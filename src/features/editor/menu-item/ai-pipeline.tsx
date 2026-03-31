"use client";

import { useState, useCallback } from "react";
import { STAGE_SETTINGS, StageSetting } from "@/dragon/stage-settings";
import { runPipelineStage } from "@/dragon/pipeline-bridge";
import useStore from "../store/use-store";
import { dispatch as dcDispatch } from "@designcombo/events";
import { HISTORY_UNDO } from "@designcombo/state";
import {
  Scissors, AudioLines, Move, Layers, Captions, Volume2,
  Palette, Brain, Download, ImageIcon, Check, Play, RotateCcw,
  Settings, Pause, Square, ChevronDown, ChevronRight, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Pipeline stage definitions
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

type StageId = typeof STAGES[number]["id"];
type StageStatus = "pending" | "running" | "done" | "rejected";

export function AIPipeline() {
  const [stageStatuses, setStageStatuses] = useState<Record<string, StageStatus>>(
    Object.fromEntries(STAGES.map((s) => [s.id, "pending"]))
  );
  const [openSettings, setOpenSettings] = useState<string | null>(null);
  const [stageSettings, setStageSettings] = useState<Record<string, Record<string, any>>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [stageMessages, setStageMessages] = useState<Record<string, string>>({});

  const getSettings = useCallback((stageId: string) => {
    if (stageSettings[stageId]) return stageSettings[stageId];
    const config = STAGE_SETTINGS[stageId];
    if (!config) return {};
    const defaults: Record<string, any> = {};
    for (const s of config.settings) defaults[s.key] = s.default;
    return defaults;
  }, [stageSettings]);

  const updateSetting = useCallback((stageId: string, key: string, value: any) => {
    setStageSettings((prev) => ({
      ...prev,
      [stageId]: { ...getSettings(stageId), [key]: value },
    }));
  }, [getSettings]);

  const runStage = useCallback(async (stageId: string) => {
    setOpenSettings(null);
    setCurrentStage(stageId);
    setIsRunning(true);
    setStageStatuses((prev) => ({ ...prev, [stageId]: "running" }));

    try {
      const result = await runPipelineStage(
        stageId,
        getSettings(stageId),
        () => useStore.getState()
      );
      setStageMessages((prev) => ({ ...prev, [stageId]: result.message }));
      setStageStatuses((prev) => ({ ...prev, [stageId]: result.success ? "done" : "rejected" }));
    } catch (err: any) {
      setStageMessages((prev) => ({ ...prev, [stageId]: `Error: ${err.message}` }));
      setStageStatuses((prev) => ({ ...prev, [stageId]: "rejected" }));
    }

    setCurrentStage(null);
    setIsRunning(false);
  }, [getSettings]);

  const revertStage = useCallback((stageId: string) => {
    // Use DesignCombo's undo to revert timeline changes
    dcDispatch(HISTORY_UNDO);
    setStageStatuses((prev) => ({ ...prev, [stageId]: "pending" }));
    setStageMessages((prev) => ({ ...prev, [stageId]: "" }));
  }, []);

  const runAll = useCallback(async () => {
    setIsRunning(true);
    for (const stage of STAGES) {
      if (stageStatuses[stage.id] === "done") continue;
      setCurrentStage(stage.id);
      setStageStatuses((prev) => ({ ...prev, [stage.id]: "running" }));

      try {
        const result = await runPipelineStage(
          stage.id,
          getSettings(stage.id),
          () => useStore.getState()
        );
        setStageMessages((prev) => ({ ...prev, [stage.id]: result.message }));
        setStageStatuses((prev) => ({ ...prev, [stage.id]: result.success ? "done" : "rejected" }));
      } catch {
        setStageStatuses((prev) => ({ ...prev, [stage.id]: "rejected" }));
      }
    }
    setCurrentStage(null);
    setIsRunning(false);
  }, [stageStatuses, getSettings]);

  const stopPipeline = useCallback(() => {
    if (currentStage) {
      setStageStatuses((prev) => ({ ...prev, [currentStage]: "pending" }));
    }
    setCurrentStage(null);
    setIsRunning(false);
  }, [currentStage]);

  const doneCount = Object.values(stageStatuses).filter((s) => s === "done").length;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">AI Pipeline</h2>
          <p className="text-xs text-muted-foreground">{doneCount}/{STAGES.length} complete</p>
        </div>
        <div className="flex gap-1">
          {isRunning ? (
            <Button size="sm" variant="outline" onClick={stopPipeline} className="h-7 text-xs">
              <Square className="w-3 h-3 mr-1" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={runAll} className="h-7 text-xs">
              <Play className="w-3 h-3 mr-1" /> Run All
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {STAGES.map((stage) => {
            const status = stageStatuses[stage.id];
            const Icon = stage.icon;
            const isOpen = openSettings === stage.id;
            const isActive = currentStage === stage.id;
            const config = STAGE_SETTINGS[stage.id];

            return (
              <div key={stage.id}>
                {/* Stage row */}
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group",
                    isOpen && "bg-accent/50",
                    isActive && "bg-primary/10",
                    !isOpen && !isActive && "hover:bg-accent/30"
                  )}
                  onClick={() => {
                    if (!isActive) setOpenSettings(isOpen ? null : stage.id);
                  }}
                >
                  {/* Checkbox/number */}
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold shrink-0 border",
                    status === "done" && "bg-primary border-primary text-primary-foreground",
                    status === "running" && "border-primary/50 text-primary animate-pulse",
                    status === "pending" && "border-border text-muted-foreground",
                    status === "rejected" && "border-destructive/50 text-destructive",
                  )}>
                    {status === "done" ? <Check className="w-3 h-3" /> : STAGES.indexOf(stage) + 1}
                  </div>

                  {/* Name */}
                  <span className={cn(
                    "text-sm flex-1",
                    status === "done" ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {stage.name}
                  </span>

                  {/* Hover actions */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {status === "done" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); revertStage(stage.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                    {!isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenSettings(isOpen ? null : stage.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stage result message */}
                {stageMessages[stage.id] && status !== "pending" && !isOpen && (
                  <div className="px-4 pb-2">
                    <p className={cn(
                      "text-xs px-3 py-1.5 rounded-md",
                      status === "done" ? "bg-primary/5 text-muted-foreground" : "bg-destructive/5 text-destructive"
                    )}>
                      {stageMessages[stage.id]}
                    </p>
                  </div>
                )}

                {/* Settings panel */}
                {isOpen && config && (
                  <div className="px-4 pb-3">
                    <div className="bg-background border border-border rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <h3 className="text-sm font-medium">{config.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                      </div>
                      <div className="px-4 py-3 space-y-4">
                        {config.settings.map((setting) => (
                          <SettingControl
                            key={setting.key}
                            setting={setting}
                            value={getSettings(stage.id)[setting.key] ?? setting.default}
                            onChange={(v) => updateSetting(stage.id, setting.key, v)}
                          />
                        ))}
                      </div>
                      <div className="px-4 py-3 border-t border-border">
                        <Button className="w-full h-8 text-xs" onClick={() => runStage(stage.id)}>
                          <Play className="w-3 h-3 mr-1.5" /> Run {stage.name}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function SettingControl({ setting, value, onChange }: {
  setting: StageSetting;
  value: any;
  onChange: (v: any) => void;
}) {
  switch (setting.type) {
    case "toggle":
      return (
        <div className="flex items-center justify-between">
          <span className="text-sm">{setting.label}</span>
          <Switch checked={value} onCheckedChange={onChange} />
        </div>
      );
    case "slider":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">{setting.label}</span>
            <span className="text-xs font-mono text-muted-foreground">{value}{setting.unit || ""}</span>
          </div>
          <Slider
            value={[value]}
            onValueChange={([v]) => onChange(v)}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            className="w-full"
          />
        </div>
      );
    case "select":
      return (
        <div className="flex items-center justify-between">
          <span className="text-sm">{setting.label}</span>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
  }
}
