import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 *
 * These tests screenshot every major UI state and compare against baselines.
 * First run creates the baselines in e2e/visual-regression.spec.ts-snapshots/
 * Subsequent runs compare and fail if the UI changed unexpectedly.
 *
 * To update baselines after intentional changes:
 *   npx playwright test --update-snapshots
 */

test.describe('Visual Regression — Mode Select', () => {
  test('mode selection screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('mode-select-screen.png');
  });

  test('mode card selection highlight', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Long-Form Editor').click();
    await expect(page).toHaveScreenshot('mode-select-longform.png');
  });

  test('style picker selection', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Education').click();
    await expect(page).toHaveScreenshot('mode-select-education.png');
  });

  test('create button enabled with name', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Visual Test');
    await expect(page).toHaveScreenshot('mode-select-name-filled.png');
  });
});

test.describe('Visual Regression — Editor Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Visual Test');
    await page.getByText('Create Project').click();
    await page.waitForLoadState('networkidle');
  });

  test('empty editor layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('editor-empty.png');
  });

  test('transcript tab view', async ({ page }) => {
    await page.getByText('Transcript').click();
    await expect(page).toHaveScreenshot('editor-transcript-tab.png');
  });

  test('timeline toolbar — razor tool selected', async ({ page }) => {
    await page.getByTitle('Razor (B)').click();
    await expect(page).toHaveScreenshot('editor-razor-tool.png');
  });

  test('export modal open', async ({ page }) => {
    await page.locator('button', { hasText: /^Export$/ }).click();
    await page.waitForSelector('text=Export Video');
    await expect(page).toHaveScreenshot('export-modal-video.png');
  });

  test('export modal — project file tab', async ({ page }) => {
    await page.locator('button', { hasText: /^Export$/ }).click();
    await page.getByText('Project File').click();
    await expect(page).toHaveScreenshot('export-modal-project.png');
  });
});

test.describe('Visual Regression — Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('My awesome video...').fill('Pipeline Visual');
    await page.getByText('Create Project').click();
  });

  test('pipeline stepper — all stages pending', async ({ page }) => {
    // Full page screenshot captures all panels including pipeline
    await expect(page).toHaveScreenshot('pipeline-all-pending.png');
  });

  test('pipeline stepper — collapsed', async ({ page }) => {
    await page.getByRole('button', { name: /Pipeline \d+/ }).click(); // collapse
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('pipeline-collapsed.png');
  });
});
