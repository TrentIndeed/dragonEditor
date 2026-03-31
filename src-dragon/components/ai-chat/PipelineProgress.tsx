'use client';

import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { useHistoryStore } from '@/stores/historyStore';
import { cn } from '@/lib/utils';
import {
  Scissors, AudioLines, Move, Layers, Captions, Volume2,
  Palette, Brain, Download, ImageIcon, ChevronDown, ChevronRight,
  Check, Play, RotateCcw, Settings
} from 'lucide-react';
import { useState } from 'react';
import { PipelineStageId } from '@/lib/types';
import StageSettings from './StageSettings';

const STAGE_ICONS: Record<PipelineStageId, React.ElementType> = {
  trim: Scissors, audio: AudioLines, zoom: Move, broll: Layers,
  caption: Captions, sfx: Volume2, color: Palette, review: Brain,
  export: Download, thumbnail: ImageIcon,
};

export default function PipelineProgress() {
  const stages = usePipelineStore((s) => s.stages);
  const runSingleStage = usePipelineStore((s) => s.runSingleStage);
  const revertStage = usePipelineStore((s) => s.revertStage);
  const addMessage = useChatStore((s) => s.addMessage);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState<PipelineStageId | null>(null);

  const handleRun = (id: PipelineStageId, name: string) => {
    setSettingsOpen(null);
    pushSnapshot();
    addMessage('system', `Running stage: ${name}...`);
    runSingleStage(id);
  };

  const handleRevert = (id: PipelineStageId, name: string) => {
    pushSnapshot();
    revertStage(id);
    addMessage('system', `Reverted: ${name}`);
  };

  const approvedCount = stages.filter((s) => s.status === 'approved').length;

  return (
    <div className="border-b border-border-active">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full h-[40px] bg-bg-panel-header flex items-center px-4 gap-2.5 cursor-pointer hover:bg-bg-hover transition-colors duration-200"
      >
        {collapsed ? <ChevronRight size={12} strokeWidth={2} className="text-text-faint" /> : <ChevronDown size={12} strokeWidth={2} className="text-text-faint" />}
        <span className="text-[13px] font-semibold text-text-secondary">Pipeline</span>
        <div className="flex-1" />
        <span className="text-[12px] font-mono text-text-faint">{approvedCount}/{stages.length}</span>
      </button>

      {!collapsed && (
        <div className="py-1">
          {stages.map((stage) => {
            const Icon = STAGE_ICONS[stage.id];
            const isApproved = stage.status === 'approved';
            const isRunning = stage.status === 'running' || stage.status === 'reviewing';
            const isAwaiting = stage.status === 'awaiting-approval';
            const isSettingsOpen = settingsOpen === stage.id;

            return (
              <div key={stage.id}>
                {/* Stage row */}
                <div
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-150 group',
                    isSettingsOpen && 'bg-bg-hover',
                    !isSettingsOpen && 'hover:bg-bg-hover/50'
                  )}
                  onClick={() => {
                    if (!isRunning && !isAwaiting) {
                      setSettingsOpen(isSettingsOpen ? null : stage.id);
                    }
                  }}
                >
                  {/* Checkbox / number */}
                  <div className={cn(
                    'w-[22px] h-[22px] rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0 border transition-colors',
                    isApproved && 'bg-accent-primary border-accent-primary text-white',
                    isRunning && 'border-accent-primary/50 text-accent-primary animate-pulse',
                    isAwaiting && 'border-accent-orange/50 text-accent-orange',
                    !isApproved && !isRunning && !isAwaiting && 'border-border-active text-text-faint',
                  )}>
                    {isApproved ? <Check size={12} strokeWidth={2.5} /> : stage.number}
                  </div>

                  {/* Name */}
                  <span className={cn(
                    'text-[14px] flex-1',
                    isApproved ? 'text-text-secondary' : 'text-text-primary'
                  )}>
                    {stage.name}
                  </span>

                  {/* Action buttons on hover */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {isApproved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRevert(stage.id, stage.name); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-text-faint hover:text-accent-orange hover:bg-accent-orange/10 transition-all duration-150 cursor-pointer"
                        title="Revert"
                      >
                        <RotateCcw size={12} strokeWidth={2} />
                      </button>
                    )}
                    {!isRunning && !isAwaiting && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSettingsOpen(isSettingsOpen ? null : stage.id); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-text-faint hover:text-accent-primary hover:bg-accent-primary/10 transition-all duration-150 cursor-pointer"
                        title="Settings"
                      >
                        <Settings size={12} strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  {/* Running indicator */}
                  {isRunning && (
                    <div className="w-[40px] h-[4px] bg-bg-active rounded-full overflow-hidden">
                      <div className="h-full bg-accent-primary rounded-full transition-all duration-300" style={{ width: `${stage.progress}%` }} />
                    </div>
                  )}
                </div>

                {/* Settings panel (opens inline) */}
                {isSettingsOpen && (
                  <div className="px-3 pb-3">
                    <StageSettings
                      stageId={stage.id}
                      onRun={() => handleRun(stage.id, stage.name)}
                      onClose={() => setSettingsOpen(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
