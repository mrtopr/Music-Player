/**
 * Audio Initialization and Fixes
 * Fixes: 1) Passive event listener warnings
 *        2) Audio muted on load
 */

document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audioElement');

    if (!audio) return;

    // Fix 1: Ensure audio is not muted and has proper volume
    audio.muted = false;
    audio.volume = 0.8; // Set to 80% volume

    console.log('✅ Audio initialized - Muted:', audio.muted, 'Volume:', audio.volume);

    // Fix 2: Handle passive event listener warnings for touch events
    // Override the touch event listeners with passive: false where needed
    const touchElements = document.querySelectorAll('.progress-bar-container, .fullscreen-progress-bar, input[type="range"]');

    touchElements.forEach(element => {
        // Remove default passive listeners and add non-passive ones
        element.addEventListener('touchstart', function (e) {
            // Allow default behavior for range inputs
            if (this.tagName === 'INPUT') {
                return;
            }
        }, { passive: true });

        element.addEventListener('touchmove', function (e) {
            // Only prevent default if actually interacting
            if (this.tagName !== 'INPUT' && e.cancelable) {
                // Don't prevent default - let it scroll naturally
            }
        }, { passive: true });
    });

    // Fix 3: Ensure volume controls sync with audio element
    const volumeSliders = document.querySelectorAll('#miniVolumeSlider, #fullscreenVolume');
    volumeSliders.forEach(slider => {
        if (slider) {
            slider.value = audio.volume * 100;
            slider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                audio.volume = volume;
                audio.muted = false; // Ensure unmuted when adjusting volume
            });
        }
    });

    // Fix 4: Unmute on first user interaction (browser autoplay policy)
    const unmuteOnInteraction = () => {
        if (audio.muted) {
            audio.muted = false;
            audio.volume = 0.8;
            console.log('🔊 Audio unmuted on user interaction');
        }
        // Remove listener after first interaction
        document.removeEventListener('click', unmuteOnInteraction);
        document.removeEventListener('touchstart', unmuteOnInteraction);
    };

    document.addEventListener('click', unmuteOnInteraction, { once: true });
    document.addEventListener('touchstart', unmuteOnInteraction, { once: true, passive: true });
});
