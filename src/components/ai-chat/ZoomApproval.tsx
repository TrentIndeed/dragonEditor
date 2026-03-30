'use client';

import { useEffect, useRef } from 'react';
import { useZoomStore } from '@/stores/zoomStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useProjectStore } from '@/stores/projectStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { generateId } from '@/lib/utils';
import { cn, formatTimecode } from '@/lib/utils';
import { Check, X, Move, CheckCheck, XCircle } from 'lucide-react';

const ZOOM_TYPE_LABELS: Record<string, string> = {
  'push-in': 'Push In',
  'snap': 'Snap',
  'drift': 'Drift',
  'pull-out': 'Pull Out',
};

export default function ZoomApproval() {
  const config = useProjectStore((s) => s.config);
  const suggestions = useZoomStore((s) => s.suggestions);
  const isGenerated = useZoomStore((s) => s.isGenerated);
  const generateZooms = useZoomStore((s) => s.generateZooms);
  const acceptSuggestion = useZoomStore((s) => s.acceptSuggestion);
  const rejectSuggestion = useZoomStore((s) => s.rejectSuggestion);
  const acceptAll = useZoomStore((s) => s.acceptAll);
  const rejectAll = useZoomStore((s) => s.rejectAll);
  const applyKeyframes = useZoomStore((s) => s.applyKeyframes);
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (!isGenerated && config) {
      generateZooms(config.style);
    }
  }, [isGenerated, config, generateZooms]);

  // Auto-accept all and apply keyframes when first generated
  const appliedRef = useRef(false);
  useEffect(() => {
    if (isGenerated && suggestions.length > 0 && !appliedRef.current) {
      appliedRef.current = true;
      acceptAll();
      setTimeout(() => {
        useZoomStore.getState().applyKeyframes();
        // Also add visible zoom marker clips to timeline
        const kf = useZoomStore.getState().keyframes;
        const addClip = useTimelineStore.getState().addClip;
        for (const k of kf) {
          addClip({
            id: generateId(),
            trackType: 'video',
            name: `Zoom ${k.level}x (${k.curveType})`,
            startTime: k.time,
            duration: 1.5,
            sourceOffset: 0,
            color: '#60A5FA',
          });
        }
      }, 0);
    }
  }, [isGenerated, suggestions.length, acceptAll]);

  const accepted = suggestions.filter((s) => s.accepted === true).length;
  const rejected = suggestions.filter((s) => s.accepted === false).length;
  const pending = suggestions.filter((s) => s.accepted === null).length;

  const handleApprove = () => {
    applyKeyframes();
    addMessage('system', `Stage 3 approved. ${accepted} zoom keyframes applied.`);
    approveStage('zoom');
  };

  const handleReject = () => {
    addMessage('system', 'Stage zoom rejected. Changes reverted.');
    rejectStage('zoom');
  };

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-zoom/15 flex items-center justify-center">
          <Move size={12} strokeWidth={1.5} className="text-stage-zoom" />
        </div>
        <div>
          <span className="text-[13px] font-heading font-semibold text-text-primary">Zooms & Reframe</span>
          <span className="text-[11px] text-text-muted ml-2">{suggestions.length} suggestions</span>
        </div>
      </div>

      <p className="text-[12px] text-text-secondary leading-relaxed">
        AI placed <span className="text-text-primary font-medium">{suggestions.length} zoom points</span> based on your content style. Accept or reject each:
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
          {accepted} accepted · {rejected} rejected · {pending} pending
        </span>
      </div>

      {/* Suggestions list */}
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200',
              s.accepted === true && 'bg-accent-green/5 border-accent-green/15',
              s.accepted === false && 'bg-accent-red/5 border-accent-red/10 opacity-40',
              s.accepted === null && 'bg-bg-panel border-border-default',
            )}
          >
            <span className="text-[9px] font-mono text-text-faint tabular-nums w-[38px] shrink-0">
              {formatTimecode(s.time)}
            </span>
            <span className={cn(
              'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0',
              s.type === 'snap' ? 'text-accent-orange bg-accent-orange/10' :
              s.type === 'push-in' ? 'text-stage-zoom bg-stage-zoom/10' :
              s.type === 'drift' ? 'text-accent-purple bg-accent-purple/10' :
              'text-text-muted bg-bg-active'
            )}>
              {ZOOM_TYPE_LABELS[s.type]}
            </span>
            <span className="text-[10px] font-mono text-text-muted shrink-0">{s.level}x</span>
            <span className="flex-1 text-[11px] text-text-secondary truncate">{s.reason}</span>

            {s.accepted === null ? (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => acceptSuggestion(s.id)} className="w-6 h-6 rounded-md bg-accent-green/10 border border-accent-green/20 flex items-center justify-center text-accent-green hover:bg-accent-green/20 transition-all duration-200 cursor-pointer">
                  <Check size={11} strokeWidth={2} />
                </button>
                <button onClick={() => rejectSuggestion(s.id)} className="w-6 h-6 rounded-md bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red hover:bg-accent-red/20 transition-all duration-200 cursor-pointer">
                  <X size={11} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <span className={cn(
                'text-[8px] font-mono font-medium px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0',
                s.accepted ? 'text-accent-green bg-accent-green/10' : 'text-accent-red bg-accent-red/10'
              )}>
                {s.accepted ? 'On' : 'Off'}
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
          Approve Zooms
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}
