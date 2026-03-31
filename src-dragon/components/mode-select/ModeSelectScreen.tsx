'use client';

import { useState, useRef, useCallback } from 'react';
import { ProjectMode, ContentStyle } from '@/lib/types';
import { useProjectStore } from '@/stores/projectStore';
import { loadProjectFile } from '@/lib/project-file';
import ModeCard from './ModeCard';
import StylePicker from './StylePicker';
import { Sparkles, FolderOpen } from 'lucide-react';

export default function ModeSelectScreen() {
  const [mode, setMode] = useState<ProjectMode>('shorts-editor');
  const [style, setStyle] = useState<ContentStyle>('entertainment');
  const [name, setName] = useState('');
  const createProject = useProjectStore((s) => s.createProject);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject(name.trim(), mode, style);
  };

  const handleOpenProject = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadProjectFile(file);
    e.target.value = '';
  }, []);

  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center">
      <input ref={fileInputRef} type="file" accept=".dragon" onChange={handleOpenProject} className="hidden" />
      <div className="flex flex-col items-center gap-14 max-w-[700px] w-full px-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
            <Sparkles size={22} className="text-accent-primary" />
          </div>
          <h1 className="text-[32px] font-heading font-bold text-text-primary tracking-[-0.03em]">
            Dragon Editor
          </h1>
          <p className="text-[15px] text-text-secondary">
            AI-powered video editing pipeline
          </p>
        </div>

        {/* Mode Cards */}
        <div className="flex flex-col items-center gap-5 w-full">
          <label className="text-[12px] font-mono font-medium uppercase tracking-[2px] text-text-muted">
            Select Mode
          </label>
          <div className="flex gap-4">
            {(['shorts-editor', 'shorts-extractor', 'long-form'] as ProjectMode[]).map((m) => (
              <ModeCard key={m} mode={m} selected={mode === m} onSelect={setMode} />
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="flex flex-col items-center gap-5 w-full">
          <label className="text-[12px] font-mono font-medium uppercase tracking-[2px] text-text-muted">
            Content Style
          </label>
          <StylePicker selected={style} onSelect={setStyle} />
        </div>

        {/* Project Name + Create */}
        <div className="flex flex-col items-center gap-5 w-full max-w-[360px]">
          <label className="text-[12px] font-mono font-medium uppercase tracking-[2px] text-text-muted">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="My awesome video..."
            className="w-full h-[42px] bg-bg-surface border border-border-active rounded-lg px-4 text-[15px] text-text-primary placeholder:text-text-faint outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all duration-200"
          />
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full h-[42px] rounded-lg text-[14px] font-semibold cursor-pointer transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed bg-accent-primary text-bg-deep hover:brightness-110 active:scale-[0.98]"
          >
            Create Project
          </button>

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-border-active" />
            <span className="text-[11px] font-mono text-text-faint uppercase">or</span>
            <div className="flex-1 h-px bg-border-active" />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-[42px] rounded-lg text-[14px] font-medium border border-border-active text-text-muted bg-bg-surface hover:bg-bg-hover hover:text-text-secondary transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <FolderOpen size={16} strokeWidth={1.5} />
            Open Project File
          </button>
        </div>
      </div>
    </div>
  );
}
