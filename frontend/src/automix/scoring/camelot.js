/**
 * Camelot wheel — harmonic mixing.
 *
 * The wheel numbers musical keys so that neighbouring positions sound good
 * together. `A` = minor, `B` = major.
 *
 * Compatibility is scored, not boolean: the engine blends *gradually*, so a
 * "clashing" pair still gets a shorter, harder transition rather than being
 * forbidden.
 */

// pitch class (0 = C) → Camelot number
const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const CAMELOT_MINOR = [5, 11, 7, 2, 9, 4, 6, 12, 1, 8, 3, 10];

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function camelotFor(pitchClass, isMinor) {
    const pc = ((pitchClass % 12) + 12) % 12;
    return `${(isMinor ? CAMELOT_MINOR : CAMELOT_MAJOR)[pc]}${isMinor ? 'A' : 'B'}`;
}

export function parseCamelot(code) {
    const match = /^(\d{1,2})([AB])$/i.exec(String(code || '').trim());
    if (!match) return null;
    const number = Number(match[1]);
    if (number < 1 || number > 12) return null;
    return { number, letter: match[2].toUpperCase() };
}

export function pitchClassOf(code) {
    const parsed = parseCamelot(code);
    if (!parsed) return null;
    for (let pc = 0; pc < 12; pc++) {
        if (camelotFor(pc, parsed.letter === 'A') === `${parsed.number}${parsed.letter}`) return pc;
    }
    return null;
}

/**
 * Score two keys, 0..100.
 *
 *   identical key                → 100
 *   ±1 on the wheel              →  90   (energy lift)
 *   ±2 on the wheel              →  70   (bigger lift, still smooth)
 *   relative major/minor         →  85
 *   diagonal (±1 across A/B)     →  55
 *   anything else                →  20
 */
export function keyScore(codeA, codeB) {
    const a = parseCamelot(codeA);
    const b = parseCamelot(codeB);
    if (!a || !b) return 50; // unknown → neutral

    const diff = (b.number - a.number + 12) % 12;

    if (a.letter === b.letter) {
        if (diff === 0) return 100;
        if (diff === 1 || diff === 11) return 90;
        if (diff === 2 || diff === 10) return 70;
        return 20;
    }

    // Different letter: same number → relative major/minor.
    if (diff === 0) return 85;
    if (diff === 1 || diff === 11) return 55;
    return 20;
}

/** Human readable description used in the UI. */
export function keyCompatibilityLabel(codeA, codeB) {
    const score = keyScore(codeA, codeB);
    if (score >= 95) return { score, label: 'Perfect key match', tone: 'good' };
    if (score >= 85) return { score, label: 'Harmonically compatible', tone: 'good' };
    if (score >= 70) return { score, label: 'Close, slight tension', tone: 'ok' };
    if (score >= 50) return { score, label: 'Diagonal move', tone: 'ok' };
    if (score >= 40) return { score, label: 'Unknown key', tone: 'neutral' };
    return { score, label: 'Clashing keys', tone: 'bad' };
}

/** The two neighbours of a key on the wheel (for "energy lift" suggestions). */
export function camelotNeighbours(code) {
    const parsed = parseCamelot(code);
    if (!parsed) return [];
    const up = ((parsed.number % 12) + 1);
    const down = ((parsed.number + 10) % 12) + 1;
    return [`${up}${parsed.letter}`, `${down}${parsed.letter}`];
}

export function keyName(pitchClass, isMinor) {
    const pc = ((pitchClass % 12) + 12) % 12;
    return `${PITCH_NAMES[pc]} ${isMinor ? 'minor' : 'major'}`;
}
