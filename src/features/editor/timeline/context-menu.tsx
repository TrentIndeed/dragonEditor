"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { dispatch } from "@designcombo/events";
import { ACTIVE_DELETE, ACTIVE_SPLIT, HISTORY_UNDO } from "@designcombo/state";
import { Scissors, Trash2, Copy, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextMenuProps {
  children: React.ReactNode;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
}

export function TimelineContextMenu({ children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPos({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 200),
    });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  const items: MenuItem[] = [
    {
      label: "Split at Playhead",
      icon: <Scissors className="w-3.5 h-3.5" />,
      action: () => dispatch(ACTIVE_SPLIT, {}),
    },
    {
      label: "Undo",
      icon: <Undo2 className="w-3.5 h-3.5" />,
      action: () => dispatch(HISTORY_UNDO),
    },
    { label: "", icon: null, action: () => {}, separator: true },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      action: () => dispatch(ACTIVE_DELETE),
      danger: true,
    },
  ];

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>
      {open && (
        <div
          ref={menuRef}
          className="fixed z-[300] min-w-[180px] bg-popover border border-border rounded-lg shadow-xl py-1 overflow-hidden"
          style={{ left: pos.x, top: pos.y }}
          onClick={() => setOpen(false)}
        >
          {items.map((item, i) => {
            if (item.separator) return <div key={i} className="h-px bg-border my-1" />;
            return (
              <button
                key={i}
                onClick={item.action}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                  item.danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
