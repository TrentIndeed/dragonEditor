"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

/**
 * Editor chatbot that appears when no timeline item is selected.
 * Connected to Claude CLI via /api/ai.
 * Aware of timeline state, selected time range, and pipeline stages.
 */
export function EditorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "system",
      content: "I'm your AI editor. Select a time range on the timeline and ask me to make changes, or tell me what to fix after running a pipeline stage.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const getTimelineContext = useCallback(() => {
    const state = useStore.getState();
    const { trackItemsMap, trackItemIds, duration, activeIds } = state;

    const items = trackItemIds?.map((id: string) => trackItemsMap?.[id]).filter(Boolean) || [];
    const selectedItems = activeIds?.map((id: string) => trackItemsMap?.[id]).filter(Boolean) || [];

    // Get playhead position from the player
    const playerRef = state.playerRef;
    let currentFrame = 0;
    try {
      currentFrame = playerRef?.current?.getCurrentFrame?.() || 0;
    } catch {}
    const currentTimeMs = (currentFrame / (state.fps || 30)) * 1000;

    const context: string[] = [];
    context.push(`Timeline: ${items.length} items, ${Math.round((duration || 0) / 1000)}s duration`);
    context.push(`Playhead at: ${(currentTimeMs / 1000).toFixed(1)}s`);

    if (selectedItems.length > 0) {
      for (const item of selectedItems) {
        const from = ((item.display?.from || 0) / 1000).toFixed(1);
        const to = ((item.display?.to || 0) / 1000).toFixed(1);
        context.push(`Selected: ${item.type} "${item.details?.text || item.details?.src || item.id}" at ${from}s-${to}s`);
      }
    }

    const videoCount = items.filter((i: any) => i.type === "video").length;
    const audioCount = items.filter((i: any) => i.type === "audio").length;
    const captionCount = items.filter((i: any) => i.type === "caption").length;
    const textCount = items.filter((i: any) => i.type === "text").length;

    if (videoCount) context.push(`${videoCount} video clips`);
    if (audioCount) context.push(`${audioCount} audio clips`);
    if (captionCount) context.push(`${captionCount} captions`);
    if (textCount) context.push(`${textCount} text elements`);

    return context.join(". ");
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const timelineContext = getTimelineContext();

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are an AI video editor assistant inside Dragon Editor. You help the user edit their video by suggesting changes, fixing issues, and running pipeline stages.

CURRENT TIMELINE STATE:
${timelineContext}

USER REQUEST: ${userText}

Respond concisely and actionably. If the user references a specific time range, acknowledge it. If they ask to run a pipeline stage, tell them which stage and settings to use. Keep responses under 3 sentences unless they ask for detail.`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.result || "I'll help with that.",
            timestamp: Date.now(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "I'll help with that. (Install Claude CLI for AI responses: `npm i -g @anthropic-ai/claude-code && claude \"test\"`)",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I can help with that — try running the AI Pipeline stages from the left sidebar.",
          timestamp: Date.now(),
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">AI Editor</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "text-sm rounded-lg px-3 py-2",
                msg.role === "user" && "bg-primary/10 ml-4",
                msg.role === "assistant" && "bg-muted mr-2",
                msg.role === "system" && "text-muted-foreground text-xs"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                  <Bot className="w-3 h-3" /> Dragon AI
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Thinking...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI to edit..."
            className="min-h-[36px] max-h-[100px] text-sm resize-none"
            rows={1}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
