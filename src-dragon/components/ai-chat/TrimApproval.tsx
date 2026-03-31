'use client';

import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useChatStore } from '@/stores/chatStore';
import { generateTrimSuggestionsAI } from '@/lib/trim';
import { TrimSuggestion } from '@/lib/types';
import { formatTimecode, cn } from '@/lib/utils';
import { Check, X, Scissors, RotateCcw } from 'lucide-react';

export default function TrimApproval() {
  const [suggestions, setSuggestions] = useState<TrimSuggestion[]>([]);
  const [generated, setGenerated] = useState(false);
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const deleteLines = useTranscriptStore((s) => s.deleteLines);
  const markCutRegion = useTimelineStore((s) => s.markCutRegion);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const addMessage = useChatStore((s) => s.addMessage);

  // Generate suggestions via AI and auto-apply all cuts on mount
  useEffect(() => {
    if (generated) return;
    setGenerated(true);

    (async () => {
      const lines = useTranscriptStore.getState().lines;
      const clips = useTimelineStore.getState().clips;
      const sug = await generateTrimSuggestionsAI(lines, clips);

      for (const s of sug) {
        if (s.transcriptLineIds.length > 0) {
          useTranscriptStore.getState().deleteLines(s.transcriptLineIds);
        }
        useTimelineStore.getState().markCutRegion(s.startTime, s.endTime);
      }

      setSuggestions(sug.map((s) => ({ ...s, accepted: true })));
    })();
  }, [generated]);

  const acceptSuggestion = (id: string) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) return;

    // Undo snapshot before each cut
    pushSnapshot();

    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, accepted: true } : s));

    // Delete transcript lines if any
    if (suggestion.transcriptLineIds.length > 0) {
      deleteLines(suggestion.transcriptLineIds);
    }

    // Cut the timeline region
    markCutRegion(suggestion.startTime, suggestion.endTime);
  };

  const rejectSuggestion = (id: string) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, accepted: false } : s));
  };

  const handleRegenerate = () => {
    const lines = useTranscriptStore.getState().lines;
    const clips = useTimelineStore.getState().clips;
    setSuggestions(generateTrimSuggestions(lines, clips));
  };

  const handleApprove = () => {
    const accepted = suggestions.filter((s) => s.accepted === true).length;
    addMessage('system', `Stage 1 approved. ${accepted} cuts applied, ${suggestions.length - accepted} skipped.`);
    approveStage('trim');
  };

  const handleReject = () => {
    addMessage('system', 'Stage trim rejected. Changes reverted.');
    rejectStage('trim');
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-stage-trim/15 flex items-center justify-center">
            <Scissors size={12} strokeWidth={1.5} className="text-stage-trim" />
          </div>
          <span className="text-[13px] font-heading font-semibold text-text-primary">Trim & Cut</span>
        </div>
        <p className="text-[13px] text-text-secondary">No trim suggestions found. Your footage looks clean.</p>
        <button
          onClick={handleApprove}
          className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98]"
        >
          <Check size={13} strokeWidth={2} />
          Approve — No Cuts Needed
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-trim/15 flex items-center justify-center">
          <Scissors size={12} strokeWidth={1.5} className="text-stage-trim" />
        </div>
        <div>
          <span className="text-[13px] font-heading font-semibold text-text-primary">Trim & Cut</span>
          <span className="text-[11px] text-text-muted ml-2">Review Suggestions</span>
        </div>
      </div>

      <p className="text-[12px] text-text-secondary leading-relaxed">
        AI found <span className="text-text-primary font-medium">{suggestions.length} segments</span> to cut. Accept or reject each — each cut is undoable with Ctrl+Z:
      </p>

      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border transition-all duration-200',
              s.accepted === true && 'bg-accent-green/5 border-accent-green/15',
              s.accepted === false && 'bg-accent-red/5 border-accent-red/10 opacity-40',
              s.accepted === null && 'bg-bg-panel border-border-default hover:border-border-active',
            )}
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-muted tabular-nums px-1.5 py-0.5 bg-bg-active rounded">
                  {formatTimecode(s.startTime)} — {formatTimecode(s.endTime)}
                </span>
                <span className="text-[10px] font-mono text-text-faint">
                  {(s.endTime - s.startTime).toFixed(1)}s
                </span>
              </div>
              <p className="text-[12px] text-text-secondary leading-relaxed">{s.reason}</p>
            </div>

            {s.accepted === null ? (
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => acceptSuggestion(s.id)}
                  className="w-7 h-7 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center text-accent-green hover:bg-accent-green/20 transition-all duration-200 cursor-pointer"
                  title="Accept cut"
                >
                  <Check size={13} strokeWidth={2} />
                </button>
                <button
                  onClick={() => rejectSuggestion(s.id)}
                  className="w-7 h-7 rounded-lg bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red hover:bg-accent-red/20 transition-all duration-200 cursor-pointer"
                  title="Keep this segment"
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <span className={cn(
                'text-[9px] font-mono font-medium px-2 py-1 rounded-md shrink-0 uppercase tracking-wide',
                s.accepted ? 'text-accent-green bg-accent-green/10' : 'text-accent-red bg-accent-red/10'
              )}>
                {s.accepted ? 'Cut' : 'Kept'}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleApprove}
          className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98]"
        >
          <Check size={13} strokeWidth={2} />
          Approve Stage 1
        </button>
        <button
          onClick={handleRegenerate}
          className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-border-default text-text-muted bg-bg-panel hover:bg-bg-hover hover:text-text-secondary transition-all duration-200 cursor-pointer flex items-center gap-1.5"
        >
          <RotateCcw size={12} strokeWidth={1.5} />
          Regenerate
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}
