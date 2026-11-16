/**
 * JioSaavn provider adapter.
 *
 * JioSaavn serves direct CDN audio (AAC/MP4) which we can fetch through our
 * own `/api/audio/proxy`, decode and process — so its tracks are fully
 * mixable.
 */

const QUALITY_ORDER = ['320kbps', '160kbps', '96kbps', '48kbps', '32kbps', '12kbps'];

function pickQuality(downloadUrl, preferred) {
    if (!Array.isArray(downloadUrl) || !downloadUrl.length) return null;
    const order = preferred ? [preferred, ...QUALITY_ORDER] : QUALITY_ORDER;
    for (const quality of order) {
        const hit = downloadUrl.find((entry) => entry?.quality === quality && entry?.url);
        if (hit) return hit.url;
    }
    const fallback = downloadUrl.find((entry) => entry?.url);
    return fallback?.url || null;
}

export const jiosaavnProvider = {
    id: 'jiosaavn',
    label: 'JioSaavn',

    /** Direct CDN audio → we can analyse and mix it. */
    isProcessable(track) {
        if (!track) return false;
        if (String(track.id || '').startsWith('yt_')) return false;
        return !!pickQuality(track.downloadUrl);
    },

    getArtwork(track) {
        const image = track?.image;
        if (Array.isArray(image)) {
            const high = image.find((img) => img.quality === '500x500') || image[0];
            return high?.url || high?.link || null;
        }
        return typeof image === 'string' ? image : null;
    },

    /**
     * @param {object} track
     * @param {{ quality?: string }} options
     */
    async getPlaybackSource(track, options = {}) {
        const url = pickQuality(track?.downloadUrl, options.quality);
        if (!url) throw new Error('No downloadable audio for this track');
        return { url, quality: options.quality || 'auto', provider: 'jiosaavn' };
    },

    getTrackMetadata(track) {
        return {
            id: track?.id,
            title: track?.title || track?.name,
            artist:
                track?.primaryArtists ||
                track?.subtitle ||
                (Array.isArray(track?.artists) ? track.artists.map((a) => a?.name).filter(Boolean).join(', ') : ''),
            album: track?.album?.name || track?.album || '',
            duration: Number(track?.duration || 0),
        };
    },
};
