'use client';

import { useState, useEffect } from 'react';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { runAIReviewWithClaude, getReviewScore } from '@/lib/ai-review';
import { ReviewFinding } from '@/lib/types';
import { cn, formatTimecode } from '@/lib/utils';
import { Check, Brain, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const SEVERITY_CONFIG = {
  issue: { icon: AlertCircle, color: 'text-accent-red', bg: 'bg-accent-red/10' },
  warning: { icon: AlertTriangle, color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
  info: { icon: Info, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
};

export default function ReviewApproval() {
  const [findings, setFindings] = useState<ReviewFinding[]>([]);
  const [score, setScore] = useState({ score: 0, label: '' });
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    (async () => {
      const clips = useTimelineStore.getState().clips;
      const lines = useTranscriptStore.getState().lines;
      const duration = useTimelineStore.getState().duration;
      const f = await runAIReviewWithClaude(clips, lines, duration);
      setFindings(f);
      setScore(getReviewScore(f));
    })();
  }, []);

  const handleApprove = () => {
    addMessage('system', `Stage 8 approved. Review score: ${score.score}/100 (${score.label}). ${findings.length} findings noted.`);
    approveStage('review');
  };

  const handleReject = () => {
    addMessage('system', 'Stage review rejected. Changes reverted.');
    rejectStage('review');
  };

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-review/15 flex items-center justify-center">
          <Brain size={12} strokeWidth={1.5} className="text-stage-review" />
        </div>
        <span className="text-[13px] font-heading font-semibold text-text-primary">AI Self-Review</span>
        <div className="flex-1" />
        <div className={cn(
          'px-2.5 py-1 rounded-lg text-[12px] font-mono font-bold',
          score.score >= 90 ? 'text-accent-green bg-accent-green/10' :
          score.score >= 70 ? 'text-accent-yellow bg-accent-yellow/10' :
          'text-accent-red bg-accent-red/10'
        )}>
          {score.score}/100
        </div>
      </div>

      <p className="text-[12px] text-text-secondary">
        AI reviewed the complete edit. Found <span className="text-text-primary font-medium">{findings.length} items</span> — score: <span className="font-medium text-text-primary">{score.label}</span>
      </p>

      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {findings.map((f) => {
          const sev = SEVERITY_CONFIG[f.severity];
          const Icon = sev.icon;
          return (
            <div key={f.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-bg-panel border border-border-default/50">
              <div className={cn('w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5', sev.bg)}>
                <Icon size={11} strokeWidth={2} className={sev.color} />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-text-faint uppercase">{f.category}</span>
                  {f.timecode > 0 && <span className="text-[9px] font-mono text-text-faint tabular-nums">{formatTimecode(f.timecode)}</span>}
                </div>
                <p className="text-[11px] text-text-primary">{f.description}</p>
                <p className="text-[10px] text-text-muted">{f.suggestion}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleApprove} className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98]">
          <Check size={13} strokeWidth={2} /> Approve Review
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}
