/**
 * Listening History Utility (Mehfil)
 * Handles client-side persistence of played songs using LocalStorage.
 * Also tracks genre play counts for personalization.
 */

const STORAGE_KEY = 'mehfil_history';
const GENRES_KEY = 'mehfil_genres';
const PREFS_KEY = 'mehfil_preferred_genres';
const MAX_ENTRIES = 50;

/**
 * Add a song to the listening history.
 * If the song already exists, move it to the top.
 * Updates the timestamp each time.
 * @param {Object} song - The song object { id, title, artist, image, ... }
 */
export function addToHistory(song) {
    if (!song) return;

    try {
        const history = getHistory();
        const songId = song.id || song._id;

        // Create a lean but playable entry for the history
        const entry = {
            id: songId,
            title: song.name || song.title || 'Unknown',
            artist: song.primaryArtists || song.artist || 'Unknown Artist',
            image: song.image || 'favicon.ico',
            downloadUrl: song.downloadUrl || null,
            duration: song.duration || 0,
            timestamp: Date.now(),
            genre: song.genre || song.type || ''
        };

        // Deduplication: Remove if already exists
        const filteredHistory = history.filter(item => item.id !== songId);

        // Add to the top
        filteredHistory.unshift(entry);

        // Limit to MAX_ENTRIES
        const trimmedHistory = filteredHistory.slice(0, MAX_ENTRIES);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
        console.error('Mehfil History Error:', error);
        // Fail silently or handle quota exceeded
        if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded. Clearing old history.');
            const halfHistory = getHistory().slice(0, Math.floor(MAX_ENTRIES / 2));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(halfHistory));
        }
    }
}

/**
 * Retrieve the full listening history.
 * @returns {Array} Array of history entries.
 */
export function getHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.warn('Failed to parse history from localStorage:', e);
        return [];
    }
}

/**
 * Retrieve the last N unique songs for the "Recently Played" section.
 * @param {number} limit - Number of songs to return.
 * @returns {Array}
 */
export function getRecentlyPlayed(limit = 10) {
    return getHistory().slice(0, limit);
}

/**
 * Analyze history to find top played artists.
 * Used for heuristic-based recommendations.
 * @param {number} limit - Number of top artists to identify.
 * @returns {Array} Array of artist names.
 */
export function getTopArtists(limit = 3) {
    const history = getHistory();
    const artistCounts = {};

    history.forEach(item => {
        const artists = item.artist.split(',').map(a => a.trim());
        artists.forEach(artist => {
            if (artist === 'Unknown Artist') return;
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });
    });

    return Object.entries(artistCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([artist]) => artist);
}

/**
 * Clear the history (Migration utility).
 */
export function clearLegacyHistory() {
    localStorage.removeItem('mehfilPlayHistory'); // Clear the old key if exists
}

/**
 * Increment the play count for a given genre.
 * @param {string} genre
 */
export function addGenrePlay(genre) {
    if (!genre) return;
    try {
        const genres = getGenreCounts();
        genres[genre] = (genres[genre] || 0) + 1;
        localStorage.setItem(GENRES_KEY, JSON.stringify(genres));
    } catch (e) {
        console.warn('Failed to save genre play:', e);
    }
}

/**
 * Get genre play count map from localStorage.
 * @returns {Object} Map of genre -> count
 */
export function getGenreCounts() {
    try {
        const raw = localStorage.getItem(GENRES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

/**
 * Get top genres sorted by play frequency.
 * @param {number} limit
 * @returns {string[]}
 */
export function getTopGenres(limit = 3) {
    const counts = getGenreCounts();
    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([genre]) => genre);
}

/**
 * Save user's manually selected genre preferences (onboarding).
 * @param {string[]} genres
 */
export function savePreferredGenres(genres) {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(genres));
    } catch (e) {
        console.warn('Failed to save genre preferences:', e);
    }
}

/**
 * Get user's manually selected genre preferences.
 * @returns {string[]}
 */
export function getPreferredGenres() {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Build a user profile summary for personalization.
 * Combines manual preferences + play history signals.
 * @returns {{ topArtists: string[], topGenres: string[], preferredGenres: string[], isNewUser: boolean }}
 */
export function getUserProfile() {
    const history = getHistory();
    const topArtists = getTopArtists(5);
    const topGenres = getTopGenres(3);
    const preferredGenres = getPreferredGenres();
    const isNewUser = history.length === 0 && preferredGenres.length === 0;
    return { topArtists, topGenres, preferredGenres, isNewUser };
}
