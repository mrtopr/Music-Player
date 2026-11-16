/**
 * Minimal typed event emitter for the AutoMix engine.
 *
 * The UI never polls: every visual state is driven by an engine event, so the
 * animation always reflects the real audio-engine state.
 */
export class EventEmitter {
    constructor() {
        this._listeners = new Map();
    }

    on(event, handler) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }

    once(event, handler) {
        const off = this.on(event, (payload) => {
            off();
            handler(payload);
        });
        return off;
    }

    off(event, handler) {
        this._listeners.get(event)?.delete(handler);
    }

    emit(event, payload) {
        const listeners = this._listeners.get(event);
        if (!listeners) return;
        for (const handler of [...listeners]) {
            try {
                handler(payload);
            } catch (error) {
                console.error(`[AutoMix] listener for "${event}" failed:`, error);
            }
        }
    }

    removeAll() {
        this._listeners.clear();
    }
}

/** Every event the engine can emit. */
export const ENGINE_EVENTS = {
    STATE: 'engine:state',
    ANALYSIS_READY: 'analysis:ready',
    DECK_LOADING: 'deck:loading',
    DECK_ANALYZING: 'deck:analyzing',
    DECK_SYNCING: 'deck:syncing',
    DECK_READY: 'deck:ready',
    DECK_FAILED: 'deck:failed',
    TRANSITION_SCHEDULED: 'transition:scheduled',
    TRANSITION_STARTING: 'transition:starting',
    TRANSITION_MIXING: 'transition:mixing',
    TRANSITION_COMPLETE: 'transition:complete',
    TRANSITION_FAILED: 'transition:failed',
    PLAN: 'engine:plan',
};
