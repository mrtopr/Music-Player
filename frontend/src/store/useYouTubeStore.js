import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';

export const useYouTubeStore = create((set, get) => ({
    // State
    ytSong: null,          // Full song object
    ytVideoId: null,       // Clean YouTube video ID (without 'yt_' prefix)
    isYtVisible: false,    // Is the iframe player showing
    isYtExpanded: false,   // Is the iframe player expanded to fullscreen

    // Play a YouTube song — pauses native player if active
    playYt: (song) => {
        const videoId = (song.id || '').replace('yt_', '');
        if (!videoId) return;

        // Pause native player if it's playing
        const playerState = usePlayerStore.getState();
        if (playerState.isPlaying) {
            playerState.togglePlay();
        }

        set({
            ytSong: song,
            ytVideoId: videoId,
            isYtVisible: true,
            isYtExpanded: false
        });
    },

    // Close the YouTube player
    closeYt: () => set({
        ytSong: null,
        ytVideoId: null,
        isYtVisible: false,
        isYtExpanded: false
    }),

    // Toggle expanded fullscreen mode
    toggleYtExpand: () => set(state => ({ isYtExpanded: !state.isYtExpanded })),

    setYtExpanded: (val) => set({ isYtExpanded: val })
}));
