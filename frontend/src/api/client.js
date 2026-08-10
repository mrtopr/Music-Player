/**
 * API client — base URL resolution and fetch helpers
 */

export const API_BASE_URL = (() => {
    let baseUrl = '';

    // 1. Check for Environment Variable
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) baseUrl = envUrl.replace(/\/$/, '');

    // 2. Fallbacks for specific overrides
    if (!baseUrl) {
        const params = new URLSearchParams(window.location.search);
        const queryOverride = params.get('apiBase');
        if (queryOverride) baseUrl = queryOverride.replace(/\/$/, '');
    }

    if (!baseUrl) {
        try {
            const storedOverride = localStorage.getItem('mehfilApiBaseUrl');
            if (storedOverride) baseUrl = storedOverride.replace(/\/$/, '');
        } catch (storageError) {}
    }

    // 3. Auto-detection fallback
    if (!baseUrl) {
        if (window.location.protocol === 'file:') baseUrl = 'http://localhost:3000';
        else {
            const host = window.location.hostname;
            const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
            const isPrivateIp = /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(host);

            if (isLocalHost || isPrivateIp) {
                baseUrl = `http://${host}:3000`;
            }
        }
    }

    // Sanitize mistyped https:// for localhost or loopback IP addresses
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('::1')) {
        baseUrl = baseUrl.replace(/^https:\/\//i, 'http://');
    }

    return baseUrl;
})();


export const ENDPOINTS = {
    trendingSongs: '/api/modules',
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
const API_CACHE_MAX = 100; // FIFO eviction — prevents unbounded memory growth

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

        let res = await fetch(urlString).catch(() => null);

        // Fallback for YouTube endpoints if primary backend is remote and returns 404 or fails
        if ((!res || !res.ok) && path.startsWith('/api/youtube')) {
            try {
                const localUrl = new URL('http://localhost:3000' + path);
                Object.entries(params).forEach(([k, v]) => localUrl.searchParams.set(k, v));
                const localRes = await fetch(localUrl.toString());
                if (localRes.ok) res = localRes;
            } catch (fallbackErr) {}
        }

        if (!res || !res.ok) {
            const status = res ? res.status : 'NetworkError';
            throw new Error(`API error ${status}`);
        }

        const data = await res.json();
        const finalData = (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'data')) ? data.data : data;

        apiCache.set(urlString, finalData);
        setTimeout(() => apiCache.delete(urlString), 5 * 60 * 1000);
        if (apiCache.size > API_CACHE_MAX) {
            apiCache.delete(apiCache.keys().next().value);
        }

        return finalData;
    } catch (err) {
        if (!path.startsWith('/api/youtube')) {
            handleApiError(err, path);
        } else {
            console.warn(`[YouTube API] Endpoint ${path} not available:`, err.message);
        }
        throw err;
    }
}

/**
 * Get a high-resolution image URL from the JioSaavn or YouTube image array
 * @param {Array|string} imageData
 * @returns {string}
 */
export function getImageUrl(imageData) {
    if (!imageData) return '/mehfil-logo.png';
    if (typeof imageData === 'string') {
        return imageData
            .replace(/-150x150\./g, '-500x500.')
            .replace(/-50x50\./g, '-500x500.')
            .replace(/[\d]+x[\d]+/g, '500x500');
    }

    if (Array.isArray(imageData)) {
        const high = imageData.find(q => q.quality === '500x500') ||
            imageData.find(q => q.quality === '150x150') ||
            imageData[imageData.length - 1];
        const rawUrl = high?.url || high?.link || imageData[0]?.url || imageData[0]?.link || '/mehfil-logo.png';
        return typeof rawUrl === 'string'
            ? rawUrl.replace(/-150x150\./g, '-500x500.').replace(/-50x50\./g, '-500x500.').replace(/[\d]+x[\d]+/g, '500x500')
            : rawUrl;
    }
    return '/mehfil-logo.png';
}



/**
 * Get a download URL from the JioSaavn or YouTube download URL array
 * @param {Array|string} downloadUrls
 * @returns {string|null}
 */
export function getAudioUrl(downloadUrls) {
    if (!downloadUrls) return null;
    let url = null;
    if (typeof downloadUrls === 'string') {
        url = downloadUrls;
    } else if (Array.isArray(downloadUrls) && downloadUrls.length > 0) {
        const high = downloadUrls.find(d => d.quality === '320kbps') ||
            downloadUrls.find(d => d.quality === '160kbps') ||
            downloadUrls[downloadUrls.length - 1];
        url = high?.url || high?.link || downloadUrls[0]?.url || downloadUrls[0]?.link || null;
    }
    if (!url) return null;
    // YouTube stream paths must go through the backend proxy with http (never https on localhost)
    if (url.startsWith('/api/youtube')) {
        const base = (API_BASE_URL && !API_BASE_URL.includes('vercel.app')) ? API_BASE_URL : 'http://localhost:3000';
        return base + url;
    }
    if (url.startsWith('/')) {
        return (API_BASE_URL || 'http://localhost:3000') + url;
    }
    // Never upgrade localhost URLs to https — the backend runs on plain HTTP
    if (url.includes('localhost')) return url;
    return url.replace(/^http:\/\//i, 'https://');
}
