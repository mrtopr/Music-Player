/**
 * User playlists management
 */
import { state } from '../player/state.js';
import { showNotification } from '../ui/notifications.js';

const STORAGE_KEY = 'mehfilUserPlaylists';

export function loadPlaylists() {
    try {
        state.userPlaylists = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        state.userPlaylists = [];
    }
}

export function savePlaylists() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.userPlaylists));
    } catch (e) {
        console.warn('Failed to save playlists:', e);
    }
}

export function createPlaylist(name) {
    const playlist = {
        id: `pl_${Date.now()}`,
        name,
        songs: [],
        createdAt: new Date().toISOString()
    };
    state.userPlaylists.unshift(playlist);
    savePlaylists();
    showNotification(`Playlist "${name}" created`, 'success');
    return playlist;
}

export function addSongToPlaylist(playlistId, song) {
    const pl = state.userPlaylists.find(p => p.id === playlistId);
    if (!pl) return false;
    const exists = pl.songs.some(s => (s.id || s._id) === (song.id || song._id));
    if (exists) {
        showNotification('Song already in playlist', 'info');
        return false;
    }
    pl.songs.push(song);
    savePlaylists();
    showNotification(`Added to "${pl.name}"`, 'success');
    return true;
}

export function removeSongFromPlaylist(playlistId, songId) {
    const pl = state.userPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    pl.songs = pl.songs.filter(s => (s.id || s._id) !== songId);
    savePlaylists();
}

export function deletePlaylist(playlistId) {
    state.userPlaylists = state.userPlaylists.filter(p => p.id !== playlistId);
    savePlaylists();
}
