'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useCaptionStore } from '@/stores/captionStore';
import { useZoomStore } from '@/stores/zoomStore';
import { MOCK_TRANSCRIPT } from '@/lib/mockData';
import PipelineProgress from './PipelineProgress';
import TrimApproval from './TrimApproval';
import AudioApproval from './AudioApproval';
import ZoomApproval from './ZoomApproval';
import BRollApproval from './BRollApproval';
import CaptionApproval from './CaptionApproval';
import SFXApproval from './SFXApproval';
import ColorApproval from './ColorApproval';
import ReviewApproval from './ReviewApproval';
import ExportApproval from './ExportApproval';
import ThumbnailApproval from './ThumbnailApproval';
import { Send, Play, Pause, Square, Eraser, Bot, Captions, Move, Volume2, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PipelineStageId } from '@/lib/types';

const STAGE_MESSAGES: Record<string, string> = {
  audio: 'Stage 2 (Audio Setup) — Analyzing audio levels and syncing mic...',
  zoom: 'Stage 3 (Zooms) — Analyzing footage for zoom placement...',
  broll: 'Stage 4 (B-Roll) — Scanning transcript for overlay points...',
  caption: 'Stage 5 (Captions) — Generating captions from transcript...',
  sfx: 'Stage 6 (SFX) — Placing sound effects on cuts and emphasis...',
  color: 'Stage 7 (Color) — Analyzing footage for color correction...',
  review: 'Stage 8 (Review) — AI is reviewing the complete edit...',
  export: 'Stage 9 (Export) — Preparing export configuration...',
  thumbnail: 'Stage 10 (Thumbnail) — Generating thumbnail variants...',
};

const STAGE_READY: Record<string, string> = {
  audio: 'Audio processed. Review settings below.',
  zoom: 'Zoom suggestions ready. Accept or reject each.',
  broll: 'B-roll placement suggestions ready.',
  caption: 'Captions generated. Review style and approve.',
  sfx: 'Sound effects placed. Review placements.',
  color: 'Color correction applied. Review the grade.',
  review: 'AI review complete. Check findings.',
  export: 'Export ready. Configure and approve.',
  thumbnail: 'Thumbnails generated. Select your favorite.',
};

export default function AIChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const stages = usePipelineStore((s) => s.stages);
  const startPipeline = usePipelineStore((s) => s.startPipeline);
  const pausePipeline = usePipelineStore((s) => s.pausePipeline);
  const resumePipeline = usePipelineStore((s) => s.resumePipeline);
  const stopPipeline = usePipelineStore((s) => s.stopPipeline);
  const isRunning = usePipelineStore((s) => s.isRunning);
  const isPaused = usePipelineStore((s) => s.isPaused);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const postedRef = useRef<Set<string>>(new Set());

  const status = (id: PipelineStageId) => stages.find((s) => s.id === id)?.status;
  const awaiting = (id: PipelineStageId) => status(id) === 'awaiting-approval';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, stages]);

  useEffect(() => {
    for (const [id, msg] of Object.entries(STAGE_MESSAGES)) {
      const s = status(id as PipelineStageId);
      if (s === 'running' && !postedRef.current.has(`${id}-run`)) {
        postedRef.current.add(`${id}-run`);
        addMessage('system', msg);
      }
      if (s === 'awaiting-approval' && !postedRef.current.has(`${id}-ready`)) {
        postedRef.current.add(`${id}-ready`);
        addMessage('system', STAGE_READY[id] || '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages]);

  const handleSend = () => {
    if (!input.trim()) return;
    addMessage('user', input.trim());
    setInput('');
    setTimeout(() => addMessage('assistant', 'I\'ll work on that. Let me analyze the footage...'), 500);
  };

  const handleStartPipeline = () => {
    postedRef.current.clear();

    // Load transcript if not already loaded (mock for now — real transcription TBD)
    if (useTranscriptStore.getState().lines.length === 0) {
      useTranscriptStore.getState().loadMockData();
    }

    // Check that media is imported
    const mediaItems = useMediaStore.getState().items;
    const timelineClips = useTimelineStore.getState().clips;
    if (mediaItems.length === 0 && timelineClips.length === 0) {
      addMessage('system', 'No media imported. Add video files to the Media Bin first.');
      return;
    }

    addMessage('system', 'Starting pipeline... Analyzing footage.');
    startPipeline();
  };

  const handlePausePipeline = () => {
    pausePipeline();
    addMessage('system', 'Pipeline paused.');
  };

  const handleResumePipeline = () => {
    resumePipeline();
    addMessage('system', 'Pipeline resumed.');
  };

  const handleStopPipeline = () => {
    stopPipeline();
    addMessage('system', 'Pipeline stopped.');
  };

  const getQuickActions = () => {
    if (awaiting('thumbnail')) return [];
    if (awaiting('export')) return [];
    if (awaiting('review')) return [];
    if (awaiting('color')) return [];
    if (awaiting('sfx')) return [{ label: 'More subtle', icon: Volume2, action: () => {} }];
    if (awaiting('caption')) return [
      { label: 'Hormozi', icon: Captions, action: () => useCaptionStore.getState().regenerateWithStyle('hormozi') },
      { label: 'Karaoke', icon: Captions, action: () => useCaptionStore.getState().regenerateWithStyle('karaoke') },
      { label: 'Clean', icon: Captions, action: () => useCaptionStore.getState().regenerateWithStyle('clean') },
    ];
    if (awaiting('broll')) return [];
    if (awaiting('zoom')) return [
      { label: 'Accept all', icon: Move, action: () => useZoomStore.getState().acceptAll() },
    ];
    if (awaiting('audio')) return [];
    if (awaiting('trim')) return [
      { label: 'Remove fillers', icon: Eraser, action: () => { useTranscriptStore.getState().removeAllFillerWords(); addMessage('system', 'All filler words removed.'); } },
    ];
    // Pipeline control buttons
    const actions: any[] = [];
    if (isRunning && !isPaused) {
      actions.push({ label: 'Pause', icon: Pause, action: handlePausePipeline });
      actions.push({ label: 'Stop', icon: Square, action: handleStopPipeline });
    } else if (isPaused) {
      actions.push({ label: 'Resume', icon: Play, action: handleResumePipeline });
      actions.push({ label: 'Stop', icon: Square, action: handleStopPipeline });
    } else {
      actions.push({ label: 'Start pipeline', icon: Play, action: handleStartPipeline });
    }
    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="flex flex-col h-full bg-bg-panel">
      <div className="h-[40px] bg-bg-panel-header border-b border-border-active flex items-center px-4 gap-2.5 shrink-0">
        <Bot size={15} strokeWidth={1.5} className="text-accent-primary" />
        <span className="text-[12px] font-mono font-medium uppercase tracking-[1.5px] text-text-muted">AI Assistant</span>
      </div>

      <PipelineProgress />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            'text-[13px] leading-[1.7]',
            msg.role === 'user' && 'text-text-primary bg-bg-surface rounded-xl rounded-br-sm p-3.5 ml-8',
            msg.role === 'assistant' && 'bg-accent-primary/[0.04] border border-accent-primary/10 rounded-xl rounded-bl-sm p-3.5 mr-4',
            msg.role === 'system' && 'text-text-muted text-[12px] py-1 px-1',
          )}>
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Bot size={10} strokeWidth={2} className="text-accent-primary" />
                <span className="text-[9px] font-mono text-accent-primary uppercase tracking-[1px]">Dragon AI</span>
              </div>
            )}
            <span className={msg.role === 'assistant' ? 'text-text-secondary' : ''}>{msg.content}</span>
          </div>
        ))}

        {awaiting('trim') && <TrimApproval />}
        {awaiting('audio') && <AudioApproval />}
        {awaiting('zoom') && <ZoomApproval />}
        {awaiting('broll') && <BRollApproval />}
        {awaiting('caption') && <CaptionApproval />}
        {awaiting('sfx') && <SFXApproval />}
        {awaiting('color') && <ColorApproval />}
        {awaiting('review') && <ReviewApproval />}
        {awaiting('export') && <ExportApproval />}
        {awaiting('thumbnail') && <ThumbnailApproval />}
      </div>

      {quickActions.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-border-default/50">
          {quickActions.map((action) => (
            <button key={action.label} onClick={action.action} disabled={'disabled' in action && action.disabled}
              className="h-[26px] px-3 rounded-lg text-[10px] font-medium border border-border-default text-text-muted bg-bg-surface hover:bg-bg-hover hover:text-text-secondary transition-all duration-200 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-1.5">
              <action.icon size={10} strokeWidth={1.5} />{action.label}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border-default px-4 py-3 shrink-0">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask AI to make changes..."
            className="flex-1 h-[38px] bg-bg-surface border border-border-active rounded-lg px-4 text-[14px] text-text-primary placeholder:text-text-faint outline-none focus:border-accent-primary/40 focus:ring-1 focus:ring-accent-primary/15 transition-all duration-200" />
          <button onClick={handleSend} disabled={!input.trim()}
            className="w-[38px] h-[38px] rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary hover:bg-accent-primary/20 transition-all duration-200 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed">
            <Send size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
