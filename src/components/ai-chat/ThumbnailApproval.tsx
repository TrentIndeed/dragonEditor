'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { generateThumbnailVariants, selectThumbnail, getSelectedThumbnail } from '@/lib/thumbnail';
import { ThumbnailVariant } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check, ImageIcon, RefreshCw } from 'lucide-react';

export default function ThumbnailApproval() {
  const config = useProjectStore((s) => s.config);
  const [variants, setVariants] = useState<ThumbnailVariant[]>([]);
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (config && variants.length === 0) {
      const lines = useTranscriptStore.getState().lines;
      const transcript = lines.filter((l) => !l.deleted).map((l) => l.text).join('. ');
      setVariants(generateThumbnailVariants(config.name, config.style, transcript));
    }
  }, [config, variants.length]);

  const handleSelect = (id: string) => {
    setVariants((v) => selectThumbnail(v, id));
  };

  const handleRegenerate = () => {
    if (!config) return;
    const lines = useTranscriptStore.getState().lines;
    const transcript = lines.filter((l) => !l.deleted).map((l) => l.text).join('. ');
    setVariants(generateThumbnailVariants(config.name, config.style, transcript));
  };

  const selected = getSelectedThumbnail(variants);

  const handleApprove = () => {
    addMessage('system', `Stage 10 approved. Thumbnail selected: "${selected?.prompt.substring(0, 50)}..."`);
    approveStage('thumbnail');
  };

  const handleReject = () => {
    addMessage('system', 'Stage thumbnail rejected. Changes reverted.');
    rejectStage('thumbnail');
  };

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-thumbnail/15 flex items-center justify-center">
          <ImageIcon size={12} strokeWidth={1.5} className="text-stage-thumbnail" />
        </div>
        <span className="text-[13px] font-heading font-semibold text-text-primary">AI Thumbnail</span>
        <span className="text-[11px] text-text-muted">4 variants</span>
      </div>

      <p className="text-[12px] text-text-secondary leading-relaxed">
        AI generated 4 YouTube thumbnail variations. Select one:
      </p>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2">
        {variants.map((v, i) => (
          <button
            key={v.id}
            onClick={() => handleSelect(v.id)}
            className={cn(
              'relative aspect-video rounded-lg border-2 overflow-hidden transition-all duration-200 cursor-pointer flex items-center justify-center',
              v.selected
                ? 'border-stage-thumbnail shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                : 'border-border-default hover:border-border-active bg-bg-panel'
            )}
          >
            {/* Placeholder for AI-generated image */}
            <div className="flex flex-col items-center gap-1">
              <ImageIcon size={16} strokeWidth={1.5} className={v.selected ? 'text-stage-thumbnail' : 'text-text-faint'} />
              <span className="text-[9px] font-mono text-text-faint">Variant {i + 1}</span>
            </div>
            {v.selected && (
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-stage-thumbnail flex items-center justify-center">
                <Check size={9} strokeWidth={3} className="text-bg-deep" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Selected prompt */}
      {selected && (
        <div className="px-2.5 py-2 rounded-lg bg-bg-panel border border-border-default/50">
          <label className="text-[9px] font-mono uppercase tracking-[1px] text-text-faint">Prompt</label>
          <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">{selected.prompt}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleApprove} disabled={!selected} className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98] disabled:opacity-25">
          <Check size={13} strokeWidth={2} /> Approve Thumbnail
        </button>
        <button onClick={handleRegenerate} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-border-default text-text-muted bg-bg-panel hover:bg-bg-hover transition-all duration-200 cursor-pointer flex items-center gap-1.5">
          <RefreshCw size={12} strokeWidth={1.5} /> Regenerate
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}
