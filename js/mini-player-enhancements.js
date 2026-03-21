// Mini Player Enhancements
document.addEventListener('DOMContentLoaded', () => {
    const miniPlayer = document.getElementById('miniPlayer');
    const audio = document.getElementById('audioElement');

    if (!miniPlayer || !audio) return;

    // Enhanced Mini Player Features
    class MiniPlayerEnhancer {
        constructor() {
            this.isVisible = false;
            this.isPlaying = false;
            this.showLyrics = false;
            this.showQueue = false;
            this.currentSong = null;
            this.queue = [];
            this.shuffleMode = false;
            this.repeatMode = 'off'; // 'off', 'one', 'all'

            this.init();
        }

        init() {
            this.createWaveform();
            this.createEqualizer();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.setupGestures();
        }

        // Create waveform visualization
        createWaveform() {
            const waveformContainer = document.createElement('div');
            waveformContainer.className = 'mini-waveform';

            for (let i = 0; i < 10; i++) {
                const bar = document.createElement('div');
                bar.className = 'waveform-bar';
                waveformContainer.appendChild(bar);
            }

            miniPlayer.appendChild(waveformContainer);
        }

        // Create equalizer visualization
        createEqualizer() {
            const equalizerContainer = document.createElement('div');
            equalizerContainer.className = 'mini-equalizer';

            for (let i = 0; i < 5; i++) {
                const bar = document.createElement('div');
                bar.className = 'eq-bar';
                equalizerContainer.appendChild(bar);
            }

            miniPlayer.appendChild(equalizerContainer);
        }

        // Setup event listeners
        setupEventListeners() {
            // Show/hide mini player based on audio state
            audio.addEventListener('loadstart', () => this.show());
            audio.addEventListener('play', () => this.setPlaying(true));
            audio.addEventListener('pause', () => this.setPlaying(false));
            audio.addEventListener('ended', () => this.setPlaying(false));

            // Progress bar enhancements
            const progressContainer = miniPlayer.querySelector('.progress-container');
            if (progressContainer) {
                progressContainer.addEventListener('mouseenter', () => {
                    this.showProgressPreview(true);
                });
                progressContainer.addEventListener('mouseleave', () => {
                    this.showProgressPreview(false);
                });
                progressContainer.addEventListener('mousemove', (e) => {
                    this.updateProgressPreview(e);
                });
            }

            // Volume control enhancements
            const volumeSlider = document.getElementById('miniVolumeSlider');
            if (volumeSlider) {
                volumeSlider.addEventListener('input', (e) => {
                    this.updateVolumeVisualization(e.target.value);
                });
            }

            // Mini player info click to show lyrics
            const miniPlayerInfo = document.getElementById('miniPlayerInfo');
            if (miniPlayerInfo) {
                miniPlayerInfo.addEventListener('click', () => {
                    this.toggleLyrics();
                });
            }

            // Double-click to expand
            miniPlayer.addEventListener('dblclick', () => {
                this.expandToFullscreen();
            });
        }

        // Setup keyboard shortcuts
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Only handle shortcuts when mini player is visible
                if (!this.isVisible) return;

                switch (e.code) {
                    case 'Space':
                        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                            e.preventDefault();
                            this.togglePlay();
                        }
                        break;
                    case 'ArrowLeft':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.previousTrack();
                        }
                        break;
                    case 'ArrowRight':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.nextTrack();
                        }
                        break;
                    case 'ArrowUp':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.volumeUp();
                        }
                        break;
                    case 'ArrowDown':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.volumeDown();
                        }
                        break;
                    case 'KeyL':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.toggleLyrics();
                        }
                        break;
                    case 'KeyQ':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.toggleQueue();
                        }
                        break;
                }
            });
        }

        // Setup touch gestures for mobile
        setupGestures() {
            let startX = 0;
            let startY = 0;

            miniPlayer.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }, { passive: true });

            miniPlayer.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = startX - endX;
                const diffY = startY - endY;

                // Swipe gestures
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    if (Math.abs(diffX) > 50) {
                        if (diffX > 0) {
                            this.nextTrack(); // Swipe left = next
                        } else {
                            this.previousTrack(); // Swipe right = previous
                        }
                    }
                } else {
                    if (Math.abs(diffY) > 50) {
                        if (diffY > 0) {
                            this.expandToFullscreen(); // Swipe up = expand
                        } else {
                            this.hide(); // Swipe down = hide
                        }
                    }
                }
            });
        }

        // Show mini player
        show() {
            miniPlayer.classList.add('visible');
            this.isVisible = true;
            this.animateIn();
        }

        // Hide mini player
        hide() {
            miniPlayer.classList.remove('visible');
            this.isVisible = false;
        }

        // Set playing state
        setPlaying(playing) {
            this.isPlaying = playing;
            if (playing) {
                miniPlayer.classList.add('playing');
            } else {
                miniPlayer.classList.remove('playing');
            }
        }

        // Animate mini player entrance
        animateIn() {
            miniPlayer.style.transform = 'translateY(100%)';
            miniPlayer.style.opacity = '0';

            requestAnimationFrame(() => {
                miniPlayer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                miniPlayer.style.transform = 'translateY(0)';
                miniPlayer.style.opacity = '1';
            });
        }

        // Show progress preview on hover
        showProgressPreview(show) {
            const preview = miniPlayer.querySelector('.progress-preview');
            if (preview) {
                preview.style.opacity = show ? '1' : '0';
            }
        }

        // Update progress preview position
        updateProgressPreview(e) {
            if (!audio.duration) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const time = percent * audio.duration;

            let preview = miniPlayer.querySelector('.progress-preview');
            if (!preview) {
                preview = document.createElement('div');
                preview.className = 'progress-preview';
                preview.style.cssText = `
                    position: absolute;
                    top: -30px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    z-index: 1001;
                `;
                e.currentTarget.appendChild(preview);
            }

            preview.textContent = this.formatTime(time);
            preview.style.left = `${percent * 100}%`;
            preview.style.transform = 'translateX(-50%)';
        }

        // Update volume visualization
        updateVolumeVisualization(volume) {
            const volumeSlider = document.getElementById('miniVolumeSlider');
            if (volumeSlider) {
                const percent = volume;
                volumeSlider.style.setProperty('--volume-percent', `${percent}%`);

                // Update volume level attribute for styling
                if (percent === 0) {
                    volumeSlider.setAttribute('data-volume', 'muted');
                } else if (percent < 30) {
                    volumeSlider.setAttribute('data-volume', 'low');
                } else if (percent < 70) {
                    volumeSlider.setAttribute('data-volume', 'medium');
                } else {
                    volumeSlider.setAttribute('data-volume', 'high');
                }
            }
        }

        // Toggle lyrics display
        toggleLyrics() {
            this.showLyrics = !this.showLyrics;

            if (this.showLyrics) {
                this.displayLyrics();
                miniPlayer.classList.add('show-lyrics');
            } else {
                this.hideLyrics();
                miniPlayer.classList.remove('show-lyrics');
            }
        }

        // Display lyrics
        displayLyrics() {
            let lyricsContainer = miniPlayer.querySelector('.mini-lyrics');
            if (!lyricsContainer) {
                lyricsContainer = document.createElement('div');
                lyricsContainer.className = 'mini-lyrics';
                miniPlayer.appendChild(lyricsContainer);
            }

            // Sample lyrics - in real app, fetch from API
            const sampleLyrics = this.currentSong?.lyrics || 'Lyrics not available for this song...';
            lyricsContainer.textContent = sampleLyrics;
        }

        // Hide lyrics
        hideLyrics() {
            const lyricsContainer = miniPlayer.querySelector('.mini-lyrics');
            if (lyricsContainer) {
                lyricsContainer.remove();
            }
        }

        // Toggle queue display
        toggleQueue() {
            this.showQueue = !this.showQueue;

            if (this.showQueue) {
                this.displayQueue();
                miniPlayer.classList.add('show-queue');
            } else {
                this.hideQueue();
                miniPlayer.classList.remove('show-queue');
            }
        }

        // Display queue
        displayQueue() {
            let queueContainer = miniPlayer.querySelector('.mini-queue-preview');
            if (!queueContainer) {
                queueContainer = document.createElement('div');
                queueContainer.className = 'mini-queue-preview';
                queueContainer.innerHTML = `
                    <div class="queue-header">Up Next</div>
                    <div class="queue-list"></div>
                `;
                miniPlayer.appendChild(queueContainer);
            }

            const queueList = queueContainer.querySelector('.queue-list');
            queueList.innerHTML = '';

            // Sample queue items - in real app, use actual queue
            const sampleQueue = [
                { title: 'Next Song 1', artist: 'Artist 1', image: 'Assets/music.png' },
                { title: 'Next Song 2', artist: 'Artist 2', image: 'Assets/music.png' },
                { title: 'Next Song 3', artist: 'Artist 3', image: 'Assets/music.png' }
            ];

            sampleQueue.forEach(song => {
                const queueItem = document.createElement('div');
                queueItem.className = 'queue-item';
                queueItem.innerHTML = `
                    <img src="${song.image}" alt="${song.title}">
                    <div class="queue-item-info">
                        <div class="queue-item-title">${song.title}</div>
                        <div class="queue-item-artist">${song.artist}</div>
                    </div>
                `;
                queueList.appendChild(queueItem);
            });
        }

        // Hide queue
        hideQueue() {
            const queueContainer = miniPlayer.querySelector('.mini-queue-preview');
            if (queueContainer) {
                queueContainer.remove();
            }
        }

        // Control functions
        togglePlay() {
            if (window.playerControls && window.playerControls.togglePlay) {
                window.playerControls.togglePlay();
            }
        }

        nextTrack() {
            if (window.playNextSong) {
                window.playNextSong();
            }
        }

        previousTrack() {
            if (window.playPreviousSong) {
                window.playPreviousSong();
            }
        }

        volumeUp() {
            const currentVolume = audio.volume;
            const newVolume = Math.min(1, currentVolume + 0.1);
            audio.volume = newVolume;
            this.updateVolumeVisualization(newVolume * 100);
        }

        volumeDown() {
            const currentVolume = audio.volume;
            const newVolume = Math.max(0, currentVolume - 0.1);
            audio.volume = newVolume;
            this.updateVolumeVisualization(newVolume * 100);
        }

        expandToFullscreen() {
            const expandButton = document.getElementById('expandPlayer');
            if (expandButton) {
                expandButton.click();
            }
        }

        // Utility function
        formatTime(seconds) {
            if (isNaN(seconds) || seconds < 0) return '0:00';
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        }

        // Update current song
        updateSong(song) {
            this.currentSong = song;
        }

        // Add notification system
        showNotification(message, type = 'info') {
            let notification = miniPlayer.querySelector('.mini-notification');
            if (!notification) {
                notification = document.createElement('div');
                notification.className = 'mini-notification';
                miniPlayer.appendChild(notification);
            }

            notification.textContent = message;
            notification.classList.add('show');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 2000);
        }
    }

    // Initialize the enhancer
    const miniPlayerEnhancer = new MiniPlayerEnhancer();

    // Make it globally available
    window.miniPlayerEnhancer = miniPlayerEnhancer;

    // Hook into existing song loading
    if (!window.__mehfilMiniUIWrapperApplied) {
        const originalUpdatePlayerUI = window.updatePlayerUI;
        if (originalUpdatePlayerUI) {
            window.updatePlayerUI = function (song) {
                try {
                    originalUpdatePlayerUI(song);
                    miniPlayerEnhancer.updateSong(song);
                } catch (error) {
                    console.error('Error in updatePlayerUI:', error);
                    miniPlayerEnhancer.updateSong(song);
                }
            };
            window.__mehfilMiniUIWrapperApplied = true;
        }
    }
});