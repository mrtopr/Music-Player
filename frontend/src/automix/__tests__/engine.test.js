/**
 * Engine tests — preparation, failure handling and the blend lifecycle.
 *
 * The Web Audio graph is stubbed: what matters here is the *decisions* the
 * engine makes and the events it emits, not the audio itself.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The analyzer reaches for the API client, which touches `window`.
vi.mock('../../api/client.js', () => ({
    API_BASE_URL: 'http://localhost:3001',
    apiFetch: vi.fn(async () => ({ data: [] })),
    getAudioUrl: vi.fn(),
    getImageUrl: vi.fn((x) => x),
}));

const { AutoMixEngine } = await import('../engine/AutoMixEngine.js');
const { STATES } = await import('../engine/stateMachine.js');
const { canProcess, resolveProvider } = await import('../providers/index.js');

const SAMPLE_RATE = 22050;

/** A minimal AudioBuffer stand-in. */
function fakeBuffer(seconds = 3, channels = 2) {
    const length = Math.floor(seconds * SAMPLE_RATE);
    const data = [];
    for (let c = 0; c < channels; c++) {
        const arr = new Float32Array(length);
        // A click every half second so the tempo detector has something.
        for (let i = 0; i < length; i += SAMPLE_RATE / 2) {
            for (let k = 0; k < 100 && i + k < length; k++) arr[i + k] = Math.sin(k / 6) * Math.exp(-k / 25);
        }
        data.push(arr);
    }
    return {
        length,
        numberOfChannels: channels,
        sampleRate: SAMPLE_RATE,
        duration: seconds,
        getChannelData: (i) => data[i],
        copyToChannel: () => {},
    };
}

/** Builds an engine with stubbed decks (no Web Audio needed). */
function makeEngine() {
    const engine = new AutoMixEngine({ elements: { A: {}, B: {} } });

    const deckStub = (id) => ({
        id,
        element: { currentTime: 0, duration: 240, playbackRate: 1, paused: false, src: '' },
        analysis: null,
        segmentSource: null,
        scheduled: [],
        armSegment(buffer, when, offset) {
            this.segmentSource = { stop: vi.fn() };
            this.scheduled.push({ buffer, when, offset });
        },
        stopSegment() {
            if (this.segmentSource) this.segmentSource.stop();
            this.segmentSource = null;
        },
        scheduleAutomation(curves, when, duration, volume) {
            this.scheduled.push({ curves, when, duration, volume });
        },
        resetChain: vi.fn(),
        setVolume: vi.fn(),
        pause: vi.fn(),
        play: vi.fn(async () => {}),
        setSource: vi.fn(),
        waitUntilPlayable: vi.fn(async () => true),
        playbackRate: 1,
    });

    engine.decks = { A: deckStub('A'), B: deckStub('B') };
    engine.ctx = {
        currentTime: 10,
        createGain: () => ({ gain: { value: 1 }, connect: vi.fn() }),
        createBiquadFilter: () => ({ type: '', frequency: { value: 0 }, gain: { value: 0 }, Q: { value: 0 }, connect: vi.fn() }),
        createDelay: () => ({ delayTime: { value: 0 }, connect: vi.fn() }),
        createBufferSource: () => ({ buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }),
        createBuffer: (count, length, rate) => ({ ...fakeBuffer(1), length, sampleRate: rate }),
        createAnalyser: () => ({ fftSize: 0, connect: vi.fn() }),
        destination: {},
        state: 'running',
        resume: vi.fn(),
    };
    engine.activeDeckId = 'A';
    engine.enabled = true;
    return engine;
}

const jiosaavnTrack = (id = 't1', bpm = 120, url = 'https://aac.saavncdn.com/test_96.mp4') => ({
    id,
    title: 'Track',
    primaryArtists: 'Artist',
    duration: 240,
    downloadUrl: [{ quality: '96kbps', url }],
    __bpm: bpm,
});

beforeEach(() => {
    global.fetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(1024),
    }));

    // A minimal Web Audio stand-in so the analyzer can decode in node.
    global.window = {
        AudioContext: class {
            constructor() {
                this.state = 'running';
                this.sampleRate = SAMPLE_RATE;
                this.destination = {};
            }
            async decodeAudioData() {
                return fakeBuffer(3);
            }
            async resume() {}
            createGain() { return { gain: { value: 1 }, connect() {} }; }
            createBiquadFilter() { return { type: '', frequency: { value: 0 }, gain: { value: 0 }, Q: { value: 0 }, connect() {} }; }
            createDelay() { return { delayTime: { value: 0 }, connect() {} }; }
            createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
            createAnalyser() { return { fftSize: 0, connect() {} }; }
        },
        location: { href: 'http://localhost/', protocol: 'http:', hostname: 'localhost' },
    };
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('provider adapters', () => {
    it('treats JioSaavn tracks as processable', () => {
        expect(canProcess(jiosaavnTrack()).processable).toBe(true);
        expect(resolveProvider(jiosaavnTrack()).id).toBe('jiosaavn');
    });

    it('reports YouTube tracks as not mixable and explains why', () => {
        const result = canProcess({ id: 'yt_abc', title: 'YT' });
        expect(result.processable).toBe(false);
        expect(result.reason).toMatch(/YouTube/i);
    });

    it('reports tracks without downloadable audio as not mixable', () => {
        const result = canProcess({ id: 'x', title: 'No audio' });
        expect(result.processable).toBe(false);
        expect(result.reason).toMatch(/downloadable/i);
    });
});

describe('preparation', () => {
    it('emits the loading → analyzing → syncing → ready sequence', async () => {
        const engine = makeEngine();
        const events = [];
        engine.on('deck:loading', () => events.push('loading'));
        engine.on('deck:analyzing', () => events.push('analyzing'));
        engine.on('deck:syncing', () => events.push('syncing'));
        engine.on('deck:ready', () => events.push('ready'));

        await engine.prepareNext(jiosaavnTrack(), null);

        expect(events).toEqual(['loading', 'analyzing', 'syncing', 'ready']);
        expect(engine.prepared).toBeTruthy();
        expect(engine.prepared.analysis.bpm).toBeGreaterThan(0);
    });

    it('fails cleanly when the network drops during preparation', async () => {
        const engine = makeEngine();
        global.fetch = vi.fn(async () => { throw new Error('NetworkError'); });

        const failure = vi.fn();
        engine.on('deck:failed', failure);

        // A unique id *and* url so neither the analysis cache nor the byte
        // cache can satisfy the request.
        const result = await engine.prepareNext(
            jiosaavnTrack('net-fail-1', 120, 'https://aac.saavncdn.com/net-fail-1_96.mp4'),
            null,
        );

        expect(result).toBeNull();
        expect(failure).toHaveBeenCalled();
        expect(engine.prepared).toBeNull();
    });

    it('fails cleanly for a track it cannot mix', async () => {
        const engine = makeEngine();
        const failure = vi.fn();
        engine.on('deck:failed', failure);

        const result = await engine.prepareNext({ id: 'yt_x', title: 'YouTube' }, null);

        expect(result).toBeNull();
        expect(failure).toHaveBeenCalled();
        expect(failure.mock.calls[0][0].reason).toMatch(/YouTube/i);
    });

    it('does not prepare the same track twice', async () => {
        const engine = makeEngine();
        await engine.prepareNext(jiosaavnTrack(), null);
        const prepared = engine.prepared;
        await engine.prepareNext(jiosaavnTrack(), null);
        expect(engine.prepared).toBe(prepared);
    });
});

describe('transition lifecycle', () => {
    it('schedules the blend on the idle deck and emits the events', async () => {
        const engine = makeEngine();
        await engine.prepareNext(jiosaavnTrack(), null);

        const scheduled = vi.fn();
        const starting = vi.fn();
        engine.on('transition:scheduled', scheduled);
        engine.on('transition:starting', starting);

        const plan = engine.scheduleNext(12, 230);

        expect(plan).toBeTruthy();
        expect(scheduled).toHaveBeenCalled();
        // The idle deck (B) received the incoming automation.
        expect(engine.decks.B.scheduled.length).toBeGreaterThan(0);
    });

    it('reports a real progress value while blending', async () => {
        const engine = makeEngine();
        await engine.prepareNext(jiosaavnTrack(), null);
        engine.scheduleNext(12, 230);

        const mixing = vi.fn();
        engine.on('transition:mixing', mixing);

        engine.ctx.currentTime = 12 + 3;      // halfway through a 6 s blend
        engine.tick();

        expect(mixing).toHaveBeenCalled();
        const progress = mixing.mock.calls[0][0].progress;
        expect(progress).toBeGreaterThan(0.3);
        expect(progress).toBeLessThan(0.8);
    });

    it('completes the blend, releases the outgoing deck and swaps the decks', async () => {
        const engine = makeEngine();
        await engine.prepareNext(jiosaavnTrack(), null);
        engine.scheduleNext(12, 230);

        const complete = vi.fn();
        engine.on('transition:complete', complete);

        engine.ctx.currentTime = 12 + 10;     // past the end of the blend
        engine.tick();

        expect(complete).toHaveBeenCalled();
        expect(engine.activeDeckId).toBe('B');
        expect(engine.decks.A.pause).toHaveBeenCalled();
        expect(engine.prepared).toBeNull();
    });

    it('leaves the engine on the deck that is actually playing', async () => {
        // Regression: the engine swapped its decks on completion but the store
        // kept the old one, so every handler watched the released element and
        // the player flickered between two screens forever.
        const engine = makeEngine();
        await engine.prepareNext(jiosaavnTrack(), null);
        engine.scheduleNext(12, 230);

        engine.ctx.currentTime = 12 + 10;
        engine.tick();

        // The incoming deck (B) must be the active one…
        expect(engine.activeDeckId).toBe('B');
        // …and the outgoing one must be released.
        expect(engine.decks.A.pause).toHaveBeenCalled();
        expect(engine.decks.A.segmentSource).toBeNull();
        // The transition must be cleared so the next cycle can start clean.
        expect(engine.active).toBeNull();
    });

    it('does not prepare another track while a blend is running', async () => {
        const engine = makeEngine();
        await engine.prepareNext(jiosaavnTrack(), null);
        engine.scheduleNext(12, 230);

        // A second preparation would re-source the deck that is about to play.
        const result = await engine.prepareNext(jiosaavnTrack('other'), null);
        expect(result).toBeNull();
        expect(engine.prepared.track.id).toBe('t1');
    });

    it('drops a preparation that finished after its transition', async () => {
        const engine = makeEngine();
        engine.setCurrentTrack(jiosaavnTrack('t1'));
        // The track we are preparing for is already playing → stale.
        const result = await engine.prepareNext(jiosaavnTrack('t1'), null);
        expect(result).toBeNull();
        expect(engine.prepared).toBeNull();
    });

    it('cancels a scheduled transition when the user skips', async () => {
        const engine = makeEngine();
        await engine.prepareNext(jiosaavnTrack(), null);
        engine.scheduleNext(12, 230);

        engine.cancelScheduled();

        expect(engine.active).toBeNull();
        expect(engine.prepared).toBeNull();
        expect(engine.decks.B.segmentSource).toBeNull();
    });

    it('cancels everything when the user disables AutoMix mid-playback', async () => {
        const engine = makeEngine();
        await engine.prepareNext(jiosaavnTrack(), null);
        engine.scheduleNext(12, 230);

        engine.setEnabled(false);

        expect(engine.active).toBeNull();
        expect(engine.prepared).toBeNull();
        expect(engine.machine.state).toBe(STATES.IDLE);
    });

    it('never schedules a transition while AutoMix is off', async () => {
        const engine = makeEngine();
        engine.setEnabled(false);
        const result = await engine.prepareNext(jiosaavnTrack(), null);
        expect(result).toBeNull();
        expect(engine.scheduleNext(12, 230)).toBeNull();
    });
});

describe('state machine', () => {
    it('rejects illegal transitions', () => {
        const engine = makeEngine();
        const before = engine.machine.state;
        engine.machine.transition(STATES.MIXING);
        expect(engine.machine.state).toBe(before);
    });

    it('accepts the legal preparation path', () => {
        const engine = makeEngine();
        expect(engine.machine.transition(STATES.PREPARING)).toBe(true);
        expect(engine.machine.transition(STATES.ANALYZING)).toBe(true);
        expect(engine.machine.transition(STATES.SYNCING)).toBe(true);
        expect(engine.machine.transition(STATES.READY)).toBe(true);
    });
});
