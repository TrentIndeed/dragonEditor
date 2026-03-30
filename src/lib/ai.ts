/**
 * AI Client — calls Claude via the /api/ai route (CLI gateway).
 * Falls back to mock functions if the CLI is unavailable.
 */

export async function callAI(prompt: string): Promise<{ result: string; usedAI: boolean }> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.fallback) {
        return { result: '', usedAI: false };
      }
      throw new Error(data.error || `API error ${res.status}`);
    }

    const data = await res.json();
    return { result: data.result, usedAI: true };
  } catch {
    return { result: '', usedAI: false };
  }
}

/** Parse JSON from AI response, handling markdown fences */
export function parseAIJson<T>(raw: string): T | null {
  const text = raw.trim();

  // Direct parse
  try { return JSON.parse(text); } catch {}

  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }

  // Find first [ or {
  for (const [start, end] of [['[', ']'], ['{', '}']]) {
    const si = text.indexOf(start);
    const ei = text.lastIndexOf(end);
    if (si >= 0 && ei > si) {
      try { return JSON.parse(text.slice(si, ei + 1)); } catch {}
    }
  }

  return null;
}
