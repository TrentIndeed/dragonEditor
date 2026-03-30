'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import TransportControls from './TransportControls';
import { useProjectStore } from '@/stores/projectStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useCaptionStore } from '@/stores/captionStore';
import { useZoomStore } from '@/stores/zoomStore';
import { getZoomAtTime } from '@/lib/zoom-engine';
import { CAPTION_STYLES } from '@/lib/captions';
import { CaptionBlock, CaptionStyle } from '@/lib/types';
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

  // Dynamic zoom from keyframe interpolation engine
  const zoomState = useMemo(() => {
    return getZoomAtTime(zoomKeyframes, displayTime);
  }, [zoomKeyframes, displayTime]);

  const activeZoom = zoomState.scale;

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
            {/* Video with dynamic zoom transform — no CSS transition, engine handles smoothing */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain rounded-lg"
              style={{
                transform: `scale(${activeZoom.toFixed(4)})`,
                transformOrigin: 'center center',
              }}
              playsInline
            />

            {/* B-Roll indicator overlay */}
            {activeBRoll && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-accent-purple/80 rounded text-[10px] font-mono text-white font-medium">
                B-ROLL: {activeBRoll.name}
              </div>
            )}

            {/* TikTok-style caption overlay */}
            {activeCaption && <CaptionOverlay caption={activeCaption} time={displayTime} isVertical={isVertical} />}

            {/* Zoom indicator with progress bar */}
            {activeZoom > 1.01 && (
              <div className="absolute top-2 right-2 flex items-center gap-2 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                <span className="text-[11px] font-mono text-accent-blue font-bold">{activeZoom.toFixed(2)}x</span>
                <div className="w-[40px] h-[3px] bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-blue rounded-full" style={{ width: `${zoomState.progress * 100}%` }} />
                </div>
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

// ── TikTok Caption Renderer ──

function CaptionOverlay({ caption, time, isVertical }: { caption: CaptionBlock; time: number; isVertical: boolean }) {
  const style = CAPTION_STYLES[caption.styleId] || CAPTION_STYLES['karaoke'];

  // Scale font size for preview (preview is smaller than 1080px)
  const scaleFactor = isVertical ? 0.5 : 0.65;
  const fontSize = Math.round(style.fontSizePx * scaleFactor);

  // Position mapping
  const positionClass =
    style.position === 'center' ? 'top-[40%]' :
    style.position === 'lower-third' ? 'bottom-[18%]' :
    'bottom-[8%]';

  // Background
  const hasBg = style.bgStyle !== 'none';
  const bgStyles: React.CSSProperties = hasBg ? {
    background: style.bgColor,
    borderRadius: style.bgStyle === 'frost' ? '12px' : '8px',
    padding: `${fontSize * 0.25}px ${fontSize * 0.5}px`,
    backdropFilter: style.bgStyle === 'frost' ? 'blur(8px)' : undefined,
  } : {};

  return (
    <div className={`absolute ${positionClass} left-0 right-0 flex justify-center pointer-events-none`}>
      <div className="max-w-[90%] text-center leading-[1.3]" style={bgStyles}>
        {/* Speaker label */}
        {style.speakerLabel && caption.speaker && (
          <div style={{
            fontSize: fontSize * 0.55,
            fontWeight: 600,
            color: style.activeColor,
            marginBottom: fontSize * 0.15,
            letterSpacing: '0.05em',
          }}>
            {caption.speaker}
          </div>
        )}

        {/* Words */}
        {caption.words.map((word, i) => {
          const isActive = time >= word.startTime && time < word.endTime;
          const isPast = time >= word.endTime;
          const isFuture = time < word.startTime;

          // Determine word color
          let color: string;
          if (isActive) color = word.emphasis ? style.activeColor : style.activeColor;
          else if (isPast) color = style.pastColor;
          else color = style.futureColor;

          // Emphasis words get the active color even when past
          if (isPast && word.emphasis) color = style.activeColor;

          // Animation transforms
          let transform = 'scale(1)';
          let opacity = 1;

          if (style.animation === 'pop' && isActive) {
            transform = `scale(${style.activeScale})`;
          } else if (style.animation === 'sweep' && isActive) {
            transform = `scale(${style.activeScale})`;
          } else if (style.animation === 'bounce' && isActive) {
            transform = `scale(${style.activeScale}) translateY(-2px)`;
          } else if (style.animation === 'fade' && isFuture) {
            opacity = 0.5;
          }

          // For bounce style, words that haven't appeared yet are invisible
          if (style.animation === 'bounce' && isFuture) {
            opacity = 0;
            transform = 'scale(0.7) translateY(8px)';
          }

          const displayText = style.allCaps ? word.text.toUpperCase() : word.text;

          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: fontSize * 0.15,
                fontSize,
                fontWeight: style.fontWeight,
                fontFamily: "'Inter', system-ui, sans-serif",
                color,
                opacity,
                transform,
                WebkitTextStroke: style.strokePx > 0 ? `${style.strokePx * scaleFactor}px black` : undefined,
                textShadow: style.shadowStyle,
                transition: `transform 0.08s ease-out, color 0.06s, opacity 0.1s`,
                letterSpacing: '-0.02em',
              }}
            >
              {displayText}
            </span>
          );
        })}
      </div>
    </div>
  );
}
