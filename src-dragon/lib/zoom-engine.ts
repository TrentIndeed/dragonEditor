import { ZoomKeyframe } from './types';

/**
 * Zoom Interpolation Engine
 *
 * Each keyframe has: time, duration (ease-in), holdDuration, level, curveType
 *
 * Timeline for one keyframe:
 *   [time] ──ease-in──> [time+duration] ──hold──> [time+duration+holdDuration] ──ease-out──> [+duration] → 1.0
 *
 * Multiple keyframes are evaluated independently and the active one wins.
 */

/** Easing functions */
function easeIn(t: number): number { return t * t; }
function easeOut(t: number): number { return 1 - (1 - t) * (1 - t); }
function easeInOut(t: number): number { return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; }
function linear(t: number): number { return t; }
function snap(t: number): number { return t > 0 ? 1 : 0; }

function getEasing(curve: ZoomKeyframe['curveType']): (t: number) => number {
  switch (curve) {
    case 'ease-in': return easeIn;
    case 'ease-out': return easeOut;
    case 'ease-in-out': return easeInOut;
    case 'snap': return snap;
    default: return linear;
  }
}

export interface ZoomState {
  scale: number;
  /** 0-1 progress through the current zoom (for UI display) */
  progress: number;
  /** Which keyframe is active, or null */
  activeKeyframeId: string | null;
}

/**
 * Calculate the zoom scale at a given time from all keyframes.
 *
 * Each keyframe defines:
 *   - Ramp in: [time → time+duration] — scale from 1.0 to level
 *   - Hold: [time+duration → time+duration+holdDuration] — stay at level
 *   - Ramp out: [time+duration+holdDuration → +duration] — scale from level back to 1.0
 */
export function getZoomAtTime(keyframes: ZoomKeyframe[], time: number): ZoomState {
  if (keyframes.length === 0) return { scale: 1, progress: 0, activeKeyframeId: null };

  // Sort by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  for (const kf of sorted) {
    const rampInStart = kf.time;
    const rampInEnd = kf.time + kf.duration;
    const holdEnd = rampInEnd + kf.holdDuration;
    const rampOutEnd = holdEnd + kf.duration; // symmetrical ramp out

    // Before this keyframe
    if (time < rampInStart) continue;

    // After this keyframe's full cycle
    if (time > rampOutEnd) continue;

    const easing = getEasing(kf.curveType);

    // Ramp in
    if (time >= rampInStart && time < rampInEnd) {
      const t = (time - rampInStart) / kf.duration;
      const easedT = easing(Math.min(1, Math.max(0, t)));
      const scale = 1 + (kf.level - 1) * easedT;
      return { scale, progress: t * 0.33, activeKeyframeId: kf.id };
    }

    // Hold
    if (time >= rampInEnd && time < holdEnd) {
      const holdProgress = (time - rampInEnd) / kf.holdDuration;
      return { scale: kf.level, progress: 0.33 + holdProgress * 0.34, activeKeyframeId: kf.id };
    }

    // Ramp out
    if (time >= holdEnd && time <= rampOutEnd) {
      const t = (time - holdEnd) / kf.duration;
      const easedT = easing(Math.min(1, Math.max(0, t)));
      const scale = kf.level - (kf.level - 1) * easedT;
      return { scale, progress: 0.67 + t * 0.33, activeKeyframeId: kf.id };
    }
  }

  return { scale: 1, progress: 0, activeKeyframeId: null };
}
