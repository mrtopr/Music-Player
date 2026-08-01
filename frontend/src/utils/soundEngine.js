/**
 * Mehfil Sound Enhancement Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-EQ DSP chain that plugs into the existing ProAudioEngine.
 *
 * Signal path (inserted between EQ treble node and destination):
 *
 *   [EQ treble output]
 *        ↓
 *   bassBoostFilter   (lowshelf ~100Hz)
 *        ↓
 *   subBassFilter     (lowshelf ~60Hz)
 *        ↓
 *   punchFilter       (peaking ~100Hz, Q=1.4)
 *        ↓
 *   presenceFilter    (peaking ~3.5kHz, Q=2 – subtle sparkle for DJ/Vocal)
 *        ↓
 *   spatialSplitter ──→ [L/R channel split]
 *        ↓                  ↓
 *   M/S width matrix  (ChannelSplitter → gain math → ChannelMerger)
 *        ↓
 *   compressor        (DynamicsCompressorNode)
 *        ↓
 *   masterGain        (headroom management)
 *        ↓
 *   analyser          (FFT for optional visualizer)
 *        ↓
 *   [to AudioContext.destination via ProAudioEngine.connectEnhancement]
 *
 * Reverb: Implemented as a synthetic all-pass delay network (no IR files).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ──────────────────────────────────────────────────────────────────────────────
// PRESETS
// Values: bass (dB), subBass (dB), punch (dB), stereoWidth (0-100),
//         loudness (0-100), room ('off'|'studio'|'club'|'cinema'|'hall'),
//         compressor ('light'|'medium'|'heavy')
// ──────────────────────────────────────────────────────────────────────────────
export const SOUND_PRESETS = {
    normal: {
        label: '🎵 Normal',
        bass: 0, subBass: 0, punch: 0, presence: 0,
        stereoWidth: 0, loudness: 0, room: 'off',
        compressor: 'light'
    },
    bassBoost: {
        label: '🔊 Bass Boost',
        bass: 9, subBass: 4, punch: 5, presence: 0,
        stereoWidth: 0, loudness: 20, room: 'off',
        compressor: 'medium'
    },
    deepBass: {
        label: '💥 Deep Bass',
        bass: 7, subBass: 8, punch: 4, presence: 0,
        stereoWidth: 0, loudness: 10, room: 'off',
        compressor: 'medium'
    },
    dj: {
        label: '🔥 DJ',
        bass: 8, subBass: 5, punch: 9, presence: 2,
        stereoWidth: 25, loudness: 60, room: 'off',
        compressor: 'heavy'
    },
    club: {
        label: '🪩 Club',
        bass: 7, subBass: 6, punch: 8, presence: 1,
        stereoWidth: 35, loudness: 50, room: 'studio',
        compressor: 'heavy'
    },
    headphones: {
        label: '🎧 Headphones',
        bass: 5, subBass: 3, punch: 4, presence: 1,
        stereoWidth: 45, loudness: 30, room: 'off',
        compressor: 'medium'
    },
    homeTheater: {
        label: '🏠 Home Theater',
        bass: 6, subBass: 8, punch: 5, presence: 1,
        stereoWidth: 50, loudness: 40, room: 'hall',
        compressor: 'medium'
    },
    cinema: {
        label: '🎬 Cinema',
        bass: 4, subBass: 6, punch: 3, presence: 1,
        stereoWidth: 60, loudness: 30, room: 'cinema',
        compressor: 'medium'
    },
    spatial: {
        label: '🌌 Spatial',
        bass: 2, subBass: 2, punch: 2, presence: 0,
        stereoWidth: 75, loudness: 20, room: 'studio',
        compressor: 'light'
    },
    vocal: {
        label: '🎤 Vocal',
        bass: -2, subBass: 0, punch: 0, presence: 3,
        stereoWidth: 15, loudness: 25, room: 'studio',
        compressor: 'medium'
    },
    clear: {
        label: '✨ Clear',
        bass: 0, subBass: 0, punch: 0, presence: 1,
        stereoWidth: 10, loudness: 35, room: 'off',
        compressor: 'medium'
    },
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPRESSOR PROFILES
// ──────────────────────────────────────────────────────────────────────────────
const COMPRESSOR_PROFILES = {
    light:  { threshold: -24, knee: 10, ratio: 2.5,  attack: 0.003, release: 0.25 },
    medium: { threshold: -20, knee: 8,  ratio: 4.0,  attack: 0.002, release: 0.20 },
    heavy:  { threshold: -16, knee: 6,  ratio: 6.0,  attack: 0.001, release: 0.15 },
};

// Smooth time constant for AudioParam transitions (pop-free)
const RAMP_TC = 0.05; // 50ms – imperceptible

// localStorage key
const LS_KEY = 'mehfil_sound_enhancement_v1';

// ──────────────────────────────────────────────────────────────────────────────
// SoundEnhancementEngine
// ──────────────────────────────────────────────────────────────────────────────
class SoundEnhancementEngine {
    constructor() {
        this._built = false;
        this.ctx = null;

        // Exposed nodes
        this.input = null;   // First node – connect from EQ treble here
        this.output = null;  // Last node  – connect to AudioContext.destination

        // DSP nodes (initialized in build())
        this.bassBoostFilter = null;
        this.subBassFilter = null;
        this.punchFilter = null;
        this.presenceFilter = null;
        this.compressor = null;
        this.masterGain = null;
        this.analyser = null;

        // Spatial M/S
        this._spatialEnabled = false;
        this._stereoWidth = 0;          // 0–100
        this._spatialSplitter = null;
        this._spatialMerger = null;
        this._midGain = null;
        this._sideGain = null;
        this._spatialBypassGain = null; // used when spatial is off

        // Reverb (synthetic)
        this._reverbEnabled = false;
        this._reverbType = 'off';
        this._reverbSend = null;
        this._reverbReturn = null;
        this._delayNodes = [];
        this._apfGains = [];

        // Current state
        this.state = this._loadState();
    }

    // ── Persistence ────────────────────────────────────────────────────────────

    _defaultState() {
        return {
            preset: 'normal',
            bass: 0,
            subBass: 0,
            punch: 0,
            presence: 0,
            stereoWidth: 0,
            spatialEnabled: false,
            loudness: 0,
            room: 'off',
        };
    }

    _loadState() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) return { ...this._defaultState(), ...JSON.parse(raw) };
        } catch (_) {}
        return this._defaultState();
    }

    _saveState() {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(this.state));
        } catch (_) {}
    }

    // ── Build ──────────────────────────────────────────────────────────────────

    /**
     * Build the entire DSP chain using the AudioContext from ProAudioEngine.
     * Must be called AFTER audioEngine.init().
     */
    build(ctx) {
        if (this._built) return;
        if (!ctx) { console.error('[SoundEngine] No AudioContext provided'); return; }
        this.ctx = ctx;

        // ── Bass Boost ─────────────────────────────────────────
        this.bassBoostFilter = ctx.createBiquadFilter();
        this.bassBoostFilter.type = 'lowshelf';
        this.bassBoostFilter.frequency.value = 100;
        this.bassBoostFilter.gain.value = 0;

        // ── Sub Bass ───────────────────────────────────────────
        this.subBassFilter = ctx.createBiquadFilter();
        this.subBassFilter.type = 'lowshelf';
        this.subBassFilter.frequency.value = 60;
        this.subBassFilter.gain.value = 0;

        // ── Punch (kick-drum impact) ───────────────────────────
        this.punchFilter = ctx.createBiquadFilter();
        this.punchFilter.type = 'peaking';
        this.punchFilter.frequency.value = 100;
        this.punchFilter.Q.value = 1.4;
        this.punchFilter.gain.value = 0;

        // ── Presence (subtle high-mid sparkle) ────────────────
        this.presenceFilter = ctx.createBiquadFilter();
        this.presenceFilter.type = 'peaking';
        this.presenceFilter.frequency.value = 3500;
        this.presenceFilter.Q.value = 2;
        this.presenceFilter.gain.value = 0;

        // ── Spatial Processor (Mid/Side stereo width) ─────────
        this._buildSpatialProcessor(ctx);

        // ── Reverb (synthetic all-pass network) ───────────────
        this._buildReverb(ctx);

        // ── Compressor ────────────────────────────────────────
        this.compressor = ctx.createDynamicsCompressor();
        this._applyCompressorProfile('light');

        // ── Master Gain (headroom) ────────────────────────────
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 1.0;

        // ── Analyser ──────────────────────────────────────────
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;

        // ── Wire the chain ────────────────────────────────────
        //
        //   bassBoost → subBass → punch → presence
        //       → [spatialBypass or spatial M/S processor]
        //       → reverbSend (wet/dry mix)
        //       → compressor → masterGain → analyser
        //
        this.bassBoostFilter.connect(this.subBassFilter);
        this.subBassFilter.connect(this.punchFilter);
        this.punchFilter.connect(this.presenceFilter);

        // spatial processor input is presenceFilter's output
        this.presenceFilter.connect(this._spatialBypassGain);
        this.presenceFilter.connect(this._spatialSplitter);

        // spatial bypass output → reverb send
        this._spatialBypassGain.connect(this._reverbSend);
        this._spatialMerger.connect(this._reverbSend);

        // reverb output → compressor
        this._reverbReturn.connect(this.compressor);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.analyser);

        // Exposed endpoints
        this.input = this.bassBoostFilter;
        this.output = this.analyser;

        this._built = true;
        console.log('[SoundEngine] DSP chain built successfully.');

        // Apply saved state
        this._applyState(this.state, true); // true = instant (no ramp on init)
    }

    // ── Spatial M/S Processor ─────────────────────────────────────────────────

    _buildSpatialProcessor(ctx) {
        // Mid/Side processing for stereo width:
        //   L_out = Mid + Side * width
        //   R_out = Mid - Side * width
        //
        // Implemented as:
        //   stereoSplitter → L/R gains → midMerger → midGain (0.5)
        //                                             sideGain (width factor)
        //
        // For simplicity and browser compat, we use a ChannelSplitter + ChannelMerger
        // approach with gain nodes to simulate M/S processing.

        this._spatialSplitter = ctx.createChannelSplitter(2);
        this._spatialMerger = ctx.createChannelMerger(2);

        // Mid path: L + R (average)
        const midMixer = ctx.createGain();
        midMixer.gain.value = 0.5;

        // Side path: L - R (difference)
        const sideL = ctx.createGain();
        const sideR = ctx.createGain();
        sideL.gain.value = 0.5;
        sideR.gain.value = -0.5; // inverted for R

        // Width control gains
        this._midGain = ctx.createGain();
        this._midGain.gain.value = 1.0;

        this._sideGain = ctx.createGain();
        this._sideGain.gain.value = 0.0; // 0 = no widening

        // Output reconstruction gains
        const outL = ctx.createGain();
        const outR = ctx.createGain();
        outL.gain.value = 1.0;
        outR.gain.value = 1.0;

        // Wire: splitter → L channel = index 0, R channel = index 1
        // Mid: (L + R) / 2
        this._spatialSplitter.connect(midMixer, 0); // L → mid
        this._spatialSplitter.connect(midMixer, 1); // R → mid

        // Side: (L - R) / 2
        this._spatialSplitter.connect(sideL, 0); // L → side+
        this._spatialSplitter.connect(sideR, 1); // R → side-

        // sideL and sideR sum to form the side signal
        sideL.connect(this._sideGain);
        sideR.connect(this._sideGain);

        // Reconstruct L = mid + side, R = mid - side
        // We send mid to both channels and side with +1/-1 sign
        midMixer.connect(this._midGain);

        const sideToL = ctx.createGain();
        sideToL.gain.value = 1.0;
        const sideToR = ctx.createGain();
        sideToR.gain.value = -1.0;

        this._sideGain.connect(sideToL);
        this._sideGain.connect(sideToR);

        // L output: midGain + sideToL → merger channel 0
        this._midGain.connect(outL);
        sideToL.connect(outL);
        outL.connect(this._spatialMerger, 0, 0);

        // R output: midGain + sideToR → merger channel 1
        this._midGain.connect(outR);
        sideToR.connect(outR);
        outR.connect(this._spatialMerger, 0, 1);

        // Bypass gain — carries the direct signal when spatial is off
        this._spatialBypassGain = ctx.createGain();
        this._spatialBypassGain.gain.value = 1.0; // starts active (spatial off)

        // The spatial merger starts with zero output until enabled
        // We achieve bypass by routing presenceFilter → bypassGain AND → splitter
        // When spatial is OFF:  bypassGain=1, sideGain=0
        // When spatial is ON:   bypassGain=0, sideGain=width, midGain=1
    }

    // ── Reverb (Synthetic All-Pass Delay Network) ─────────────────────────────

    _buildReverb(ctx) {
        // Wet/dry send
        this._reverbSend = ctx.createGain();
        this._reverbSend.gain.value = 1.0;

        this._reverbReturn = ctx.createGain();
        this._reverbReturn.gain.value = 1.0;

        // Dry path (always on)
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1.0;
        this._dryGain = dryGain;

        // Wet path — sum of several short all-pass filtered delays
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.0; // off by default
        this._wetGain = wetGain;

        // Build 4 comb-like delay lines for the "room" effect
        // These are short (< 50ms) to avoid obvious echo
        const COMB_CONFIGS = [
            { delay: 0.013, feedback: 0.55 },
            { delay: 0.017, feedback: 0.50 },
            { delay: 0.021, feedback: 0.45 },
            { delay: 0.029, feedback: 0.40 },
        ];

        const combMixer = ctx.createGain();
        combMixer.gain.value = 0.25; // tame the combined output
        this._delayNodes = [];

        COMB_CONFIGS.forEach(({ delay, feedback }) => {
            const delayNode = ctx.createDelay(0.1);
            delayNode.delayTime.value = delay;

            const fbGain = ctx.createGain();
            fbGain.gain.value = feedback;

            // All-pass filter to diffuse the early reflections
            const apf = ctx.createBiquadFilter();
            apf.type = 'allpass';
            apf.frequency.value = 800;
            apf.Q.value = 0.7;

            wetGain.connect(delayNode);
            delayNode.connect(apf);
            apf.connect(fbGain);
            fbGain.connect(delayNode); // feedback loop
            apf.connect(combMixer);

            this._delayNodes.push({ delayNode, fbGain });
        });

        // Wire send → dry + wet → return
        this._reverbSend.connect(dryGain);
        this._reverbSend.connect(wetGain);

        dryGain.connect(this._reverbReturn);
        combMixer.connect(this._reverbReturn);
    }

    // ── Room Effect Configuration ──────────────────────────────────────────────

    _setRoomEffect(type) {
        if (!this._built) return;
        this._reverbType = type;
        const now = this.ctx.currentTime;

        // wet gain levels and feedback tuning per room type
        const ROOM_CONFIGS = {
            off:    { wet: 0.00, fb: [0.55, 0.50, 0.45, 0.40] },
            studio: { wet: 0.10, fb: [0.50, 0.45, 0.40, 0.35] },
            club:   { wet: 0.18, fb: [0.60, 0.55, 0.50, 0.45] },
            cinema: { wet: 0.20, fb: [0.65, 0.60, 0.55, 0.50] },
            hall:   { wet: 0.25, fb: [0.70, 0.65, 0.60, 0.55] },
        };

        const cfg = ROOM_CONFIGS[type] || ROOM_CONFIGS.off;
        this._wetGain.gain.cancelScheduledValues(now);
        this._wetGain.gain.setTargetAtTime(cfg.wet, now, RAMP_TC);

        this._delayNodes.forEach(({ fbGain }, i) => {
            fbGain.gain.cancelScheduledValues(now);
            fbGain.gain.setTargetAtTime(cfg.fb[i] ?? 0.4, now, RAMP_TC);
        });
    }

    // ── Compressor ────────────────────────────────────────────────────────────

    _applyCompressorProfile(profileName) {
        if (!this.compressor) return;
        const p = COMPRESSOR_PROFILES[profileName] || COMPRESSOR_PROFILES.light;
        const now = this.ctx ? this.ctx.currentTime : 0;

        this.compressor.threshold.setTargetAtTime(p.threshold, now, RAMP_TC);
        this.compressor.knee.setTargetAtTime(p.knee, now, RAMP_TC);
        this.compressor.ratio.setTargetAtTime(p.ratio, now, RAMP_TC);
        this.compressor.attack.setTargetAtTime(p.attack, now, RAMP_TC);
        this.compressor.release.setTargetAtTime(p.release, now, RAMP_TC);
    }

    // ── Headroom Management ───────────────────────────────────────────────────

    _updateHeadroom(bass, subBass, punch, loudness) {
        if (!this.masterGain) return;
        // Total boost in dB (weighted)
        const totalBoost = Math.max(0, bass) + Math.max(0, subBass) * 0.6 + Math.max(0, punch) * 0.5 + loudness * 0.04;
        // Scale master gain down as boost increases — max 35% reduction at high boost
        const reduction = Math.min(0.35, totalBoost / 60);
        const targetGain = 1.0 - reduction;
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(targetGain, now, RAMP_TC * 2);
    }

    // ── Internal State Application ────────────────────────────────────────────

    _applyState(state, instant = false) {
        if (!this._built) return;
        const now = this.ctx.currentTime;
        const tc = instant ? 0.001 : RAMP_TC;

        // Bass Boost (max +12 dB)
        const bassGain = Math.max(-12, Math.min(12, state.bass || 0));
        this.bassBoostFilter.gain.cancelScheduledValues(now);
        this.bassBoostFilter.gain.setTargetAtTime(bassGain, now, tc);

        // Sub Bass (max +10 dB – psycho perceptual, not reckless)
        const subBassGain = Math.max(0, Math.min(10, state.subBass || 0));
        this.subBassFilter.gain.cancelScheduledValues(now);
        this.subBassFilter.gain.setTargetAtTime(subBassGain, now, tc);

        // Punch
        const punchGain = Math.max(0, Math.min(10, state.punch || 0));
        this.punchFilter.gain.cancelScheduledValues(now);
        this.punchFilter.gain.setTargetAtTime(punchGain, now, tc);

        // Presence
        const presenceGain = Math.max(-3, Math.min(6, state.presence || 0));
        this.presenceFilter.gain.cancelScheduledValues(now);
        this.presenceFilter.gain.setTargetAtTime(presenceGain, now, tc);

        // Stereo width (0–100 → 0..1.5 side gain)
        const width = Math.max(0, Math.min(100, state.stereoWidth || 0));
        const spatialEnabled = !!state.spatialEnabled;
        this._applyStereoWidth(spatialEnabled, width, instant);

        // Loudness (0–100 → slight makeup gain, max +4dB = factor ~1.58)
        const loudFactor = 1.0 + (state.loudness / 100) * 0.58;
        // Loudness applied to compressor makeupGain via masterGain — factored in headroom
        // (We don't expose a separate loudness gain node; instead it offsets headroom calc)

        // Headroom management (counteracts accumulating boosts)
        this._updateHeadroom(bassGain, subBassGain, punchGain, state.loudness || 0);

        // Compressor
        if (state.compressor) {
            this._applyCompressorProfile(state.compressor);
        }

        // Room effect
        this._setRoomEffect(state.room || 'off');
    }

    _applyStereoWidth(enabled, width, instant = false) {
        if (!this._built) return;
        const now = this.ctx.currentTime;
        const tc = instant ? 0.001 : RAMP_TC;

        this._spatialEnabled = enabled;
        this._stereoWidth = width;

        if (!enabled || width === 0) {
            // Bypass: full signal through bypass gain, nothing through M/S
            this._spatialBypassGain.gain.cancelScheduledValues(now);
            this._spatialBypassGain.gain.setTargetAtTime(1.0, now, tc);
            this._sideGain.gain.cancelScheduledValues(now);
            this._sideGain.gain.setTargetAtTime(0.0, now, tc);
        } else {
            // Active: route through M/S processor
            // Width 0..100 → sideGain 0..1.5 (1.5 gives very wide, beyond 1 creates exaggerated stereo)
            const sideAmount = (width / 100) * 1.5;
            this._spatialBypassGain.gain.cancelScheduledValues(now);
            this._spatialBypassGain.gain.setTargetAtTime(0.0, now, tc);
            this._sideGain.gain.cancelScheduledValues(now);
            this._sideGain.gain.setTargetAtTime(sideAmount, now, tc);
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Apply a named preset (e.g. 'dj', 'normal', 'cinema')
     */
    applyPreset(presetName) {
        const preset = SOUND_PRESETS[presetName];
        if (!preset) {
            console.warn('[SoundEngine] Unknown preset:', presetName);
            return;
        }

        const newState = {
            preset: presetName,
            bass: preset.bass,
            subBass: preset.subBass,
            punch: preset.punch,
            presence: preset.presence,
            stereoWidth: preset.stereoWidth,
            spatialEnabled: preset.stereoWidth > 0,
            loudness: preset.loudness,
            room: preset.room,
            compressor: preset.compressor,
        };

        this.state = newState;
        this._applyState(newState);
        this._saveState();
    }

    /**
     * Set a single parameter (e.g. 'bass', 'stereoWidth', 'room')
     */
    setParam(key, value) {
        if (!this._built) return;

        // Update state
        this.state = { ...this.state, [key]: value, preset: 'custom' };

        const now = this.ctx.currentTime;

        switch (key) {
            case 'bass': {
                const v = Math.max(-12, Math.min(12, value));
                this.bassBoostFilter.gain.cancelScheduledValues(now);
                this.bassBoostFilter.gain.setTargetAtTime(v, now, RAMP_TC);
                break;
            }
            case 'subBass': {
                const v = Math.max(0, Math.min(10, value));
                this.subBassFilter.gain.cancelScheduledValues(now);
                this.subBassFilter.gain.setTargetAtTime(v, now, RAMP_TC);
                break;
            }
            case 'punch': {
                const v = Math.max(0, Math.min(10, value));
                this.punchFilter.gain.cancelScheduledValues(now);
                this.punchFilter.gain.setTargetAtTime(v, now, RAMP_TC);
                break;
            }
            case 'presence': {
                const v = Math.max(-3, Math.min(6, value));
                this.presenceFilter.gain.cancelScheduledValues(now);
                this.presenceFilter.gain.setTargetAtTime(v, now, RAMP_TC);
                break;
            }
            case 'stereoWidth':
                this._applyStereoWidth(this.state.spatialEnabled, value);
                break;
            case 'spatialEnabled':
                this._applyStereoWidth(!!value, this.state.stereoWidth);
                break;
            case 'loudness':
                // Loudness is encoded into headroom — re-compute
                this._updateHeadroom(
                    this.state.bass || 0,
                    this.state.subBass || 0,
                    this.state.punch || 0,
                    value
                );
                break;
            case 'room':
                this._setRoomEffect(value);
                break;
            case 'compressor':
                this._applyCompressorProfile(value);
                break;
            default:
                break;
        }

        // Re-compute headroom whenever bass-affecting params change
        if (['bass', 'subBass', 'punch'].includes(key)) {
            this._updateHeadroom(
                this.state.bass || 0,
                this.state.subBass || 0,
                this.state.punch || 0,
                this.state.loudness || 0
            );
        }

        this._saveState();
    }

    /**
     * Get the current state (for initializing UI from saved settings)
     */
    getState() {
        return { ...this.state };
    }
}

export const soundEngine = new SoundEnhancementEngine();
