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
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import { useCallback, useRef, useEffect } from "react";
import useMediaStore, { type LocalMedia } from "../store/use-media-store";
import { storeMediaFile, getMediaFile } from "@/dragon/media-db";
import Draggable from "@/components/shared/draggable";
import { cn } from "@/lib/utils";
import {
  useDragonTimelineStore,
  TRACK_COLORS,
  type TrackType,
} from "../store/use-dragon-timeline";
import { useHistoryStore } from "../store/use-history";

export const Uploads = () => {
  const { items: media, addItem, removeItem, hasItem } = useMediaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoredRef = useRef(false);

  // Restore blob URLs from IndexedDB on mount, then re-link timeline clips
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    (async () => {
      // Build a map of name → restored URL for timeline re-linking
      const restoredUrls: Record<string, string> = {};

      for (const item of media) {
        if (item.url && item.url.length > 0) {
          restoredUrls[item.name] = item.url;
          continue;
        }
        const stored = await getMediaFile(item.id);
        if (stored) {
          restoredUrls[item.name] = stored.url;
          useMediaStore.setState((s) => ({
            items: s.items.map((m) =>
              m.id === item.id ? { ...m, url: stored.url } : m
            ),
          }));
        }
      }

      // Re-link timeline clip src/thumbnailUrl from restored media
      const timelineClips = useDragonTimelineStore.getState().clips;
      const needsUpdate = timelineClips.some((c) => !c.src || c.src === "");
      if (needsUpdate && Object.keys(restoredUrls).length > 0) {
        // Also rebuild thumbnail map
        const mediaItems = useMediaStore.getState().items;
        const thumbMap: Record<string, string | undefined> = {};
        for (const m of mediaItems) {
          thumbMap[m.name] = m.thumbnailUrl;
        }

        useDragonTimelineStore.setState((s) => ({
          clips: s.clips.map((c) => {
            // Match by clip name (strip " (audio)" suffix for linked audio clips)
            const baseName = c.name.replace(/ \(audio\)$/, "");
            const url = restoredUrls[baseName];
            if (url && (!c.src || c.src === "")) {
              return { ...c, src: url, thumbnailUrl: c.thumbnailUrl || thumbMap[baseName] };
            }
            return c;
          }),
        }));
      }
    })();
  }, [media]);

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
          storeMediaFile(item.id, file, file.name);
          video.src = "";
        };
        video.onerror = () => { addItem(item); storeMediaFile(item.id, file, file.name); };
        video.src = url;
      } else if (type === "image") {
        item.thumbnailUrl = url;
        addItem(item);
        storeMediaFile(item.id, file, file.name);
      } else {
        addItem(item);
        storeMediaFile(item.id, file, file.name);
      }
    }
  }, [addItem, hasItem]);

  const addToDragonTimeline = useCallback((item: LocalMedia) => {
    useHistoryStore.getState().pushSnapshot();
    const store = useDragonTimelineStore.getState();
    const genId = () => {
      const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let r = "";
      for (let i = 0; i < 12; i++) r += c[Math.floor(Math.random() * c.length)];
      return r;
    };

    // Duration in seconds (item.duration is in ms from video metadata)
    const dur = item.duration ? item.duration / 1000 : 5;

    if (item.type === "video") {
      const trackClips = store.clips.filter((c) => c.trackType === "video");
      const start = trackClips.length > 0
        ? Math.max(...trackClips.map((c) => c.startTime + c.duration))
        : 0;
      const videoId = genId();
      const audioId = genId();
      store.addLinkedClips(
        { id: videoId, trackType: "video", name: item.name, startTime: start, duration: dur, sourceOffset: 0, color: TRACK_COLORS.video, linkedClipId: audioId, src: item.url, thumbnailUrl: item.thumbnailUrl },
        { id: audioId, trackType: "mic", name: item.name + " (audio)", startTime: start, duration: dur, sourceOffset: 0, color: TRACK_COLORS.mic, linkedClipId: videoId, src: item.url }
      );
    } else if (item.type === "audio") {
      const trackClips = store.clips.filter((c) => c.trackType === "music");
      const start = trackClips.length > 0
        ? Math.max(...trackClips.map((c) => c.startTime + c.duration))
        : 0;
      store.addClip({ id: genId(), trackType: "music", name: item.name, startTime: start, duration: dur, sourceOffset: 0, color: TRACK_COLORS.music, src: item.url });
    } else if (item.type === "image") {
      const trackClips = store.clips.filter((c) => c.trackType === "broll");
      const start = trackClips.length > 0
        ? Math.max(...trackClips.map((c) => c.startTime + c.duration))
        : 0;
      store.addClip({ id: genId(), trackType: "broll", name: item.name, startTime: start, duration: 5, sourceOffset: 0, color: TRACK_COLORS.broll, src: item.url, thumbnailUrl: item.thumbnailUrl });
    }
  }, []);

  const addToTimeline = useCallback((item: LocalMedia) => {
    // Add to DesignCombo (Remotion player)
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
            details: { src: item.url },
            metadata: {},
          },
          options: {},
        });
        break;
    }

    // Also add to Dragon timeline
    addToDragonTimeline(item);
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
  const dragData = {
    type: item.type,
    name: item.name,
    duration: item.duration,
    details: { src: item.url },
    metadata: { previewUrl: item.thumbnailUrl || "" },
  };

  return (
    <div className="group relative">
      <Draggable data={dragData} renderCustomPreview={
        <div className="rounded-md shadow-lg overflow-hidden opacity-80" style={{ width: 80, height: 45 }}>
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: item.type === "video" ? TRACK_COLORS.video : item.type === "audio" ? TRACK_COLORS.music : TRACK_COLORS.broll }}>
              {item.type === "audio" ? <Music className="w-4 h-4 text-white/60" /> : <VideoIcon className="w-4 h-4 text-white/60" />}
            </div>
          )}
        </div>
      }>
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
