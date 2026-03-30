import { TimelineClip, TrackType, TranscriptLine } from './types';

/**
 * Generates FCPXML 1.11 (Final Cut Pro XML) compatible with DaVinci Resolve.
 * Resolve: File > Import Timeline > FCPXML
 *
 * Supports: multi-track, cuts, clip positions, audio tracks, markers.
 * Captions exported as titles/markers (Resolve imports these).
 */

function secondsToFCPTime(seconds: number, fps: number = 30): string {
  // FCPXML uses rational time: "150/30s" = 5 seconds at 30fps
  const frames = Math.round(seconds * fps);
  return `${frames}/${fps}s`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface FCPXMLOptions {
  title: string;
  fps: number;
  width: number;
  height: number;
  duration: number;
  clips: TimelineClip[];
  transcriptLines?: TranscriptLine[];
}

export function generateFCPXML(options: FCPXMLOptions): string {
  const { title, fps, width, height, duration, clips, transcriptLines } = options;

  const totalFrames = Math.ceil(duration * fps);
  const totalTime = secondsToFCPTime(duration, fps);
  const frameDuration = `${Math.round(1000 / fps) * fps}/${fps * 1000}s`;

  // Collect unique source files
  const sourceFiles = new Map<string, { name: string; duration: number }>();
  for (const clip of clips) {
    if (!sourceFiles.has(clip.name)) {
      sourceFiles.set(clip.name, {
        name: clip.name,
        duration: clip.sourceOffset + clip.duration,
      });
    } else {
      const existing = sourceFiles.get(clip.name)!;
      existing.duration = Math.max(existing.duration, clip.sourceOffset + clip.duration);
    }
  }

  // Group clips by track
  const trackGroups: Record<string, TimelineClip[]> = {};
  for (const clip of clips) {
    if (!trackGroups[clip.trackType]) trackGroups[clip.trackType] = [];
    trackGroups[clip.trackType].push(clip);
  }

  // Sort each track by start time
  for (const key of Object.keys(trackGroups)) {
    trackGroups[key].sort((a, b) => a.startTime - b.startTime);
  }

  const xml: string[] = [];

  // Header
  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  xml.push('<!DOCTYPE fcpxml>');
  xml.push('<fcpxml version="1.11">');
  xml.push('  <resources>');

  // Format resource
  xml.push(`    <format id="r1" name="FFVideoFormat${height}p${fps}" frameDuration="${frameDuration}" width="${width}" height="${height}"/>`);

  // Asset resources (source files)
  let assetId = 1;
  const assetMap = new Map<string, string>();
  for (const [name, info] of sourceFiles) {
    const id = `a${assetId}`;
    assetMap.set(name, id);
    const isAudio = isAudioTrack(clips.find(c => c.name === name)?.trackType ?? 'video');
    xml.push(`    <asset id="${id}" name="${escapeXml(name)}" start="0/${fps}s" duration="${secondsToFCPTime(info.duration, fps)}" hasVideo="${!isAudio ? '1' : '0'}" hasAudio="1" format="r1">`);
    xml.push(`      <media-rep kind="original-media" src="file:///path/to/media/${escapeXml(name)}"/>`);
    xml.push('    </asset>');
    assetId++;
  }

  xml.push('  </resources>');

  // Library > Event > Project
  xml.push(`  <library>`);
  xml.push(`    <event name="${escapeXml(title)}">`);
  xml.push(`      <project name="${escapeXml(title)}">`);
  xml.push(`        <sequence format="r1" duration="${totalTime}" tcStart="0/${fps}s" tcFormat="NDF">`);
  xml.push('          <spine>');

  // Primary storyline = video track
  const videoClips = trackGroups['video'] || [];
  let timeOffset = 0;

  for (const clip of videoClips) {
    // Insert gap if there's space before this clip
    if (clip.startTime > timeOffset) {
      const gapDuration = clip.startTime - timeOffset;
      xml.push(`            <gap offset="${secondsToFCPTime(timeOffset, fps)}" duration="${secondsToFCPTime(gapDuration, fps)}" start="${secondsToFCPTime(timeOffset, fps)}"/>`);
    }

    const assetRef = assetMap.get(clip.name) || 'a1';
    xml.push(`            <asset-clip ref="${assetRef}" name="${escapeXml(clip.name)}" offset="${secondsToFCPTime(clip.startTime, fps)}" duration="${secondsToFCPTime(clip.duration, fps)}" start="${secondsToFCPTime(clip.sourceOffset, fps)}" tcFormat="NDF">`);

    // Attach audio from mic track as connected clip
    const micClips = (trackGroups['mic'] || []).filter(
      mc => mc.startTime < clip.startTime + clip.duration && mc.startTime + mc.duration > clip.startTime
    );
    for (const mc of micClips) {
      const mcAssetRef = assetMap.get(mc.name) || 'a1';
      xml.push(`              <audio ref="${mcAssetRef}" name="${escapeXml(mc.name)}" lane="-1" offset="${secondsToFCPTime(mc.startTime, fps)}" duration="${secondsToFCPTime(mc.duration, fps)}" start="${secondsToFCPTime(mc.sourceOffset, fps)}"/>`);
    }

    xml.push('            </asset-clip>');
    timeOffset = clip.startTime + clip.duration;
  }

  // Fill remaining timeline with gap
  if (timeOffset < duration) {
    xml.push(`            <gap offset="${secondsToFCPTime(timeOffset, fps)}" duration="${secondsToFCPTime(duration - timeOffset, fps)}" start="${secondsToFCPTime(timeOffset, fps)}"/>`);
  }

  xml.push('          </spine>');

  // Secondary tracks as connected storylines
  const secondaryTracks: TrackType[] = ['broll', 'sfx', 'music'];
  let lane = 1;
  for (const trackType of secondaryTracks) {
    const trackClips = trackGroups[trackType];
    if (!trackClips || trackClips.length === 0) continue;

    for (const clip of trackClips) {
      const assetRef = assetMap.get(clip.name) || 'a1';
      const isAudio = isAudioTrack(trackType);
      const tag = isAudio ? 'audio' : 'asset-clip';
      xml.push(`          <${tag} ref="${assetRef}" name="${escapeXml(clip.name)}" lane="${lane}" offset="${secondsToFCPTime(clip.startTime, fps)}" duration="${secondsToFCPTime(clip.duration, fps)}" start="${secondsToFCPTime(clip.sourceOffset, fps)}"/>`);
    }
    lane++;
  }

  // Markers from transcript lines (Resolve reads these as markers)
  if (transcriptLines && transcriptLines.length > 0) {
    for (const line of transcriptLines) {
      if (line.deleted) continue;
      xml.push(`          <marker start="${secondsToFCPTime(line.startTime, fps)}" duration="${secondsToFCPTime(line.endTime - line.startTime, fps)}" value="${escapeXml(line.text)}"/>`);
    }
  }

  xml.push('        </sequence>');
  xml.push('      </project>');
  xml.push('    </event>');
  xml.push('  </library>');
  xml.push('</fcpxml>');

  return xml.join('\n');
}

function isAudioTrack(trackType: TrackType | string): boolean {
  return ['mic', 'sfx', 'music'].includes(trackType);
}

export function downloadFCPXML(options: FCPXMLOptions): void {
  const content = generateFCPXML(options);
  const filename = options.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_').toLowerCase();
  const blob = new Blob([content], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.fcpxml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
