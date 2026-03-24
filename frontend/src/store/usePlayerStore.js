import { create } from 'zustand';
import { getAudioUrl, getImageUrl } from '../api/client.js';
import { addToHistory } from '../utils/history.js';

// Singleton audio element shared across the app, 
// preserved across HMR reloads via global window attachment.
if (!window.__mehfilAudio) {
    window.__mehfilAudio = new Audio();
    window.__mehfilAudio.preload = 'auto';
    window.__mehfilAudio.crossOrigin = 'anonymous';
}
const audio = window.__mehfilAudio;

// ── Audio Engine Internals (Equalizer) ──
let audioCtx = null;
let source = null;
let filters = { bass: null, mid: null, treble: null };

const initAudioEngine = () => {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaElementSource(audio);
        
        const bass = audioCtx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 200;
        
        const mid = audioCtx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 1000;
        mid.Q.value = 1;
        
        const treble = audioCtx.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 3000;

        source.connect(bass);
        bass.connect(mid);
        mid.connect(treble);
        treble.connect(audioCtx.destination);

        filters = { bass, mid, treble };
    } catch (e) {
        console.warn('Audio Context initialization failed:', e);
    }
};

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

    // Equalizer State
    equalizer: { bass: 0, mid: 0, treble: 0 },
    
    // Sleep Timer State
    sleepTimer: {
        active: false,
        remaining: 0, // seconds
        label: ''
    },

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
        initAudioEngine();
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
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
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

    // ── Equalizer Actions ──
    setEqualizer: (key, val) => {
        initAudioEngine();
        if (filters[key]) {
            filters[key].gain.value = val;
        }
        set(state => ({ equalizer: { ...state.equalizer, [key]: val } }));
    },

    setEqualizerAll: (vals) => {
        initAudioEngine();
        Object.entries(vals).forEach(([key, val]) => {
            if (filters[key]) filters[key].gain.value = val;
        });
        set({ equalizer: vals });
    },

    // ── Sleep Timer Actions ──
    startSleepTimer: (minutes) => {
        const seconds = minutes * 60;
        set({ 
            sleepTimer: { 
                active: true, 
                remaining: seconds,
                label: minutes >= 60 ? `${minutes/60} Hour${minutes>60?'s':''}` : `${minutes} Mins`
            } 
        });
    },

    stopSleepTimer: () => {
        set({ sleepTimer: { active: false, remaining: 0, label: '' } });
    },
}));

// ── Global Intervals ──
setInterval(() => {
    const state = usePlayerStore.getState();
    if (state.sleepTimer.active && state.sleepTimer.remaining > 0) {
        const nextRem = state.sleepTimer.remaining - 1;
        if (nextRem <= 0) {
            audio.pause();
            usePlayerStore.setState({ 
                isPlaying: false, 
                sleepTimer: { active: false, remaining: 0, label: '' } 
            });
        } else {
            usePlayerStore.setState({ 
                sleepTimer: { ...state.sleepTimer, remaining: nextRem } 
            });
        }
    }
}, 1000);

// ── Audio event listeners (run once) ──
if (!window.__mehfilListenersAttached) {
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
    
    window.__mehfilListenersAttached = true;
}

