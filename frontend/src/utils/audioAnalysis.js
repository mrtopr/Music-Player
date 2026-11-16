/**
 * Audio analysis — thin re-export of the AutoMix engine's worker-based
 * analyzer so existing call sites keep working.
 *
 * @see ../automix/analysis/TrackAnalyzer.js
 */

export {
    analyzeTracks,
    getAnalysis,
    clearAnalysisCache,
    proxyAudioUrl,
    fetchAndDecode,
} from '../automix/analysis/TrackAnalyzer.js';

export {
    analyzePcm,
    camelotFor,
    estimateTempo,
    estimateBeatPhase,
    buildWaveform,
    buildEnergyCurve,
} from '../automix/analysis/dsp.js';

export {
    keyScore,
    parseCamelot,
    pitchClassOf,
    keyCompatibilityLabel,
    camelotNeighbours,
    keyName,
} from '../automix/scoring/camelot.js';

/**
 * Picks a mid-quality stream for analysis.
 * 96 kbps is plenty for tempo/key detection and ~3x smaller than 320 kbps.
 */
export function pickAnalysisUrl(song) {
    const list = song?.downloadUrl || song?.download_url || [];
    if (Array.isArray(list) && list.length) {
        const preferred = ['96kbps', '160kbps', '48kbps', '32kbps', '12kbps'];
        for (const quality of preferred) {
            const hit = list.find((entry) => entry?.quality === quality && entry?.url);
            if (hit) return hit.url;
        }
        const fallback = list.find((entry) => entry?.url);
        if (fallback) return fallback.url;
    }
    return song?.analysisUrl || null;
}
