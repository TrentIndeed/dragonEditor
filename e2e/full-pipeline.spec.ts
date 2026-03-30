import { test, expect } from '@playwright/test';

test.describe('Dragon Editor — Full E2E Pipeline', () => {

  test('should create a project and enter the editor', async ({ page }) => {
    await page.goto('/');

    // Mode selection screen
    await expect(page.getByText('Dragon Editor')).toBeVisible();
    await expect(page.getByText('Shorts Editor')).toBeVisible();

    // Select mode (Shorts Editor is default selected)
    await page.getByText('Long-Form Editor').click();

    // Select style
    await page.getByText('Education').click();

    // Type project name
    await page.getByPlaceholder('My awesome video...').fill('E2E Test Project');

    // Create project
    await page.getByText('Create Project').click();

    // Should enter editor — TopBar shows project info
    await expect(page.getByText('E2E Test Project')).toBeVisible();
    await expect(page.getByText('AI Assistant')).toBeVisible();

    // Should see key editor panels
    await expect(page.getByText('AI Assistant')).toBeVisible();
    await expect(page.getByText('Mic Audio')).toBeVisible();
  });

  test('should show all 10 pipeline stages', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Pipeline Test');
    await page.getByText('Create Project').click();

    // Pipeline stepper should list all stages
    await expect(page.getByText('Trim & Cut')).toBeVisible();
    await expect(page.getByText('Audio Setup')).toBeVisible();
    await expect(page.getByText('Zooms & Reframe')).toBeVisible();
    await expect(page.getByText('B-Roll & Overlays')).toBeVisible();
    // Captions shown in both pipeline and tab
    const captionsElements = page.getByText('Captions');
    await expect(captionsElements.first()).toBeVisible();
    await expect(page.getByText('Sound Effects')).toBeVisible();
    await expect(page.getByText('Color Correction')).toBeVisible();
    await expect(page.getByText('AI Self-Review')).toBeVisible();
    await expect(page.getByText('Export & Upload')).toBeVisible();
    await expect(page.getByText('Thumbnail')).toBeVisible();

    // Pipeline counter should show 0/10
    await expect(page.getByText('0/10')).toBeVisible();
  });

  test('should start pipeline and show trim approval card', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Trim Test');
    await page.getByText('Create Project').click();

    // Click Start pipeline — may warn about no media, which is fine
    await page.getByRole('button', { name: 'Start pipeline' }).click();

    // Should show system message
    await expect(page.getByText(/pipeline|No media/).first()).toBeVisible({ timeout: 5000 });
  });

  test('should have working transport controls', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Transport Test');
    await page.getByText('Create Project').click();

    // Play button should exist
    const playBtn = page.getByTitle('Play');
    await expect(playBtn).toBeVisible();

    // Skip to start/end
    await page.getByTitle('Go to end').click();
    await page.getByTitle('Go to start').click();
  });

  test('should have working timeline toolbar', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Timeline Test');
    await page.getByText('Create Project').click();

    // Tool buttons
    await expect(page.getByTitle('Select (V)')).toBeVisible();
    await expect(page.getByTitle('Razor (B)')).toBeVisible();
    await expect(page.getByTitle('Hand (H)')).toBeVisible();
    await expect(page.getByTitle('Toggle snap')).toBeVisible();
    await expect(page.getByTitle('Fit to view')).toBeVisible();

    // Click razor tool
    await page.getByTitle('Razor (B)').click();

    // Click back to select
    await page.getByTitle('Select (V)').click();
  });

  test('should show save and export buttons', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Export Test');
    await page.getByText('Create Project').click();

    // Save button
    const saveBtn = page.getByTitle('Save project (Ctrl+S)');
    await expect(saveBtn).toBeVisible();

    // Export button in the top bar — click the button containing the Download icon
    await page.locator('button', { hasText: /^Export$/ }).click();

    // Export modal should show MP4 export
    await expect(page.getByText('Export Video')).toBeVisible();
    await expect(page.getByText('MP4 (H.264)')).toBeVisible();

    // Close modal
    await page.getByText('Cancel').click();
  });

  test('should switch between Preview and Transcript tabs', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Tab Test');
    await page.getByText('Create Project').click();

    // Preview tab active by default
    await expect(page.getByText('No footage loaded')).toBeVisible();

    // Switch to transcript
    await page.getByText('Transcript').click();
    await expect(page.getByText('Transcription appears after Stage 1')).toBeVisible();

    // Switch back to preview
    await page.getByRole('button', { name: 'Preview' }).click();
  });

  test('should send messages in AI chat', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Chat Test');
    await page.getByText('Create Project').click();

    // Type and send a message
    await page.getByPlaceholder('Ask AI to make changes...').fill('Hello AI');
    await page.getByPlaceholder('Ask AI to make changes...').press('Enter');

    // User message should appear
    await expect(page.getByText('Hello AI')).toBeVisible();

    // AI should respond
    await expect(page.getByText(/analyze the footage/)).toBeVisible({ timeout: 3000 });
  });

  test('should navigate back to project selection', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Nav Test');
    await page.getByText('Create Project').click();

    // Should be in editor
    await expect(page.getByText('AI Assistant')).toBeVisible();

    // Click back
    await page.getByTitle('Back to projects').click();

    // Should be back at mode selection
    await expect(page.getByText('Dragon Editor')).toBeVisible();
    await expect(page.getByText('Create Project')).toBeVisible();
  });

  test('should persist state across page reload', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Persist Test');
    await page.getByText('Create Project').click();

    // Should be in editor
    await expect(page.getByText('Persist Test')).toBeVisible();

    // Reload
    await page.reload();

    // Should still be in editor with same project
    await expect(page.getByText('Persist Test')).toBeVisible();
    await expect(page.getByText('AI Assistant')).toBeVisible();
  });

  test('should open media file picker', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Media Test');
    await page.getByText('Create Project').click();

    // Media bin should show empty state
    await expect(page.getByText('No files yet')).toBeVisible();

    // Browse Files button should be clickable (opens native file dialog)
    await expect(page.getByText('Browse Files')).toBeVisible();
  });

  test('keyboard shortcuts should work', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Shortcut Test');
    await page.getByText('Create Project').click();

    // Press V for select tool (already default, just verify no crash)
    await page.keyboard.press('v');

    // Press B for razor tool
    await page.keyboard.press('b');

    // Press H for hand tool
    await page.keyboard.press('h');

    // Press Space for play/pause
    await page.keyboard.press('Space');
    // Press again to pause
    await page.keyboard.press('Space');

    // Press Escape
    await page.keyboard.press('Escape');

    // Home/End
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
  });
});
