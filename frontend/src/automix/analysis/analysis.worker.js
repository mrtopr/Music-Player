/**
 * Analysis worker — runs the DSP off the main thread.
 *
 * The FFT chain needs ~6 400 transforms per track; on the main thread that
 * blocks scrolling and animation for seconds. Here the PCM is transferred
 * (zero-copy) and the result comes back as a plain object.
 */

import { analyzePcm } from './dsp.js';

self.onmessage = (event) => {
    const { id, mono, sampleRate, options } = event.data || {};
    if (!mono) {
        self.postMessage({ id, error: 'no PCM supplied' });
        return;
    }

    try {
        const started = Date.now();
        const analysis = analyzePcm(new Float32Array(mono), sampleRate, options || {});
        analysis.analysisMs = Date.now() - started;
        self.postMessage({ id, analysis });
    } catch (error) {
        self.postMessage({ id, error: error?.message || 'analysis failed' });
    }
};
