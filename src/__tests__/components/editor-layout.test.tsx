import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopBar from '@/components/layout/TopBar';
import { useProjectStore } from '@/stores/projectStore';
import { resetAllStores, setupEditorState } from '../helpers';

describe('TopBar', () => {
  beforeEach(() => resetAllStores());

  it('should return null when no project config', () => {
    const { container } = render(<TopBar />);
    expect(container.innerHTML).toBe('');
  });

  it('should render project info when editor is open', () => {
    setupEditorState();
    render(<TopBar />);
    expect(screen.getByText('Dragon')).toBeInTheDocument();
    expect(screen.getByText('Shorts Editor')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should render Export button', () => {
    setupEditorState();
    render(<TopBar />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should render 10 pipeline dots', () => {
    setupEditorState();
    const { container } = render(<TopBar />);
    const dots = container.querySelectorAll('[class*="rounded-full"][class*="w-"]');
    expect(dots.length).toBe(10);
  });

  it('should open export modal when Export clicked', async () => {
    const user = userEvent.setup();
    setupEditorState();
    render(<TopBar />);
    await user.click(screen.getByText('Export'));
    expect(screen.getByText('Export Video')).toBeInTheDocument();
  });

  it('should reset project when back arrow clicked', async () => {
    const user = userEvent.setup();
    setupEditorState();
    render(<TopBar />);
    const backBtn = screen.getByTitle('Back to projects');
    await user.click(backBtn);
    expect(useProjectStore.getState().isEditorOpen).toBe(false);
  });
});

describe('Home page routing', () => {
  it('should show mode select when no project', async () => {
    resetAllStores();
    // Import dynamically to avoid SSR issues
    const { default: Home } = await import('@/app/page');
    render(<Home />);
    expect(screen.getByText('Dragon Editor')).toBeInTheDocument();
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('should show editor layout when project is open', async () => {
    setupEditorState();
    const { default: Home } = await import('@/app/page');
    render(<Home />);
    expect(screen.getByText('Dragon')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });
});
