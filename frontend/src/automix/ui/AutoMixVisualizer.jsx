import React, { useEffect, useRef } from 'react';

/**
 * AutoMixVisualizer — a real audio-reactive visual.
 *
 * It reads the live spectrum from an AnalyserNode that is tapped off the
 * master bus, so the bars follow the actual audio (not a fake animation).
 * Two canvases can be layered to visualise the outgoing and incoming deck
 * during a blend.
 *
 * Falls back to a gentle idle animation when no analyser is available.
 */
export default function AutoMixVisualizer({
    analyser,
    color = '#8B5CF6',
    secondaryColor = '#10B981',
    bars = 56,
    height = 120,
    mirror = false,
    opacity = 1,
    className = '',
}) {
    const canvasRef = useRef(null);
    const rafRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let data = null;
        if (analyser) {
            data = new Uint8Array(analyser.frequencyBinCount);
        }

        const draw = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = canvas.clientWidth;
            const parentHeight = canvas.clientHeight || height;

            if (canvas.width !== width * dpr || canvas.height !== parentHeight * dpr) {
                canvas.width = width * dpr;
                canvas.height = parentHeight * dpr;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, parentHeight);

            if (analyser && data) {
                analyser.getByteFrequencyData(data);
            }

            const gap = 2;
            const barWidth = Math.max(1, (width - gap * (bars - 1)) / bars);
            const mid = parentHeight / 2;

            for (let i = 0; i < bars; i++) {
                let value;
                if (analyser && data) {
                    // Logarithmic bin mapping so the low end is not squashed.
                    const bin = Math.floor(Math.pow(i / bars, 1.7) * data.length * 0.72);
                    value = (data[bin] || 0) / 255;
                } else {
                    value = 0.12 + 0.06 * Math.sin((Date.now() / 420) + i * 0.35);
                }

                const barHeight = Math.max(2, value * (parentHeight - 6));
                const x = i * (barWidth + gap);
                const gradient = ctx.createLinearGradient(0, mid - barHeight / 2, 0, mid + barHeight / 2);
                gradient.addColorStop(0, secondaryColor);
                gradient.addColorStop(0.5, color);
                gradient.addColorStop(1, secondaryColor);
                ctx.fillStyle = gradient;
                ctx.globalAlpha = opacity;

                if (mirror) {
                    ctx.fillRect(x, mid - barHeight, barWidth, barHeight * 2);
                } else {
                    ctx.fillRect(x, mid - barHeight / 2, barWidth, barHeight);
                }
            }
            ctx.globalAlpha = 1;

            rafRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(rafRef.current);
    }, [analyser, color, secondaryColor, bars, height, mirror, opacity]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: '100%', height: `${height}px`, display: 'block' }}
            aria-hidden="true"
        />
    );
}
