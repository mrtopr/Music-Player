import React, { useEffect, useState } from 'react';
import { useUniverseStore } from '../../store/useUniverseStore';

// Irregular closed organic water-splash curve (smooth Catmull-Rom / cubic Bezier lobes)
const SPLASH_PATH_PRIMARY =
    'M 0,-78 C 18,-92 34,-66 52,-68 C 72,-70 88,-46 74,-22 C 92,-4 96,18 76,34 C 84,56 64,78 42,68 C 24,90 -4,94 -20,74 C -44,88 -70,74 -66,48 C -92,38 -94,12 -74,-8 C -90,-30 -74,-60 -48,-54 C -34,-76 -16,-66 0,-78 Z';

const SPLASH_PATH_SECONDARY =
    'M 8,-84 C 28,-74 44,-84 62,-62 C 84,-48 72,-20 88,-2 C 86,24 68,38 72,58 C 56,82 28,74 10,88 C -16,84 -30,66 -54,70 C -78,56 -74,28 -88,8 C -82,-18 -64,-28 -68,-52 C -50,-74 -22,-66 -6,-82 Z';

export default function ThemeSplashOverlay() {
    const splashEvent = useUniverseStore(s => s.splashEvent);
    const [activeSplash, setActiveSplash] = useState(null);

    useEffect(() => {
        if (!splashEvent) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        setActiveSplash(splashEvent);
        const timer = setTimeout(() => {
            setActiveSplash(prev => (prev?.id === splashEvent.id ? null : prev));
        }, 780);

        return () => clearTimeout(timer);
    }, [splashEvent]);

    if (!activeSplash) return null;

    const { id, x, y, color, secondaryColor } = activeSplash;
    const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );
    // Scale so even inward curve valleys clear the viewport corners
    const size = Math.ceil((maxRadius / 0.56) * 2.1);

    return (
        <div
            key={id}
            className="theme-splash-overlay"
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 99999,
                overflow: 'hidden'
            }}
        >
            {/* Primary irregular liquid splash wash & outline */}
            <svg
                viewBox="-100 -100 200 200"
                className="water-splash-wash"
                style={{
                    position: 'fixed',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    marginLeft: `${-size / 2}px`,
                    marginTop: `${-size / 2}px`,
                    overflow: 'visible'
                }}
            >
                <defs>
                    <radialGradient id={`splash-grad-${Math.floor(id)}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                        <stop offset="48%" stopColor={secondaryColor} stopOpacity="0.10" />
                        <stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
                    </radialGradient>
                </defs>
                <path
                    d={SPLASH_PATH_PRIMARY}
                    fill={`url(#splash-grad-${Math.floor(id)})`}
                    stroke={color}
                    strokeWidth="0.9"
                    strokeOpacity="0.65"
                />
                {/* Organic splash droplets */}
                <circle cx="86" cy="-42" r="2.2" fill={color} fillOpacity="0.6" />
                <circle cx="-84" cy="24" r="2.6" fill={secondaryColor} fillOpacity="0.55" />
                <circle cx="28" cy="88" r="1.9" fill={color} fillOpacity="0.55" />
                <circle cx="-46" cy="-76" r="2.1" fill={secondaryColor} fillOpacity="0.5" />
            </svg>

            {/* Secondary staggered irregular ripple curve */}
            <svg
                viewBox="-100 -100 200 200"
                className="water-ripple-ring-delayed"
                style={{
                    position: 'fixed',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    marginLeft: `${-size / 2}px`,
                    marginTop: `${-size / 2}px`,
                    overflow: 'visible'
                }}
            >
                <path
                    d={SPLASH_PATH_SECONDARY}
                    fill="none"
                    stroke={secondaryColor}
                    strokeWidth="0.7"
                    strokeOpacity="0.5"
                />
            </svg>
        </div>
    );
}
