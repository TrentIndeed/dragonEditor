import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModeSelectScreen from '@/components/mode-select/ModeSelectScreen';
import ModeCard from '@/components/mode-select/ModeCard';
import StylePicker from '@/components/mode-select/StylePicker';
import { useProjectStore } from '@/stores/projectStore';
import { resetAllStores } from '../helpers';

describe('ModeSelectScreen', () => {
  beforeEach(() => resetAllStores());

  it('should render the title and subtitle', () => {
    render(<ModeSelectScreen />);
    expect(screen.getByText('Dragon Editor')).toBeInTheDocument();
    expect(screen.getByText('AI-powered video editing pipeline')).toBeInTheDocument();
  });

  it('should render all three mode cards', () => {
    render(<ModeSelectScreen />);
    expect(screen.getByText('Shorts Editor')).toBeInTheDocument();
    expect(screen.getByText('Shorts Extractor')).toBeInTheDocument();
    expect(screen.getByText('Long-Form Editor')).toBeInTheDocument();
  });

  it('should render all five content style options', () => {
    render(<ModeSelectScreen />);
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getByText('Podcast')).toBeInTheDocument();
    expect(screen.getByText('High Retention')).toBeInTheDocument();
    expect(screen.getByText('Clickbait')).toBeInTheDocument();
  });

  it('should render project name input and disabled create button', () => {
    render(<ModeSelectScreen />);
    expect(screen.getByPlaceholderText('My awesome video...')).toBeInTheDocument();
    const btn = screen.getByText('Create Project');
    expect(btn).toBeDisabled();
  });

  it('should enable create button when name is typed', async () => {
    const user = userEvent.setup();
    render(<ModeSelectScreen />);
    const input = screen.getByPlaceholderText('My awesome video...');
    await user.type(input, 'My Test Video');
    expect(screen.getByText('Create Project')).not.toBeDisabled();
  });

  it('should create project and open editor on submit', async () => {
    const user = userEvent.setup();
    render(<ModeSelectScreen />);
    const input = screen.getByPlaceholderText('My awesome video...');
    await user.type(input, 'My Test Video');
    await user.click(screen.getByText('Create Project'));

    const state = useProjectStore.getState();
    expect(state.isEditorOpen).toBe(true);
    expect(state.config?.name).toBe('My Test Video');
    expect(state.config?.mode).toBe('shorts-editor');
    expect(state.config?.style).toBe('entertainment');
  });

  it('should create project on Enter key', async () => {
    const user = userEvent.setup();
    render(<ModeSelectScreen />);
    const input = screen.getByPlaceholderText('My awesome video...');
    await user.type(input, 'Enter Test{Enter}');

    expect(useProjectStore.getState().isEditorOpen).toBe(true);
  });

  it('should not create project with empty name', async () => {
    const user = userEvent.setup();
    render(<ModeSelectScreen />);
    await user.click(screen.getByText('Create Project'));
    expect(useProjectStore.getState().isEditorOpen).toBe(false);
  });
});

describe('ModeCard', () => {
  it('should render mode label and description', () => {
    render(<ModeCard mode="shorts-editor" selected={false} onSelect={() => {}} />);
    expect(screen.getByText('Shorts Editor')).toBeInTheDocument();
    expect(screen.getByText('One clip → one short')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    let selected = '';
    render(<ModeCard mode="long-form" selected={false} onSelect={(m) => { selected = m; }} />);
    await user.click(screen.getByText('Long-Form Editor'));
    expect(selected).toBe('long-form');
  });
});

describe('StylePicker', () => {
  it('should render all styles and call onSelect', async () => {
    const user = userEvent.setup();
    let selected = '';
    render(<StylePicker selected="entertainment" onSelect={(s) => { selected = s; }} />);

    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    await user.click(screen.getByText('Podcast'));
    expect(selected).toBe('podcast');
  });
});
