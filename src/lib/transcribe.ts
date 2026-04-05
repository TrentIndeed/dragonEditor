/**
 * Client-side audio extraction + transcription via local Whisper server.
 *
 * 1. Extracts audio from video blob URL using Web Audio API
 * 2. Resamples to 16kHz mono float32 PCM
 * 3. Sends to local transcription server (faster-whisper)
 * 4. Returns word-level timestamps, silences, fillers
 */

const TRANSCRIBE_URL = "http://localhost:5555/transcribe";

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface SilenceRegion {
  start: number;
  end: number;
  duration: number;
}

export interface TranscriptionResult {
  duration: number;
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  silences: SilenceRegion[];
  fillers: TranscriptWord[];
  stats: {
    total_words: number;
    total_segments: number;
    silence_count: number;
    filler_count: number;
    total_silence_duration: number;
  };
}

/**
 * Extract audio from a video blob URL as 16kHz mono Float32 PCM.
 */
async function extractAudio(blobUrl: string): Promise<Float32Array> {
  const response = await fetch(blobUrl);
  const arrayBuffer = await response.arrayBuffer();

  // Decode with Web Audio API
  const audioCtx = new OfflineAudioContext(1, 1, 16000);
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // Resample to 16kHz mono
  const sampleRate = 16000;
  const numSamples = Math.ceil(audioBuffer.duration * sampleRate);
  const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

/**
 * Transcribe a video's audio track.
 * @param blobUrl - The blob URL of the video file
 * @returns Full transcription with words, silences, fillers
 */
export async function transcribeVideo(blobUrl: string): Promise<TranscriptionResult> {
  // Extract audio
  const pcm = await extractAudio(blobUrl);

  // Send raw PCM to transcription server
  const response = await fetch(TRANSCRIBE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: pcm.buffer,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Server error" }));
    throw new Error(err.error || `Transcription failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if the transcription server is running.
 */
export async function isTranscribeServerRunning(): Promise<boolean> {
  try {
    const resp = await fetch(TRANSCRIBE_URL, { method: "POST", body: new Float32Array(16000).buffer });
    return resp.ok || resp.status === 400; // 400 = server is up but audio too short
  } catch {
    return false;
  }
}
