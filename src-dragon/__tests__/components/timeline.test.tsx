import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timeline from '@/components/timeline/Timeline';
import TimelineToolbar from '@/components/timeline/TimelineToolbar';
import Track from '@/components/timeline/Track';
import Clip from '@/components/timeline/Clip';
import Playhead from '@/components/timeline/Playhead';
import { useTimelineStore } from '@/stores/timelineStore';
import { resetAllStores, setupEditorState } from '../helpers';
import userEvent from '@testing-library/user-event';

describe('Timeline', () => {
  beforeEach(() => setupEditorState());

  it('should render without crashing', () => {
    const { container } = render(<Timeline />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render all 6 track labels', () => {
    render(<Timeline />);
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Mic Audio')).toBeInTheDocument();
    expect(screen.getByText('B-Roll')).toBeInTheDocument();
    expect(screen.getByText('Captions')).toBeInTheDocument();
    expect(screen.getByText('SFX')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
  });

  it('should render clips on the timeline', () => {
    render(<Timeline />);
    expect(screen.getByText('raw_footage.mp4')).toBeInTheDocument();
    expect(screen.getByText('mic_audio.wav')).toBeInTheDocument();
  });
});

describe('TimelineToolbar', () => {
  beforeEach(() => resetAllStores());

  it('should render tool buttons', () => {
    render(<TimelineToolbar />);
    expect(screen.getByTitle('Select (V)')).toBeInTheDocument();
    expect(screen.getByTitle('Razor (B)')).toBeInTheDocument();
    expect(screen.getByTitle('Hand (H)')).toBeInTheDocument();
  });

  it('should render snap toggle', () => {
    render(<TimelineToolbar />);
    expect(screen.getByTitle('Toggle snap')).toBeInTheDocument();
  });

  it('should render zoom and fit buttons', () => {
    const { container } = render(<TimelineToolbar />);
    // Zoom buttons exist (they may not have title on all of them)
    expect(screen.getByTitle('Fit to view')).toBeInTheDocument();
    // At least 6 buttons total: 3 tools + snap + zoom out + zoom in + fit
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  it('should switch active tool on click', async () => {
    const user = userEvent.setup();
    render(<TimelineToolbar />);
    await user.click(screen.getByTitle('Razor (B)'));
    expect(useTimelineStore.getState().activeTool).toBe('razor');
  });

  it('should toggle snap on click', async () => {
    const user = userEvent.setup();
    render(<TimelineToolbar />);
    const before = useTimelineStore.getState().snapEnabled;
    await user.click(screen.getByTitle('Toggle snap'));
    expect(useTimelineStore.getState().snapEnabled).toBe(!before);
  });
});

describe('Track', () => {
  beforeEach(() => setupEditorState());

  it('should render video track with clips', () => {
    render(<Track type="video" height={60} />);
    expect(screen.getByText('raw_footage.mp4')).toBeInTheDocument();
  });

  it('should render mic track with clips', () => {
    render(<Track type="mic" height={50} />);
    expect(screen.getByText('mic_audio.wav')).toBeInTheDocument();
  });

  it('should render empty track for broll', () => {
    const { container } = render(<Track type="broll" height={35} />);
    // No clips on broll track by default
    expect(container.querySelector('[class*="absolute"]')).toBeNull();
  });
});

describe('Clip', () => {
  beforeEach(() => setupEditorState());

  it('should render clip with name', () => {
    const clip = useTimelineStore.getState().clips[0];
    render(<Clip clip={clip} pixelsPerSecond={20} trackHeight={60} />);
    expect(screen.getByText('raw_footage.mp4')).toBeInTheDocument();
  });

  it('should select clip on click', async () => {
    const user = userEvent.setup();
    const clip = useTimelineStore.getState().clips[0];
    render(<Clip clip={clip} pixelsPerSecond={20} trackHeight={60} />);
    await user.click(screen.getByText('raw_footage.mp4'));
    expect(useTimelineStore.getState().selectedClipIds).toContain(clip.id);
  });

  it('should position clip based on startTime and pixelsPerSecond', () => {
    const clip = { ...useTimelineStore.getState().clips[0], startTime: 5 };
    const { container } = render(<Clip clip={clip} pixelsPerSecond={20} trackHeight={60} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.left).toBe('100px'); // 5s * 20px/s
  });

  it('should set width based on duration and pixelsPerSecond', () => {
    const clip = { ...useTimelineStore.getState().clips[0], duration: 10 };
    const { container } = render(<Clip clip={clip} pixelsPerSecond={20} trackHeight={60} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('200px'); // 10s * 20px/s
  });
});

describe('Playhead', () => {
  it('should position based on playhead time', () => {
    useTimelineStore.setState({ playheadTime: 10, pixelsPerSecond: 20 });
    const { container } = render(<Playhead totalHeight={250} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.left).toBe('200px'); // 10s * 20px/s
  });
});
