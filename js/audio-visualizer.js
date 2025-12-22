// Audio Visualizer Controller
document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audioElement');
    const fullscreenPlayer = document.getElementById('fullscreenPlayer');
    
    if (!audio || !fullscreenPlayer) return;
    
    class AudioVisualizer {
        constructor() {
            this.isActive = false;
            this.isPlaying = false;
            this.audioContext = null;
            this.analyser = null;
            this.dataArray = null;
            this.animationId = null;
            this.particles = [];
            this.maxParticles = 20;
            
            this.init();
        }
        
        init() {
            this.setupElements();
            this.setupEventListeners();
            this.createParticles();
        }
        
        setupElements() {
            this.progressRing = document.querySelector('.visualizer-progress-ring');
            this.bars = document.querySelectorAll('.visualizer-bar');
            this.dots = document.querySelectorAll('.visualizer-dot');
            this.artwork = document.querySelector('.visualizer-artwork');
            this.timeDisplay = document.getElementById('visualizerCurrentTime');
            this.particlesContainer = document.getElementById('visualizerParticles');
        }
        
        setupEventListeners() {
            // Audio events
            audio.addEventListener('play', () => this.start());
            audio.addEventListener('pause', () => this.pause());
            audio.addEventListener('timeupdate', () => this.updateProgress());
            
            // Fullscreen events
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const isActive = fullscreenPlayer.classList.contains('active');
                        if (isActive && !this.isActive) {
                            this.activate();
                        } else if (!isActive && this.isActive) {
                            this.deactivate();
                        }
                    }
                });
            });
            
            observer.observe(fullscreenPlayer, { attributes: true });
        }
        
        createAudioContext() {
            try {
                if (this.audioContext) return;
                
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                
                // Connect to audio source - but don't disconnect existing connections
                if (!this.source && !audio.crossOrigin) {
                    try {
                        this.source = this.audioContext.createMediaElementSource(audio);
                        this.source.connect(this.analyser);
                        this.analyser.connect(this.audioContext.destination);
                    } catch (error) {
                        console.warn('Could not connect audio source:', error);
                        // Don't create audio context if it breaks audio
                        this.audioContext = null;
                        this.analyser = null;
                    }
                }
            } catch (error) {
                console.warn('Could not create audio context:', error);
                // Disable audio context to prevent audio issues
                this.audioContext = null;
                this.analyser = null;
            }
        }
        
        activate() {
            this.isActive = true;
            // Don't create audio context by default to prevent audio issues
            // this.createAudioContext();
            if (this.isPlaying) {
                this.startAnimation();
            }
        }
        
        deactivate() {
            this.isActive = false;
            this.stopAnimation();
        }
        
        start() {
            this.isPlaying = true;
            fullscreenPlayer.classList.add('playing');
            
            if (this.isActive) {
                this.startAnimation();
            }
            
            // Resume audio context if suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }
        
        pause() {
            this.isPlaying = false;
            fullscreenPlayer.classList.remove('playing');
            this.stopAnimation();
        }
        
        startAnimation() {
            if (this.animationId) return;
            
            const animate = () => {
                if (!this.isActive || !this.isPlaying) return;
                
                this.updateBars();
                this.updateParticles();
                this.animationId = requestAnimationFrame(animate);
            };
            
            animate();
        }
        
        stopAnimation() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }
        
        updateBars() {
            if (!this.analyser || !this.dataArray) {
                // Enhanced fallback animation without audio analysis
                this.bars.forEach((bar, index) => {
                    const time = Date.now() * 0.005;
                    const baseIntensity = Math.sin(time + index * 0.3) * 0.5 + 0.5;
                    const randomFactor = Math.sin(time * 2 + index * 0.8) * 0.3 + 0.7;
                    const intensity = baseIntensity * randomFactor;
                    const height = 20 + intensity * 45;
                    
                    bar.style.setProperty('--bar-height', `${height}px`);
                    bar.style.height = `${height}px`;
                    
                    // Dynamic color based on position and intensity
                    const hue = (200 + index * 8 + time * 20) % 360;
                    const saturation = 80 + intensity * 20;
                    const lightness = 50 + intensity * 20;
                    bar.style.background = `linear-gradient(to top, hsl(${hue}, ${saturation}%, ${lightness}%), hsl(${hue + 40}, ${saturation}%, ${lightness + 10}%))`;
                });
                return;
            }
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            this.bars.forEach((bar, index) => {
                const dataIndex = Math.floor(index * this.dataArray.length / this.bars.length);
                const intensity = this.dataArray[dataIndex] / 255;
                const height = 15 + intensity * 55;
                
                bar.style.setProperty('--bar-height', `${height}px`);
                bar.style.height = `${height}px`;
                
                // Enhanced color based on intensity and frequency
                const hue = 180 + intensity * 120 + index * 4; // Blue to purple to pink
                const saturation = 90 + intensity * 10;
                const lightness = 50 + intensity * 25;
                bar.style.background = `linear-gradient(to top, hsl(${hue}, ${saturation}%, ${lightness}%), hsl(${hue + 30}, ${saturation}%, ${lightness + 15}%))`;
                bar.style.boxShadow = `0 0 ${5 + intensity * 15}px hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
            });
        }
        
        updateProgress() {
            if (!audio.duration) return;
            
            const progress = (audio.currentTime / audio.duration) * 360;
            if (this.progressRing) {
                this.progressRing.style.setProperty('--progress-angle', `${progress}deg`);
            }
            
            // Update time display
            if (this.timeDisplay) {
                this.timeDisplay.textContent = this.formatTime(audio.currentTime);
            }
        }
        
        createParticles() {
            if (!this.particlesContainer) return;
            
            for (let i = 0; i < this.maxParticles; i++) {
                const particle = document.createElement('div');
                particle.className = 'visualizer-particle';
                this.particlesContainer.appendChild(particle);
                this.particles.push({
                    element: particle,
                    x: Math.random() * 320, // Adjusted for smaller size
                    y: 320, // Adjusted for smaller size
                    speed: Math.random() * 2 + 1,
                    delay: Math.random() * 4000
                });
            }
        }
        
        updateParticles() {
            if (!this.isPlaying) return;
            
            this.particles.forEach((particle, index) => {
                const time = Date.now();
                const delay = particle.delay;
                
                if (time % 5000 < delay) return;
                
                const progress = ((time - delay) % 5000) / 5000;
                const y = 320 - (progress * 480); // Adjusted for smaller size
                const x = particle.x + Math.sin(progress * Math.PI * 3) * 25;
                
                particle.element.style.left = `${x}px`;
                particle.element.style.top = `${y}px`;
                
                // Enhanced opacity curve
                let opacity;
                if (progress < 0.1) {
                    opacity = progress * 10;
                } else if (progress > 0.85) {
                    opacity = (1 - progress) * 6.67;
                } else {
                    opacity = 0.8 + Math.sin(progress * Math.PI * 4) * 0.2;
                }
                
                particle.element.style.opacity = Math.max(0, Math.min(1, opacity));
                
                // Dynamic color and size
                const hue = (time * 0.1 + index * 40) % 360;
                const intensity = 0.6 + Math.sin(progress * Math.PI * 2) * 0.4;
                const size = 2 + intensity * 2;
                
                particle.element.style.background = `radial-gradient(circle, hsla(${hue}, 90%, 65%, ${intensity}), transparent)`;
                particle.element.style.width = `${size}px`;
                particle.element.style.height = `${size}px`;
                particle.element.style.boxShadow = `0 0 ${size * 2}px hsla(${hue}, 90%, 65%, ${intensity * 0.5})`;
            });
        }
        
        updateArtwork(imageUrl) {
            if (this.artwork && imageUrl) {
                this.artwork.src = imageUrl;
            }
        }
        
        formatTime(seconds) {
            if (isNaN(seconds) || seconds < 0) return '0:00';
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        }
        
        // Public methods for external control
        setBarsIntensity(intensities) {
            if (!Array.isArray(intensities)) return;
            
            this.bars.forEach((bar, index) => {
                if (intensities[index] !== undefined) {
                    const height = 15 + intensities[index] * 50;
                    bar.style.height = `${height}px`;
                }
            });
        }
        
        setProgress(progress) {
            if (this.progressRing) {
                this.progressRing.style.setProperty('--progress-angle', `${progress * 360}deg`);
            }
        }
        
        destroy() {
            this.stopAnimation();
            if (this.audioContext) {
                this.audioContext.close();
            }
        }
    }
    
    // Initialize visualizer
    const visualizer = new AudioVisualizer();
    
    // Make it globally available
    window.audioVisualizer = visualizer;
    
    // Hook into existing player updates
    const originalUpdatePlayerUI = window.updatePlayerUI;
    if (originalUpdatePlayerUI) {
        window.updatePlayerUI = function(song) {
            try {
                originalUpdatePlayerUI(song);
                if (song && song.image) {
                    visualizer.updateArtwork(song.image);
                }
            } catch (error) {
                console.error('Error in updatePlayerUI:', error);
            }
        };
    }
    
    // Add keyboard shortcut to toggle visualizer
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyV' && e.ctrlKey && visualizer.isActive) {
            e.preventDefault();
            const container = document.querySelector('.audio-visualizer');
            if (container) {
                container.style.display = container.style.display === 'none' ? 'flex' : 'none';
            }
        }
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        visualizer.destroy();
    });
});