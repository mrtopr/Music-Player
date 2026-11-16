/**
 * YouTube Music provider adapter.
 *
 * IMPORTANT LIMITATION (technical, not a shortcut):
 * YouTube playback happens inside a cross-origin <iframe> through the
 * YouTube IFrame Player API. Its audio therefore:
 *   • cannot be routed into a Web Audio graph (no MediaElementSource), and
 *   • cannot be fetched as bytes for analysis.
 *
 * The engine detects this and falls back to the normal handover path for
 * YouTube tracks instead of pretending to mix them.
 */

export const youtubeProvider = {
    id: 'youtube',
    label: 'YouTube Music',

    isYouTube(track) {
        return String(track?.id || '').startsWith('yt_');
    },

    /** YouTube audio is not retrievable → not analysable, not mixable. */
    isProcessable() {
        return false;
    },

    getArtwork(track) {
        return track?.image || null;
    },

    async getPlaybackSource(track) {
        if (!this.isYouTube(track)) throw new Error('Not a YouTube track');
        return {
            url: null,
            quality: 'youtube',
            provider: 'youtube',
            processable: false,
            reason: 'YouTube audio is delivered by a cross-origin iframe and cannot be routed to the Web Audio graph.',
        };
    },

    getTrackMetadata(track) {
        return {
            id: track?.id,
            title: track?.title || track?.name,
            artist: track?.primaryArtists || track?.subtitle || track?.artist || '',
            album: track?.album?.name || '',
            duration: Number(track?.duration || 0),
        };
    },
};
