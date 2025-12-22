// Audio Fix Script - Ensures audio works properly
document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audioElement');
    
    if (!audio) {
        console.error('Audio element not found!');
        return;
    }
    
    // Ensure audio is not muted and has proper volume
    audio.muted = false;
    audio.volume = 0.8;
    
    console.log('Audio fix applied:', {
        muted: audio.muted,
        volume: audio.volume,
        readyState: audio.readyState
    });
    
    // Add error handling
    audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        console.error('Audio error details:', {
            error: audio.error,
            networkState: audio.networkState,
            readyState: audio.readyState,
            src: audio.src
        });
    });
    
    // Log when audio can play
    audio.addEventListener('canplay', () => {
        console.log('Audio can play - ready state:', audio.readyState);
    });
    
    // Log when audio starts playing
    audio.addEventListener('play', () => {
        console.log('Audio started playing');
    });
    
    // Log when audio is paused
    audio.addEventListener('pause', () => {
        console.log('Audio paused');
    });
    
    // Ensure volume controls work
    const miniVolumeSlider = document.getElementById('miniVolumeSlider');
    if (miniVolumeSlider) {
        miniVolumeSlider.value = 80;
        console.log('Mini volume slider set to 80');
    }
    
    const fullscreenVolume = document.getElementById('fullscreenVolume');
    if (fullscreenVolume) {
        fullscreenVolume.value = 80;
        console.log('Fullscreen volume slider set to 80');
    }
    
    // Fix any potential audio context issues
    const resumeAudioContext = () => {
        if (window.AudioContext || window.webkitAudioContext) {
            // Only resume if we have an audio context that needs resuming
            const contexts = [];
            if (window.miniPlayerEnhancer && window.miniPlayerEnhancer.audioContext) {
                contexts.push(window.miniPlayerEnhancer.audioContext);
            }
            if (window.fullscreenPlayerEnhancer && window.fullscreenPlayerEnhancer.audioContext) {
                contexts.push(window.fullscreenPlayerEnhancer.audioContext);
            }
            
            contexts.forEach(ctx => {
                if (ctx.state === 'suspended') {
                    ctx.resume().then(() => {
                        console.log('Audio context resumed');
                    }).catch(err => {
                        console.warn('Could not resume audio context:', err);
                    });
                }
            });
        }
    };
    
    // Resume audio context on user interaction
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    const handleUserInteraction = () => {
        resumeAudioContext();
        userInteractionEvents.forEach(event => {
            document.removeEventListener(event, handleUserInteraction);
        });
    };
    
    userInteractionEvents.forEach(event => {
        document.addEventListener(event, handleUserInteraction, { once: true });
    });
    
    // Add debug button functionality
    const debugButton = document.getElementById('debugAudio');
    if (debugButton) {
        debugButton.addEventListener('click', () => {
            console.log('=== AUDIO DEBUG INFO ===');
            console.log('Audio element:', audio);
            console.log('Audio src:', audio.src);
            console.log('Audio volume:', audio.volume);
            console.log('Audio muted:', audio.muted);
            console.log('Audio paused:', audio.paused);
            console.log('Audio readyState:', audio.readyState);
            console.log('Audio networkState:', audio.networkState);
            console.log('Audio duration:', audio.duration);
            console.log('Audio currentTime:', audio.currentTime);
            
            if (audio.error) {
                console.log('Audio error:', audio.error);
            }
            
            // Test volume change
            const originalVolume = audio.volume;
            audio.volume = 0.5;
            setTimeout(() => {
                audio.volume = originalVolume;
                console.log('Volume test completed');
            }, 1000);
            
            // Try to play if there's a source
            if (audio.src && audio.readyState >= 2) {
                audio.play().then(() => {
                    console.log('Audio play test successful');
                }).catch(err => {
                    console.error('Audio play test failed:', err);
                });
            } else {
                console.log('No audio source loaded or not ready');
            }
        });
    }
});