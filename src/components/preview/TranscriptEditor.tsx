'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { formatTimecode, cn } from '@/lib/utils';
import { FILLER_WORDS } from '@/lib/constants';
import { FILLER_LINE_IDS } from '@/lib/mockData';
import { Trash2, RotateCcw, Eraser, FileText } from 'lucide-react';

function highlightFillers(text: string): React.ReactNode[] {
  const regex = new RegExp(`\\b(${FILLER_WORDS.join('|')})\\b`, 'gi');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="text-accent-orange bg-accent-orange/10 px-1 py-px rounded">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function TranscriptEditor() {
  const lines = useTranscriptStore((s) => s.lines);
  const highlightFillersEnabled = useTranscriptStore((s) => s.highlightFillers);
  const deleteLine = useTranscriptStore((s) => s.deleteLine);
  const restoreLine = useTranscriptStore((s) => s.restoreLine);
  const removeAllFillerWords = useTranscriptStore((s) => s.removeAllFillerWords);
  const restoreAll = useTranscriptStore((s) => s.restoreAll);
  const setPlayheadTime = useTimelineStore((s) => s.setPlayheadTime);

  // Throttled playhead — only update active line every 250ms, not every frame
  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDisplayTime(useTimelineStore.getState().playheadTime);
    }, 250);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
  const playheadTime = displayTime;

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <FileText size={20} strokeWidth={1.5} className="text-text-faint" />
        <p className="text-[13px] text-text-muted">Transcription appears after Stage 1</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-default shrink-0">
        <button
          onClick={removeAllFillerWords}
          className="h-[28px] px-3 rounded-lg text-[11px] font-medium border border-accent-orange/20 text-accent-orange bg-accent-orange/5 hover:bg-accent-orange/10 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Eraser size={12} strokeWidth={1.5} />
          Remove fillers
        </button>
        <button
          onClick={restoreAll}
          className="h-[28px] px-3 rounded-lg text-[11px] font-medium border border-border-default text-text-muted bg-bg-surface hover:bg-bg-hover hover:text-text-secondary transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={12} strokeWidth={1.5} />
          Restore all
        </button>
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto">
        {lines.map((line) => {
          const isActive = playheadTime >= line.startTime && playheadTime < line.endTime;
          const isFiller = FILLER_LINE_IDS.includes(line.id);

          return (
            <div
              key={line.id}
              onClick={() => setPlayheadTime(line.startTime)}
              className={cn(
                'group flex items-start gap-3 px-4 py-2.5 border-b border-border-default/40 cursor-pointer transition-all duration-200',
                line.deleted && 'opacity-35 line-through',
                isActive && !line.deleted && 'bg-accent-primary/5 border-l-2 border-l-accent-primary',
                !line.deleted && !isActive && 'hover:bg-bg-hover'
              )}
            >
              {/* Timecode */}
              <span className="text-[10px] font-mono text-text-muted w-[50px] shrink-0 pt-0.5 tabular-nums">
                {formatTimecode(line.startTime)}
              </span>

              {/* Speaker */}
              {line.speaker && (
                <span className="text-[10px] font-medium text-accent-blue bg-accent-blue/8 px-2 py-0.5 rounded-md shrink-0">
                  {line.speaker}
                </span>
              )}

              {/* Text */}
              <span className={cn(
                'flex-1 text-[13px] leading-[1.6]',
                line.deleted ? 'text-text-faint' : 'text-text-primary'
              )}>
                {highlightFillersEnabled && isFiller && !line.deleted
                  ? highlightFillers(line.text)
                  : line.text}
                {line.edited && (
                  <span className="text-[9px] text-text-faint ml-2 font-mono">(edited)</span>
                )}
              </span>

              {/* Actions */}
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {line.deleted ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); restoreLine(line.id); }}
                    className="text-[10px] font-medium text-accent-primary hover:text-accent-primary/80 transition-colors duration-200 cursor-pointer px-2 py-1 rounded-md hover:bg-accent-primary/10"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteLine(line.id); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-text-faint hover:text-accent-red hover:bg-accent-red/10 transition-all duration-200 cursor-pointer"
                    title="Remove this segment"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
