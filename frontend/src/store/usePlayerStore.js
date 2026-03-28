import { create } from 'zustand';
import { getAudioUrl, getImageUrl, apiFetch } from '../api/client.js';
import { addToHistory, addGenrePlay } from '../utils/history.js';
import { pickBestNext } from '../utils/autoMix.js';
import { audioEngine } from '../utils/audioEngine.js';

// Singleton audio elements shared across HMR
if (!window.__mehfilAudioA) {
    window.__mehfilAudioA = new Audio();
    window.__mehfilAudioA.crossOrigin = 'anonymous';
}
if (!window.__mehfilAudioB) {
    window.__mehfilAudioB = new Audio();
    window.__mehfilAudioB.crossOrigin = 'anonymous';
}
const audioA = window.__mehfilAudioA;
const audioB = window.__mehfilAudioB;

// Hard-init the pro engine once
audioEngine.init(audioA, audioB);

export const usePlayerStore = create((set, get) => ({

    // ── State ──
    isPlaying: false,
    currentSong: null,
    isFullScreen: false,
    isQueueOpen: false,
    isEqualizerOpen: false,
    isSleepTimerOpen: false,
    queue: [],
    queueIndex: -1,

    volume: 0.8,
    isMuted: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',  // 'off' | 'all' | 'one'
    isAutoMixEnabled: true,
    isPrepared: false,
    isTransitioning: false,
    likedSongs: (() => { try { return JSON.parse(localStorage.getItem('likedSongs') || '[]'); } catch { return []; } })(),

    activeChannel: 'A', // 'A' | 'B'


    // Equalizer State
    equalizer: { bass: 0, mid: 0, treble: 0 },

    // Sleep Timer State
    sleepTimer: {
        active: false,
        remaining: 0, // seconds
        label: ''
    },

    // Dynamic Branding State
    albumColors: {
        dominant: '#1a1a1a',
        dominantRGB: '26,26,26',
        accent: '#f59e0b',
        accentRGB: '245,158,11',
        secondary: '#0a0a0a'
    },

    // Internals
    isInitialized: false,



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
    setQueueOpen: (val) => set({ isQueueOpen: val }),
    setEqualizerOpen: (val) => set({ isEqualizerOpen: val }),
    setSleepTimerOpen: (val) => set({ isSleepTimerOpen: val }),


    injectIntoQueue: (songsToAdd, playIndex = 0) => {
        const state = get();
        let currentQueue = [...state.queue];
        let currentIndex = state.queueIndex;
        
        if (playIndex < 0 || playIndex >= songsToAdd.length) playIndex = 0;

        const selectedSong = songsToAdd[playIndex];
        const restSongs = songsToAdd.slice(playIndex + 1);
        const orderedToAdd = [selectedSong, ...restSongs];

        let newQueue = [];
        let newCurrentIndex = currentIndex;
        const addIds = new Set(orderedToAdd.map(s => s.id));

        for (let i = 0; i < currentQueue.length; i++) {
            const song = currentQueue[i];
            if (addIds.has(song.id)) {
                if (i < currentIndex) {
                    newCurrentIndex--;
                } 
                else if (i === currentIndex) {
                    newCurrentIndex--;
                }
            } else {
                newQueue.push(song);
            }
        }

        const insertPos = newCurrentIndex >= 0 ? newCurrentIndex + 1 : 0;
        newQueue.splice(insertPos, 0, ...orderedToAdd);
        
        return { newQueue, targetIndex: insertPos };
    },

    addToQueue: (song) => set(state => {
        if (!song) return state;
        
        let currentQueue = [...state.queue];
        let currentIndex = state.queueIndex;
        
        let newQueue = [];
        let newCurrentIndex = currentIndex;
        
        for (let i = 0; i < currentQueue.length; i++) {
            const s = currentQueue[i];
            if (s.id === song.id) {
                if (i < currentIndex) newCurrentIndex--;
                else if (i === currentIndex) return state; 
            } else {
                newQueue.push(s);
            }
        }
        
        const insertPos = newCurrentIndex >= 0 ? newCurrentIndex + 1 : 0;
        newQueue.splice(insertPos, 0, song);
        
        return { queue: newQueue, queueIndex: newCurrentIndex };
    }),

    playSong: async (rawSong, autoOpen = true, isFromQueue = false) => {

        const state = get();
        if (!rawSong) return;

        // Normalize song data
        let song = { ...rawSong };
        if (!song.title && song.name) song.title = song.name;
        if (!song.primaryArtists && song.artists?.primary) {
            song.primaryArtists = song.artists.primary.map(a => a.name).join(', ');
        }
        if (!song.primaryArtists && song.artist) song.primaryArtists = song.artist;
        if (!song.subtitle && song.primaryArtists) song.subtitle = song.primaryArtists;

        if (!isFromQueue) {
            const { newQueue, targetIndex } = get().injectIntoQueue([song], 0);
            set({ queue: newQueue, queueIndex: targetIndex });
        }

        const freshState = get();

        // Record to history
        addToHistory(rawSong);
        // Collect genre signal for personalization
        const songGenre = rawSong.language
            ? (rawSong.language.includes('hindi') ? 'Hindi' : rawSong.language)
            : (rawSong.genre || rawSong.type || null);
        if (songGenre) addGenrePlay(songGenre);

        // Prep Channel
        const nextChannel = freshState.activeChannel === 'A' ? 'B' : 'A';
        const nextAudio = nextChannel === 'A' ? audioA : audioB;

        // [CRITICAL] Immediate state commit with the NEW channel
        // Otherwise onTimeUpdate will reject the updates until this finishes
        set({
            currentSong: song,
            isPlaying: true,
            isFullScreen: autoOpen ? true : freshState.isFullScreen,
            activeChannel: nextChannel,
            progress: 0,
            currentTime: 0,
            duration: song.duration || 0, // Pre-populating from metadata if available
            isPrepared: false,
            isTransitioning: false
        });


        let url = getAudioUrl(song.downloadUrl);
        if (!url && song.id) {
            try {
                const { apiFetch } = await import('../api/client.js');
                const detailRes = await apiFetch('/api/songs', { id: song.id });
                if (detailRes && detailRes[0]) {
                    song = { ...song, ...detailRes[0] };
                    url = getAudioUrl(song.downloadUrl);
                }
            } catch (err) { }
        }

        if (!url) return console.warn('No URL for:', song.title);

        await audioEngine.resume();
        const currentAudio = state.activeChannel === 'A' ? audioA : audioB;

        nextAudio.src = url;
        nextAudio.load();

        // 🎯 Manual clicks (autoOpen=true) use 800ms fade. Auto-mix uses 5s fade.
        const CROSSFADE_TIME = autoOpen ? 800 : 5000;

        if (state.currentSong) {
            audioEngine.crossfade(state.activeChannel, nextChannel, CROSSFADE_TIME, state.volume);
        } else {
            audioEngine.sync(nextChannel, state.volume);
        }

        await nextAudio.play().catch(e => console.warn('Play blocked:', e));
        audioEngine.sync(nextChannel, state.volume);

        setTimeout(() => {
            const freshState = usePlayerStore.getState();
            // ONLY pause previous if we are still on the expected channel (prevents racing)
            if (freshState.activeChannel === nextChannel) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
        }, CROSSFADE_TIME + 200);

        // Update Media Session
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title?.replace(/&quot;/g, '"') || 'Unknown',
                artist: song.primaryArtists || song.subtitle || 'Unknown',
                artwork: [{ src: getImageUrl(song.image), sizes: '500x500' }]
            });
        }

        // Dynamic Colors
        if (song.image) {
            const { extractAlbumColors } = await import('../utils/colorExtractor.js');
            extractAlbumColors(getImageUrl(song.image), song.title)
                .then(colors => set({ albumColors: colors }))
                .catch(err => { });
        }
    },



    playQueue: (songs, startIndex = 0, autoOpen = true) => {
        if (!songs.length) return;
        const { newQueue, targetIndex } = get().injectIntoQueue(songs, startIndex);
        set({ queue: newQueue, queueIndex: targetIndex });
        get().playSong(newQueue[targetIndex], autoOpen, true);
    },

    jumpInQueue: (index) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;
        set({ queueIndex: index });
        get().playSong(queue[index], true, true);
    },

    togglePlay: () => {
        const { isPlaying, currentSong } = get();
        if (!currentSong) return;

        if (isPlaying) {
            audioA.pause();
            audioB.pause();
        } else {
            const channel = get().activeChannel;
            const audio = channel === 'A' ? audioA : audioB;
            audio.play().catch(() => { });
        }
        set({ isPlaying: !isPlaying });
    },



    nextSong: () => {
        const { queue, queueIndex, shuffle, repeat, activeChannel } = get();
        if (!queue.length) return;

        const audio = activeChannel === 'A' ? audioA : audioB;
        if (queue.length === 1) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
            return;
        }

        let next;
        if (shuffle) {
            next = Math.floor(Math.random() * queue.length);
        } else if (queueIndex < queue.length - 1) {
            next = queueIndex + 1;
        } else if (repeat === 'all' || repeat === 'off') {
            next = 0;
        } else {
            return;
        }
        set({ queueIndex: next });
        get().playSong(queue[next], false, true);
    },

    prevSong: () => {
        const { queue, queueIndex, activeChannel } = get();
        const audio = activeChannel === 'A' ? audioA : audioB;
        if (!queue.length || audio.currentTime > 3 || queue.length === 1 || queueIndex === 0) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
            return;
        }
        const prev = Math.max(0, queueIndex - 1);
        set({ queueIndex: prev });
        get().playSong(queue[prev], false, true);
    },

    seek: (pct) => {
        const { activeChannel } = get();
        const audio = activeChannel === 'A' ? audioA : audioB;
        if (!audio.duration) return;
        audio.currentTime = (pct / 100) * audio.duration;
        // Reset flags on manual seek
        set({ isPrepared: false, isTransitioning: false });
    },

    // ── AutoMix Engine Handlers ──
    prepareNextSong: async () => {
        const state = get();
        if (state.isPrepared || !state.currentSong) return;

        console.log('[AutoMix] Analyzing for best match (10s mark)...');

        let pool = state.queue.filter(s => s.id !== state.currentSong.id);

        if (pool.length < 5) {
            try {
                const { getRecommendations } = await import('../utils/recommendations.js');
                const recs = await getRecommendations(10);
                pool = [...pool, ...recs];
            } catch (err) { }
        }

        const next = pickBestNext(pool, state.currentSong);
        if (next) {
            console.log('[AutoMix] Preloading:', next.title);
            const inQueue = state.queue.some(s => s.id === next.id);
            if (!inQueue) {
                set(s => ({ queue: [...s.queue, next] }));
            }
            set({ isPrepared: true });
        }
    },



    setVolume: (vol) => {
        const { activeChannel } = get();
        audioEngine.setVolume(activeChannel, vol);

        // Backup physical volume
        audioA.volume = 1;
        audioB.volume = 1;
        set({ volume: vol, isMuted: vol === 0 });
    },

    toggleMute: () => {
        const { isMuted, volume, activeChannel } = get();
        audioEngine.setVolume(activeChannel, !isMuted ? 0 : volume);
        set({ isMuted: !isMuted });
    },



    toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),

    cycleRepeat: () => set(s => {
        const modes = ['off', 'all', 'one'];
        const next = modes[(modes.indexOf(s.repeat) + 1) % modes.length];
        audioA.loop = next === 'one';
        audioB.loop = next === 'one';
        return { repeat: next };
    }),

    // ── Equalizer Actions ──
    setEqualizer: (key, val) => {
        if (audioEngine.filters && audioEngine.filters[key]) {
            audioEngine.filters[key].gain.value = val;
        }
        set(state => ({ equalizer: { ...state.equalizer, [key]: val } }));
    },


    setEqualizerAll: (vals) => {
        if (!audioEngine.initialized) audioEngine.init(audioA, audioB);
        const filters = audioEngine.filters;
        if (!filters) return;
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
                label: minutes >= 60 ? `${minutes / 60} Hour${minutes > 60 ? 's' : ''}` : `${minutes} Mins`
            }
        });
    },

    stopSleepTimer: () => {
        set({ sleepTimer: { active: false, remaining: 0, label: '' } });
    },
}));

// ── Global Maintenance Interval ──
let lastTick = Date.now();
setInterval(() => {
    const now = Date.now();
    const delta = Math.round((now - lastTick) / 1000);
    lastTick = now;

    const state = usePlayerStore.getState();
    if (state.sleepTimer.active && state.sleepTimer.remaining > 0) {
        const nextRem = Math.max(0, state.sleepTimer.remaining - delta);
        if (nextRem <= 0) {
            audioA.pause();
            audioB.pause();
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


// ── Audio event listeners (HMR Safe) ──
const attachAudioListeners = () => {
    const handleTimeUpdate = (e) => {
        const store = usePlayerStore.getState();
        const audio = e.target;
        const channel = audio === audioA ? 'A' : 'B';
        if (store.activeChannel !== channel) return;
        const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        const remaining = audio.duration ? audio.duration - audio.currentTime : 0;

        // 🎯 STEP 1: PRELOAD NEXT SONG (Early trigger at 10s)
        if (store.isAutoMixEnabled && audio.duration && remaining < 10 && !store.isPrepared) {
            store.prepareNextSong();
        }

        // 🎯 STEP 2: START NEXT SONG (overlap at 6s)
        if (store.isAutoMixEnabled && audio.duration && remaining < 6 && !store.isTransitioning && store.isPlaying) {
            usePlayerStore.setState({ isTransitioning: true });
            store.nextSong();
        }

        usePlayerStore.setState({
            progress,
            currentTime: audio.currentTime,
            duration: audio.duration || 0
        });
    };


    const handleEnded = (e) => {
        const store = usePlayerStore.getState();
        const audio = e.target;
        if (store.activeChannel !== (audio === audioA ? 'A' : 'B')) return;

        if (store.repeat === 'one') {
            audio.currentTime = 0;
            audio.play().catch(() => { });
        } else {
            // Only nextSong if we haven't already transitioned
            if (!store.isTransitioning) {
                store.nextSong();
            }
            // Reset flags for the NEW song
            usePlayerStore.setState({ isPrepared: false, isTransitioning: false });
        }
    };



    const handlePause = (e) => {
        const store = usePlayerStore.getState();
        if (e.target === (store.activeChannel === 'A' ? audioA : audioB)) {
            usePlayerStore.setState({ isPlaying: false });
        }
    };

    const handlePlay = (e) => {
        const store = usePlayerStore.getState();
        if (e.target === (store.activeChannel === 'A' ? audioA : audioB)) {
            usePlayerStore.setState({ isPlaying: true });
        }
    };

    const handleLoadedMetadata = (e) => {
        const store = usePlayerStore.getState();
        const audio = e.target;
        const channel = audio === audioA ? 'A' : 'B';
        if (store.activeChannel === channel && audio.duration) {
            usePlayerStore.setState({ duration: audio.duration });
        }
    };

    // Use property assignments to automatically overwrite old listeners on HMR refresh
    audioA.ontimeupdate = handleTimeUpdate;
    audioB.ontimeupdate = handleTimeUpdate;
    audioA.onended = handleEnded;
    audioB.onended = handleEnded;
    audioA.onpause = handlePause;
    audioB.onpause = handlePause;
    audioA.onplay = handlePlay;
    audioB.onplay = handlePlay;
    audioA.onloadedmetadata = handleLoadedMetadata;
    audioB.onloadedmetadata = handleLoadedMetadata;

    // MediaSession
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().prevSong());
        navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().nextSong());
    }
};

attachAudioListeners();


