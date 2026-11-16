/**
 * WSOLA worker — renders the pitch-preserved time-stretch off the main thread.
 *
 * The incoming track's PCM is transferred in (zero copy) and the rendered PCM
 * is transferred back, so neither the decode nor the OLA work can jank the UI.
 */

import { stretchChannels } from './wsola.js';

self.onmessage = (event) => {
    const { id, channels, ratio, options } = event.data || {};
    if (!channels?.length || !ratio) {
        self.postMessage({ id, error: 'missing channels or ratio' });
        return;
    }

    try {
        const started = Date.now();
        const result = stretchChannels(
            channels.map((c) => new Float32Array(c)),
            ratio,
            options || {},
        );

        const buffers = result.channels.map((c) => c.buffer);
        self.postMessage(
            {
                id,
                channels: result.channels,
                outputDuration: result.outputDuration,
                ratio: result.ratio,
                renderMs: Date.now() - started,
            },
            buffers,
        );
    } catch (error) {
        self.postMessage({ id, error: error?.message || 'stretch failed' });
    }
};
