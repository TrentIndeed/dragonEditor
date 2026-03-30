import { test, expect } from '@playwright/test';
import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * AI-Powered Visual Validation Tests
 *
 * Uses the Claude Code CLI (OAuth gateway) to analyze screenshots.
 * No API key needed — uses your Claude Max/Pro subscription via the CLI.
 *
 * Requires: `claude` CLI installed and authenticated (`claude --version`)
 * Skips gracefully if CLI not found.
 *
 * Run: npx playwright test ai-visual-validation
 */

// ── Find Claude CLI ──

function findClaudeBin(): string {
  try {
    const result = execSync('where claude 2>nul', { encoding: 'utf-8', timeout: 5000 }).trim().split('\n')[0];
    if (result) return result.trim();
  } catch {}
  const appdata = process.env.APPDATA || '';
  for (const ext of ['.cmd', '.exe', '']) {
    const candidate = path.join(appdata, 'npm', `claude${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return '';
}

const CLAUDE_BIN = findClaudeBin();

function isClaudeAvailable(): boolean {
  if (!CLAUDE_BIN) return false;
  try {
    execSync(`"${CLAUDE_BIN}" --version`, { timeout: 10000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Call Claude CLI with a prompt, get text response */
function askClaude(prompt: string): string {
  const tmpFile = path.join(os.tmpdir(), `dragon-ai-test-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  try {
    const result = execFileSync(CLAUDE_BIN, [
      '--model', 'claude-sonnet-4-6',
      '--output-format', 'json',
      '--max-turns', '1',
    ], {
      input: prompt,
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });

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

/** Save screenshot, ask Claude to analyze it, parse YES/NO responses */
async function validateScreenshot(
  screenshot: Buffer,
  prompt: string,
  reportName: string
): Promise<Record<string, boolean>> {
  // Save screenshot for Claude to reference
  const imgFile = path.join(os.tmpdir(), `dragon-screenshot-${Date.now()}.png`);
  fs.writeFileSync(imgFile, screenshot);

  const fullPrompt = `I'm showing you a screenshot of a video editor app saved at: ${imgFile}

Please analyze this screenshot and answer each question.

${prompt}

IMPORTANT: Format each answer exactly as: N. YES — reason  OR  N. NO — reason`;

  const answer = askClaude(fullPrompt);

  // Save report
  const reportDir = path.join(__dirname, '..', 'test-results', 'ai-validation');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, `${reportName}.txt`), answer);
  fs.writeFileSync(path.join(reportDir, `${reportName}.png`), screenshot);

  console.log(`AI Assessment (${reportName}):\n`, answer);

  // Parse YES/NO answers
  const checks: Record<string, boolean> = {};
  for (const line of answer.split('\n')) {
    const match = line.match(/(\d+)\.\s*(YES|NO)/i);
    if (match) checks[match[1]] = match[2].toUpperCase() === 'YES';
  }

  // Cleanup
  try { fs.unlinkSync(imgFile); } catch {}

  return checks;
}

// ── Tests ──

const CLI_AVAILABLE = isClaudeAvailable();
const SKIP_MSG = 'Claude CLI not found or not authenticated — skipping AI visual validation. Install with: npm i -g @anthropic-ai/claude-code';

test.describe('AI Visual Validation', () => {
  test.skip(!CLI_AVAILABLE, SKIP_MSG);

  test('mode selection screen looks correct', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const screenshot = await page.screenshot();

    const checks = await validateScreenshot(screenshot,
      `1. Is this a dark-themed UI (dark background, not white/light)?
2. Is there a title "Dragon Editor" visible?
3. Are there exactly 3 mode selection cards (Shorts Editor, Shorts Extractor, Long-Form Editor)?
4. Is there a row of content style buttons (Entertainment, Education, Podcast, etc.)?
5. Is there a text input for project name?
6. Is there a "Create Project" button?
7. Does the layout look centered and professional?`,
      'mode-select'
    );

    expect(checks['1'], 'Dark theme').toBeTruthy();
    expect(checks['2'], 'Dragon Editor title').toBeTruthy();
    expect(checks['3'], '3 mode cards').toBeTruthy();
    expect(checks['7'], 'Professional layout').toBeTruthy();
  });

  test('editor layout with all panels', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('AI Validation');
    await page.getByText('Create Project').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot();

    const checks = await validateScreenshot(screenshot,
      `1. Is this a multi-panel editor layout (left, center, right panels)?
2. Is there a top bar / header with project info?
3. Is there a media panel on the left?
4. Is there a video preview area in the center?
5. Is there a timeline at the bottom with track labels?
6. Is there an AI chat panel on the right?
7. Is there a pipeline showing numbered stages?
8. Are transport controls (play button) visible?
9. Is the color scheme consistent dark theme?
10. Does the layout look professional (no overlapping, proper spacing)?`,
      'editor-layout'
    );

    expect(checks['1'], 'Multi-panel layout').toBeTruthy();
    expect(checks['5'], 'Timeline with tracks').toBeTruthy();
    expect(checks['9'], 'Dark theme consistent').toBeTruthy();
    expect(checks['10'], 'Professional layout').toBeTruthy();
  });

  test('pipeline running shows activity', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Pipeline Test');
    await page.getByText('Create Project').click();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Start pipeline' }).click();
    await page.waitForTimeout(2000);

    const screenshot = await page.screenshot();

    const checks = await validateScreenshot(screenshot,
      `1. Is there a pipeline section showing numbered stages?
2. Does at least one stage show activity (processing, progress)?
3. Are there messages in a chat area?
4. Is the UI still intact (not broken/frozen)?
5. Is the dark theme consistent?`,
      'pipeline-running'
    );

    expect(checks['1'], 'Pipeline visible').toBeTruthy();
    expect(checks['4'], 'UI intact').toBeTruthy();
    expect(checks['5'], 'Dark theme').toBeTruthy();
  });

  test('export modal is properly styled', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Export Test');
    await page.getByText('Create Project').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button', { hasText: /^Export$/ }).click();
    await page.waitForTimeout(500);

    const screenshot = await page.screenshot();

    const checks = await validateScreenshot(screenshot,
      `1. Is there a modal dialog overlaying the editor?
2. Does it have an "Export" title?
3. Are there resolution options visible?
4. Is there an export/download button?
5. Does the modal look properly styled with dark theme?`,
      'export-modal'
    );

    expect(checks['1'], 'Modal visible').toBeTruthy();
    expect(checks['5'], 'Properly styled').toBeTruthy();
  });
});
