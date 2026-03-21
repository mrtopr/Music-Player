document.addEventListener('DOMContentLoaded', () => {
    // Audio element
    const audio = document.getElementById('audioElement');

    // Mini player elements
    const miniPlayer = document.getElementById('miniPlayer');
    const miniPlayButton = document.getElementById('miniPlayButton');
    const miniPrevButton = document.getElementById('miniPrevButton');
    const miniNextButton = document.getElementById('miniNextButton');
    const miniProgressBar = document.getElementById('miniProgressBar');
    const miniProgressInput = document.getElementById('miniProgressInput');
    const miniVolumeButton = document.getElementById('miniVolumeButton');
    const miniVolumeSlider = document.getElementById('miniVolumeSlider');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');

    // Fullscreen player elements
    const fullscreenPlayer = document.getElementById('fullscreenPlayer');
    const fullscreenPlay = document.getElementById('fullscreenPlay');
    const fullscreenPrev = document.getElementById('fullscreenPrev');
    const fullscreenNext = document.getElementById('fullscreenNext');
    const fullscreenProgress = document.getElementById('fullscreenProgress');
    const fullscreenProgressInput = document.getElementById('fullscreenProgressInput');
    const fullscreenCurrentTime = document.getElementById('fullscreenCurrentTime');
    const fullscreenDuration = document.getElementById('fullscreenDuration');
    const expandPlayer = document.getElementById('expandPlayer');
    const closeFullscreen = document.getElementById('closeFullscreen');

    // Player state
    let isPlaying = false;
    let currentSong = null;
    let previousVolume = 0.8;

    // Initialize audio volume
    if (audio) {
        audio.volume = 0.8;
        if (miniVolumeSlider) miniVolumeSlider.value = 80;
    }

    // Toggle between play and pause
    function togglePlay() {
        if (!audio || !audio.src) {
            console.warn('No audio source loaded');
            return;
        }

        if (audio.paused) {
            audio.play().then(() => {
                isPlaying = true;
                updatePlayButtons(true);
            }).catch(error => {
                console.error('Error playing audio:', error);
                playerShowNotification('Error playing audio', 'error');
            });
        } else {
            audio.pause();
            isPlaying = false;
            updatePlayButtons(false);
        }
    }

    // Update play button icons
    function updatePlayButtons(playing) {
        const playIcon = '<i class="bi bi-play-fill"></i>';
        const pauseIcon = '<i class="bi bi-pause-fill"></i>';

        if (miniPlayButton) {
            miniPlayButton.innerHTML = playing ? pauseIcon : playIcon;
        }
        if (fullscreenPlay) {
            fullscreenPlay.innerHTML = playing ? pauseIcon : playIcon;
        }
    }

    // Update progress bar and time display
    function updateProgress() {
        if (!audio || !audio.duration) return;

        const { currentTime, duration } = audio;
        const progressPercent = (currentTime / duration) * 100;

        // Update mini player progress
        if (miniProgressBar) {
            miniProgressBar.style.width = `${progressPercent}%`;
        }
        if (miniProgressInput) {
            miniProgressInput.value = progressPercent;
        }

        // Update fullscreen player progress
        if (fullscreenProgress) {
            fullscreenProgress.style.width = `${progressPercent}%`;
        }
        if (fullscreenProgressInput) {
            fullscreenProgressInput.value = progressPercent;
        }

        // Update time displays directly here instead of calling separate function
        // Update mini player time
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(currentTime);
        }
        if (durationEl && duration) {
            durationEl.textContent = formatTime(duration);
        }

        // Update fullscreen player time
        if (fullscreenCurrentTime) {
            fullscreenCurrentTime.textContent = formatTime(currentTime);
        }
        if (fullscreenDuration && duration) {
            fullscreenDuration.textContent = formatTime(duration);
        }
    }

    // Set progress when user interacts with progress bar
    function setProgress(e) {
        if (!audio || !audio.duration) return;

        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        audio.currentTime = (clickX / width) * duration;
    }

    // Format time in seconds to MM:SS
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    // Update time display
    function updateTimeDisplay() {
        if (!audio) return;

        const { currentTime, duration } = audio;

        // Update mini player time
        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(currentTime);
        }
        if (durationEl && duration) {
            durationEl.textContent = formatTime(duration);
        }

        // Update fullscreen player time
        if (fullscreenCurrentTime) {
            fullscreenCurrentTime.textContent = formatTime(currentTime);
        }
        if (fullscreenDuration && duration) {
            fullscreenDuration.textContent = formatTime(duration);
        }
    }

    // Show mini player with animation
    function showMiniPlayer() {
        if (miniPlayer) {
            miniPlayer.classList.add('show');
        }
    }

    // Hide mini player
    function hideMiniPlayer() {
        if (miniPlayer) {
            miniPlayer.classList.remove('show');
        }
    }

    // Volume control functions
    function updateVolumeIcon(volume) {
        const volumeButtons = [miniVolumeButton, document.getElementById('fullscreenMute')];

        volumeButtons.forEach(button => {
            if (!button) return;

            if (volume === 0) {
                button.innerHTML = '<i class="bi bi-volume-mute"></i>';
            } else if (volume < 0.5) {
                button.innerHTML = '<i class="bi bi-volume-down"></i>';
            } else {
                button.innerHTML = '<i class="bi bi-volume-up"></i>';
            }
        });
    }

    function setVolume(volume) {
        if (!audio) return;

        audio.volume = volume;
        updateVolumeIcon(volume);

        // Update volume sliders
        if (miniVolumeSlider) miniVolumeSlider.value = volume * 100;

        const fullscreenVolume = document.getElementById('fullscreenVolume');
        if (fullscreenVolume) fullscreenVolume.value = volume * 100;
    }

    function toggleMute() {
        if (!audio) return;

        if (audio.volume > 0) {
            previousVolume = audio.volume;
            setVolume(0);
        } else {
            setVolume(previousVolume);
        }
    }

    // Event Listeners

    // Play/Pause buttons
    if (miniPlayButton) {
        miniPlayButton.addEventListener('click', togglePlay);
    }
    // Note: fullscreen play button is handled by fullscreen-player-enhancements.js
    // if (fullscreenPlay) {
    //     fullscreenPlay.addEventListener('click', togglePlay);
    // }

    // Progress bar interactions
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.addEventListener('click', setProgress);
    }

    // Progress input sliders
    if (miniProgressInput) {
        miniProgressInput.addEventListener('input', () => {
            if (audio && audio.duration) {
                const seekTime = (miniProgressInput.value / 100) * audio.duration;
                audio.currentTime = seekTime;
            }
        });
    }

    if (fullscreenProgressInput) {
        fullscreenProgressInput.addEventListener('input', () => {
            if (audio && audio.duration) {
                const seekTime = (fullscreenProgressInput.value / 100) * audio.duration;
                audio.currentTime = seekTime;
            }
        });
    }

    // Volume controls
    if (miniVolumeSlider) {
        miniVolumeSlider.addEventListener('input', () => {
            setVolume(miniVolumeSlider.value / 100);
        });
    }

    if (miniVolumeButton) {
        miniVolumeButton.addEventListener('click', toggleMute);
    }

    // Fullscreen player controls
    if (expandPlayer && fullscreenPlayer) {
        expandPlayer.addEventListener('click', () => {
            fullscreenPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeFullscreen && fullscreenPlayer) {
        closeFullscreen.addEventListener('click', () => {
            fullscreenPlayer.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Audio event listeners
    if (audio) {
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', () => {
            updateTimeDisplay();
            showMiniPlayer();
        });

        audio.addEventListener('ended', () => {
            isPlaying = false;
            updatePlayButtons(false);
            // Auto-play next song if available
            if (window.playNextSong && typeof window.playNextSong === 'function') {
                window.playNextSong();
            }
        });

        audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            if (typeof playerShowNotification === 'function') {
                playerShowNotification('Error loading audio', 'error');
            }
            isPlaying = false;
            updatePlayButtons(false);
        });

        audio.addEventListener('canplay', () => {
            console.log('Audio can play');
        });

        audio.addEventListener('waiting', () => {
            console.log('Audio buffering...');
        });

        audio.addEventListener('playing', () => {
            isPlaying = true;
            updatePlayButtons(true);
        });

        audio.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayButtons(false);
        });
    }

    // Initialize fullscreen volume controls
    const fullscreenVolume = document.getElementById('fullscreenVolume');
    const fullscreenMute = document.getElementById('fullscreenMute');

    if (fullscreenVolume) {
        fullscreenVolume.addEventListener('input', () => {
            setVolume(fullscreenVolume.value / 100);
        });
    }

    if (fullscreenMute) {
        fullscreenMute.addEventListener('click', toggleMute);
    }

    // Next/Previous functionality (placeholder - will be connected to main player logic)
    function playNext() {
        console.log('Playing next track');
        // This will be connected to the main playlist logic in index.js
        if (window.playNextSong && typeof window.playNextSong === 'function') {
            try {
                window.playNextSong();
            } catch (error) {
                console.error('Error playing next song:', error);
            }
        }
    }

    function playPrev() {
        console.log('Playing previous track');
        // This will be connected to the main playlist logic in index.js
        if (window.playPreviousSong && typeof window.playPreviousSong === 'function') {
            try {
                window.playPreviousSong();
            } catch (error) {
                console.error('Error playing previous song:', error);
            }
        }
    }

    // Next/Previous button listeners
    if (miniNextButton) {
        miniNextButton.addEventListener('click', playNext);
    }
    if (miniPrevButton) {
        miniPrevButton.addEventListener('click', playPrev);
    }
    if (fullscreenNext) {
        fullscreenNext.addEventListener('click', playNext);
    }
    if (fullscreenPrev) {
        fullscreenPrev.addEventListener('click', playPrev);
    }

    // Initialize volume icon
    updateVolumeIcon(audio ? audio.volume : 0.8);

    // Expose functions globally for external access
    window.playerControls = {
        togglePlay,
        setVolume,
        toggleMute,
        showMiniPlayer,
        hideMiniPlayer,
        updatePlayButtons,
        isPlaying: () => isPlaying,
        getCurrentSong: () => currentSong,
        setCurrentSong: (song) => { currentSong = song; }
    };
});

// Function to update player UI when a new song is loaded
function updatePlayerUI(song) {
    // Update mini player
    const miniPlayerImage = document.getElementById('miniPlayerImage');
    const miniPlayerTitle = document.getElementById('miniPlayerTitle');
    const miniPlayerArtist = document.getElementById('miniPlayerArtist');

    // Enhanced image URL handling - use getImageUrl if available, otherwise fallback
    let imageUrl = 'Assets/music.png';
    if (song.cover) {
        imageUrl = song.cover;
    } else if (song.image && typeof window.getImageUrl === 'function') {
        imageUrl = window.getImageUrl(song.image);
    } else if (song.image) {
        imageUrl = song.image;
    }

    if (miniPlayerImage) {
        miniPlayerImage.src = imageUrl;
        miniPlayerImage.alt = song.title || 'Album Art';
        console.log('Player.js: Mini player image updated to:', imageUrl);
    }
    if (miniPlayerTitle) {
        miniPlayerTitle.textContent = song.title || song.name || 'Unknown Title';
    }
    if (miniPlayerArtist) {
        miniPlayerArtist.textContent = song.artist || song.primaryArtists || 'Unknown Artist';
    }

    // Update fullscreen player
    const fullscreenAlbumArt = document.getElementById('fullscreenAlbumArt');
    const fullscreenSongTitle = document.getElementById('fullscreenSongTitle');
    const fullscreenArtist = document.getElementById('fullscreenArtist');

    if (fullscreenAlbumArt) {
        fullscreenAlbumArt.src = imageUrl;
        fullscreenAlbumArt.alt = song.title || 'Album Art';
    }
    if (fullscreenSongTitle) {
        fullscreenSongTitle.textContent = song.title || song.name || 'Unknown Title';
    }
    if (fullscreenArtist) {
        fullscreenArtist.textContent = song.artist || song.primaryArtists || 'Unknown Artist';
    }

    // Show the mini player
    if (window.playerControls) {
        window.playerControls.showMiniPlayer();
        window.playerControls.setCurrentSong(song);
    }
}

// Enhanced function to load and play a song
function loadAndPlaySong(songUrl, songData) {
    const audio = document.getElementById('audioElement');

    if (!audio) {
        console.error('Audio element not found');
        return;
    }

    if (!songUrl) {
        console.error('No song URL provided');
        playerShowNotification('No audio URL available', 'error');
        return;
    }

    // Reset audio element
    audio.pause();
    audio.currentTime = 0;

    // Set new source
    audio.src = songUrl;

    // Update the UI with song data
    updatePlayerUI(songData);

    // Load and play the song
    audio.load();

    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Audio started playing successfully');
            if (window.playerControls) {
                window.playerControls.updatePlayButtons(true);
            }
        }).catch(error => {
            console.error('Error playing audio:', error);
            playerShowNotification('Error playing audio: ' + error.message, 'error');
            if (window.playerControls) {
                window.playerControls.updatePlayButtons(false);
            }
        });
    }
}

// Helper function for notifications (if not already defined)
function playerShowNotification(message, type = 'info') {
    // Check if notification function exists in main app
    if (typeof window.showNotification === 'function') {
        try {
            window.showNotification(message, type);
        } catch (e) {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    } else {
        // Fallback to console logging
        console.log(`${type.toUpperCase()}: ${message}`);

        // Try to create a simple notification if possible
        try {
            let notification = document.getElementById('player-notification');
            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'player-notification';
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(28, 28, 35, 0.95);
                    color: #fff;
                    padding: 12px 20px;
                    border-radius: 8px;
                    z-index: 10000;
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                    max-width: 300px;
                `;
                document.body.appendChild(notification);
            }

            notification.textContent = message;
            notification.style.transform = 'translateX(0)';

            // Auto-hide after 3 seconds
            setTimeout(() => {
                notification.style.transform = 'translateX(400px)';
            }, 3000);
        } catch (e) {
            // If DOM manipulation fails, just log to console
            console.log(`Player Notification: ${message}`);
        }
    }
}

// Make functions available globally
window.loadAndPlaySong = loadAndPlaySong;
window.updatePlayerUI = updatePlayerUI;
// Mobile fullscreen player elements
const mobilePlayBtn = document.getElementById('mobilePlayBtn');
const mobilePrevBtn = document.getElementById('mobilePrevBtn');
const mobileNextBtn = document.getElementById('mobileNextBtn');
const mobileShuffleBtn = document.getElementById('mobileShuffleBtn');
const mobileRepeatBtn = document.getElementById('mobileRepeatBtn');
const mobileCurrentTime = document.getElementById('mobileCurrentTime');
const mobileDuration = document.getElementById('mobileDuration');
const waveformContainer = document.getElementById('waveformContainer');
const closeFullscreenDesktop = document.getElementById('closeFullscreenDesktop');
const fullscreenPlayerElement = document.getElementById('fullscreenPlayer');

function formatMobileTimeValue(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Generate waveform bars
function generateWaveform() {
    if (!waveformContainer) return;

    waveformContainer.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'waveform-bar';
        waveformContainer.appendChild(bar);
    }
}

// Update circular progress
function updateCircularProgress(currentTime, duration) {
    if (duration > 0) {
        const progressAngle = (currentTime / duration) * 360;
        const circularProgress = document.querySelector('.circular-progress');
        const progressDot = document.querySelector('.progress-dot');

        if (circularProgress) {
            circularProgress.style.setProperty('--progress-angle', `${progressAngle}deg`);
        }
        if (progressDot) {
            progressDot.style.setProperty('--progress-angle', `${progressAngle}deg`);
        }
    }
}

// Update waveform animation based on playing state
function updateWaveform(playing) {
    const bars = document.querySelectorAll('.waveform-bar');
    bars.forEach((bar, index) => {
        if (playing) {
            bar.classList.add('active');
            // Simulate different heights based on audio
            const progress = audio.currentTime / audio.duration || 0;
            const barProgress = index / bars.length;
            if (barProgress <= progress) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        } else {
            bar.classList.remove('active');
        }
    });
}

// Set background image for mobile fullscreen
function setMobileBackground(imageUrl) {
    const fullscreenPlayer = document.getElementById('fullscreenPlayer');
    if (fullscreenPlayer && imageUrl) {
        fullscreenPlayer.style.setProperty('--bg-image', `url(${imageUrl})`);
    }
}

// Connect mobile controls to existing functions
// Note: Mobile play button is handled by fullscreen-player-enhancements.js
// if (mobilePlayBtn) {
//     mobilePlayBtn.addEventListener('click', togglePlay);
// }

if (mobilePrevBtn) {
    mobilePrevBtn.addEventListener('click', () => {
        if (typeof window.prevSong === 'function') {
            window.prevSong();
        } else if (typeof window.playPreviousSong === 'function') {
            window.playPreviousSong();
        }
    });
}

if (mobileNextBtn) {
    mobileNextBtn.addEventListener('click', () => {
        if (typeof window.nextSong === 'function') {
            window.nextSong();
        } else if (typeof window.playNextSong === 'function') {
            window.playNextSong();
        }
    });
}

if (mobileShuffleBtn) {
    mobileShuffleBtn.addEventListener('click', () => {
        // Toggle shuffle mode
        mobileShuffleBtn.classList.toggle('active');
    });
}

if (mobileRepeatBtn) {
    mobileRepeatBtn.addEventListener('click', () => {
        // Toggle repeat mode
        mobileRepeatBtn.classList.toggle('active');
    });
}

// Close fullscreen for desktop
if (closeFullscreenDesktop) {
    closeFullscreenDesktop.addEventListener('click', () => {
        if (fullscreenPlayerElement) {
            fullscreenPlayerElement.classList.remove('active');
        }
        document.body.classList.remove('fullscreen-active');
    });
}

// Update mobile play button
function updateMobilePlayButton(playing) {
    if (mobilePlayBtn) {
        const icon = mobilePlayBtn.querySelector('i');
        if (icon) {
            icon.className = playing ? 'bi bi-pause-fill' : 'bi bi-play-fill';
        }
    }
}

// Update mobile time displays
function updateMobileTime(currentTime, duration) {
    if (mobileCurrentTime) {
        mobileCurrentTime.textContent = formatMobileTimeValue(currentTime);
    }
    if (mobileDuration) {
        mobileDuration.textContent = formatMobileTimeValue(duration);
    }
}

// Initialize mobile interface
function initializeMobileInterface() {
    generateWaveform();

    // Get audio element from DOM
    const audio = document.getElementById('audioElement');

    // Update existing time update function to include mobile
    const originalTimeUpdate = () => {
        if (audio && !isNaN(audio.duration)) {
            const currentTime = audio.currentTime;
            const duration = audio.duration;

            // Update mobile displays
            updateMobileTime(currentTime, duration);
            updateCircularProgress(currentTime, duration);
            updateWaveform(!audio.paused);
        }
    };

    if (audio) {
        audio.addEventListener('timeupdate', originalTimeUpdate);
    }
}

// Override existing updatePlayButtons function to include mobile
if (!window.__mehfilMobilePlayButtonsWrapped) {
    const originalUpdatePlayButtons = window.updatePlayButtons || function () { };
    window.updatePlayButtons = function (playing) {
        originalUpdatePlayButtons(playing);
        updateMobilePlayButton(playing);

        // Update circular progress animation
        const circularProgress = document.querySelector('.circular-progress');
        if (circularProgress) {
            if (playing) {
                circularProgress.classList.add('playing');
            } else {
                circularProgress.classList.remove('playing');
            }
        }
    };
    window.__mehfilMobilePlayButtonsWrapped = true;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeMobileInterface();
});

// Update song info for mobile
function updateMobileSongInfo(title, artist, imageUrl) {
    // Update background
    setMobileBackground(imageUrl);

    // The song title and artist are handled by the existing fullscreen update functions
    // but we can add mobile-specific updates here if needed
}

// Override existing playSong function to include mobile updates
if (!window.__mehfilPlaySongWrapped) {
    const originalPlaySong = window.playSong || function () { };
    window.playSong = function (song) {
        originalPlaySong(song);

        if (song && song.image) {
            updateMobileSongInfo(song.title, song.artist, song.image);
        }
    };
    window.__mehfilPlaySongWrapped = true;
}