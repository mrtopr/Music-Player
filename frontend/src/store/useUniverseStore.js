import { create } from 'zustand';
import { UNIVERSES, DEFAULT_UNIVERSE, getUniverseConfig } from '../config/universes';

const STORAGE_KEY = 'mehfil_active_universe';

function getInitialUniverseId() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && UNIVERSES[saved]) {
            return saved;
        }
    } catch {
        // Ignore storage access errors in restricted environments
    }
    return DEFAULT_UNIVERSE;
}

/**
 * Injects the active universe's CSS variables onto document.documentElement
 * and updates body universe classes without touching audio/playback state.
 */
export function applyUniverseStyles(universeId) {
    if (typeof document === 'undefined') return;
    const universe = getUniverseConfig(universeId);
    const { theme } = universe;
    const root = document.documentElement;

    root.setAttribute('data-universe', universe.id);

    // Core CSS variables used across TopBar, Home, Search, FullscreenPlayer, MiniPlayer
    root.style.setProperty('--accent-primary', theme.accentPrimary);
    root.style.setProperty('--accent-primary-rgb', theme.accentPrimaryRGB);
    root.style.setProperty('--accent-primary-soft', theme.accentSoft);
    root.style.setProperty('--accent-hover', theme.accentHover);

    root.style.setProperty('--accent-secondary', theme.accentSecondary);
    root.style.setProperty('--accent-secondary-rgb', theme.accentSecondaryRGB);
    root.style.setProperty('--accent-secondary-soft', `rgba(${theme.accentSecondaryRGB}, 0.12)`);

    root.style.setProperty('--border-accent', theme.borderAccent);
    root.style.setProperty('--shadow-accent', theme.shadowAccent);
    root.style.setProperty('--shadow-glow', `rgba(${theme.accentPrimaryRGB}, 0.18)`);

    // Brand compatibility variables
    root.style.setProperty('--mehfil-gold-primary', theme.accentPrimary);
    root.style.setProperty('--mehfil-gold-soft', theme.accentSecondary);
    root.style.setProperty('--mehfil-gold-glow', theme.shadowAccent);
    root.style.setProperty('--mehfil-accent-blue', theme.accentSecondary);

    // Surfaces
    root.style.setProperty('--bg-main', theme.bgMain);
    root.style.setProperty('--bg-card', theme.bgCard);
    root.style.setProperty('--bg-sidebar', theme.bgSidebar);
    root.style.setProperty('--card-bg', theme.bgCard);
    root.style.setProperty('--mehfil-dark-base', theme.bgMain);
    root.style.setProperty('--mehfil-surface-card', theme.bgCard);

    // Gradients & Hero
    root.style.setProperty('--hero-gradient', theme.heroGradient);
    root.style.setProperty('--gradient-brand', `linear-gradient(135deg, ${theme.accentPrimary} 0%, ${theme.accentSecondary} 55%, ${theme.accentHover} 100%)`);
    root.style.setProperty('--gradient-text', `linear-gradient(90deg, ${theme.accentSecondary} 0%, ${theme.accentPrimary} 55%, ${theme.accentHover} 100%)`);
    root.style.setProperty('--fullscreen-accent', theme.accentPrimary);
    root.style.setProperty('--fullscreen-accent-secondary', theme.accentSecondary);
    root.style.setProperty('--fullscreen-glow', `0 0 25px rgba(${theme.accentPrimaryRGB}, 0.35)`);

    // Ambient Mesh Blobs
    if (theme.blobs && theme.blobs.length >= 5) {
        root.style.setProperty('--blob-1', theme.blobs[0]);
        root.style.setProperty('--blob-2', theme.blobs[1]);
        root.style.setProperty('--blob-3', theme.blobs[2]);
        root.style.setProperty('--blob-4', theme.blobs[3]);
        root.style.setProperty('--blob-5', theme.blobs[4]);
    }

    // Update body class for universe-specific skin accents (e.g., 90s grain, DHH high-contrast)
    if (document.body) {
        Object.keys(UNIVERSES).forEach(id => {
            document.body.classList.remove(`universe-${id}`);
        });
        document.body.classList.add(`universe-${universe.id}`);
    }
}

const initialId = getInitialUniverseId();
applyUniverseStyles(initialId);

export const useUniverseStore = create((set, get) => ({
    activeUniverseId: initialId,
    activeUniverse: getUniverseConfig(initialId),

    setUniverse: (id) => {
        const universe = getUniverseConfig(id);
        try {
            localStorage.setItem(STORAGE_KEY, universe.id);
        } catch {
            // Ignore storage write errors
        }
        applyUniverseStyles(universe.id);
        set({
            activeUniverseId: universe.id,
            activeUniverse: universe
        });
    },

    applyUniverseTheme: () => {
        applyUniverseStyles(get().activeUniverseId);
    }
}));
