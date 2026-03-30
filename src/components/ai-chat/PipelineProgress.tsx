'use client';

import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { useHistoryStore } from '@/stores/historyStore';
import { STAGE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Scissors, AudioLines, Move, Layers, Captions, Volume2,
  Palette, Brain, Download, ImageIcon, ChevronDown, ChevronRight, Check,
  Play, RotateCcw, Undo2
} from 'lucide-react';
import { useState } from 'react';
import { PipelineStageId } from '@/lib/types';

const STAGE_ICONS: Record<PipelineStageId, React.ElementType> = {
  trim: Scissors, audio: AudioLines, zoom: Move, broll: Layers,
  caption: Captions, sfx: Volume2, color: Palette, review: Brain,
  export: Download, thumbnail: ImageIcon,
};

const STATUS_LABELS: Record<string, string> = {
  na: 'N/A', pending: 'Ready', running: 'Processing',
  reviewing: 'Reviewing', 'awaiting-approval': 'Review', approved: 'Done', rejected: 'Rejected',
};

export default function PipelineProgress() {
  const stages = usePipelineStore((s) => s.stages);
  const runSingleStage = usePipelineStore((s) => s.runSingleStage);
  const revertStage = usePipelineStore((s) => s.revertStage);
  const addMessage = useChatStore((s) => s.addMessage);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleRun = (id: PipelineStageId, name: string) => {
    pushSnapshot();
    addMessage('system', `Running stage: ${name}...`);
    runSingleStage(id);
  };

  const handleRevert = (id: PipelineStageId, name: string) => {
    pushSnapshot();
    revertStage(id);
    addMessage('system', `Reverted stage: ${name} — reset to Ready.`);
  };

  return (
    <div className="border-b border-border-active">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full h-[38px] bg-bg-panel-header flex items-center px-4 gap-2.5 cursor-pointer hover:bg-bg-hover transition-colors duration-200"
      >
        {collapsed ? <ChevronRight size={12} strokeWidth={2} className="text-text-faint" /> : <ChevronDown size={12} strokeWidth={2} className="text-text-faint" />}
        <span className="text-[12px] font-mono font-medium uppercase tracking-[1.5px] text-text-muted">Pipeline</span>
        <div className="flex-1" />
        <span className="text-[11px] font-mono text-text-faint">
          {stages.filter((s) => s.status === 'approved').length}/{stages.filter((s) => s.implemented).length}
        </span>
      </button>

      {!collapsed && (
        <div className="px-3 py-2 space-y-0.5">
          {stages.map((stage) => {
            const Icon = STAGE_ICONS[stage.id];
            const color = STAGE_COLORS[stage.id];
            const isNa = stage.status === 'na';
            const isApproved = stage.status === 'approved';
            const isHovered = hoveredId === stage.id;
            const canRun = stage.implemented && stage.status !== 'running' && stage.status !== 'reviewing';
            const canRevert = stage.status === 'approved' || stage.status === 'rejected';

            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-[6px] rounded-md transition-all duration-200 group',
                  !isNa && stage.status !== 'pending' && 'bg-bg-surface/50',
                  isHovered && canRun && 'bg-bg-hover',
                )}
                onMouseEnter={() => setHoveredId(stage.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Number badge */}
                <div className={cn(
                  'w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-mono font-medium shrink-0 border',
                  isApproved && 'bg-accent-green/15 border-accent-green/30 text-accent-green',
                  stage.status === 'running' && 'border-accent-blue/40 text-accent-blue animate-pulse',
                  stage.status === 'reviewing' && 'border-accent-orange/40 text-accent-orange animate-pulse',
                  stage.status === 'awaiting-approval' && 'border-accent-orange/40 text-accent-orange',
                  stage.status === 'rejected' && 'border-accent-red/40 text-accent-red',
                  isNa && 'border-border-default text-text-faint',
                  stage.status === 'pending' && 'border-border-active text-text-faint',
                )}>
                  {isApproved ? <Check size={9} strokeWidth={2.5} /> : stage.number}
                </div>

                <Icon size={12} strokeWidth={1.5} className={isNa ? 'text-text-faint' : 'text-text-muted'} />
                <span className={cn(
                  'text-[12px] flex-1 font-medium',
                  isNa ? 'text-text-faint' : isApproved ? 'text-text-secondary' : 'text-text-primary'
                )}>
                  {stage.name}
                </span>

                {/* Action buttons — show on hover */}
                {isHovered && canRun && (
                  <div className="flex gap-1 shrink-0">
                    {canRevert && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRevert(stage.id, stage.name); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-text-faint hover:text-accent-orange hover:bg-accent-orange/10 transition-all duration-150 cursor-pointer"
                        title={`Revert ${stage.name}`}
                      >
                        <Undo2 size={10} strokeWidth={2} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRun(stage.id, stage.name); }}
                      className="w-5 h-5 rounded flex items-center justify-center text-text-faint hover:text-accent-primary hover:bg-accent-primary/10 transition-all duration-150 cursor-pointer"
                      title={`Run ${stage.name}`}
                    >
                      <Play size={10} strokeWidth={2} />
                    </button>
                  </div>
                )}

                {/* Status label — hide when showing action buttons */}
                {!(isHovered && canRun) && (
                  <>
                    <span className={cn(
                      'text-[10px] font-mono tracking-wide',
                      isApproved && 'text-accent-green',
                      stage.status === 'running' && 'text-accent-blue',
                      stage.status === 'reviewing' && 'text-accent-orange',
                      stage.status === 'awaiting-approval' && 'text-accent-yellow',
                      stage.status === 'rejected' && 'text-accent-red',
                      (isNa || stage.status === 'pending') && 'text-text-faint',
                    )}>
                      {STATUS_LABELS[stage.status]}
                    </span>

                    {stage.status === 'running' && (
                      <div className="w-[36px] h-[3px] bg-bg-active rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${stage.progress}%`, backgroundColor: color }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
