import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Music,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  UploadIcon,
  X,
  Plus,
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import { useCallback, useRef } from "react";
import useMediaStore, { type LocalMedia } from "../store/use-media-store";
import Draggable from "@/components/shared/draggable";
import { cn } from "@/lib/utils";

export const Uploads = () => {
  const { items: media, addItem, removeItem, hasItem } = useMediaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (hasItem(file.name, file.size)) continue;

      const url = URL.createObjectURL(file);
      const mime = file.type.toLowerCase();
      let type: "video" | "image" | "audio" = "video";
      if (mime.startsWith("image/")) type = "image";
      else if (mime.startsWith("audio/")) type = "audio";

      const item: LocalMedia = {
        id: generateId(),
        name: file.name,
        type,
        url,
        fileSize: file.size,
      };

      if (type === "video") {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.onloadedmetadata = () => {
          // Capture duration and dimensions
          item.duration = Math.round(video.duration * 1000); // ms
          item.width = video.videoWidth;
          item.height = video.videoHeight;
          video.currentTime = Math.min(1, video.duration * 0.1);
        };
        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 360;
          canvas.width = 320;
          canvas.height = Math.round((vh / vw) * 320);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            item.thumbnailUrl = canvas.toDataURL("image/jpeg", 0.85);
          }
          addItem(item);
          video.src = "";
        };
        video.onerror = () => addItem(item);
        video.src = url;
      } else if (type === "image") {
        item.thumbnailUrl = url;
        addItem(item);
      } else {
        addItem(item);
      }
    }
  }, [addItem, hasItem]);

  const addToTimeline = useCallback((item: LocalMedia) => {
    // Media stays in the bin — only dispatches to DesignCombo timeline
    const durationMs = item.duration || 10000; // default 10s if unknown

    switch (item.type) {
      case "video":
        dispatch(ADD_VIDEO, {
          payload: {
            id: generateId(),
            type: "video",
            display: {
              from: 0,
              to: durationMs,
            },
            trim: {
              from: 0,
              to: durationMs,
            },
            details: {
              src: item.url,
              width: item.width || 1920,
              height: item.height || 1080,
              duration: durationMs,
              volume: 100,
            },
            metadata: {
              previewUrl: item.thumbnailUrl || "",
            },
          },
          options: {
            resourceId: "main",
            scaleMode: "fit",
          },
        });
        break;
      case "image":
        dispatch(ADD_IMAGE, {
          payload: {
            id: generateId(),
            type: "image",
            display: { from: 0, to: 5000 },
            details: {
              src: item.url,
              width: item.width || 1920,
              height: item.height || 1080,
            },
            metadata: {},
          },
          options: {},
        });
        break;
      case "audio":
        dispatch(ADD_AUDIO, {
          payload: {
            id: generateId(),
            type: "audio",
            display: {
              from: 0,
              to: durationMs,
            },
            trim: {
              from: 0,
              to: durationMs,
            },
            details: {
              src: item.url,
              duration: durationMs,
              volume: 100,
            },
            metadata: {},
          },
          options: {},
        });
        break;
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const videos = media.filter((m) => m.type === "video");
  const images = media.filter((m) => m.type === "image");
  const audios = media.filter((m) => m.type === "audio");

  return (
    <div className="flex flex-1 flex-col">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
        className="hidden"
      />

      <div className="p-3">
        <Button className="w-full cursor-pointer" onClick={() => fileInputRef.current?.click()} variant="outline">
          <UploadIcon className="w-4 h-4" />
          <span className="ml-2">Upload</span>
        </Button>
      </div>

      {media.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2 mx-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload size={28} className="opacity-50" />
          <span className="text-sm">Drop files or click to browse</span>
          <span className="text-xs text-muted-foreground/60">Video, images, audio</span>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-3">
          {videos.length > 0 && (
            <MediaSection title="Videos" icon={<VideoIcon className="w-4 h-4" />}
              items={videos} onAdd={addToTimeline} onRemove={removeItem} />
          )}
          {images.length > 0 && (
            <MediaSection title="Images" icon={<ImageIcon className="w-4 h-4" />}
              items={images} onAdd={addToTimeline} onRemove={removeItem} />
          )}
          {audios.length > 0 && (
            <MediaSection title="Audio" icon={<Music className="w-4 h-4" />}
              items={audios} onAdd={addToTimeline} onRemove={removeItem} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

function MediaSection({ title, icon, items, onAdd, onRemove }: {
  title: string;
  icon: React.ReactNode;
  items: LocalMedia[];
  onAdd: (item: LocalMedia) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="font-medium text-sm">{title}</span>
        <span className="text-xs">({items.length})</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <MediaItem key={item.id} item={item} onAdd={onAdd} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function MediaItem({ item, onAdd, onRemove }: {
  item: LocalMedia;
  onAdd: (item: LocalMedia) => void;
  onRemove: (id: string) => void;
}) {
  const durationMs = item.duration || 10000;
  const dragData = {
    type: item.type,
    display: { from: 0, to: durationMs },
    trim: { from: 0, to: durationMs },
    details: {
      src: item.url,
      width: item.width || 1920,
      height: item.height || 1080,
      duration: durationMs,
      volume: 100,
    },
    metadata: { previewUrl: item.thumbnailUrl || "" },
  };

  return (
    <div className="group relative">
      <Draggable data={dragData}>
        <div
          onClick={() => onAdd(item)}
          className="aspect-video flex items-center justify-center overflow-hidden cursor-pointer rounded-lg border border-border hover:ring-1 hover:ring-primary/50 transition-all bg-card"
        >
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : item.type === "audio" ? (
            <Music className="w-6 h-6 text-muted-foreground" />
          ) : (
            <VideoIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      </Draggable>
      {/* Add to timeline button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/50 rounded-full p-1.5 pointer-events-auto cursor-pointer" onClick={() => onAdd(item)}>
          <Plus className="w-4 h-4 text-white" />
        </div>
      </div>
      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive/80 hover:text-white z-10"
      >
        <X className="w-3 h-3" />
      </button>
      <p className="text-[10px] text-muted-foreground truncate mt-1">{item.name}</p>
    </div>
  );
}
