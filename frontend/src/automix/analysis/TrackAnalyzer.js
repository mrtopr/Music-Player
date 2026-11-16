/**
 * TrackAnalyzer — turns a track into a full analysis.
 *
 * Pipeline (all measured from the real audio, nothing is faked):
 *
 *   1. fetch bytes through our own proxy (the CDNs don't allow CORS)
 *   2. decode with the Web Audio API
 *   3. run the DSP in a Worker (FFT / tempo / chroma)
 *   4. detect intro / drop / breakdown / outro and bar phrases
 *
 * Results are cached per track id for the session.
 */

import { analyzePcm } from './dsp.js';
import { detectSections, buildPhrases } from './phrases.js';
import { API_BASE_URL } from '../../api/client.js';
import { resolveProvider } from '../providers/index.js';

const analysisCache = new Map();
const inFlight = new Map();

/**
 * Short-lived caches so the analysis and the time-stretch do not download and
 * decode the same track twice.
 *
 * `bytesCache` holds the raw download (a few MB), `decodedCache` holds the
 * decoded buffer of the *last* analysed track only (decoded audio is large, so
 * it is never kept for more than one track).
 */
const bytesCache = new Map();
const BYTES_CACHE_MAX = 3;
let decodedCache = null;

function cacheBytes(url, bytes) {
    if (bytesCache.size >= BYTES_CACHE_MAX) {
        bytesCache.delete(bytesCache.keys().next().value);
    }
    bytesCache.set(url, bytes);
}

/** The decoded buffer of the most recent track (null if it is a different one). */
export function getDecodedTrack(url) {
    return decodedCache && decodedCache.url === url ? decodedCache : null;
}

let analysisWorker = null;
let workerCounter = 0;
const workerJobs = new Map();

function getWorker() {
    if (analysisWorker) return analysisWorker;
    try {
        analysisWorker = new Worker(new URL('./analysis.worker.js', import.meta.url), { type: 'module' });
        analysisWorker.onmessage = (event) => {
            const { id, analysis, error } = event.data || {};
            const job = workerJobs.get(id);
            if (!job) return;
            workerJobs.delete(id);
            if (error) job.reject(new Error(error));
            else job.resolve(analysis);
        };
        analysisWorker.onerror = (event) => {
            console.warn('[AutoMix] analysis worker failed, falling back to main thread:', event?.message);
            analysisWorker = null;
            for (const job of workerJobs.values()) job.reject(new Error('worker error'));
            workerJobs.clear();
        };
    } catch (error) {
        console.warn('[AutoMix] Could not start the analysis worker:', error?.message);
        analysisWorker = null;
    }
    return analysisWorker;
}

/** Runs the DSP in the worker when possible, on the main thread otherwise. */
function runDsp(mono, sampleRate, options) {
    const worker = getWorker();
    if (!worker) {
        return Promise.resolve(analyzePcm(mono, sampleRate, options));
    }

    const id = ++workerCounter;
    return new Promise((resolve, reject) => {
        workerJobs.set(id, { resolve, reject });
        const copy = mono.slice();
        worker.postMessage({ id, mono: copy.buffer, sampleRate, options }, [copy.buffer]);
    }).catch(() => analyzePcm(mono, sampleRate, options));
}

let decodeContext = null;
function getDecodeContext() {
    if (!decodeContext) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        decodeContext = new Ctx();
    }
    return decodeContext;
}

export function proxyAudioUrl(url) {
    return `${API_BASE_URL}/api/audio/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Fetches + decodes a track.
 * @returns {{ buffer: AudioBuffer, channels: Float32Array[], sampleRate: number }}
 */
export async function fetchAndDecode(url, { signal } = {}) {
    let bytes = bytesCache.get(url);
    if (!bytes) {
        const res = await fetch(proxyAudioUrl(url), { signal });
        if (!res.ok) throw new Error(`Audio fetch failed (${res.status})`);
        bytes = await res.arrayBuffer();
        cacheBytes(url, bytes);
    }

    const ctx = getDecodeContext();
    const buffer = await ctx.decodeAudioData(bytes.slice(0));

    const channels = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        channels.push(new Float32Array(buffer.getChannelData(c)));
    }

    // Remember it for the time-stretch step (one track only).
    decodedCache = { url, buffer, channels, sampleRate: buffer.sampleRate, duration: buffer.duration };

    return { buffer, channels, sampleRate: buffer.sampleRate, duration: buffer.duration };
}

/** Mono mix-down used for the analysis. */
export function toMono(channels, length) {
    const mono = new Float32Array(length);
    for (const channel of channels) {
        for (let i = 0; i < length; i++) mono[i] += (channel[i] || 0) / channels.length;
    }
    return mono;
}

/**
 * Full analysis of a track.
 * @param {{ id:string }} track
 * @param {{ url:string }} source
 */
export async function analyzeTrack(track, source, options = {}) {
    if (!track?.id) return null;
    if (analysisCache.has(track.id)) return analysisCache.get(track.id);
    if (inFlight.has(track.id)) return inFlight.get(track.id);

    const task = (async () => {
        const { buffer, channels, sampleRate } = await fetchAndDecode(source.url, options);

        // The DSP only needs the first ~75 s, so we slice before transferring.
        const analysisLength = Math.min(
            buffer.length,
            Math.floor((options.analysisSeconds ?? 75) * sampleRate),
        );
        const mono = toMono(channels, analysisLength);

        const raw = await runDsp(mono, sampleRate, options);
        const analysis = {
            ...raw,
            duration: buffer.duration,
            sampleRate,
            sections: detectSections(raw),
            phrases: buildPhrases(raw.downbeats?.length ? raw.downbeats : raw.beats, 8),
        };

        analysisCache.set(track.id, analysis);
        return analysis;
    })();

    inFlight.set(track.id, task);
    try {
        return await task;
    } finally {
        inFlight.delete(track.id);
    }
}

/**
 * Batch analysis with limited concurrency.
 * @param {Array} songs
 * @param {{ concurrency?:number, onProgress?:Function, onResult?:Function, quality?:string }} options
 */
export async function analyzeTracks(songs, options = {}) {
    const list = (songs || []).filter((song) => song && song.id);
    if (!list.length) return new Map();

    const concurrency = options.concurrency ?? 2;
    const results = new Map();
    let cursor = 0;
    let done = 0;

    const worker = async () => {
        while (cursor < list.length) {
            const song = list[cursor++];
            let result = null;
            try {
                const provider = resolveProvider(song);
                const source = await provider.getPlaybackSource(song, { quality: options.quality || '96kbps' });
                result = await analyzeTrack(song, source, options);
            } catch (error) {
                console.warn('[AutoMix] Analysis failed for', song.title || song.name, error?.message);
            }
            results.set(song.id, result);
            done++;
            options.onResult?.(song.id, result);
            options.onProgress?.(done, list.length);
        }
    };

    await Promise.all(
        Array.from({ length: Math.min(concurrency, list.length) }, worker),
    );

    return results;
}

export function getAnalysis(trackId) {
    return analysisCache.get(trackId) ?? null;
}

export function clearAnalysisCache() {
    analysisCache.clear();
}

/** Exposed for the stretch worker (separate module, same caching idea). */
export { analysisCache };
