'use client';

import { ContentStyle } from '@/lib/types';
import { STYLE_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StylePickerProps {
  selected: ContentStyle;
  onSelect: (style: ContentStyle) => void;
}

export default function StylePicker({ selected, onSelect }: StylePickerProps) {
  return (
    <div className="flex flex-wrap gap-2.5 justify-center">
      {STYLE_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={cn(
            'px-5 h-[36px] rounded-lg text-[13px] font-medium border transition-all duration-200 cursor-pointer',
            selected === opt.id
              ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
              : 'bg-bg-surface border-border-active text-text-muted hover:text-text-secondary hover:border-border-focus hover:bg-bg-hover'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
