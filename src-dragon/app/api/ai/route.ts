import { NextRequest, NextResponse } from 'next/server';
import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * POST /api/ai
 *
 * Routes AI calls through the Claude Code CLI (OAuth gateway).
 * No API key needed — uses the user's Claude Max/Pro subscription.
 *
 * Body: { prompt: string, model?: string }
 * Returns: { result: string, error?: string }
 */

function findClaudeBin(): string {
  const appdata = process.env.APPDATA || '';
  for (const ext of ['.cmd', '.exe', '']) {
    const candidate = path.join(appdata, 'npm', `claude${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  try {
    const result = execSync('where claude 2>nul || which claude 2>/dev/null', {
      encoding: 'utf-8', timeout: 5000,
    }).trim().split('\n')[0];
    if (result) return result.trim();
  } catch {}
  return 'claude';
}

const CLAUDE_BIN = findClaudeBin();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model = 'claude-sonnet-4-6' } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    // Write prompt to temp file to avoid shell issues
    const tmpFile = path.join(os.tmpdir(), `dragon-ai-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, prompt, 'utf-8');

    try {
      const result = execFileSync(CLAUDE_BIN, [
        '--model', model,
        '--output-format', 'json',
        '--max-turns', '1',
      ], {
        input: prompt,
        encoding: 'utf-8',
        timeout: 180000, // 3 min
        maxBuffer: 10 * 1024 * 1024,
      });

      // Parse JSON envelope from CLI
      let text = result.trim();
      try {
        const data = JSON.parse(text);
        if (typeof data === 'object' && data.result) {
          text = data.result;
        }
      } catch {}

      return NextResponse.json({ result: text });
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  } catch (err: any) {
    console.error('[AI Route Error]', err.message);
    return NextResponse.json(
      { error: err.message || 'Claude CLI call failed', fallback: true },
      { status: 500 }
    );
  }
}
