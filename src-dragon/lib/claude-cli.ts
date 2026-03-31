/**
 * Claude CLI Gateway
 *
 * Routes AI calls through the Claude Code CLI, which handles OAuth
 * authentication via your Claude Max/Pro subscription. No API key needed.
 *
 * Pattern borrowed from operatorDashboard/backend/agents/reasoning.py
 */

import { execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const FAST_MODEL = 'claude-sonnet-4-6';

/** Find the claude CLI binary */
function findClaudeBin(): string {
  // 1. Check PATH
  try {
    const which = execSync('where claude 2>nul || which claude 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim().split('\n')[0];
    if (which) return which;
  } catch {}

  // 2. Windows APPDATA npm global install
  const appdata = process.env.APPDATA || '';
  for (const ext of ['.cmd', '.exe', '']) {
    const candidate = path.join(appdata, 'npm', `claude${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }

  // 3. Try npm prefix
  try {
    const npmPrefix = execSync('npm prefix -g', { encoding: 'utf-8', timeout: 5000 }).trim();
    for (const ext of ['.cmd', '.exe', '']) {
      const candidate = path.join(npmPrefix, `claude${ext}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {}

  return 'claude';
}

const CLAUDE_BIN = findClaudeBin();

/** Check if Claude CLI is installed and accessible */
export function isClaudeAvailable(): boolean {
  try {
    execSync(`"${CLAUDE_BIN}" --version`, { timeout: 5000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Call Claude via the CLI with a prompt. Uses your Claude Code OAuth login.
 * Supports sending images as base64 by including them in the prompt text.
 */
export function callClaude(prompt: string, model: string = FAST_MODEL): string {
  // Write prompt to temp file to avoid shell escaping/length issues
  const tmpFile = path.join(os.tmpdir(), `dragon-claude-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  try {
    const result = execFileSync(CLAUDE_BIN, [
      '--model', model,
      '--output-format', 'json',
      '--max-turns', '1',
    ], {
      input: fs.readFileSync(tmpFile, 'utf-8'),
      encoding: 'utf-8',
      timeout: 120000, // 2 min
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    // Parse JSON envelope
    try {
      const data = JSON.parse(result.trim());
      if (typeof data === 'object' && data.result) return data.result;
      return result.trim();
    } catch {
      return result.trim();
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

/**
 * Call Claude with an image (screenshot) for visual analysis.
 * Writes the image to a temp file and references it in the prompt.
 */
export function callClaudeWithImage(
  imageBase64: string,
  prompt: string,
  model: string = FAST_MODEL
): string {
  // Save image to temp file
  const imgFile = path.join(os.tmpdir(), `dragon-screenshot-${Date.now()}.png`);
  fs.writeFileSync(imgFile, Buffer.from(imageBase64, 'base64'));

  // Claude CLI can read images via the prompt with file references
  const fullPrompt = `[Image attached: ${imgFile}]\n\n${prompt}`;

  try {
    return callClaude(fullPrompt, model);
  } finally {
    try { fs.unlinkSync(imgFile); } catch {}
  }
}
