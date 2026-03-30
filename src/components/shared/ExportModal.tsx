'use client';

import { useState } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useProjectStore } from '@/stores/projectStore';
import { downloadEDL } from '@/lib/export-edl';
import { downloadFCPXML } from '@/lib/export-fcpxml';
import { downloadSRT } from '@/lib/export-srt';
import { X, Download, Check, Film, FileText, FileCode, Captions, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

type ExportMode = 'video' | 'project';

export default function ExportModal({ open, onClose }: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('video');
  const [quality, setQuality] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [fps, setFps] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exported, setExported] = useState(false);
  const [projectFormat, setProjectFormat] = useState<'edl' | 'fcpxml' | 'srt'>('fcpxml');

  const clips = useTimelineStore((s) => s.clips);
  const duration = useTimelineStore((s) => s.duration);
  const lines = useTranscriptStore((s) => s.lines);
  const config = useProjectStore((s) => s.config);

  if (!open) return null;

  const title = config?.name || 'Dragon Export';
  const isVertical = config?.mode !== 'long-form';
  const width = isVertical ? 1080 : 1920;
  const height = isVertical ? 1920 : 1080;
  const hasClips = clips.length > 0;

  const handleExportVideo = () => {
    setExporting(true);
    setProgress(0);
    // Simulate render progress
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setExporting(false);
          setExported(true);
          setTimeout(() => setExported(false), 3000);
          return 100;
        }
        return p + 2;
      });
    }, 100);
  };

  const handleExportProject = () => {
    switch (projectFormat) {
      case 'edl': downloadEDL(clips, title, fps); break;
      case 'fcpxml': downloadFCPXML({ title, fps, width, height, duration, clips, transcriptLines: lines }); break;
      case 'srt': downloadSRT(lines, title); break;
    }
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const resolutions: Record<string, string> = {
    '720p': isVertical ? '720x1280' : '1280x720',
    '1080p': isVertical ? '1080x1920' : '1920x1080',
    '4k': isVertical ? '2160x3840' : '3840x2160',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[500px] bg-bg-panel border border-border-active rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-active">
          <div className="flex items-center gap-2.5">
            <Download size={16} strokeWidth={1.5} className="text-accent-primary" />
            <h2 className="text-[16px] font-heading font-bold text-text-primary">Export</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-200 cursor-pointer">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border-active">
          <button onClick={() => setMode('video')} className={cn('flex-1 h-[40px] flex items-center justify-center gap-2 text-[13px] font-medium transition-all duration-200 cursor-pointer border-b-2',
            mode === 'video' ? 'text-accent-primary border-accent-primary bg-accent-primary/5' : 'text-text-muted border-transparent hover:text-text-secondary')}>
            <Film size={14} strokeWidth={1.5} /> Export Video
          </button>
          <button onClick={() => setMode('project')} className={cn('flex-1 h-[40px] flex items-center justify-center gap-2 text-[13px] font-medium transition-all duration-200 cursor-pointer border-b-2',
            mode === 'project' ? 'text-accent-primary border-accent-primary bg-accent-primary/5' : 'text-text-muted border-transparent hover:text-text-secondary')}>
            <FileCode size={14} strokeWidth={1.5} /> Project File
          </button>
        </div>

        {mode === 'video' ? (
          <div className="px-5 py-5 space-y-5">
            {/* Resolution */}
            <div className="space-y-2">
              <label className="text-[12px] font-mono font-medium uppercase tracking-[1.5px] text-text-muted">Resolution</label>
              <div className="flex gap-2">
                {(['720p', '1080p', '4k'] as const).map((q) => (
                  <button key={q} onClick={() => setQuality(q)} className={cn('flex-1 h-[36px] rounded-lg text-[13px] font-medium border transition-all duration-200 cursor-pointer',
                    quality === q ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary' : 'bg-bg-surface border-border-active text-text-muted hover:text-text-secondary')}>
                    {q} <span className="text-[10px] text-text-faint ml-1">{resolutions[q]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FPS */}
            <div className="space-y-2">
              <label className="text-[12px] font-mono font-medium uppercase tracking-[1.5px] text-text-muted">Frame Rate</label>
              <div className="flex gap-2">
                {[24, 30, 60].map((f) => (
                  <button key={f} onClick={() => setFps(f)} className={cn('h-[36px] px-5 rounded-lg text-[13px] font-mono font-medium border transition-all duration-200 cursor-pointer',
                    fps === f ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary' : 'bg-bg-surface border-border-active text-text-muted')}>
                    {f}fps
                  </button>
                ))}
              </div>
            </div>

            {/* Format info */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-surface border border-border-default">
              <Film size={16} strokeWidth={1.5} className="text-text-muted shrink-0" />
              <div>
                <p className="text-[13px] text-text-primary font-medium">MP4 (H.264)</p>
                <p className="text-[11px] text-text-muted">{resolutions[quality]} · {fps}fps · {clips.length} clips · {Math.round(duration)}s</p>
              </div>
            </div>

            {/* Progress bar */}
            {exporting && (
              <div className="space-y-2">
                <div className="h-2 bg-bg-active rounded-full overflow-hidden">
                  <div className="h-full bg-accent-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[12px] font-mono text-text-muted text-center">Rendering... {progress}%</p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            <label className="text-[12px] font-mono font-medium uppercase tracking-[1.5px] text-text-muted">Format</label>
            {[
              { id: 'fcpxml' as const, label: 'FCPXML', desc: 'Multi-track timeline for DaVinci Resolve / Final Cut Pro', icon: FileCode },
              { id: 'edl' as const, label: 'EDL', desc: 'Edit Decision List — basic cuts and timecodes', icon: FileText },
              { id: 'srt' as const, label: 'SRT Subtitles', desc: 'Caption file for any video player or NLE', icon: Captions },
            ].map((fmt) => (
              <button key={fmt.id} onClick={() => setProjectFormat(fmt.id)} className={cn('w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer',
                projectFormat === fmt.id ? 'bg-accent-primary/5 border-accent-primary/25' : 'bg-bg-surface border-border-default hover:border-border-active')}>
                <fmt.icon size={16} strokeWidth={1.5} className={projectFormat === fmt.id ? 'text-accent-primary' : 'text-text-muted'} />
                <div>
                  <p className={cn('text-[13px] font-medium', projectFormat === fmt.id ? 'text-text-primary' : 'text-text-secondary')}>{fmt.label}</p>
                  <p className="text-[11px] text-text-muted">{fmt.desc}</p>
                </div>
              </button>
            ))}

            {projectFormat !== 'srt' && (
              <div className="flex gap-2">
                <label className="text-[11px] font-mono text-text-faint self-center">FPS:</label>
                {[24, 25, 30, 60].map((f) => (
                  <button key={f} onClick={() => setFps(f)} className={cn('h-[28px] px-3 rounded-lg text-[11px] font-mono border transition-all duration-200 cursor-pointer',
                    fps === f ? 'bg-accent-primary/10 border-accent-primary/25 text-accent-primary' : 'bg-bg-surface border-border-default text-text-muted')}>
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-active bg-bg-panel-header">
          <span className="text-[11px] text-text-faint">
            {!hasClips && <span className="text-accent-orange">No clips on timeline</span>}
            {hasClips && mode === 'video' && `${clips.length} clips · ${Math.round(duration)}s`}
            {hasClips && mode === 'project' && `${clips.length} clips`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-[34px] px-4 rounded-lg text-[13px] font-medium border border-border-active text-text-muted hover:bg-bg-hover transition-all duration-200 cursor-pointer">
              Cancel
            </button>
            <button
              onClick={mode === 'video' ? handleExportVideo : handleExportProject}
              disabled={!hasClips || exporting}
              className={cn('h-[34px] px-5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed',
                exported ? 'bg-accent-green text-bg-deep' : 'bg-accent-primary text-bg-deep hover:brightness-110 active:scale-[0.98]'
              )}
            >
              {exported ? <><Check size={14} strokeWidth={2} /> Done</> :
               exporting ? 'Rendering...' :
               mode === 'video' ? <><Download size={14} strokeWidth={1.5} /> Export MP4</> :
               <><Download size={14} strokeWidth={1.5} /> Download</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
