import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranscriptEditor from '@/components/preview/TranscriptEditor';
import { useTranscriptStore } from '@/stores/transcriptStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { resetAllStores } from '../helpers';

describe('TranscriptEditor', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('should show placeholder when no transcript loaded', () => {
    render(<TranscriptEditor />);
    expect(screen.getByText('Transcription appears after Stage 1')).toBeInTheDocument();
  });

  describe('with transcript loaded', () => {
    beforeEach(() => {
      useTranscriptStore.getState().loadMockData();
      useTimelineStore.getState().loadMockData();
    });

    it('should render transcript lines', () => {
      render(<TranscriptEditor />);
      expect(screen.getByText(/Hey everyone, welcome back/)).toBeInTheDocument();
      expect(screen.getByText(/Thanks for watching/)).toBeInTheDocument();
    });

    it('should render speaker labels', () => {
      render(<TranscriptEditor />);
      const speakers = screen.getAllByText('Speaker 1');
      expect(speakers.length).toBeGreaterThan(0);
    });

    it('should render timecodes', () => {
      render(<TranscriptEditor />);
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should render Remove fillers button', () => {
      render(<TranscriptEditor />);
      expect(screen.getByText('Remove fillers')).toBeInTheDocument();
    });

    it('should render Restore all button', () => {
      render(<TranscriptEditor />);
      expect(screen.getByText('Restore all')).toBeInTheDocument();
    });

    it('should delete a line when trash is clicked', async () => {
      const user = userEvent.setup();
      render(<TranscriptEditor />);
      // Find all delete buttons (they have title "Remove this segment")
      const deleteButtons = screen.getAllByTitle('Remove this segment');
      expect(deleteButtons.length).toBeGreaterThan(0);
      await user.click(deleteButtons[0]);

      // First line should now be marked deleted
      const line = useTranscriptStore.getState().lines[0];
      expect(line.deleted).toBe(true);
    });

    it('should show Restore button for deleted lines', async () => {
      const user = userEvent.setup();
      useTranscriptStore.getState().deleteLine('tl-1');
      render(<TranscriptEditor />);
      const restoreButtons = screen.getAllByText('Restore');
      expect(restoreButtons.length).toBeGreaterThan(0);
    });

    it('should restore a deleted line', async () => {
      const user = userEvent.setup();
      useTranscriptStore.getState().deleteLine('tl-1');
      render(<TranscriptEditor />);
      const restoreBtn = screen.getAllByText('Restore')[0];
      await user.click(restoreBtn);
      expect(useTranscriptStore.getState().lines[0].deleted).toBe(false);
    });

    it('should remove all filler words when button clicked', async () => {
      const user = userEvent.setup();
      render(<TranscriptEditor />);
      await user.click(screen.getByText('Remove fillers'));
      const deleted = useTranscriptStore.getState().lines.filter((l) => l.deleted);
      expect(deleted.length).toBeGreaterThan(0);
    });

    it('should restore all lines when Restore all clicked', async () => {
      const user = userEvent.setup();
      useTranscriptStore.getState().removeAllFillerWords();
      render(<TranscriptEditor />);
      await user.click(screen.getByText('Restore all'));
      const allActive = useTranscriptStore.getState().lines.every((l) => !l.deleted);
      expect(allActive).toBe(true);
    });

    it('should seek playhead when a line is clicked', async () => {
      const user = userEvent.setup();
      render(<TranscriptEditor />);
      // Click the timecode of the third line (which won't have inner click handlers conflicting)
      // The third line starts at 4.8s
      const timecodes = screen.getAllByText('0:04');
      await user.click(timecodes[0]);
      // Should seek to that line's start time
      expect(useTimelineStore.getState().playheadTime).toBe(4.8);
    });
  });
});
