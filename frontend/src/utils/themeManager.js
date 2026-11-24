/**
 * Mehfil Multi-Theme Engine
 * Allows users to choose and switch between beautifully curated aesthetic themes:
 * - Emerald Aurora (Vibrant emerald & mint with obsidian darks)
 * - Royal Purple (Cyberpunk violet & lavender glow with midnight darks)
 * - Sunset Crimson (Romantic rose gold & blush coral with velvet darks)
 * - Noir Gold (Warm classical amber & champagne gold with luxury darks)
 * - Obsidian Mono (Minimalist platinum & silver with deep black)
 */

export const THEMES = [
    {
        id: 'emerald',
        name: 'Emerald Aurora',
        tagline: 'Luminous emerald & mint glow',
        primary: '#10B981',
        primaryRgb: '16, 185, 129',
        secondary: '#34D399',
        secondaryRgb: '52, 211, 153',
        hover: '#059669',
        base: '#070A08',
        card: '#0E1712',
        sidebar: '#0C120E',
        hoverBg: '#14211A',
        textMuted: '#8BA89B',
        border: 'rgba(16, 185, 129, 0.15)',
        glow: 'rgba(16, 185, 129, 0.35)',
        blobs: [
            'rgba(16, 185, 129, 0.32)',
            'rgba(5, 150, 105, 0.22)',
            'rgba(52, 211, 153, 0.22)',
            'rgba(16, 185, 129, 0.24)',
            'rgba(4, 120, 87, 0.20)'
        ]
    },
    {
        id: 'purple',
        name: 'Royal Purple',
        tagline: 'Cyberpunk violet & lavender neon',
        primary: '#8B5CF6',
        primaryRgb: '139, 92, 246',
        secondary: '#C084FC',
        secondaryRgb: '192, 132, 252',
        hover: '#7C3AED',
        base: '#09080F',
        card: '#130F1E',
        sidebar: '#110F1D',
        hoverBg: '#1A1429',
        textMuted: '#A89CC8',
        border: 'rgba(139, 92, 246, 0.15)',
        glow: 'rgba(139, 92, 246, 0.35)',
        blobs: [
            'rgba(139, 92, 246, 0.32)',
            'rgba(124, 58, 237, 0.22)',
            'rgba(192, 132, 252, 0.22)',
            'rgba(168, 85, 247, 0.24)',
            'rgba(109, 40, 217, 0.20)'
        ]
    },
    {
        id: 'crimson',
        name: 'Sunset Crimson',
        tagline: 'Warm rose gold & velvet crimson',
        primary: '#F43F5E',
        primaryRgb: '244, 63, 94',
        secondary: '#FB7185',
        secondaryRgb: '251, 113, 133',
        hover: '#E11D48',
        base: '#0C0709',
        card: '#170D12',
        sidebar: '#130A0E',
        hoverBg: '#23121A',
        textMuted: '#BFA0A9',
        border: 'rgba(244, 63, 94, 0.15)',
        glow: 'rgba(244, 63, 94, 0.35)',
        blobs: [
            'rgba(244, 63, 94, 0.32)',
            'rgba(225, 29, 72, 0.22)',
            'rgba(251, 113, 133, 0.22)',
            'rgba(244, 63, 94, 0.24)',
            'rgba(190, 18, 60, 0.20)'
        ]
    },
    {
        id: 'gold',
        name: 'Noir Gold',
        tagline: 'Classical champagne & warm amber',
        primary: '#F59E0B',
        primaryRgb: '245, 158, 11',
        secondary: '#FBBF24',
        secondaryRgb: '251, 191, 36',
        hover: '#D97706',
        base: '#0A0906',
        card: '#14120A',
        sidebar: '#100E08',
        hoverBg: '#1C190F',
        textMuted: '#BDB399',
        border: 'rgba(245, 158, 11, 0.15)',
        glow: 'rgba(245, 158, 11, 0.35)',
        blobs: [
            'rgba(245, 158, 11, 0.32)',
            'rgba(217, 119, 6, 0.22)',
            'rgba(251, 191, 36, 0.22)',
            'rgba(245, 158, 11, 0.24)',
            'rgba(180, 83, 9, 0.20)'
        ]
    },
    {
        id: 'monochrome',
        name: 'Obsidian Mono',
        tagline: 'High-contrast platinum & deep black',
        primary: '#E4E4E7',
        primaryRgb: '228, 228, 231',
        secondary: '#A1A1AA',
        secondaryRgb: '161, 161, 170',
        hover: '#D4D4D8',
        base: '#050505',
        card: '#111111',
        sidebar: '#0B0B0B',
        hoverBg: '#181818',
        textMuted: '#A1A1AA',
        border: 'rgba(255, 255, 255, 0.12)',
        glow: 'rgba(255, 255, 255, 0.25)',
        blobs: [
            'rgba(255, 255, 255, 0.14)',
            'rgba(200, 200, 200, 0.10)',
            'rgba(160, 160, 160, 0.08)',
            'rgba(255, 255, 255, 0.08)',
            'rgba(120, 120, 120, 0.06)'
        ]
    }
];

class ThemeManager {
    constructor() {
        this.currentThemeId = 'emerald';
        this.listeners = new Set();
    }

    init() {
        try {
            const saved = localStorage.getItem('mehfil_theme');
            const targetTheme = saved && THEMES.some(t => t.id === saved) ? saved : 'emerald';
            this.applyTheme(targetTheme, false);
        } catch {
            this.applyTheme('emerald', false);
        }
    }

    getTheme() {
        try {
            const saved = localStorage.getItem('mehfil_theme');
            return saved && THEMES.some(t => t.id === saved) ? saved : this.currentThemeId;
        } catch {
            return this.currentThemeId;
        }
    }

    getThemeConfig(id = this.getTheme()) {
        return THEMES.find(t => t.id === id) || THEMES[0];
    }

    applyTheme(themeId, persist = true) {
        const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
        this.currentThemeId = theme.id;

        if (persist) {
            try {
                localStorage.setItem('mehfil_theme', theme.id);
            } catch (e) {
                console.warn('Failed to persist theme:', e);
            }
        }

        const root = document.documentElement;
        if (!root) return;

        // Set data-theme attribute
        root.setAttribute('data-theme', theme.id);

        // Core Brand Accents
        root.style.setProperty('--accent-primary', theme.primary);
        root.style.setProperty('--accent-primary-rgb', theme.primaryRgb);
        root.style.setProperty('--accent-primary-soft', `rgba(${theme.primaryRgb}, 0.15)`);
        root.style.setProperty('--accent-hover', theme.hover);

        root.style.setProperty('--accent-secondary', theme.secondary);
        root.style.setProperty('--accent-secondary-rgb', theme.secondaryRgb);
        root.style.setProperty('--accent-secondary-soft', `rgba(${theme.secondaryRgb}, 0.12)`);

        root.style.setProperty('--mehfil-gold-primary', theme.primary);
        root.style.setProperty('--mehfil-gold-soft', theme.secondary);
        root.style.setProperty('--mehfil-gold-glow', theme.glow);

        root.style.setProperty('--mehfil-accent-blue', theme.secondary);
        root.style.setProperty('--mehfil-accent-blue-glow', `rgba(${theme.secondaryRgb}, 0.4)`);

        // Backgrounds & Surfaces
        root.style.setProperty('--mehfil-dark-base', theme.base);
        root.style.setProperty('--mehfil-surface-card', theme.card);
        root.style.setProperty('--mehfil-surface-elevated', theme.hoverBg);

        root.style.setProperty('--bg-main', theme.base);
        root.style.setProperty('--bg-sidebar', theme.sidebar);
        root.style.setProperty('--bg-card', theme.card);
        root.style.setProperty('--bg-hover', theme.hoverBg);
        root.style.setProperty('--primary-bg', theme.base);
        root.style.setProperty('--secondary-bg', theme.card);
        root.style.setProperty('--tertiary-bg', theme.sidebar);
        root.style.setProperty('--card-bg', theme.card);

        // Text & Borders
        root.style.setProperty('--text-muted', theme.textMuted);
        root.style.setProperty('--mehfil-text-secondary', theme.textMuted);
        root.style.setProperty('--border-subtle', `rgba(${theme.primaryRgb}, 0.08)`);
        root.style.setProperty('--border-light', `rgba(${theme.primaryRgb}, 0.10)`);
        root.style.setProperty('--border-medium', `rgba(${theme.primaryRgb}, 0.18)`);
        root.style.setProperty('--border-accent', `rgba(${theme.primaryRgb}, 0.35)`);
        root.style.setProperty('--border-color', theme.border);
        root.style.setProperty('--mehfil-border', theme.border);
        root.style.setProperty('--shadow-accent', `rgba(${theme.primaryRgb}, 0.2)`);
        root.style.setProperty('--shadow-glow', `rgba(${theme.primaryRgb}, 0.15)`);

        // Gradients
        root.style.setProperty('--gradient-primary', `linear-gradient(180deg, ${theme.card} 0%, ${theme.base} 100%)`);
        root.style.setProperty('--gradient-accent', `linear-gradient(135deg, rgba(${theme.primaryRgb}, 0.15), rgba(${theme.secondaryRgb}, 0.05))`);
        root.style.setProperty('--gradient-text', `linear-gradient(90deg, ${theme.secondary} 0%, ${theme.primary} 50%, ${theme.hover} 100%)`);
        root.style.setProperty('--gradient-brand', `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.hover} 100%)`);
        root.style.setProperty('--gradient-brand-hover', `linear-gradient(135deg, ${theme.hover} 0%, ${theme.primary} 50%, ${theme.secondary} 100%)`);

        // Fullscreen Player
        root.style.setProperty('--fullscreen-bg', `linear-gradient(135deg, ${theme.card} 0%, ${theme.base} 50%, ${theme.sidebar} 100%)`);
        root.style.setProperty('--fullscreen-accent', theme.primary);
        root.style.setProperty('--fullscreen-accent-secondary', theme.secondary);
        root.style.setProperty('--fullscreen-glow', `0 0 25px rgba(${theme.primaryRgb}, 0.35)`);

        // Ambient Mesh Blobs
        if (theme.blobs && theme.blobs.length >= 5) {
            root.style.setProperty('--blob-1', theme.blobs[0]);
            root.style.setProperty('--blob-2', theme.blobs[1]);
            root.style.setProperty('--blob-3', theme.blobs[2]);
            root.style.setProperty('--blob-4', theme.blobs[3]);
            root.style.setProperty('--blob-5', theme.blobs[4]);
        }

        // Notify subscribers
        this.listeners.forEach(fn => fn(theme.id));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mehfil:theme-change', { detail: theme.id }));
        }
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

export const themeManager = new ThemeManager();
export default themeManager;
