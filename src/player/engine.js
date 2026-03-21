/**
 * Audio engine — playback core
 * Handles: load song, play, pause, seek, volume, queue nav
 * Audio init fix integrated from js/audio-init-fix.js (was excluded from index.html)
 */

import { state } from './state.js';
import { getAudioUrl, getImageUrl } from '../api/client.js';
import { showNotification } from '../ui/notifications.js';
import { updateMiniPlayer } from '../ui/miniPlayer.js';
import { updateFullscreenPlayer } from '../ui/fullscreen.js';

let _audio = null;

/** Get or create the audio element */
function getAudio() {
    if (!_audio) _audio = document.getElementById('audioElement');
    return _audio;
}

// ─── Audio Init Fix (from js/audio-init-fix.js — was previously excluded from index.html) ───

/**
 * Initialize audio element: set volume, attach touch event fixes,
 * sync volume controls, auto-unmute on first user interaction.
 */
export function initAudioEngine() {
    const audio = getAudio();
    if (!audio) return;

    // Fix 1: Ensure audio is not muted and has proper volume
    audio.muted = false;
    const savedVolume = parseFloat(localStorage.getItem('mehfilVolume') || '0.8');
    audio.volume = Math.min(1, Math.max(0, savedVolume));

    console.log('✅ Audio initialized - Muted:', audio.muted, 'Volume:', audio.volume);

    // Fix 2: Handle passive event listener warnings for touch events
    const touchElements = document.querySelectorAll(
        '.progress-bar-container, .fullscreen-progress-bar, input[type="range"]'
    );
    touchElements.forEach(element => {
        element.addEventListener('touchstart', () => { }, { passive: true });
        element.addEventListener('touchmove', () => { }, { passive: true });
    });

    // Fix 3: Sync volume sliders with audio element
    const syncVolumeSliders = () => {
        document.querySelectorAll('#miniVolumeSlider, #fullscreenVolume').forEach(slider => {
            if (slider) {
                slider.value = audio.volume * 100;
                slider.addEventListener('input', (e) => {
                    const vol = e.target.value / 100;
                    audio.volume = vol;
                    audio.muted = false;
                    localStorage.setItem('mehfilVolume', String(vol));
                });
            }
        });
    };
    syncVolumeSliders();

    // Fix 4: Unmute on first user interaction (browser autoplay policy)
    const unmuteOnInteraction = () => {
        if (audio.muted) {
            audio.muted = false;
            audio.volume = 0.8;
        }
    };
    document.addEventListener('click', unmuteOnInteraction, { once: true });
    document.addEventListener('touchstart', unmuteOnInteraction, { once: true, passive: true });

    // ─── Core audio event listeners ───
    audio.addEventListener('timeupdate', _onTimeUpdate);
    audio.addEventListener('ended', _onEnded);
    audio.addEventListener('playing', () => updatePlayButtons(true));
    audio.addEventListener('pause', () => updatePlayButtons(false));
    audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        showNotification('Error loading audio', 'error');
        updatePlayButtons(false);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', _handleKeyboard);
}

// ─── Internal handlers ───

function _onTimeUpdate() {
    const audio = getAudio();
    if (!audio || !audio.duration) return;

    const pct = (audio.currentTime / audio.duration) * 100;

    // Update mini player progress
    const miniBar = document.getElementById('miniProgressBar');
    const miniInput = document.getElementById('miniProgressInput');
    if (miniBar) miniBar.style.width = `${pct}%`;
    if (miniInput) miniInput.value = pct;

    // Update fullscreen progress
    const fsBar = document.getElementById('fullscreenProgress');
    const fsInput = document.getElementById('fullscreenProgressInput');
    if (fsBar) fsBar.style.width = `${pct}%`;
    if (fsInput) fsInput.value = pct;

    // Update time displays
    const t = formatTime(audio.currentTime);
    const d = formatTime(audio.duration);
    document.querySelectorAll('#currentTime, #fullscreenCurrentTime, #mobileCurrentTime').forEach(el => {
        if (el) el.textContent = t;
    });
    document.querySelectorAll('#duration, #fullscreenDuration, #mobileDuration').forEach(el => {
        if (el) el.textContent = d;
    });
}

function _onEnded() {
    updatePlayButtons(false);
    if (state.repeatMode === 'one') {
        const audio = getAudio();
        audio.currentTime = 0;
        audio.play().catch(console.error);
        return;
    }
    playNext();
}

function _handleKeyboard(e) {
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowRight':
            if (e.altKey) { e.preventDefault(); playNext(); }
            else { e.preventDefault(); seekBy(10); }
            break;
        case 'ArrowLeft':
            if (e.altKey) { e.preventDefault(); playPrev(); }
            else { e.preventDefault(); seekBy(-10); }
            break;
        case 'ArrowUp':
            e.preventDefault();
            adjustVolume(0.1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            adjustVolume(-0.1);
            break;
    }
}

// ─── Public API ───

export function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Load and play a song
 * @param {Object} song - song object from JioSaavn API
 */
export async function loadSong(song) {
    if (!song) return;

    const audio = getAudio();
    if (!audio) return;

    // Get best audio URL
    const audioUrl = getAudioUrl(song.downloadUrl) || getAudioUrl(song.url) || song.audioUrl;
    if (!audioUrl) {
        showNotification('No audio URL available for this song', 'error');
        return;
    }

    // Pause + reset
    audio.pause();
    audio.currentTime = 0;
    audio.src = audioUrl;
    audio.load();

    // Update UI
    const imageUrl = getImageUrl(song.image) || 'favicon.ico';
    const title = song.name || song.title || 'Unknown Title';
    const artist = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || song.artist || 'Unknown Artist';

    const songData = { ...song, coverUrl: imageUrl, displayTitle: title, displayArtist: artist };
    updateMiniPlayer(songData);
    updateFullscreenPlayer(songData);

    // Play
    try {
        await audio.play();
        updatePlayButtons(true);
        showMiniPlayer();
    } catch (err) {
        console.error('Playback error:', err);
        showNotification('Error playing audio', 'error');
        updatePlayButtons(false);
    }
}

export function togglePlay() {
    const audio = getAudio();
    if (!audio) return;
    if (!audio.src) return;

    if (audio.paused) {
        audio.play().then(() => updatePlayButtons(true)).catch(console.error);
    } else {
        audio.pause();
        updatePlayButtons(false);
    }
}

export function seekBy(seconds) {
    const audio = getAudio();
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));
}

export function seekTo(pct) {
    const audio = getAudio();
    if (!audio || !audio.duration) return;
    audio.currentTime = (pct / 100) * audio.duration;
}

export function adjustVolume(delta) {
    const audio = getAudio();
    if (!audio) return;
    audio.volume = Math.min(1, Math.max(0, audio.volume + delta));
    localStorage.setItem('mehfilVolume', String(audio.volume));
}

export function setVolume(vol) {
    const audio = getAudio();
    if (!audio) return;
    audio.volume = Math.min(1, Math.max(0, vol));
    localStorage.setItem('mehfilVolume', String(audio.volume));
}

export function toggleMute() {
    const audio = getAudio();
    if (!audio) return;
    audio.muted = !audio.muted;
}

export function isPlaying() {
    const audio = getAudio();
    return audio ? !audio.paused : false;
}

export function getCurrentTime() {
    const audio = getAudio();
    return audio ? audio.currentTime : 0;
}

export function getDuration() {
    const audio = getAudio();
    return audio ? audio.duration : 0;
}

export function playNext() {
    if (state.songQueue.length > 0) {
        state.currentQueueIndex = (state.currentQueueIndex + 1) % state.songQueue.length;
        loadSong(state.songQueue[state.currentQueueIndex]);
        return;
    }
    if (state.songs.length === 0) return;

    if (state.isShuffleEnabled) {
        state.currentSongIndex = Math.floor(Math.random() * state.songs.length);
    } else if (state.repeatMode === 'all') {
        state.currentSongIndex = (state.currentSongIndex + 1) % state.songs.length;
    } else {
        if (state.currentSongIndex < state.songs.length - 1) {
            state.currentSongIndex++;
        } else return;
    }
    loadSong(state.songs[state.currentSongIndex]);
}

export function playPrev() {
    const audio = getAudio();
    // If > 3 seconds in, restart current song
    if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    if (state.songQueue.length > 0) {
        state.currentQueueIndex = Math.max(0, state.currentQueueIndex - 1);
        loadSong(state.songQueue[state.currentQueueIndex]);
        return;
    }
    if (state.songs.length === 0) return;
    state.currentSongIndex = Math.max(0, state.currentSongIndex - 1);
    loadSong(state.songs[state.currentSongIndex]);
}

export function toggleShuffle() {
    state.isShuffleEnabled = !state.isShuffleEnabled;
    return state.isShuffleEnabled;
}

export function cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    const idx = modes.indexOf(state.repeatMode);
    state.repeatMode = modes[(idx + 1) % modes.length];
    return state.repeatMode;
}

export function addToQueue(song) {
    state.songQueue.push(song);
}

export function clearQueue() {
    state.songQueue = [];
    state.currentQueueIndex = 0;
}

export function updatePlayButtons(playing) {
    const playIcon = '<i class="bi bi-play-fill"></i>';
    const pauseIcon = '<i class="bi bi-pause-fill"></i>';
    const icon = playing ? pauseIcon : playIcon;

    document.querySelectorAll(
        '#miniPlayButton, #fullscreenPlay, #mobilePlayBtn'
    ).forEach(btn => {
        if (btn) btn.innerHTML = icon;
    });
}

export function showMiniPlayer() {
    const mini = document.getElementById('miniPlayer');
    if (mini) mini.classList.add('show');
}

export function hideMiniPlayer() {
    const mini = document.getElementById('miniPlayer');
    if (mini) mini.classList.remove('show');
}

// Expose key functions on window for legacy code compatibility during migration
window.playNextSong = playNext;
window.playPreviousSong = playPrev;
window.nextSong = playNext;
window.prevSong = playPrev;
window.togglePlay = togglePlay;
