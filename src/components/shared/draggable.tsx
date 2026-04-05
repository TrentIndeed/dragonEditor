import React, { useRef, cloneElement, ReactElement } from "react";

// Floating drag preview element — direct DOM for zero lag
let floatingEl: HTMLDivElement | null = null;
let floatingLocked = false; // true when track is controlling position

export function lockFloating(left: number, top: number, width: number, height: number) {
  if (!floatingEl) return;
  floatingLocked = true;
  floatingEl.style.left = left + "px";
  floatingEl.style.top = top + "px";
  floatingEl.style.width = width + "px";
  floatingEl.style.height = height + "px";
  floatingEl.style.opacity = "0.9";
  floatingEl.style.borderRadius = "6px";
}

export function unlockFloating() {
  if (!floatingEl) return;
  floatingLocked = false;
  floatingEl.style.width = "auto";
  floatingEl.style.height = "auto";
  floatingEl.style.opacity = "0.8";
  floatingEl.style.borderRadius = "";
}

export let dragData: Record<string, any> | null = null;

function onDocDragOver(e: DragEvent) {
  if (floatingEl && !floatingLocked) {
    floatingEl.style.left = e.clientX + 14 + "px";
    floatingEl.style.top = e.clientY + 14 + "px";
  }
}

interface DraggableProps {
  children: ReactElement;
  data?: Record<string, any>;
  shouldDisplayPreview?: boolean;
  renderCustomPreview?: ReactElement;
}

const Draggable: React.FC<DraggableProps> = ({ children, data = {} }) => {
  const ref = useRef<HTMLElement>(null);

  const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
    dragData = data;
    e.dataTransfer.setData("application/dragon-media", JSON.stringify(data));
    e.dataTransfer.effectAllowed = "copy";

    // Hide native drag image
    const blank = new Image();
    blank.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    e.dataTransfer.setDragImage(blank, 0, 0);

    // Clone the actual element as the floating preview
    const el = ref.current || (e.target as HTMLElement);
    floatingEl = document.createElement("div");
    floatingEl.style.cssText = "position:fixed;pointer-events:none;z-index:99999;opacity:0.8;";
    floatingEl.style.left = e.clientX + 14 + "px";
    floatingEl.style.top = e.clientY + 14 + "px";

    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.width = el.offsetWidth + "px";
    clone.style.height = el.offsetHeight + "px";
    clone.style.margin = "0";
    floatingEl.appendChild(clone);

    document.body.appendChild(floatingEl);
    floatingLocked = false;
    document.addEventListener("dragover", onDocDragOver);
  };

  const handleDragEnd = () => {
    dragData = null;
    floatingLocked = false;
    document.removeEventListener("dragover", onDocDragOver);
    if (floatingEl) {
      floatingEl.remove();
      floatingEl = null;
    }
  };

  const childWithProps = cloneElement(children, {
    ref,
    draggable: true,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    style: { ...(children.props as any)?.style },
  } as any);

  return childWithProps;
};

export default Draggable;
