"use client";

import { useEffect, useState, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import useStore from "../store/use-store";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";

function frameToTime(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 100);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${ms.toString().padStart(2, "0")}`;
}

function durationToTime(durationMs: number): string {
  const totalSeconds = durationMs / 1000;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 100);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${ms.toString().padStart(2, "0")}`;
}

export default function PlaybackControls() {
  const { playerRef, fps, duration } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const player = playerRef?.current;
    if (!player) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [playerRef]);

  const handlePlay = useCallback(() => {
    if (playing) {
      playerRef?.current?.pause();
    } else {
      playerRef?.current?.play();
    }
  }, [playing, playerRef]);

  const handleSkipBack = useCallback(() => {
    playerRef?.current?.seekTo(0);
  }, [playerRef]);

  const handleSkipForward = useCallback(() => {
    const endFrame = Math.round((duration / 1000) * fps);
    playerRef?.current?.seekTo(endFrame);
  }, [playerRef, duration, fps]);

  return (
    <div className="h-[50px] bg-card border-t border-border/80 flex items-center justify-center shrink-0">
      <div className="flex items-center gap-1">
        <button
          onClick={handleSkipBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
        >
          <SkipBack size={16} strokeWidth={1.5} />
        </button>

        <button
          onClick={handlePlay}
          data-testid="play-button"
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer transition-colors"
        >
          {playing ? <Pause size={18} strokeWidth={1.5} /> : <Play size={18} strokeWidth={1.5} />}
        </button>

        <button
          onClick={handleSkipForward}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
        >
          <SkipForward size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-center ml-4 text-xs font-mono tabular-nums">
        <span className="text-foreground">{frameToTime(currentFrame, fps || 30)}</span>
        <span className="text-muted-foreground/50 px-1.5">|</span>
        <span className="text-muted-foreground">{durationToTime(duration)}</span>
      </div>
    </div>
  );
}
