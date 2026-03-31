import { ReviewFinding, TranscriptLine, TimelineClip } from './types';
import { generateId } from './utils';
import { callAI, parseAIJson } from './ai';

/**
 * Stage 8: AI Self-Review & Polish
 * AI evaluates the complete assembled edit.
 * Falls back to rule-based checks.
 */

export async function runAIReviewWithClaude(
  clips: TimelineClip[],
  lines: TranscriptLine[],
  duration: number
): Promise<ReviewFinding[]> {
  const videoClips = clips.filter((c) => c.trackType === 'video').sort((a, b) => a.startTime - b.startTime);
  const captionClips = clips.filter((c) => c.trackType === 'caption');
  const sfxClips = clips.filter((c) => c.trackType === 'sfx');
  const activeLines = lines.filter((l) => !l.deleted);

  const clipSummary = videoClips.map((c) => `${c.startTime.toFixed(1)}-${(c.startTime + c.duration).toFixed(1)}s: ${c.name}`).join('\n');

  const { result, usedAI } = await callAI(
    `You are a video editor AI reviewing a completed edit. Analyze and provide feedback.

VIDEO CLIPS:
${clipSummary || 'None'}

STATS:
- Duration: ${duration}s
- Video clips: ${videoClips.length}
- Caption clips: ${captionClips.length}
- SFX clips: ${sfxClips.length}
- Transcript lines: ${activeLines.length}
- Average clip length: ${videoClips.length > 0 ? (videoClips.reduce((s, c) => s + c.duration, 0) / videoClips.length).toFixed(1) : 'N/A'}s

Check for:
1. Pacing issues (long gaps, too-short clips, delayed start)
2. Audio issues (missing mic track, no SFX)
3. Caption coverage (transcripts without captions)
4. Visual issues (very short clips < 0.5s)
5. Color/grading notes

Return a JSON array of findings:
[
  { "category": "pacing", "severity": "warning", "timecode": 0, "description": "...", "suggestion": "..." }
]

Categories: pacing, audio, captions, visual, color
Severities: info, warning, issue
Return ONLY the JSON array.`
  );

  if (usedAI && result) {
    const parsed = parseAIJson<Array<{ category: string; severity: string; timecode: number; description: string; suggestion: string }>>(result);
    if (parsed && Array.isArray(parsed)) {
      return parsed.map((f) => ({
        id: generateId(),
        category: f.category as any,
        severity: f.severity as any,
        timecode: f.timecode || 0,
        description: f.description,
        suggestion: f.suggestion,
      }));
    }
  }

  return runAIReview(clips, lines, duration);
}

/** Rule-based fallback */
export function runAIReview(clips: TimelineClip[], lines: TranscriptLine[], duration: number): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const activeLines = lines.filter((l) => !l.deleted);
  const videoClips = clips.filter((c) => c.trackType === 'video').sort((a, b) => a.startTime - b.startTime);
  const captionClips = clips.filter((c) => c.trackType === 'caption');
  const sfxClips = clips.filter((c) => c.trackType === 'sfx');

  for (let i = 1; i < videoClips.length; i++) {
    const gap = videoClips[i].startTime - (videoClips[i - 1].startTime + videoClips[i - 1].duration);
    if (gap > 2) findings.push({ id: generateId(), category: 'pacing', severity: 'warning', timecode: videoClips[i - 1].startTime + videoClips[i - 1].duration, description: `${gap.toFixed(1)}s gap between clips`, suggestion: 'Consider adding a transition or tightening the edit.' });
  }
  if (videoClips.length > 0 && videoClips[0].startTime > 1) findings.push({ id: generateId(), category: 'pacing', severity: 'issue', timecode: 0, description: 'Video doesn\'t start immediately — delayed hook', suggestion: 'Start within the first second for better retention.' });
  if (clips.filter((c) => c.trackType === 'mic').length === 0) findings.push({ id: generateId(), category: 'audio', severity: 'warning', timecode: 0, description: 'No dedicated mic audio track', suggestion: 'Consider adding a separate mic recording.' });
  if (captionClips.length === 0 && activeLines.length > 0) findings.push({ id: generateId(), category: 'captions', severity: 'issue', timecode: 0, description: 'No captions despite having transcript', suggestion: 'Add captions — they increase engagement by 80%.' });
  for (const clip of videoClips) { if (clip.duration < 0.5) findings.push({ id: generateId(), category: 'visual', severity: 'info', timecode: clip.startTime, description: `Very short clip (${clip.duration.toFixed(2)}s)`, suggestion: 'Clips under 0.5s may feel jarring.' }); }
  findings.push({ id: generateId(), category: 'color', severity: 'info', timecode: 0, description: 'Color correction applied', suggestion: 'Use Before/After toggle to verify the grade.' });
  if (sfxClips.length === 0) findings.push({ id: generateId(), category: 'audio', severity: 'info', timecode: 0, description: 'No sound effects on timeline', suggestion: 'Subtle SFX on cuts improves perceived quality.' });
  const avgClipDuration = videoClips.length > 0 ? videoClips.reduce((sum, c) => sum + c.duration, 0) / videoClips.length : duration;
  if (avgClipDuration > 15) findings.push({ id: generateId(), category: 'pacing', severity: 'info', timecode: 0, description: `Average clip length is ${avgClipDuration.toFixed(1)}s`, suggestion: 'For short-form, aim for 3-8 second average.' });

  return findings;
}

export function getReviewScore(findings: ReviewFinding[]): { score: number; label: string } {
  const issues = findings.filter((f) => f.severity === 'issue').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const score = Math.max(0, 100 - issues * 15 - warnings * 5);
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs Work' : 'Major Issues';
  return { score, label };
}
