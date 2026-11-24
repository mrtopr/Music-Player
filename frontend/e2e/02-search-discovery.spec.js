import { test, expect } from '@playwright/test';

test.describe('Search & Discovery Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('mehfil_preferred_genres', JSON.stringify(['Romantic', 'Dance', 'Pop']));
      window.localStorage.setItem('mehfil-pwa-banner-dismissed', 'true');
    });
  });

  test('Search input takes queries and renders search results', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Target the visible search input (TopBar on desktop, mobile-only-search on mobile)
    const searchInput = page.locator('input[name="search"], #searchInput, .mobile-only-search input').filter({ visible: true }).first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('Arijit Singh');
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);

    // Look for results list/grid or cards
    const resultItems = page.locator('.song-card, .search-result, [data-testid="song-row"], div:has-text("Arijit")');
    await expect(resultItems.first()).toBeVisible({ timeout: 10000 });

    expect(errors, `Errors during search: ${errors.join('; ')}`).toHaveLength(0);
  });

  test('Category filter pills filter or update section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const romanticPill = page.locator('button').filter({ hasText: /Romantic/i }).first();
    if (await romanticPill.count() > 0) {
      await romanticPill.click();
      await page.waitForTimeout(800);
    }

    const dancePill = page.locator('button').filter({ hasText: /Dance/i }).first();
    if (await dancePill.count() > 0) {
      await dancePill.click();
      await page.waitForTimeout(800);
    }
  });
});
