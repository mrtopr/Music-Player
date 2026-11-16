/**
 * WSOLA — Waveform Similarity Overlap-Add time stretching.
 *
 * Pitch-preserving tempo change: the output has a different duration but the
 * same pitch, which is what a DJ needs to beatmatch two tracks.
 *
 * Plain `playbackRate` changes pitch *and* tempo (not acceptable), and
 * `AudioBufferSourceNode.detune` changes only pitch. WSOLA does the real job:
 * it slices the input into overlapping frames and slides each frame until it
 * best matches the previous one (normalised cross-correlation), which avoids
 * the "phasiness" of naive overlap-add.
 *
 * The algorithm is split into two phases so that a stereo file keeps its
 * stereo image:
 *   planWSOLA()  → the frame offsets, computed once from the mono mix
 *   renderWSOLA() → renders any channel with that plan
 *
 * Pure functions only — no DOM/Web Audio — so it can run inside a Worker.
 */

/**
 * Computes the frame positions for a stretch.
 *
 * The similarity search runs on a **decimated** copy of the signal (÷4):
 * a full-resolution search over a 45-second window is ~4 billion operations,
 * while the decimated version is ~16× cheaper and finds the same alignment
 * (the ear cannot hear a 4-sample frame offset).
 *
 * @param {Float32Array} input mono reference (usually the channel mix)
 * @param {number} ratio output length / input length (>1 = slower)
 */
export function planWSOLA(input, ratio, options = {}) {
    const frameSize = options.frameSize ?? 2048;
    const searchRadius = options.searchRadius ?? 512;
    const synthesisHop = options.synthesisHop ?? 512;
    const decimation = options.decimation ?? 4;

    const plan = {
        frameSize,
        searchRadius,
        synthesisHop,
        decimation,
        // The analysis consumes input faster than the synthesis writes output
        // when the output is shorter (ratio < 1 → faster playback).
        analysisHop: Math.max(1, Math.round(synthesisHop / ratio)),
        // ratio = output length / input length
        outputLength: Math.max(1, Math.floor(input.length * ratio) + frameSize),
        offsets: [],
    };

    const window = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
        window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));
    }
    plan.window = window;

    // ── Decimated signal for the similarity search ──
    const decimated = new Float32Array(Math.ceil(input.length / decimation));
    for (let i = 0; i < decimated.length; i++) decimated[i] = input[i * decimation] || 0;

    const searchRadiusDecimated = Math.max(1, Math.round(searchRadius / decimation));
    const compareLength = Math.min(256, Math.floor(frameSize / (2 * decimation)));

    let analysisPosition = 0;
    let referenceTail = null;

    while (analysisPosition + frameSize < input.length && plan.offsets.length * synthesisHop < plan.outputLength) {
        let bestOffset = 0;
        let bestScore = -Infinity;

        if (referenceTail) {
            const maxOffset = Math.min(
                searchRadiusDecimated,
                decimated.length - analysisPosition / decimation - compareLength,
            );
            const start = Math.max(0, Math.round(analysisPosition / decimation));

            for (let offset = -maxOffset; offset <= maxOffset; offset++) {
                const candidate = start + offset;
                if (candidate < 0 || candidate + compareLength >= decimated.length) continue;

                let dot = 0;
                let normA = 0;
                let normB = 0;
                for (let i = 0; i < compareLength; i++) {
                    const a = referenceTail[i];
                    const b = decimated[candidate + i] || 0;
                    dot += a * b;
                    normA += a * a;
                    normB += b * b;
                }
                const score = dot / (Math.sqrt(normA * normB) + 1e-9);
                if (score > bestScore) {
                    bestScore = score;
                    bestOffset = offset * decimation;
                }
            }
        }

        const readStart = Math.max(0, analysisPosition + bestOffset);
        plan.offsets.push(readStart);

        // Remember the tail (decimated) for the next similarity search.
        referenceTail = new Float32Array(compareLength);
        const tailStart = Math.round(readStart / decimation);
        for (let i = 0; i < compareLength; i++) {
            referenceTail[i] = decimated[tailStart + i] || 0;
        }

        analysisPosition += plan.analysisHop;
    }

    return plan;
}

/**
 * Renders one channel with a plan produced by planWSOLA().
 * @param {Float32Array} input
 * @param {object} plan
 */
export function renderWSOLA(input, plan) {
    const { frameSize, synthesisHop, outputLength, offsets, window: win } = plan;
    const output = new Float32Array(outputLength);
    const weights = new Float32Array(outputLength);

    for (let n = 0; n < offsets.length; n++) {
        const readStart = offsets[n];
        const outputPosition = n * synthesisHop;
        const frameEnd = Math.min(outputLength, outputPosition + frameSize);

        for (let i = 0; i < frameEnd - outputPosition; i++) {
            const sample = (input[readStart + i] || 0) * win[i];
            output[outputPosition + i] += sample;
            weights[outputPosition + i] += win[i];
        }
    }

    for (let i = 0; i < outputLength; i++) {
        if (weights[i] > 1e-6) output[i] /= weights[i];
    }

    return output;
}

/**
 * Convenience wrapper for a single channel.
 * @param {Float32Array} input
 * @param {number} ratio
 */
export function stretchWSOLA(input, ratio, options = {}) {
    if (!input?.length || !Number.isFinite(ratio) || ratio <= 0) return input;
    if (Math.abs(ratio - 1) < 1e-4) return input.slice();

    const plan = planWSOLA(input, ratio, options);
    return renderWSOLA(input, plan);
}

/**
 * Stretches a set of channels, keeping the stereo image (all channels share
 * the same frame offsets).
 *
 * @param {Float32Array[]} channels
 * @param {number} ratio
 * @returns {{ channels: Float32Array[], outputDuration: number, ratio: number }}
 */
export function stretchChannels(channels, ratio, options = {}) {
    if (!channels?.length) return { channels: [], outputDuration: 0, ratio };

    const length = Math.max(...channels.map((c) => c.length));
    const reference = new Float32Array(length);
    for (let c = 0; c < channels.length; c++) {
        const data = channels[c];
        for (let i = 0; i < length; i++) reference[i] += (data[i] || 0) / channels.length;
    }

    const plan = planWSOLA(reference, ratio, options);
    const rendered = channels.map((channel) => renderWSOLA(channel, plan));

    return {
        channels: rendered,
        outputDuration: rendered[0]?.length / (options.sampleRate || 44100),
        ratio,
        plan,
    };
}
