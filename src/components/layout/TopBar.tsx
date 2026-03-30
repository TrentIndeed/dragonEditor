'use client';

import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useSaveStore } from '@/stores/saveStore';
import { MODE_CONFIG, STYLE_OPTIONS } from '@/lib/constants';
import { Download, ChevronLeft, Sparkles, Save, FolderOpen, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveProjectFile, loadProjectFile, formatSavedTime } from '@/lib/project-file';
import ExportModal from '@/components/shared/ExportModal';

export default function TopBar() {
  const config = useProjectStore((s) => s.config);
  const resetProject = useProjectStore((s) => s.resetProject);
  const stages = usePipelineStore((s) => s.stages);
  const isDirty = useSaveStore((s) => s.isDirty);
  const lastSavedAt = useSaveStore((s) => s.lastSavedAt);
  const markSaved = useSaveStore((s) => s.markSaved);
  const [exportOpen, setExportOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    saveProjectFile();
    markSaved();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, [markSaved]);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileOpen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await loadProjectFile(file);
    if (!ok) {
      alert('Failed to load project file. Make sure it\'s a valid .dragon file.');
    }
    e.target.value = '';
  }, []);

  if (!config) return null;
  const modeLabel = MODE_CONFIG[config.mode].label;
  const styleLabel = STYLE_OPTIONS.find((s) => s.id === config.style)?.label ?? '';

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".dragon" onChange={handleFileOpen} className="hidden" />

      <div className="h-[48px] bg-bg-panel border-b border-border-active flex items-center px-4 gap-3 shrink-0">
        <button onClick={resetProject} className="text-text-muted hover:text-text-secondary transition-colors duration-200 cursor-pointer" title="Back to projects">
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-accent-primary" />
          <span className="text-[16px] font-heading font-bold text-text-primary tracking-[-0.02em]">Dragon</span>
        </div>

        <div className="h-4 w-px bg-border-active" />

        <span className="text-[11px] font-mono font-medium uppercase tracking-[1px] text-accent-primary bg-accent-primary/10 px-2.5 py-1 rounded-md">
          {modeLabel}
        </span>
        <span className="text-[11px] font-mono font-medium uppercase tracking-[1px] text-accent-orange bg-accent-orange/10 px-2.5 py-1 rounded-md">
          {styleLabel}
        </span>

        <span className="text-[14px] text-text-muted">{config.name}</span>

        {/* Unsaved indicator */}
        {isDirty && (
          <Circle size={6} fill="currentColor" className="text-accent-orange" title="Unsaved changes" />
        )}

        <div className="flex-1" />

        {/* Save status */}
        <span className="text-[11px] font-mono text-text-faint">
          {saveFlash ? 'Saved!' : lastSavedAt ? formatSavedTime(lastSavedAt) : ''}
        </span>

        {/* Pipeline Dots */}
        <div className="flex items-center gap-[7px]">
          {stages.map((stage) => (
            <div
              key={stage.id}
              title={`${stage.number}. ${stage.name} — ${stage.status}`}
              className={cn(
                'w-[7px] h-[7px] rounded-full transition-all duration-200',
                stage.status === 'approved' && 'bg-accent-green',
                stage.status === 'running' && 'bg-accent-blue animate-pulse',
                stage.status === 'reviewing' && 'bg-accent-orange animate-pulse',
                stage.status === 'awaiting-approval' && 'bg-accent-orange',
                stage.status === 'rejected' && 'bg-accent-red',
                stage.status === 'pending' && 'bg-text-faint',
                stage.status === 'na' && 'bg-border-active',
              )}
            />
          ))}
        </div>

        <div className="h-4 w-px bg-border-active" />

        {/* Open Project */}
        <button onClick={handleOpen} className="h-[34px] px-3 rounded-lg text-[13px] font-medium border border-border-active text-text-muted bg-bg-surface hover:bg-bg-hover hover:text-text-secondary transition-all duration-200 flex items-center gap-2 cursor-pointer" title="Open .dragon project file">
          <FolderOpen size={14} strokeWidth={1.5} />
        </button>

        {/* Save */}
        <button onClick={handleSave} className={cn(
          'h-[34px] px-3 rounded-lg text-[13px] font-medium border transition-all duration-200 flex items-center gap-2 cursor-pointer',
          isDirty
            ? 'border-accent-primary/30 text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/15'
            : 'border-border-active text-text-muted bg-bg-surface hover:bg-bg-hover hover:text-text-secondary'
        )} title="Save project (Ctrl+S)">
          <Save size={14} strokeWidth={1.5} />
          <span className="hidden lg:inline">Save</span>
        </button>

        {/* Export */}
        <button onClick={() => setExportOpen(true)} className="h-[34px] px-4 rounded-lg text-[13px] font-medium border border-border-active text-text-secondary bg-bg-surface hover:bg-bg-hover hover:text-text-primary transition-all duration-200 flex items-center gap-2 cursor-pointer">
          <Download size={14} strokeWidth={1.5} />
          Export
        </button>
      </div>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}
