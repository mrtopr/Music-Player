/**
 * Musical structure detection — intro / drop / breakdown / outro and bar
 * phrases — derived from the real analysis (energy curve + beat grid).
 *
 * No heuristics on metadata: this works on measured RMS energy and detected
 * beats, so the numbers describe the actual recording.
 */

/** Median of a numeric array. */
function median(values) {
    if (!values?.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Finds contiguous runs where the energy stays above/below a threshold.
 * @returns {{ start:number, end:number, average:number }[]}
 */
function findRuns(curve, threshold, minLength) {
    const runs = [];
    let current = null;

    for (let i = 0; i < curve.length; i++) {
        const value = curve[i];
        if (value >= threshold) {
            if (!current) current = { start: i, end: i, values: [value] };
            else {
                current.end = i;
                current.values.push(value);
            }
        } else if (current) {
            if (current.end - current.start + 1 >= minLength) {
                runs.push({
                    start: current.start,
                    end: current.end,
                    average: current.values.reduce((s, v) => s + v, 0) / current.values.length,
                });
            }
            current = null;
        }
    }

    if (current && current.end - current.start + 1 >= minLength) {
        runs.push({
            start: current.start,
            end: current.end,
            average: current.values.reduce((s, v) => s + v, 0) / current.values.length,
        });
    }

    return runs;
}

/**
 * Detects the structural sections of a track.
 * @param {{ energyCurve:number[], duration:number, bpm?:number }} analysis
 */
export function detectSections(analysis) {
    const curve = analysis?.energyCurve || [];
    if (!curve.length) return [];

    const sections = [];
    const level = median(curve);

    // A drop = a sustained, clearly louder stretch.
    const drops = findRuns(curve, level * 1.28, 4);
    // A breakdown = a sustained, clearly quieter stretch.
    const breakdowns = findRuns(curve, level * 0.72, 4);

    // The biggest sustained loud stretch is the drop.
    const drop = drops.sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];
    const breakdown = breakdowns
        .filter((run) => !drop || run.start < drop.start || run.end > drop.end)
        .sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];

    if (drop) {
        sections.push({ type: 'drop', start: drop.start, end: drop.end, energy: drop.average });
    }
    if (breakdown) {
        sections.push({ type: 'breakdown', start: breakdown.start, end: breakdown.end, energy: breakdown.average });
    }

    // Intro: from the start until the first strong section (or 25 % in).
    const firstStrong = sections.length
        ? Math.min(...sections.map((s) => s.start))
        : Math.round(curve.length * 0.25);
    const introEnd = Math.max(2, Math.min(firstStrong, Math.round(curve.length * 0.4)));
    if (introEnd > 1) {
        sections.push({ type: 'intro', start: 0, end: introEnd, energy: median(curve.slice(0, introEnd)) });
    }

    // Outro: from the last strong section to the end.
    const lastStrong = sections.length
        ? Math.max(...sections.filter((s) => s.type !== 'intro').map((s) => s.end), 0)
        : curve.length;
    const outroStart = Math.max(0, Math.min(lastStrong, Math.round(curve.length * 0.78)));
    if (curve.length - outroStart > 2) {
        sections.push({ type: 'outro', start: outroStart, end: curve.length, energy: median(curve.slice(outroStart)) });
    }

    sections.sort((a, b) => a.start - b.start);
    return sections;
}

/**
 * Groups downbeats into musical phrases of N bars.
 * @param {number[]} downbeats
 * @param {number} bars number of bars per phrase
 */
export function buildPhrases(downbeats, bars = 8) {
    if (!downbeats?.length) return [];
    const phrases = [];
    for (let i = 0; i + bars <= downbeats.length; i += bars) {
        phrases.push({
            start: downbeats[i],
            end: downbeats[Math.min(i + bars, downbeats.length - 1)],
            bars,
            index: phrases.length,
        });
    }
    return phrases;
}

/**
 * Picks where inside the outgoing track the blend should start.
 *
 * Spotify's Mix snaps the transition to a position where **the beats of both
 * tracks overlap** (and lets you nudge either track by 10 ms). The default
 * length is 8 bars, and the position cannot reach the very start or the very
 * end of a track.
 *
 * We therefore:
 *   • aim for the end of the track minus the planned blend length,
 *   • snap back to the closest bar line (so the blend ends on a downbeat),
 *   • prefer an 8-bar phrase boundary when one is close by,
 *   • and never start earlier than ~35 % into the track.
 *
 * @returns {{ time:number, snappedTo:'bar'|'phrase'|'downbeat'|'linear', barIndex:number }}
 */
export function findTransitionPoint(analysis, durationMs, options = {}) {
    const duration = options.duration ?? analysis?.duration ?? 0;
    if (!duration) return { time: 0, snappedTo: 'linear', barIndex: -1 };

    const leadSeconds = (durationMs || 5000) / 1000;
    const target = Math.max(0, duration - leadSeconds);

    const bpm = analysis?.bpm || 120;
    const barSeconds = (60 / bpm) * 4;

    const beats = analysis?.beats || [];
    const downbeats = analysis?.downbeats?.length ? analysis.downbeats : [];

    // The ±10 ms nudge Spotify offers in its editor.
    const nudge = (options.nudgeMs || 0) / 1000;

    if (!beats.length) {
        return {
            time: Math.max(0, Math.min(duration, target + nudge)),
            snappedTo: 'linear',
            barIndex: Math.round(target / barSeconds),
        };
    }

    // The blend must not start before this point in the track.
    const earliest = duration * (options.minPositionRatio ?? 0.35);

    // 1. A phrase boundary (every 8 bars) close to the target.
    const phraseSpacing = barSeconds * 8;
    const phraseIndex = Math.floor(target / phraseSpacing);
    const phraseTime = phraseIndex * phraseSpacing;
    if (phraseTime >= earliest && target - phraseTime <= barSeconds * 2) {
        const bar = downbeats.length
            ? downbeats.reduce((best, t) => (Math.abs(t - phraseTime) < Math.abs(best - phraseTime) ? t : best), downbeats[0])
            : phraseTime;
        return {
            time: Math.max(earliest, Math.min(duration, bar + nudge)),
            snappedTo: 'phrase',
            barIndex: Math.round((bar + nudge) / barSeconds),
        };
    }

    // 2. Otherwise the last bar line at or before the target.
    let bar = null;
    if (downbeats.length) {
        for (const downbeat of downbeats) {
            if (downbeat > target) break;
            bar = downbeat;
        }
        if (bar === null) bar = downbeats[0];
    }

    if (bar !== null && bar >= earliest) {
        return {
            time: Math.max(earliest, Math.min(duration, bar + nudge)),
            snappedTo: 'bar',
            barIndex: Math.round((bar + nudge) / barSeconds),
        };
    }

    // 3. Fall back to the closest beat.
    let nearest = beats[0];
    for (const beat of beats) {
        if (Math.abs(beat - target) < Math.abs(nearest - target)) nearest = beat;
    }

    return {
        time: Math.max(earliest, Math.min(duration, nearest + nudge)),
        snappedTo: 'downbeat',
        barIndex: Math.round((nearest + nudge) / barSeconds),
    };
}

/**
 * Where inside the incoming track the blend should enter.
 *
 * A DJ does not start a track at 0:00 — they drop it where the music
 * actually begins. We pick the first downbeat whose energy is at or above the
 * track's own median, so the incoming track enters with content instead of a
 * quiet ambient intro (which would make the blend sound like a plain fade).
 */
export function findIncomingStart(analysis) {
    const downbeats = analysis?.downbeats?.length ? analysis.downbeats : analysis?.beats || [];
    if (!downbeats.length) return { time: 0, offset: 0 };

    const curve = analysis?.energyCurve || [];

    // Median energy of the track (a rough "how loud is this normally" mark).
    let median = 0;
    if (curve.length) {
        const sorted = [...curve].sort((a, b) => a - b);
        median = sorted[Math.floor(sorted.length / 2)] || 0;
    }

    // The first downbeat with meaningful energy.
    for (const downbeat of downbeats) {
        if (downbeat < 0.2) continue;
        const energy = curve[Math.floor(downbeat)] ?? 0;
        if (!median || energy >= median * 0.9) {
            return { time: downbeat, offset: downbeat };
        }
    }

    // Nothing energetic early on — fall back to the first real downbeat.
    const first = downbeats.find((d) => d >= 0.35) ?? downbeats[0];
    return { time: first, offset: first };
}
