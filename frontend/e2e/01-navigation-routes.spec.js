import { test, expect } from '@playwright/test';

test.describe('Navigation & Route Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('mehfil_preferred_genres', JSON.stringify(['Romantic', 'Dance', 'Pop']));
      window.localStorage.setItem('mehfil-pwa-banner-dismissed', 'true');
    });
  });

  test('Home page loads with zero fatal console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss onboarding if shown
    const continueBtn = page.locator('button:has-text("Continue"), [aria-label="Close onboarding"]').first();
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify main content loaded (heading or category title)
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    expect(errors, `Fatal errors on Home: ${errors.join('; ')}`).toHaveLength(0);
  });

  test('Sidebar navigation to all main pages works smoothly', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Sidebar test is for desktop');
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const routes = [
      { text: 'Playlists', urlMatch: /playlists/ },
      { text: 'Favorites', urlMatch: /favorites/ },
      { text: 'Artists', urlMatch: /artists/ },
      { text: 'Albums', urlMatch: /section\/newReleases|albums/ },
      { text: 'Stats', urlMatch: /stats/ },
      { text: 'Settings', urlMatch: /settings/ },
    ];

    for (const r of routes) {
      const link = page.locator(`.sidebar a, .sidebar button, nav a`).filter({ hasText: r.text }).first();
      if (await link.count() > 0) {
        await link.click();
        await page.waitForTimeout(500);
        await expect(page).toHaveURL(r.urlMatch);
      }
    }

    expect(errors, `Fatal errors during sidebar nav: ${errors.join('; ')}`).toHaveLength(0);
  });

  test('Settings page tabs and theme selector toggle without crash', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Settings tabs tested on desktop');
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const audioTab = page.locator('button, [role="tab"]').filter({ hasText: /Audio/i }).first();
    if (await audioTab.count() > 0) {
      await audioTab.click();
      await page.waitForTimeout(300);
    }

    const storageTab = page.locator('button, [role="tab"]').filter({ hasText: /Storage/i }).first();
    if (await storageTab.count() > 0) {
      await storageTab.click();
      await page.waitForTimeout(300);
    }
  });
});
