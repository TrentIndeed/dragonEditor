import { IDesign } from "@designcombo/types";
import { create } from "zustand";

interface Output {
  url: string;
  type: string;
}

interface DownloadState {
  projectId: string;
  exporting: boolean;
  exportType: "json" | "mp4";
  progress: number;
  output?: Output;
  payload?: IDesign;
  displayProgressModal: boolean;
  actions: {
    setProjectId: (projectId: string) => void;
    setExporting: (exporting: boolean) => void;
    setExportType: (exportType: "json" | "mp4") => void;
    setProgress: (progress: number) => void;
    setState: (state: Partial<DownloadState>) => void;
    setOutput: (output: Output) => void;
    startExport: () => void;
    setDisplayProgressModal: (displayProgressModal: boolean) => void;
  };
}

export const useDownloadState = create<DownloadState>((set, get) => ({
  projectId: "",
  exporting: false,
  exportType: "json",
  progress: 0,
  displayProgressModal: false,
  actions: {
    setProjectId: (projectId) => set({ projectId }),
    setExporting: (exporting) => set({ exporting }),
    setExportType: (exportType) => set({ exportType }),
    setProgress: (progress) => set({ progress }),
    setState: (state) => set({ ...state }),
    setOutput: (output) => set({ output }),
    setDisplayProgressModal: (displayProgressModal) =>
      set({ displayProgressModal }),
    startExport: async () => {
      try {
        set({ exporting: true, displayProgressModal: true });
        const { payload, exportType } = get();
        if (!payload) throw new Error("Payload is not defined");

        if (exportType === "json") {
          // Export as JSON — download the design file locally
          const json = JSON.stringify(payload, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);

          // Simulate progress
          for (let i = 0; i <= 100; i += 20) {
            set({ progress: i });
            await new Promise((r) => setTimeout(r, 200));
          }

          set({
            exporting: false,
            progress: 100,
            output: { url, type: "json" },
          });
        } else {
          // MP4 export — simulate progress (real rendering needs FFmpeg/Remotion)
          for (let i = 0; i <= 100; i += 5) {
            set({ progress: i });
            await new Promise((r) => setTimeout(r, 150));
          }

          set({
            exporting: false,
            progress: 100,
            output: {
              url: "",
              type: "mp4",
            },
          });

          // For now, prompt user to use DaVinci Resolve export
          console.log(
            "MP4 rendering requires FFmpeg integration. Use Download → DaVinci Resolve section for FCPXML/EDL/SRT export."
          );
        }
      } catch (error) {
        console.error(error);
        set({ exporting: false });
      }
    },
  },
}));
