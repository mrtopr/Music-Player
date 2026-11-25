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
    root.style.setProperty('--shadow-glow', `rgba(${theme.accentPrimaryRGB}, 0.08)`);

    // Brand compatibility variables
    root.style.setProperty('--mehfil-gold-primary', theme.accentPrimary);
    root.style.setProperty('--mehfil-gold-soft', theme.accentSecondary);
    root.style.setProperty('--mehfil-gold-glow', theme.shadowAccent);
    root.style.setProperty('--mehfil-accent-blue', theme.accentSecondary);

    // Surfaces & Borders
    root.style.setProperty('--bg-main', theme.bgMain);
    root.style.setProperty('--bg-dark', theme.bgMain);
    root.style.setProperty('--bg-card', theme.bgCard);
    root.style.setProperty('--bg-sidebar', theme.bgSidebar);
    root.style.setProperty('--card-bg', theme.bgCard);
    root.style.setProperty('--card-hover', `rgba(${theme.accentPrimaryRGB}, 0.08)`);
    root.style.setProperty('--border-color', `rgba(${theme.accentPrimaryRGB}, 0.14)`);
    root.style.setProperty('--border-subtle', `rgba(${theme.accentPrimaryRGB}, 0.08)`);
    root.style.setProperty('--border-light', `rgba(${theme.accentPrimaryRGB}, 0.12)`);
    root.style.setProperty('--border-medium', `rgba(${theme.accentPrimaryRGB}, 0.20)`);
    root.style.setProperty('--mehfil-dark-base', theme.bgMain);
    root.style.setProperty('--mehfil-surface-card', theme.bgCard);

    // Gradients & Hero
    root.style.setProperty('--hero-gradient', theme.heroGradient);
    root.style.setProperty('--gradient-accent', `linear-gradient(135deg, rgba(${theme.accentPrimaryRGB}, 0.15), rgba(${theme.accentSecondaryRGB}, 0.06))`);
    root.style.setProperty('--gradient-brand', `linear-gradient(135deg, ${theme.accentPrimary} 0%, ${theme.accentSecondary} 55%, ${theme.accentHover} 100%)`);
    root.style.setProperty('--gradient-brand-hover', `linear-gradient(135deg, ${theme.accentHover} 0%, ${theme.accentPrimary} 55%, ${theme.accentSecondary} 100%)`);
    root.style.setProperty('--gradient-text', `linear-gradient(90deg, ${theme.accentSecondary} 0%, ${theme.accentPrimary} 55%, ${theme.accentHover} 100%)`);
    root.style.setProperty('--fullscreen-bg', `linear-gradient(135deg, ${theme.bgCard} 0%, ${theme.bgMain} 55%, ${theme.bgSidebar} 100%)`);
    root.style.setProperty('--fullscreen-border', `rgba(${theme.accentPrimaryRGB}, 0.16)`);
    root.style.setProperty('--fullscreen-accent', theme.accentPrimary);
    root.style.setProperty('--fullscreen-accent-secondary', theme.accentSecondary);
    root.style.setProperty('--fullscreen-glow', `0 4px 16px rgba(${theme.accentPrimaryRGB}, 0.14)`);

    // Logo & Typography tokens
    root.style.setProperty('--logo-filter', theme.logoFilter || 'none');
    root.style.setProperty('--font-display', theme.fontDisplay || "'Plus Jakarta Sans', 'Outfit', sans-serif");
    root.style.setProperty('--font-body', theme.fontBody || "'Plus Jakarta Sans', 'Outfit', sans-serif");
    root.style.setProperty('--heading-tracking', theme.headingTracking || '-0.02em');
    root.style.setProperty('--heading-weight', theme.headingWeight || '800');
    root.style.setProperty('--text-on-accent', theme.textOnAccent || '#FFFFFF');

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

function buildSplashPolygon(cx, cy, baseRadius) {
    const points = [];
    const steps = 28;
    for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        // Organic irregular multi-lobe splash modulation
        const modulation =
            1 +
            0.22 * Math.sin(angle * 5 + 0.4) +
            0.14 * Math.cos(angle * 3 - 0.8) +
            0.08 * Math.sin(angle * 7 + 1.1);
        const r = baseRadius * modulation;
        const px = (cx + Math.cos(angle) * r).toFixed(1);
        const py = (cy + Math.sin(angle) * r).toFixed(1);
        points.push(`${px}px ${py}px`);
    }
    return `polygon(${points.join(', ')})`;
}

export const useUniverseStore = create((set, get) => ({
    activeUniverseId: initialId,
    activeUniverse: getUniverseConfig(initialId),
    splashEvent: null,

    setUniverse: (id, origin) => {
        const universe = getUniverseConfig(id);
        try {
            localStorage.setItem(STORAGE_KEY, universe.id);
        } catch {
            // Ignore storage write errors
        }

        const x = typeof origin?.x === 'number' ? origin.x : (typeof window !== 'undefined' ? window.innerWidth * 0.82 : 400);
        const y = typeof origin?.y === 'number' ? origin.y : 36;

        const applyChange = () => {
            applyUniverseStyles(universe.id);
            set({
                activeUniverseId: universe.id,
                activeUniverse: universe,
                splashEvent: {
                    id: Date.now() + Math.random(),
                    x,
                    y,
                    color: universe.theme.accentPrimary,
                    secondaryColor: universe.theme.accentSecondary
                }
            });
        };

        const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function' && !prefersReduced) {
            const endRadius = Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y)
            );
            const startPoly = buildSplashPolygon(x, y, 2);
            // Divide by minimum lobe factor (~0.56) so all inward curves still clear screen corners
            const endPoly = buildSplashPolygon(x, y, endRadius / 0.56);

            const transition = document.startViewTransition(() => {
                applyChange();
            });
            transition.ready.then(() => {
                document.documentElement.animate(
                    {
                        clipPath: [startPoly, endPoly]
                    },
                    {
                        duration: 1350,
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        pseudoElement: '::view-transition-new(root)'
                    }
                );
            }).catch(() => {});
        } else {
            applyChange();
        }
    },

    applyUniverseTheme: () => {
        applyUniverseStyles(get().activeUniverseId);
    }
}));
