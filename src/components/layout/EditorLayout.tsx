'use client';

import { useState, useCallback } from 'react';
import TopBar from './TopBar';
import ResizeHandle from './ResizeHandle';
import KeyboardShortcuts from './KeyboardShortcuts';
import PlaybackEngine from './PlaybackEngine';
import AutoSave from './AutoSave';
import MediaRestorer from './MediaRestorer';
import MediaBin from '@/components/media-bin/MediaBin';
import PreviewPanel from '@/components/preview/PreviewPanel';
import AIChatPanel from '@/components/ai-chat/AIChatPanel';
import Timeline from '@/components/timeline/Timeline';
import { clamp } from '@/lib/utils';

export default function EditorLayout() {
  const [mediaBinWidth, setMediaBinWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(380);
  const [timelineHeight, setTimelineHeight] = useState(240);

  const handleMediaResize = useCallback((delta: number) => {
    setMediaBinWidth((w) => clamp(w + delta, 180, 400));
  }, []);

  const handleChatResize = useCallback((delta: number) => {
    setChatWidth((w) => clamp(w - delta, 280, 500));
  }, []);

  const handleTimelineResize = useCallback((delta: number) => {
    setTimelineHeight((h) => clamp(h - delta, 150, 450));
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-deep overflow-hidden">
      <KeyboardShortcuts />
      <PlaybackEngine />
      <AutoSave />
      <MediaRestorer />
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Media Bin */}
        <div style={{ width: mediaBinWidth }} className="shrink-0 overflow-hidden">
          <MediaBin />
        </div>

        <ResizeHandle direction="horizontal" onResize={handleMediaResize} />

        {/* Center: Preview + Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden">
            <PreviewPanel />
          </div>
          <ResizeHandle direction="vertical" onResize={handleTimelineResize} />
          <div style={{ height: timelineHeight }} className="shrink-0 overflow-hidden">
            <Timeline />
          </div>
        </div>

        <ResizeHandle direction="horizontal" onResize={handleChatResize} />

        {/* AI Chat Panel */}
        <div style={{ width: chatWidth }} className="shrink-0 overflow-hidden">
          <AIChatPanel />
        </div>
      </div>
    </div>
  );
}
