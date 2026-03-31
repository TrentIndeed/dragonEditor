"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Smartphone, Scissors, Film, Sparkles } from "lucide-react";

const MODES = [
  { id: "shorts-editor", label: "Shorts Editor", description: "One clip → one short", icon: Smartphone, aspect: "9:16" },
  { id: "shorts-extractor", label: "Shorts Extractor", description: "Long vid → many shorts", icon: Scissors, aspect: "9:16" },
  { id: "long-form", label: "Long-Form Editor", description: "Full edit of a video", icon: Film, aspect: "16:9" },
] as const;

const STYLES = [
  { id: "entertainment", label: "Entertainment" },
  { id: "education", label: "Education" },
  { id: "podcast", label: "Podcast" },
  { id: "high-retention", label: "High Retention" },
  { id: "clickbait", label: "Clickbait" },
] as const;

interface ModeSelectProps {
  onStart: (config: { name: string; mode: string; style: string }) => void;
}

export function ModeSelect({ onStart }: ModeSelectProps) {
  const [mode, setMode] = useState("shorts-editor");
  const [style, setStyle] = useState("entertainment");
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-10 max-w-[640px] w-full px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Dragon Editor</h1>
          <p className="text-sm text-muted-foreground">AI-powered video editing pipeline</p>
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Select Mode</span>
          <div className="flex gap-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "w-[180px] flex flex-col items-center gap-3 p-5 rounded-xl border cursor-pointer transition-all",
                  mode === m.id ? "bg-primary/5 border-primary/40" : "bg-card border-border hover:bg-accent/30"
                )}
              >
                <m.icon className={cn("w-6 h-6", mode === m.id ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <div className={cn("text-sm font-medium", mode === m.id ? "text-foreground" : "text-muted-foreground")}>{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Content Style</span>
          <div className="flex flex-wrap gap-2 justify-center">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "px-4 h-8 rounded-lg text-sm font-medium border cursor-pointer transition-all",
                  style === s.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Project Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onStart({ name: name.trim(), mode, style })}
            placeholder="My awesome video..."
            className="h-10 text-center"
          />
          <Button
            onClick={() => onStart({ name: name.trim(), mode, style })}
            disabled={!name.trim()}
            className="w-full h-10"
          >
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
}
