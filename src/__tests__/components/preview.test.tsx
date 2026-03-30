import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreviewPanel from '@/components/preview/PreviewPanel';
import VideoPreview from '@/components/preview/VideoPreview';
import TransportControls from '@/components/preview/TransportControls';
import { useTimelineStore } from '@/stores/timelineStore';
import { useProjectStore } from '@/stores/projectStore';
import { resetAllStores, setupEditorState } from '../helpers';

describe('PreviewPanel', () => {
  beforeEach(() => setupEditorState());

  it('should render Preview and Transcript tabs', () => {
    render(<PreviewPanel />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Transcript')).toBeInTheDocument();
  });

  it('should show video preview by default', () => {
    render(<PreviewPanel />);
    // With mock data loaded (clips on timeline but no blob URLs), shows re-import message
    expect(screen.getByText('Media files need re-import')).toBeInTheDocument();
  });

  it('should switch to transcript view when Transcript tab clicked', async () => {
    const user = userEvent.setup();
    render(<PreviewPanel />);
    await user.click(screen.getByText('Transcript'));
    // Transcript is loaded via setupEditorState
    expect(screen.getByText(/Hey everyone/)).toBeInTheDocument();
  });
});

describe('VideoPreview', () => {
  beforeEach(() => {
    resetAllStores();
    useProjectStore.getState().createProject('Test', 'shorts-editor', 'entertainment');
  });

  it('should render empty state', () => {
    render(<VideoPreview />);
    expect(screen.getByText('No footage loaded')).toBeInTheDocument();
  });
});

describe('TransportControls', () => {
  beforeEach(() => resetAllStores());

  it('should render play button and timecode', () => {
    render(<TransportControls />);
    expect(screen.getByTitle('Play')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('1:00')).toBeInTheDocument(); // duration = 60s
  });

  it('should toggle play/pause', async () => {
    const user = userEvent.setup();
    render(<TransportControls />);
    await user.click(screen.getByTitle('Play'));
    expect(useTimelineStore.getState().isPlaying).toBe(true);
    expect(screen.getByTitle('Pause')).toBeInTheDocument();
  });

  it('should go to start on skip back', async () => {
    const user = userEvent.setup();
    useTimelineStore.setState({ playheadTime: 30 });
    render(<TransportControls />);
    await user.click(screen.getByTitle('Go to start'));
    expect(useTimelineStore.getState().playheadTime).toBe(0);
  });

  it('should go to end on skip forward', async () => {
    const user = userEvent.setup();
    render(<TransportControls />);
    await user.click(screen.getByTitle('Go to end'));
    expect(useTimelineStore.getState().playheadTime).toBe(60);
  });
});
