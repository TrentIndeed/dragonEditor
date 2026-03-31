import { AudioSetupConfig, AudioAnalysis, TimelineClip } from './types';

/**
 * Stage 2: Audio Setup
 * - Mic sync via waveform cross-correlation
 * - Volume normalization to -14 LUFS
 * - Noise reduction (gate / spectral denoising)
 * - Audio ducking for background music
 */

export const DEFAULT_AUDIO_CONFIG: AudioSetupConfig = {
  micSynced: false,
  syncOffsetMs: 0,
  normalizedLUFS: -14,
  noiseReduction: true,
  noiseReductionLevel: 'medium',
  audioDucking: true,
};

/** Simulates audio analysis of a clip */
export function analyzeAudio(clips: TimelineClip[]): AudioAnalysis {
  const hasAudio = clips.some((c) => c.trackType === 'mic');
  return {
    peakLevel: -3.2,
    avgLevel: -18.5,
    noiseFloor: -48.0,
    clipping: false,
    suggestedGain: 4.5,
    hasBackgroundNoise: true,
  };
}

/** Simulates mic sync detection */
export function detectMicSync(videoClips: TimelineClip[], micClips: TimelineClip[]): number {
  // Mock: returns offset in ms (positive = mic is ahead)
  if (videoClips.length === 0 || micClips.length === 0) return 0;
  return 42; // typical sync offset
}

/** Apply audio config and return updated config */
export function applyAudioSetup(
  clips: TimelineClip[],
  config: Partial<AudioSetupConfig>
): AudioSetupConfig {
  const analysis = analyzeAudio(clips);
  const micClips = clips.filter((c) => c.trackType === 'mic');
  const videoClips = clips.filter((c) => c.trackType === 'video');

  const syncOffset = micClips.length > 0 ? detectMicSync(videoClips, micClips) : 0;

  return {
    micSynced: micClips.length > 0,
    syncOffsetMs: syncOffset,
    normalizedLUFS: config.normalizedLUFS ?? -14,
    noiseReduction: config.noiseReduction ?? analysis.hasBackgroundNoise,
    noiseReductionLevel: config.noiseReductionLevel ?? 'medium',
    audioDucking: config.audioDucking ?? true,
  };
}

export interface AudioSetupResult {
  config: AudioSetupConfig;
  analysis: AudioAnalysis;
  changes: string[];
}

export function runAudioSetup(clips: TimelineClip[]): AudioSetupResult {
  const analysis = analyzeAudio(clips);
  const config = applyAudioSetup(clips, {});
  const changes: string[] = [];

  if (config.micSynced) {
    changes.push(`Mic audio synced (${config.syncOffsetMs}ms offset corrected)`);
  }
  changes.push(`Volume normalized to ${config.normalizedLUFS} LUFS (gain: +${analysis.suggestedGain}dB)`);
  if (config.noiseReduction) {
    changes.push(`Noise reduction applied (${config.noiseReductionLevel} — noise floor at ${analysis.noiseFloor}dB)`);
  }
  if (config.audioDucking) {
    changes.push('Audio ducking enabled for background music');
  }

  return { config, analysis, changes };
}
