/**
 * AutoMixEngine — the mixing engine.
 *
 * It owns the two decks, the master bus and the whole preparation → blend →
 * release cycle. The UI never drives the mixing: it listens to the engine's
 * events (`engine:state`, `deck:*`, `transition:*`) and renders what the
 * engine is actually doing.
 *
 * Cycle:
 *
 *   prepareNext(track)
 *      ├─ provider check        → not processable ⇒ plain handover
 *      ├─ fetch + decode        → DECK_LOADING
 *      ├─ DSP (worker)          → DECK_ANALYZING
 *      ├─ tempo match (WSOLA)   → DECK_SYNCING
 *      └─ armed                 → DECK_READY
 *
 *   scheduleNext()              → transition:scheduled
 *   (at the scheduled time)     → transition:starting
 *   (while both decks play)     → transition:mixing   (progress 0..1)
 *   (when the blend ends)       → transition:complete → outgoing deck released
 */

import { EventEmitter, ENGINE_EVENTS } from './events.js';
import { StateMachine, STATES } from './stateMachine.js';
import { Deck } from './Deck.js';
import { analyzeTrack, getAnalysis, getDecodedTrack } from '../analysis/TrackAnalyzer.js';
import { detectSections, buildPhrases, findTransitionPoint, findIncomingStart } from '../analysis/phrases.js';
import { planTransition, buildTransitionCurves } from './transitionCurves.js';import { tempoRatio, transitionScore } from '../scoring/compatibility.js';
import { resolveProvider, canProcess } from '../providers/index.js';

const CURVE_POINTS = 48;

/** Hard cap for the rendered window (seconds). */
const STRETCH_WINDOW_SECONDS = 45;

/** Extra seconds rendered beyond the blend, for the hand-over to the element. */
const STRETCH_MARGIN_SECONDS = 6;

/** Spotify does not mix tracks shorter than 30 seconds. */
const MIN_MIXABLE_SECONDS = 30;

/** How long the incoming track takes to return to its original tempo. */
const RAMP_BACK_MS = 8000;

export class AutoMixEngine extends EventEmitter {
    /**
     * @param {{ elements: { A: HTMLAudioElement, B: HTMLAudioElement } }} options
     */
    constructor({ elements }) {
        super();
        this.elements = elements;
        this.ctx = null;
        this.master = null;
        this.decks = { A: null, B: null };

        this.enabled = false;
        this.volume = 0.8;
        this.activeDeckId = 'A';

        this.machine = new StateMachine(STATES.IDLE, (next, previous, reason) => {
            this.emit(ENGINE_EVENTS.STATE, { state: next, previous, reason });
        });

        /** Prepared incoming track: { track, analysis, ratio, renderedBuffer, incomingStart, plan } */
        this.prepared = null;
        /** True while a preparation is in flight (prevents duplicate work). */
        this.preparing = false;
        /** The track that is playing right now (guards stale preparations). */
        this.currentTrackId = null;
        /** The full object of the playing track. */
        this.currentTrack = null;
        /** Scheduled transition bookkeeping. */
        this.active = null;

        this.stretchWorker = null;
        this.stretchJobs = new Map();
        this.stretchCounter = 0;

        this._pollTimer = null;
    }

    /* ───────────────────────── Setup ───────────────────────── */

    init() {
        if (this.ctx) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();

        this.master = this.ctx.createGain();
        this.master.gain.value = 1;
        this.master.connect(this.ctx.destination);

        // A tap for the audio-reactive visualisation. An AnalyserNode does not
        // need to be connected to the destination to produce data.
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.75;
        this.master.connect(this.analyser);

        this.decks.A = new Deck('A', this.elements.A, this.ctx, this.master);
        this.decks.B = new Deck('B', this.elements.B, this.ctx, this.master);
    }

    async resume() {
        if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
    }

    get deck() {
        return this.decks[this.activeDeckId];
    }

    get idleDeck() {
        return this.decks[this.activeDeckId === 'A' ? 'B' : 'A'];
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
        if (!enabled) {
            // Cancel any scheduled transition and restore a clean chain.
            this.cancelScheduled();
            this.prepared = null;
            this.machine.transition(STATES.IDLE, 'disabled');
        }
    }

    setVolume(volume) {
        this.volume = volume;
    }

    /** Keeps the engine's master volume in step with the player's. */
    setMasterVolume(volume) {
        this.volume = volume;
    }

    setUserEq(key, value) {
        Object.values(this.decks).forEach((deck) => deck?.setUserEq(key, value));
    }

    /* ───────────────────────── Analysis ───────────────────────── */

    /** Cached analysis for a track (may be null). */
    getAnalysis(trackId) {
        return getAnalysis(trackId);
    }

    /**
     * Tells the engine which deck is now the playing one.
     *
     * The store owns the transport, the engine owns the mixing — they must
     * agree on the active deck, otherwise the progress bar, the `ended`
     * handler and the transition scheduling all watch the wrong element.
     */
    setActiveDeck(deckId) {
        if (!this.decks[deckId]) return;
        this.activeDeckId = deckId;
        this.active = null;
    }

    /**
     * Tells the engine which track is playing now.
     *
     * A preparation can finish *after* the transition it was meant for (the
     * analysis takes a few seconds), so the engine checks this id before
     * arming a deck — otherwise it would blend into a track that is already
     * playing.
     */
    setCurrentTrack(track) {
        this.currentTrack = track || null;
        this.currentTrackId = track?.id || null;
    }

    /**
     * Makes sure a track has been analysed.
     *
     * The *current* track needs an analysis too: the transition plan depends
     * on both tempos and keys, and the key/tempo match is what decides the
     * style and the length.
     */
    async ensureAnalysis(track) {
        if (!track?.id) return null;
        const cached = this.getAnalysis(track.id);
        if (cached) return cached;
        if (!this.enabled) return null;

        try {
            const provider = resolveProvider(track);
            const source = await provider.getPlaybackSource(track, { quality: '96kbps' });
            const analysis = await analyzeTrack(track, source);
            if (analysis) {
                this.emit(ENGINE_EVENTS.ANALYSIS_READY, { track, analysis });
            }
            return analysis;
        } catch (error) {
            console.warn('[AutoMix] Could not analyse', track.title || track.name, error?.message);
            return null;
        }
    }

    /* ───────────────────── Preparation (deck B) ───────────────────── */

    /**
     * Prepares the incoming track: fetch → decode → analyse → tempo match.
     * @param {object} track
     * @param {object} [outgoingAnalysis]
     * @param {object} [options]
     * @param {object} [options.override] a user-saved transition spec that
     *        replaces the automatically planned one (from the Mix editor).
     */
    async prepareNext(track, outgoingAnalysis = null, options = {}) {
        if (!this.enabled || !track) return null;
        // A blend is in progress — the decks are busy, do not re-source them.
        if (this.active) return null;
        if (this.preparing || this.prepared) return this.prepared;

        const provider = resolveProvider(track);
        const processable = canProcess(track);

        if (!processable.processable) {
            this.emit(ENGINE_EVENTS.DECK_FAILED, { trackId: track.id, reason: processable.reason });
            this.prepared = null;
            return null;
        }

        // Spotify skips tracks under 30 seconds: there is not enough data for
        // a smooth transition.
        const duration = Number(track.duration || provider.getTrackMetadata(track)?.duration || 0);
        if (duration && duration < MIN_MIXABLE_SECONDS) {
            const reason = `Track is shorter than ${MIN_MIXABLE_SECONDS}s — not enough data for a smooth transition`;
            this.emit(ENGINE_EVENTS.DECK_FAILED, { trackId: track.id, reason });
            this.prepared = null;
            return null;
        }

        this.preparing = true;
        this.machine.transition(STATES.PREPARING, 'next track');
        this.emit(ENGINE_EVENTS.DECK_LOADING, { trackId: track.id, track, title: track.title || track.name });

        let source;
        try {
            source = await provider.getPlaybackSource(track, { quality: '96kbps' });
        } catch (error) {
            this.failPreparation(track, error?.message || 'no audio source');
            return null;
        }

        // Load the incoming track into the idle deck so it is ready to play
        // the moment the blend starts (the element is the transport for the
        // part of the track after the transition window).
        const idle = this.idleDeck;
        let deckReady = false;
        if (idle) {
            try {
                idle.setSource(source.url);
                // The blend needs a buffered deck; if it cannot be primed in
                // time we fall back to a normal handover instead of glitching.
                deckReady = await idle.waitUntilPlayable(15000);
            } catch (error) {
                console.warn('[AutoMix] Could not preload the incoming deck:', error?.message);
            }
            if (!deckReady) {
                console.warn('[AutoMix] Incoming deck could not be primed — skipping the blend.');
                this.emit(ENGINE_EVENTS.DECK_FAILED, {
                    trackId: track.id,
                    reason: 'The next track could not be buffered in time',
                });
                this.prepared = null;
                return null;
            }
        }

        let analysis;
        let rendered = null;
        let ratio = null;

        // The outgoing track's analysis decides the style, the length and the
        // tempo match — so make sure we have it, even if its analysis is
        // still running.
        const outgoing = outgoingAnalysis
            || (this.currentTrack ? await this.ensureAnalysis(this.currentTrack) : null);

        try {
            // ── Analysis (fetch + decode + DSP in a worker) ──
            this.machine.transition(STATES.ANALYZING, 'running DSP');
            this.emit(ENGINE_EVENTS.DECK_ANALYZING, { trackId: track.id, track });

            analysis = await analyzeTrack(track, source);

            if (!analysis) throw new Error('analysis failed');

            // Re-attach the structural analysis (phrases/sections) if the
            // track was analysed by an earlier code path.
            if (!analysis.sections?.length) analysis.sections = detectSections(analysis);
            if (!analysis.phrases?.length) {
                analysis.phrases = buildPhrases(analysis.downbeats?.length ? analysis.downbeats : analysis.beats, 8);
            }

            // ── Tempo match ──
            this.machine.transition(STATES.SYNCING, 'matching tempo');
            this.emit(ENGINE_EVENTS.DECK_SYNCING, {
                trackId: track.id,
                track,
                bpm: analysis.bpm,
                targetBpm: outgoing?.bpm ?? null,
            });

            ratio = tempoRatio(outgoing?.bpm, analysis.bpm);

            if (ratio) {
                // Only render what the blend actually needs (plus a margin for
                // the hand-over to the streaming element).
                const planForWindow = planTransition(outgoing, analysis, {
                    loudnessGainDb: this.loudnessOffset(outgoing, analysis),
                });
                const windowSeconds = Math.min(
                    STRETCH_WINDOW_SECONDS,
                    (planForWindow.durationMs / 1000) + STRETCH_MARGIN_SECONDS,
                );
                rendered = await this.renderStretched(track, source, ratio, windowSeconds);
            }
        } catch (error) {
            this.failPreparation(track, error?.message || 'preparation failed');
            return null;
        } finally {
            this.preparing = false;
        }

        // The track we prepared for may already be playing (the analysis took
        // longer than the transition). Such a preparation is stale.
        if (this.currentTrackId && this.currentTrackId === track.id) {
            console.warn('[AutoMix] Preparation became stale — the track is already playing.');
            this.prepared = null;
            return null;
        }

        const incomingStart = findIncomingStart(analysis);
        const planned = planTransition(outgoing, analysis, {
            loudnessGainDb: this.loudnessOffset(outgoing, analysis),
        });
        // A user-saved transition from the Mix editor wins over the plan.
        const plan = options.override ? { ...planned, ...options.override } : planned;

        this.prepared = {
            track,
            analysis,
            ratio,
            renderedBuffer: rendered?.buffer ?? null,
            renderDuration: rendered?.duration ?? 0,
            incomingStart: incomingStart.time,
            plan,
        };

        this.machine.transition(STATES.READY, 'deck armed');
        this.emit(ENGINE_EVENTS.DECK_READY, {
            trackId: track.id,
            track,
            analysis,
            ratio,
            plan,
            score: outgoing ? transitionScore(outgoing, analysis).total : null,
        });

        return this.prepared;
    }

    failPreparation(track, reason) {
        this.prepared = null;
        this.machine.transition(STATES.FAILED, reason);
        this.emit(ENGINE_EVENTS.DECK_FAILED, { trackId: track?.id, reason });
    }

    /** Loudness offset (dB) that levels the incoming track against the outgoing one. */
    loudnessOffset(outgoing, incoming) {
        if (!outgoing?.loudness || !incoming?.loudness) return 0;
        const diff = outgoing.loudness - incoming.loudness;
        return Math.max(-8, Math.min(8, diff));
    }

    /* ─────────────────────── Time stretching ─────────────────────── */

    getStretchWorker() {
        if (this.stretchWorker) return this.stretchWorker;
        try {
            this.stretchWorker = new Worker(new URL('../stretch/wsola.worker.js', import.meta.url), { type: 'module' });
            this.stretchWorker.onmessage = (event) => {
                const { id, channels, outputDuration, renderMs, error } = event.data || {};
                const job = this.stretchJobs.get(id);
                if (!job) return;
                this.stretchJobs.delete(id);
                if (error) job.reject(new Error(error));
                else job.resolve({ channels, outputDuration, renderMs });
            };
            this.stretchWorker.onerror = () => {
                this.stretchWorker = null;
                for (const job of this.stretchJobs.values()) job.reject(new Error('stretch worker failed'));
                this.stretchJobs.clear();
            };
        } catch (error) {
            console.warn('[AutoMix] Could not start the stretch worker:', error?.message);
            this.stretchWorker = null;
        }
        return this.stretchWorker;
    }

    /**
     * Renders the incoming track's window at the target tempo (pitch
     * preserved) using WSOLA.
     */
    async renderStretched(track, source, ratio, windowSeconds = STRETCH_WINDOW_SECONDS) {
        const { fetchAndDecode } = await import('../analysis/TrackAnalyzer.js');
        const mark = (label) => {
            this.timings = this.timings || [];
            this.timings.push(`${label} @${Date.now()}`);
            if (this.timings.length > 20) this.timings.shift();
        };

        mark('render:start');
        // Reuse the decode from the analysis step when possible — downloading
        // and decoding a track twice doubles the preparation time.
        const decoded = getDecodedTrack(source.url);
        let buffer;
        let channels;
        let sampleRate;
        if (decoded) {
            ({ buffer, channels, sampleRate } = decoded);
            mark('render:reused-decode');
        } else {
            const fetched = await fetchAndDecode(source.url);
            buffer = fetched.buffer;
            channels = fetched.channels;
            sampleRate = fetched.sampleRate;
            mark(`render:decoded ${Math.round(buffer.duration)}s`);
        }

        // Only the window we need.
        const windowLength = Math.min(
            channels[0].length,
            Math.floor(windowSeconds * sampleRate),
        );
        const slices = channels.map((channel) => channel.slice(0, windowLength));
        mark(`render:sliced ${windowSeconds}s`);

        const worker = this.getStretchWorker();
        if (!worker) {
            // Fallback: no stretching, play at the original tempo.
            console.warn('[AutoMix] Stretch worker unavailable — playing at original tempo.');
            return null;
        }

        const id = ++this.stretchCounter;
        mark('render:stretch-start');
        const result = await new Promise((resolve, reject) => {
            // A worker that never replies must not block the preparation.
            const timer = setTimeout(() => {
                this.stretchJobs.delete(id);
                reject(new Error('stretch timed out'));
            }, 20000);

            this.stretchJobs.set(id, {
                resolve: (value) => { clearTimeout(timer); resolve(value); },
                reject: (error) => { clearTimeout(timer); reject(error); },
            });

            const transfers = slices.map((slice) => slice.buffer);
            worker.postMessage({ id, channels: slices, ratio, options: { sampleRate } }, transfers);
        }).catch((error) => {
            mark(`render:stretch-error ${error?.message}`);
            console.warn('[AutoMix] Stretch failed:', error?.message);
            return null;
        });

        if (!result) return null;
        if (result.error) {
            mark(`render:worker-error ${result.error}`);
            console.warn('[AutoMix] Stretch failed:', result.error);
            return null;
        }
        mark(`render:stretched ${result.renderMs}ms`);
        console.log(`[AutoMix] Rendered ${windowSeconds}s at ${ratio.toFixed(3)}× in ${result.renderMs}ms`);

        const rendered = this.ctx.createBuffer(
            result.channels.length,
            result.channels[0].length,
            sampleRate,
        );
        for (let c = 0; c < result.channels.length; c++) {
            rendered.copyToChannel(result.channels[c], c);
        }

        return { buffer: rendered, duration: rendered.duration };
    }

    /* ─────────────────────── Transition scheduling ─────────────────────── */

    /**
     * Schedules the blend between the active deck and the prepared one.
     *
     * @param {number} when AudioContext time at which the blend starts
     * @param {number} targetMediaTime the outgoing track's media position where the blend starts
     * @param {object} [options]
     * @param {number} [options.durationMs] the real overlap length (the curves are rebuilt for it)
     */
    scheduleNext(when, targetMediaTime, options = {}) {
        if (!this.enabled || !this.prepared) return null;

        // A non-finite start time would poison every AudioParam schedule.
        const blendStart = Number.isFinite(when) ? when : this.ctx.currentTime + 0.05;

        const fromDeck = this.deck;
        const toDeck = this.idleDeck;
        if (!fromDeck || !toDeck) return null;

        const { track, analysis, ratio, renderedBuffer, incomingStart } = this.prepared;

        // The overlap can be longer than the planned bars (the transition is
        // snapped back to a bar line), so the curves are rebuilt for the real
        // length — what you hear is what the automation does.
        const durationMs = Number.isFinite(options.durationMs)
            ? options.durationMs
            : this.prepared.plan.durationMs;
        const plan = buildTransitionCurves(this.prepared.plan.style, {
            bars: this.prepared.plan.bars,
            bpm: this.prepared.plan.bpm || analysis?.bpm,
            durationMs,
            volume: this.prepared.plan.volume,
            eq: this.prepared.plan.eq,
            effect: this.prepared.plan.effect,
            loudnessGainDb: this.prepared.plan.loudnessGainDb,
        });
        const durationSec = durationMs / 1000;

        // The incoming track's first downbeat must land exactly on the blend.
        // With a rendered (stretched) buffer the downbeat sits at
        // `incomingStart / ratio` seconds into the buffer.
        const preRoll = renderedBuffer ? incomingStart / (ratio || 1) : 0;

        // ── Arm the incoming source ──
        if (renderedBuffer) {
            let segmentStart = blendStart - preRoll;
            let offset = 0;
            const earliest = this.ctx.currentTime + 0.02;
            if (segmentStart < earliest) {
                offset = (earliest - segmentStart) * (ratio || 1);
                segmentStart = earliest;
            }
            toDeck.armSegment(renderedBuffer, segmentStart, offset);
            toDeck.element.currentTime = incomingStart;
            toDeck.playbackRate = ratio || 1;
        } else {
            // No stretch: play the streaming element, seeked to the downbeat.
            toDeck.element.currentTime = incomingStart;
            toDeck.playbackRate = 1;
        }

        // ── Schedule the automation on both decks ──
        fromDeck.scheduleAutomation(plan.outgoing, blendStart, durationSec, this.volume);
        toDeck.scheduleAutomation(plan.incoming, blendStart, durationSec, this.volume, plan.loudnessGainDb);

        this.active = {
            plan,
            track,
            analysis,
            ratio,
            fromDeckId: fromDeck.id,
            toDeckId: toDeck.id,
            startTime: blendStart,
            duration: durationSec,
            progress: 0,
            handedOff: false,
            targetMediaTime,
        };

        this.machine.transition(STATES.TRANSITIONING, 'blend scheduled');
        this.emit(ENGINE_EVENTS.TRANSITION_SCHEDULED, {
            plan,
            track,
            analysis,
            ratio,
            when: blendStart,
            targetMediaTime,
        });

        // Start the incoming deck right at the scheduled moment.
        this.scheduleIncomingStart(blendStart, preRoll);

        return this.active;
    }

    scheduleIncomingStart(when, preRoll) {
        const toDeck = this.idleDeck;
        const delay = Math.max(0, (when - this.ctx.currentTime) * 1000);

        const start = () => {
            if (!this.enabled) return;
            this.resume();
            toDeck.play();
            this.machine.transition(STATES.MIXING, 'both decks live');
            this.emit(ENGINE_EVENTS.TRANSITION_STARTING, {
                plan: this.active?.plan,
                track: this.active?.track,
                analysis: this.active?.analysis,
                ratio: this.active?.ratio,
            });
        };

        if (delay < 30) {
            start();
        } else {
            this._incomingTimer = setTimeout(start, delay);
        }
    }

    /* ─────────────────────────── Ticking ─────────────────────────── */

    /**
     * Called regularly (on timeupdate). Reports the blend progress and
     * releases the outgoing deck when the blend is over.
     */
    tick() {
        if (!this.active || !this.ctx) return;

        const elapsed = this.ctx.currentTime - this.active.startTime;
        if (elapsed < 0) return;

        const progress = Math.min(1, elapsed / this.active.duration);
        this.active.progress = progress;

        if (progress < 1) {
            if (this.machine.state !== STATES.MIXING) {
                this.machine.transition(STATES.MIXING, 'both decks live');
            }
            this.emit(ENGINE_EVENTS.TRANSITION_MIXING, {
                progress,
                plan: this.active.plan,
                track: this.active.track,
            });
            return;
        }

        // ── Blend finished ──
        const finished = this.active;
        const outgoing = this.decks[finished.fromDeckId];
        const incoming = this.decks[finished.toDeckId];

        // Hand the incoming track back to its streaming element.
        this.handOffToElement(finished, incoming);

        // Release the outgoing deck.
        if (outgoing) {
            outgoing.pause();
            outgoing.stopSegment();
            outgoing.resetChain();
        }

        this.activeDeckId = finished.toDeckId;
        this.prepared = null;
        // Clear the finished transition — otherwise the engine believes a
        // blend is still running and every later preparation is blocked
        // (which is what made the player loop between two screens).
        this.active = null;

        if (this.machine.state === STATES.MIXING || this.machine.state === STATES.TRANSITIONING) {
            this.machine.transition(STATES.COMPLETED, 'blend complete');
        }
        this.emit(ENGINE_EVENTS.TRANSITION_COMPLETE, {
            plan: finished.plan,
            track: finished.track,
            analysis: finished.analysis,
        });

        // Return to idle so the UI can retire the AutoMix overlay.
        this._idleTimer = setTimeout(() => {
            if (this.machine.state === STATES.COMPLETED) {
                this.machine.transition(STATES.IDLE, 'cycle complete');
            }
        }, 1500);
    }

    /**
     * After a stretched segment finishes, the streaming element takes over at
     * the matching input position — and then the tempo ramps back to the
     * track's original speed, exactly like Spotify ("after the transition it
     * speeds up to its original tempo").
     */
    handOffToElement(finished, incomingDeck) {
        if (!incomingDeck) return;
        const ratio = finished.ratio || 1;
        const inputPosition = finished.duration * ratio;

        const elapsed = this.ctx.currentTime - finished.startTime;
        const remaining = Math.max(0, finished.duration - elapsed);

        const switchToElement = () => {
            if (!incomingDeck.segmentSource) return;   // already switched
            incomingDeck.stopSegment();
            incomingDeck.element.currentTime = Math.min(
                inputPosition,
                incomingDeck.element.duration || inputPosition,
            );
            incomingDeck.playbackRate = ratio;
            incomingDeck.play();
            finished.handedOff = true;

            // Ramp the tempo back to the track's own speed.
            if (Math.abs(ratio - 1) > 0.002) {
                incomingDeck.rampPlaybackRate(1, RAMP_BACK_MS);
            }
        };

        if (remaining <= 0.02) {
            switchToElement();
        } else {
            // Switch slightly before the segment ends so there is no gap.
            this._handoffTimer = setTimeout(switchToElement, Math.max(0, (remaining - 0.06) * 1000));
        }
    }

    /** Cancels a scheduled (but not yet started) transition. */
    cancelScheduled() {
        if (this._incomingTimer) {
            clearTimeout(this._incomingTimer);
            this._incomingTimer = null;
        }
        if (this._handoffTimer) {
            clearTimeout(this._handoffTimer);
            this._handoffTimer = null;
        }
        if (this._idleTimer) {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
        if (this.active) {
            this.decks[this.active.toDeckId]?.stopSegment();
            this.active = null;
        }
        this.prepared = null;
    }

    /* ─────────────────── Transport helpers (store API) ─────────────────── */

    setSource(deckId, url) {
        this.decks[deckId]?.setSource(url);
    }

    async playDeck(deckId) {
        await this.resume();
        this.decks[deckId]?.play();
    }

    pauseDeck(deckId) {
        this.decks[deckId]?.pause();
    }

    setDeckVolume(deckId, volume) {
        this.decks[deckId]?.setVolume(volume);
    }

    syncDeck(deckId, volume) {
        const deck = this.decks[deckId];
        if (!deck) return;
        this.activeDeckId = deckId;
        deck.setVolume(volume);
        const idle = this.decks[deckId === 'A' ? 'B' : 'A'];
        idle?.resetChain();
    }
}
