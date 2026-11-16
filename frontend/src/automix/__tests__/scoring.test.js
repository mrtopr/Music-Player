/**
 * Scoring tests — harmonic mixing, BPM matching, energy and phrase
 * compatibility, and the automatic transition planner.
 */

import { describe, it, expect } from 'vitest';
import { keyScore, parseCamelot, camelotFor } from '../scoring/camelot.js';
import {
    bpmScore,
    tempoRatio,
    energyScore,
    phraseScore,
    transitionScore,
    optimizeOrder,
    WEIGHTS,
} from '../scoring/compatibility.js';
import { planTransition, buildTransitionCurves, barsToDurationMs, TRANSITION_PRESETS } from '../engine/transitionCurves.js';

const analysis = (over = {}) => ({
    bpm: 120,
    bpmConfidence: 0.9,
    key: 'C major',
    camelot: '8B',
    keyConfidence: 0.8,
    energy: 0.5,
    loudness: -12,
    danceability: 0.6,
    beats: [],
    downbeats: [],
    sections: [],
    phrases: [],
    duration: 240,
    ...over,
});

describe('Camelot wheel', () => {
    it('scores the documented reference pairs', () => {
        expect(keyScore('8A', '8A')).toBe(100);   // identical
        expect(keyScore('8A', '9A')).toBe(90);    // +1 on the wheel
        expect(keyScore('8A', '7A')).toBe(90);    // −1 on the wheel
        expect(keyScore('8A', '8B')).toBe(85);    // relative major/minor
    });

    it('is symmetric', () => {
        expect(keyScore('8A', '9A')).toBe(keyScore('9A', '8A'));
        expect(keyScore('8A', '8B')).toBe(keyScore('8B', '8A'));
    });

    it('scores distant keys low', () => {
        // 8A → 6A is two steps away — an "energy boost", not a clash.
        expect(keyScore('8A', '6A')).toBe(70);
        expect(keyScore('8A', '1B')).toBeLessThan(30);
        expect(keyScore('8A', '3B')).toBeLessThan(30);
    });

    it('is neutral when a key is unknown', () => {
        expect(keyScore('8A', null)).toBe(50);
        expect(keyScore(null, null)).toBe(50);
    });

    it('maps pitch classes to the standard wheel', () => {
        expect(camelotFor(0, false)).toBe('8B');   // C major
        expect(camelotFor(0, true)).toBe('5A');    // C minor
        expect(camelotFor(7, false)).toBe('9B');   // G major
        expect(camelotFor(9, true)).toBe('8A');    // A minor
        expect(camelotFor(1, true)).toBe('11A');   // C# minor
        expect(camelotFor(6, true)).toBe('6A');    // F# minor
        expect(camelotFor(7, true)).toBe('12A');   // G minor
        expect(camelotFor(11, true)).toBe('10A');  // B minor
    });

    it('parses codes and rejects invalid ones', () => {
        expect(parseCamelot('8A')).toEqual({ number: 8, letter: 'A' });
        expect(parseCamelot('13A')).toBeNull();
        expect(parseCamelot('nope')).toBeNull();
    });
});

describe('BPM scoring', () => {
    it('gives identical tempos a perfect score', () => {
        expect(bpmScore(120, 120)).toBe(100);
    });

    it('treats small differences as compatible and large ones as incompatible', () => {
        expect(bpmScore(120, 122)).toBeGreaterThan(80);
        expect(bpmScore(120, 128)).toBeLessThan(30);
        expect(bpmScore(120, 132)).toBe(0);
    });

    it('recognises half and double tempo but caps the score', () => {
        expect(bpmScore(70, 140)).toBe(85);
        expect(bpmScore(140, 70)).toBe(85);
    });

    it('is neutral without tempo data', () => {
        expect(bpmScore(0, 120)).toBe(50);
    });
});

describe('tempo ratio (time stretch)', () => {
    it('does not stretch when the tempos match', () => {
        expect(tempoRatio(120, 120)).toBeNull();
        expect(tempoRatio(120, 120.8)).toBeNull();   // < 1.5 %
    });

    it('computes the ratio for slightly different tempos', () => {
        const ratio = tempoRatio(120, 124);
        expect(ratio).toBeCloseTo(120 / 124, 5);
    });

    it('prefers the smallest pitch change for double/half tempo pairs', () => {
        // 120 vs 60 — the direct ratio is 2 (a whole octave), the half-time
        // reading is 1.0 (same pitch, twice as slow).
        expect(tempoRatio(120, 60)).toBeNull();
    });
});

describe('energy, danceability and phrase scoring', () => {
    it('penalises big energy jumps', () => {
        expect(energyScore(analysis({ energy: 0.5 }), analysis({ energy: 0.52 }))).toBeGreaterThan(90);
        expect(energyScore(analysis({ energy: 0.1 }), analysis({ energy: 0.9 }))).toBeLessThan(20);
    });

    it('prefers tracks whose drops sit at a similar relative position', () => {
        const a = analysis({
            duration: 200,
            sections: [{ type: 'drop', start: 60, end: 120 }],
        });
        const b = analysis({
            duration: 200,
            sections: [{ type: 'drop', start: 65, end: 125 }],
        });
        const c = analysis({
            duration: 200,
            sections: [{ type: 'drop', start: 160, end: 190 }],
        });
        expect(phraseScore(a, b)).toBeGreaterThan(80);
        expect(phraseScore(a, c)).toBeLessThan(40);
    });

    it('combines the parts with the documented weights', () => {
        const score = transitionScore(analysis(), analysis());
        expect(score.total).toBeGreaterThan(90);
        expect(Object.keys(score.parts)).toEqual(Object.keys(WEIGHTS));
    });
});

describe('transition planner', () => {
    it('falls back to a crossfade without metadata', () => {
        const plan = planTransition(null, null);
        expect(plan.style).toBe('fade');
        expect(plan.durationMs).toBeGreaterThan(0);
    });

    it('uses a filter sweep for near-identical tempos', () => {
        const plan = planTransition(analysis({ bpm: 120 }), analysis({ bpm: 120.8, camelot: '8B' }));
        expect(plan.style).toBe('wave');
        expect(plan.reason).toMatch(/tempo/i);
    });

    it('dissolves the outgoing track for clashing keys', () => {
        const plan = planTransition(
            analysis({ bpm: 120, camelot: '8A' }),
            analysis({ bpm: 120, camelot: '1B' }),
        );
        expect(plan.style).toBe('melt');
        // Still long enough to feel like a blend, not a hard cut.
        expect(plan.bars).toBe(4);
    });

    it('uses a long blend for compatible keys', () => {
        const plan = planTransition(
            analysis({ bpm: 120, camelot: '8A' }),
            analysis({ bpm: 126, camelot: '8B' }),
        );
        expect(plan.style).toBe('blend');
        expect(plan.bars).toBe(8);
    });

    it('shortens the blend when the tempos are far apart', () => {
        // Spotify only offers the bar dropdown when the two tempos are close.
        const plan = planTransition(
            analysis({ bpm: 120, camelot: '8A' }),
            analysis({ bpm: 150, camelot: '8A' }),
        );
        expect(plan.bars).toBe(4);
    });

    it('reports the tempo ratio when a stretch is needed', () => {
        const plan = planTransition(
            analysis({ bpm: 120, camelot: '8A' }),
            analysis({ bpm: 128, camelot: '8A' }),
        );
        expect(plan.tempoRatio).toBeCloseTo(120 / 128, 4);
    });

    it('expresses the length in bars', () => {
        const plan = planTransition(
            analysis({ bpm: 120, camelot: '8A' }),
            analysis({ bpm: 126, camelot: '8B' }),
        );
        expect(plan.bars).toBe(8);
        // 8 bars of 4/4 at 120 BPM = 16 seconds
        expect(plan.durationMs).toBe(16000);
    });
});

describe('transition curves', () => {
    it('uses the equal-power law for the crossfade volume', () => {
        const { outgoing, incoming } = buildTransitionCurves('fade', { volume: 'crossfade' });
        expect(outgoing.gain[0]).toBeCloseTo(1, 2);
        expect(incoming.gain[0]).toBeCloseTo(0, 3);
        expect(outgoing.gain.at(-1)).toBeCloseTo(0, 3);
        expect(incoming.gain.at(-1)).toBeCloseTo(1, 2);

        // Constant power: out² + in² = 1 across the whole blend.
        for (let i = 0; i < outgoing.gain.length; i++) {
            const power = outgoing.gain[i] ** 2 + incoming.gain[i] ** 2;
            expect(power).toBeGreaterThan(0.97);
            expect(power).toBeLessThan(1.03);
        }
    });

    it('hands the bass over instead of doubling it', () => {
        const { outgoing, incoming } = buildTransitionCurves('fade', { eq: 'bassSwap' });

        // The outgoing low end leaves before the incoming one arrives.
        expect(outgoing.bass[0]).toBeCloseTo(0, 1);
        expect(outgoing.bass.at(-1)).toBeLessThan(-15);

        // The incoming low end stays out of the way for the first 40 %.
        const early = incoming.bass[Math.floor(incoming.bass.length * 0.3)];
        expect(early).toBeLessThan(-10);
        expect(incoming.bass.at(-1)).toBeCloseTo(0, 1);
    });

    it('sweeps a real filter frequency', () => {
        const lowpass = buildTransitionCurves('melt', { effect: 'lowpass' });
        expect(lowpass.outgoing.filterType).toBe('lowpass');
        expect(lowpass.outgoing.filterFreq[0]).toBeGreaterThan(15000);
        expect(lowpass.outgoing.filterFreq.at(-1)).toBeLessThan(1500);

        const highpass = buildTransitionCurves('wave', { effect: 'highpass' });
        expect(highpass.outgoing.filterType).toBe('highpass');
        expect(highpass.outgoing.filterFreq[0]).toBeLessThan(100);
        expect(highpass.outgoing.filterFreq.at(-1)).toBeGreaterThan(3000);
    });

    it('clamps the automation to safe ranges', () => {
        const { outgoing, incoming } = buildTransitionCurves('fade', { volume: 'overlap' });
        for (const value of outgoing.gain) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1.4);
        }
        for (const band of ['bass', 'mid', 'treble']) {
            for (const value of outgoing[band]) {
                expect(value).toBeGreaterThanOrEqual(-24);
                expect(value).toBeLessThanOrEqual(24);
            }
        }
        for (const value of incoming.filterFreq) {
            expect(value).toBeGreaterThanOrEqual(20);
            expect(value).toBeLessThanOrEqual(20000);
        }
    });

    it('offers Spotify\'s preset names', () => {
        const ids = TRANSITION_PRESETS.map((p) => p.id);
        for (const required of ['auto', 'fade', 'rise', 'blend', 'wave', 'melt', 'slam', 'custom']) {
            expect(ids).toContain(required);
        }
    });

    it('converts bars into a duration using the tempo', () => {
        expect(barsToDurationMs(4, 120)).toBe(8000);
        expect(barsToDurationMs(8, 120)).toBe(16000);
        expect(barsToDurationMs(2, 60)).toBe(8000);
    });

    it('exposes the three independent axes', () => {
        const spec = buildTransitionCurves('custom', {
            volume: 'crossfade',
            eq: 'quickBassCut',
            effect: 'lowpass',
        });
        expect(spec.volume).toBe('crossfade');
        expect(spec.eq).toBe('quickBassCut');
        expect(spec.effect).toBe('lowpass');
    });
});

describe('playlist optimisation', () => {
    it('orders tracks so that neighbours transition well', () => {
        const tracks = [
            { id: 'a', title: 'A' },
            { id: 'b', title: 'B' },
            { id: 'c', title: 'C' },
        ];
        const analyses = {
            a: analysis({ camelot: '8A', bpm: 120 }),
            b: analysis({ camelot: '8A', bpm: 120 }),
            c: analysis({ camelot: '1B', bpm: 130 }),
        };
        const ordered = optimizeOrder(tracks, analyses);
        expect(ordered).toHaveLength(3);
        // a and b must be adjacent (they are the compatible pair).
        const ids = ordered.map((t) => t.id);
        expect(Math.abs(ids.indexOf('a') - ids.indexOf('b'))).toBe(1);
    });
});
