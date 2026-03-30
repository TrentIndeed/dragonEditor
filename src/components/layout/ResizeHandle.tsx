'use client';

import { useCallback, useRef } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}

export default function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const startRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const start = direction === 'horizontal' ? e.clientX : e.clientY;
    startRef.current = start;

    const handleMove = (ev: MouseEvent) => {
      const current = direction === 'horizontal' ? ev.clientX : ev.clientY;
      const delta = current - startRef.current;
      startRef.current = current;
      onResize(delta);
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [direction, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`group ${
        direction === 'horizontal'
          ? 'w-[1px] cursor-col-resize'
          : 'h-[1px] cursor-row-resize'
      } bg-border-default hover:bg-accent-primary/40 transition-colors duration-200 shrink-0 relative`}
    >
      {/* Wider invisible hit area */}
      <div className={`absolute ${
        direction === 'horizontal'
          ? 'top-0 bottom-0 -left-[3px] w-[7px]'
          : 'left-0 right-0 -top-[3px] h-[7px]'
      }`} />
    </div>
  );
}
