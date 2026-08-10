import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getImageUrl } from '../../api/client.js';
import {
  ArrowLeft, X, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Maximize2, Minimize2, Tv
} from 'lucide-react';
import { formatTime, decodeEntities } from '../../utils/helpers.js';

// Expose a shared player ref that the store can call into
window.__ytPlayerInstance = null;

// ── Load YouTube IFrame API once per page ────────────────────────────────────
let _ytApiPromise = null;
function loadYouTubeAPI() {
    if (_ytApiPromise) return _ytApiPromise;
    _ytApiPromise = new Promise((resolve) => {
        if (window.YT && window.YT.Player) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.id = 'yt-iframe-api-script';
        document.head.appendChild(script);
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (prev) prev();
            resolve();
        };
    });
    return _ytApiPromise;
}

export default function YouTubeHiddenPlayer() {
    const currentSong    = usePlayerStore(s => s.currentSong);
    const isPlaying      = usePlayerStore(s => s.isPlaying);
    const isMuted        = usePlayerStore(s => s.isMuted);
    const volume         = usePlayerStore(s => s.volume);
    const progress       = usePlayerStore(s => s.progress);
    const currentTime    = usePlayerStore(s => s.currentTime);
    const duration       = usePlayerStore(s => s.duration);
    const isVideoMode    = usePlayerStore(s => s.isVideoMode);
    const setVideoMode   = usePlayerStore(s => s.setVideoMode);
    const togglePlay     = usePlayerStore(s => s.togglePlay);
    const nextSong       = usePlayerStore(s => s.nextSong);
    const prevSong       = usePlayerStore(s => s.prevSong);
    const seek           = usePlayerStore(s => s.seek);
    const setVolume      = usePlayerStore(s => s.setVolume);
    const toggleMute     = usePlayerStore(s => s.toggleMute);

    const ytRef          = useRef(null);   // YT.Player instance
    const tickRef        = useRef(null);   // setInterval handle
    const lastVideoId    = useRef(null);   // last loaded videoId
    const mountDiv       = useRef(null);   // DOM node for YT.Player

    const isYtSong = currentSong?.id?.startsWith('yt_');

    // Automatically exit video mode if active song is not a YT song
    useEffect(() => {
        if (!isYtSong && isVideoMode) {
            setVideoMode(false);
        }
    }, [isYtSong, isVideoMode, setVideoMode]);

    // ── Create or update the YT.Player when song changes ─────────────────────
    useEffect(() => {
        if (!isYtSong) {
            if (ytRef.current) {
                try { ytRef.current.destroy(); } catch(e) {}
                ytRef.current = null;
                window.__ytPlayerInstance = null;
            }
            clearInterval(tickRef.current);
            lastVideoId.current = null;
            return;
        }

        const videoId = currentSong.id.replace('yt_', '');
        if (!videoId) return;

        const initPlayer = () => {
            if (ytRef.current && lastVideoId.current === videoId) {
                ytRef.current.playVideo();
                return;
            }

            if (ytRef.current) {
                try { ytRef.current.destroy(); } catch(e) {}
                ytRef.current = null;
                window.__ytPlayerInstance = null;
            }

            if (!mountDiv.current) return;

            lastVideoId.current = videoId;
            usePlayerStore.setState({ progress: 0, currentTime: 0, duration: 0, isPlaying: true });

            ytRef.current = new window.YT.Player(mountDiv.current, {
                videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 1,       // Enable standard player controls when in video mode
                    disablekb: 0,
                    fs: 1,
                    rel: 0,
                    modestbranding: 1,
                    iv_load_policy: 3,
                    enablejsapi: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: (e) => {
                        window.__ytPlayerInstance = e.target;
                        const vol = usePlayerStore.getState().isMuted ? 0 : Math.round(usePlayerStore.getState().volume * 100);
                        e.target.setVolume(vol);
                        e.target.playVideo();
                        const dur = e.target.getDuration?.() || 0;
                        if (dur) usePlayerStore.setState({ duration: dur });

                        if ('mediaSession' in navigator) {
                            const song = usePlayerStore.getState().currentSong;
                            const thumb = song?.image ? getImageUrl(song.image) : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                            navigator.mediaSession.metadata = new MediaMetadata({
                                title: song?.title || song?.name || 'YouTube',
                                artist: song?.primaryArtists || song?.subtitle || 'YouTube Music',
                                artwork: [{ src: thumb, sizes: '500x500', type: 'image/jpeg' }]
                            });
                            navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().togglePlay());
                            navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().togglePlay());
                            navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().nextSong());
                            navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().prevSong());
                        }
                    },
                    onStateChange: (e) => {
                        const YT = window.YT;
                        if (!YT) return;
                        if (e.data === YT.PlayerState.PLAYING) {
                            usePlayerStore.setState({ isPlaying: true });
                            const dur = e.target.getDuration?.() || 0;
                            if (dur) usePlayerStore.setState({ duration: dur });
                        } else if (e.data === YT.PlayerState.PAUSED) {
                            usePlayerStore.setState({ isPlaying: false });
                        } else if (e.data === YT.PlayerState.ENDED) {
                            usePlayerStore.setState({ isPlaying: false });
                            usePlayerStore.getState().nextSong();
                        }
                    },
                    onError: (e) => {
                        console.warn('[YTPlayer] Error:', e.data);
                        usePlayerStore.setState({ isPlaying: false });
                    }
                }
            });
        };

        loadYouTubeAPI().then(initPlayer);
    }, [currentSong?.id]); // eslint-disable-line

    // ── Progress ticker ──────────────────────────────────────────────────────
    useEffect(() => {
        clearInterval(tickRef.current);
        if (!isYtSong || !isPlaying) return;
        tickRef.current = setInterval(() => {
            const player = window.__ytPlayerInstance;
            if (!player?.getCurrentTime) return;
            const ct = player.getCurrentTime() || 0;
            const dur = player.getDuration() || 0;
            const pct = dur > 0 ? (ct / dur) * 100 : 0;
            usePlayerStore.setState({ currentTime: ct, duration: dur, progress: pct });
        }, 500);
        return () => clearInterval(tickRef.current);
    }, [isYtSong, isPlaying]);

    // ── Sync isPlaying → YT player ───────────────────────────────────────────
    useEffect(() => {
        const player = window.__ytPlayerInstance;
        if (!player) return;
        if (!isYtSong) {
            player.pauseVideo?.();
            return;
        }
        if (isPlaying) {
            player.playVideo?.();
        } else {
            player.pauseVideo?.();
        }
    }, [isPlaying, isYtSong]);

    // ── Sync volume/mute → YT player ─────────────────────────────────────────
    useEffect(() => {
        const player = window.__ytPlayerInstance;
        if (!player || !isYtSong) return;
        if (isMuted) {
            player.mute?.();
        } else {
            player.unMute?.();
            player.setVolume?.(Math.round(volume * 100));
        }
    }, [volume, isMuted, isYtSong]);

    const title = decodeEntities(currentSong?.title || currentSong?.name || 'YouTube Video');
    const artist = decodeEntities(currentSong?.primaryArtists || currentSong?.subtitle || 'YouTube Music');

    const showModal = isYtSong && isVideoMode;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <>
            {/* Embedded IFrame container */}
            <div
                style={
                    showModal
                        ? {
                              position: 'fixed',
                              top: 'calc(50% + 25px)',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: 'min(94vw, 1100px)',
                              height: isMobile ? 'auto' : 'min(75vh, 620px)',
                              maxHeight: '75vh',
                              aspectRatio: '16/9',
                              zIndex: 100001,
                              borderRadius: isMobile ? '12px' : '20px',
                              overflow: 'hidden',
                              boxShadow: '0 30px 90px rgba(0,0,0,0.95), 0 0 60px rgba(168,85,247,0.4)',
                              background: '#000',
                              border: '1px solid rgba(255,255,255,0.18)'
                          }
                        : {
                              position: 'fixed',
                              width: 1,
                              height: 1,
                              opacity: 0,
                              pointerEvents: 'none',
                              bottom: 0,
                              right: 0,
                              overflow: 'hidden',
                              zIndex: -1
                          }
                }
                aria-hidden={!showModal}
            >
                <div ref={mountDiv} style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Video Player Top Navigation Header & Fullscreen Modal Backdrop */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100000,
                        background: 'rgba(6, 3, 15, 0.95)',
                        backdropFilter: 'blur(35px)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        animation: 'a-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards'
                    }}
                >
                    {/* Single Top Navigation Bar */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: isMobile ? '0.8rem 1rem' : '1.1rem 2.5rem',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(18,12,32,0.88)',
                            backdropFilter: 'blur(20px)',
                            zIndex: 100002,
                            gap: isMobile ? '8px' : '0'
                        }}
                    >
                        <button
                            onClick={() => setVideoMode(false)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(168,85,247,0.2)',
                                border: '1px solid rgba(168,85,247,0.45)',
                                color: '#c084fc',
                                padding: isMobile ? '8px 12px' : '9px 20px',
                                borderRadius: '30px',
                                cursor: 'pointer',
                                fontSize: isMobile ? '0.75rem' : '0.88rem',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 20px rgba(168,85,247,0.25)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <ArrowLeft size={16} /> Switch to Audio Mode
                        </button>

                        {/* Song Title & Artist Badge */}
                        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
                            <div style={{ fontSize: isMobile ? '0.85rem' : '1.08rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {title}
                            </div>
                            <div style={{ fontSize: isMobile ? '0.7rem' : '0.82rem', color: 'rgba(192,132,252,0.85)', marginTop: '2px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {artist} {!isMobile && <span style={{ color: 'rgba(255,255,255,0.4)' }}>• YouTube Video Player</span>}
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setVideoMode(false)}
                            style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'rgba(255,255,255,0.7)',
                                width: isMobile ? '36px' : '42px',
                                height: isMobile ? '36px' : '42px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}


        </>
    );
}

