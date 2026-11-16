/**
 * A Deck is one logical playback position with its own processing chain.
 *
 *   element ─▶ source ─▶ gain ─▶ bass ─▶ mid ─▶ treble ─▶ filter ─▶ master
 *                                     │
 *                                     └▶ echoSend ─▶ delay ⇄ feedback ─▶ wet ─▶ master
 *
 * A deck can additionally play a *rendered segment* (an AudioBuffer produced
 * by the WSOLA time-stretcher) through the same chain. That is how the
 * incoming track gets a sample-accurate, pitch-preserving, beat-aligned
 * entrance while the streaming element keeps handling the rest of the track.
 */

export class Deck {
    /**
     * @param {string} id 'A' | 'B'
     * @param {HTMLAudioElement} element the streaming transport
     * @param {AudioContext} ctx
     * @param {AudioNode} master
     */
    constructor(id, element, ctx, master) {
        this.id = id;
        this.element = element;
        this.ctx = ctx;
        this.master = master;

        this.source = ctx.createMediaElementSource(element);

        this.gain = ctx.createGain();
        this.gain.gain.value = 0;

        this.eq = {
            bass: this.createEq('lowshelf', 200),
            mid: this.createEq('peaking', 1000),
            treble: this.createEq('highshelf', 3000),
        };

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 20000;
        this.filter.Q.value = 0.7;

        // Echo bus (delay + feedback) for the "echo out" transition.
        this.echoSend = ctx.createGain();
        this.echoSend.gain.value = 0;
        this.echoDelay = ctx.createDelay(2);
        this.echoFeedback = ctx.createGain();
        this.echoFeedback.gain.value = 0.35;
        this.echoWet = ctx.createGain();
        this.echoWet.gain.value = 1;

        this.source.connect(this.gain);
        this.gain.connect(this.eq.bass);
        this.eq.bass.connect(this.eq.mid);
        this.eq.mid.connect(this.eq.treble);
        this.eq.treble.connect(this.filter);
        this.filter.connect(master);

        this.gain.connect(this.echoSend);
        this.echoSend.connect(this.echoDelay);
        this.echoDelay.connect(this.echoFeedback);
        this.echoFeedback.connect(this.echoDelay);
        this.echoDelay.connect(this.echoWet);
        this.echoWet.connect(master);

        /** @type {import('../analysis/dsp.js').TrackAnalysis|null} */
        this.analysis = null;
        /** @type {AudioBufferSourceNode|null} */
        this.segmentSource = null;
        this.segmentBuffer = null;
        this.segmentStartedAt = 0;
        this.segmentDuration = 0;

        this.userEq = { bass: 0, mid: 0, treble: 0 };
        this.disposed = false;
    }

    createEq(type, frequency) {
        const node = this.ctx.createBiquadFilter();
        node.type = type;
        node.frequency.value = frequency;
        node.gain.value = 0;
        return node;
    }

    /* ───────────────────────── Transport ───────────────────────── */

    setSource(url) {
        this.stopSegment();
        this.element.src = url;
        this.element.load();
    }

    /**
     * Resolves once the element has enough buffered to start playing
     * immediately (HAVE_FUTURE_DATA).
     *
     * Without this the blend can start on a deck that is still downloading,
     * which sounds like a dropout instead of a transition.
     */
    waitUntilPlayable(timeoutMs = 15000) {
        const element = this.element;
        if (element.readyState >= 3) return Promise.resolve(true);

        return new Promise((resolve) => {
            let settled = false;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                element.removeEventListener('canplaythrough', onReady);
                element.removeEventListener('error', onError);
                clearTimeout(timer);
                resolve(ok);
            };
            const onReady = () => finish(true);
            const onError = () => finish(false);
            const timer = setTimeout(() => finish(false), timeoutMs);

            element.addEventListener('canplaythrough', onReady, { once: true });
            element.addEventListener('error', onError, { once: true });
            // NB: do not call element.load() here — the source was already
            // assigned and loading; restarting it would throw the buffer away.
        });
    }

    clearSource() {
        this.stopSegment();
        this.element.removeAttribute('src');
        this.element.load();
    }

    async play() {
        try {
            await this.element.play();
        } catch (error) {
            // Autoplay can be blocked — the caller decides what to do.
            console.warn(`[AutoMix] deck ${this.id} play blocked:`, error?.message);
        }
    }

    pause() {
        this.element.pause();
    }

    get currentTime() {
        return this.element.currentTime || 0;
    }

    get duration() {
        return this.element.duration || 0;
    }

    get paused() {
        return this.element.paused;
    }

    set playbackRate(rate) {
        this._clearRamp();
        this.element.playbackRate = rate;
    }

    get playbackRate() {
        return this.element.playbackRate || 1;
    }

    /**
     * Eases the playback rate back to a target (Spotify ramps the tempo back
     * to the track's own speed after the blend).
     */
    rampPlaybackRate(target, durationMs) {
        this._clearRamp();
        const start = this.element.playbackRate || 1;
        const steps = Math.max(1, Math.round(durationMs / 100));
        let step = 0;

        this._rampTimer = setInterval(() => {
            step++;
            const progress = Math.min(1, step / steps);
            // Ease-out so the tempo settles gently.
            const eased = 1 - Math.pow(1 - progress, 3);
            this.element.playbackRate = start + (target - start) * eased;
            if (progress >= 1) this._clearRamp();
        }, 100);
    }

    _clearRamp() {
        if (this._rampTimer) {
            clearInterval(this._rampTimer);
            this._rampTimer = null;
        }
    }

    /* ───────────────────── Processed segment ───────────────────── */

    /**
     * Arms a rendered buffer for playback.
     * @param {AudioBuffer} buffer
     * @param {number} when AudioContext time to start
     * @param {number} offset seconds into the buffer
     */
    armSegment(buffer, when, offset = 0) {
        this.stopSegment();
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.gain);
        source.start(when, offset);
        this.segmentSource = source;
        this.segmentBuffer = buffer;
        this.segmentStartedAt = when;
        this.segmentDuration = buffer.duration;
        return source;
    }

    stopSegment() {
        if (!this.segmentSource) return;
        try {
            this.segmentSource.stop();
        } catch {
            // already stopped
        }
        try {
            this.segmentSource.disconnect();
        } catch {
            // already disconnected
        }
        this.segmentSource = null;
        this.segmentBuffer = null;
    }

    /* ─────────────────────── Automation ─────────────────────── */

    /**
     * Schedules the automation curves of a transition on this deck.
     *
     * @param {object} curves { gain, bass, mid, treble, filterFreq, echoSend }
     * @param {number} when AudioContext time to start
     * @param {number} duration seconds
     * @param {number} masterVolume the user's volume (0..1)
     * @param {number} [extraGainDb] loudness normalisation for this deck
     */
    scheduleAutomation(curves, when, duration, masterVolume, extraGainDb = 0) {
        const volume = Math.max(0.0001, masterVolume) * Math.pow(10, extraGainDb / 20);
        const ctx = this.ctx;

        const setCurve = (param, values, scale = 1) => {
            if (!values?.length) return;
            const curve = new Float32Array(values.length);
            for (let i = 0; i < values.length; i++) {
                const v = Number(values[i]);
                curve[i] = Number.isFinite(v) ? v * scale : 0;
            }
            param.cancelScheduledValues(when);
            param.setValueCurveAtTime(curve, when, duration);
        };

        setCurve(this.gain.gain, curves.gain, volume);

        for (const band of ['bass', 'mid', 'treble']) {
            setCurve(this.eq[band].gain, curves[band]);
        }

        setCurve(this.filter.frequency, curves.filterFreq);

        if (curves.filterType && this.filter.type !== curves.filterType) {
            this.filter.type = curves.filterType;
        }

        if (curves.echoSend?.length) {
            setCurve(this.echoSend.gain, curves.echoSend);
        }
    }

    /** Cancels all automation and returns the chain to a neutral state. */
    resetChain(userEq = this.userEq) {
        const now = this.ctx.currentTime;
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setTargetAtTime(0, now, 0.02);

        for (const band of ['bass', 'mid', 'treble']) {
            this.eq[band].gain.cancelScheduledValues(now);
            this.eq[band].gain.setTargetAtTime(userEq[band] ?? 0, now, 0.03);
        }

        this.filter.frequency.cancelScheduledValues(now);
        this.filter.frequency.setTargetAtTime(20000, now, 0.03);

        this.echoSend.gain.cancelScheduledValues(now);
        this.echoSend.gain.setTargetAtTime(0, now, 0.03);
    }

    setUserEq(key, value) {
        this.userEq[key] = value;
        const node = this.eq[key];
        if (!node) return;
        const now = this.ctx.currentTime;
        node.gain.cancelScheduledValues(now);
        node.gain.setTargetAtTime(value, now, 0.02);
    }

    setVolume(value) {
        const now = this.ctx.currentTime;
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setTargetAtTime(Math.max(0.0001, value), now, 0.03);
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.stopSegment();
        try {
            this.source.disconnect();
            this.gain.disconnect();
            this.filter.disconnect();
            this.echoDelay.disconnect();
            this.echoWet.disconnect();
        } catch {
            // already disconnected
        }
    }
}
