/**
 * AutoMix state machine.
 *
 * The engine can only be in one state at a time and every transition is
 * explicit, so the UI can rely on `engine:state` events instead of guessing.
 */

export const STATES = {
    IDLE: 'idle',
    PREPARING: 'preparing',
    ANALYZING: 'analyzing',
    SYNCING: 'syncing',
    READY: 'ready',
    TRANSITIONING: 'transitioning',
    MIXING: 'mixing',
    COMPLETED: 'completed',
    FAILED: 'failed',
};

/** Allowed transitions. Anything not listed here is rejected. */
const ALLOWED = {
    [STATES.IDLE]: [STATES.PREPARING, STATES.COMPLETED],
    [STATES.PREPARING]: [STATES.ANALYZING, STATES.FAILED],
    [STATES.ANALYZING]: [STATES.SYNCING, STATES.FAILED],
    [STATES.SYNCING]: [STATES.READY, STATES.FAILED],
    [STATES.READY]: [STATES.TRANSITIONING, STATES.PREPARING, STATES.IDLE, STATES.FAILED],
    [STATES.TRANSITIONING]: [STATES.MIXING, STATES.COMPLETED, STATES.FAILED, STATES.IDLE],
    [STATES.MIXING]: [STATES.COMPLETED, STATES.FAILED, STATES.IDLE],
    [STATES.COMPLETED]: [STATES.PREPARING, STATES.IDLE],
    [STATES.FAILED]: [STATES.READY, STATES.PREPARING, STATES.IDLE],
};

export class StateMachine {
    constructor(initial = STATES.IDLE, onChange = null) {
        this.state = initial;
        this.previous = null;
        this.onChange = onChange;
        this.reason = null;
    }

    can(next) {
        return (ALLOWED[this.state] || []).includes(next);
    }

    /** @returns {boolean} true when the transition was accepted. */
    transition(next, reason = null) {
        if (next === this.state) return false;
        if (!this.can(next)) {
            console.warn(`[AutoMix] illegal transition ${this.state} → ${next}`);
            return false;
        }
        this.previous = this.state;
        this.state = next;
        this.reason = reason;
        this.onChange?.(next, this.previous, reason);
        return true;
    }

    is(...states) {
        return states.includes(this.state);
    }

    reset() {
        this.previous = this.state;
        this.state = STATES.IDLE;
        this.reason = null;
        this.onChange?.(this.state, this.previous, null);
    }
}
