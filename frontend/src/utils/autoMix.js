/**
 * AutoMix Engine Utilities
 * Handles song scoring, BPM simulation, and next-track selection logic.
 */

// Simple seeded random for consistent "analysis" of the same song
const pseudoHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

/**
 * Gets simulated audio characteristics for a song if not provided by API
 */
export const analyzeSong = (song) => {
    if (!song) return { bpm: 120, energy: 0.5, genre: 'unknown' };
    
    const seed = pseudoHash(song.id || song.title || "");
    
    return {
        bpm: 80 + (seed % 80), // 80 to 160 BPM
        energy: (seed % 100) / 100, // 0.0 to 1.0
        genre: song.genre || (seed % 3 === 0 ? 'Bollywood' : seed % 2 === 0 ? 'Pop' : 'Romantic')
    };
};

/**
 * Scores a candidate song based on its compatibility with the current song
 */
export const calculateMatchScore = (candidate, current, recentIds = []) => {
    if (!candidate || !current) return 0;
    if (candidate.id === current.id) return -100;
    if (recentIds.includes(candidate.id)) return -50;

    const candMeta = analyzeSong(candidate);
    const currMeta = analyzeSong(current);

    let score = 0;

    // 1. Genre Match (High weight)
    if (candMeta.genre === currMeta.genre) score += 40;

    // 2. BPM Match (Muted weight for "chill" or "hype" flow)
    const bpmDiff = Math.abs(candMeta.bpm - currMeta.bpm);
    score += Math.max(0, 30 - bpmDiff); // Higher score for closer BPM

    // 3. Energy Consistency
    const energyDiff = Math.abs(candMeta.energy - currMeta.energy);
    score += Math.max(0, 20 - (energyDiff * 20));

    // 4. Content diversity
    if (candidate.primaryArtists === current.primaryArtists) score += 10;

    return score;
};

/**
 * Picks the best next song from a pool of candidates
 */
export const pickBestNext = (pool, current, recentIds = []) => {
    if (!pool || !pool.length) return null;
    
    const scored = pool.map(song => ({
        song,
        score: calculateMatchScore(song, current, recentIds)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0]?.song;
};
