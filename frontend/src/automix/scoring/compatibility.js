/**
 * Track compatibility scoring.
 *
 * Every score is 0..100 so they can be blended with weights. The weights
 * mirror what actually matters for a DJ-style handover:
 *
 *   key       40%  — harmonic compatibility (Camelot)
 *   tempo     30%  — how far apart the BPMs are
 *   energy    15%  — RMS energy continuity
 *   dance     10%  — rhythmic character (onset density / tempo / energy)
 *   phrase    05%  — structural alignment (bar phrase overlap)
 */

import { keyScore } from './camelot.js';

export const WEIGHTS = {
    key: 0.40,
    tempo: 0.30,
    energy: 0.15,
    dance: 0.10,
    phrase: 0.05,
};

const BPM_PERFECT = 0.02;   // ≤2 %  → 100
const BPM_LIMIT = 0.06;     // ≥6 %  → 0
const HALF_DOUBLE_CAP = 85; // exact double/half is good but never perfect

/**
 * BPM compatibility, 0..100.
 * Tries ×1, ×½ and ×2 so that 70↔140 BPM is recognised as the same groove.
 */
export function bpmScore(bpmA, bpmB) {
    if (!bpmA || !bpmB) return 50;

    let best = 0;
    for (const [mult, cap] of [[1, 100], [0.5, HALF_DOUBLE_CAP], [2, HALF_DOUBLE_CAP]]) {
        const diff = Math.abs(bpmB * mult - bpmA) / bpmA;
        let score;
        if (diff <= BPM_PERFECT) score = 100;
        else if (diff >= BPM_LIMIT) score = 0;
        else score = (100 * (BPM_LIMIT - diff)) / (BPM_LIMIT - BPM_PERFECT);
        best = Math.max(best, Math.min(score, cap));
    }
    return best;
}

/**
 * The tempo ratio the incoming track must be stretched by to match the
 * outgoing one. 1 = no change. Returns null when no stretch is warranted.
 *
 * @returns {number|null}
 */
export function tempoRatio(bpmA, bpmB) {
    const match = tempoMatch(bpmA, bpmB);
    return match ? match.ratio : null;
}

/**
 * Same as tempoRatio() but also reports which interpretation was chosen
 * (direct / double / half).
 */
export function tempoMatch(bpmA, bpmB) {
    if (!bpmA || !bpmB) return null;

    // Prefer the interpretation with the smallest absolute pitch change.
    const candidates = [
        { ratio: bpmA / bpmB, kind: 'direct' },
        { ratio: bpmA / (bpmB * 2), kind: 'double' },
        { ratio: bpmA / (bpmB / 2), kind: 'half' },
    ].filter((c) => c.ratio > 0.5 && c.ratio < 2);

    if (!candidates.length) return null;
    candidates.sort((a, b) => Math.abs(Math.log2(a.ratio)) - Math.abs(Math.log2(b.ratio)));
    const best = candidates[0];

    // Below ±1.5 % the pitch artefact of playbackRate is inaudible and
    // stretching is not worth the CPU.
    if (Math.abs(best.ratio - 1) < 0.015) return null;
    return best;
}

/** Energy continuity, 0..100. */
export function energyScore(a, b) {
    if (!a?.energy && !b?.energy) return 50;
    if (a?.energy === undefined || b?.energy === undefined) return 50;
    const diff = Math.abs(a.energy - b.energy);
    return Math.max(0, 100 * (1 - diff / 0.45));
}

/** Rhythmic character, 0..100. */
export function danceabilityScore(a, b) {
    const da = a?.danceability;
    const db = b?.danceability;
    if (da === undefined || db === undefined) return 50;
    const diff = Math.abs(da - db);
    return Math.max(0, 100 * (1 - diff / 0.6));
}

/**
 * Structural alignment, 0..100.
 * Rewards tracks that share a bar length (same BPM family) and have a
 * "drop"-like section at a similar relative position.
 */
export function phraseScore(a, b) {
    if (!a?.sections?.length || !b?.sections?.length) return 50;

    const dropA = a.sections.find((s) => s.type === 'drop');
    const dropB = b.sections.find((s) => s.type === 'drop');
    if (!dropA || !dropB) return 60;

    // Relative position of the drop inside each track (0..1).
    const relA = dropA.start / Math.max(1, a.duration);
    const relB = dropB.start / Math.max(1, b.duration);
    const diff = Math.abs(relA - relB);
    return Math.max(0, 100 * (1 - diff / 0.35));
}

/** Overall transition score between two analysed tracks. */
export function transitionScore(a, b, weights = WEIGHTS) {
    const parts = {
        key: keyScore(a?.camelot, b?.camelot),
        tempo: bpmScore(a?.bpm, b?.bpm),
        energy: energyScore(a, b),
        dance: danceabilityScore(a, b),
        phrase: phraseScore(a, b),
    };

    let total = 0;
    for (const key of Object.keys(weights)) {
        total += (parts[key] ?? 50) * weights[key];
    }

    return { total: Math.round(total), parts };
}

/**
 * Order a list of tracks so consecutive pairs transition well.
 * Greedy nearest-neighbour starting from the best opening pair.
 */
export function optimizeOrder(tracks, analyses) {
    if (!tracks?.length) return [];
    if (tracks.length < 3) return tracks.slice();

    const remaining = new Map(tracks.map((track) => [track.id, track]));

    // Best opening pair.
    let bestPair = null;
    for (const a of tracks) {
        for (const b of tracks) {
            if (a.id === b.id) continue;
            const score = transitionScore(analyses?.[a.id], analyses?.[b.id]).total;
            if (!bestPair || score > bestPair.score) bestPair = { a, b, score };
        }
    }
    if (!bestPair) return tracks.slice();

    const ordered = [bestPair.a, bestPair.b];
    remaining.delete(bestPair.a.id);
    remaining.delete(bestPair.b.id);
    let current = bestPair.b;

    while (remaining.size) {
        let best = null;
        for (const candidate of remaining.values()) {
            const score = transitionScore(analyses?.[current.id], analyses?.[candidate.id]).total;
            if (!best || score > best.score) best = { track: candidate, score };
        }
        if (!best) break;
        ordered.push(best.track);
        remaining.delete(best.track.id);
        current = best.track;
    }

    return ordered;
}
