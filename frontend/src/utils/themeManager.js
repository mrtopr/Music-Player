/**
 * Theme Manager (Mehfil)
 * Handles dynamic skinning and professional mood-based animations.
 */

import { getThemeForCategory, moodThemes } from './moodThemes.js';
import { moodAnimations } from './moodAnimations.js';

class ThemeManager {
    constructor() {
        this.currentMood = 'default';
        this.activeAnimationClass = '';
    }

    init() {
        const savedMood = localStorage.getItem('mehfil_current_mood');
        if (savedMood) {
            this.applyTheme(savedMood, false);
        }
    }

    applyTheme(category, animate = true) {
        const theme = getThemeForCategory(category);
        
        // Find the mood keys
        const moodKey = Object.keys(moodThemes).find(key => 
            moodThemes[key].name.toLowerCase() === category.toLowerCase()
        ) || 'default';

        const animation = moodAnimations[moodKey] || moodAnimations.default;

        if (animate) {
            document.body.classList.add('theme-transitioning');
        }

        // 1. Remove old animation class if any
        if (this.activeAnimationClass) {
            document.body.classList.remove(this.activeAnimationClass);
        }

        // 2. Apply new visual markers
        document.body.setAttribute('data-mood', moodKey);
        
        // 3. Apply the new professional animation class
        if (animation && animation.animationClass) {
            document.body.classList.add(animation.animationClass);
            this.activeAnimationClass = animation.animationClass;
        }

        this.currentMood = moodKey;
        
        // 4. Save to localStorage
        localStorage.setItem('mehfil_current_mood', category);

        if (animate) {
            setTimeout(() => {
                document.body.classList.remove('theme-transitioning');
            }, 600);
        }

        // Emit global event for components that might want to listen
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme, category, moodKey, animation }
        }));
    }
}

export const themeManager = new ThemeManager();
export default themeManager;
