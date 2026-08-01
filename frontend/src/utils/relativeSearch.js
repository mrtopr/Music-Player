/**
 * Relative Search & ML-Inspired Fuzzy Re-Ranking Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides relative searching instead of strict exact string matching:
 * 1. Text Normalization & Transliteration Equivalence (aa/a, ee/i, th/t, dh/d)
 * 2. Character 3-Gram Vector Cosine Similarity (TF-IDF approximation)
 * 3. Levenshtein Edit Distance Ratio
 * 4. Token Set Intersection & Relative Relevance Scoring
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 1. Text Normalization ───────────────────────────────────────────────────
export function normalizeSearchText(text = '') {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/[\(\)\[\]\{\}\-_,.:;!?"'~@#$%^&*]/g, ' ') // remove punctuation
        .replace(/\b(aa|a)\b/g, 'a')                        // transliteration soft match
        .replace(/(ee|i)+/g, 'i')
        .replace(/(oo|u)+/g, 'u')
        .replace(/(th|t)+/g, 't')
        .replace(/(dh|d)+/g, 'd')
        .replace(/\s+/g, ' ')                               // normalize whitespace
        .trim();
}

// ── 2. Levenshtein Distance & Similarity Ratio ──────────────────────────────
export function levenshteinDistance(s1 = '', s2 = '') {
    const a = s1.toLowerCase();
    const b = s2.toLowerCase();
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[a.length][b.length];
}

export function levenshteinRatio(s1, s2) {
    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    return 1 - distance / maxLen;
}

// ── 3. Character N-Gram Vector Cosine Similarity ───────────────────────────
function getNGramFreqMap(str, n = 3) {
    const padded = `  ${str}  `;
    const map = new Map();
    for (let i = 0; i <= padded.length - n; i++) {
        const gram = padded.substring(i, i + n);
        map.set(gram, (map.get(gram) || 0) + 1);
    }
    return map;
}

export function nGramCosineSimilarity(str1 = '', str2 = '', n = 3) {
    if (!str1 || !str2) return 0;
    const map1 = getNGramFreqMap(str1, n);
    const map2 = getNGramFreqMap(str2, n);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const val of map1.values()) norm1 += val * val;
    for (const val of map2.values()) norm2 += val * val;

    for (const [gram, count1] of map1.entries()) {
        const count2 = map2.get(gram) || 0;
        dotProduct += count1 * count2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// ── 4. Token Overlap Ratio ─────────────────────────────────────────────────
export function tokenSetSimilarity(query, target) {
    const qTokens = normalizeSearchText(query).split(' ').filter(Boolean);
    const tTokens = normalizeSearchText(target).split(' ').filter(Boolean);

    if (!qTokens.length || !tTokens.length) return 0;

    let matches = 0;
    qTokens.forEach(qt => {
        if (tTokens.some(tt => tt.includes(qt) || qt.includes(tt) || levenshteinRatio(qt, tt) > 0.75)) {
            matches++;
        }
    });

    return matches / qTokens.length;
}

// ── 5. Master Relative Relevance Score Calculation ─────────────────────────
/**
 * Calculates a composite relative similarity score [0..100] between query and an item.
 */
export function calculateRelativeScore(query, item) {
    if (!query || !item) return 0;

    const normQuery = normalizeSearchText(query);
    const title = normalizeSearchText(item.title || item.name || '');
    const artist = normalizeSearchText(item.primaryArtists || item.artist || item.subtitle || '');
    const album = normalizeSearchText(item.album?.name || item.albumName || '');
    const description = normalizeSearchText(item.description || '');

    const candidateText = `${title} ${artist} ${album} ${description}`.trim();

    if (!candidateText) return 0;

    // 1. Exact or Prefix Substring Match Boost
    let exactBonus = 0;
    if (title === normQuery) exactBonus = 100;
    else if (title.startsWith(normQuery)) exactBonus = 85;
    else if (candidateText.includes(normQuery)) exactBonus = 70;

    // 2. Cosine Vector Similarity (N-Gram TF-IDF approximation)
    const vecSimTitle = nGramCosineSimilarity(normQuery, title, 3);
    const vecSimOverall = nGramCosineSimilarity(normQuery, candidateText, 3);
    const vectorScore = Math.max(vecSimTitle, vecSimOverall) * 100;

    // 3. Levenshtein Edit Distance Ratio
    const levRatioTitle = levenshteinRatio(normQuery, title);
    const levRatioArtist = levenshteinRatio(normQuery, artist);
    const editScore = Math.max(levRatioTitle, levRatioArtist) * 100;

    // 4. Token Overlap Score
    const tokenScore = tokenSetSimilarity(normQuery, candidateText) * 100;

    // Composite Weighted Relational Score
    const compositeScore = (
        (exactBonus * 0.35) +
        (vectorScore * 0.30) +
        (tokenScore * 0.20) +
        (editScore * 0.15)
    );

    return Math.round(compositeScore);
}

// ── 6. Rank Items by Relative Similarity ──────────────────────────────────
/**
 * Accepts an array of candidate search results and ranks them by relative similarity score.
 */
export function rankByRelativeSimilarity(query, items = [], threshold = 15) {
    if (!query || !Array.isArray(items) || items.length === 0) return items;

    const scored = items.map(item => {
        const score = calculateRelativeScore(query, item);
        return { item, score };
    });

    // Sort descending by relative match score
    scored.sort((a, b) => b.score - a.score);

    // Return ranked items
    return scored
        .filter(entry => entry.score >= threshold || items.length <= 3)
        .map(entry => entry.item);
}
