"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "thinking";
  content: string;
}

// Pipeline thinking messages that stream during video processing
const PIPELINE_THOUGHTS: Record<string, string> = {
  "trim": "Analyzing video for optimal cut points, detecting silence gaps and scene changes...",
  "audio": "Normalizing audio levels, removing background noise, balancing voice and music...",
  "zoom": "Detecting speaker face and key moments for dynamic zoom and reframe...",
  "broll": "Selecting B-roll clips that match the narrative, timing overlay transitions...",
  "caption": "Transcribing speech, generating timed captions, styling for readability...",
  "sfx": "Matching sound effects to visual cues — whooshes, impacts, transitions...",
  "color": "Applying color correction — white balance, contrast, cinematic look...",
  "review": "Running AI self-review: checking pacing, audio sync, caption accuracy...",
  "export": "Rendering final video, optimizing compression for platform...",
  "thumbnail": "Generating thumbnail candidates from key frames...",
};

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "system", content: "Dragon AI ready. Ask me to edit your video, add effects, or run the pipeline." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Public method to add thinking messages from pipeline
  const addThinking = (stageId: string, stageName: string) => {
    const thought = PIPELINE_THOUGHTS[stageId] || `Processing ${stageName}...`;
    setMessages((prev) => [...prev, {
      id: `think-${Date.now()}`,
      role: "thinking",
      content: thought,
    }]);
  };

  // Public method to add a summary after pipeline completes
  const addPipelineSummary = (stagesCompleted: number, duration: string) => {
    setMessages((prev) => [...prev, {
      id: `summary-${Date.now()}`,
      role: "assistant",
      content: `Pipeline complete — ${stagesCompleted} stages processed in ${duration}. Ask me to adjust anything or re-run specific stages.`,
    }]);
  };

  // Expose to parent via window for pipeline integration
  useEffect(() => {
    (window as any).__dragonChat = { addThinking, addPipelineSummary };
    return () => { delete (window as any).__dragonChat; };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `You are a video editing AI assistant for Dragon Editor. The user says: "${userMsg.content}". Respond helpfully and concisely. If they ask to run the pipeline or edit something, explain what you'd do.` }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.result || "I'll help with that." }]);
      } else {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "I'll work on that. (AI backend not connected — install Claude CLI for real responses)" }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "I'll work on that. (Connect Claude CLI for AI responses)" }]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Bot className="w-4 h-4" /> AI Assistant
        </h2>
      </div>

      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={cn(
              "text-sm rounded-lg px-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === "user" && "bg-primary/10 ml-6",
              msg.role === "assistant" && "bg-muted mr-4",
              msg.role === "thinking" && "bg-cyan-500/5 border-l-2 border-cyan-500/40 mr-4",
              msg.role === "system" && "text-muted-foreground text-xs italic",
            )}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                  <Bot className="w-3 h-3" /> Dragon AI
                </div>
              )}
              {msg.role === "thinking" && (
                <div className="flex items-center gap-1 mb-1 text-xs text-cyan-500/70">
                  <Sparkles className="w-3 h-3" /> Thinking
                </div>
              )}
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="text-xs text-muted-foreground italic animate-pulse">Thinking...</div>
          )}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask AI to edit..."
            className="h-8 text-sm"
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!input.trim() || loading}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
