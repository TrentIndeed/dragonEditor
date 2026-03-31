'use client';

import { useMemo, useState, useCallback } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useHistoryStore } from '@/stores/historyStore';
import { TrackType, MediaItem, TimelineClip } from '@/lib/types';
import { TRACK_COLORS } from '@/lib/constants';
import { generateId, cn } from '@/lib/utils';
import Clip from './Clip';

/** Map media type to compatible track types */
const MEDIA_TO_TRACKS: Record<string, TrackType[]> = {
  video: ['video', 'broll'],
  audio: ['mic', 'sfx', 'music'],
  image: ['broll'],
  sfx: ['sfx'],
  'ai-generated': ['broll'],
};

interface TrackProps {
  type: TrackType;
  height: number;
}

export default function Track({ type, height }: TrackProps) {
  const allClips = useTimelineStore((s) => s.clips);
  const pixelsPerSecond = useTimelineStore((s) => s.pixelsPerSecond);
  const addClip = useTimelineStore((s) => s.addClip);
  const addLinkedClips = useTimelineStore((s) => s.addLinkedClips);
  const duration = useTimelineStore((s) => s.duration);
  const clips = useMemo(() => allClips.filter((c) => c.trackType === type), [allClips, type]);
  const activeTool = useTimelineStore((s) => s.activeTool);
  const splitClipAtPlayhead = useTimelineStore((s) => s.splitClipAtPlayhead);
  const setPlayheadTime = useTimelineStore((s) => s.setPlayheadTime);
  const [dropHover, setDropHover] = useState(false);

  const canAcceptDrop = useCallback((mediaType: string): boolean => {
    const compatibleTracks = MEDIA_TO_TRACKS[mediaType];
    return compatibleTracks ? compatibleTracks.includes(type) : false;
  }, [type]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Check if this is a media item drag (not a file drop)
    if (e.dataTransfer.types.includes('application/dragon-media')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDropHover(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropHover(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropHover(false);

    const data = e.dataTransfer.getData('application/dragon-media');
    if (!data) return;

    let mediaItem: MediaItem;
    try {
      mediaItem = JSON.parse(data);
    } catch {
      return;
    }

    if (!canAcceptDrop(mediaItem.type)) return;

    const clipDuration = mediaItem.duration || 5;

    // If this is the first clip on the video track, snap to 0:00
    const existingClips = allClips.filter((c) => c.trackType === type);
    let startTime: number;
    if (existingClips.length === 0 && type === 'video') {
      startTime = 0;
    } else if (existingClips.length === 0) {
      startTime = 0;
    } else {
      // Calculate drop position based on mouse x
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      startTime = Math.max(0, x / pixelsPerSecond);

      // Snap to end of last clip if close
      const lastClipEnd = Math.max(...existingClips.map((c) => c.startTime + c.duration));
      if (Math.abs(startTime - lastClipEnd) < 1) {
        startTime = lastClipEnd;
      }
    }

    // Push undo snapshot before adding clips
    useHistoryStore.getState().pushSnapshot();

    // If dropping a video, create linked video + audio clips
    if (mediaItem.type === 'video' && type === 'video') {
      const videoId = generateId();
      const audioId = generateId();
      addLinkedClips(
        {
          id: videoId,
          trackType: 'video',
          name: mediaItem.name,
          startTime,
          duration: clipDuration,
          sourceOffset: 0,
          color: TRACK_COLORS['video'] || '#3B82F6',
          linkedClipId: audioId,
        },
        {
          id: audioId,
          trackType: 'mic',
          name: mediaItem.name.replace(/\.\w+$/, ' (audio)$&'),
          startTime,
          duration: clipDuration,
          sourceOffset: 0,
          color: TRACK_COLORS['mic'] || '#22C55E',
          linkedClipId: videoId,
        }
      );
    } else {
      addClip({
        id: generateId(),
        trackType: type,
        name: mediaItem.name,
        startTime,
        duration: clipDuration,
        sourceOffset: 0,
        color: TRACK_COLORS[type] || '#888',
      });
    }

    // Extend timeline duration if needed
    const newEnd = startTime + clipDuration;
    if (newEnd > duration) {
      useTimelineStore.setState({ duration: newEnd + 10 });
    }
  }, [type, pixelsPerSecond, addClip, duration, canAcceptDrop]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    // Hand tool doesn't interact with clips/tracks
    if (activeTool === 'hand') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = x / pixelsPerSecond;

    if (activeTool === 'razor') {
      const clipAtTime = clips.find(
        (c) => clickTime >= c.startTime && clickTime < c.startTime + c.duration
      );
      if (clipAtTime) {
        useHistoryStore.getState().pushSnapshot();
        setPlayheadTime(clickTime);
        splitClipAtPlayhead(clipAtTime.id);
      }
    } else {
      // Click on empty area — move playhead
      setPlayheadTime(Math.max(0, Math.min(clickTime, duration)));
    }
  }, [activeTool, clips, pixelsPerSecond, duration, setPlayheadTime, splitClipAtPlayhead]);

  return (
    <div
      className={cn(
        'relative border-b border-border-default/50 transition-colors duration-150',
        dropHover && 'bg-accent-primary/8',
        activeTool === 'razor' && 'cursor-crosshair'
      )}
      style={{ height }}
      onClick={handleTrackClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop indicator line */}
      {dropHover && (
        <div className="absolute inset-0 border-2 border-dashed border-accent-primary/30 rounded pointer-events-none z-10" />
      )}

      {clips.map((clip) => (
        <Clip
          key={clip.id}
          clip={clip}
          pixelsPerSecond={pixelsPerSecond}
          trackHeight={height}
        />
      ))}
    </div>
  );
}
