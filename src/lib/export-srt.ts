import { TranscriptLine } from './types';

/**
 * Generates SRT (SubRip) subtitle file from transcript lines.
 * Compatible with DaVinci Resolve (Media Pool > Import Subtitle),
 * Premiere Pro, VLC, and all major players.
 */

function secondsToSRTTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.round((totalSeconds % 1) * 1000);
  return [
    String(hours).padStart(2, '0'),
    ':',
    String(minutes).padStart(2, '0'),
    ':',
    String(seconds).padStart(2, '0'),
    ',',
    String(millis).padStart(3, '0'),
  ].join('');
}

export function generateSRT(lines: TranscriptLine[]): string {
  const activeLines = lines.filter((l) => !l.deleted);
  const blocks: string[] = [];

  activeLines.forEach((line, index) => {
    const num = index + 1;
    const start = secondsToSRTTime(line.startTime);
    const end = secondsToSRTTime(line.endTime);
    const speaker = line.speaker ? `<b>${line.speaker}:</b> ` : '';
    const text = `${speaker}${line.text}`;
    blocks.push(`${num}\n${start} --> ${end}\n${text}`);
  });

  return blocks.join('\n\n') + '\n';
}

export function downloadSRT(lines: TranscriptLine[], title: string): void {
  const content = generateSRT(lines);
  const filename = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').toLowerCase();
  const blob = new Blob([content], { type: 'text/srt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.srt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
