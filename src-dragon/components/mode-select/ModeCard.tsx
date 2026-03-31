'use client';

import { Smartphone, Scissors, Film, LucideIcon } from 'lucide-react';
import { ProjectMode } from '@/lib/types';
import { MODE_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = { Smartphone, Scissors, Film };

interface ModeCardProps {
  mode: ProjectMode;
  selected: boolean;
  onSelect: (mode: ProjectMode) => void;
}

export default function ModeCard({ mode, selected, onSelect }: ModeCardProps) {
  const config = MODE_CONFIG[mode];
  const Icon = ICONS[config.icon];

  return (
    <button
      onClick={() => onSelect(mode)}
      className={cn(
        'group relative w-[200px] flex flex-col items-center gap-5 p-7 rounded-xl border cursor-pointer transition-all duration-200',
        selected
          ? 'bg-bg-surface border-accent-primary/40 shadow-[0_0_30px_rgba(56,189,248,0.08)]'
          : 'bg-bg-panel border-border-default hover:border-border-active hover:bg-bg-surface'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200',
        selected
          ? 'bg-accent-primary/15 text-accent-primary'
          : 'bg-bg-surface text-text-muted group-hover:text-text-secondary group-hover:bg-bg-active'
      )}>
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="text-center space-y-2">
        <div className={cn(
          'text-[15px] font-heading font-semibold tracking-[-0.01em] transition-colors duration-200',
          selected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
        )}>
          {config.label}
        </div>
        <div className="text-[13px] text-text-muted leading-relaxed">{config.description}</div>
      </div>
    </button>
  );
}
