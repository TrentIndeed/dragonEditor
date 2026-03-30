import { create } from 'zustand';
import { MediaItem } from '@/lib/types';
import { MOCK_MEDIA } from '@/lib/mockData';
import { generateId } from '@/lib/utils';
import { saveState, loadState } from '@/lib/persist';
import { storeMediaFile, getMediaFile, removeMediaFile, clearAllMediaFiles } from '@/lib/media-db';

interface MediaStore {
  items: MediaItem[];
  selectedId: string | null;
  activeTab: 'footage' | 'audio' | 'images' | 'ai-generated';
  isRestoring: boolean;
  addItem: (item: MediaItem) => void;
  addFiles: (files: FileList | File[]) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  setActiveTab: (tab: MediaStore['activeTab']) => void;
  loadMockData: () => void;
  restoreFromDB: () => Promise<void>;
  clearAll: () => void;
}

function detectMediaType(file: File): MediaItem['type'] {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v'].includes(ext)) return 'video';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'wma'].includes(ext)) return 'audio';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) return 'image';
  return 'video';
}

function typeToTab(type: MediaItem['type']): MediaStore['activeTab'] {
  switch (type) {
    case 'video': return 'footage';
    case 'audio': case 'sfx': return 'audio';
    case 'image': return 'images';
    case 'ai-generated': return 'ai-generated';
    default: return 'footage';
  }
}

function generateVideoThumbnail(url: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const vw = video.videoWidth || 320;
      const vh = video.videoHeight || 180;
      const maxW = 192;
      const scale = maxW / vw;
      canvas.width = maxW;
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else { resolve(''); }
      video.src = '';
    };
    video.onerror = () => resolve('');
    video.src = url;
  });
}

function fileToMediaItem(file: File): Promise<MediaItem> {
  return new Promise((resolve) => {
    const type = detectMediaType(file);
    const url = URL.createObjectURL(file);
    const item: MediaItem = { id: generateId(), name: file.name, type, url, thumbnailUrl: type === 'image' ? url : undefined };

    if (type === 'video') {
      const el = document.createElement('video');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        item.duration = el.duration;
        item.width = el.videoWidth;
        item.height = el.videoHeight;
        generateVideoThumbnail(url).then((thumb) => {
          item.thumbnailUrl = thumb || undefined;
          resolve(item);
        });
      };
      el.onerror = () => resolve(item);
      el.src = url;
    } else if (type === 'audio') {
      const el = document.createElement('audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => { item.duration = el.duration; resolve(item); };
      el.onerror = () => resolve(item);
      el.src = url;
    } else {
      resolve(item);
    }
  });
}

function persistMedia(items: MediaItem[]) {
  const serializable = items.map((item) => ({
    ...item,
    url: '', // blob URLs don't serialize — restored from IndexedDB
    thumbnailUrl: item.thumbnailUrl?.startsWith('data:') ? item.thumbnailUrl : undefined,
  }));
  saveState('media', { items: serializable });
}

const saved = typeof window !== 'undefined' ? loadState<{ items: MediaItem[] }>('media') : null;

export const useMediaStore = create<MediaStore>((set, get) => ({
  items: saved?.items ?? [],
  selectedId: null,
  activeTab: 'footage',
  isRestoring: false,

  addItem: (item) => { set((s) => ({ items: [...s.items, item] })); persistMedia(get().items); },

  addFiles: async (files) => {
    const fileArray = Array.from(files);
    let lastTab: MediaStore['activeTab'] | null = null;

    for (const file of fileArray) {
      const item = await fileToMediaItem(file);

      // Check if item with same name already exists (re-import or reload)
      const existing = get().items.find((i) => i.name === item.name && i.type === item.type);
      if (existing) {
        // Update existing item with fresh URL
        set((s) => ({
          items: s.items.map((i) => i.id === existing.id ? {
            ...i, url: item.url,
            thumbnailUrl: item.thumbnailUrl || i.thumbnailUrl,
            duration: item.duration || i.duration,
            width: item.width || i.width,
            height: item.height || i.height,
          } : i),
        }));
        // Store file blob in IndexedDB under existing ID
        await storeMediaFile(existing.id, file, file.name);
      } else {
        set((s) => ({ items: [...s.items, item] }));
        // Store file blob in IndexedDB
        await storeMediaFile(item.id, file, file.name);
      }
      lastTab = typeToTab(item.type);
    }
    if (lastTab) set({ activeTab: lastTab });
    persistMedia(get().items);
  },

  removeItem: (id) => {
    const item = get().items.find((i) => i.id === id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id), selectedId: s.selectedId === id ? null : s.selectedId }));
    persistMedia(get().items);
    removeMediaFile(id);

    // Remove all timeline clips that reference this media by name
    if (item) {
      const { useTimelineStore } = require('@/stores/timelineStore');
      const { useHistoryStore } = require('@/stores/historyStore');
      const timeline = useTimelineStore.getState();
      const matchingClips = timeline.clips.filter((c: any) => c.name === item.name || c.name === item.name.replace(/\.\w+$/, ' (audio)$&'));
      if (matchingClips.length > 0) {
        useHistoryStore.getState().pushSnapshot();
        for (const clip of matchingClips) {
          useTimelineStore.getState().removeClip(clip.id);
        }
      }
    }
  },

  selectItem: (id) => set({ selectedId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  loadMockData: () => { set({ items: MOCK_MEDIA }); persistMedia(MOCK_MEDIA); },

  /** Restore blob URLs from IndexedDB after page reload */
  restoreFromDB: async () => {
    const items = get().items;
    if (items.length === 0) return;

    set({ isRestoring: true });
    let updated = false;

    for (const item of items) {
      // Skip items that already have a working URL
      if (item.url && item.url.startsWith('blob:')) continue;

      const stored = await getMediaFile(item.id);
      if (stored) {
        set((s) => ({
          items: s.items.map((i) => i.id === item.id ? { ...i, url: stored.url } : i),
        }));
        updated = true;
      }
    }

    if (updated) persistMedia(get().items);
    set({ isRestoring: false });
  },

  clearAll: () => {
    set({ items: [], selectedId: null });
    persistMedia([]);
    clearAllMediaFiles();
  },
}));
