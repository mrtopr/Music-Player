import React, { useEffect, useState } from 'react';
import { useUniverseStore } from '../../store/useUniverseStore';

export default function ThemeSplashOverlay() {
    const splashEvent = useUniverseStore(s => s.splashEvent);
    const [activeSplash, setActiveSplash] = useState(null);

    useEffect(() => {
        if (!splashEvent) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        setActiveSplash(splashEvent);
        const timer = setTimeout(() => {
            setActiveSplash(prev => (prev?.id === splashEvent.id ? null : prev));
        }, 760);

        return () => clearTimeout(timer);
    }, [splashEvent]);

    if (!activeSplash) return null;

    const { id, x, y, color, secondaryColor } = activeSplash;
    const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );
    const diameter = Math.ceil(maxRadius * 2);

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
            {/* Expanding liquid tint wash */}
            <div
                className="water-splash-wash"
                style={{
                    position: 'fixed',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    marginLeft: `${-diameter / 2}px`,
                    marginTop: `${-diameter / 2}px`,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}24 0%, ${secondaryColor}14 38%, transparent 70%)`
                }}
            />

            {/* Primary water ripple ring */}
            <div
                className="water-ripple-ring"
                style={{
                    position: 'fixed',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    marginLeft: `${-diameter / 2}px`,
                    marginTop: `${-diameter / 2}px`,
                    borderRadius: '50%',
                    border: `2px solid ${color}`
                }}
            />

            {/* Secondary trailing ripple wave */}
            <div
                className="water-ripple-ring water-ripple-ring-delayed"
                style={{
                    position: 'fixed',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    marginLeft: `${-diameter / 2}px`,
                    marginTop: `${-diameter / 2}px`,
                    borderRadius: '50%',
                    border: `1.5px solid ${secondaryColor}`
                }}
            />
        </div>
    );
}
