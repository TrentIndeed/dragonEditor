'use client';

import { useState } from 'react';
import VideoPreview from './VideoPreview';
import TranscriptEditor from './TranscriptEditor';
import { cn } from '@/lib/utils';
import { MonitorPlay, FileText } from 'lucide-react';

export default function PreviewPanel() {
  const [activeTab, setActiveTab] = useState<'video' | 'transcript'>('video');

  return (
    <div className="flex flex-col h-full bg-bg-panel">
      <div className="h-[40px] bg-bg-panel-header border-b border-border-active flex items-center px-4 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('video')}
          className={cn(
            'h-[28px] px-3 rounded-lg text-[12px] font-medium flex items-center gap-2 transition-all duration-200 cursor-pointer',
            activeTab === 'video' ? 'text-accent-primary bg-accent-primary/10' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
          )}
        >
          <MonitorPlay size={14} strokeWidth={1.5} />
          Preview
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={cn(
            'h-[28px] px-3 rounded-lg text-[12px] font-medium flex items-center gap-2 transition-all duration-200 cursor-pointer',
            activeTab === 'transcript' ? 'text-accent-primary bg-accent-primary/10' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
          )}
        >
          <FileText size={14} strokeWidth={1.5} />
          Transcript
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'video' ? <VideoPreview /> : <TranscriptEditor />}
      </div>
    </div>
  );
}
