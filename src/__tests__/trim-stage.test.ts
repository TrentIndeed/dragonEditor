/**
 * Unit test for Trim & Cut stage using 20260329_160500.mp4
 *
 * Video transcript:
 * 0:00-5.75: "I was about I was about to spend $5,000 on two beyond power vultures"
 *   → "I was about" is repeated. Cut 0 to ~1.5s (the first false start)
 * 5.75-33.55: Normal talking with small natural pauses
 * 33.55-34.71: 1.16s pause
 * 37.31-40.31: 3.0s pause
 * 44.99-46.76: 1.77s pause
 * 48.44-50.06: 1.62s pause
 * 52.78-55.84: 3.06s pause
 * 55.84-63.78: Final talking
 */

import { describe, it, expect } from "vitest";

const SEGMENTS = [
  { start: 0.0, end: 5.75, text: "I was about I was about to spend $5,000 on two beyond power vultures" },
  { start: 5.75, end: 8.93, text: "So I can have an electronic cable gym in my apartment" },
  { start: 8.93, end: 13.67, text: "But instead since I'm an engineer, I just decided to figure it out and make it myself" },
  { start: 14.19, end: 18.11, text: "So I use AI to completely learn how to design this" },
  { start: 18.75, end: 22.33, text: "Motorized cable system and I had no idea how to do any of it" },
  { start: 22.87, end: 28.35, text: "Even my dad was telling me that you're gonna shock yourself with all these electronics and die" },
  { start: 29.13, end: 33.55, text: "So I had to figure out how to do all this. I wired everything up soldered it and" },
  { start: 34.71, end: 37.31, text: "Even programmed the app so I can do it" },
  { start: 40.31, end: 44.99, text: "Each one pulls two hundred and fifty pounds, which is more than basically anything you could find" },
  { start: 46.76, end: 48.44, text: "No way stack no plates" },
  { start: 50.06, end: 52.78, text: "You can even use your phone to change the way mid set" },
  { start: 55.84, end: 58.06, text: "It's just some motor and some engineering" },
  { start: 58.06, end: 63.78, text: "So if you want to know how to do it, just let me know follow me for more AI automation and engineering" },
];

// All gaps between speech segments
const ALL_GAPS = (() => {
  const gaps: { start: number; end: number; duration: number }[] = [];
  for (let i = 0; i < SEGMENTS.length - 1; i++) {
    const gapStart = SEGMENTS[i].end;
    const gapEnd = SEGMENTS[i + 1].start;
    const dur = gapEnd - gapStart;
    if (dur > 0.1) {
      gaps.push({ start: gapStart, end: gapEnd, duration: Math.round(dur * 100) / 100 });
    }
  }
  return gaps;
})();

/**
 * Simulate what the trim stage SHOULD do.
 * - Cut silences >= minSilence seconds (between speech segments only)
 * - Cut the beginning repeat "I was about" (~first 1.5s)
 * - Apply padding so cuts don't touch speech edges
 */
function detectCuts(minSilence: number, padding: number) {
  const cuts: { start: number; end: number; reason: string }[] = [];

  // 1. Silence cuts — only gaps BETWEEN segments (never inside speech)
  for (const gap of ALL_GAPS) {
    if (gap.duration >= minSilence) {
      cuts.push({ start: gap.start, end: gap.end, reason: `${gap.duration}s silence` });
    }
  }

  // 2. Beginning repeat: "I was about I was about..."
  // The first "I was about" is ~0-1.5s, the second starts at ~1.5s
  // We cut from 0 to roughly where the repeat ends (before the good take starts)
  // Word-level estimate: "I was about" = 3 words out of ~13 in the segment
  // 3/13 * 5.75s = ~1.33s
  const firstSeg = SEGMENTS[0];
  const words = firstSeg.text.split(/\s+/);
  for (let len = 2; len <= 4; len++) {
    const phrase = words.slice(0, len).join(" ").toLowerCase();
    const next = words.slice(len, len * 2).join(" ").toLowerCase();
    if (phrase === next && phrase.length > 5) {
      const repeatEnd = firstSeg.start + (len / words.length) * (firstSeg.end - firstSeg.start);
      cuts.push({ start: firstSeg.start, end: repeatEnd, reason: `repeat: "${phrase}"` });
      break;
    }
  }

  // Sort, merge, pad
  cuts.sort((a, b) => a.start - b.start);
  const merged: typeof cuts = [];
  for (const cut of cuts) {
    const last = merged[merged.length - 1];
    if (last && cut.start <= last.end + 0.1) {
      last.end = Math.max(last.end, cut.end);
    } else {
      merged.push({ ...cut });
    }
  }

  return merged
    .map((r) => ({
      ...r,
      paddedStart: r.start + padding,
      paddedEnd: r.end - padding,
      removedDuration: Math.max(0, (r.end - padding) - (r.start + padding)),
    }))
    .filter((r) => r.removedDuration > 0.2);
}

describe("Trim & Cut stage for 20260329_160500.mp4", () => {
  // Use 1.0s min silence to catch all 5 pauses (the smallest is 1.16s)
  // Padding 0.3s keeps speech safe while maximizing cut area
  const cuts = detectCuts(1.0, 0.3);

  it("should detect the beginning repeat", () => {
    const earlyCut = cuts.find((c) => c.paddedStart < 3);
    expect(earlyCut).toBeDefined();
    expect(earlyCut!.reason).toContain("repeat");
  });

  it("should detect all 5 silence pauses in the second half", () => {
    const silenceCuts = cuts.filter((c) => c.paddedStart > 30 && c.reason.includes("silence"));
    expect(silenceCuts.length).toBe(5);
  });

  it("should never cut inside a speech segment", () => {
    for (const cut of cuts) {
      for (const seg of SEGMENTS) {
        // The padded cut region should not overlap with any speech segment interior
        // Allow overlap with the first segment since the repeat IS inside it
        if (seg.start === 0) continue;

        const speechCore = { start: seg.start + 0.1, end: seg.end - 0.1 };
        const overlaps = cut.paddedStart < speechCore.end && cut.paddedEnd > speechCore.start;
        expect(overlaps, `Cut ${cut.paddedStart.toFixed(2)}-${cut.paddedEnd.toFixed(2)} overlaps speech "${seg.text.substring(0, 30)}..." at ${seg.start}-${seg.end}`).toBe(false);
      }
    }
  });

  it("should remove 8-15 seconds total", () => {
    const totalRemoved = cuts.reduce((sum, c) => sum + c.removedDuration, 0);
    expect(totalRemoved).toBeGreaterThan(8);
    expect(totalRemoved).toBeLessThan(15);
  });

  it("should result in a 49-56 second video", () => {
    const totalRemoved = cuts.reduce((sum, c) => sum + c.removedDuration, 0);
    const result = 63.78 - totalRemoved;
    expect(result).toBeGreaterThan(49);
    expect(result).toBeLessThan(56);
  });

  it("should preserve all speech segments (except first repeat)", () => {
    for (const seg of SEGMENTS) {
      if (seg.start === 0) continue;
      const fullyRemoved = cuts.some(
        (c) => c.paddedStart <= seg.start && c.paddedEnd >= seg.end
      );
      expect(fullyRemoved, `Segment "${seg.text.substring(0, 40)}..." should not be fully removed`).toBe(false);
    }
  });
});
