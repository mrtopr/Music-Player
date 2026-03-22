/**
 * Liked songs (favorites) persistence and management
 */
import { state } from '../player/state.js';
import { showNotification } from '../ui/notifications.js';

const STORAGE_KEY = 'mehfilLikedSongs';

/** Load liked songs from localStorage */
export function loadLikedSongs() {
    try {
        state.likedSongs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        state.likedSongs = [];
    }
}

/** Save liked songs to localStorage */
export function saveLikedSongs() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.likedSongs));
    } catch (e) {
        console.warn('Failed to save liked songs:', e);
    }
}

/**
 * Toggle like status of a song
 * @param {Object} song
 * @returns {boolean} true if now liked
 */
export function toggleLike(song) {
    const id = song.id || song._id;
    const idx = state.likedSongs.findIndex(s => (s.id || s._id) === id);

    if (idx > -1) {
        state.likedSongs.splice(idx, 1);
        saveLikedSongs();
        showNotification(`Removed "${song.name || song.title}" from liked songs`, 'info');
        return false;
    } else {
        state.likedSongs.unshift(song);
        saveLikedSongs();
        showNotification(`Added "${song.name || song.title}" to liked songs ♥`, 'success');
        return true;
    }
}

/**
 * Check if song is liked
 * @param {Object|string} songOrId
 * @returns {boolean}
 */
export function isLiked(songOrId) {
    const id = typeof songOrId === 'string' ? songOrId : (songOrId?.id || songOrId?._id);
    return state.likedSongs.some(s => (s.id || s._id) === id);
}

/** Load all user data (liked + playlists) */
export function loadUserData() {
    loadLikedSongs();
    try {
        state.userPlaylists = JSON.parse(localStorage.getItem('mehfilUserPlaylists') || '[]');
    } catch {
        state.userPlaylists = [];
    }
}

// Expose for legacy compatibility
window.toggleLikeSong = toggleLike;
window.isLiked = isLiked;
