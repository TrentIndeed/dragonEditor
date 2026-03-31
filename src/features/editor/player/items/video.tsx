import { IVideo } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { OffthreadVideo } from "remotion";
import { getZoomAtTime } from "@/dragon/zoom-engine";

// Global zoom keyframes — set by the AI pipeline zoom stage
let _zoomKeyframes: any[] = [];
export function setZoomKeyframes(keyframes: any[]) { _zoomKeyframes = keyframes; }
export function getZoomKeyframes() { return _zoomKeyframes; }

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
            <OffthreadVideo
              startFrom={(item.trim?.from! / 1000) * fps}
              endAt={(item.trim?.to! / 1000) * fps || 1 / fps}
              playbackRate={playbackRate}
              src={details.src}
              volume={details.volume || 0 / 100}
            />
          </div>
        </MaskAnim>
      </ContentAnim>
    </BoxAnim>
  );

  return BaseSequence({ item, options, children });
};

export default Video;
