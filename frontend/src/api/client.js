/**
 * API client — base URL resolution and fetch helpers
 */

export const API_BASE_URL = (() => {
    // 1. Check for Environment Variable (Production-ready VITE approach)
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) return envUrl.replace(/\/$/, '');

    // 2. Fallbacks for specific overrides (stored or query param)
    const params = new URLSearchParams(window.location.search);
    const queryOverride = params.get('apiBase');
    if (queryOverride) return queryOverride.replace(/\/$/, '');

    try {
        const storedOverride = localStorage.getItem('mehfilApiBaseUrl');
        if (storedOverride) return storedOverride.replace(/\/$/, '');
    } catch (storageError) {
        console.warn('Unable to read API base from localStorage:', storageError);
    }

    // 3. Auto-detection fallback (safe for development)
    if (window.location.protocol === 'file:') return 'http://localhost:3000';

    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const isPrivateIp = /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(host);

    if (isLocalHost || isPrivateIp) return `${window.location.protocol}//${host}:3000`;

    return ''; // Production fallback: same-origin
})();

export const ENDPOINTS = {
    trendingSongs: '/api/trending2026',
    newReleasesAlbums: '/api/modules',
    popularArtists: '/api/search/artists?query=Top%202024%20Hindi%20Bollywood%20Singers%20Rappers&language=hindi',
    featuredPlaylists: '/api/search/playlists?query=Bollywood%20hits%20romantic&language=hindi',
    searchSongs: '/api/search/songs',
    searchAlbums: '/api/search/albums',
    searchArtists: '/api/search/artists',
    searchPlaylists: '/api/search/playlists',
    albumDetails: '/api/albums?id=',
    playlistDetails: '/api/playlists?id=',
    songDetails: '/api/songs?id=',
    artistDetails: '/api/artists?id='
};

/**
 * Fetch from the jiosaavn API backend with error handling
 * @param {string} path - API path (relative, e.g. '/api/search/songs')
 * @param {Object} params - Query params to append
 * @returns {Promise<Object>}
 */
const apiCache = new Map();

/**
 * Standardized API error reporting
 */
export function handleApiError(err, context = '') {
    console.error(`API Error [${context}]:`, err);
    // Future: Add toast/UI notification logic here
    return { success: false, error: err.message, context };
}

export async function apiFetch(path, params = {}) {
    try {
        const url = new URL(API_BASE_URL + path, window.location.href);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const urlString = url.toString();

        if (apiCache.has(urlString)) {
            return apiCache.get(urlString);
        }

        const res = await fetch(urlString);
        if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);

        const data = await res.json();
        const finalData = data.data || data;

        // Retain standard query topologies for 5 minutes globally
        apiCache.set(urlString, finalData);
        setTimeout(() => apiCache.delete(urlString), 5 * 60 * 1000);

        return finalData;
    } catch (err) {
        return handleApiError(err, path);
    }
}

/**
 * Get a high-resolution image URL from the JioSaavn image array
 * @param {Array|string} imageData
 * @returns {string}
 */
export function getImageUrl(imageData) {
    if (!imageData) return 'favicon.ico';
    if (typeof imageData === 'string') {
        return imageData.replace('150x150', '500x500').replace('50x50', '500x500');
    }
    if (Array.isArray(imageData)) {
        const high = imageData.find(q => q.quality === '500x500') ||
            imageData.find(q => q.quality === '150x150') ||
            imageData[imageData.length - 1];
        return high?.url || imageData[0]?.url || 'favicon.ico';
    }
    return 'favicon.ico';
}

/**
 * Get a download URL from the JioSaavn download URL array
 * @param {Array|string} downloadUrls
 * @returns {string|null}
 */
export function getAudioUrl(downloadUrls) {
    if (!downloadUrls) return null;
    if (typeof downloadUrls === 'string') return downloadUrls;
    if (Array.isArray(downloadUrls)) {
        const high = downloadUrls.find(d => d.quality === '320kbps') ||
            downloadUrls.find(d => d.quality === '160kbps') ||
            downloadUrls[downloadUrls.length - 1];
        return high?.url || null;
    }
    return null;
}
