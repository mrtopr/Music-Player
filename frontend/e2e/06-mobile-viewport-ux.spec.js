import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport & UX Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('mehfil_preferred_genres', JSON.stringify(['Romantic', 'Dance', 'Pop']));
      window.localStorage.setItem('mehfil-pwa-banner-dismissed', 'true');
    });
  });

  test('Mobile viewport navigation and player buttons render cleanly without white boxes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-specific test');
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mobile bottom navigation bar check
    const bottomNav = page.locator('.mobile-nav, nav, .mobile-tab-bar').first();
    await expect(bottomNav).toBeVisible({ timeout: 5000 });

    // Play a song
    const songCard = page.locator('.song-card, button:has-text("Start Listening")').first();
    if (await songCard.count() > 0) {
      await songCard.click();
      await page.waitForTimeout(1500);
    }

    // Tap mini player to open mobile fullscreen player
    const miniPlayer = page.locator('.mini-player').first();
    if (await miniPlayer.isVisible()) {
      await miniPlayer.click();
      await page.waitForTimeout(1000);

      // Check mobile action row buttons
      const actionButtons = page.locator('.fs-action-circle-btn');
      if (await actionButtons.count() > 0) {
        // Assert they have rounded style and not white unstyled buttons
        const firstBtn = actionButtons.first();
        const borderRadius = await firstBtn.evaluate(el => window.getComputedStyle(el).borderRadius);
        expect(borderRadius).toMatch(/50%|9999px|4[0-9]px/);
      }
    }

    expect(errors, `Errors on mobile view: ${errors.join('; ')}`).toHaveLength(0);
  });
});
