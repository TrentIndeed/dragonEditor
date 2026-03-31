import { create } from "zustand";

interface LocalMedia {
  id: string;
  name: string;
  type: "video" | "image" | "audio";
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  duration?: number; // milliseconds
  width?: number;
  height?: number;
}

interface MediaStore {
  items: LocalMedia[];
  addItem: (item: LocalMedia) => void;
  removeItem: (id: string) => void;
  hasItem: (name: string, fileSize: number) => boolean;
}

const useMediaStore = create<MediaStore>((set, get) => ({
  items: [],
  addItem: (item) => set((s) => {
    if (s.items.some((m) => m.name === item.name && m.fileSize === item.fileSize)) return s;
    return { items: [...s.items, item] };
  }),
  removeItem: (id) => set((s) => ({
    items: s.items.filter((m) => m.id !== id),
  })),
  hasItem: (name, fileSize) => get().items.some((m) => m.name === name && m.fileSize === fileSize),
}));

export default useMediaStore;
export type { LocalMedia };
