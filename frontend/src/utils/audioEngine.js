/**
 * Mehfil Pro Audio Engine (AutoMix Capable)
 * Singleton management of AudioContext and GainNodes to prevent re-creation errors.
 */

class ProAudioEngine {
    constructor() {
        this.ctx = null;
        this.sourceA = null;
        this.sourceB = null;
        this.gainA = null;
        this.gainB = null;
        this.filters = null;
        this.initialized = false;
    }

    init(audioA, audioB) {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Create Gain Nodes
            this.gainA = this.ctx.createGain();
            this.gainB = this.ctx.createGain();
            
            this.gainA.gain.value = 1;
            this.gainB.gain.value = 0;

            // Sources
            this.sourceA = this.ctx.createMediaElementSource(audioA);
            this.sourceB = this.ctx.createMediaElementSource(audioB);

            // Filters (EQ)
            const bass = this.ctx.createBiquadFilter();
            bass.type = 'lowshelf';
            bass.frequency.value = 200;
            
            const mid = this.ctx.createBiquadFilter();
            mid.type = 'peaking';
            mid.frequency.value = 1000;
            
            const treble = this.ctx.createBiquadFilter();
            treble.type = 'highshelf';
            treble.frequency.value = 3000;

            // Chain: Source -> Gain -> EQ -> Destination
            this.sourceA.connect(this.gainA);
            this.sourceB.connect(this.gainB);
            
            this.gainA.connect(bass);
            this.gainB.connect(bass);
            
            bass.connect(mid);
            mid.connect(treble);
            treble.connect(this.ctx.destination);

            this.filters = { bass, mid, treble };
            this.initialized = true;
            console.log('[ProAudioEngine] Hard-initialized successfully.');
        } catch (e) {
            console.error('[ProAudioEngine] Initialization failed:', e);
        }
    }

    async resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    crossfade(fromChannel, toChannel, duration = 5000, targetVolume = 0.8) {
        if (!this.initialized) return;

        const durationSec = duration / 1000;
        const now = this.ctx.currentTime;
        const fromGain = fromChannel === 'A' ? this.gainA : this.gainB;
        const toGain = toChannel === 'A' ? this.gainA : this.gainB;

        const target = Math.max(0.0001, targetVolume);

        // Generate Smoothstep Curve (Ease-In-Out) [progress * progress * (3 - 2 * progress)]
        const steps = 50;
        const outCurve = new Float32Array(steps);
        const inCurve = new Float32Array(steps);

        for (let i = 0; i < steps; i++) {
            const progress = i / (steps - 1);
            const eased = progress * progress * (3 - 2 * progress);
            outCurve[i] = Math.max(0.0001, targetVolume * (1 - eased));
            inCurve[i] = Math.max(0.0001, targetVolume * eased);
        }

        fromGain.gain.cancelScheduledValues(now);
        fromGain.gain.setValueCurveAtTime(outCurve, now, durationSec);

        toGain.gain.cancelScheduledValues(now);
        toGain.gain.setValueCurveAtTime(inCurve, now, durationSec);
        
        // Final Hard Snap
        setTimeout(() => {
            if (this.initialized) {
                fromGain.gain.value = 0;
                toGain.gain.value = target;
            }
        }, duration + 100);
    }


    // Force sync the hardware to match the store's current active channel
    sync(activeChannel, volume) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        
        const active = activeChannel === 'A' ? this.gainA : this.gainB;
        const idle = activeChannel === 'A' ? this.gainB : this.gainA;

        active.gain.setTargetAtTime(volume, now, 0.05);
        idle.gain.setTargetAtTime(0, now, 0.05);
    }



    setVolume(activeChannel, vol) {
        if (!this.initialized) return;
        const activeGain = activeChannel === 'A' ? this.gainA : this.gainB;
        const now = this.ctx.currentTime;
        activeGain.gain.cancelScheduledValues(now);
        activeGain.gain.setTargetAtTime(vol, now, 0.02);
    }

}



export const audioEngine = new ProAudioEngine();
