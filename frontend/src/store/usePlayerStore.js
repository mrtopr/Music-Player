import { create } from 'zustand';
import { getAudioUrl, getImageUrl, apiFetch, API_BASE_URL } from '../api/client.js';
import { addToHistory, addGenrePlay } from '../utils/history.js';
import { pickBestNext } from '../utils/autoMix.js';
import { audioEngine } from '../utils/audioEngine.js';
import { autoMixEngine } from '../automix/index.js';
import { ENGINE_EVENTS } from '../automix/engine/events.js';
import { getOfflineTracks, saveTrackOffline, removeTrackOffline, isTrackOffline } from '../utils/offlineStorage.js';
import { logPlaybackEvent, getUserId } from '../utils/telemetry.js';
import { fetchLyrics as fetchLyricsMulti } from '../utils/lyricsProvider.js';
import {
    planTransition,
    serializeTransition,
    deserializeTransition,
    transitionKey,
    buildTransitionCurves,
    findTransitionPoint,
} from '../utils/transitions.js';
import { analyzeTracks, getAnalysis } from '../utils/audioAnalysis.js';
import { transitionScore } from '../automix/scoring/compatibility.js';

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
        const pieSocketKey = import.meta.env.VITE_PIESOCKET_API_KEY || 'VCXCEuvhGcBDP7XhiJJUDvR1e1D3eiVjgZ9f6';
        const ws = new WebSocket(`wss://free.blr2.piesocket.com/v3/${code}?api_key=${pieSocketKey}&notify_self=1`);
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

// ── The AutoMix engine owns both decks (audio graph + mixing) ──
autoMixEngine.init();
// Restore the persisted AutoMix preference (the engine is not persisted).
try {
    autoMixEngine.setEnabled(localStorage.getItem('mehfil_mix_enabled') === 'true');
} catch {
    autoMixEngine.setEnabled(false);
}



// ── AutoMix engine → store bridge ────────────────────────────────────────
// The engine is the source of truth; the store mirrors its state so React
// can render it. Every visual state in the UI comes from these events.

const describeTrack = (track, analysis) => ({
    id: track?.id,
    title: track?.title || track?.name || 'Unknown',
    artist:
        track?.primaryArtists ||
        track?.subtitle ||
        track?.artist ||
        (Array.isArray(track?.artists) ? track.artists.map((a) => a?.name).filter(Boolean).join(', ') : ''),
    image: track?.image || null,
    bpm: analysis?.bpm ?? null,
    camelot: analysis?.camelot ?? null,
    key: analysis?.key ?? null,
    energy: analysis?.energy ?? null,
});

autoMixEngine.on(ENGINE_EVENTS.STATE, ({ state }) => {
    usePlayerStore.setState((s) => ({
        automix: {
            ...s.automix,
            state,
            // The engine went back to idle → retire the overlay.
            phase: state === 'idle' ? 'idle' : s.automix.phase,
            progress: state === 'idle' ? 0 : s.automix.progress,
        },
    }));
});

autoMixEngine.on(ENGINE_EVENTS.ANALYSIS_READY, ({ track, analysis }) => {
    if (!track?.id || !analysis) return;
    usePlayerStore.setState((s) => ({
        mixAnalysis: { ...s.mixAnalysis, [track.id]: analysis },
        automix: {
            ...s.automix,
            outgoing: s.currentSong?.id === track.id
                ? describeTrack(track, analysis)
                : s.automix.outgoing,
        },
    }));
});

autoMixEngine.on(ENGINE_EVENTS.DECK_LOADING, ({ track, title }) => {
    usePlayerStore.setState((s) => ({
        automix: {
            ...s.automix,
            phase: 'loading',
            outgoing: describeTrack(s.currentSong, s.mixAnalysis?.[s.currentSong?.id]),
            incoming: { ...describeTrack(track || { title }), title: track?.title || title },
            error: null,
        },
    }));
});

autoMixEngine.on(ENGINE_EVENTS.DECK_ANALYZING, () => {
    usePlayerStore.setState((s) => ({ automix: { ...s.automix, phase: 'analyzing' } }));
});

autoMixEngine.on(ENGINE_EVENTS.DECK_SYNCING, ({ bpm, targetBpm }) => {
    usePlayerStore.setState((s) => ({
        automix: {
            ...s.automix,
            phase: 'syncing',
            tempoRatio: bpm && targetBpm ? targetBpm / bpm : null,
        },
    }));
});

autoMixEngine.on(ENGINE_EVENTS.DECK_READY, ({ track, analysis, ratio, plan, score }) => {
    usePlayerStore.setState((s) => ({
        automix: {
            ...s.automix,
            phase: 'ready',
            incoming: describeTrack(track, analysis),
            style: plan?.style ?? null,
            reason: plan?.reason ?? null,
            tempoRatio: ratio ?? null,
            keyCompatibility: plan?.keyCompatibility ?? null,
            score: score ?? null,
        },
        mixAnalysis: analysis && track ? { ...s.mixAnalysis, [track.id]: analysis } : s.mixAnalysis,
    }));
});

autoMixEngine.on(ENGINE_EVENTS.DECK_FAILED, ({ reason }) => {
    usePlayerStore.setState((s) => ({
        automix: { ...s.automix, phase: 'error', error: reason },
    }));
});

autoMixEngine.on(ENGINE_EVENTS.TRANSITION_SCHEDULED, ({ plan, track, analysis, ratio }) => {
    usePlayerStore.setState((s) => ({
        automix: {
            ...s.automix,
            phase: 'scheduled',
            style: plan?.style ?? null,
            reason: plan?.reason ?? null,
            incoming: describeTrack(track, analysis),
            tempoRatio: ratio ?? null,
            outgoing: describeTrack(s.currentSong, s.mixAnalysis?.[s.currentSong?.id]),
        },
    }));
});

autoMixEngine.on(ENGINE_EVENTS.TRANSITION_STARTING, ({ track, analysis }) => {
    usePlayerStore.setState((s) => ({
        automix: {
            ...s.automix,
            phase: 'mixing',
            progress: 0,
            incoming: describeTrack(track, analysis),
        },
    }));
});

autoMixEngine.on(ENGINE_EVENTS.TRANSITION_MIXING, ({ progress }) => {
    usePlayerStore.setState((s) => ({ automix: { ...s.automix, progress } }));
});

autoMixEngine.on(ENGINE_EVENTS.TRANSITION_COMPLETE, ({ track }) => {
    usePlayerStore.setState((s) => ({
        automix: { ...s.automix, phase: 'done', progress: 1, error: null },
    }));
    usePlayerStore.getState().commitMixHandover(track);
});

// ── Lyrics Cache (keyed by song ID, survives song changes within a session) ──
const lyricsCache = new Map();

// How long before the blend starts the AutoMix takeover appears, so the
// handover is signposted instead of arriving suddenly.
const MIX_APPROACH_SECONDS = 6;

// ── Mix transition persistence (per playlist) ──
const persistMixTransitions = (playlistId, transitions) => {
    if (!playlistId) return;
    try {
        localStorage.setItem(`mehfil_mix_${playlistId}`, JSON.stringify(transitions));
    } catch (e) {
        console.warn('[Mix] Could not persist transitions:', e);
    }
};

// Curve edits fire on every pointer move — debounce the disk write.
let mixPersistTimer = null;
const persistMixTransitionsDebounced = (playlistId, transitions) => {
    if (!playlistId) return;
    if (mixPersistTimer) clearTimeout(mixPersistTimer);
    mixPersistTimer = setTimeout(() => {
        mixPersistTimer = null;
        persistMixTransitions(playlistId, transitions);
    }, 400);
};

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

    musicSource: (() => { try { return localStorage.getItem('mehfil_music_source') || 'auto'; } catch { return 'auto'; } })(),
    activeChannel: 'A', // 'A' | 'B'


    // Equalizer State
    equalizer: { bass: 0, mid: 0, treble: 0 },

    // ── Mix State (Spotify-style seamless transitions) ──
    mixEnabled: (() => { try { return localStorage.getItem('mehfil_mix_enabled') === 'true'; } catch { return false; } })(),
    mixPlaylistId: null,
    mixTransitions: {},        // { 'fromId->toId': transitionSpec }
    mixAnalysis: {},           // { trackId: { bpm, camelot, waveform, ... } }
    mixAnalyzing: false,
    mixProgress: { done: 0, total: 0 },
    /** True while the "Mix" button is starting a mix. */
    isStartingMix: false,
    /** Ids of the tracks already played in this mix (shuffle mode). */
    mixPlayedIds: [],

    // ── AutoMix engine state (mirrors the real engine, drives the UI) ──
    automix: {
        state: 'idle',           // engine FSM state
        phase: 'idle',           // 'idle' | 'loading' | 'analyzing' | 'syncing' | 'ready' | 'mixing' | 'done' | 'error'
        outgoing: null,          // { title, artist, image, bpm, camelot }
        incoming: null,          // { title, artist, image, bpm, camelot }
        progress: 0,             // 0..1 during the blend
        style: null,             // transition style currently used
        reason: null,            // why the engine picked it
        error: null,
        tempoRatio: null,
        keyCompatibility: null,
    },



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
        const exists = state.likedSongs.findIndex(s => String(s.id) === String(song.id));
        const newLikes = [...state.likedSongs];
        if (exists >= 0) newLikes.splice(exists, 1);
        else newLikes.push(song);
        try { localStorage.setItem('likedSongs', JSON.stringify(newLikes)); } catch { }
        return { likedSongs: newLikes };
    }),

    isVideoMode: false,

    setFullScreen: (val) => set({ isFullScreen: val }),
    setVideoMode: (val) => set({ isVideoMode: val }),
    toggleVideoMode: () => set(state => ({ isVideoMode: !state.isVideoMode })),
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

    fetchLyricsForSong: async (song, force = false) => {
        if (!song) return;

        // Return immediately from cache — no re-fetch for songs already resolved
        const cacheKey = song.id || song.title;
        if (!force && cacheKey && lyricsCache.has(cacheKey)) {
            const cached = lyricsCache.get(cacheKey);
            set({ lyrics: cached, lyricsLoading: false, lyricsError: false });
            return;
        }

        set({ lyricsLoading: true, lyricsError: false });

        try {
            // Read user's preferred provider from localStorage, fall back to auto-select
            const preferredProvider = typeof localStorage !== 'undefined'
                ? localStorage.getItem('mehfil_lyrics_provider') || 'auto'
                : 'auto';

            // Multi-source chain: backend aggregator first, then direct providers.
            const result = await fetchLyricsMulti(song, preferredProvider, { force });

            if (result) {
                if (cacheKey) lyricsCache.set(cacheKey, result);
                set({
                    lyrics: result,
                    lyricsLoading: false,
                    lyricsError: false,
                });
                console.log(`[Lyrics] Source: ${result.sourceName} (${result.isSynced ? "synced" : "plain"})`);
            } else {
                // No results from any provider — cache null
                if (cacheKey) lyricsCache.set(cacheKey, null);
                set({ lyrics: null, lyricsLoading: false, lyricsError: false });
            }
        } catch (err) {
            console.warn('Lyrics fetch failed:', err);
            // Don't cache errors — transient network issue should be retried
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

    playSong: async (rawSong, autoOpen = false, isFromQueue = false, isSync = false, mixOptions = null) => {

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
            : (rawSong.genre || null);
        if (songGenre && songGenre.toLowerCase() !== 'song') addGenrePlay(songGenre);

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

        // The AutoMix engine needs the current track's tempo and key to plan
        // the transition into the next one.
        autoMixEngine.setCurrentTrack(song);
        // Keep the engine's active deck in sync with the store's transport.
        autoMixEngine.setActiveDeck(nextChannel);
        if (get().mixEnabled) {
            autoMixEngine.ensureAnalysis(song);
            // Remember what has played — shuffle mode picks the next track
            // from the ones that have not been played yet.
            set((s) => ({
                mixPlayedIds: s.mixPlayedIds.includes(song.id)
                    ? s.mixPlayedIds
                    : [...s.mixPlayedIds, song.id],
            }));
        }
        if (!isSync) {
            broadcastHostState();
        }

        // ── YouTube songs: pause native audio engine, delegate to YouTubeHiddenPlayer ──
        if (song.id && song.id.startsWith('yt_')) {
            // Stop any playing JioSaavn audio immediately
            audioA.pause();
            audioB.pause();
            audioA.currentTime = 0;
            audioB.currentTime = 0;

            // State was already committed above (currentSong, isPlaying, etc.).
            // The YouTubeHiddenPlayer useEffect will pick up the new currentSong.id
            // and load/play the video automatically.
            return;
        }

        // ── JioSaavn songs: stop any playing YouTube track ──
        if (window.__ytPlayerInstance) {
            try {
                window.__ytPlayerInstance.pauseVideo?.();
                window.__ytPlayerInstance.stopVideo?.();
            } catch (e) {}
        }

        let url = song.offlineAudioUrl || getAudioUrl(song.downloadUrl);

        if (!url && song.id) {
            try {
                const isOfflineSaved = await isTrackOffline(song.id);
                if (isOfflineSaved) {
                    const offlineList = await getOfflineTracks();
                    const match = offlineList.find(t => t.id === song.id);
                    if (match && match.offlineAudioUrl) url = match.offlineAudioUrl;
                }
            } catch (e) {}

            if (!url) {
                try {
                    const { apiFetch } = await import('../api/client.js');
                    const detailRes = await apiFetch('/api/songs', { id: song.id });
                    if (detailRes && detailRes[0]) {
                        song = { ...song, ...detailRes[0] };
                        url = getAudioUrl(song.downloadUrl);
                    }
                } catch (err) { }
            }
        }

        if (!url) return console.warn('No URL for:', song.title);

        await audioEngine.resume();
        const currentAudio = state.activeChannel === 'A' ? audioA : audioB;

        nextAudio.src = url;
        nextAudio.loop = state.repeat === 'one';
        nextAudio.load();

        // 🎯 Manual clicks (autoOpen=true) use 800ms fade. Auto-mix uses 5s fade.
        //    A "Mix" transition overrides both with its own automation curves.
        const CROSSFADE_TIME = autoOpen ? 800 : 5000;
        const transition = mixOptions?.transition || null;

        if (transition) {
            // ── Mix transition: the incoming track starts early and both
            //    channels are automated (volume, EQ, filter) until the blend ends.
            audioEngine.applyTransition(state.activeChannel, nextChannel, transition, state.volume);
            await nextAudio.play().catch(e => console.warn('Play blocked:', e));
        } else {
            if (state.currentSong) {
                audioEngine.crossfade(state.activeChannel, nextChannel, CROSSFADE_TIME, state.volume);
            } else {
                audioEngine.sync(nextChannel, state.volume);
            }

            await nextAudio.play().catch(e => console.warn('Play blocked:', e));
            audioEngine.sync(nextChannel, state.volume);
        }

        const blendMs = transition ? transition.durationMs : CROSSFADE_TIME;

        setTimeout(() => {
            const freshState = usePlayerStore.getState();
            // ONLY pause previous if we are still on the expected channel (prevents racing)
            if (freshState.activeChannel === nextChannel) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                // Restore a flat chain on the channel that just went idle.
                audioEngine.resetChannel(state.activeChannel);
            }
        }, blendMs + 200);

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



    playQueue: (songs, startIndex = 0, autoOpen = false) => {
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
        get().playSong(queue[index], false, true);
    },

    togglePlay: () => {
        const { isPlaying, currentSong, sessionCode } = get();
        if (!currentSong) return;

        if (sessionCode) {
            set({ isCoordinator: true });
        }

        // ── YouTube song: delegate to hidden iframe player ──
        if (currentSong?.id?.startsWith('yt_')) {
            const ytPlayer = window.__ytPlayerInstance;
            if (ytPlayer) {
                if (isPlaying) ytPlayer.pauseVideo?.();
                else ytPlayer.playVideo?.();
            }
            set({ isPlaying: !isPlaying });
            broadcastHostState();
            return;
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



    nextSong: async (options = {}) => {
        const { queue, queueIndex, shuffle, repeat, activeChannel, sessionCode, isAutoMixEnabled, currentSong } = get();
        if (!queue.length && !currentSong) return;

        if (sessionCode) {
            set({ isCoordinator: true });
        }

        const audio = activeChannel === 'A' ? audioA : audioB;

        // ── Mix mode: follow the playlist order and blend into the next track ──
        if (options.mix) {
            const nextIndex = queueIndex < queue.length - 1
                ? queueIndex + 1
                : (repeat === 'all' ? 0 : -1);

            if (nextIndex >= 0 && queue[nextIndex]) {
                const nextTrack = queue[nextIndex];
                set({ queueIndex: nextIndex });
                const transition = get().resolveMixTransition(currentSong, nextTrack);
                console.log('[Mix] Blending into:', nextTrack.title || nextTrack.name, '·', transition?.presetId, `${transition?.durationMs}ms`);
                get().playSong(nextTrack, false, true, false, transition ? { transition } : null);
                return;
            }
        }

        // Repeat One handling: replay current song
        if (repeat === 'one') {
            if (currentSong) {
                if (currentSong?.id?.startsWith('yt_')) {
                    const ytPlayer = window.__ytPlayerInstance;
                    ytPlayer?.seekTo?.(0, true);
                    ytPlayer?.playVideo?.();
                    set({ progress: 0, currentTime: 0, isPlaying: true });
                    return;
                }
                audio.currentTime = 0;
                audio.play().catch(() => {});
                set({ progress: 0, currentTime: 0, isPlaying: true, isTransitioning: false, isPrepared: false });
                return;
            }
        }

        let next;
        if (shuffle && queue.length > 1) {
            let randIndex;
            do {
                randIndex = Math.floor(Math.random() * queue.length);
            } while (randIndex === queueIndex && queue.length > 1);
            next = randIndex;
        } else if (queueIndex < queue.length - 1) {
            next = queueIndex + 1;
        } else if (repeat === 'all') {
            next = 0;
        } else if (isAutoMixEnabled) {
            // AutoMix / Auto Recommendation mode: fetch and append next recommendation!
            try {
                const { getRecommendations } = await import('../utils/recommendations.js');
                const recs = await getRecommendations(8, currentSong);
                const candidates = recs.filter(r => r && r.id !== currentSong?.id && !queue.some(q => q.id === r.id));
                const pickIndex = shuffle && candidates.length > 1 ? Math.floor(Math.random() * candidates.length) : 0;
                const nextRecommended = candidates[pickIndex] || recs[0];
                if (nextRecommended) {
                    const newQueue = [...queue, nextRecommended];
                    set({ queue: newQueue, queueIndex: newQueue.length - 1, isPrepared: true });
                    get().playSong(nextRecommended, false, true);
                    return;
                }
            } catch (err) {
                console.warn('[AutoMix] Failed auto-queue next song:', err);
            }
            next = 0;
        } else {
            // End of queue and repeat is off: stop playback cleanly
            set({ isPlaying: false, progress: 0, currentTime: 0 });
            audioA.pause();
            audioB.pause();
            audioA.currentTime = 0;
            audioB.currentTime = 0;
            return;
        }

        if (next !== undefined && queue[next]) {
            set({ queueIndex: next });
            get().playSong(queue[next], false, true);
        }
    },

    prevSong: () => {
        const { queue, queueIndex, activeChannel, sessionCode, currentSong, currentTime } = get();
        if (sessionCode) {
            set({ isCoordinator: true });
        }

        // ── YouTube song: seek to start or go previous ──
        if (currentSong?.id?.startsWith('yt_')) {
            const ytPlayer = window.__ytPlayerInstance;
            if (!queue.length || currentTime > 3 || queue.length === 1 || queueIndex === 0) {
                ytPlayer?.seekTo?.(0, true);
                broadcastHostState();
                return;
            }
            const prev = Math.max(0, queueIndex - 1);
            set({ queueIndex: prev });
            get().playSong(queue[prev], false, true);
            return;
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
        const { activeChannel, sessionCode, currentSong, duration } = get();
        if (sessionCode) {
            set({ isCoordinator: true });
        }

        // ── YouTube song: seek via IFrame API ──
        if (currentSong?.id?.startsWith('yt_')) {
            const ytPlayer = window.__ytPlayerInstance;
            const dur = ytPlayer?.getDuration?.() || duration || 0;
            if (ytPlayer && dur) {
                ytPlayer.seekTo((pct / 100) * dur, true);
            }
            const newTime = (pct / 100) * (duration || 0);
            set({ progress: pct, currentTime: newTime });
            broadcastHostState();
            return;
        }

        const audio = activeChannel === 'A' ? audioA : audioB;
        if (!audio.duration) return;
        audio.currentTime = (pct / 100) * audio.duration;
        // Reset flags on manual seek
        set({ isPrepared: false, isTransitioning: false });
        broadcastHostState();
    },

    // ── Mix Engine (Spotify-style seamless transitions) ──
    setMixEnabled: (enabled, playlistId = null) => {
        set({
            mixEnabled: enabled,
            mixPlaylistId: playlistId !== null ? playlistId : get().mixPlaylistId,
        });
        try { localStorage.setItem('mehfil_mix_enabled', enabled ? 'true' : 'false'); } catch {}
        get().setMixEngineEnabled(enabled);
    },

    /** Load the saved transition map for a playlist. */    loadMixTransitions: (playlistId) => {
        if (!playlistId) {
            set({ mixTransitions: {}, mixPlaylistId: null });
            return;
        }
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(`mehfil_mix_${playlistId}`) || '{}');
        } catch { saved = {}; }

        const mixTransitions = {};
        Object.entries(saved).forEach(([key, raw]) => {
            const spec = deserializeTransition(raw);
            if (spec) mixTransitions[key] = spec;
        });
        set({ mixTransitions, mixPlaylistId: playlistId });
    },

    /** Save (or clear, when spec is null) the transition between two tracks. */
    setMixTransition: (fromId, toId, spec) => {
        if (!fromId || !toId) return;
        const key = transitionKey(fromId, toId);
        const mixTransitions = { ...get().mixTransitions };
        if (spec) mixTransitions[key] = serializeTransition(spec);
        else delete mixTransitions[key];
        set({ mixTransitions });
        persistMixTransitionsDebounced(get().mixPlaylistId, mixTransitions);
    },

    resetMixTransition: (fromId, toId) => get().setMixTransition(fromId, toId, null),

    clearMixTransitions: () => {
        set({ mixTransitions: {} });
        persistMixTransitions(get().mixPlaylistId, {});
    },

    /** Build a transition from a preset + duration (used by the mix editor). */
    createMixTransition: (presetId, durationMs, fromId, toId) => {
        const spec = buildTransitionCurves(presetId, { durationMs });
        return spec;
    },

    /** Analyse a list of tracks (BPM / key / waveform). */
    analyzeMixTracks: async (songs) => {
        const list = (songs || []).filter((song) => song && song.id);
        if (!list.length) return;
        set({ mixAnalyzing: true, mixProgress: { done: 0, total: list.length } });
        try {
            const results = await analyzeTracks(list, {
                concurrency: 2,
                // Apply every result as soon as it lands so the list fills in live.
                onResult: (id, result) => {
                    if (!result) return;
                    set((state) => ({ mixAnalysis: { ...state.mixAnalysis, [id]: result } }));
                },
                onProgress: (done, total) => set({ mixProgress: { done, total } }),
            });
            const mixAnalysis = { ...get().mixAnalysis };
            for (const [id, result] of results) {
                if (result) mixAnalysis[id] = result;
            }
            set({
                mixAnalysis,
                mixAnalyzing: false,
                mixProgress: { done: list.length, total: list.length },
            });
        } catch (err) {
            console.warn('[Mix] Analysis failed:', err);
            set({ mixAnalyzing: false });
        }
    },

    /** The transition that will be used between two tracks (saved or auto). */
    resolveMixTransition: (fromSong, toSong) => {
        const { mixEnabled, mixTransitions, mixAnalysis } = get();
        if (!mixEnabled || !fromSong || !toSong) return null;
        if (fromSong.id === toSong.id) return null;

        const saved = mixTransitions[transitionKey(fromSong.id, toSong.id)];
        if (saved) return saved;

        return planTransition(mixAnalysis[fromSong.id], mixAnalysis[toSong.id]);
    },

    /** How many seconds before the end of a track the blend has to start. */
    getMixLeadTime: () => {
        const { mixEnabled, currentSong, queue, queueIndex, mixTransitions, mixAnalysis } = get();
        if (!mixEnabled || !currentSong) return 0;
        const next = queue[queueIndex + 1];
        if (!next) return 0;

        const saved = mixTransitions[transitionKey(currentSong.id, next.id)];
        if (saved) return Math.max(0.5, saved.durationMs / 1000);

        const planned = planTransition(mixAnalysis[currentSong.id], mixAnalysis[next.id]);
        return Math.max(0.5, planned.durationMs / 1000);
    },

    /** Beat-aligned spot inside the outgoing track where the blend starts. */
    getMixTransitionPoint: (fromSong, durationMs) => {
        const { mixAnalysis, mixTransitions, queue, queueIndex } = get();
        const analysis = mixAnalysis[fromSong?.id];
        if (!analysis) return null;

        // A saved transition may pin the blend to a manually chosen spot.
        const next = queue[queueIndex + 1];
        const saved = next ? mixTransitions[transitionKey(fromSong.id, next.id)] : null;
        if (saved && typeof saved.transitionPoint === 'number') return saved.transitionPoint;

        return findTransitionPoint(analysis, durationMs, analysis.duration);
    },

    /** The track that will play next (used by the AutoMix preparation). */
    getNextQueueTrack: () => {
        const {
            queue, queueIndex, repeat, shuffle,
            mixAnalysis, mixPlayedIds, currentSong,
        } = get();

        if (!queue.length) return null;

        // ── Shuffle mode: the next track is the one that MIXES BEST ──
        if (shuffle) {
            const played = new Set(mixPlayedIds || []);
            const candidates = queue.filter(
                (song) => song && !played.has(song.id) && song.id !== currentSong?.id,
            );
            if (!candidates.length) {
                return repeat === 'all' ? queue[0] : null;
            }

            const currentAnalysis = currentSong ? mixAnalysis[currentSong.id] : null;
            if (!currentAnalysis) {
                // Nothing analysed yet — pick at random.
                return candidates[Math.floor(Math.random() * candidates.length)];
            }

            let best = candidates[0];
            let bestScore = -Infinity;
            for (const candidate of candidates) {
                const analysis = mixAnalysis[candidate.id];
                let score = analysis ? transitionScore(currentAnalysis, analysis).total : 0;
                // A little jitter so the order is not identical every time.
                score += Math.random() * 8;
                if (score > bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }
            return best;
        }

        // ── Sequence mode: the next track in playlist order ──
        if (queueIndex < queue.length - 1) return queue[queueIndex + 1];
        if (repeat === 'all') return queue[0];
        return null;
    },

    /**
     * Starts a mix for a playlist: AutoMix on, playing from the first track.
     * The next track then follows the shuffle mode (see getNextQueueTrack).
     */
    startMix: async (tracks) => {
        const list = (tracks || []).filter(Boolean);
        if (!list.length) return;

        set({ isStartingMix: true, mixEnabled: true, mixPlayedIds: [] });
        get().setMixEngineEnabled(true);

        // Play the first track of the playlist and open the player.
        get().playQueue(list, 0, true);

        // Analyse it right away so the very first transition can be planned,
        // and keep analysing the rest in the background — in shuffle mode the
        // next track is chosen by how well it mixes.
        autoMixEngine.ensureAnalysis(list[0]);
        get().analyzeMixTracks(list);

        // Give the button a moment of feedback, then hand over to the player.
        setTimeout(() => set({ isStartingMix: false }), 900);
    },

    /** Stops the mix (the queue keeps playing normally). */
    stopMix: () => {
        get().setMixEngineEnabled(false);
        set({ mixEnabled: false, mixPlayedIds: [] });
    },

    /* ── AutoMix engine bridge ────────────────────────────────────────── */

    /** Starts (or stops) the intelligent AutoMix engine. */
    setMixEngineEnabled: (enabled) => {
        autoMixEngine.setEnabled(enabled);
        if (enabled) {
            // The track that is already playing needs its tempo/key too.
            const current = get().currentSong;
            if (current) autoMixEngine.ensureAnalysis(current);
        } else {
            set({
                automix: { ...get().automix, state: 'idle', phase: 'idle', progress: 0, incoming: null, error: null },
                isTransitioning: false,
            });
        }
    },

    /**
     * Commits the handover after the engine finished a blend: the engine has
     * already started the incoming deck, so this only updates state and the
     * per-track side effects.
     */
    commitMixHandover: (track) => {
        if (!track) return;
        const state = get();

        const index = state.queue.findIndex((song) => song.id === track.id);
        const normalised = { ...track };
        if (!normalised.title && normalised.name) normalised.title = normalised.name;
        if (!normalised.primaryArtists && normalised.artists?.primary) {
            normalised.primaryArtists = normalised.artists.primary.map((a) => a.name).join(', ');
        }

        set({
            currentSong: normalised,
            queueIndex: index >= 0 ? index : state.queueIndex + 1,
            // The engine swapped the decks when the blend finished — the
            // store must follow, otherwise every handler keeps watching the
            // deck that was just released.
            activeChannel: autoMixEngine.activeDeckId,
            // The incoming deck is already playing (it started during the
            // blend), so the player must not be marked as stopped.
            isPlaying: true,
            isTransitioning: false,
            isPrepared: false,
            progress: 0,
            currentTime: 0,
            mixPlayedIds: state.mixPlayedIds?.includes(normalised.id)
                ? state.mixPlayedIds
                : [...(state.mixPlayedIds || []), normalised.id],
        });

        addToHistory(normalised);
        logPlaybackEvent({ track: normalised, eventType: 'play_started' });
        get().fetchLyricsForSong(normalised);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: normalised.title?.replace(/&quot;/g, '"') || 'Unknown',
                artist: normalised.primaryArtists || normalised.subtitle || 'Unknown',
                artwork: [{ src: getImageUrl(normalised.image), sizes: '500x500' }],
            });
        }
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
            // ML recommendations are proxied through our own backend so the
            // browser never talks to the microservice directly (no CORS noise).
            // When the microservice is offline the backend answers 503 and we
            // fall through to the local auto-mix scoring below.
            const mlRes = await fetch(`${API_BASE_URL}/api/ml/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: getUserId() || 'guest',
                    current_track_id: state.currentSong.id,
                    limit: 1,
                    client_hour: new Date().getHours()
                })
            });

            if (mlRes.ok) {
                const mlData = await mlRes.json();
                const recommendations = mlData?.data?.recommendations || mlData?.recommendations || [];

                if (recommendations.length > 0) {
                    const recommendedId = recommendations[0].track_id;
                    const found = pool.find(s => s && s.id === recommendedId);
                    if (found) {
                        next = { ...found, mlQueued: true };
                    }
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
        const { activeChannel, currentSong } = get();
        // Sync to YT player if applicable
        if (currentSong?.id?.startsWith('yt_') && window.__ytPlayerInstance) {
            window.__ytPlayerInstance.unMute?.();
            window.__ytPlayerInstance.setVolume?.(Math.round(vol * 100));
        }
        audioEngine.setVolume(activeChannel, vol);
        audioA.volume = 1;
        audioB.volume = 1;
        set({ volume: vol, isMuted: vol === 0 });
    },

    toggleMute: () => {
        const { isMuted, volume, activeChannel, currentSong } = get();
        // Unmuting from volume 0 must restore an audible level, otherwise the
        // button reports "on" while playback stays silent.
        const restoreTo = volume > 0 ? volume : 0.8;
        // Sync to YT player if applicable
        if (currentSong?.id?.startsWith('yt_') && window.__ytPlayerInstance) {
            if (!isMuted) window.__ytPlayerInstance.mute?.();
            else {
                window.__ytPlayerInstance.unMute?.();
                window.__ytPlayerInstance.setVolume?.(Math.round(restoreTo * 100));
            }
        }
        audioEngine.setVolume(activeChannel, !isMuted ? 0 : restoreTo);
        set({ isMuted: !isMuted, volume: isMuted ? restoreTo : volume });
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
    // The engine keeps per-channel EQ, so the user's values are applied to both
    // chains and restored automatically after a Mix transition.
    setEqualizer: (key, val) => {
        if (audioEngine.initialized) {
            audioEngine.setUserEq(key, val);
        } else if (audioEngine.filters && audioEngine.filters[key]) {
            audioEngine.filters[key].gain.value = val;
        }
        set(state => ({ equalizer: { ...state.equalizer, [key]: val } }));
    },


    setEqualizerAll: (vals) => {
        if (!audioEngine.initialized) audioEngine.init(audioA, audioB);
        if (!audioEngine.filters) return;
        audioEngine.setUserEqAll(vals);
        set({ equalizer: vals });
    },





    setMusicSource: (source) => {
        try { localStorage.setItem('mehfil_music_source', source); } catch {}
        set({ musicSource: source });
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

// Dev-only debug handle — lets you inspect the live player state from the
// browser console (stripped from production builds).
if (import.meta.env?.DEV && typeof window !== 'undefined') {
    window.__mehfilStore = usePlayerStore;
}

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

        // The engine's blend progress is driven from here — but it must run
        // for BOTH decks: once the outgoing track ends it stops firing
        // timeupdate, and the blend would never be completed.
        autoMixEngine.tick();

        if (store.activeChannel !== channel) return;
        const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        const remaining = audio.duration ? audio.duration - audio.currentTime : 0;

        // 🎯 STEP 1: PRELOAD NEXT SONG (Early trigger at 10s, bypassed when repeating current track)
        //    The Mix feature runs its own handover, so the AutoMix preload is skipped there.
        if (store.isAutoMixEnabled && !store.mixEnabled && store.repeat !== 'one' && audio.duration && remaining < 10 && !store.isPrepared) {
            store.prepareNextSong();
        }

        // 🎯 STEP 2: START NEXT SONG (overlap at 6s, bypassed when repeating current track)
        //    When "Mix" is on, the mix transition below takes over the handover.
        if (store.isAutoMixEnabled && !store.mixEnabled && store.repeat !== 'one' && audio.duration && remaining < 6 && !store.isTransitioning && store.isPlaying) {
            usePlayerStore.setState({ isTransitioning: true });
            store.nextSong();
        }

        // 🎯 STEP 2b: AutoMix — the engine prepares the next deck and schedules
        //    a beat-aligned blend. Everything below is driven by engine events.
        if (store.mixEnabled && store.repeat !== 'one' && audio.duration && remaining > 0) {
            const nextTrack = store.getNextQueueTrack();

            if (nextTrack) {
                // 1. Prepare the incoming deck while the current track plays.
                //    The engine works in the background, so this starts as
                //    early as possible — the analysis and the time-stretch
                //    need a few seconds before the blend can be armed.
                if (!autoMixEngine.prepared && !autoMixEngine.active) {
                    const saved = store.mixTransitions?.[transitionKey(store.currentSong?.id, nextTrack.id)];
                    autoMixEngine.prepareNext(
                        nextTrack,
                        autoMixEngine.getAnalysis(store.currentSong?.id),
                        saved ? { override: saved } : undefined,
                    );
                }

                // 2. Schedule the blend once the deck is armed.
                //    A preparation that no longer matches the next track (the
                //    queue changed, or the preparation finished late) is
                //    discarded rather than used.
                const prepared = autoMixEngine.prepared;
                if (prepared && prepared.track?.id !== nextTrack.id) {
                    autoMixEngine.cancelScheduled();
                }
                const armed = prepared && prepared.track?.id === nextTrack.id ? prepared : null;

                if (armed && !autoMixEngine.active && audio.duration) {
                    const analysis = autoMixEngine.getAnalysis(store.currentSong?.id);
                    const lead = armed.plan.durationMs / 1000;

                    // Where the blend starts. Spotify snaps the transition to a
                    // position where the beats of both tracks overlap and the
                    // default length is eight bars.
                    const point = findTransitionPoint(analysis, armed.plan.durationMs, {
                        duration: audio.duration,
                    });
                    const target = Number.isFinite(point)
                        ? point
                        : Math.max(0, (audio.duration || 0) - lead);

                    const untilBlend = target - audio.currentTime;

                    // Signal the approach a few seconds before the blend so the
                    // transition is signposted instead of appearing suddenly.
                    if (untilBlend <= MIX_APPROACH_SECONDS && untilBlend > 0.25) {
                        const incomingInfo = describeTrack(nextTrack, autoMixEngine.getAnalysis(nextTrack.id));
                        usePlayerStore.setState((s) => ({
                            automix: {
                                ...s.automix,
                                phase: 'approaching',
                                incoming: incomingInfo,
                                style: armed.plan.style,
                                reason: armed.plan.reason,
                                progress: 0,
                            },
                        }));
                    }

                    if (untilBlend <= 0.25) {
                        const rate = audio.playbackRate || 1;
                        const when = autoMixEngine.ctx.currentTime + untilBlend / rate;

                        // The overlap is the real distance to the end of the
                        // track, so the curves match what is actually heard.
                        const overlapMs = Math.max(
                            armed.plan.durationMs,
                            (audio.duration - target) * 1000,
                        );

                        autoMixEngine.scheduleNext(
                            Math.max(autoMixEngine.ctx.currentTime + 0.03, when),
                            target,
                            { durationMs: overlapMs },
                        );
                        usePlayerStore.setState({ isTransitioning: true });
                    }
                }
            }
        }

        // 4. Fallback — if the engine could not mix this pair (a YouTube track
        //    for example) hand over normally so the music never stops.
        if (store.mixEnabled && store.repeat !== 'one' && audio.duration && remaining < 5 && !store.isTransitioning && store.isPlaying) {
            if (!autoMixEngine.active) {
                usePlayerStore.setState({ isTransitioning: true });
                store.nextSong();
            }
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
            usePlayerStore.setState({ isPlaying: true, isPrepared: false, isTransitioning: false, progress: 0, currentTime: 0 });
            return;
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



