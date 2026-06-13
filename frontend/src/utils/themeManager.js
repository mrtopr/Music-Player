/**
 * Theme Manager (Mehfil)
 * No-op version to maintain a single consistent brand theme (purple/cyan)
 * and prevent dynamic color shifting across categories.
 */

class ThemeManager {
    constructor() {
        this.currentMood = 'default';
    }

    init() {
        // No-op: keep fallback consistent
    }

    applyTheme(category, animate = true) {
        // No-op: do not change colors or data-mood attributes
    }
}

export const themeManager = new ThemeManager();
export default themeManager;
