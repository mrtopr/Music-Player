/**
 * Recommendation Engine (Mehfil)
 * Generates personalized sections based on listening history, liked songs, and genre preferences.
 */

import { getHistory, getTopArtists, getTopGenres, getPreferredGenres, extractArtistString } from './history.js';
import { apiFetch, ENDPOINTS } from '../api/client.js';
import { getGenreProfile } from './genreProfiles.js';

/**
 * Deduplicates songs across results, filtering already-heard IDs.
 * Falls back to allowing heard songs if filtering produces too few results.
 * @param {Array} candidates
 * @param {Set} exclude
 * @param {number} limit
 * @returns {Array}
 */
function dedupeAndFilter(candidates, exclude = new Set(), limit = 12) {
    if (!Array.isArray(candidates)) return [];
    const seen = new Set(exclude);
    const result = [];

    for (const song of candidates) {
        if (!song) continue;
        const sid = song.id || song._id;
        if (sid && !seen.has(sid)) {
            seen.add(sid);
            result.push(song);
            if (result.length >= limit) break;
        }
    }

    // Fallback: If strict exclusion returned too few, relax history exclusion
    if (result.length < Math.min(limit, 4) && candidates.length > 0) {
        const localSeen = new Set(result.map(s => s.id || s._id));
        for (const song of candidates) {
            if (!song) continue;
            const sid = song.id || song._id;
            if (sid && !localSeen.has(sid)) {
                localSeen.add(sid);
                result.push(song);
                if (result.length >= limit) break;
            }
        }
    }

    return result;
}

/**
 * Fetch songs for a given search query with error handling.
 */
async function fetchSongs(query, limit = 10) {
    if (!query || typeof query !== 'string') return [];
    try {
        const res = await apiFetch('/api/search/songs', { query, language: 'hindi,english', limit });
        return res?.results || (Array.isArray(res) ? res : []);
    } catch {
        return [];
    }
}

/**
 * Generate personalized recommendations based on current song, top artists, or trending songs.
 * Used in home page and AutoMix player engine.
 * @param {number} limit
 * @param {Object} [currentSong] Optional currently playing song context
 */
export async function getRecommendations(limit = 12, currentSong = null) {
    try {
        const history = getHistory();
        const historyIds = new Set(history.map(h => h?.id).filter(Boolean));
        if (currentSong?.id) historyIds.add(currentSong.id);

        const fetches = [];

        // 1. Current song context (highest priority for AutoMix)
        if (currentSong) {
            const currentArtist = extractArtistString(currentSong);
            if (currentArtist && currentArtist !== 'Unknown Artist') {
                fetches.push(fetchSongs(currentArtist.split(',')[0].trim(), 10));
            }
            const genre = currentSong.genre || currentSong.language;
            if (genre) {
                fetches.push(fetchSongs(`${genre} hits`, 10));
            }
        }

        // 2. User top artists
        const topArtists = getTopArtists(3);
        if (topArtists.length > 0) {
            topArtists.forEach(a => fetches.push(fetchSongs(a, 10)));
        }

        // 3. Always fetch trending fallback
        fetches.push(apiFetch(ENDPOINTS.trendingSongs, { language: 'hindi,english' }).then(res => {
            return res?.trending?.songs || res?.songs || res?.results || [];
        }).catch(() => []));

        const results = await Promise.all(fetches);
        const candidates = results.flat().filter(Boolean);

        return dedupeAndFilter(candidates, historyIds, limit);
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
    try {
        const sections = [];
        const history = getHistory();
        const historyIds = new Set(history.map(h => h?.id).filter(Boolean));
        const topArtists = getTopArtists(3);
        const topGenres = getTopGenres(3);
        const preferredGenres = getPreferredGenres();

        // Merge genres: preferred (manual) first, then passive play history
        const allGenres = [...new Set([...preferredGenres, ...topGenres])].slice(0, 3);

        const fetches = [];

        // Artist-based sections ("Because You Love X")
        for (const artist of topArtists.slice(0, 2)) {
            if (artist) fetches.push({ type: 'artist', key: artist });
        }

        // Genre-based sections ("Your [Genre] Mix")
        for (const genre of allGenres.slice(0, 2)) {
            if (genre) {
                const profile = getGenreProfile(genre);
                fetches.push({ type: 'genre', key: genre, profile });
            }
        }

        // Liked song genre radio
        const likedSongs = (() => {
            try {
                return JSON.parse(localStorage.getItem('likedSongs') || '[]');
            } catch { return []; }
        })();

        if (likedSongs.length > 0) {
            const randomLiked = likedSongs[Math.floor(Math.random() * Math.min(likedSongs.length, 5))];
            const likedArtist = extractArtistString(randomLiked);
            if (likedArtist && likedArtist !== 'Unknown Artist') {
                fetches.push({ type: 'liked', key: likedArtist });
            }
        }

        // Execute all fetches concurrently
        const results = await Promise.all(fetches.map(async (f) => {
            let songs = [];
            if (f.type === 'artist') {
                songs = await fetchSongs(f.key, 12);
            } else if (f.type === 'genre') {
                const query = f.profile?.queries?.[0] || (`${f.key} songs`);
                songs = await fetchSongs(query, 12);
            } else if (f.type === 'liked') {
                songs = await fetchSongs(f.key, 12);
            }
            return { ...f, songs: dedupeAndFilter(songs, historyIds, 12) };
        }));

        // Build human-readable sections
        for (const r of results) {
            if (!r.songs.length) continue;
            const keyStr = typeof r.key === 'string' ? r.key : String(r.key);
            if (r.type === 'artist') {
                sections.push({
                    title: `Because You Love ${keyStr.split(',')[0].trim()}`,
                    songs: r.songs,
                    icon: 'user',
                    color: '#10B981'
                });
            } else if (r.type === 'genre') {
                const profile = r.profile || getGenreProfile(r.key);
                sections.push({
                    title: `Your ${r.key} Mix ${profile.emoji || '🎵'}`,
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
    } catch (error) {
        console.error('Mehfil Personalized Sections Error:', error);
        return [];
    }
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
        const historyIds = new Set(getHistory().map(h => h?.id).filter(Boolean));
        const queries = ['indie hindi 2024', 'underrated hindi songs', 'hidden gems bollywood'];
        const results = await Promise.all(queries.map(q => fetchSongs(q, 10)));
        return dedupeAndFilter(results.flat(), historyIds, limit);
    } catch {
        return [];
    }
}
