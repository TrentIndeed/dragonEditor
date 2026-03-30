'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { generateSFXPlacements, sfxPlacementsToTimelineClips, SFX_LIBRARY } from '@/lib/sfx';
import { SFXPlacement } from '@/lib/types';
import { cn, formatTimecode } from '@/lib/utils';
import { Check, X, Volume2, CheckCheck, XCircle, Music } from 'lucide-react';

export default function SFXApproval() {
  const config = useProjectStore((s) => s.config);
  const [placements, setPlacements] = useState<SFXPlacement[]>([]);
  const [generated, setGenerated] = useState(false);
  const addClip = useTimelineStore((s) => s.addClip);
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addMessage = useChatStore((s) => s.addMessage);

  const appliedRef = useRef(false);

  useEffect(() => {
    if (!generated && config) {
      const lines = useTranscriptStore.getState().lines;
      const clips = useTimelineStore.getState().clips;
      const result = generateSFXPlacements(lines, clips, config.style);
      // Auto-accept all and apply to timeline
      const accepted = result.map((p) => ({ ...p, accepted: true as const }));
      setPlacements(accepted as any);
      setGenerated(true);

      if (!appliedRef.current) {
        appliedRef.current = true;
        const sfxClips = sfxPlacementsToTimelineClips(accepted as any);
        for (const clip of sfxClips) addClip(clip);
      }
    }
  }, [generated, config, addClip]);

  const acceptPlacement = (id: string) => {
    setPlacements((prev) => prev.map((p) => p.id === id ? { ...p, accepted: true } : p));
  };

  const rejectPlacement = (id: string) => {
    setPlacements((prev) => prev.map((p) => p.id === id ? { ...p, accepted: false } : p));
  };

  const acceptAll = () => {
    setPlacements((prev) => prev.map((p) => ({ ...p, accepted: true })));
  };

  const rejectAll = () => {
    setPlacements((prev) => prev.map((p) => ({ ...p, accepted: false })));
  };

  const accepted = placements.filter((p) => p.accepted === true).length;
  const rejected = placements.filter((p) => p.accepted === false).length;
  const pending = placements.filter((p) => p.accepted === null).length;

  const handleApprove = () => {
    addMessage('system', `Stage 6 approved. ${accepted} sound effects kept on timeline.`);
    approveStage('sfx');
  };

  const handleReject = () => {
    addMessage('system', 'Stage sfx rejected. Changes reverted.');
    rejectStage('sfx');
  };

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-sfx/15 flex items-center justify-center">
          <Volume2 size={12} strokeWidth={1.5} className="text-stage-sfx" />
        </div>
        <div>
          <span className="text-[13px] font-heading font-semibold text-text-primary">Sound Effects</span>
          <span className="text-[11px] text-text-muted ml-2">{placements.length} placements</span>
        </div>
      </div>

      <p className="text-[12px] text-text-secondary leading-relaxed">
        AI placed <span className="text-text-primary font-medium">{placements.length} sound effects</span> on cuts and emphasis points. Library has {SFX_LIBRARY.length} built-in SFX.
      </p>

      {/* Bulk actions */}
      <div className="flex gap-2">
        <button onClick={acceptAll} className="h-[24px] px-2.5 rounded-md text-[10px] font-medium border border-accent-green/20 text-accent-green bg-accent-green/5 hover:bg-accent-green/10 transition-all duration-200 cursor-pointer flex items-center gap-1">
          <CheckCheck size={10} strokeWidth={2} /> Accept All
        </button>
        <button onClick={rejectAll} className="h-[24px] px-2.5 rounded-md text-[10px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1">
          <XCircle size={10} strokeWidth={2} /> Reject All
        </button>
        <div className="flex-1" />
        <span className="text-[10px] font-mono text-text-faint self-center">
          {accepted}/{placements.length} accepted
        </span>
      </div>

      {/* Placements list */}
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {placements.map((p) => (
          <div
            key={p.id}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200',
              p.accepted === true && 'bg-accent-green/5 border-accent-green/15',
              p.accepted === false && 'bg-accent-red/5 border-accent-red/10 opacity-40',
              p.accepted === null && 'bg-bg-panel border-border-default',
            )}
          >
            <span className="text-[9px] font-mono text-text-faint tabular-nums w-[38px] shrink-0">
              {formatTimecode(p.time)}
            </span>
            <div className="w-5 h-5 rounded bg-stage-sfx/10 flex items-center justify-center shrink-0">
              <Music size={10} strokeWidth={1.5} className="text-stage-sfx" />
            </div>
            <span className="text-[11px] font-medium text-text-primary shrink-0">{p.sfxName}</span>
            <span className="flex-1 text-[10px] text-text-muted truncate">{p.reason}</span>
            <span className="text-[9px] font-mono text-text-faint shrink-0">{Math.round(p.volume * 100)}%</span>

            {p.accepted === null ? (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => acceptPlacement(p.id)} className="w-6 h-6 rounded-md bg-accent-green/10 border border-accent-green/20 flex items-center justify-center text-accent-green hover:bg-accent-green/20 transition-all duration-200 cursor-pointer">
                  <Check size={11} strokeWidth={2} />
                </button>
                <button onClick={() => rejectPlacement(p.id)} className="w-6 h-6 rounded-md bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red hover:bg-accent-red/20 transition-all duration-200 cursor-pointer">
                  <X size={11} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <span className={cn(
                'text-[8px] font-mono font-medium px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0',
                p.accepted ? 'text-accent-green bg-accent-green/10' : 'text-accent-red bg-accent-red/10'
              )}>
                {p.accepted ? 'On' : 'Off'}
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
          Approve SFX
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}
