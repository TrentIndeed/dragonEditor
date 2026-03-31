import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocalMedia {
  id: string;
  name: string;
  type: "video" | "image" | "audio";
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  duration?: number;
  width?: number;
  height?: number;
}

interface MediaStore {
  items: LocalMedia[];
  addItem: (item: LocalMedia) => void;
  removeItem: (id: string) => void;
  hasItem: (name: string, fileSize: number) => boolean;
}

const useMediaStore = create<MediaStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((s) => {
        if (s.items.some((m) => m.name === item.name && m.fileSize === item.fileSize)) return s;
        return { items: [...s.items, item] };
      }),
      removeItem: (id) => set((s) => ({
        items: s.items.filter((m) => m.id !== id),
      })),
      hasItem: (name, fileSize) => get().items.some((m) => m.name === name && m.fileSize === fileSize),
    }),
    {
      name: "dragon-editor-media",
      // Only persist metadata + thumbnails (data: URLs survive, blob: URLs don't)
      partialize: (state) => ({
        items: state.items.map((item) => ({
          ...item,
          // blob URLs die on reload — clear them, keep data: URL thumbnails
          url: item.url?.startsWith("blob:") ? "" : item.url,
          thumbnailUrl: item.thumbnailUrl?.startsWith("data:") ? item.thumbnailUrl : undefined,
        })),
      }),
    }
  )
);

export default useMediaStore;
export type { LocalMedia };
