/**
 * AutoMix engine singleton.
 *
 * The engine owns the two <audio> decks and the Web Audio graph, so it must
 * be created only once per session (createMediaElementSource can only be
 * attached to an element a single time).
 */

import { AutoMixEngine } from './engine/AutoMixEngine.js';

if (!window.__mehfilAudioA) {
    window.__mehfilAudioA = new Audio();
    window.__mehfilAudioA.crossOrigin = 'anonymous';
}
if (!window.__mehfilAudioB) {
    window.__mehfilAudioB = new Audio();
    window.__mehfilAudioB.crossOrigin = 'anonymous';
}

export const autoMixEngine = window.__mehfilAutoMixEngine
    || (window.__mehfilAutoMixEngine = new AutoMixEngine({
        elements: {
            A: window.__mehfilAudioA,
            B: window.__mehfilAudioB,
        },
    }));

export { AutoMixEngine } from './engine/AutoMixEngine.js';
export { ENGINE_EVENTS } from './engine/events.js';
export { STATES } from './engine/stateMachine.js';
