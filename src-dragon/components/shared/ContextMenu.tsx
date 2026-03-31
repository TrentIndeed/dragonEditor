'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
}

export default function ContextMenu({ items, children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Position menu, keeping it on screen
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - items.length * 32 - 16);
    setPos({ x, y });
    setOpen(true);
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const closeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeKey);
    };
  }, [open]);

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-[100] min-w-[180px] bg-bg-panel border border-border-active rounded-lg shadow-2xl py-1 overflow-hidden"
          style={{ left: pos.x, top: pos.y }}
        >
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={i} className="h-px bg-border-active my-1" />;
            }
            return (
              <button
                key={i}
                onClick={() => { item.action(); setOpen(false); }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                  item.danger
                    ? 'text-accent-red hover:bg-accent-red/10'
                    : 'text-text-primary hover:bg-bg-hover'
                )}
              >
                {item.icon && <span className="w-4 flex items-center justify-center shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
