let audioCtx;
let analyser;
let canvas;
let canvasCtx;
let sourceA, sourceB;

export function initVisualizer(audioA, audioB) {
    if (audioCtx) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { }
        return;
    }

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        analyser = audioCtx.createAnalyser();

        // 256 gives a good chunkiness (128 frequency bins)
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        // Hardware Equalizer Matrix
        const bassFilter = audioCtx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 200;

        const midFilter = audioCtx.createBiquadFilter();
        midFilter.type = 'peaking';
        midFilter.frequency.value = 1000;
        midFilter.Q.value = 1.0;

        const trebleFilter = audioCtx.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 3000;

        window.audioEQ = { bass: bassFilter, mid: midFilter, treble: trebleFilter };

        // Restore saved EQ values
        const savedEq = JSON.parse(localStorage.getItem('mehfilEQ') || '{"bass":0,"mid":0,"treble":0}');
        bassFilter.gain.value = savedEq.bass;
        midFilter.gain.value = savedEq.mid;
        trebleFilter.gain.value = savedEq.treble;

        sourceA = audioCtx.createMediaElementSource(audioA);
        sourceB = audioCtx.createMediaElementSource(audioB);

        // Source -> Bass -> Mid -> Treble -> Analyser -> Output
        sourceA.connect(bassFilter);
        sourceB.connect(bassFilter);

        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(analyser);
        analyser.connect(audioCtx.destination);

        canvas = document.getElementById('audioVisualizer');
        if (canvas) {
            canvasCtx = canvas.getContext('2d');
            resize();
            window.addEventListener('resize', resize);
            draw();
        }
    } catch (e) {
        console.warn('WebAudio API failed to init:', e);
    }
}

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.3; // 30vh
}

function draw() {
    requestAnimationFrame(draw);
    if (!analyser || !canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2;
    let x = 0;

    const rootStyles = getComputedStyle(document.documentElement);
    // Bind to the dynamic accent color created in Phase 5
    const color = rootStyles.getPropertyValue('--accent-primary').trim() || '#C6A15B';

    for (let i = 0; i < bufferLength; i++) {
        // Boost visually by cubic ratio so quiet sounds still dance
        const value = dataArray[i];
        const percent = value / 255;
        const barHeight = Math.pow(percent, 1.5) * canvas.height;

        // Fading gradient
        canvasCtx.fillStyle = color;
        canvasCtx.globalAlpha = 0.6 + (percent * 0.4);

        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
    }
}
