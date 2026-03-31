import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaBin from '@/components/media-bin/MediaBin';
import ExportModal from '@/components/shared/ExportModal';
import { useMediaStore } from '@/stores/mediaStore';
import { resetAllStores, setupEditorState } from '../helpers';

describe('MediaBin', () => {
  beforeEach(() => resetAllStores());

  it('should render header', () => {
    render(<MediaBin />);
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('should render empty drop zone when no items', () => {
    render(<MediaBin />);
    expect(screen.getByText('No files yet')).toBeInTheDocument();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  it('should render media items when loaded', () => {
    useMediaStore.getState().loadMockData();
    render(<MediaBin />);
    expect(screen.getByText('raw_footage.mp4')).toBeInTheDocument();
  });

  it('should switch tabs', async () => {
    const user = userEvent.setup();
    render(<MediaBin />);
    await user.click(screen.getByTitle('Audio'));
    expect(useMediaStore.getState().activeTab).toBe('audio');
  });
});

describe('ExportModal', () => {
  beforeEach(() => setupEditorState());

  it('should not render when closed', () => {
    const { container } = render(<ExportModal open={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render when open with video export tab', () => {
    render(<ExportModal open={true} onClose={() => {}} />);
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Export Video')).toBeInTheDocument();
    expect(screen.getByText('Project File')).toBeInTheDocument();
  });

  it('should show resolution options', () => {
    render(<ExportModal open={true} onClose={() => {}} />);
    expect(screen.getByText('720p')).toBeInTheDocument();
    expect(screen.getByText('1080p')).toBeInTheDocument();
    expect(screen.getByText('4k')).toBeInTheDocument();
  });

  it('should show FPS options', () => {
    render(<ExportModal open={true} onClose={() => {}} />);
    expect(screen.getByText('24fps')).toBeInTheDocument();
    expect(screen.getByText('30fps')).toBeInTheDocument();
    expect(screen.getByText('60fps')).toBeInTheDocument();
  });

  it('should show MP4 format info', () => {
    render(<ExportModal open={true} onClose={() => {}} />);
    expect(screen.getByText('MP4 (H.264)')).toBeInTheDocument();
  });

  it('should show clip count', () => {
    render(<ExportModal open={true} onClose={() => {}} />);
    const matches = screen.getAllByText(/2 clips/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should call onClose when Cancel clicked', async () => {
    const user = userEvent.setup();
    let closed = false;
    render(<ExportModal open={true} onClose={() => { closed = true; }} />);
    await user.click(screen.getByText('Cancel'));
    expect(closed).toBe(true);
  });

  it('should switch to Project File tab', async () => {
    const user = userEvent.setup();
    render(<ExportModal open={true} onClose={() => {}} />);
    await user.click(screen.getByText('Project File'));
    expect(screen.getByText('FCPXML')).toBeInTheDocument();
    expect(screen.getByText('SRT Subtitles')).toBeInTheDocument();
  });

  it('should show Export MP4 button', () => {
    render(<ExportModal open={true} onClose={() => {}} />);
    expect(screen.getByText('Export MP4')).toBeInTheDocument();
  });

  it('should start render on Export MP4 click', async () => {
    const user = userEvent.setup();
    render(<ExportModal open={true} onClose={() => {}} />);
    await user.click(screen.getByText('Export MP4'));
    expect(screen.getByText('Rendering...')).toBeInTheDocument();
  });
});
