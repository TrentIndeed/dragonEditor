import { TimelineClip } from './types';

/**
 * Generates a CMX 3600 EDL (Edit Decision List) from timeline clips.
 * Compatible with DaVinci Resolve, Premiere Pro, Avid, and most NLEs.
 *
 * EDL Format (CMX 3600):
 * EVENT  REEL      TRACK  TRANS  SOURCE_IN    SOURCE_OUT   REC_IN       REC_OUT
 * 001    clip.mp4  V      C      00:00:00:00  00:00:05:00  00:00:00:00  00:00:05:00
 */

function secondsToSMPTE(totalSeconds: number, fps: number = 30): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds % 1) * fps);
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
    String(frames).padStart(2, '0'),
  ].join(':');
}

export function generateEDL(
  clips: TimelineClip[],
  title: string = 'Dragon Editor Export',
  fps: number = 30
): string {
  const lines: string[] = [];

  lines.push(`TITLE: ${title}`);
  lines.push(`FCM: NON-DROP FRAME`);
  lines.push('');

  // Sort clips by track priority then start time
  const trackPriority: Record<string, number> = {
    video: 0, mic: 1, broll: 2, caption: 3, sfx: 4, music: 5,
  };

  const sorted = [...clips].sort((a, b) => {
    const pa = trackPriority[a.trackType] ?? 99;
    const pb = trackPriority[b.trackType] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.startTime - b.startTime;
  });

  // Track video and audio clips separately
  let eventNum = 1;

  for (const clip of sorted) {
    const num = String(eventNum).padStart(3, '0');
    const reel = sanitizeReel(clip.name);

    // Track channel: V = video, A = audio, A2 = audio 2, etc.
    let trackChannel: string;
    switch (clip.trackType) {
      case 'video': trackChannel = 'V'; break;
      case 'broll': trackChannel = 'V'; break;
      case 'mic': trackChannel = 'A'; break;
      case 'sfx': trackChannel = 'A2'; break;
      case 'music': trackChannel = 'A3'; break;
      default: trackChannel = 'V'; break;
    }

    // Source in/out = position within the source file
    const sourceIn = secondsToSMPTE(clip.sourceOffset, fps);
    const sourceOut = secondsToSMPTE(clip.sourceOffset + clip.duration, fps);

    // Record in/out = position on the output timeline
    const recIn = secondsToSMPTE(clip.startTime, fps);
    const recOut = secondsToSMPTE(clip.startTime + clip.duration, fps);

    // Transition: C = cut (only type for now)
    const transition = 'C';

    lines.push(`${num}  ${reel.padEnd(32)} ${trackChannel.padEnd(6)} ${transition}        ${sourceIn} ${sourceOut} ${recIn} ${recOut}`);

    // Add clip name comment (Resolve reads these)
    lines.push(`* FROM CLIP NAME: ${clip.name}`);
    lines.push(`* TRACK: ${clip.trackType}`);
    lines.push('');

    eventNum++;
  }

  return lines.join('\n');
}

function sanitizeReel(name: string): string {
  // EDL reel names: max 32 chars, alphanumeric + underscore
  return name
    .replace(/[^a-zA-Z0-9_.\-]/g, '_')
    .substring(0, 32);
}

export function downloadEDL(clips: TimelineClip[], title: string, fps?: number): void {
  const content = generateEDL(clips, title, fps);
  downloadFile(content, `${sanitizeFilename(title)}.edl`, 'text/plain');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').toLowerCase();
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
