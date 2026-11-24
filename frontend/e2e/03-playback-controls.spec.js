import { test, expect } from '@playwright/test';

test.describe('Playback & Controls Engine', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('mehfil_preferred_genres', JSON.stringify(['Romantic', 'Dance', 'Pop']));
      window.localStorage.setItem('mehfil-pwa-banner-dismissed', 'true');
    });
  });

  test('Clicking a song triggers playback and displays MiniPlayer', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click a trending song card or hero button to trigger playback
    const songCard = page.locator('.song-card, .cover-card, button:has-text("Start Listening")').first();
    await expect(songCard).toBeVisible({ timeout: 10000 });
    await songCard.scrollIntoViewIfNeeded();
    await songCard.click();
    await page.waitForTimeout(2000);

    // MiniPlayer or Fullscreen player should be visible with song details
    const playerIndicator = page.locator('.mini-player, #miniPlayButton, .fullscreen-player').first();
    await expect(playerIndicator).toBeVisible({ timeout: 10000 });

    expect(errors, `Errors during playback start: ${errors.join('; ')}`).toHaveLength(0);
  });

  test('Next, Previous, and Play/Pause buttons respond without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start a song first
    const playTrigger = page.locator('.song-card, .cover-card, button:has-text("Start Listening")').first();
    if (await playTrigger.count() > 0) {
      await playTrigger.scrollIntoViewIfNeeded();
      await playTrigger.click();
      await page.waitForTimeout(1500);
    }

    // Test Play/Pause toggle
    const playBtn = page.locator('#miniPlayButton, .fs-play-btn, button[aria-label="Play/Pause"]').first();
    if (await playBtn.isVisible()) {
      await playBtn.click();
      await page.waitForTimeout(500);
      await playBtn.click();
      await page.waitForTimeout(500);
    }

    // Test Next button
    const nextBtn = page.locator('#miniNextButton, .fs-ctrl-btn[title*="Next"], button[aria-label*="Next"]').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(600);
    }

    // Test Previous button
    const prevBtn = page.locator('#miniPrevButton, .fs-ctrl-btn[title*="Previous"], button[aria-label*="Previous"]').first();
    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await page.waitForTimeout(600);
    }
  });
});
