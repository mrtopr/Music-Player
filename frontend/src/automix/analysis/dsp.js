/**
 * Pure DSP core — no DOM, no Web Audio.
 *
 * Everything here is a pure function over PCM so it can run either on the
 * main thread or inside a Worker (the analysis is CPU heavy: ~6 400 FFTs for
 * a 75-second excerpt, which must not block the UI).
 *
 * Pipeline:
 *   PCM ─▶ FFT (Hann, 2048/512)
 *       ├─▶ spectral flux ─▶ onset envelope ─▶ autocorrelation ─▶ BPM + beat phase
 *       └─▶ chroma (pitch-class energy) ─▶ Krumhansl-Schmuckler ─▶ key + Camelot
 *   PCM ─▶ RMS ─▶ energy curve / loudness / danceability
 *   PCM ─▶ peak buckets ─▶ waveform
 */

/* ────────────────────────────── FFT ────────────────────────────── */

const fftTables = new Map();

function fftTable(size) {
    if (fftTables.has(size)) return fftTables.get(size);

    const cos = new Float32Array(size / 2);
    const sin = new Float32Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
        cos[i] = Math.cos((2 * Math.PI * i) / size);
        sin[i] = Math.sin((2 * Math.PI * i) / size);
    }

    const reverse = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
        let rev = 0;
        for (let b = 0; b < bits; b++) rev = (rev << 1) | ((i >> b) & 1);
        reverse[i] = rev;
    }

    const table = { cos, sin, reverse };
    fftTables.set(size, table);
    return table;
}

/** In-place iterative radix-2 FFT. */
export function fft(re, im) {
    const n = re.length;
    const { cos, sin, reverse } = fftTable(n);

    for (let i = 0; i < n; i++) {
        const j = reverse[i];
        if (j > i) {
            let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
            tmp = im[i]; im[i] = im[j]; im[j] = tmp;
        }
    }

    for (let size = 2; size <= n; size *= 2) {
        const half = size / 2;
        const step = n / size;
        for (let i = 0; i < n; i += size) {
            for (let j = i, k = 0; j < i + half; j++, k += step) {
                const l = j + half;
                const tre = re[l] * cos[k] + im[l] * sin[k];
                const tim = -re[l] * sin[k] + im[l] * cos[k];
                re[l] = re[j] - tre;
                im[l] = im[j] - tim;
                re[j] += tre;
                im[j] += tim;
            }
        }
    }
}

function hannWindow(size) {
    const w = new Float32Array(size);
    for (let i = 0; i < size; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    return w;
}

/* ─────────────────────────── Key detection ─────────────────────────── */

const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const CAMELOT_MINOR = [5, 11, 7, 2, 9, 4, 6, 12, 1, 8, 3, 10];

export function camelotFor(pitchClass, isMinor) {
    const pc = ((pitchClass % 12) + 12) % 12;
    return `${(isMinor ? CAMELOT_MINOR : CAMELOT_MAJOR)[pc]}${isMinor ? 'A' : 'B'}`;
}

function correlate(vector, profile) {
    const n = vector.length;
    let vSum = 0, pSum = 0, vSq = 0, pSq = 0, prod = 0;
    for (let i = 0; i < n; i++) {
        vSum += vector[i];
        pSum += profile[i];
        vSq += vector[i] * vector[i];
        pSq += profile[i] * profile[i];
        prod += vector[i] * profile[i];
    }
    const num = prod - (vSum * pSum) / n;
    const den = Math.sqrt((vSq - (vSum * vSum) / n) * (pSq - (pSum * pSum) / n));
    return den === 0 ? 0 : num / den;
}

/* ───────────────────────────── Analysis ───────────────────────────── */

export const FRAME_SIZE = 2048;
export const HOP_SIZE = 512;
/** The key detector needs finer frequency resolution than the onset detector:
 *  a 2048-point FFT at 44.1 kHz has 21.5 Hz bins, which is coarser than the
 *  13 Hz semitone spacing around A3 — the peaks smear across pitch classes.
 */
const CHROMA_FRAME_SIZE = 4096;
const CHROMA_HOP_SIZE = 2048;

/** Half a semitone expressed in octaves (the log-frequency distance). */
const HALF_SEMITONE = 0.5 / 12;

/**
 * Chroma via a log-frequency band sum.
 *
 * Every FFT bin is assigned to the *whole* energy of the semitone whose band
 * it falls into (instead of splitting it between two pitch classes), which
 * keeps sharp peaks from bleeding into their neighbours.
 */
function computeChroma(mono, sampleRate, frameSize = CHROMA_FRAME_SIZE, hopSize = CHROMA_HOP_SIZE) {
    const window = hannWindow(frameSize);
    const frames = Math.floor((mono.length - frameSize) / hopSize);
    const chroma = new Float32Array(12);
    if (frames <= 0) return chroma;

    const binHz = sampleRate / frameSize;
    const minBin = Math.max(1, Math.floor(55 / binHz));
    const maxBin = Math.min(frameSize / 2 - 1, Math.ceil(2000 / binHz));

    for (let f = 0; f < frames; f++) {
        const offset = f * hopSize;
        const re = new Float32Array(frameSize);
        const im = new Float32Array(frameSize);
        for (let i = 0; i < frameSize; i++) re[i] = (mono[offset + i] || 0) * window[i];
        fft(re, im);

        for (let bin = minBin; bin <= maxBin; bin++) {
            const freq = bin * binHz;
            if (freq < 55 || freq > 2000) continue;

            // Nearest semitone centre (in MIDI numbers).
            const midiFloat = 69 + 12 * Math.log2(freq / 440);
            const nearest = Math.round(midiFloat);
            if (nearest < 21 || nearest > 108) continue;

            const centre = 440 * Math.pow(2, (nearest - 69) / 12);
            // Only bins inside the semitone's band contribute.
            if (Math.abs(Math.log2(freq / centre)) > HALF_SEMITONE) continue;

            const pitchClass = ((nearest % 12) + 12) % 12;
            chroma[pitchClass] += Math.hypot(re[bin], im[bin]);
        }
    }

    return chroma;
}

/**
 * One FFT pass yields both the onset envelope and the chroma vector.
 */
function analyzeSpectrum(mono, sampleRate, frameSize, hopSize) {
    const window = hannWindow(frameSize);
    const frames = Math.floor((mono.length - frameSize) / hopSize);
    const envelope = new Float32Array(Math.max(0, frames));
    const chroma = new Float32Array(12);
    if (frames <= 0) return { envelope, chroma };

    const binHz = sampleRate / frameSize;
    const minBin = Math.max(1, Math.floor(55 / binHz));
    const maxBin = Math.min(frameSize / 2 - 1, Math.ceil(2000 / binHz));

    let prevMag = new Float32Array(frameSize / 2);

    for (let f = 0; f < frames; f++) {
        const offset = f * hopSize;
        const re = new Float32Array(frameSize);
        const im = new Float32Array(frameSize);
        for (let i = 0; i < frameSize; i++) re[i] = (mono[offset + i] || 0) * window[i];

        fft(re, im);

        const half = frameSize / 2;
        const mag = new Float32Array(half);
        for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i]);

        let flux = 0;
        for (let i = 1; i < half; i++) {
            const diff = mag[i] - prevMag[i];
            if (diff > 0) flux += diff;
        }
        envelope[f] = flux;
        prevMag = mag;
    }

    // Normalise the envelope.
    let max = 0;
    for (let i = 0; i < envelope.length; i++) if (envelope[i] > max) max = envelope[i];
    if (max > 0) for (let i = 0; i < envelope.length; i++) envelope[i] /= max;

    return { envelope, chroma };
}

/** Autocorrelation tempo estimation with octave-error correction. */
export function estimateTempo(envelope, sampleRate, hopSize) {
    const fps = sampleRate / hopSize;
    if (envelope.length < 16) return { bpm: 0, confidence: 0 };

    const minLag = Math.floor((fps * 60) / 200);
    const maxLag = Math.ceil((fps * 60) / 55);
    if (maxLag >= envelope.length) return { bpm: 0, confidence: 0 };

    let mean = 0;
    for (let i = 0; i < envelope.length; i++) mean += envelope[i];
    mean /= envelope.length;

    const centered = new Float32Array(envelope.length);
    for (let i = 0; i < envelope.length; i++) centered[i] = envelope[i] - mean;

    const scores = new Map();
    let bestLag = 0;
    let bestScore = 0;

    for (let lag = minLag; lag <= maxLag; lag++) {
        let sum = 0;
        for (let i = 0; i + lag < centered.length; i++) sum += centered[i] * centered[i + lag];
        const raw = sum / (centered.length - lag);

        // Tempo prior: favour the 90–150 BPM band. Without it the
        // autocorrelation happily reports the double-time peak (e.g. 187 for a
        // ballad that really is 94), and the choice flips between different
        // recordings of the same song.
        const bpm = (fps * 60) / lag;
        const prior = Math.exp(-Math.pow(Math.log2(bpm / 120), 2) / (2 * Math.pow(0.55, 2)));
        const weighted = raw * prior;

        scores.set(lag, weighted);
        if (weighted > bestScore) {
            bestScore = weighted;
            bestLag = lag;
        }
    }

    if (!bestLag) return { bpm: 0, confidence: 0 };

    // Octave correction: prefer the candidate closest to a plausible tempo.
    let bestBpm = 0;
    let bestCandidate = -Infinity;
    for (const lag of [bestLag, Math.round(bestLag / 2), bestLag * 2]) {
        if (lag < minLag || lag > maxLag) continue;
        const bpm = (fps * 60) / lag;
        if (bpm < 70 || bpm > 190) continue;
        const score = scores.get(lag) ?? 0;
        if (score > bestCandidate) {
            bestCandidate = score;
            bestBpm = bpm;
        }
    }

    return {
        bpm: Math.round(bestBpm * 10) / 10,
        confidence: Math.max(0, Math.min(1, bestCandidate * 8)),
    };
}

/** The offset of the beat grid that best matches the onset envelope. */
export function estimateBeatPhase(envelope, lag) {
    if (!lag || envelope.length < lag) return 0;
    let bestOffset = 0;
    let bestScore = -Infinity;
    for (let offset = 0; offset < lag; offset++) {
        let score = 0;
        for (let i = offset; i < envelope.length; i += lag) score += envelope[i];
        if (score > bestScore) {
            bestScore = score;
            bestOffset = offset;
        }
    }
    return bestOffset;
}

function detectKeyFromChroma(chroma) {
    let max = 0;
    for (let i = 0; i < 12; i++) if (chroma[i] > max) max = chroma[i];
    if (max <= 0) return null;

    // ── Harmonic overtone reinforcement ──
    // A root note is the one that has a fifth and a third above it. Boosting
    // those relationships sharpens the root estimate, which matters for dense
    // mixes where the raw chroma vector is noisy.
    const overtone = new Float32Array(12);
    for (let pc = 0; pc < 12; pc++) {
        const fifth = (pc + 7) % 12;
        const third = Math.max(chroma[(pc + 4) % 12], chroma[(pc + 3) % 12]);
        overtone[pc] = chroma[pc] + chroma[fifth] * 0.7 + third * 0.5;
    }
    let maxOvertone = 0;
    for (let i = 0; i < 12; i++) if (overtone[i] > maxOvertone) maxOvertone = overtone[i];
    if (maxOvertone <= 0) maxOvertone = 1;

    const normalised = new Float32Array(12);
    for (let i = 0; i < 12; i++) {
        normalised[i] = 0.65 * (chroma[i] / max) + 0.35 * (overtone[i] / maxOvertone);
    }

    let best = { score: -Infinity, pitchClass: 0, minor: false };
    for (let pc = 0; pc < 12; pc++) {
        // The profile is indexed by scale degree, so the tonic (the biggest
        // value) must land on the root pitch class:
        //   rotated[(degree + root) % 12] = profile[degree]
        const rotatedMajor = new Array(12);
        const rotatedMinor = new Array(12);
        for (let degree = 0; degree < 12; degree++) {
            rotatedMajor[(degree + pc) % 12] = KS_MAJOR[degree];
            rotatedMinor[(degree + pc) % 12] = KS_MINOR[degree];
        }

        const majorScore = correlate(normalised, rotatedMajor);
        const minorScore = correlate(normalised, rotatedMinor);

        if (majorScore > best.score) best = { score: majorScore, pitchClass: pc, minor: false };
        if (minorScore > best.score) best = { score: minorScore, pitchClass: pc, minor: true };
    }

    return {
        pitchClass: best.pitchClass,
        minor: best.minor,
        name: `${PITCH_NAMES[best.pitchClass]} ${best.minor ? 'minor' : 'major'}`,
        camelot: camelotFor(best.pitchClass, best.minor),
        confidence: Math.max(0, Math.min(1, (best.score + 1) / 2)),
    };
}

function rms(signal, from = 0, to = signal.length) {
    let sum = 0;
    const end = Math.min(to, signal.length);
    for (let i = from; i < end; i++) sum += signal[i] * signal[i];
    return Math.sqrt(sum / Math.max(1, end - from));
}

/** Peak-amplitude buckets across the track. */
export function buildWaveform(mono, buckets = 320) {
    const out = new Array(buckets).fill(0);
    const per = mono.length / buckets;
    for (let b = 0; b < buckets; b++) {
        const from = Math.floor(b * per);
        const to = Math.min(mono.length, Math.floor((b + 1) * per));
        let peak = 0;
        for (let i = from; i < to; i++) {
            const v = Math.abs(mono[i]);
            if (v > peak) peak = v;
        }
        out[b] = peak;
    }
    const max = out.reduce((m, v) => (v > m ? v : m), 0) || 1;
    return out.map((v) => v / max);
}

/** Per-second RMS curve. */
export function buildEnergyCurve(mono, sampleRate, seconds = 240) {
    const curve = [];
    const per = sampleRate;
    for (let s = 0; s < seconds; s++) {
        const from = s * per;
        if (from >= mono.length) break;
        curve.push(rms(mono, from, from + per));
    }
    const max = curve.reduce((m, v) => (v > m ? v : m), 0) || 1;
    return curve.map((v) => v / max);
}

/**
 * Full analysis of a mono PCM buffer.
 *
 * @param {Float32Array} mono
 * @param {number} sampleRate
 * @param {object} options
 * @returns {object} analysis
 */
export function analyzePcm(mono, sampleRate, options = {}) {
    const frameSize = options.frameSize ?? FRAME_SIZE;
    const hopSize = options.hopSize ?? HOP_SIZE;
    const analysisSeconds = options.analysisSeconds ?? 75;

    if (!mono?.length || !sampleRate) {
        return {
            bpm: 0, bpmConfidence: 0, key: null, camelot: null, keyConfidence: 0,
            energy: 0, loudness: -90, danceability: 0, beats: [], downbeats: [],
            waveform: [], energyCurve: [], duration: 0,
        };
    }

    const duration = mono.length / sampleRate;
    const limit = Math.min(mono.length, analysisSeconds * sampleRate);
    const slice = mono.subarray(0, limit);

    const { envelope } = analyzeSpectrum(slice, sampleRate, frameSize, hopSize);
    const chroma = computeChroma(slice, sampleRate);
    const tempo = estimateTempo(envelope, sampleRate, hopSize);

    const fps = sampleRate / hopSize;
    const beatLag = tempo.bpm ? Math.round((fps * 60) / tempo.bpm) : 0;
    const phaseFrames = estimateBeatPhase(envelope, beatLag);

    const beatSeconds = tempo.bpm ? 60 / tempo.bpm : 0;
    const beats = [];
    const downbeats = [];
    if (beatSeconds > 0) {
        const firstBeat = (phaseFrames * hopSize) / sampleRate;
        let index = 0;
        for (let t = firstBeat; t < duration; t += beatSeconds) {
            beats.push(t);
            // Every 4th beat is a bar line (4/4 assumed).
            if (index % 4 === 0) downbeats.push(t);
            index++;
        }
    }

    const key = detectKeyFromChroma(chroma);
    const energy = rms(mono);
    const loudness = energy > 0 ? 20 * Math.log10(energy) : -90;
    // Danceability: onset density (how busy the rhythm is) blended with tempo
    // and energy. Real measurement, not a metadata lookup.
    const onsetCount = countOnsets(envelope);
    const seconds = Math.max(1, limit / sampleRate);
    const onsetDensity = onsetCount / seconds;               // onsets per second
    const densityScore = Math.max(0, Math.min(1, onsetDensity / 8));
    const tempoScore = tempo.bpm ? Math.max(0, Math.min(1, (tempo.bpm - 60) / 100)) : 0.5;
    const energyScore = Math.max(0, Math.min(1, energy * 4));
    const danceability = Math.round((densityScore * 0.45 + tempoScore * 0.3 + energyScore * 0.25) * 100) / 100;

    return {
        bpm: tempo.bpm,
        bpmConfidence: tempo.confidence,
        key: key?.name ?? null,
        camelot: key?.camelot ?? null,
        keyConfidence: key?.confidence ?? 0,
        // A mastered track sits around −20 dBFS RMS, so scale into 0..1
        // without saturating every loud track at 1.0.
        energy: Math.min(1, Math.max(0, (energy - 0.02) * 3.2)),
        loudness: Math.round(loudness * 10) / 10,
        danceability,
        onsetDensity: Math.round(onsetDensity * 100) / 100,
        beats,
        downbeats,
        waveform: buildWaveform(mono),
        energyCurve: buildEnergyCurve(mono, sampleRate),
        duration,
        analysedAt: Date.now(),
    };
}

/** Number of peaks in the onset envelope (adaptive threshold). */
function countOnsets(envelope) {
    if (envelope.length < 3) return 0;
    let count = 0;
    const window = 16;
    for (let i = 1; i < envelope.length - 1; i++) {
        let sum = 0;
        let n = 0;
        for (let j = Math.max(0, i - window); j <= Math.min(envelope.length - 1, i + window); j++) {
            sum += envelope[j];
            n++;
        }
        const threshold = (sum / n) * 1.35 + 0.02;
        if (envelope[i] > threshold && envelope[i] >= envelope[i - 1] && envelope[i] > envelope[i + 1]) {
            count++;
        }
    }
    return count;
}
