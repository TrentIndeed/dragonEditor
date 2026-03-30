'use client';

import React, { useEffect } from 'react';
import { useCaptionStore } from '@/stores/captionStore';
import { useProjectStore } from '@/stores/projectStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useChatStore } from '@/stores/chatStore';
import { CAPTION_STYLES, STYLE_TO_CAPTION, captionBlocksToTimelineClips } from '@/lib/captions';
import { CaptionStyleId } from '@/lib/types';
import { cn, formatTimecode } from '@/lib/utils';
import { Check, Captions, RefreshCw, Type, Trash2 } from 'lucide-react';

const STYLE_LIST: CaptionStyleId[] = ['karaoke', 'subtitle-bar', 'speaker-labeled', 'word-by-word', 'bold-pop'];

export default function CaptionApproval() {
  const config = useProjectStore((s) => s.config);
  const blocks = useCaptionStore((s) => s.blocks);
  const activeStyleId = useCaptionStore((s) => s.activeStyleId);
  const isGenerated = useCaptionStore((s) => s.isGenerated);
  const generateCaptions = useCaptionStore((s) => s.generateCaptions);
  const setCaptionStyle = useCaptionStore((s) => s.setCaptionStyle);
  const regenerateWithStyle = useCaptionStore((s) => s.regenerateWithStyle);
  const removeBlock = useCaptionStore((s) => s.removeBlock);
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addClip = useTimelineStore((s) => s.addClip);
  const addMessage = useChatStore((s) => s.addMessage);

  // Auto-generate and apply to timeline on first render
  useEffect(() => {
    if (!isGenerated && config) {
      generateCaptions(config.style);
    }
  }, [isGenerated, config, generateCaptions]);

  // Auto-apply caption clips to timeline once generated
  const appliedRef = React.useRef(false);
  useEffect(() => {
    if (isGenerated && blocks.length > 0 && !appliedRef.current) {
      appliedRef.current = true;
      const clips = captionBlocksToTimelineClips(blocks);
      for (const clip of clips) addClip(clip);
    }
  }, [isGenerated, blocks, addClip]);

  const activeStyle = CAPTION_STYLES[activeStyleId];
  const recommendedId = config ? STYLE_TO_CAPTION[config.style] : 'karaoke';

  const handleApprove = () => {
    addMessage('system', `Stage 5 approved. ${blocks.length} caption blocks kept on timeline.`);
    approveStage('caption');
  };

  const handleReject = () => {
    addMessage('system', 'Stage 5 rejected. Caption changes reverted.');
    rejectStage('caption');
  };

  const handleStyleChange = (styleId: CaptionStyleId) => {
    regenerateWithStyle(styleId);
  };

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-caption/15 flex items-center justify-center">
          <Captions size={12} strokeWidth={1.5} className="text-stage-caption" />
        </div>
        <div>
          <span className="text-[13px] font-heading font-semibold text-text-primary">Captions</span>
          <span className="text-[11px] text-text-muted ml-2">Select Style & Review</span>
        </div>
      </div>

      <p className="text-[12px] text-text-secondary leading-relaxed">
        Generated <span className="text-text-primary font-medium">{blocks.length} caption blocks</span> from transcript.
        Pick a style — <span className="text-stage-caption font-medium">{CAPTION_STYLES[recommendedId].name}</span> is recommended for your content style.
      </p>

      {/* Style Picker */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-[1.5px] text-text-muted">Caption Style</label>
        <div className="grid grid-cols-1 gap-1.5">
          {STYLE_LIST.map((id) => {
            const style = CAPTION_STYLES[id];
            const isActive = activeStyleId === id;
            const isRecommended = recommendedId === id;
            return (
              <button
                key={id}
                onClick={() => handleStyleChange(id)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer',
                  isActive
                    ? 'bg-stage-caption/5 border-stage-caption/25'
                    : 'bg-bg-panel border-border-default hover:border-border-active hover:bg-bg-hover'
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[10px] font-mono font-bold',
                  isActive ? 'bg-stage-caption/15 text-stage-caption' : 'bg-bg-hover text-text-muted'
                )}>
                  <Type size={13} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[12px] font-medium',
                      isActive ? 'text-text-primary' : 'text-text-secondary'
                    )}>
                      {style.name}
                    </span>
                    {isRecommended && (
                      <span className="text-[8px] font-mono uppercase tracking-wider text-stage-caption bg-stage-caption/10 px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed mt-0.5">{style.description}</p>
                </div>
                {isActive && (
                  <div className="w-4 h-4 rounded-full bg-stage-caption/20 flex items-center justify-center shrink-0">
                    <Check size={9} strokeWidth={3} className="text-stage-caption" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview — first 5 blocks */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase tracking-[1.5px] text-text-muted">Preview</label>
          <span className="text-[10px] font-mono text-text-faint">{blocks.length} blocks</span>
        </div>
        <div className="space-y-1 max-h-[180px] overflow-y-auto">
          {blocks.slice(0, 8).map((block) => (
            <div
              key={block.id}
              className="group flex items-center gap-2 px-2.5 py-2 rounded-lg bg-bg-panel border border-border-default/50 transition-all duration-200 hover:border-border-active"
            >
              <span className="text-[9px] font-mono text-text-faint tabular-nums w-[42px] shrink-0">
                {formatTimecode(block.startTime)}
              </span>
              {block.speaker && activeStyle.speakerLabel && (
                <span className="text-[9px] font-medium text-accent-blue bg-accent-blue/8 px-1.5 py-0.5 rounded shrink-0">
                  {block.speaker}
                </span>
              )}
              <CaptionPreviewText
                text={block.text}
                words={block.words}
                style={activeStyle}
              />
              <button
                onClick={() => removeBlock(block.id)}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-text-faint hover:text-accent-red hover:bg-accent-red/10 transition-all duration-150 cursor-pointer shrink-0"
              >
                <Trash2 size={10} strokeWidth={1.5} />
              </button>
            </div>
          ))}
          {blocks.length > 8 && (
            <div className="text-[10px] text-text-faint text-center py-1">
              + {blocks.length - 8} more blocks
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleApprove}
          disabled={blocks.length === 0}
          className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <Check size={13} strokeWidth={2} />
          Approve Captions
        </button>
        <button
          onClick={handleReject}
          className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5"
        >
          Revert
        </button>
        <button
          onClick={() => config && regenerateWithStyle(activeStyleId)}
          className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-border-default text-text-muted bg-bg-panel hover:bg-bg-hover hover:text-text-secondary transition-all duration-200 cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw size={12} strokeWidth={1.5} />
          Regenerate
        </button>
      </div>
    </div>
  );
}

// ── Inline preview of styled caption text ──

function CaptionPreviewText({ text, words, style }: {
  text: string;
  words: { text: string; emphasis: boolean }[];
  style: import('@/lib/types').CaptionStyle;
}) {
  if (!style.highlight) {
    return (
      <span className={cn(
        'flex-1 truncate text-[11px]',
        style.fontWeight === 'extrabold' ? 'font-extrabold' : style.fontWeight === 'bold' ? 'font-bold' : 'font-normal',
        'text-text-primary'
      )}>
        {text}
      </span>
    );
  }

  return (
    <span className={cn(
      'flex-1 truncate text-[11px]',
      style.fontWeight === 'extrabold' ? 'font-extrabold' : style.fontWeight === 'bold' ? 'font-bold' : 'font-normal',
    )}>
      {words.map((w, i) => (
        <span key={i} className={w.emphasis ? 'text-stage-caption' : 'text-text-primary'}>
          {w.text}{i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
