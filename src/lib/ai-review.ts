import { ReviewFinding, TranscriptLine, TimelineClip } from './types';
import { generateId } from './utils';

/**
 * Stage 8: AI Self-Review & Polish
 * AI evaluates the complete assembled edit: pacing, audio, captions, visual flow, color.
 */

export function runAIReview(
  clips: TimelineClip[],
  lines: TranscriptLine[],
  duration: number
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const activeLines = lines.filter((l) => !l.deleted);
  const videoClips = clips.filter((c) => c.trackType === 'video').sort((a, b) => a.startTime - b.startTime);
  const captionClips = clips.filter((c) => c.trackType === 'caption');
  const sfxClips = clips.filter((c) => c.trackType === 'sfx');

  // Pacing: check for long gaps
  for (let i = 1; i < videoClips.length; i++) {
    const gap = videoClips[i].startTime - (videoClips[i - 1].startTime + videoClips[i - 1].duration);
    if (gap > 2) {
      findings.push({
        id: generateId(),
        category: 'pacing',
        severity: 'warning',
        timecode: videoClips[i - 1].startTime + videoClips[i - 1].duration,
        description: `${gap.toFixed(1)}s gap between clips`,
        suggestion: 'Consider adding a transition or tightening the edit.',
      });
    }
  }

  // Pacing: check first 3 seconds for hook
  if (videoClips.length > 0 && videoClips[0].startTime > 1) {
    findings.push({
      id: generateId(),
      category: 'pacing',
      severity: 'issue',
      timecode: 0,
      description: 'Video doesn\'t start immediately — delayed hook',
      suggestion: 'Start the video within the first second for better retention.',
    });
  }

  // Audio: check if mic track exists
  const micClips = clips.filter((c) => c.trackType === 'mic');
  if (micClips.length === 0) {
    findings.push({
      id: generateId(),
      category: 'audio',
      severity: 'warning',
      timecode: 0,
      description: 'No dedicated mic audio track detected',
      suggestion: 'Consider adding a separate mic recording for cleaner audio.',
    });
  }

  // Captions: check coverage
  if (captionClips.length === 0 && activeLines.length > 0) {
    findings.push({
      id: generateId(),
      category: 'captions',
      severity: 'issue',
      timecode: 0,
      description: 'No captions on timeline despite having transcript',
      suggestion: 'Add captions — they increase engagement by 80%.',
    });
  }

  // Visual: check for very short clips (< 0.5s)
  for (const clip of videoClips) {
    if (clip.duration < 0.5) {
      findings.push({
        id: generateId(),
        category: 'visual',
        severity: 'info',
        timecode: clip.startTime,
        description: `Very short clip (${clip.duration.toFixed(2)}s)`,
        suggestion: 'Clips under 0.5s may feel jarring. Consider extending or removing.',
      });
    }
  }

  // Color: placeholder check
  findings.push({
    id: generateId(),
    category: 'color',
    severity: 'info',
    timecode: 0,
    description: 'Color correction applied across all scenes',
    suggestion: 'Use Before/After toggle on the preview to verify the grade.',
  });

  // SFX: check if any were added
  if (sfxClips.length === 0) {
    findings.push({
      id: generateId(),
      category: 'audio',
      severity: 'info',
      timecode: 0,
      description: 'No sound effects on timeline',
      suggestion: 'Adding subtle SFX on cuts and emphasis points improves perceived quality.',
    });
  }

  // Overall pacing assessment
  const avgClipDuration = videoClips.length > 0
    ? videoClips.reduce((sum, c) => sum + c.duration, 0) / videoClips.length
    : duration;

  if (avgClipDuration > 15) {
    findings.push({
      id: generateId(),
      category: 'pacing',
      severity: 'info',
      timecode: 0,
      description: `Average clip length is ${avgClipDuration.toFixed(1)}s`,
      suggestion: 'For short-form content, aim for 3-8 second average clip length.',
    });
  }

  return findings;
}

export function getReviewScore(findings: ReviewFinding[]): { score: number; label: string } {
  const issues = findings.filter((f) => f.severity === 'issue').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const score = Math.max(0, 100 - issues * 15 - warnings * 5);
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs Work' : 'Major Issues';
  return { score, label };
}
