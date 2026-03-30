'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { generatePlatformMetadata, getResolutionForMode, getQualityOptions, DEFAULT_EXPORT_CONFIG } from '@/lib/export-pipeline';
import { ExportPlatform, ExportConfig, PlatformMetadata } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check, Download, Youtube, Instagram, Smartphone, HardDrive } from 'lucide-react';

const PLATFORM_CONFIG: Record<ExportPlatform, { icon: React.ElementType; label: string }> = {
  local: { icon: HardDrive, label: 'Local File' },
  youtube: { icon: Youtube, label: 'YouTube' },
  tiktok: { icon: Smartphone, label: 'TikTok' },
  instagram: { icon: Instagram, label: 'Instagram' },
};

export default function ExportApproval() {
  const config = useProjectStore((s) => s.config);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [metadata, setMetadata] = useState<PlatformMetadata[]>([]);
  const approveStage = usePipelineStore((s) => s.approveStage);
  const rejectStage = usePipelineStore((s) => s.rejectStage);
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (config) {
      const res = getResolutionForMode(config.mode);
      setExportConfig((c) => ({ ...c, resolution: res }));
      const meta = generatePlatformMetadata(config.name, config.style, exportConfig.platforms);
      setMetadata(meta);
    }
  }, [config, exportConfig.platforms]);

  const togglePlatform = (p: ExportPlatform) => {
    setExportConfig((c) => ({
      ...c,
      platforms: c.platforms.includes(p) ? c.platforms.filter((x) => x !== p) : [...c.platforms, p],
    }));
  };

  const handleApprove = () => {
    addMessage('system', `Stage 9 approved. Exporting ${exportConfig.quality} quality ${exportConfig.format.toUpperCase()} at ${exportConfig.resolution} to ${exportConfig.platforms.join(', ')}.`);
    approveStage('export');
  };

  const handleReject = () => {
    addMessage('system', 'Stage export rejected. Changes reverted.');
    rejectStage('export');
  };

  const qualityOptions = getQualityOptions();

  return (
    <div className="bg-bg-surface border border-border-active rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-stage-export/15 flex items-center justify-center">
          <Download size={12} strokeWidth={1.5} className="text-stage-export" />
        </div>
        <span className="text-[13px] font-heading font-semibold text-text-primary">Export & Upload</span>
      </div>

      {/* Platforms */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-[1.5px] text-text-muted">Platforms</label>
        <div className="flex gap-1.5">
          {(Object.entries(PLATFORM_CONFIG) as [ExportPlatform, typeof PLATFORM_CONFIG[ExportPlatform]][]).map(([id, p]) => {
            const active = exportConfig.platforms.includes(id);
            return (
              <button key={id} onClick={() => togglePlatform(id)} className={cn(
                'h-[30px] px-3 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all duration-200 cursor-pointer',
                active ? 'bg-stage-export/10 border-stage-export/25 text-stage-export' : 'bg-bg-panel border-border-default text-text-muted hover:text-text-secondary'
              )}>
                <p.icon size={12} strokeWidth={1.5} /> {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-[1.5px] text-text-muted">Quality</label>
        <div className="flex gap-1.5">
          {qualityOptions.map((q) => (
            <button key={q.id} onClick={() => setExportConfig((c) => ({ ...c, quality: q.id }))} className={cn(
              'h-[28px] px-3 rounded-lg text-[10px] font-medium border transition-all duration-200 cursor-pointer',
              exportConfig.quality === q.id ? 'bg-accent-primary/10 border-accent-primary/25 text-accent-primary' : 'bg-bg-panel border-border-default text-text-muted'
            )}>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution + Format */}
      <div className="flex gap-4 text-[11px]">
        <div><span className="text-text-faint font-mono">RES:</span> <span className="text-text-secondary">{exportConfig.resolution}</span></div>
        <div><span className="text-text-faint font-mono">FPS:</span> <span className="text-text-secondary">{exportConfig.fps}</span></div>
        <div><span className="text-text-faint font-mono">FMT:</span> <span className="text-text-secondary uppercase">{exportConfig.format}</span></div>
      </div>

      {/* Metadata preview */}
      {metadata.filter((m) => m.platform !== 'local').length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-[1.5px] text-text-muted">AI Metadata</label>
          {metadata.filter((m) => m.platform !== 'local').map((m) => (
            <div key={m.platform} className="px-2.5 py-2 rounded-lg bg-bg-panel border border-border-default/50 space-y-1">
              <div className="text-[10px] font-mono text-text-faint uppercase">{m.platform}</div>
              <div className="text-[11px] text-text-primary font-medium">{m.title}</div>
              <div className="text-[10px] text-text-muted">{m.hashtags.join(' ')}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleApprove} className="h-[32px] px-4 rounded-lg text-[12px] font-medium bg-accent-primary text-bg-deep hover:bg-accent-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-[0.98]">
          <Check size={13} strokeWidth={2} /> Export
        </button>
        <button onClick={handleReject} className="h-[32px] px-3.5 rounded-lg text-[12px] font-medium border border-accent-red/20 text-accent-red bg-accent-red/5 hover:bg-accent-red/10 transition-all duration-200 cursor-pointer flex items-center gap-1.5">Revert</button>
      </div>
    </div>
  );
}
