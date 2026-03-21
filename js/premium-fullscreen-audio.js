/**
 * Premium Fullscreen Player Audio-Reactive Enhancements
 * Syncs visual effects with audio playback
 */

document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audioElement');
    const fullscreenPlayer = document.getElementById('fullscreenPlayer');
    const artworkContainer = document.querySelector('.artwork-container');

    if (!audio || !fullscreenPlayer) return;

    // Track playing state
    let isPlaying = false;
    let audioContext = null;
    let analyser = null;
    let dataArray = null;

    // Initialize audio context for reactivity
    function initAudioReactivity() {
        try {
            // CRITICAL: Only create audio source ONCE globally
            // Multiple createMediaElementSource calls will disconnect audio!

            if (window.audioContext && window.analyser && window.audioSource) {
                // Reuse existing setup
                audioContext = window.audioContext;
                analyser = window.analyser;
                console.log('✅ Reusing existing audio context');
            } else {
                console.log('🎵 Creating new audio context...');
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();

                // Create source ONLY if it doesn't exist
                if (!window.audioSource) {
                    console.log('🔌 Connecting audio source to analyser...');
                    window.audioSource = audioContext.createMediaElementSource(audio);
                }

                // Connect the audio graph: source -> analyser -> destination
                window.audioSource.disconnect(); // Disconnect any previous connections
                window.audioSource.connect(analyser);
                analyser.connect(audioContext.destination);

                // Store globally to prevent recreation
                window.audioContext = audioContext;
                window.analyser = analyser;

                console.log('✅ Audio context initialized and connected to speakers');
            }

            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            // Start monitoring audio
            monitorAudioIntensity();
        } catch (error) {
            console.error('❌ Audio reactivity error:', error);
            console.warn('Audio reactivity not available:', error);
        }
    }

    // Monitor audio intensity and update visual effects
    function monitorAudioIntensity() {
        if (!analyser || !dataArray) return;

        function update() {
            if (!isPlaying) return;

            analyser.getByteFrequencyData(dataArray);

            // Calculate average intensity
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const intensity = average / 255; // Normalize to 0-1

            // Update visual effects based on intensity
            if (intensity > 0.6) {
                fullscreenPlayer.classList.add('high-intensity');
            } else {
                fullscreenPlayer.classList.remove('high-intensity');
            }

            requestAnimationFrame(update);
        }

        update();
    }

    // Play event - start vinyl rotation and audio reactivity
    audio.addEventListener('play', () => {
        isPlaying = true;
        fullscreenPlayer.classList.add('playing');

        if (artworkContainer) {
            artworkContainer.style.animationPlayState = 'running';
        }

        // Initialize audio reactivity on first play
        if (!audioContext) {
            initAudioReactivity();
        } else {
            monitorAudioIntensity();
        }

        // Resume audio context if suspended
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });

    // Pause event - pause vinyl rotation
    audio.addEventListener('pause', () => {
        isPlaying = false;
        fullscreenPlayer.classList.remove('playing');
        fullscreenPlayer.classList.remove('high-intensity');

        if (artworkContainer) {
            artworkContainer.style.animationPlayState = 'paused';
        }
    });

    // Ended event - reset rotation
    audio.addEventListener('ended', () => {
        isPlaying = false;
        fullscreenPlayer.classList.remove('playing');
        fullscreenPlayer.classList.remove('high-intensity');

        if (artworkContainer) {
            artworkContainer.style.animationPlayState = 'paused';
        }
    });
});
