/**
 * Mini player UI updates
 */
import { getImageUrl } from '../api/client.js';

/**
 * Update mini player artwork, title, artist
 * @param {Object} song - enriched song with displayTitle, displayArtist, coverUrl
 */
export function updateMiniPlayer(song) {
    if (!song) return;

    const img = document.getElementById('miniPlayerImage');
    const title = document.getElementById('miniPlayerTitle');
    const artist = document.getElementById('miniPlayerArtist');

    const imageUrl = song.coverUrl || getImageUrl(song.image) || 'favicon.ico';

    if (img) {
        img.src = imageUrl;
        img.alt = song.displayTitle || song.name || 'Album Art';
    }
    if (title) title.textContent = song.displayTitle || song.name || song.title || 'Unknown Title';
    if (artist) artist.textContent = song.displayArtist || song.primaryArtists || song.artist || 'Unknown Artist';
}

/**
 * Show the mini player bar
 */
export function showMiniPlayerBar() {
    const mini = document.getElementById('miniPlayer');
    if (mini) mini.classList.add('show');
}

/**
 * Hide the mini player bar
 */
export function hideMiniPlayerBar() {
    const mini = document.getElementById('miniPlayer');
    if (mini) mini.classList.remove('show');
}

/**
 * Initialize mini player event listeners
 */
export function initMiniPlayer() {
    const expandBtn = document.getElementById('expandPlayer');
    const fsPlayer = document.getElementById('fullscreenPlayer');

    if (expandBtn && fsPlayer) {
        expandBtn.addEventListener('click', () => {
            fsPlayer.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // Progress input seek
    const miniInput = document.getElementById('miniProgressInput');
    if (miniInput) {
        miniInput.addEventListener('input', () => {
            const audio = document.getElementById('audioElement');
            if (audio && audio.duration) {
                audio.currentTime = (miniInput.value / 100) * audio.duration;
            }
        });
    }

    // Volume slider
    const miniVol = document.getElementById('miniVolumeSlider');
    const miniVolBtn = document.getElementById('miniVolumeButton');
    if (miniVol) {
        miniVol.addEventListener('input', () => {
            const audio = document.getElementById('audioElement');
            if (audio) audio.volume = miniVol.value / 100;
        });
    }
    if (miniVolBtn) {
        miniVolBtn.addEventListener('click', () => {
            const audio = document.getElementById('audioElement');
            if (!audio) return;
            audio.muted = !audio.muted;
        });
    }
}
