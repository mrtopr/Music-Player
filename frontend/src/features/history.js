/**
 * Play history tracking
 */
import { state } from '../player/state.js';

const STORAGE_KEY = 'mehfilPlayHistory';
const MAX_HISTORY = 50;

export function loadHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        state.musicHistory = { lastPlayed: null, playHistory: [], suggestions: [], ...saved };
    } catch {
        state.musicHistory = { lastPlayed: null, playHistory: [], suggestions: [] };
    }
}

export function saveHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.musicHistory));
    } catch (e) {
        console.warn('Failed to save history:', e);
    }
}

/**
 * Record a song play
 * @param {Object} song
 */
export function recordPlay(song) {
    if (!song) return;
    const id = song.id || song._id;

    state.musicHistory.lastPlayed = { song, timestamp: Date.now() };

    const existing = state.musicHistory.playHistory.find(e => (e.song.id || e.song._id) === id);
    if (existing) {
        existing.playCount++;
        existing.lastPlayed = Date.now();
    } else {
        state.musicHistory.playHistory.unshift({ song, playCount: 1, lastPlayed: Date.now() });
        if (state.musicHistory.playHistory.length > MAX_HISTORY) {
            state.musicHistory.playHistory = state.musicHistory.playHistory.slice(0, MAX_HISTORY);
        }
    }

    saveHistory();
}

/** Get recently played songs */
export function getRecentlyPlayed(limit = 20) {
    return state.musicHistory.playHistory.slice(0, limit).map(e => e.song);
}
