import { create } from 'zustand';
import { getAudioUrl, getImageUrl } from '../api/client.js';
import { addToHistory } from '../utils/history.js';

// Singleton audio element shared across the app
const audio = new Audio();
audio.preload = 'auto';
audio.crossOrigin = 'anonymous';

export const usePlayerStore = create((set, get) => ({
    // ── State ──
    isPlaying: false,
    currentSong: null,
    isFullScreen: false,
    queue: [],
    queueIndex: -1,
    volume: 0.8,
    isMuted: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',  // 'off' | 'all' | 'one'
    likedSongs: (() => { try { return JSON.parse(localStorage.getItem('likedSongs') || '[]'); } catch { return []; } })(),

    // ── Internals ──
    audio,

    // ── Actions ──
    toggleLike: (song) => set((state) => {
        if (!song) return state;
        const exists = state.likedSongs.findIndex(s => s.id === song.id);
        const newLikes = [...state.likedSongs];
        if (exists >= 0) newLikes.splice(exists, 1);
        else newLikes.push(song);
        try { localStorage.setItem('likedSongs', JSON.stringify(newLikes)); } catch { }
        return { likedSongs: newLikes };
    }),

    setFullScreen: (val) => set({ isFullScreen: val }),

    addToQueue: (song) => set(state => {
        if (!song) return state;
        const exists = state.queue.some(s => s.id === song.id);
        if (exists) return state;
        return { queue: [...state.queue, song] };
    }),

    playSong: async (rawSong, autoOpen = true) => {
        const state = get();
        if (!rawSong) return;

        // Record to history (before normalization)
        addToHistory(rawSong);

        // Normalize song data — JioSaavn returns varying structures
        let song = { ...rawSong };
        if (!song.title && song.name) song.title = song.name;
        if (!song.primaryArtists && song.artists?.primary) {
            song.primaryArtists = song.artists.primary.map(a => a.name).join(', ');
        }
        if (!song.primaryArtists && song.artist) song.primaryArtists = song.artist;
        if (!song.subtitle && song.primaryArtists) song.subtitle = song.primaryArtists;

        let url = getAudioUrl(song.downloadUrl);
        
        // If downloadUrl is missing (e.g. from an old history entry or search-limited results),
        // fetch full details including high-quality audio URLs.
        if (!url && song.id) {
            try {
                const { apiFetch } = await import('../api/client.js');
                const detailRes = await apiFetch('/api/songs', { id: song.id });
                if (detailRes && detailRes[0]) {
                    song = { ...song, ...detailRes[0] };
                    url = getAudioUrl(song.downloadUrl);
                }
            } catch (err) {
                console.error('Failed to fetch song details for playback:', err);
            }
        }

        if (!url) { 
            console.warn('No audio URL found for:', song.title);
            // Future: add a UI notification here
            return; 
        }

        audio.src = url;
        audio.play().catch(e => console.warn('Playback blocked:', e));

        // Update media session
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title?.replace(/&quot;/g, '"') || 'Unknown',
                artist: song.primaryArtists || song.subtitle || 'Unknown',
                artwork: [{ src: getImageUrl(song.image), sizes: '500x500', type: 'image/jpeg' }]
            });
        }

        // Add/update queue
        let newQueue = [...state.queue];
        let newIndex = state.queueIndex;
        const existingIdx = newQueue.findIndex(s => s.id === song.id);
        if (existingIdx >= 0) {
            newIndex = existingIdx;
            // Update queue item with potentially richer metadata
            newQueue[existingIdx] = song;
        } else {
            newQueue.splice(state.queueIndex + 1, 0, song);
            newIndex = state.queueIndex + 1;
        }

        const updates = { currentSong: song, isPlaying: true, queue: newQueue, queueIndex: newIndex, progress: 0, currentTime: 0 };
        if (autoOpen) updates.isFullScreen = true;

        set(updates);
    },

    playQueue: (songs, startIndex = 0, autoOpen = true) => {
        if (!songs.length) return;
        set({ queue: songs, queueIndex: startIndex });
        get().playSong(songs[startIndex], autoOpen);
    },

    togglePlay: () => {
        const { isPlaying, currentSong } = get();
        if (!currentSong) return;
        if (isPlaying) { audio.pause(); } else { audio.play().catch(() => { }); }
        set({ isPlaying: !isPlaying });
    },

    nextSong: () => {
        const { queue, queueIndex, shuffle, repeat } = get();
        if (!queue.length) return;

        let next;
        if (queue.length === 1) {
            // Only 1 song in queue: just restart it if Next is pressed.
            audio.currentTime = 0;
            audio.play().catch(() => { });
            return;
        }

        if (shuffle) {
            next = Math.floor(Math.random() * queue.length);
        } else if (queueIndex < queue.length - 1) {
            next = queueIndex + 1;
        } else if (repeat === 'all' || repeat === 'off') { // By default, loop back if we hit end so button "works"
            next = 0;
        } else {
            return;
        }
        set({ queueIndex: next });
        get().playSong(queue[next], false);
    },

    prevSong: () => {
        const { queue, queueIndex } = get();
        // Always reset current song if past 3 seconds or if alone in queue
        if (!queue.length || audio.currentTime > 3 || queue.length === 1 || queueIndex === 0) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
            return;
        }
        const prev = Math.max(0, queueIndex - 1);
        set({ queueIndex: prev });
        get().playSong(queue[prev], false);
    },

    seek: (pct) => {
        if (!audio.duration) return;
        audio.currentTime = (pct / 100) * audio.duration;
    },

    setVolume: (vol) => {
        audio.volume = vol;
        set({ volume: vol, isMuted: vol === 0 });
    },

    toggleMute: () => {
        const { isMuted, volume } = get();
        audio.muted = !isMuted;
        set({ isMuted: !isMuted });
    },

    toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),

    cycleRepeat: () => set(s => {
        const modes = ['off', 'all', 'one'];
        const next = modes[(modes.indexOf(s.repeat) + 1) % modes.length];
        audio.loop = next === 'one';
        return { repeat: next };
    }),
}));

// ── Audio event listeners (run once) ──
audio.addEventListener('timeupdate', () => {
    const store = usePlayerStore.getState();
    const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    usePlayerStore.setState({ progress, currentTime: audio.currentTime, duration: audio.duration || 0 });
});

audio.addEventListener('ended', () => {
    const { repeat } = usePlayerStore.getState();
    if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
    } else {
        usePlayerStore.getState().nextSong();
    }
});

audio.addEventListener('pause', () => usePlayerStore.setState({ isPlaying: false }));
audio.addEventListener('play', () => usePlayerStore.setState({ isPlaying: true }));

// ── MediaSession action handlers (keyboard media keys) ──
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().prevSong());
    navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().nextSong());
}

