'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import TransportControls from './TransportControls';
import { useProjectStore } from '@/stores/projectStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useCaptionStore } from '@/stores/captionStore';
import { useZoomStore } from '@/stores/zoomStore';
import { MonitorPlay } from 'lucide-react';

export default function VideoPreview() {
  const config = useProjectStore((s) => s.config);
  const playheadTime = useTimelineStore((s) => s.playheadTime);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const clips = useTimelineStore((s) => s.clips);
  const mediaItems = useMediaStore((s) => s.items);
  const captionBlocks = useCaptionStore((s) => s.blocks);
  const zoomKeyframes = useZoomStore((s) => s.keyframes);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevClipIdRef = useRef<string | null>(null);
  const wasPlayingRef = useRef(false);

  // Throttled display time for overlays (poll at 10fps)
  const [displayTime, setDisplayTime] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setDisplayTime(useTimelineStore.getState().playheadTime), 100);
    return () => clearInterval(timer);
  }, []);

  // Find the video clip under the playhead
  const activeClip = useMemo(() => {
    return clips.find(
      (c) => c.trackType === 'video' && playheadTime >= c.startTime && playheadTime < c.startTime + c.duration
    );
  }, [clips, playheadTime]);

  const activeMedia = useMemo(() => {
    if (!activeClip) return null;
    return mediaItems.find((m) => m.name === activeClip.name) || null;
  }, [activeClip, mediaItems]);

  const aspectRatio = useMemo(() => {
    const videoMedia = mediaItems.find((m) => m.type === 'video' && m.width && m.height);
    if (videoMedia && videoMedia.width && videoMedia.height) {
      return { w: videoMedia.width, h: videoMedia.height };
    }
    if (config?.mode === 'long-form') return { w: 16, h: 9 };
    return { w: 9, h: 16 };
  }, [mediaItems, config]);

  const isVertical = aspectRatio.h > aspectRatio.w;
  const hasVideo = activeMedia && activeMedia.url && activeMedia.url.length > 0;
  const hasClipNoMedia = activeClip && (!activeMedia || !activeMedia.url || activeMedia.url.length === 0);

  // Active caption at current time
  const activeCaption = useMemo(() => {
    if (captionBlocks.length === 0) return null;
    return captionBlocks.find(
      (b) => displayTime >= b.startTime && displayTime < b.endTime
    ) || null;
  }, [captionBlocks, displayTime]);

  // Active B-roll clip at current time
  const activeBRoll = useMemo(() => {
    return clips.find(
      (c) => c.trackType === 'broll' && displayTime >= c.startTime && displayTime < c.startTime + c.duration
    ) || null;
  }, [clips, displayTime]);

  // Active zoom level at current time
  const activeZoom = useMemo(() => {
    if (zoomKeyframes.length === 0) return 1;
    // Find the most recent keyframe before current time
    const relevant = zoomKeyframes
      .filter((k) => displayTime >= k.time && displayTime < k.time + 2)
      .sort((a, b) => b.time - a.time);
    return relevant.length > 0 ? relevant[0].level : 1;
  }, [zoomKeyframes, displayTime]);

  // Load video source when clip changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeMedia?.url || !activeClip) return;
    const clipChanged = prevClipIdRef.current !== activeClip.id;
    prevClipIdRef.current = activeClip.id;
    if (clipChanged || !video.src || video.src !== activeMedia.url) {
      video.src = activeMedia.url;
      const targetTime = activeClip.sourceOffset + (playheadTime - activeClip.startTime);
      video.currentTime = Math.max(0, targetTime);
      if (isPlaying) video.play().catch(() => {});
    }
  }, [activeClip?.id, activeMedia?.url]);

  // Seek when NOT playing
  useEffect(() => {
    if (isPlaying) return;
    const video = videoRef.current;
    if (!video || !activeClip || !activeMedia?.url) return;
    const targetTime = activeClip.sourceOffset + (playheadTime - activeClip.startTime);
    if (Math.abs(video.currentTime - targetTime) > 0.05) {
      video.currentTime = Math.max(0, targetTime);
    }
  }, [playheadTime, isPlaying, activeClip, activeMedia]);

  // Play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying && hasVideo) {
      if (activeClip) {
        const targetTime = activeClip.sourceOffset + (playheadTime - activeClip.startTime);
        if (Math.abs(video.currentTime - targetTime) > 0.3) video.currentTime = targetTime;
      }
      video.play().catch(() => {});
      wasPlayingRef.current = true;
    } else {
      if (wasPlayingRef.current) { video.pause(); wasPlayingRef.current = false; }
    }
  }, [isPlaying]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center bg-bg-deep p-2 overflow-hidden">
        {hasVideo ? (
          <div className="relative max-w-full max-h-full" style={{ aspectRatio: `${aspectRatio.w}/${aspectRatio.h}` }}>
            {/* Video with zoom transform */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain rounded-lg transition-transform duration-300"
              style={{ transform: activeZoom > 1 ? `scale(${activeZoom})` : undefined }}
              playsInline
            />

            {/* B-Roll indicator overlay */}
            {activeBRoll && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-accent-purple/80 rounded text-[10px] font-mono text-white font-medium">
                B-ROLL: {activeBRoll.name}
              </div>
            )}

            {/* TikTok-style caption overlay */}
            {activeCaption && (
              <div className="absolute bottom-[15%] left-0 right-0 flex justify-center pointer-events-none">
                <div className="max-w-[85%] text-center leading-tight">
                  {activeCaption.words.map((word, i) => {
                    const wordProgress = (displayTime - word.startTime) / (word.endTime - word.startTime);
                    const isActive = displayTime >= word.startTime && displayTime < word.endTime;
                    const isPast = displayTime >= word.endTime;
                    return (
                      <span
                        key={i}
                        className="inline-block mx-[2px]"
                        style={{
                          fontSize: isVertical ? '24px' : '20px',
                          fontWeight: 900,
                          color: isActive ? '#FBBF24' : isPast ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                          textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
                          transform: isActive ? 'scale(1.15)' : 'scale(1)',
                          transition: 'transform 0.1s, color 0.1s',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Zoom indicator */}
            {activeZoom > 1 && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-accent-blue/80 rounded text-[10px] font-mono text-white font-medium">
                {activeZoom}x
              </div>
            )}
          </div>
        ) : (
          <div
            className="bg-[#060D1B] border border-border-default rounded-lg flex items-center justify-center"
            style={{
              aspectRatio: `${aspectRatio.w}/${aspectRatio.h}`,
              ...(isVertical ? { height: '100%', maxHeight: 'calc(100% - 8px)' } : { width: '100%', maxWidth: 'calc(100% - 8px)' }),
            }}
          >
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-bg-surface border border-border-default flex items-center justify-center mx-auto">
                <MonitorPlay size={20} strokeWidth={1.5} className="text-text-faint" />
              </div>
              <div className="space-y-1">
                {hasClipNoMedia ? (
                  <>
                    <p className="text-[14px] text-accent-orange font-medium">Media files need re-import</p>
                    <p className="text-[12px] text-text-muted">Re-add your video files to the Media Bin</p>
                    <p className="text-[11px] text-text-faint">Timeline layout is preserved</p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] text-text-muted font-medium">No footage loaded</p>
                    <p className="text-[12px] text-text-faint">Drop a video into the Media Bin</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <TransportControls />
    </div>
  );
}
