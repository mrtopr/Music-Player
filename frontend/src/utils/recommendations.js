/**
 * Recommendation Engine (Mehfil)
 * Heuristic-based suggestions based on listening history.
 */

import { getHistory, getTopArtists } from './history.js';
import { apiFetch, ENDPOINTS } from '../api/client.js';

/**
 * Generate a list of recommended songs based on the user's taste.
 * @param {number} limit - Maximum number of recommendations to return.
 * @returns {Promise<Array>} List of song objects.
 */
export async function getRecommendations(limit = 12) {
    try {
        const topArtists = getTopArtists(3);
        const history = getHistory();
        const historyIds = new Set(history.map(h => h.id));

        if (topArtists.length === 0) {
            // Default recommendations for new users (Trending)
            const res = await apiFetch(ENDPOINTS.trendingSongs);
            const trendSongs = res?.songs || res?.results || res?.data?.results || [];
            return trendSongs.slice(0, limit);
        }

        // Fetch songs for each top artist
        const artistResults = await Promise.all(
            topArtists.map(artist =>
                apiFetch(ENDPOINTS.searchSongs, { query: artist, limit: 10 })
            )
        );

        // Flatten results and filter out already heard songs
        let candidates = [];
        artistResults.forEach(res => {
            const results = (res?.results || res?.data?.results || []);
            candidates = [...candidates, ...results];
        });

        // Unique candidates based on ID and filter out history
        const uniqueCandidates = [];
        const seenIds = new Set();

        for (const song of candidates) {
            const sid = song.id || song._id;
            if (!historyIds.has(sid) && !seenIds.has(sid)) {
                uniqueCandidates.push(song);
                seenIds.add(sid);
            }
        }

        // Shuffle the results for variety
        const shuffled = uniqueCandidates.sort(() => Math.random() - 0.5);

        return shuffled.slice(0, limit);
    } catch (error) {
        console.error('Mehfil Recommendation Error:', error);
        return [];
    }
}
