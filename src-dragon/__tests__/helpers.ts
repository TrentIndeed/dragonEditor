import { useProjectStore } from '@/stores/projectStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { useCaptionStore } from '@/stores/captionStore';
import { useAudioStore } from '@/stores/audioStore';
import { useZoomStore } from '@/stores/zoomStore';

export function resetAllStores() {
  useProjectStore.setState({ config: null, isEditorOpen: false });
  useMediaStore.setState({ items: [], selectedId: null, activeTab: 'footage' });
  useTimelineStore.setState({
    clips: [], playheadTime: 0, isPlaying: false, duration: 60,
    pixelsPerSecond: 20, selectedClipIds: [], snapEnabled: true, activeTool: 'select',
  });
  useTranscriptStore.setState({ lines: [], highlightFillers: true });
  usePipelineStore.getState().resetPipeline();
  useCaptionStore.setState({ blocks: [], activeStyleId: 'karaoke', isGenerated: false });
  useAudioStore.getState().reset();
  useZoomStore.getState().reset();
  useChatStore.setState({ messages: [] });
}

/** Set up a project in editor mode with mock data loaded */
export function setupEditorState() {
  resetAllStores();
  useProjectStore.getState().createProject('Test Project', 'shorts-editor', 'entertainment');
  useMediaStore.getState().loadMockData();
  useTimelineStore.getState().loadMockData();
  useTranscriptStore.getState().loadMockData();
}
