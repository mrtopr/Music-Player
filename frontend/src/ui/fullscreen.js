/**
 * Fullscreen player UI updates
 * setInterval leaks fixed — all interval IDs tracked in _waveformIntervals
 */
import { getImageUrl } from '../api/client.js';

let _waveformIntervals = [];

/**
 * Update fullscreen player artwork, title, artist
 * @param {Object} song
 */
export function updateFullscreenPlayer(song) {
    if (!song) return;

    const art = document.getElementById('fullscreenAlbumArt');
    const title = document.getElementById('fullscreenSongTitle');
    const artist = document.getElementById('fullscreenArtist');
    const mobileTitle = document.getElementById('mobileSongTitle');
    const mobileArtist = document.getElementById('mobileArtist');

    const imageUrl = song.coverUrl || getImageUrl(song.image) || 'favicon.ico';

    if (art) { art.src = imageUrl; art.alt = song.displayTitle || ''; }
    if (title) title.textContent = song.displayTitle || song.name || song.title || 'Unknown Title';
    if (artist) artist.textContent = song.displayArtist || song.primaryArtists || song.artist || 'Unknown Artist';
    if (mobileTitle) mobileTitle.textContent = song.displayTitle || song.name || song.title || '';
    if (mobileArtist) mobileArtist.textContent = song.displayArtist || song.primaryArtists || song.artist || '';

    // Update ambient background color from album art
    const fsPlayer = document.getElementById('fullscreenPlayer');
    if (fsPlayer && imageUrl && imageUrl !== 'favicon.ico') {
        fsPlayer.style.setProperty('--bg-image', `url(${imageUrl})`);
    }
}

/**
 * Start/stop waveform animation — FIXED: all interval IDs tracked
 * @param {boolean} isPlaying
 */
export function updateWaveformAnimation(isPlaying) {
    // ALWAYS clear existing intervals first (prevents accumulation / memory leak)
    _waveformIntervals.forEach(id => clearInterval(id));
    _waveformIntervals = [];

    const fsPlayer = document.getElementById('fullscreenPlayer');
    const bars = document.querySelectorAll('.waveform-bar');

    if (isPlaying) {
        fsPlayer?.classList.add('playing');
        bars.forEach((bar, index) => {
            const id = setInterval(() => {
                if (Math.random() > 0.5) bar.classList.toggle('active');
            }, 700 + (index * 80));
            _waveformIntervals.push(id); // ← tracked, not leaked
        });
    } else {
        fsPlayer?.classList.remove('playing');
        bars.forEach(bar => bar.classList.remove('active'));
    }
}

/**
 * Stop all waveform animation and clean up
 */
export function clearWaveformAnimation() {
    _waveformIntervals.forEach(id => clearInterval(id));
    _waveformIntervals = [];
    document.querySelectorAll('.waveform-bar').forEach(bar => bar.classList.remove('active'));
    document.getElementById('fullscreenPlayer')?.classList.remove('playing');
}

/**
 * Initialize fullscreen player event listeners
 */
export function initFullscreen() {
    const fsPlayer = document.getElementById('fullscreenPlayer');
    const closeBtn = document.getElementById('closeFullscreen');
    const closeDesktop = document.getElementById('closeFullscreenDesktop');

    const closeFs = () => {
        fsPlayer?.classList.remove('active');
        document.body.style.overflow = '';
        document.body.classList.remove('fullscreen-active');
        clearWaveformAnimation();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeFs);
    if (closeDesktop) closeDesktop.addEventListener('click', closeFs);

    // Fullscreen progress input seek
    const fsInput = document.getElementById('fullscreenProgressInput');
    if (fsInput) {
        fsInput.addEventListener('input', () => {
            const audio = document.getElementById('audioElement');
            if (audio && audio.duration) {
                audio.currentTime = (fsInput.value / 100) * audio.duration;
            }
        });
    }

    // Fullscreen volume
    const fsVol = document.getElementById('fullscreenVolume');
    const fsMute = document.getElementById('fullscreenMute');
    if (fsVol) {
        fsVol.addEventListener('input', () => {
            const audio = document.getElementById('audioElement');
            if (audio) audio.volume = fsVol.value / 100;
        });
    }
    if (fsMute) {
        fsMute.addEventListener('click', () => {
            const audio = document.getElementById('audioElement');
            if (audio) audio.muted = !audio.muted;
        });
    }
}
