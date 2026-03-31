import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Music,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  UploadIcon,
  X,
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import { useCallback, useRef, useState } from "react";

interface LocalMedia {
  id: string;
  name: string;
  type: "video" | "image" | "audio";
  url: string;
  file: File;
  thumbnailUrl?: string;
}

export const Uploads = () => {
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<Set<string>>(new Set());

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      // Deduplicate by name+size
      const key = `${file.name}-${file.size}`;
      if (processingRef.current.has(key)) continue;
      processingRef.current.add(key);

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
        file,
      };

      if (type === "video") {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.onloadeddata = () => {
          video.currentTime = Math.min(1, video.duration * 0.1);
        };
        video.onseeked = () => {
          // High-res thumbnail
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
          setMedia((prev) => {
            // Final dedup check
            if (prev.some((m) => m.name === item.name && m.file.size === item.file.size)) return prev;
            return [...prev, item];
          });
          video.src = "";
        };
        video.onerror = () => {
          setMedia((prev) => {
            if (prev.some((m) => m.name === item.name)) return prev;
            return [...prev, item];
          });
        };
        video.src = url;
      } else if (type === "image") {
        item.thumbnailUrl = url;
        setMedia((prev) => {
          if (prev.some((m) => m.name === item.name && m.file.size === item.file.size)) return prev;
          return [...prev, item];
        });
      } else {
        setMedia((prev) => {
          if (prev.some((m) => m.name === item.name && m.file.size === item.file.size)) return prev;
          return [...prev, item];
        });
      }
    }
  }, []);

  const addToTimeline = useCallback((item: LocalMedia) => {
    switch (item.type) {
      case "video":
        dispatch(ADD_VIDEO, {
          payload: {
            id: generateId(),
            details: { src: item.url },
            metadata: { previewUrl: item.thumbnailUrl || "" },
          },
          options: { resourceId: "main", scaleMode: "fit" },
        });
        break;
      case "image":
        dispatch(ADD_IMAGE, {
          payload: {
            id: generateId(),
            type: "image",
            display: { from: 0, to: 5000 },
            details: { src: item.url },
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
            details: { src: item.url },
            metadata: {},
          },
          options: {},
        });
        break;
    }
  }, []);

  const handleRemove = useCallback((id: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.url);
        processingRef.current.delete(`${item.name}-${item.file.size}`);
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Drag from media bin to scene canvas
  // DesignCombo's droppable reads: types[0] as JSON key, getData(key) as payload
  const handleDragStart = useCallback((e: React.DragEvent, item: LocalMedia) => {
    const payload = {
      type: item.type,
      details: { src: item.url },
      metadata: { previewUrl: item.thumbnailUrl || "" },
    };
    const key = JSON.stringify({ type: item.type });
    e.dataTransfer.setData(key, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }, []);

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
        <Button
          className="w-full cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
        >
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
              items={videos} onAdd={addToTimeline} onRemove={handleRemove} onDragStart={handleDragStart} />
          )}
          {images.length > 0 && (
            <MediaSection title="Images" icon={<ImageIcon className="w-4 h-4" />}
              items={images} onAdd={addToTimeline} onRemove={handleRemove} onDragStart={handleDragStart} />
          )}
          {audios.length > 0 && (
            <MediaSection title="Audio" icon={<Music className="w-4 h-4" />}
              items={audios} onAdd={addToTimeline} onRemove={handleRemove} onDragStart={handleDragStart} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

function MediaSection({ title, icon, items, onAdd, onRemove, onDragStart }: {
  title: string;
  icon: React.ReactNode;
  items: LocalMedia[];
  onAdd: (item: LocalMedia) => void;
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, item: LocalMedia) => void;
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
          <div key={item.id} className="group relative">
            <Card
              className="aspect-video flex items-center justify-center overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
              draggable
              onDragStart={(e) => onDragStart(e, item)}
              onClick={() => onAdd(item)}
            >
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : item.type === "audio" ? (
                <Music className="w-6 h-6 text-muted-foreground" />
              ) : (
                <VideoIcon className="w-6 h-6 text-muted-foreground" />
              )}
            </Card>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive/80 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-[10px] text-muted-foreground truncate mt-1">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
