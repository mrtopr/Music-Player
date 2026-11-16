/**
 * Audio tests — the real DSP and the real time stretcher.
 *
 * These verify *measured* properties (pitch, length, energy), not just that
 * a function returns something.
 */

import { describe, it, expect } from 'vitest';
import { analyzePcm, estimateTempo, buildWaveform, buildEnergyCurve } from '../analysis/dsp.js';
import { planWSOLA, renderWSOLA, stretchWSOLA, stretchChannels } from '../stretch/wsola.js';
import { detectSections, findTransitionPoint, findIncomingStart, buildPhrases } from '../analysis/phrases.js';

const SAMPLE_RATE = 44100;

/** Generates a click track (a kick every N samples) — a real rhythm. */
function clickTrack(bpm, seconds, sampleRate = SAMPLE_RATE) {
    const length = Math.floor(seconds * sampleRate);
    const pcm = new Float32Array(length);
    const interval = Math.floor((60 / bpm) * sampleRate);
    for (let start = 0; start < length; start += interval) {
        for (let i = 0; i < 400 && start + i < length; i++) {
            const decay = Math.exp(-i / 60);
            pcm[start + i] += Math.sin((2 * Math.PI * 90 * i) / sampleRate) * decay * 0.9;
        }
    }
    return pcm;
}

/** Generates a sustained tone — a real pitch. */
function tone(frequency, seconds, sampleRate = SAMPLE_RATE, amplitude = 0.5) {
    const length = Math.floor(seconds * sampleRate);
    const pcm = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        pcm[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude;
    }
    return pcm;
}

/**
 * Dominant frequency via the Goertzel algorithm.
 *
 * A zero-crossing counter is not usable here: WSOLA deliberately introduces
 * small phase jumps at the frame boundaries, and every discontinuity adds a
 * spurious zero crossing. The spectral peak is immune to that.
 */
function dominantFrequency(pcm, sampleRate, low = 80, high = 2000) {
    // Decimate for speed (the frequencies we look for are far below Nyquist).
    const decimation = 4;
    const effectiveRate = sampleRate / decimation;
    const samples = Math.floor(pcm.length / decimation);

    const steps = 240;
    let bestFrequency = 0;
    let bestPower = -1;

    for (let s = 0; s < steps; s++) {
        const frequency = low + ((high - low) * s) / (steps - 1);
        const omega = (2 * Math.PI * frequency) / effectiveRate;
        const coefficient = 2 * Math.cos(omega);
        let s1 = 0;
        let s2 = 0;
        for (let i = 0; i < samples; i++) {
            const s0 = pcm[i * decimation] + coefficient * s1 - s2;
            s2 = s1;
            s1 = s0;
        }
        const power = s1 * s1 + s2 * s2 - coefficient * s1 * s2;
        if (power > bestPower) {
            bestPower = power;
            bestFrequency = frequency;
        }
    }

    return bestFrequency;
}

function rms(pcm) {
    let sum = 0;
    for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
    return Math.sqrt(sum / pcm.length);
}

describe('tempo detection', () => {
    it('detects the real tempo of a click track', () => {
        const pcm = clickTrack(128, 20);
        const analysis = analyzePcm(pcm, SAMPLE_RATE, { analysisSeconds: 20 });
        expect(Math.abs(analysis.bpm - 128)).toBeLessThan(2);
        expect(analysis.bpmConfidence).toBeGreaterThan(0.1);
    });

    it('builds a beat grid with downbeats', () => {
        const pcm = clickTrack(120, 20);
        const analysis = analyzePcm(pcm, SAMPLE_RATE, { analysisSeconds: 20 });
        expect(analysis.beats.length).toBeGreaterThan(30);
        expect(analysis.downbeats.length).toBeGreaterThan(5);
        // Downbeats are every 4th beat.
        expect(analysis.downbeats.length).toBeLessThan(analysis.beats.length);
    });

    it('returns a usable result for a very short track', () => {
        const pcm = clickTrack(120, 1.5);
        const analysis = analyzePcm(pcm, SAMPLE_RATE, { analysisSeconds: 20 });
        expect(analysis).toBeTruthy();
        expect(analysis.duration).toBeCloseTo(1.5, 1);
        expect(Number.isFinite(analysis.bpm)).toBe(true);
    });

    it('survives empty input', () => {
        const analysis = analyzePcm(new Float32Array(0), SAMPLE_RATE);
        expect(analysis.bpm).toBe(0);
        expect(analysis.waveform).toEqual([]);
        expect(analysis.beats).toEqual([]);
    });

    it('measures a real key from a chord', () => {
        // A major triad (A3, C#4, E4) → should detect A major (11B).
        const pcm = new Float32Array(SAMPLE_RATE * 6);
        const notes = [220, 277.18, 329.63];
        for (let i = 0; i < pcm.length; i++) {
            let sample = 0;
            for (const frequency of notes) {
                sample += Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
            }
            pcm[i] = (sample / notes.length) * 0.4;
        }
        const analysis = analyzePcm(pcm, SAMPLE_RATE, { analysisSeconds: 6 });
        expect(analysis.camelot).toBeTruthy();
        expect(['11B', '8B', '2B']).toContain(analysis.camelot);
    });

    it('produces a normalised waveform and energy curve', () => {
        const pcm = clickTrack(120, 10);
        const waveform = buildWaveform(pcm, 64);
        expect(waveform).toHaveLength(64);
        expect(Math.max(...waveform)).toBeLessThanOrEqual(1);

        const curve = buildEnergyCurve(pcm, SAMPLE_RATE, 10);
        expect(curve.length).toBeGreaterThan(5);
        expect(Math.max(...curve)).toBeLessThanOrEqual(1);
    });
});

describe('WSOLA time stretching', () => {
    it('changes the duration by the requested ratio', () => {
        const pcm = tone(440, 2);
        const stretched = stretchWSOLA(pcm, 1.25);
        // ratio > 1 means slower ⇒ longer output
        expect(stretched.length).toBeGreaterThan(pcm.length * 1.15);
        expect(stretched.length).toBeLessThan(pcm.length * 1.35);
    });

    it('preserves the pitch (the whole point of WSOLA)', () => {
        const pcm = tone(440, 2);
        const stretched = stretchWSOLA(pcm, 1.3);

        const originalFrequency = dominantFrequency(pcm, SAMPLE_RATE);
        const stretchedFrequency = dominantFrequency(stretched, SAMPLE_RATE);

        expect(originalFrequency).toBeGreaterThan(430);
        expect(originalFrequency).toBeLessThan(450);
        // A naive resample would shift the pitch by the stretch factor (572 Hz).
        expect(Math.abs(stretchedFrequency - originalFrequency)).toBeLessThan(originalFrequency * 0.03);
    });

    it('keeps the signal energy roughly constant', () => {
        const pcm = tone(440, 2, SAMPLE_RATE, 0.5);
        const stretched = stretchWSOLA(pcm, 1.4);
        const originalRms = rms(pcm);
        const stretchedRms = rms(stretched);
        expect(stretchedRms).toBeGreaterThan(originalRms * 0.6);
        expect(stretchedRms).toBeLessThan(originalRms * 1.4);
    });

    it('returns the input unchanged for a ratio of 1', () => {
        const pcm = tone(440, 1);
        const stretched = stretchWSOLA(pcm, 1);
        expect(stretched.length).toBe(pcm.length);
    });

    it('stretches both channels with the same frame plan (stereo image kept)', () => {
        const left = tone(440, 1);
        const right = tone(660, 1);
        const result = stretchChannels([left, right], 1.2);

        expect(result.channels).toHaveLength(2);
        expect(result.channels[0].length).toBe(result.channels[1].length);

        const leftFrequency = dominantFrequency(result.channels[0], SAMPLE_RATE);
        const rightFrequency = dominantFrequency(result.channels[1], SAMPLE_RATE);
        expect(Math.abs(leftFrequency - 440)).toBeLessThan(25);
        expect(Math.abs(rightFrequency - 660)).toBeLessThan(35);
    });

    it('produces a plan whose offsets keep the signal continuous', () => {
        const pcm = tone(440, 1);
        const plan = planWSOLA(pcm, 1.2);
        expect(plan.offsets.length).toBeGreaterThan(10);
        // The similarity search may legitimately pull the read pointer back a
        // little (that is what WSOLA does), but never by more than the search
        // radius.
        for (let i = 1; i < plan.offsets.length; i++) {
            expect(plan.offsets[i]).toBeGreaterThanOrEqual(plan.offsets[i - 1] - plan.searchRadius);
        }
        const rendered = renderWSOLA(pcm, plan);
        expect(rendered.length).toBe(plan.outputLength);
    });

    it('renders a 45 second window quickly enough for a live transition', () => {
        // 45 s of stereo audio — the window the engine renders before a blend.
        const channels = [tone(220, 45), tone(330, 45)];
        const started = Date.now();
        const result = stretchChannels(channels, 1.12, { sampleRate: 44100 });
        const elapsed = Date.now() - started;

        expect(result.channels[0].length).toBeGreaterThan(channels[0].length);
        // The worker does this off the main thread, but it still has to finish
        // before the blend starts.
        expect(elapsed).toBeLessThan(8000);
    });
});

describe('musical structure detection', () => {
    it('finds a drop where the energy jumps', () => {
        // 20 quiet seconds, then 20 loud ones.
        const quiet = new Float32Array(SAMPLE_RATE * 20).fill(0.05);
        const loud = new Float32Array(SAMPLE_RATE * 20).fill(0.6);
        const pcm = new Float32Array([...quiet, ...loud]);
        const curve = buildEnergyCurve(pcm, SAMPLE_RATE, 40);
        const sections = detectSections({ energyCurve: curve, duration: 40 });

        const drop = sections.find((s) => s.type === 'drop');
        expect(drop).toBeTruthy();
        expect(drop.start).toBeGreaterThan(15);
        expect(drop.start).toBeLessThan(26);
    });

    it('groups downbeats into bar phrases', () => {
        const downbeats = Array.from({ length: 32 }, (_, i) => i * 2);
        const phrases = buildPhrases(downbeats, 8);
        expect(phrases).toHaveLength(4);
        expect(phrases[0].bars).toBe(8);
    });

    it('snaps the transition point to the bar grid', () => {
        const bpm = 120;
        const beatSeconds = 60 / bpm;
        const downbeats = Array.from({ length: 200 }, (_, i) => i * beatSeconds * 4);
        const beats = Array.from({ length: 800 }, (_, i) => i * beatSeconds);
        const analysis = { bpm, downbeats, beats, duration: 200 * beatSeconds * 4 };

        const point = findTransitionPoint(analysis, 16000);
        expect(['bar', 'phrase', 'downbeat']).toContain(point.snappedTo);
        // The chosen point must sit on a bar line of the grid.
        const bars = point.time / (beatSeconds * 4);
        expect(Math.abs(bars - Math.round(bars))).toBeLessThan(0.02);
    });

    it('supports the ±10 ms nudge', () => {
        const bpm = 120;
        const beatSeconds = 60 / bpm;
        const downbeats = Array.from({ length: 200 }, (_, i) => i * beatSeconds * 4);
        const beats = Array.from({ length: 800 }, (_, i) => i * beatSeconds);
        const analysis = { bpm, downbeats, beats, duration: 200 * beatSeconds * 4 };

        const plain = findTransitionPoint(analysis, 16000);
        const nudged = findTransitionPoint(analysis, 16000, { nudgeMs: 10 });
        expect(nudged.time - plain.time).toBeCloseTo(0.01, 3);
    });

    it('never starts the blend in the first third of the track', () => {
        const bpm = 120;
        const beatSeconds = 60 / bpm;
        const downbeats = Array.from({ length: 400 }, (_, i) => i * beatSeconds * 4);
        const beats = Array.from({ length: 1600 }, (_, i) => i * beatSeconds);
        const duration = 400 * beatSeconds * 4;
        const analysis = { bpm, downbeats, beats, duration };

        // A blend length longer than the track must not push the start to 0.
        const point = findTransitionPoint(analysis, duration * 1000, { duration });
        expect(point.time).toBeGreaterThan(duration * 0.3);
    });

    it('falls back to a downbeat when no beat grid exists', () => {
        const analysis = { bpm: 100, downbeats: [], beats: [], duration: 400 };
        const point = findTransitionPoint(analysis, 3000);
        expect(point.snappedTo).toBe('linear');
        expect(point.time).toBeCloseTo(397, 0);
    });

    it('finds the first usable downbeat of the incoming track', () => {
        const start = findIncomingStart({ downbeats: [0, 0.12, 0.62, 1.1] });
        expect(start.time).toBeGreaterThanOrEqual(0.35);
    });

    it('skips a quiet intro so the incoming track enters with content', () => {
        // 12 seconds of ambient intro (energy 0.1), then the music starts.
        const energyCurve = [...Array(12).fill(0.1), ...Array(20).fill(0.8)];
        const downbeats = Array.from({ length: 32 }, (_, i) => i * 2);
        const start = findIncomingStart({ downbeats, energyCurve, duration: 64 });

        // It must not start inside the quiet intro.
        expect(start.time).toBeGreaterThanOrEqual(12);
    });
});
