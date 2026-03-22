// Fullscreen Player Enhancements
document.addEventListener('DOMContentLoaded', () => {
    const fullscreenPlayer = document.getElementById('fullscreenPlayer');
    const audio = document.getElementById('audioElement');

    if (!fullscreenPlayer || !audio) return;

    // Enhanced Fullscreen Player Features
    class FullscreenPlayerEnhancer {
        constructor() {
            this.isActive = false;
            this.currentSong = null;
            this.queue = [];
            this.visualizerActive = false;
            this.lyricsVisible = false;
            this.backgroundImageUrl = null;

            this.init();
        }

        init() {
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.setupGestures();
            this.setupBackgroundEffects();
        }

        // Setup event listeners
        setupEventListeners() {
            // Fullscreen activation/deactivation
            const expandButton = document.getElementById('expandPlayer');
            const closeButtons = [
                document.getElementById('closeFullscreen'),
                document.getElementById('closeFullscreenDesktop')
            ];

            if (expandButton) {
                expandButton.addEventListener('click', () => this.activate());
            }

            closeButtons.forEach(button => {
                if (button) {
                    button.addEventListener('click', () => this.deactivate());
                }
            });

            // Progress bar interactions
            this.setupProgressInteractions();

            // Mobile progress bar interactions
            this.setupMobileProgressInteractions();

            // Mobile control buttons
            this.setupControls();

            // Volume control enhancements
            this.setupVolumeControls();

            // Waveform interactions
            this.setupWaveformInteractions();

            // Background click to close (desktop only)
            fullscreenPlayer.addEventListener('click', (e) => {
                if (e.target === fullscreenPlayer && window.innerWidth > 768) {
                    this.deactivate();
                }
            });

            // Prevent content clicks from closing
            const fullscreenContent = fullscreenPlayer.querySelector('.fullscreen-content');
            if (fullscreenContent) {
                fullscreenContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }

        // Setup keyboard shortcuts
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                if (!this.isActive) return;

                switch (e.code) {
                    case 'Escape':
                        e.preventDefault();
                        this.deactivate();
                        break;
                    case 'Space':
                        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                            e.preventDefault();
                            this.togglePlay();
                        }
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.seekBackward(10);
                        } else {
                            this.previousTrack();
                        }
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.seekForward(10);
                        } else {
                            this.nextTrack();
                        }
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.volumeUp();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.volumeDown();
                        break;
                    case 'KeyM':
                        e.preventDefault();
                        this.toggleMute();
                        break;
                    case 'KeyS':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.toggleShuffle();
                        }
                        break;
                    case 'KeyR':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.toggleRepeat();
                        }
                        break;
                    case 'KeyL':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.toggleLyrics();
                        }
                        break;
                    case 'KeyV':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.toggleVisualizer();
                        }
                        break;
                }
            });
        }

        // Setup touch gestures
        setupGestures() {
            let startX = 0;
            let startY = 0;
            let startTime = 0;

            fullscreenPlayer.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTime = Date.now();
            }, { passive: true });

            fullscreenPlayer.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const endTime = Date.now();
                const diffX = startX - endX;
                const diffY = startY - endY;
                const timeDiff = endTime - startTime;

                // Only process quick gestures
                if (timeDiff > 500) return;

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
                            this.volumeUp(); // Swipe up = volume up
                        } else {
                            if (diffY < -100) {
                                this.deactivate(); // Strong swipe down = close
                            } else {
                                this.volumeDown(); // Swipe down = volume down
                            }
                        }
                    }
                }
            });
        }

        // Setup progress bar interactions
        setupProgressInteractions() {
            const progressBar = fullscreenPlayer.querySelector('.fullscreen-progress-bar');
            const waveformContainer = document.getElementById('waveformContainer');

            if (progressBar) {
                progressBar.addEventListener('mousemove', (e) => {
                    this.showProgressPreview(e);
                });

                progressBar.addEventListener('mouseleave', () => {
                    this.hideProgressPreview();
                });
            }

            if (waveformContainer) {
                waveformContainer.addEventListener('click', (e) => {
                    this.seekToPosition(e);
                });
            }
        }

        // Setup volume controls
        setupVolumeControls() {
            const volumeSlider = document.getElementById('fullscreenVolume');
            const volumeButton = document.getElementById('fullscreenMute');

            if (volumeSlider) {
                volumeSlider.addEventListener('input', (e) => {
                    this.setVolume(e.target.value / 100);
                    this.showVolumeIndicator(e.target.value);
                });
            }

            if (volumeButton) {
                volumeButton.addEventListener('click', () => {
                    this.toggleMute();
                });
            }
        }

        // Setup waveform interactions
        setupWaveformInteractions() {
            this.generateWaveform();
            this.updateWaveformBars();
        }

        // Setup mobile progress bar interactions
        setupMobileProgressInteractions() {
            const mobileProgressInput = document.getElementById('mobileProgressInput');
            const progressBarContainer = document.querySelector('.progress-bar-container');

            // Progress input slider
            if (mobileProgressInput) {
                mobileProgressInput.addEventListener('input', (e) => {
                    if (audio && audio.duration) {
                        const seekTime = (e.target.value / 100) * audio.duration;
                        audio.currentTime = seekTime;
                    }
                });

                // Update progress fill while dragging
                mobileProgressInput.addEventListener('input', (e) => {
                    const progressFill = document.getElementById('mobileProgressFill');
                    if (progressFill) {
                        progressFill.style.width = `${e.target.value}%`;
                    }
                });
            }

            // Progress bar container click
            if (progressBarContainer) {
                progressBarContainer.addEventListener('click', (e) => {
                    if (audio && audio.duration) {
                        const rect = progressBarContainer.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percent = clickX / rect.width;
                        const seekTime = percent * audio.duration;

                        audio.currentTime = seekTime;

                        // Update visual feedback immediately
                        const progressFill = document.getElementById('mobileProgressFill');
                        if (progressFill) {
                            progressFill.style.width = `${percent * 100}%`;
                        }
                        if (mobileProgressInput) {
                            mobileProgressInput.value = percent * 100;
                        }
                    }
                });
            }
        }

        // Setup mobile and desktop control buttons
        setupControls() {
            // Mobile controls
            const mobilePlayBtn = document.getElementById('mobilePlayBtn');
            const mobilePrevBtn = document.getElementById('mobilePrevBtn');
            const mobileNextBtn = document.getElementById('mobileNextBtn');
            const mobileShuffleBtn = document.getElementById('mobileShuffleBtn');
            const mobileRepeatBtn = document.getElementById('mobileRepeatBtn');

            // Desktop controls
            const fullscreenPlay = document.getElementById('fullscreenPlay');
            const fullscreenPrev = document.getElementById('fullscreenPrev');
            const fullscreenNext = document.getElementById('fullscreenNext');

            // Mobile play button
            if (mobilePlayBtn) {
                mobilePlayBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Mobile play button clicked');
                    this.togglePlay();
                });
            }

            // Desktop play button
            if (fullscreenPlay) {
                fullscreenPlay.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Desktop fullscreen play button clicked');
                    this.togglePlay();
                });
            }

            // Previous buttons
            if (mobilePrevBtn) {
                mobilePrevBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.previousTrack();
                });
            }
            if (fullscreenPrev) {
                fullscreenPrev.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.previousTrack();
                });
            }

            // Next buttons
            if (mobileNextBtn) {
                mobileNextBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.nextTrack();
                });
            }
            if (fullscreenNext) {
                fullscreenNext.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.nextTrack();
                });
            }

            // Mobile shuffle and repeat
            if (mobileShuffleBtn) {
                mobileShuffleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mobileShuffleBtn.classList.toggle('active');
                    // Add shuffle functionality here if needed
                });
            }

            if (mobileRepeatBtn) {
                mobileRepeatBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mobileRepeatBtn.classList.toggle('active');
                    // Add repeat functionality here if needed
                });
            }
        }

        // Setup background effects
        setupBackgroundEffects() {
            this.createParticleSystem();

            // Setup vinyl rotation animation sync
            this.setupVinylRotation();
        }

        // Setup vinyl rotation animation
        setupVinylRotation() {
            const artworkContainer = document.querySelector('.artwork-container');

            if (!artworkContainer) return;

            // Sync rotation with play/pause
            audio.addEventListener('play', () => {
                document.getElementById('fullscreenPlayer')?.classList.add('playing');
            });

            audio.addEventListener('pause', () => {
                document.getElementById('fullscreenPlayer')?.classList.remove('playing');
            });

            audio.addEventListener('ended', () => {
                document.getElementById('fullscreenPlayer')?.classList.remove('playing');
            });
        }

        // Activate fullscreen player
        activate() {
            this.isActive = true;
            fullscreenPlayer.classList.add('active');
            document.body.classList.add('fullscreen-active');
            document.body.style.overflow = 'hidden';

            // Update background
            this.updateBackground();

            // Update up next queue
            this.updateUpNext();

            // Start visualizer if enabled
            if (this.visualizerActive) {
                this.startVisualizer();
            }

            // Animate entrance
            this.animateEntrance();
        }

        // Deactivate fullscreen player
        deactivate() {
            this.isActive = false;
            fullscreenPlayer.classList.remove('active');
            document.body.classList.remove('fullscreen-active');
            document.body.style.overflow = '';

            // Stop visualizer
            this.stopVisualizer();

            // Animate exit
            this.animateExit();
        }

        // Generate waveform bars
        generateWaveform() {
            const waveformContainer = document.getElementById('waveformContainer');
            if (!waveformContainer) return;

            waveformContainer.innerHTML = '';
            for (let i = 0; i < 30; i++) {
                const bar = document.createElement('div');
                bar.className = 'waveform-bar';
                bar.style.height = `${Math.random() * 30 + 5}px`;
                waveformContainer.appendChild(bar);
            }
        }

        // Update waveform bars based on audio
        updateWaveformBars() {
            const bars = document.querySelectorAll('.waveform-bar');
            if (!bars.length || !audio.duration) return;

            const currentTime = audio.currentTime;
            const duration = audio.duration;
            const progress = currentTime / duration;

            bars.forEach((bar, index) => {
                const barProgress = index / bars.length;
                if (barProgress <= progress) {
                    bar.classList.add('active');
                    // Simulate audio intensity
                    const intensity = Math.sin(currentTime * 2 + index * 0.5) * 0.5 + 0.5;
                    bar.style.height = `${intensity * 30 + 5}px`;
                } else {
                    bar.classList.remove('active');
                    bar.style.height = `${Math.random() * 15 + 5}px`;
                }
            });
        }

        // Show progress preview
        showProgressPreview(e) {
            if (!audio.duration) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const time = percent * audio.duration;

            let preview = fullscreenPlayer.querySelector('.progress-preview');
            if (!preview) {
                preview = document.createElement('div');
                preview.className = 'progress-preview';
                preview.style.cssText = `
                    position: absolute;
                    top: -40px;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    z-index: 1001;
                    white-space: nowrap;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                `;
                e.currentTarget.appendChild(preview);
            }

            preview.textContent = this.formatTime(time);
            preview.style.left = `${percent * 100}%`;
            preview.style.transform = 'translateX(-50%)';
            preview.style.opacity = '1';
        }

        // Hide progress preview
        hideProgressPreview() {
            const preview = fullscreenPlayer.querySelector('.progress-preview');
            if (preview) {
                preview.style.opacity = '0';
            }
        }

        // Show volume indicator
        showVolumeIndicator(volume) {
            const indicator = fullscreenPlayer.querySelector('.volume-indicator');
            if (indicator) {
                indicator.classList.add('show');
                indicator.innerHTML = `<i class="bi bi-volume-${volume === 0 ? 'mute' : volume < 50 ? 'down' : 'up'}"></i>`;

                clearTimeout(this.volumeTimeout);
                this.volumeTimeout = setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }
        }

        // Seek to position
        seekToPosition(e) {
            if (!audio.duration) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        }

        // Update background with album art
        updateBackground() {
            if (this.backgroundImageUrl) {
                fullscreenPlayer.style.setProperty('--bg-image', `url(${this.backgroundImageUrl})`);
                fullscreenPlayer.style.background = `
                    linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
                    var(--bg-image)
                `;
                fullscreenPlayer.style.backgroundSize = 'cover';
                fullscreenPlayer.style.backgroundPosition = 'center';
                fullscreenPlayer.style.backgroundAttachment = 'fixed';
            }
        }

        // Create particle system
        createParticleSystem() {
            const canvas = document.createElement('canvas');
            canvas.className = 'particle-canvas';
            canvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                opacity: 0.3;
                z-index: 1;
            `;

            fullscreenPlayer.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            const particles = [];

            const resizeCanvas = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };

            const createParticle = () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });

            const animate = () => {
                if (!this.isActive) return;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                particles.forEach((particle, index) => {
                    particle.x += particle.vx;
                    particle.y += particle.vy;

                    if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                    if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 165, 59, ${particle.opacity})`;
                    ctx.fill();
                });

                requestAnimationFrame(animate);
            };

            // Initialize particles
            for (let i = 0; i < 50; i++) {
                particles.push(createParticle());
            }

            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();

            this.particleSystem = { canvas, animate, particles };
        }

        // Start visualizer
        startVisualizer() {
            if (!this.analyser) return;

            const visualize = () => {
                if (!this.visualizerActive || !this.isActive) return;

                this.analyser.getByteFrequencyData(this.dataArray);

                // Update waveform based on frequency data
                const bars = document.querySelectorAll('.waveform-bar');
                bars.forEach((bar, index) => {
                    const dataIndex = Math.floor(index * this.bufferLength / bars.length);
                    const intensity = this.dataArray[dataIndex] / 255;
                    bar.style.height = `${intensity * 40 + 5}px`;
                    bar.style.opacity = intensity * 0.8 + 0.2;
                });

                requestAnimationFrame(visualize);
            };

            visualize();
        }

        // Stop visualizer
        stopVisualizer() {
            this.visualizerActive = false;
        }

        // Animate entrance
        animateEntrance() {
            const elements = fullscreenPlayer.querySelectorAll('.fullscreen-content > *');
            elements.forEach((el, index) => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';

                setTimeout(() => {
                    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 100);
            });

            // Start particle animation
            if (this.particleSystem) {
                this.particleSystem.animate();
            }
        }

        // Animate exit
        animateExit() {
            const elements = fullscreenPlayer.querySelectorAll('.fullscreen-content > *');
            elements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '0';
                    el.style.transform = 'translateY(-20px)';
                }, index * 50);
            });
        }

        // Control functions
        togglePlay() {
            console.log('FullscreenPlayerEnhancer: togglePlay called');
            console.log('Audio element:', audio);
            console.log('Audio paused:', audio ? audio.paused : 'no audio');
            console.log('Window.togglePlay exists:', typeof window.togglePlay);

            // Use the main app's togglePlay function first
            if (window.togglePlay && typeof window.togglePlay === 'function') {
                console.log('Calling window.togglePlay');
                window.togglePlay();
            } else if (window.playerControls && window.playerControls.togglePlay) {
                console.log('Calling window.playerControls.togglePlay');
                window.playerControls.togglePlay();
            } else if (audio) {
                console.log('Using direct audio control');
                // Fallback: directly control audio element
                if (audio.paused) {
                    console.log('Audio is paused, trying to play');
                    audio.play().catch(error => {
                        console.error('Error playing audio:', error);
                    });
                } else {
                    console.log('Audio is playing, trying to pause');
                    audio.pause();
                }
            } else {
                console.warn('No play/pause method available');
            }
        }

        nextTrack() {
            if (window.nextSong && typeof window.nextSong === 'function') {
                window.nextSong();
            } else if (window.playNextSong && typeof window.playNextSong === 'function') {
                window.playNextSong();
            }
        }

        previousTrack() {
            if (window.prevSong && typeof window.prevSong === 'function') {
                window.prevSong();
            } else if (window.playPreviousSong && typeof window.playPreviousSong === 'function') {
                window.playPreviousSong();
            }
        }

        seekForward(seconds) {
            if (audio.currentTime + seconds < audio.duration) {
                audio.currentTime += seconds;
            }
        }

        seekBackward(seconds) {
            if (audio.currentTime - seconds > 0) {
                audio.currentTime -= seconds;
            }
        }

        volumeUp() {
            const newVolume = Math.min(1, audio.volume + 0.1);
            this.setVolume(newVolume);
        }

        volumeDown() {
            const newVolume = Math.max(0, audio.volume - 0.1);
            this.setVolume(newVolume);
        }

        setVolume(volume) {
            audio.volume = volume;
            const volumeSlider = document.getElementById('fullscreenVolume');
            if (volumeSlider) {
                volumeSlider.value = volume * 100;
            }
            this.showVolumeIndicator(volume * 100);
        }

        toggleMute() {
            if (window.playerControls && window.playerControls.toggleMute) {
                window.playerControls.toggleMute();
            }
        }

        toggleShuffle() {
            const shuffleBtn = document.getElementById('fullscreenShuffle');
            if (shuffleBtn) {
                shuffleBtn.classList.toggle('active');
            }
        }

        toggleRepeat() {
            const repeatBtn = document.getElementById('fullscreenRepeat');
            if (repeatBtn) {
                repeatBtn.classList.toggle('active');
            }
        }

        toggleLyrics() {
            this.lyricsVisible = !this.lyricsVisible;
            // Implementation for lyrics display
        }

        toggleVisualizer() {
            this.visualizerActive = !this.visualizerActive;
            if (this.visualizerActive) {
                this.startVisualizer();
            } else {
                this.stopVisualizer();
            }
        }

        // Update current song
        updateSong(song) {
            this.currentSong = song;
            if (song && song.image) {
                this.backgroundImageUrl = song.image;
                if (this.isActive) {
                    this.updateBackground();
                }
            }

            // Update up next queue when song changes
            if (this.isActive) {
                this.updateUpNext();
            }
        }

        // Update up next queue
        updateUpNext() {
            const upNextList = document.getElementById('upNextList');
            if (!upNextList) return;

            upNextList.innerHTML = '';

            // Get queue from main app if available
            let queueSongs = [];

            // Try to get songs from the main app
            if (window.songs && window.currentSongIndex !== undefined) {
                const currentIndex = window.currentSongIndex;
                const allSongs = window.songs;

                // Get next 5 songs in the queue
                for (let i = 1; i <= 5; i++) {
                    const nextIndex = (currentIndex + i) % allSongs.length;
                    if (allSongs[nextIndex]) {
                        queueSongs.push(allSongs[nextIndex]);
                    }
                }
            }

            // If no queue found, create sample data
            if (queueSongs.length === 0) {
                queueSongs = [
                    {
                        title: 'Tum Hi Ho',
                        artist: 'Arijit Singh',
                        image: '/music.png',
                        primaryArtists: 'Arijit Singh'
                    },
                    {
                        title: 'Raabta',
                        artist: 'Arijit Singh',
                        image: '/music.png',
                        primaryArtists: 'Arijit Singh'
                    },
                    {
                        title: 'Channa Mereya',
                        artist: 'Arijit Singh',
                        image: '/music.png',
                        primaryArtists: 'Arijit Singh'
                    },
                    {
                        title: 'Tera Ban Jaunga',
                        artist: 'Tulsi Kumar, Akhil Sachdeva',
                        image: '/music.png',
                        primaryArtists: 'Tulsi Kumar'
                    },
                    {
                        title: 'Bekhayali',
                        artist: 'Sachet Tandon',
                        image: '/music.png',
                        primaryArtists: 'Sachet Tandon'
                    }
                ];
            }

            queueSongs.forEach((song, index) => {
                const queueItem = document.createElement('div');
                queueItem.className = 'up-next-item';
                queueItem.innerHTML = `
                    <img src="${song.image || '/music.png'}" alt="${song.title}" loading="lazy">
                    <div class="up-next-item-info">
                        <div class="up-next-item-title">${song.title || song.name || 'Unknown Title'}</div>
                        <div class="up-next-item-artist">${song.artist || song.primaryArtists || 'Unknown Artist'}</div>
                    </div>
                    <div class="up-next-item-number">${index + 1}</div>
                `;

                // Add click handler to play this song
                queueItem.addEventListener('click', () => {
                    if (window.songs && window.currentSongIndex !== undefined) {
                        const targetIndex = (window.currentSongIndex + index + 1) % window.songs.length;
                        if (window.loadSong) {
                            window.loadSong(targetIndex);
                        }
                    }
                });

                upNextList.appendChild(queueItem);
            });
        }

        // Update circular progress
        updateCircularProgress() {
            if (!audio.duration) return;

            const progress = (audio.currentTime / audio.duration) * 360;
            const circularProgress = document.querySelector('.circular-progress');
            const progressDot = document.querySelector('.progress-dot');

            if (circularProgress) {
                circularProgress.style.setProperty('--progress-angle', `${progress}deg`);
            }
            if (progressDot) {
                progressDot.style.transform = `translateX(-50%) rotate(${progress}deg)`;
            }
        }

        // Update mobile progress bar
        updateMobileProgress() {
            if (!audio.duration) return;

            const currentTime = audio.currentTime;
            const duration = audio.duration;
            const progressPercent = (currentTime / duration) * 100;

            // Update progress bar fill
            const progressFill = document.getElementById('mobileProgressFill');
            if (progressFill) {
                progressFill.style.width = `${progressPercent}%`;
            }

            // Update progress input
            const progressInput = document.getElementById('mobileProgressInput');
            if (progressInput) {
                progressInput.value = progressPercent;
            }

            // Update only the progress bar time displays (not waveform)
            const mobileCurrentTime = document.getElementById('mobileCurrentTime');
            const mobileDuration = document.getElementById('mobileDuration');

            if (mobileCurrentTime) {
                mobileCurrentTime.textContent = this.formatTime(currentTime);
            }
            if (mobileDuration) {
                mobileDuration.textContent = this.formatTime(duration);
            }
        }

        // Update mobile play button icon
        updateMobilePlayButton(isPlaying) {
            console.log('updateMobilePlayButton called with isPlaying:', isPlaying);

            const mobilePlayBtn = document.getElementById('mobilePlayBtn');
            const fullscreenPlay = document.getElementById('fullscreenPlay');

            const playIcon = 'bi bi-play-fill';
            const pauseIcon = 'bi bi-pause-fill';

            // Update mobile play button
            if (mobilePlayBtn) {
                const icon = mobilePlayBtn.querySelector('i');
                if (icon) {
                    const newClass = isPlaying ? pauseIcon : playIcon;
                    console.log('Updating mobile button icon to:', newClass);
                    icon.className = newClass;
                }
            }

            // Update desktop fullscreen play button
            if (fullscreenPlay) {
                const icon = fullscreenPlay.querySelector('i');
                if (icon) {
                    const newClass = isPlaying ? pauseIcon : playIcon;
                    console.log('Updating desktop fullscreen button icon to:', newClass);
                    icon.className = newClass;
                }
            }
        }

        // Utility function
        formatTime(seconds) {
            if (isNaN(seconds) || seconds < 0) return '0:00';
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        }
    }

    // Initialize the enhancer
    const fullscreenPlayerEnhancer = new FullscreenPlayerEnhancer();

    // Make it globally available
    window.fullscreenPlayerEnhancer = fullscreenPlayerEnhancer;

    // Hook into existing functions
    if (!window.__mehfilFullscreenUIWrapperApplied) {
        const originalUpdatePlayerUI = window.updatePlayerUI;
        if (originalUpdatePlayerUI) {
            window.updatePlayerUI = function (song) {
                try {
                    originalUpdatePlayerUI(song);
                    fullscreenPlayerEnhancer.updateSong(song);
                } catch (error) {
                    console.error('Error in updatePlayerUI:', error);
                    fullscreenPlayerEnhancer.updateSong(song);
                }
            };
            window.__mehfilFullscreenUIWrapperApplied = true;
        }
    }

    // Update progress and waveform
    if (audio) {
        audio.addEventListener('timeupdate', () => {
            if (fullscreenPlayerEnhancer.isActive) {
                fullscreenPlayerEnhancer.updateCircularProgress();
                fullscreenPlayerEnhancer.updateWaveformBars();
                fullscreenPlayerEnhancer.updateMobileProgress();
            }
        });

        // Update mobile play button on play/pause events
        audio.addEventListener('play', () => {
            console.log('Audio play event - updating mobile button to pause icon');
            fullscreenPlayerEnhancer.updateMobilePlayButton(true);
        });

        audio.addEventListener('pause', () => {
            console.log('Audio pause event - updating mobile button to play icon');
            fullscreenPlayerEnhancer.updateMobilePlayButton(false);
        });

        // Initialize mobile play button state
        audio.addEventListener('loadedmetadata', () => {
            console.log('Audio loadedmetadata - initializing mobile button state');
            fullscreenPlayerEnhancer.updateMobilePlayButton(!audio.paused);
        });
    }

    // Initialize audio fixes (consolidated from audio-init-fix.js)
    function initializeAudioFixes() {
        // Ensure audio is not muted and has proper volume
        audio.muted = false;
        audio.volume = 0.8;

        console.log('✅ Audio initialized - Muted:', audio.muted, 'Volume:', audio.volume);

        // Sync volume controls
        const volumeSliders = document.querySelectorAll('#miniVolumeSlider, #fullscreenVolume');
        volumeSliders.forEach(slider => {
            if (slider) {
                slider.value = audio.volume * 100;
                slider.addEventListener('input', (e) => {
                    const volume = e.target.value / 100;
                    audio.volume = volume;
                    audio.muted = false;
                });
            }
        });

        // Unmute on first user interaction
        const unmuteOnInteraction = () => {
            if (audio.muted) {
                audio.muted = false;
                audio.volume = 0.8;
                console.log('🔊 Audio unmuted on user interaction');
            }
        };

        document.addEventListener('click', unmuteOnInteraction, { once: true });
        document.addEventListener('touchstart', unmuteOnInteraction, { once: true, passive: true });
    }

    // Initialize audio fixes
    initializeAudioFixes();
});