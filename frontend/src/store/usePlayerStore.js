import { create } from 'zustand';
import { getAudioUrl, getImageUrl, apiFetch } from '../api/client.js';
import { addToHistory, addGenrePlay } from '../utils/history.js';
import { pickBestNext } from '../utils/autoMix.js';
import { audioEngine } from '../utils/audioEngine.js';
import { parseLrc } from '../utils/helpers.js';
import { logPlaybackEvent, getUserId } from '../utils/telemetry.js';

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

if (!window.__mehfilLocalClientId) {
    window.__mehfilLocalClientId = Math.random().toString(36).substring(2, 15);
}
const localClientId = window.__mehfilLocalClientId;

const getLocalUser = () => {
    try {
        const u = JSON.parse(localStorage.getItem('mehfilUser'));
        return u || { name: 'Guest', profilePicture: '/dp.png' };
    } catch {
        return { name: 'Guest', profilePicture: '/dp.png' };
    }
};

if (!window.__mehfilSyncChannel) {
    window.__mehfilSyncChannel = new BroadcastChannel('mehfil_sync_channel');
}
const syncChannel = window.__mehfilSyncChannel;

const getSyncSocket = () => window.__mehfilSyncSocket || null;
const setSyncSocket = (ws) => { window.__mehfilSyncSocket = ws; };

const closeSyncSocket = () => {
    const ws = getSyncSocket();
    if (ws) {
        try { ws.close(); } catch(e){}
        setSyncSocket(null);
    }
};

const sendSyncMessage = (msg) => {
    const ws = getSyncSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify({ ...msg, senderId: localClientId }));
        } catch(e) {
            console.warn('Failed to send sync message:', e);
        }
    }
};

const connectWebSocket = (code, role) => {
    const store = usePlayerStore.getState();
    if (!store.sessionCode || store.sessionCode !== code) return;

    closeSyncSocket();
    
    try {
        const ws = new WebSocket(`wss://free.blr2.piesocket.com/v3/${code}?api_key=az7W14MabuOslb5Pf6Wibho2A3zN5P1GRut26JL5&notify_self=1`);
        setSyncSocket(ws);
        
        ws.onopen = () => {
            console.log(`[Sync] WebSocket ${role} connection established:`, code);
            
            sendSyncMessage({
                type: 'user_joined',
                sessionCode: code,
                user: getLocalUser()
            });

            if (role === 'host') {
                broadcastHostState(true);
            } else {
                sendSyncMessage({
                    type: 'request_sync',
                    sessionCode: code
                });
            }
        };

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                handleIncomingSyncMessage(data);
            } catch (err) {
                console.warn('[Sync] Failed to parse WebSocket message:', err);
            }
        };

        ws.onerror = (err) => {
            console.warn('[Sync] WebSocket error:', err);
        };

        ws.onclose = (e) => {
            console.log('[Sync] WebSocket closed:', e);
            const currentStore = usePlayerStore.getState();
            if (currentStore.sessionCode === code) {
                console.log('[Sync] Attempting to reconnect in 3 seconds...');
                setTimeout(() => {
                    connectWebSocket(code, role);
                }, 3000);
            }
        };
    } catch (err) {
        console.error('[Sync] Failed to initialize WebSocket:', err);
    }
};

const broadcastHostState = (force = false) => {
    const store = usePlayerStore.getState();
    if (store.sessionCode && (store.isCoordinator || force)) {
        const audio = store.activeChannel === 'A' ? audioA : audioB;
        const payload = {
            type: 'sync_state',
            sessionCode: store.sessionCode,
            payload: {
                song: store.currentSong,
                isPlaying: store.isPlaying,
                currentTime: audio.currentTime,
                queue: store.queue,
                queueIndex: store.queueIndex,
                shuffle: store.shuffle,
                repeat: store.repeat,
                timestamp: Date.now()
            }
        };
        if (syncChannel) {
            try { syncChannel.postMessage({ ...payload, senderId: localClientId }); } catch(e){}
        }
        sendSyncMessage(payload);
    }
};

const handleIncomingSyncMessage = async (data) => {
    const { type, sessionCode, senderId, payload, user, targetId } = data;
    if (senderId === localClientId) return; // Ignore our own messages!
    const store = usePlayerStore.getState();
    if (!store.sessionCode || store.sessionCode !== sessionCode) return;

    if (type === 'kick_user' && targetId === localClientId) {
        alert("You have been removed from the session by the host.");
        usePlayerStore.getState().leaveSession();
        return;
    }

    if (type === 'user_joined' || type === 'user_present') {
        if (user) {
            usePlayerStore.setState(state => {
                const exists = state.participants.find(p => p.id === senderId);
                if (exists) {
                    return {
                        participants: state.participants.map(p => p.id === senderId ? { ...p, lastSeen: Date.now() } : p)
                    };
                }
                return { participants: [...state.participants, { id: senderId, ...user, lastSeen: Date.now() }] };
            });
            if (type === 'user_joined') {
                sendSyncMessage({ type: 'user_present', sessionCode, user: getLocalUser() });
            }
        }
    } else if (type === 'user_left') {
        usePlayerStore.setState(state => ({
            participants: state.participants.filter(p => p.id !== senderId)
        }));
    } else if (type === 'request_sync') {
        if (store.isCoordinator || store.sessionRole === 'host') {
            broadcastHostState(true);
        }
    } else if (type === 'sync_state') {
        usePlayerStore.setState({ isCoordinator: false });

        const { song, isPlaying, currentTime, queue, queueIndex, shuffle, repeat, timestamp } = payload;

        // Replicate queue
        const queueChanged = JSON.stringify(store.queue.map(s => s.id)) !== JSON.stringify((queue || []).map(s => s.id));
        if (queueChanged) {
            usePlayerStore.setState({ queue: queue || [], queueIndex: queueIndex });
        } else if (store.queueIndex !== queueIndex) {
            usePlayerStore.setState({ queueIndex });
        }

        // Sync shuffle/repeat
        if (store.shuffle !== shuffle) {
            usePlayerStore.setState({ shuffle });
        }
        if (store.repeat !== repeat) {
            usePlayerStore.setState({ repeat });
            audioA.loop = repeat === 'one';
            audioB.loop = repeat === 'one';
        }

        // Sync current song
        if (!store.currentSong || store.currentSong.id !== song?.id) {
            if (song) {
                await store.playSong(song, false, true, true); // autoOpen=false, isFromQueue=true, isSync=true
            } else {
                usePlayerStore.setState({ currentSong: null, isPlaying: false });
            }
        }

        // Sync play state
        const channel = usePlayerStore.getState().activeChannel;
        const audio = channel === 'A' ? audioA : audioB;

        if (isPlaying) {
            if (audio.paused) {
                audio.play().catch((err) => {
                    console.warn('[Sync] Play blocked by browser autoplay policy:', err);
                });
            }
        } else {
            audioA.pause();
            audioB.pause();
        }

        if (isPlaying !== store.isPlaying) {
            usePlayerStore.setState({ isPlaying });
        }

        // Sync currentTime with latency correction
        if (isPlaying) {
            const latency = (Date.now() - timestamp) / 1000;
            const targetTime = currentTime + (latency > 0 && latency < 5 ? latency : 0);

            if (Math.abs(audio.currentTime - targetTime) > 1.5) {
                audio.currentTime = Math.min(audio.duration || Infinity, targetTime);
            }
        } else {
            if (Math.abs(audio.currentTime - currentTime) > 1.5) {
                audio.currentTime = currentTime;
            }
        }
    }
};

// Hard-init the pro engine once
audioEngine.init(audioA, audioB);

// ── Lyrics Cache (keyed by song ID, survives song changes within a session) ──
const lyricsCache = new Map();

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

    sessionCode: null,
    sessionRole: null, // 'host' | 'listener'
    isCoordinator: false,
    participants: [],
    lyrics: null,
    lyricsLoading: false,
    lyricsError: false, // true when the upstream fetch itself failed (vs. simply not found)

    volume: 0.8,
    isMuted: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',  // 'off' | 'all' | 'one'
    isAutoMixEnabled: (() => { try { return localStorage.getItem('mehfil_automix_enabled') !== 'false'; } catch { return true; } })(),
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
    toggleAutoMix: () => set((state) => {
        const nextVal = !state.isAutoMixEnabled;
        try { localStorage.setItem('mehfil_automix_enabled', String(nextVal)); } catch (e) {}
        return { isAutoMixEnabled: nextVal };
    }),

    createSession: () => {
        const code = `MEHFIL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        set({ sessionCode: code, sessionRole: 'host', isCoordinator: true });
        
        connectWebSocket(code, 'host');

        if (syncChannel) {
            try {
                syncChannel.postMessage({
                    type: 'request_sync',
                    sessionCode: code,
                    senderId: localClientId
                });
            } catch(e){}
        }
        return code;
    },

    joinSession: (code) => {
        if (!code) return;
        const formattedCode = code.trim().toUpperCase();
        set({ sessionCode: formattedCode, sessionRole: 'listener', isCoordinator: false });
        
        connectWebSocket(formattedCode, 'listener');

        if (syncChannel) {
            try {
                syncChannel.postMessage({
                    type: 'request_sync',
                    sessionCode: formattedCode,
                    senderId: localClientId
                });
            } catch(e){}
        }
    },

    leaveSession: () => {
        const state = get();
        if (state.sessionCode) {
            sendSyncMessage({ type: 'user_left', sessionCode: state.sessionCode });
            if (syncChannel) {
                try { syncChannel.postMessage({ type: 'user_left', sessionCode: state.sessionCode, senderId: localClientId }); } catch(e){}
            }
        }
        closeSyncSocket();
        set({ sessionCode: null, sessionRole: null, participants: [] });
    },
    
    kickUser: (targetId) => {
        const state = get();
        if (state.sessionRole !== 'host' || !state.sessionCode) return;
        const msg = { type: 'kick_user', sessionCode: state.sessionCode, targetId };
        sendSyncMessage(msg);
        if (syncChannel) {
            try { syncChannel.postMessage({ ...msg, senderId: localClientId }); } catch(e){}
        }
        set(s => ({ participants: s.participants.filter(p => p.id !== targetId) }));
    },

    fetchLyricsForSong: async (song) => {
        if (!song) return;

        // Return immediately from cache — no re-fetch for songs already resolved
        const cacheKey = song.id || song.title;
        if (cacheKey && lyricsCache.has(cacheKey)) {
            set({ lyrics: lyricsCache.get(cacheKey), lyricsLoading: false, lyricsError: false });
            return;
        }

        // Decode HTML entities (e.g. &amp; &quot; from JioSaavn) so lrclib gets a clean query
        const rawTitle = decodeEntities(song.title || '');
        const rawArtist = decodeEntities(song.primaryArtists || song.subtitle || '');
        const query = `${rawTitle} ${rawArtist}`.trim();

        try {
            const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error(`lrclib responded ${res.status}`);
            const data = await res.json();
            const match = data && data[0];
            if (match) {
                const parsedSynced = match.syncedLyrics ? parseLrc(match.syncedLyrics) : [];
                const lyricsPayload = {
                    plain: match.plainLyrics || null,
                    synced: parsedSynced,
                    isSynced: parsedSynced.length > 0,
                    instrumental: match.instrumental || false
                };
                if (cacheKey) lyricsCache.set(cacheKey, lyricsPayload);
                set({ lyrics: lyricsPayload, lyricsLoading: false, lyricsError: false });
            } else {
                // No results — cache the "not found" result too to prevent repeated hits
                if (cacheKey) lyricsCache.set(cacheKey, null);
                set({ lyrics: null, lyricsLoading: false, lyricsError: false });
            }
        } catch (err) {
            console.warn('Lyrics fetch failed:', err);
            // Don't cache errors — a transient network issue should be retried on next visit
            set({ lyrics: null, lyricsLoading: false, lyricsError: true });
        }
    },


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
                // Only songs strictly before the current index pull the pointer back.
                // Removing the current song itself (i === currentIndex) must NOT shift it,
                // otherwise the insertion position ends up one slot too low.
                if (i < currentIndex) {
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

    addToQueue: (song) => {
        if (!song) return;
        
        const state = get();
        if (state.sessionCode) {
            set({ isCoordinator: true });
        }

        let currentQueue = [...state.queue];
        let currentIndex = state.queueIndex;
        
        let newQueue = [];
        let newCurrentIndex = currentIndex;
        
        for (let i = 0; i < currentQueue.length; i++) {
            const s = currentQueue[i];
            if (s.id === song.id) {
                if (i < currentIndex) newCurrentIndex--;
                else if (i === currentIndex) return; 
            } else {
                newQueue.push(s);
            }
        }
        
        const insertPos = newCurrentIndex >= 0 ? newCurrentIndex + 1 : 0;
        newQueue.splice(insertPos, 0, song);
        
        set({ queue: newQueue, queueIndex: newCurrentIndex });
        broadcastHostState();
    },

    playSong: async (rawSong, autoOpen = true, isFromQueue = false, isSync = false) => {

        const state = get();
        if (!rawSong) return;

        if (state.sessionCode && !isSync) {
            set({ isCoordinator: true });
        }

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

        // Peek at the lyrics cache before committing state.
        // If the song is already cached, apply lyrics atomically — no flash, no spinner.
        // undefined = not in cache (triggers fetch); null = cached "not found"
        const lyricsCacheKey = song.id || song.title;
        const cachedLyrics = lyricsCache.has(lyricsCacheKey)
            ? lyricsCache.get(lyricsCacheKey)
            : undefined;

        if (freshState.currentSong && freshState.currentSong.id !== song.id) {
            const prevAudio = freshState.activeChannel === 'A' ? audioA : audioB;
            const isCompleted = freshState.isTransitioning || (prevAudio.duration && prevAudio.duration - prevAudio.currentTime < 2);
            logPlaybackEvent({ 
                track: freshState.currentSong, 
                eventType: isCompleted ? 'play_completed' : 'skipped',
                durationListenedMs: Math.round(prevAudio.currentTime * 1000)
            });
        }
        
        logPlaybackEvent({ track: song, eventType: 'play_started' });

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
            isTransitioning: false,
            lyrics: cachedLyrics !== undefined ? cachedLyrics : null,
            lyricsLoading: cachedLyrics === undefined, // only true when a fetch is actually needed
            lyricsError: false
        });

        // Only fetch when not already in cache
        if (cachedLyrics === undefined) {
            get().fetchLyricsForSong(song);
        }
        if (!isSync) {
            broadcastHostState();
        }


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
        if (get().sessionCode) {
            set({ isCoordinator: true });
        }
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;
        set({ queueIndex: index });
        get().playSong(queue[index], true, true);
    },

    togglePlay: () => {
        const { isPlaying, currentSong, sessionCode } = get();
        if (!currentSong) return;

        if (sessionCode) {
            set({ isCoordinator: true });
        }

        if (isPlaying) {
            audioA.pause();
            audioB.pause();
        } else {
            const channel = get().activeChannel;
            const audio = channel === 'A' ? audioA : audioB;
            audio.play().catch(() => { });
        }
        set({ isPlaying: !isPlaying });
        broadcastHostState();
    },



    nextSong: async () => {
        const { queue, queueIndex, shuffle, repeat, activeChannel, sessionCode, isAutoMixEnabled, currentSong } = get();
        if (!queue.length && !currentSong) return;

        if (sessionCode) {
            set({ isCoordinator: true });
        }

        const audio = activeChannel === 'A' ? audioA : audioB;

        let next;
        if (shuffle && queue.length > 1) {
            next = Math.floor(Math.random() * queue.length);
        } else if (queueIndex < queue.length - 1) {
            next = queueIndex + 1;
        } else if (repeat === 'all') {
            next = 0;
        } else if (isAutoMixEnabled) {
            // AutoMix / Auto Recommendation mode: fetch and append next recommendation!
            try {
                const { getRecommendations } = await import('../utils/recommendations.js');
                const recs = await getRecommendations(5, currentSong);
                const candidates = recs.filter(r => r && r.id !== currentSong?.id && !queue.some(q => q.id === r.id));
                const nextRecommended = candidates[0] || recs[0];
                if (nextRecommended) {
                    const newQueue = [...queue, nextRecommended];
                    set({ queue: newQueue, queueIndex: newQueue.length - 1, isPrepared: true });
                    get().playSong(nextRecommended, false, true);
                    return;
                }
            } catch (err) {
                console.warn('[AutoMix] Failed auto-queue next song:', err);
            }
            // Fallback if no recommendation could be fetched
            next = 0;
        } else {
            next = 0;
        }

        if (next !== undefined && queue[next]) {
            set({ queueIndex: next });
            get().playSong(queue[next], false, true);
        }
    },

    prevSong: () => {
        const { queue, queueIndex, activeChannel, sessionCode } = get();
        if (sessionCode) {
            set({ isCoordinator: true });
        }
        const audio = activeChannel === 'A' ? audioA : audioB;
        if (!queue.length || audio.currentTime > 3 || queue.length === 1 || queueIndex === 0) {
            audio.currentTime = 0;
            audio.play().catch(() => { });
            broadcastHostState();
            return;
        }
        const prev = Math.max(0, queueIndex - 1);
        set({ queueIndex: prev });
        get().playSong(queue[prev], false, true);
    },

    seek: (pct) => {
        const { activeChannel, sessionCode } = get();
        if (sessionCode) {
            set({ isCoordinator: true });
        }
        const audio = activeChannel === 'A' ? audioA : audioB;
        if (!audio.duration) return;
        audio.currentTime = (pct / 100) * audio.duration;
        // Reset flags on manual seek
        set({ isPrepared: false, isTransitioning: false });
        broadcastHostState();
    },

    // ── AutoMix Engine Handlers ──
    prepareNextSong: async () => {
        const state = get();
        if (state.isPrepared || !state.currentSong) return;

        console.log('[AutoMix] Analyzing for best match (10s mark)...');

        let pool = state.queue.filter(s => s && s.id !== state.currentSong.id);

        if (pool.length < 5) {
            try {
                const { getRecommendations } = await import('../utils/recommendations.js');
                const recs = await getRecommendations(10, state.currentSong);
                pool = [...pool, ...recs];
            } catch (err) { }
        }

        let next = null;
        try {
            // Attempt to get recommendation from ML Microservice
            const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';
            const mlRes = await fetch(`${ML_API_URL}/api/ml/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: getUserId() || 'guest',
                    current_track_id: state.currentSong.id,
                    limit: 1,
                    client_hour: new Date().getHours()
                })
            });
            const mlData = await mlRes.json();
            
            if (mlData.success && mlData.recommendations.length > 0) {
                const recommendedId = mlData.recommendations[0].track_id;
                const found = pool.find(s => s && s.id === recommendedId);
                if (found) {
                    next = { ...found, mlQueued: true };
                }
            }
        } catch (mlErr) {
            // Optional ML Service
        }

        // Fallback to local autoMix scoring logic
        if (!next) {
            next = pickBestNext(pool, state.currentSong);
        }

        if (next) {
            console.log('[AutoMix] Preloading next song:', next.title || next.name);
            const inQueue = state.queue.some(s => s && s.id === next.id);
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



    toggleShuffle: () => {
        if (get().sessionCode) {
            set({ isCoordinator: true });
        }
        set(s => ({ shuffle: !s.shuffle }));
        broadcastHostState();
    },

    cycleRepeat: () => {
        if (get().sessionCode) {
            set({ isCoordinator: true });
        }
        set(s => {
            const modes = ['off', 'all', 'one'];
            const next = modes[(modes.indexOf(s.repeat) + 1) % modes.length];
            audioA.loop = next === 'one';
            audioB.loop = next === 'one';
            return { repeat: next };
        });
        broadcastHostState();
    },

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

        // 🎯 Listen Together: Coordinator broadcasts periodic updates to maintain sync
        if (store.sessionCode && store.isCoordinator) {
            const now = Date.now();
            if (!window.__mehfilLastBroadcast || now - window.__mehfilLastBroadcast > 1000) {
                window.__mehfilLastBroadcast = now;
                broadcastHostState();
            }
        }
    };


    const handleEnded = (e) => {
        const store = usePlayerStore.getState();
        const audio = e.target;
        if (store.activeChannel !== (audio === audioA ? 'A' : 'B')) return;

        if (store.currentSong && !store.isTransitioning) {
            logPlaybackEvent({ 
                track: store.currentSong, 
                eventType: 'play_completed',
                durationListenedMs: Math.round(audio.currentTime * 1000)
            });
        }

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

if (syncChannel) {
    syncChannel.onmessage = (e) => {
        handleIncomingSyncMessage(e.data);
    };
}

const activeSocket = getSyncSocket();
if (activeSocket) {
    activeSocket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            handleIncomingSyncMessage(data);
        } catch (err) {
            console.warn('[Sync] Failed to parse WebSocket message:', err);
        }
    };
}



