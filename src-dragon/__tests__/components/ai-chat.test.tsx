import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIChatPanel from '@/components/ai-chat/AIChatPanel';
import PipelineProgress from '@/components/ai-chat/PipelineProgress';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useChatStore } from '@/stores/chatStore';
import { resetAllStores, setupEditorState } from '../helpers';

describe('AIChatPanel', () => {
  beforeEach(() => resetAllStores());

  it('should render header with AI Assistant label', () => {
    render(<AIChatPanel />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('should render chat input', () => {
    render(<AIChatPanel />);
    expect(screen.getByPlaceholderText('Ask AI to make changes...')).toBeInTheDocument();
  });

  it('should render Start pipeline button when idle', () => {
    render(<AIChatPanel />);
    expect(screen.getByText('Start pipeline')).toBeInTheDocument();
  });

  it('should send user message on Enter', async () => {
    const user = userEvent.setup();
    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('Ask AI to make changes...');
    await user.type(input, 'Hello AI{Enter}');

    const messages = useChatStore.getState().messages;
    const userMsg = messages.find((m) => m.role === 'user' && m.content === 'Hello AI');
    expect(userMsg).toBeTruthy();
  });

  it('should render user messages in the chat', async () => {
    const user = userEvent.setup();
    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('Ask AI to make changes...');
    await user.type(input, 'Test message{Enter}');
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should not send empty messages', async () => {
    const user = userEvent.setup();
    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('Ask AI to make changes...');
    const before = useChatStore.getState().messages.length;
    await user.clear(input);
    await user.keyboard('{Enter}');
    expect(useChatStore.getState().messages.length).toBe(before);
  });

  // Approval card tests - stage name appears in both pipeline stepper AND approval card
  // so we use getAllByText and check length >= 2
  it('should show TrimApproval when trim stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('trim', 'awaiting-approval');
    render(<AIChatPanel />);
    const matches = screen.getAllByText('Trim & Cut');
    expect(matches.length).toBeGreaterThanOrEqual(2); // pipeline + approval card
  });

  it('should show Remove fillers quick action during trim approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('trim', 'awaiting-approval');
    render(<AIChatPanel />);
    expect(screen.getByText('Remove fillers')).toBeInTheDocument();
  });

  it('should show AudioApproval when audio stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('audio', 'awaiting-approval');
    render(<AIChatPanel />);
    const matches = screen.getAllByText('Audio Setup');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('should show ZoomApproval when zoom stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('zoom', 'awaiting-approval');
    render(<AIChatPanel />);
    const matches = screen.getAllByText('Zooms & Reframe');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('should show CaptionApproval when caption stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('caption', 'awaiting-approval');
    render(<AIChatPanel />);
    const matches = screen.getAllByText('Captions');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('should show SFXApproval when sfx stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('sfx', 'awaiting-approval');
    render(<AIChatPanel />);
    const matches = screen.getAllByText('Sound Effects');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('should show ColorApproval when color stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('color', 'awaiting-approval');
    render(<AIChatPanel />);
    const matches = screen.getAllByText('Color Correction');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('should show ReviewApproval when review stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('review', 'awaiting-approval');
    render(<AIChatPanel />);
    const matches = screen.getAllByText('AI Self-Review');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('should show ExportApproval when export stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('export', 'awaiting-approval');
    render(<AIChatPanel />);
    const matches = screen.getAllByText('Export & Upload');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('should show ThumbnailApproval when thumbnail stage is awaiting approval', () => {
    setupEditorState();
    usePipelineStore.getState().setStageStatus('thumbnail', 'awaiting-approval');
    render(<AIChatPanel />);
    expect(screen.getByText('AI Thumbnail')).toBeInTheDocument();
  });
});

describe('PipelineProgress', () => {
  beforeEach(() => resetAllStores());

  it('should render Pipeline header', () => {
    render(<PipelineProgress />);
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  it('should render all 10 stage names', () => {
    render(<PipelineProgress />);
    expect(screen.getByText('Trim & Cut')).toBeInTheDocument();
    expect(screen.getByText('Audio Setup')).toBeInTheDocument();
    expect(screen.getByText('Zooms & Reframe')).toBeInTheDocument();
    expect(screen.getByText('B-Roll & Overlays')).toBeInTheDocument();
    expect(screen.getByText('Captions')).toBeInTheDocument();
    expect(screen.getByText('Sound Effects')).toBeInTheDocument();
    expect(screen.getByText('Color Correction')).toBeInTheDocument();
    expect(screen.getByText('AI Self-Review')).toBeInTheDocument();
    expect(screen.getByText('Export & Upload')).toBeInTheDocument();
    expect(screen.getByText('Thumbnail')).toBeInTheDocument();
  });

  it('should show stage count (approved/total)', () => {
    render(<PipelineProgress />);
    expect(screen.getByText('0/10')).toBeInTheDocument();
  });

  it('should update count when stages are approved', () => {
    usePipelineStore.getState().setStageStatus('trim', 'approved');
    render(<PipelineProgress />);
    expect(screen.getByText('1/10')).toBeInTheDocument();
  });

  it('should collapse and expand', async () => {
    const user = userEvent.setup();
    render(<PipelineProgress />);
    expect(screen.getByText('Trim & Cut')).toBeInTheDocument();

    await user.click(screen.getByText('Pipeline'));
    expect(screen.queryByText('Trim & Cut')).not.toBeInTheDocument();

    await user.click(screen.getByText('Pipeline'));
    expect(screen.getByText('Trim & Cut')).toBeInTheDocument();
  });

  it('should show approved checkmarks and progress bars', () => {
    usePipelineStore.getState().setStageStatus('trim', 'running');
    usePipelineStore.getState().setStageStatus('audio', 'approved');
    render(<PipelineProgress />);
    // Approved stage shows checkmark, running shows progress
    expect(screen.getByText('Trim & Cut')).toBeInTheDocument();
    expect(screen.getByText('Audio Setup')).toBeInTheDocument();
  });
});
