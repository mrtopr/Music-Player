/**
 * Transition engine — Spotify-Mix-style curves.
 *
 * A transition is described the same way Spotify describes it: **three
 * independent axes** drawn over the waveform.
 *
 *   Volume  (blue)   none · smooth · crossfade · centre cut · overlap
 *   EQ      (yellow) none · three-band fade · centre bass swap · quick bass cut
 *   Effect  (purple) none · low-pass out · high-pass in
 *
 * A preset simply picks one option per axis:
 *
 *   Fade   → smooth crossfade
 *   Rise   → overlap + three-band fade
 *   Blend  → crossfade + three-band fade
 *   Wave   → crossfade + high-pass in
 *   Melt   → smooth + quick bass cut + low-pass out
 *   Slam   → centre cut + quick bass cut
 *
 * The transition length is measured in **bars** (2/4/8/16) and converted to
 * seconds from the tempo — the same unit Spotify uses.
 */

export const CURVE_POINTS = 48;

/* ────────────────────────────── Options ────────────────────────────── */

export const VOLUME_OPTIONS = [
    { id: 'none', name: 'None', description: 'No volume change' },
    { id: 'smooth', name: 'Smooth Crossfade', description: 'Gentle, equal-power blend' },
    { id: 'crossfade', name: 'Crossfade', description: 'Classic constant-power crossfade' },
    { id: 'centerCut', name: 'Centre Cut', description: 'Cut in the middle of the overlap' },
    { id: 'overlap', name: 'Overlap', description: 'The outgoing track swells as the new one enters' },
];

export const EQ_OPTIONS = [
    { id: 'none', name: 'None', description: 'No EQ change' },
    { id: 'threeBand', name: '3-Band Fade', description: 'Bass, mids and treble fade separately' },
    { id: 'bassSwap', name: 'Centre Bass Swap', description: 'The low end hands over at the centre' },
    { id: 'quickBassCut', name: 'Quick Bass Cut', description: 'The bass leaves just before the beat drops' },
];

export const EFFECT_OPTIONS = [
    { id: 'none', name: 'None', description: 'No effect' },
    { id: 'lowpass', name: 'Low-pass Filter Out', description: 'The old track is filtered away' },
    { id: 'highpass', name: 'High-pass Filter In', description: 'The new track filters in' },
];

export const BAR_OPTIONS = [2, 4, 8, 12, 16];

export const TRANSITION_PRESETS = [
    { id: 'auto', name: 'Auto', description: 'Picks the best style from BPM, key and structure' },
    { id: 'fade', name: 'Fade', description: 'Smooth crossfade' },
    { id: 'rise', name: 'Rise', description: 'The new track rises over the old one' },
    { id: 'blend', name: 'Blend', description: 'Crossfade with a three-band EQ blend' },
    { id: 'wave', name: 'Wave', description: 'Filter sweep between the two tracks' },
    { id: 'melt', name: 'Melt', description: 'The old track melts away' },
    { id: 'slam', name: 'Slam', description: 'Hard slam with a quick bass cut' },
    { id: 'custom', name: 'Custom', description: 'Your own volume, EQ and effect curves' },
];

export const getPreset = (id) => TRANSITION_PRESETS.find((p) => p.id === id) || TRANSITION_PRESETS[0];

export const curve = () => new Array(CURVE_POINTS).fill(0);

export const buildCurve = (fn) => {
    const out = curve();
    for (let i = 0; i < CURVE_POINTS; i++) out[i] = fn(i / (CURVE_POINTS - 1));
    return out;
};

/* ─────────────────────────── Curve helpers ─────────────────────────── */

const equalPowerOut = buildCurve((p) => Math.cos((p * Math.PI) / 2));
const equalPowerIn = buildCurve((p) => Math.sin((p * Math.PI) / 2));
const linearOut = buildCurve((p) => 1 - p);
const linearIn = buildCurve((p) => p);

const toDb = (linear) => 20 * Math.log10(Math.max(0.0001, linear));
const fromDb = (db) => Math.pow(10, db / 20);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** The bass hands over at the centre: the outgoing lows leave before the
 *  incoming lows arrive, so the two low ends never double up. */
function bassSwapCurves() {
    const minLinear = fromDb(-15);
    const outgoingBass = buildCurve((p) => {
        const linear = p < 0.6
            ? 1 - (p / 0.6) * (1 - minLinear)
            : minLinear * (1 - (p - 0.6) / 0.4);
        return toDb(clamp(linear, 0, 1));
    });
    const incomingBass = buildCurve((p) => {
        const linear = p < 0.4
            ? minLinear
            : minLinear + ((p - 0.4) / 0.6) * (1 - minLinear);
        return toDb(clamp(linear, 0, 1));
    });
    return { outgoingBass, incomingBass };
}

/** A quick bass cut right before the new track's downbeat. */
function quickBassCutCurves() {
    const outgoingBass = buildCurve((p) => (p < 0.65 ? 0 : -18 * ((p - 0.65) / 0.35)));
    const incomingBass = buildCurve((p) => (p < 0.5 ? -15 : -15 + ((p - 0.5) / 0.5) * 15));
    return { outgoingBass, incomingBass };
}

/* ─────────────────────── Bars → duration ─────────────────────── */

/**
 * A transition is measured in bars. 4/4 assumed.
 * @param {number} bars
 * @param {number} bpm
 */
export function barsToDurationMs(bars, bpm) {
    const tempo = bpm && bpm > 0 ? bpm : 120;
    const beatMs = 60000 / tempo;
    return Math.round(beatMs * 4 * clamp(bars, 1, 32));
}

/* ─────────────────────── Transition construction ─────────────────────── */

/**
 * @param {string} style preset id
 * @param {object} ctx
 * @param {number} [ctx.bars] length of the transition in bars
 * @param {number} [ctx.bpm] tempo used for the bar → seconds conversion
 * @param {number} [ctx.durationMs] explicit duration (overrides bars)
 * @param {string} [ctx.volume] volume option id
 * @param {string} [ctx.eq] EQ option id
 * @param {string} [ctx.effect] effect option id
 */
export function buildTransitionCurves(style, ctx = {}) {
    const preset = getPreset(style);
    const bpm = ctx.bpm || 120;
    const bars = clamp(ctx.bars ?? 4, 1, 32);
    const durationMs = ctx.durationMs ?? barsToDurationMs(bars, bpm);
    const durationSec = durationMs / 1000;

    const deck = () => ({
        gain: curve(),
        bass: curve(),
        mid: curve(),
        treble: curve(),
        filterFreq: buildCurve(() => 20000),
        filterType: 'lowpass',
        echoSend: curve(),
    });

    const outgoing = deck();
    const incoming = deck();

    // ── Resolve the three axes for this preset ──
    let volume = ctx.volume;
    let eq = ctx.eq;
    let effect = ctx.effect;

    if (!volume || !eq || !effect) {
        switch (preset.id) {
            case 'fade':
                volume = volume || 'smooth';
                eq = eq || 'none';
                effect = effect || 'none';
                break;
            case 'rise':
                volume = volume || 'overlap';
                eq = eq || 'threeBand';
                effect = effect || 'none';
                break;
            case 'blend':
                volume = volume || 'crossfade';
                eq = eq || 'threeBand';
                effect = effect || 'none';
                break;
            case 'wave':
                volume = volume || 'smooth';
                eq = eq || 'none';
                effect = effect || 'highpass';
                break;
            case 'melt':
                volume = volume || 'smooth';
                eq = eq || 'quickBassCut';
                effect = effect || 'lowpass';
                break;
            case 'slam':
                volume = volume || 'centerCut';
                eq = eq || 'quickBassCut';
                effect = effect || 'none';
                break;
            case 'custom':
                volume = volume || 'crossfade';
                eq = eq || 'none';
                effect = effect || 'none';
                break;
            case 'auto':
            default:
                volume = volume || 'crossfade';
                eq = eq || 'none';
                effect = effect || 'none';
                break;
        }
    }

    // ── Volume axis ──
    switch (volume) {
        case 'none':
            outgoing.gain = buildCurve(() => 1);
            incoming.gain = buildCurve(() => 1);
            break;
        case 'smooth':
            outgoing.gain = buildCurve((p) => Math.pow(Math.cos((p * Math.PI) / 2), 1.4));
            incoming.gain = buildCurve((p) => Math.pow(Math.sin((p * Math.PI) / 2), 1.4));
            break;
        case 'centerCut':
            outgoing.gain = buildCurve((p) => (p < 0.5 ? 1 : 0));
            incoming.gain = buildCurve((p) => (p < 0.5 ? 0 : 1));
            break;
        case 'overlap':
            outgoing.gain = buildCurve((p) => (p < 0.35 ? 1 + p * 0.3 : 1.3 - ((p - 0.35) / 0.65) * 1.3));
            incoming.gain = buildCurve((p) => Math.pow(p, 1.5));
            break;
        case 'crossfade':
        default:
            outgoing.gain = equalPowerOut.slice();
            incoming.gain = equalPowerIn.slice();
            break;
    }

    // ── EQ axis ──
    switch (eq) {
        case 'threeBand':
            outgoing.bass = buildCurve((p) => -p * 10);
            outgoing.treble = buildCurve((p) => p * 5);
            incoming.bass = buildCurve((p) => (p - 0.35) * 8);
            incoming.treble = buildCurve((p) => (1 - p) * -4);
            incoming.mid = buildCurve((p) => p * 3);
            break;
        case 'bassSwap': {
            const { outgoingBass, incomingBass } = bassSwapCurves();
            outgoing.bass = outgoingBass;
            incoming.bass = incomingBass;
            break;
        }
        case 'quickBassCut': {
            const { outgoingBass, incomingBass } = quickBassCutCurves();
            outgoing.bass = outgoingBass;
            incoming.bass = incomingBass;
            break;
        }
        case 'none':
        default:
            break;
    }

    // ── Effect axis ──
    switch (effect) {
        case 'lowpass':
            // The outgoing track is filtered away as the new one enters.
            outgoing.filterType = 'lowpass';
            outgoing.filterFreq = buildCurve((p) => 20000 * Math.pow(0.03, p));
            incoming.filterType = 'lowpass';
            incoming.filterFreq = buildCurve((p) => 400 * Math.pow(50, p));
            incoming.bass = buildCurve((p) => (1 - p) * 5);
            break;
        case 'highpass':
            // The outgoing track thins out, the new one opens up.
            outgoing.filterType = 'highpass';
            outgoing.filterFreq = buildCurve((p) => 20 + (5000 - 20) * p * p);
            incoming.filterType = 'lowpass';
            incoming.filterFreq = buildCurve((p) => 400 + (20000 - 400) * p);
            break;
        case 'none':
        default:
            break;
    }

    // ── Clamp everything to safe ranges ──
    const clampGain = (c) => c.map((v) => clamp(v, 0, 1.4));
    const clampDb = (c) => c.map((v) => clamp(v, -24, 24));
    const clampFreq = (c) => c.map((v) => clamp(v, 20, 20000));

    outgoing.gain = clampGain(outgoing.gain);
    incoming.gain = clampGain(incoming.gain);
    for (const band of ['bass', 'mid', 'treble']) {
        outgoing[band] = clampDb(outgoing[band]);
        incoming[band] = clampDb(incoming[band]);
    }
    outgoing.filterFreq = clampFreq(outgoing.filterFreq);
    incoming.filterFreq = clampFreq(incoming.filterFreq);
    outgoing.echoSend = clampGain(outgoing.echoSend);
    incoming.echoSend = clampGain(incoming.echoSend);

    return {
        style: preset.id,
        presetId: preset.id,
        bars,
        durationMs,
        volume,
        eq,
        effect,
        outgoing,
        incoming,
        loudnessGainDb: ctx.loudnessGainDb ?? 0,
    };
}

/* ───────────────────────── Auto planning ───────────────────────── */

import { keyScore } from '../scoring/camelot.js';
import { bpmScore, tempoRatio } from '../scoring/compatibility.js';

/**
 * Chooses the transition style, length (in bars) and alignment for two
 * analysed tracks.
 */
export function planTransition(fromAnalysis, toAnalysis, options = {}) {
    if (!fromAnalysis || !toAnalysis) {
        return { ...buildTransitionCurves('fade', { bars: 4 }), reason: 'Standard crossfade' };
    }

    const bpmA = fromAnalysis.bpm || 0;
    const bpmB = toAnalysis.bpm || 0;
    const bpmDiff = bpmA && bpmB ? Math.abs(bpmA - bpmB) : 0;
    const ratio = tempoRatio(bpmA, bpmB);
    const keyCompatibility = keyScore(fromAnalysis.camelot, toAnalysis.camelot);
    const energyDiff = (toAnalysis.energy ?? 0.5) - (fromAnalysis.energy ?? 0.5);
    const beatConfidence = Math.min(
        fromAnalysis.bpmConfidence ?? 0,
        toAnalysis.bpmConfidence ?? 0,
    );

    let style = 'blend';
    // Spotify's Mix defaults to an 8-bar transition.
    let bars = 8;
    let reason = '';

    // --- Style: how the two tracks blend (driven by the harmony) ---
    if (keyCompatibility < 40) {
        // Clashing keys: the old track dissolves instead of clashing head-on.
        style = 'melt';
        reason = 'Clashing keys - the outgoing track dissolves into the new one';
    } else if (bpmDiff > 0 && bpmDiff <= 2) {
        style = 'wave';
        reason = `Same tempo (${Math.round(bpmA)} BPM) - a filter sweep across the grid`;
    } else if (keyCompatibility >= 85) {
        style = 'blend';
        reason = `Harmonically compatible keys (${fromAnalysis.camelot} -> ${toAnalysis.camelot})`;
    } else if (ratio && Math.abs(ratio - 1) > 0.02) {
        // We can really time-stretch, so the blend stays musical.
        style = 'rise';
        reason = `Tempo matched ${Math.round(bpmA)} -> ${Math.round(bpmB)} BPM (pitch preserved)`;
    } else if (Math.abs(energyDiff) > 0.18) {
        style = 'melt';
        reason = 'Different energy - the quieter track melts into the louder one';
    } else {
        style = 'fade';
        reason = 'Smooth crossfade';
    }

    // --- Length: in bars, governed by the tempo ---
    // Spotify's default is eight bars and it only offers longer blends when the
    // two tempos are close; a big tempo jump gets a shorter snippet.
    if (beatConfidence < 0.15) {
        bars = 4;
    } else if (bpmDiff > 6) {
        bars = 4;
    } else if (keyCompatibility < 40) {
        bars = 4;
    } else {
        bars = 8;
    }

    // Only offer bar-based lengths when we are confident about the beat grid.
    if (beatConfidence < 0.15) bars = Math.min(bars, 4);

    const built = buildTransitionCurves(style, {
        bars,
        bpm: bpmA || bpmB,
        loudnessGainDb: options.loudnessGainDb ?? 0,
    });

    return {
        ...built,
        reason,
        bpm: bpmA || bpmB,
        bpmDiff,
        keyCompatibility,
        tempoRatio: ratio,
        bpmScore: bpmScore(bpmA, bpmB),
    };
}

/* ─────────────────────── Curve editing helpers ─────────────────────── */

export const CURVE_HANDLES = 5;

export function curveToHandles(values) {
    const out = [];
    for (let i = 0; i < CURVE_HANDLES; i++) {
        const index = Math.round((i / (CURVE_HANDLES - 1)) * (values.length - 1));
        out.push({
            x: i / (CURVE_HANDLES - 1),
            y: Number.isFinite(values[index]) ? values[index] : 0,
        });
    }
    return out;
}

export function handlesToCurve(handles, points = CURVE_POINTS) {
    if (!handles?.length) return curve();
    const out = new Array(points);

    for (let i = 0; i < points; i++) {
        const t = i / (points - 1);
        const scaled = t * (handles.length - 1);
        const index = Math.min(handles.length - 2, Math.floor(scaled));
        const localT = scaled - index;

        const p0 = handles[Math.max(0, index - 1)].y;
        const p1 = handles[index].y;
        const p2 = handles[Math.min(handles.length - 1, index + 1)].y;
        const p3 = handles[Math.min(handles.length - 1, index + 2)].y;

        const t2 = localT * localT;
        const t3 = t2 * localT;
        out[i] = 0.5 * (
            2 * p1 +
            (-p0 + p2) * localT +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        );
    }
    return out;
}

/* ─────────────────────────── Persistence ─────────────────────────── */

export const transitionKey = (fromId, toId) => `${fromId}->${toId}`;

export function serializeTransition(spec) {
    if (!spec) return null;
    return {
        style: spec.style,
        presetId: spec.presetId,
        bars: spec.bars,
        durationMs: spec.durationMs,
        volume: spec.volume,
        eq: spec.eq,
        effect: spec.effect,
        outgoing: spec.outgoing,
        incoming: spec.incoming,
        loudnessGainDb: spec.loudnessGainDb,
        transitionPoint: spec.transitionPoint,
    };
}

export function deserializeTransition(raw) {
    if (!raw) return null;
    const fallback = buildTransitionCurves(raw.style || 'fade', { bars: raw.bars, durationMs: raw.durationMs });
    return {
        ...fallback,
        style: raw.style || fallback.style,
        presetId: raw.presetId || fallback.presetId,
        bars: raw.bars ?? fallback.bars,
        durationMs: raw.durationMs || fallback.durationMs,
        volume: raw.volume ?? fallback.volume,
        eq: raw.eq ?? fallback.eq,
        effect: raw.effect ?? fallback.effect,
        outgoing: raw.outgoing || fallback.outgoing,
        incoming: raw.incoming || fallback.incoming,
        loudnessGainDb: raw.loudnessGainDb ?? 0,
        transitionPoint: raw.transitionPoint,
    };
}

/** Human readable key compatibility, used by the UI. */
export function camelotCompatibleLabel(codeA, codeB) {
    const score = keyScore(codeA, codeB);
    if (score >= 95) return { score, label: 'Perfect key match', tone: 'good' };
    if (score >= 85) return { score, label: 'Harmonically compatible', tone: 'good' };
    if (score >= 70) return { score, label: 'Close, slight tension', tone: 'ok' };
    if (score >= 50) return { score, label: 'Diagonal move', tone: 'ok' };
    if (score >= 40) return { score, label: 'Unknown key', tone: 'neutral' };
    return { score, label: 'Clashing keys', tone: 'bad' };
}
