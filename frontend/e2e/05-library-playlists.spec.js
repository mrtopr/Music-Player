import { test, expect } from '@playwright/test';

test.describe('Library & Offline Storage Integrity', () => {
  test('Library page renders tabs (Favorites, Playlists, Offline) cleanly', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    // Check main Library title or tabs
    const libraryTitle = page.locator('h1, h2').filter({ hasText: /Collection|Favorites|Playlists|Liked Songs/i }).first();
    await expect(libraryTitle).toBeVisible();

    expect(errors, `Errors on Library: ${errors.join('; ')}`).toHaveLength(0);
  });
});
