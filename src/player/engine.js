/**
 * Audio engine — playback core
 * Handles: load song, play, pause, seek, volume, queue nav
 * Implements ping-pong dual audio elements for crossfading
 */

import { state } from './state.js';
import { getAudioUrl, getImageUrl, apiFetch, ENDPOINTS } from '../api/client.js';
import { showNotification } from '../ui/notifications.js';
import { updateMiniPlayer } from '../ui/miniPlayer.js';
import { updateFullscreenPlayer } from '../ui/fullscreen.js';
import { renderQueue } from '../ui/queue.js';
import { applyDynamicTheme } from '../ui/theme.js';
import { fetchAndRenderLyrics } from '../features/lyrics.js';
import { initVisualizer } from '../ui/visualizer.js';

let audioA = new Audio();
let audioB = new Audio();
audioA.crossOrigin = 'anonymous';
audioB.crossOrigin = 'anonymous';

let activeAudio = audioA;
let inactiveAudio = audioB;
let crossfadeInterval = null;
const CROSSFADE_DURATION = 2.0; // 2 seconds

/** Get or create the active audio element */
function getAudio() {
    return activeAudio;
}

// ─── Setup Audio Elements ───

function _setupAudioListeners(audio) {
    audio.addEventListener('timeupdate', () => {
        if (audio === activeAudio) _onTimeUpdate();
    });
    audio.addEventListener('ended', () => {
        if (audio === activeAudio) _onEnded();
    });
    audio.addEventListener('playing', () => {
        if (audio === activeAudio) updatePlayButtons(true);
    });
    audio.addEventListener('pause', () => {
        if (audio === activeAudio) updatePlayButtons(false);
    });
    audio.addEventListener('error', (e) => {
        if (audio === activeAudio) {
            console.error('Audio error:', e);
            showNotification('Error loading audio', 'error');
            updatePlayButtons(false);
        }
    });
}

_setupAudioListeners(audioA);
_setupAudioListeners(audioB);

// ─── Audio Init Fix (from js/audio-init-fix.js) ───

export function initAudioEngine() {
    const savedVolume = parseFloat(localStorage.getItem('mehfilVolume') || '0.8');
    activeAudio.volume = Math.min(1, Math.max(0, savedVolume));

    // Handle passive event listener warnings for touch events
    const touchElements = document.querySelectorAll(
        '.progress-bar-container, .fullscreen-progress-bar, input[type="range"]'
    );
    touchElements.forEach(element => {
        element.addEventListener('touchstart', () => { }, { passive: true });
        element.addEventListener('touchmove', () => { }, { passive: true });
    });

    // Sync volume sliders with audio element
    const syncVolumeSliders = () => {
        document.querySelectorAll('#miniVolumeSlider, #fullscreenVolume').forEach(slider => {
            if (slider) {
                slider.value = activeAudio.volume * 100;
                slider.addEventListener('input', (e) => {
                    const vol = e.target.value / 100;
                    activeAudio.volume = vol;
                    activeAudio.muted = false;
                    localStorage.setItem('mehfilVolume', String(vol));
                });
            }
        });
    };
    syncVolumeSliders();

    // Keyboard shortcuts
    document.addEventListener('keydown', _handleKeyboard);

    // Media Session API (Hardware keys)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (activeAudio && details.seekTime !== undefined) {
                activeAudio.currentTime = details.seekTime;
            }
        });
    }
}

// ─── Internal handlers ───

function _onTimeUpdate() {
    const audio = activeAudio;
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
    if (window.sleepTimerAtEndOfTrack) {
        forcePause();
        window.sleepTimerAtEndOfTrack = false;
        import('../ui/notifications.js').then(m => m.showNotification('Sleep timer wrapped at end of track.', 'info'));
        import('../features/sleepTimer.js').then(m => m.clearSleepTimer());
        return;
    }

    if (state.repeatMode === 'one') {
        const audio = activeAudio;
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
 * Load and play a song with Ping-Pong Crossfade
 * @param {Object} song - song object from JioSaavn API
 */
export async function loadSong(song) {
    if (!song) return;

    const audioUrl = getAudioUrl(song.downloadUrl) || getAudioUrl(song.url) || song.audioUrl;
    if (!audioUrl) {
        showNotification('No audio URL available for this song', 'error');
        return;
    }

    const targetVol = parseFloat(localStorage.getItem('mehfilVolume') || '0.8');

    // Crossfade Logic
    if (activeAudio.src && !activeAudio.paused && activeAudio.currentTime > 0.5) {
        // Prepare inactive to become active
        inactiveAudio.src = audioUrl;
        inactiveAudio.load();

        const oldAudio = activeAudio;
        const newAudio = inactiveAudio;
        activeAudio = newAudio; // Swap
        inactiveAudio = oldAudio;

        newAudio.volume = 0;
        newAudio.muted = false;

        try {
            await newAudio.play();
        } catch (err) {
            console.error('Crossfade play error:', err);
            // Fallback directly
            oldAudio.pause();
            newAudio.volume = targetVol;
        }

        const steps = 20;
        const msPerStep = (CROSSFADE_DURATION * 1000) / steps;
        let currentStep = 0;

        clearInterval(crossfadeInterval);
        crossfadeInterval = setInterval(() => {
            currentStep++;
            const pct = currentStep / steps;
            newAudio.volume = Math.min(1, Math.max(0, pct * targetVol));
            oldAudio.volume = Math.min(1, Math.max(0, (1 - pct) * oldAudio.volume));

            if (currentStep >= steps) {
                clearInterval(crossfadeInterval);
                oldAudio.pause();
                oldAudio.currentTime = 0;
            }
        }, msPerStep);

    } else {
        // Direct play without crossfade
        clearInterval(crossfadeInterval);
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio.src = audioUrl;
        activeAudio.volume = targetVol;
        activeAudio.muted = false;
        activeAudio.load();
        try {
            await activeAudio.play();
        } catch (err) {
            console.error('Direct play error:', err);
        }
    }

    // Update UI
    const imageUrl = getImageUrl(song.image) || 'favicon.ico';
    const title = song.name || song.title || 'Unknown Title';
    const artist = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || song.artist || 'Unknown Artist';

    const songData = { ...song, coverUrl: imageUrl, displayTitle: title, displayArtist: artist };
    updateMiniPlayer(songData);
    updateFullscreenPlayer(songData);
    updateActiveCard();
    updateMediaSession(songData);
    updatePlayButtons(true);
    renderQueue();
    applyDynamicTheme(songData);
    fetchAndRenderLyrics(song);

    // Boot up the hardware visualizer on active interaction
    initVisualizer(audioA, audioB);

    showMiniPlayer();
}

function updateMediaSession(songData) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: songData.displayTitle,
            artist: songData.displayArtist,
            album: songData.album || 'Mehfil',
            artwork: [
                { src: songData.coverUrl, sizes: '512x512', type: 'image/jpeg' }
            ]
        });
    }
}

function updateActiveCard() {
    // Remove .playing from all cards
    document.querySelectorAll('.song-card, .artist-card, .album-card, .playlist-card').forEach(c => c.classList.remove('playing'));

    // Add .playing to current song index in trending/releases
    if (state.currentSongIndex !== undefined) {
        // Because data-index maps to the current sequence on the home page
        const activeCard = document.querySelector(`.song-card[data-index="${state.currentSongIndex}"]`);
        if (activeCard) activeCard.classList.add('playing');
    }
}

export function togglePlay() {
    const audio = activeAudio;
    if (!audio || !audio.src) return;

    if (audio.paused) {
        audio.play().then(() => updatePlayButtons(true)).catch(console.error);
    } else {
        audio.pause();
        updatePlayButtons(false);
    }
}

export function seekBy(seconds) {
    const audio = activeAudio;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));
}

export function seekTo(pct) {
    const audio = activeAudio;
    if (!audio || !audio.duration) return;
    audio.currentTime = (pct / 100) * audio.duration;
}

export function adjustVolume(delta) {
    const audio = activeAudio;
    const currentVol = audio.volume;
    const newVol = Math.min(1, Math.max(0, currentVol + delta));
    audio.volume = newVol;
    localStorage.setItem('mehfilVolume', String(newVol));
    if (inactiveAudio) inactiveAudio.volume = 0; // Prevent ghost audio bleeding
}

export function setVolume(vol) {
    const audio = activeAudio;
    const newVol = Math.min(1, Math.max(0, vol));
    audio.volume = newVol;
    localStorage.setItem('mehfilVolume', String(newVol));
}

export function toggleMute() {
    activeAudio.muted = !activeAudio.muted;
}

export function isPlaying() {
    return activeAudio ? !activeAudio.paused : false;
}

export function getCurrentTime() {
    return activeAudio ? activeAudio.currentTime : 0;
}

export function getDuration() {
    return activeAudio ? activeAudio.duration : 0;
}

export async function playNext() {
    if (state.songQueue.length > 0) {
        state.currentQueueIndex++;
        if (state.currentQueueIndex >= state.songQueue.length) {
            state.songQueue = [];
            state.currentQueueIndex = 0;
            return await playFromLibrary();
        } else {
            loadSong(state.songQueue[state.currentQueueIndex]);
            return;
        }
    }
    await playFromLibrary();
}

async function playFromLibrary() {
    if (state.songs.length === 0) return;

    if (state.isShuffleEnabled) {
        state.currentSongIndex = Math.floor(Math.random() * state.songs.length);
    } else if (state.repeatMode === 'all') {
        state.currentSongIndex = (state.currentSongIndex + 1) % state.songs.length;
    } else {
        if (state.currentSongIndex < state.songs.length - 1) {
            state.currentSongIndex++;
        } else {
            // Reached the end. Trigger Song Radio!
            await startSongRadio();
            return;
        }
    }
    loadSong(state.songs[state.currentSongIndex]);
}

async function startSongRadio() {
    try {
        const lastSong = state.songs[state.songs.length - 1];
        if (!lastSong || !lastSong.id) return;

        // Fetch recommendations 
        const res = await apiFetch(`/api/songs/${lastSong.id}/suggestions`, { limit: 10 });
        if (res.success && res.data && res.data.length > 0) {
            showNotification('Starting Song Radio...', 'success');
            const newSongs = res.data;
            state.songs = [...state.songs, ...newSongs];
            state.currentSongIndex++;
            loadSong(state.songs[state.currentSongIndex]);
        } else {
            // Fallback to trending
            const trend = await apiFetch(ENDPOINTS.trendingSongs);
            if (trend.success && trend.data?.results) {
                showNotification('Falling back to Trending Radio...', 'success');
                state.songs = [...state.songs, ...trend.data.results];
                state.currentSongIndex++;
                loadSong(state.songs[state.currentSongIndex]);
            }
        }
    } catch (err) {
        console.error('Radio error', err);
        showNotification('Queue ended', 'info');
    }
}

export function playPrev() {
    const audio = activeAudio;
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

export function forcePause() {
    activeAudio.pause();
    updatePlayButtons(false);
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
    renderQueue();
}

export function clearQueue() {
    state.songQueue = [];
    state.currentQueueIndex = 0;
    renderQueue();
}

export function updatePlayButtons(playing) {
    const iconName = playing ? 'pause' : 'play';
    const iconHtml = `<i data-lucide="${iconName}" class="lucide-icon"></i>`;

    document.querySelectorAll(
        '#miniPlayButton, #fullscreenPlay, #mobilePlayBtn, .play-btn'
    ).forEach(btn => {
        if (btn) btn.innerHTML = iconHtml;
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }

    const fsPlayer = document.getElementById('fullscreenPlayer');
    if (fsPlayer) {
        if (playing) fsPlayer.classList.add('playing');
        else fsPlayer.classList.remove('playing');
    }

    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
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
