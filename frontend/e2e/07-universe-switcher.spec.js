import { test, expect } from '@playwright/test';

test.describe('Multi-Universe Dynamic Persona Switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('mehfil_preferred_genres', JSON.stringify(['Romantic', 'Dance', 'Pop']));
      window.localStorage.setItem('mehfil-pwa-banner-dismissed', 'true');
    });
  });

  test('Universe switcher is visible and updates CSS theme, hero copy, and localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const switcherBtn = page.getByTestId('universe-switcher-btn');
    await expect(switcherBtn).toBeVisible({ timeout: 10000 });

    // Default should be Bollywood (#10B981)
    const defaultAccent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim()
    );
    expect(defaultAccent.toLowerCase()).toBe('#10b981');

    // Open dropdown and switch to Desi Hip-Hop
    await switcherBtn.click();
    await expect(page.getByTestId('universe-dropdown')).toBeVisible();
    await page.getByTestId('universe-option-hiphop').click();

    // Verify CSS variable, data-universe, and localStorage updated
    const hiphopAccent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim()
    );
    expect(hiphopAccent.toLowerCase()).toBe('#f97316');

    const dataUniverse = await page.evaluate(() => document.documentElement.getAttribute('data-universe'));
    expect(dataUniverse).toBe('hiphop');

    const saved = await page.evaluate(() => window.localStorage.getItem('mehfil_active_universe'));
    expect(saved).toBe('hiphop');

    // Verify Home hero reflects Hip-Hop universe
    await expect(page.locator('text=Gully To Glory')).toBeVisible();

    // Switch to 90s Retro and verify persistence across reload
    await switcherBtn.click();
    await page.getByTestId('universe-option-nineties').click();
    await expect(page.locator('text=Golden Tape Rewind')).toBeVisible();

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const persisted = await page.evaluate(() => window.localStorage.getItem('mehfil_active_universe'));
    expect(persisted).toBe('nineties');
    await expect(page.locator('text=Golden Tape Rewind')).toBeVisible();
  });

  test('Search page displays universe-specific trending searches', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const switcherBtn = page.getByTestId('universe-switcher-btn');
    await switcherBtn.click();
    await page.getByTestId('universe-option-bhojpuri').click();

    await expect(page.locator('text=Trending in Bhojpuri Dhamaka')).toBeVisible();
    await expect(page.locator('.trending-search-pill:has-text("Pawan Singh")')).toBeVisible();

    await switcherBtn.click();
    await page.getByTestId('universe-option-english').click();

    await expect(page.locator('text=Trending in English / Global')).toBeVisible();
    await expect(page.locator('.trending-search-pill:has-text("The Weeknd")')).toBeVisible();
  });

  test('Switching universe does not interrupt active playback', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for trending song cards and play the first one
    const firstCard = page.locator('.song-card').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    await firstCard.click();

    // MiniPlayer should appear
    const miniPlayer = page.locator('.mini-player').first();
    await expect(miniPlayer).toBeVisible({ timeout: 10000 });

    const initialTitle = await page.locator('.mini-player .mini-player-titles').first().textContent();

    // Switch universe while playing
    await page.getByTestId('universe-switcher-btn').click();
    await page.getByTestId('universe-option-hiphop').click();

    // MiniPlayer must still be visible with the exact same track
    await expect(miniPlayer).toBeVisible();
    const afterTitle = await page.locator('.mini-player .mini-player-titles').first().textContent();
    expect(afterTitle).toBe(initialTitle);
  });
});
