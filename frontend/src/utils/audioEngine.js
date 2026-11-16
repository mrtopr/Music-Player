/**
 * Compatibility shim.
 *
 * The AutoMix engine (`src/automix`) now owns the Web Audio graph and both
 * decks. This module keeps the old `audioEngine.*` API working so the rest of
 * the player code does not have to change all at once.
 *
 * @see ../automix/engine/AutoMixEngine.js
 */

import { autoMixEngine } from '../automix/index.js';

export const audioEngine = {
    get initialized() {
        return !!autoMixEngine.ctx;
    },

    get ctx() {
        return autoMixEngine.ctx;
    },

    init() {
        autoMixEngine.init();
    },

    async resume() {
        return autoMixEngine.resume();
    },

    /** Legacy even crossfade — now a scheduled pair of automation curves. */
    crossfade(fromChannel, toChannel, duration = 5000, targetVolume = 0.8) {
        const from = autoMixEngine.decks?.[fromChannel];
        const to = autoMixEngine.decks?.[toChannel];
        if (!from || !to || !autoMixEngine.ctx) return;

        const now = autoMixEngine.ctx.currentTime;
        const steps = 50;
        const outCurve = new Float32Array(steps);
        const inCurve = new Float32Array(steps);
        for (let i = 0; i < steps; i++) {
            const progress = i / (steps - 1);
            // Equal-power law keeps the perceived loudness constant.
            outCurve[i] = Math.max(0.0001, targetVolume * Math.cos((progress * Math.PI) / 2));
            inCurve[i] = Math.max(0.0001, targetVolume * Math.sin((progress * Math.PI) / 2));
        }

        from.gain.gain.cancelScheduledValues(now);
        from.gain.gain.setValueCurveAtTime(outCurve, now, duration / 1000);
        to.gain.gain.cancelScheduledValues(now);
        to.gain.gain.setValueCurveAtTime(inCurve, now, duration / 1000);
    },

    sync(channel, volume) {
        autoMixEngine.syncDeck(channel, volume);
    },

    setVolume(channel, volume) {
        autoMixEngine.setMasterVolume(volume);
        autoMixEngine.setDeckVolume(channel, volume);
    },

    get filters() {
        return autoMixEngine.decks?.[autoMixEngine.activeDeckId]?.eq ?? null;
    },

    setUserEq(key, value) {
        autoMixEngine.setUserEq(key, value);
    },

    resetChannel(channel) {
        autoMixEngine.decks?.[channel]?.resetChain();
    },
};

export default audioEngine;
