import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * BlendWaveform — one symmetric waveform that shows the blend.
 *
 * The outgoing track's tail sits on the left, the incoming track's head on the
 * right, and they meet at the centre. As the blend runs, the left side fades
 * out and the right side fills in — the shape *is* the progress bar, so there
 * is no second progress element on screen.
 */
export default function BlendWaveform({
    outgoing,
    incoming,
    progress = 0,
    height = 64,
}) {
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const resize = () => setWidth(wrap.clientWidth);
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(wrap);
        return () => observer.disconnect();
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !width) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // The context is scaled by the device pixel ratio, so all drawing
        // coordinates (including the centre line) are in CSS pixels.
        const mid = height / 2;

        /** Normalised peak buckets of the tail (outgoing) or head (incoming). */
        const slice = (analysis, mode) => {
            const waveform = analysis?.waveform || [];
            const duration = analysis?.duration || 0;
            if (!waveform.length || !duration) return null;

            const seconds = Math.min(14, duration);
            const count = Math.max(12, Math.round((seconds / duration) * waveform.length));
            const start = mode === 'tail' ? waveform.length - count : 0;
            const values = waveform.slice(Math.max(0, start), Math.max(0, start) + count);

            // Normalise each side on its own so both halves carry the same
            // visual weight instead of one looking empty.
            const peak = values.reduce((m, v) => (v > m ? v : m), 0) || 1;
            return values.map((v) => v / peak);
        };

        const left = slice(outgoing, 'tail');
        const right = slice(incoming, 'head');

        const barWidth = 2;
        const gap = 3;
        const step = barWidth + gap;
        const half = Math.floor(width / 2);

        const maxCount = Math.floor(half / step);

        const drawBars = (values, originX, direction) => {
            const count = Math.min(values ? values.length : 0, maxCount);
            for (let i = 0; i < count; i++) {
                const value = Math.max(0.06, values[i]);
                const barHeight = value * (height * 0.42);
                const x = originX + direction * i * step;

                let color;
                if (direction < 0) {
                    // Outgoing (left): fades out as the blend progresses.
                    const alpha = 0.78 * (1 - progress) + 0.14;
                    color = `rgba(139,92,246,${alpha.toFixed(3)})`;
                } else {
                    // Incoming (right): fills in as the blend progresses.
                    const filled = (i / count) <= progress;
                    color = filled ? 'rgba(16,185,129,0.92)' : 'rgba(255,255,255,0.14)';
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, mid - barHeight, barWidth, barHeight * 2);
            }
        };

        // When a side has not been analysed yet, draw a quiet baseline so the
        // strip never looks broken or half-empty.
        const baseline = (originX, direction) => {
            for (let i = 0; i < maxCount; i++) {
                ctx.fillStyle = 'rgba(255,255,255,0.10)';
                ctx.fillRect(originX + direction * i * step, mid - 1, barWidth, 2);
            }
        };

        // The outgoing tail grows leftwards from the seam, the incoming head
        // grows rightwards — they meet exactly in the middle.
        if (left) drawBars(left, half - step, -1);
        else baseline(half - step, -1);

        if (right) drawBars(right, half + step, 1);
        else baseline(half + step, 1);

        // A soft seam glow marks where the two tracks meet.
        if (progress > 0 && progress < 1) {
            const glow = ctx.createLinearGradient(half - 46, 0, half + 46, 0);
            glow.addColorStop(0, 'rgba(139,92,246,0)');
            glow.addColorStop(0.5, 'rgba(255,255,255,0.55)');
            glow.addColorStop(1, 'rgba(16,185,129,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(half - 46, mid - 0.5, 92, 1);
        }
    }, [outgoing, incoming, progress, width, height]);

    useEffect(() => { draw(); }, [draw]);

    return (
        <div ref={wrapRef} style={{ width: '100%' }}>
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: `${height}px` }}
                aria-hidden="true"
            />
        </div>
    );
}
