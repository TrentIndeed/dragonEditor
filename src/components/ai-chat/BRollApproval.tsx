'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { generateBRollSuggestions, brollSuggestionsToTimelineClips } from '@/lib/broll';
import { BRollSuggestion } from '@/lib/types';
import { cn, formatTimecode } from '@/lib/utils';
import { Check, X, Layers, PictureInPicture, Maximize2, Pause } from 'lucide-react';

const MODE_ICONS: Record<string, React.ElementType> = { pip: PictureInPicture, 'full-overlay': Maximize2, 'pause-show': Pause };
const MODE_LABELS: Record<string, string> = { pip: 'PiP', 'full-overlay': 'Overlay', 'pause-show': 'Pause' };

export default function BRollApproval() {
  const config = useProjectStore((s) => s.config);
  const [suggestions, setSuggestions] = useState<BRollSuggestion[]>([]);

  const addClip = useTimelineStore((s) => s.addClip);
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addMessage = useChatStore((s) => s.addMessage);

  const appliedRef = useRef(false);

  useEffect(() => {
    if (config && suggestions.length === 0) {
      const lines = useTranscriptStore.getState().lines;
      const sug = generateBRollSuggestions(lines, config.style);
      // Auto-accept all and apply to timeline
      const accepted = sug.map((s) => ({ ...s, accepted: true as const }));
      setSuggestions(accepted as any);

      if (!appliedRef.current) {
        appliedRef.current = true;
        const clips = brollSuggestionsToTimelineClips(accepted as any);
        clips.forEach((c) => addClip(c));
      }
    }
  }, [config, suggestions.length, addClip]);

  const accept = (id: string) => setSuggestions((p) => p.map((s) => s.id === id ? { ...s, accepted: true } : s));
  const reject = (id: string) => setSuggestions((p) => p.map((s) => s.id === id ? { ...s, accepted: false } : s));
  const accepted = suggestions.filter((s) => s.accepted === true).length;

  const handleApprove = () => {
    addMessage('system', `Stage 4 approved. ${accepted} B-roll placements kept on timeline.`);
    approveStage('broll');
  };

  const handleReject = () => {
    addMessage('system', 'Stage broll rejected. Changes reverted.');
    rejectStage('broll');
  };

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-broll/15 flex items-center justify-center">
          <Layers size={12} strokeWidth={1.5} className="text-stage-broll" />
        </div>
        <span className="text-[13px] font-heading font-semibold text-text-primary">B-Roll & Overlays</span>
        <span className="text-[11px] text-text-muted">{suggestions.length} suggestions</span>
      </div>

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {suggestions.map((s) => {
          const ModeIcon = MODE_ICONS[s.overlayMode] || Layers;
          return (
            <div key={s.id} className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200',
              s.accepted === true && 'bg-accent-green/5 border-accent-green/15',
              s.accepted === false && 'bg-accent-red/5 border-accent-red/10 opacity-40',
              s.accepted === null && 'bg-bg-panel border-border-default',
            )}>
              <span className="text-[9px] font-mono text-text-faint tabular-nums w-[38px] shrink-0">{formatTimecode(s.time)}</span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded text-accent-purple bg-accent-purple/10 shrink-0 flex items-center gap-1">
                <ModeIcon size={9} /> {MODE_LABELS[s.overlayMode]}
              </span>
              <span className="flex-1 text-[11px] text-text-secondary truncate">{s.reason}</span>
              {s.accepted === null ? (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => accept(s.id)} className="w-6 h-6 rounded-md bg-accent-green/10 border border-accent-green/20 flex items-center justify-center text-accent-green hover:bg-accent-green/20 transition-all duration-200 cursor-pointer"><Check size={11} strokeWidth={2} /></button>
                  <button onClick={() => reject(s.id)} className="w-6 h-6 rounded-md bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red hover:bg-accent-red/20 transition-all duration-200 cursor-pointer"><X size={11} strokeWidth={2} /></button>
                </div>
              ) : (
                <span className={cn('text-[8px] font-mono font-medium px-1.5 py-0.5 rounded uppercase shrink-0', s.accepted ? 'text-accent-green bg-accent-green/10' : 'text-accent-red bg-accent-red/10')}>{s.accepted ? 'Added' : 'Skip'}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleApprove} className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98]">
          <Check size={13} strokeWidth={2} /> Approve B-Roll
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}
