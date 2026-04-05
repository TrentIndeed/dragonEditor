import { IVideo } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import { getZoomAtTime } from "@/dragon/zoom-engine";
import { useRef, useEffect, useCallback } from "react";

// Global zoom keyframes — set by the AI pipeline zoom stage
let _zoomKeyframes: any[] = [];
export function setZoomKeyframes(keyframes: any[]) { _zoomKeyframes = keyframes; }
export function getZoomKeyframes() { return _zoomKeyframes; }

// Cut map — set by trim stage. Maps packed timeline to source time.
export type CutSegment = { packedStart: number; sourceStart: number; duration: number };
let _cutSegments: CutSegment[] = [];
export function setCutSegments(segments: CutSegment[]) { _cutSegments = segments; }
export function getCutSegments() { return _cutSegments; }

function packedToSourceTime(packedTimeSec: number): number {
  if (_cutSegments.length === 0) return packedTimeSec;
  for (const seg of _cutSegments) {
    if (packedTimeSec >= seg.packedStart && packedTimeSec < seg.packedStart + seg.duration) {
      return seg.sourceStart + (packedTimeSec - seg.packedStart);
    }
  }
  const last = _cutSegments[_cutSegments.length - 1];
  return last.sourceStart + last.duration;
}

/**
 * A <video> element that plays with cut-aware seeking.
 * Uses a native video element and sets currentTime based on the cut map.
 */
function CutAwareVideo({ src, volume, fps }: { src: string; volume: number; fps: number }) {
  const frame = useCurrentFrame();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSegIdx = useRef(-1);
  const wasPlaying = useRef(false);

  const packedTime = frame / fps;
  const sourceTime = packedToSourceTime(packedTime);

  // Find which segment we're in
  let segIdx = 0;
  for (let i = 0; i < _cutSegments.length; i++) {
    if (packedTime >= _cutSegments[i].packedStart) segIdx = i;
  }

  // Poll Remotion player state to sync play/pause
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const sync = () => {
      // Check if Remotion player is playing by looking at the playerRef
      const useStore = (window as any).__dragonEditorStore;
      const playerRef = useStore?.getState?.()?.playerRef;
      const remotionPlaying = playerRef?.current?.isPlaying?.() ?? false;

      if (remotionPlaying && vid.paused) {
        vid.play().catch(() => {});
        wasPlaying.current = true;
      } else if (!remotionPlaying && !vid.paused) {
        vid.pause();
        wasPlaying.current = false;
      }

      // When paused, snap to correct source time
      if (!remotionPlaying && Math.abs(vid.currentTime - sourceTime) > 0.05) {
        vid.currentTime = sourceTime;
      }
    };

    const interval = setInterval(sync, 50);
    return () => clearInterval(interval);
  }, [sourceTime]);

  // Seek on segment boundary change
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (segIdx !== lastSegIdx.current) {
      vid.currentTime = sourceTime;
      lastSegIdx.current = segIdx;
    }
  }, [segIdx, sourceTime]);

  // Set initial position
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = sourceTime;
    vid.pause();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      muted={volume === 0}
      playsInline
    />
  );
}

export const Video = ({
  item,
  options
}: {
  item: IVideo;
  options: SequenceItemOptions;
}) => {
  const { fps, frame } = options;
  const { details, animations } = item;
  const playbackRate = item.playbackRate || 1;
  const { animationIn, animationOut, animationTimed } = getAnimations(
    animations!,
    item,
    frame,
    fps
  );
  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width,
    height: details.height
  };
  const { durationInFrames } = calculateFrames(item.display, fps);
  const currentFrame = (frame || 0) - (item.display.from * fps) / 1000;

  // Apply Dragon zoom engine if keyframes exist
  const currentTimeMs = (frame || 0) / fps * 1000;
  const zoomState = _zoomKeyframes.length > 0
    ? getZoomAtTime(_zoomKeyframes, currentTimeMs / 1000)
    : { scale: 1, progress: 0, activeKeyframeId: null };
  const zoomScale = zoomState.scale;

  const children = (
    <BoxAnim
      style={calculateContainerStyles(details, crop, {
        overflow: "hidden"
      })}
      animationIn={animationIn}
      animationOut={animationOut}
      frame={currentFrame}
      durationInFrames={durationInFrames}
    >
      <ContentAnim
        animationTimed={animationTimed}
        durationInFrames={durationInFrames}
        frame={currentFrame}
      >
        <MaskAnim
          item={item}
          keyframeAnimations={animationTimed}
          frame={frame || 0}
        >
          <div style={{
            ...calculateMediaStyles(details, crop),
            transform: zoomScale > 1.01 ? `scale(${zoomScale})` : undefined,
            transformOrigin: "center center",
          }}>
            {_cutSegments.length > 0 ? (
              <CutAwareVideo
                src={details.src}
                volume={typeof details.volume === "number" ? details.volume / 100 : 1}
                fps={fps}
              />
            ) : (
              <OffthreadVideo
                startFrom={(item.trim?.from! / 1000) * fps}
                endAt={(item.trim?.to! / 1000) * fps || 1 / fps}
                playbackRate={playbackRate}
                src={details.src}
                volume={typeof details.volume === "number" ? details.volume / 100 : 1}
              />
            )}
          </div>
        </MaskAnim>
      </ContentAnim>
    </BoxAnim>
  );

  return BaseSequence({ item, options, children });
};

export default Video;
