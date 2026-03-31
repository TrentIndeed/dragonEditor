/**
 * Dragon Editor project file system.
 * Saves/loads .dragon files (JSON) containing all editor state.
 * Media files are referenced by name — the actual files need to be re-imported.
 */

import { ProjectConfig, TimelineClip, TranscriptLine, PipelineStage, ChatMessage, MediaItem, CaptionBlock } from './types';

export interface DragonProjectFile {
  version: 1;
  savedAt: number;
  project: ProjectConfig;
  timeline: {
    clips: TimelineClip[];
    duration: number;
  };
  transcript: {
    lines: TranscriptLine[];
  };
  pipeline: {
    stages: PipelineStage[];
    currentStageId: string | null;
  };
  chat: {
    messages: ChatMessage[];
  };
  media: {
    items: Array<{
      id: string;
      name: string;
      type: MediaItem['type'];
      duration?: number;
      width?: number;
      height?: number;
      thumbnailUrl?: string; // data: URL thumbnails persist
    }>;
  };
  captions?: {
    blocks: CaptionBlock[];
    activeStyleId: string;
  };
}

/** Gather all current state into a project file object */
export function gatherProjectState(): DragonProjectFile | null {
  // Dynamic imports to avoid circular deps at module level
  const { useProjectStore } = require('@/stores/projectStore');
  const { useTimelineStore } = require('@/stores/timelineStore');
  const { useTranscriptStore } = require('@/stores/transcriptStore');
  const { usePipelineStore } = require('@/stores/pipelineStore');
  const { useChatStore } = require('@/stores/chatStore');
  const { useMediaStore } = require('@/stores/mediaStore');
  const { useCaptionStore } = require('@/stores/captionStore');

  const project = useProjectStore.getState().config;
  if (!project) return null;

  const timeline = useTimelineStore.getState();
  const transcript = useTranscriptStore.getState();
  const pipeline = usePipelineStore.getState();
  const chat = useChatStore.getState();
  const media = useMediaStore.getState();
  const captions = useCaptionStore.getState();

  return {
    version: 1,
    savedAt: Date.now(),
    project,
    timeline: {
      clips: timeline.clips,
      duration: timeline.duration,
    },
    transcript: {
      lines: transcript.lines,
    },
    pipeline: {
      stages: pipeline.stages,
      currentStageId: pipeline.currentStageId,
    },
    chat: {
      messages: chat.messages,
    },
    media: {
      items: media.items.map((item: MediaItem) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        duration: item.duration,
        width: item.width,
        height: item.height,
        thumbnailUrl: item.thumbnailUrl?.startsWith('data:') ? item.thumbnailUrl : undefined,
      })),
    },
    captions: captions.isGenerated ? {
      blocks: captions.blocks,
      activeStyleId: captions.activeStyleId,
    } : undefined,
  };
}

/** Save project to a .dragon file (downloads to browser) */
export function saveProjectFile(): boolean {
  const data = gatherProjectState();
  if (!data) return false;

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = data.project.name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').toLowerCase();

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.dragon`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}

/** Load a .dragon project file and restore all state */
export function loadProjectFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as DragonProjectFile;
        if (!data.version || !data.project) {
          resolve(false);
          return;
        }
        restoreProjectState(data);
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
}

/** Restore all stores from a project file */
function restoreProjectState(data: DragonProjectFile) {
  const { useProjectStore } = require('@/stores/projectStore');
  const { useTimelineStore } = require('@/stores/timelineStore');
  const { useTranscriptStore } = require('@/stores/transcriptStore');
  const { usePipelineStore } = require('@/stores/pipelineStore');
  const { useChatStore } = require('@/stores/chatStore');
  const { useMediaStore } = require('@/stores/mediaStore');
  const { useCaptionStore } = require('@/stores/captionStore');

  useProjectStore.setState({
    config: data.project,
    isEditorOpen: true,
  });

  useTimelineStore.setState({
    clips: data.timeline.clips,
    duration: data.timeline.duration,
    playheadTime: 0,
    isPlaying: false,
    selectedClipIds: [],
  });

  useTranscriptStore.setState({
    lines: data.transcript.lines,
  });

  usePipelineStore.setState({
    stages: data.pipeline.stages,
    currentStageId: data.pipeline.currentStageId as any,
    isRunning: false,
  });

  useChatStore.setState({
    messages: data.chat.messages,
  });

  useMediaStore.setState({
    items: data.media.items.map((item) => ({
      ...item,
      url: '', // blob URLs don't persist — user needs to re-import files
    })),
  });

  if (data.captions) {
    useCaptionStore.setState({
      blocks: data.captions.blocks,
      activeStyleId: data.captions.activeStyleId as any,
      isGenerated: true,
    });
  }
}

/** Format a timestamp for display */
export function formatSavedTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
