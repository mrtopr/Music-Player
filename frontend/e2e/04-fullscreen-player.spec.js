import { test, expect } from '@playwright/test';

test.describe('Fullscreen Player & Audio Modals', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('mehfil_preferred_genres', JSON.stringify(['Romantic', 'Dance', 'Pop']));
      window.localStorage.setItem('mehfil-pwa-banner-dismissed', 'true');
    });
  });

  test('Expand FullscreenPlayer, test Lyrics, EQ, and Download button', async ({ page, isMobile }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger playback
    const playTrigger = page.locator('.song-card, .cover-card, button:has-text("Start Listening")').first();
    await expect(playTrigger).toBeVisible({ timeout: 10000 });
    await playTrigger.scrollIntoViewIfNeeded();
    await playTrigger.click();
    await page.waitForTimeout(2000);

    // Expand fullscreen player
    const expandBtn = page.locator('#expandPlayer, button[aria-label="Expand player"], #miniPlayerInfo').first();
    await expect(expandBtn).toBeVisible({ timeout: 10000 });
    await expandBtn.click();
    await page.waitForTimeout(1000);

    const fsPlayer = page.locator('#fullscreenPlayerV3');
    await expect(fsPlayer).toHaveClass(/active/, { timeout: 8000 });

    // Test Equalizer button inside FullscreenPlayer
    const eqBtn = page.locator('#fullscreenPlayerV3 [aria-label="Audio Equalizer"], #fullscreenPlayerV3 button:has-text("EQ")').first();
    if (await eqBtn.isVisible()) {
      await eqBtn.scrollIntoViewIfNeeded();
      await eqBtn.click();
      const eqModal = page.locator('.modal-content, .modal-overlay').first();
      if (await eqModal.isVisible({ timeout: 4000 }).catch(() => false)) {
        const closeBtn = page.locator('.modal-content button, [aria-label="Close"]').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Wait for any overlay transitions to settle
    await page.waitForTimeout(600);

    // Test Lyrics button inside FullscreenPlayer
    const lyricsBtn = page.locator('#fullscreenPlayerV3 button:has-text("Lyrics"), #fullscreenPlayerV3 .fs-mobile-lyrics-drawer-trigger').first();
    if (await lyricsBtn.isVisible()) {
      await lyricsBtn.scrollIntoViewIfNeeded();
      await lyricsBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Test Download button inside FullscreenPlayer
    const downloadBtn = page.locator('#fullscreenPlayerV3 .fs-util-btn:has-text("Download"), #fullscreenPlayerV3 .fs-util-btn:has-text("Saved")').first();
    if (await downloadBtn.isVisible()) {
      await downloadBtn.scrollIntoViewIfNeeded();
      await downloadBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await expect(downloadBtn).toBeVisible();
    }

    expect(errors, `Errors in FullscreenPlayer: ${errors.join('; ')}`).toHaveLength(0);
  });
});
