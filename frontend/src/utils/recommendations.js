/**
 * Recommendation Engine (Mehfil)
 * Generates personalized sections based on listening history, liked songs, and genre preferences.
 */

import { getHistory, getTopArtists, getTopGenres, getPreferredGenres } from './history.js';
import { apiFetch, ENDPOINTS } from '../api/client.js';
import { getGenreProfile } from './genreProfiles.js';

/**
 * Deduplicates songs across results, filtering already-heard IDs.
 * @param {Array} candidates
 * @param {Set} exclude
 * @param {number} limit
 * @returns {Array}
 */
function dedupeAndFilter(candidates, exclude = new Set(), limit = 12) {
    const seen = new Set(exclude);
    const result = [];
    for (const song of candidates) {
        const sid = song.id || song._id;
        if (sid && !seen.has(sid)) {
            seen.add(sid);
            result.push(song);
            if (result.length >= limit) break;
        }
    }
    return result;
}

/**
 * Fetch songs for a given search query with error handling.
 */
async function fetchSongs(query, limit = 10) {
    try {
        const res = await apiFetch('/api/search/songs', { query, language: 'hindi,english', limit });
        return res?.results || [];
    } catch {
        return [];
    }
}

/**
 * Generate the main "Made For You" recommendations based on top artists.
 * Used in home page for casual personalization.
 */
export async function getRecommendations(limit = 12) {
    try {
        const topArtists = getTopArtists(3);
        const history = getHistory();
        const historyIds = new Set(history.map(h => h.id));

        if (topArtists.length === 0) {
            // Default recommendations for new users
            const res = await apiFetch(ENDPOINTS.trendingSongs, { language: 'hindi,english' });
            // modules API returns { trending: { songs: [...] }, ... }
            const trendSongs = res?.trending?.songs || res?.songs || res?.results || [];
            return trendSongs.slice(0, limit);
        }

        const results = await Promise.all(topArtists.map(a => fetchSongs(a, 10)));
        const all = results.flat();
        return dedupeAndFilter(all, historyIds, limit);
    } catch (error) {
        console.error('Mehfil Recommendation Error:', error);
        return [];
    }
}

/**
 * Generate personalized homepage sections dynamically.
 * Returns an array of section objects ready to render.
 */
export async function getPersonalizedSections() {
    const sections = [];
    const history = getHistory();
    const historyIds = new Set(history.map(h => h.id));
    const topArtists = getTopArtists(3);
    const topGenres = getTopGenres(3);
    const preferredGenres = getPreferredGenres();

    // Merge genres: preferred (manual) first, then passive play history
    const allGenres = [...new Set([...preferredGenres, ...topGenres])].slice(0, 3);

    const fetches = [];

    // Artist-based sections ("Because You Love X")
    for (const artist of topArtists.slice(0, 2)) {
        fetches.push({ type: 'artist', key: artist });
    }

    // Genre-based sections ("Your [Genre] Mix")
    for (const genre of allGenres.slice(0, 2)) {
        const profile = getGenreProfile(genre);
        fetches.push({ type: 'genre', key: genre, profile });
    }

    // Liked song genre radio
    const likedSongs = (() => {
        try {
            return JSON.parse(localStorage.getItem('mehfilLikedSongs') || '[]');
        } catch { return []; }
    })();

    if (likedSongs.length > 0) {
        // Pick a random liked song's artist for variety
        const randomLiked = likedSongs[Math.floor(Math.random() * Math.min(likedSongs.length, 5))];
        const likedArtist = randomLiked?.primaryArtists || randomLiked?.artist;
        if (likedArtist) {
            fetches.push({ type: 'liked', key: likedArtist });
        }
    }

    // Execute all fetches concurrently
    const results = await Promise.all(fetches.map(async (f) => {
        let songs = [];
        if (f.type === 'artist') {
            songs = await fetchSongs(f.key, 12);
        } else if (f.type === 'genre') {
            const query = f.profile?.queries?.[0] || (f.key + ' songs');
            songs = await fetchSongs(query, 12);
        } else if (f.type === 'liked') {
            songs = await fetchSongs(f.key, 12);
        }
        return { ...f, songs: dedupeAndFilter(songs, historyIds, 12) };
    }));

    // Build human-readable sections
    for (const r of results) {
        if (!r.songs.length) continue;
        if (r.type === 'artist') {
            sections.push({
                title: `Because You Love ${r.key.split(',')[0].trim()}`,
                songs: r.songs,
                icon: 'user',
                color: '#C6A15B'
            });
        } else if (r.type === 'genre') {
            const profile = r.profile || getGenreProfile(r.key);
            sections.push({
                title: `Your ${r.key} Mix ${profile.emoji}`,
                songs: r.songs,
                icon: 'genre',
                color: profile.color,
                gradient: profile.gradient
            });
        } else if (r.type === 'liked') {
            sections.push({
                title: `Liked Songs Radio 💛`,
                songs: r.songs,
                icon: 'heart',
                color: '#FFB800'
            });
        }
    }

    return sections;
}

/**
 * Get songs for a specific genre query (used by genre onboarding preview).
 */
export async function getGenreSongs(genre, limit = 12) {
    const profile = getGenreProfile(genre);
    const query = profile.queries?.[0] || genre;
    return fetchSongs(query, limit);
}

/**
 * Get "Discover" songs — low overlap with user history.
 */
export async function getDiscoverSongs(limit = 10) {
    try {
        const historyIds = new Set(getHistory().map(h => h.id));
        const queries = ['indie hindi 2024', 'underrated hindi songs', 'hidden gems bollywood'];
        const results = await Promise.all(queries.map(q => fetchSongs(q, 10)));
        return dedupeAndFilter(results.flat(), historyIds, limit);
    } catch {
        return [];
    }
}
