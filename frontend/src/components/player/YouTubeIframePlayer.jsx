import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Maximize2, Minimize2, ExternalLink, Play, Pause, Volume2, VolumeX, Youtube, SkipBack, SkipForward } from 'lucide-react';
import { useYouTubeStore } from '../../store/useYouTubeStore';
import { getImageUrl } from '../../api/client.js';
import { decodeEntities, formatTime } from '../../utils/helpers.js';

// Load the YouTube IFrame API once globally
let ytApiReady = false;
let ytApiCallbacks = [];

function loadYouTubeAPI() {
    if (ytApiReady) return Promise.resolve();
    return new Promise((resolve) => {
        ytApiCallbacks.push(resolve);
        if (!document.getElementById('yt-iframe-api')) {
            const script = document.createElement('script');
            script.id = 'yt-iframe-api';
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
        }
        window.onYouTubeIframeAPIReady = () => {
            ytApiReady = true;
            ytApiCallbacks.forEach(cb => cb());
            ytApiCallbacks = [];
        };
    });
}

export default function YouTubeIframePlayer() {
    const { ytSong, ytVideoId, isYtVisible, isYtExpanded, closeYt, setYtExpanded } = useYouTubeStore();
    const containerRef = useRef(null);
    const playerRef = useRef(null);   // YT.Player instance
    const iframeContainerId = 'yt-player-container-iframe';
    const progressTimerRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(80);
    const [isMuted, setIsMuted] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [showVideo, setShowVideo] = useState(false);

    // Initialise / reload player when videoId changes
    useEffect(() => {
        if (!ytVideoId || !isYtVisible) return;

        setIsReady(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        loadYouTubeAPI().then(() => {
            // Destroy previous player
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
                playerRef.current = null;
            }

            playerRef.current = new window.YT.Player(iframeContainerId, {
                videoId: ytVideoId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,          // hide YouTube controls — we provide our own
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    rel: 0,
                    iv_load_policy: 3,
                    enablejsapi: 1
                },
                events: {
                    onReady: (e) => {
                        e.target.setVolume(volume);
                        e.target.playVideo();
                        setDuration(e.target.getDuration() || 0);
                        setIsReady(true);
                    },
                    onStateChange: (e) => {
                        // YT.PlayerState: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
                        if (e.data === 1) {
                            setIsPlaying(true);
                            setDuration(playerRef.current?.getDuration() || 0);
                        } else if (e.data === 2 || e.data === 0) {
                            setIsPlaying(false);
                        }
                    }
                }
            });
        });

        return () => {
            clearInterval(progressTimerRef.current);
        };
    }, [ytVideoId, isYtVisible]);

    // Progress ticker
    useEffect(() => {
        clearInterval(progressTimerRef.current);
        if (!isPlaying) return;
        progressTimerRef.current = setInterval(() => {
            if (playerRef.current?.getCurrentTime) {
                setCurrentTime(playerRef.current.getCurrentTime() || 0);
                setDuration(playerRef.current.getDuration() || 0);
            }
        }, 500);
        return () => clearInterval(progressTimerRef.current);
    }, [isPlaying]);

    // Cleanup on unmount / close
    useEffect(() => {
        if (!isYtVisible && playerRef.current) {
            try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
            playerRef.current = null;
        }
    }, [isYtVisible]);

    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    };

    const seek = (pct) => {
        if (!playerRef.current || !duration) return;
        playerRef.current.seekTo((pct / 100) * duration, true);
        setCurrentTime((pct / 100) * duration);
    };

    const handleVolume = (val) => {
        setVolume(val);
        playerRef.current?.setVolume(val);
        if (val > 0 && isMuted) {
            setIsMuted(false);
            playerRef.current?.unMute();
        }
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
            playerRef.current.setVolume(volume);
        } else {
            playerRef.current.mute();
        }
        setIsMuted(m => !m);
    };

    if (!isYtVisible || !ytVideoId) return null;

    const title = decodeEntities(ytSong?.title || ytSong?.name || 'YouTube Music');
    const artist = decodeEntities(ytSong?.primaryArtists || ytSong?.subtitle || 'YouTube');
    const thumb = getImageUrl(ytSong?.image) || `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`;
    const watchUrl = `https://www.youtube.com/watch?v=${ytVideoId}`;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <>
            {/* Hidden / visible iframe depending on showVideo */}
            <div
                style={{
                    position: 'fixed',
                    ...(showVideo && isYtExpanded
                        ? { inset: 0, zIndex: 10001 }
                        : { width: 1, height: 1, opacity: 0, pointerEvents: 'none', bottom: 0, right: 0 }
                    )
                }}
            >
                <div id={iframeContainerId} style={{ width: '100%', height: '100%' }} />
            </div>

            {/* ── Fullscreen Video Mode ── */}
            {isYtExpanded && showVideo && (
                <div className="yt-player-fullscreen" id="ytPlayerFullscreen">
                    <div className="yt-player-fs-header">
                        <div className="yt-player-fs-meta">
                            <Youtube size={18} color="#FF0000" />
                            <div>
                                <div className="yt-player-fs-title">{title}</div>
                                <div className="yt-player-fs-artist">{artist}</div>
                            </div>
                        </div>
                        <div className="yt-player-fs-actions">
                            <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="yt-action-btn" title="Open on YouTube">
                                <ExternalLink size={16} />
                            </a>
                            <button className="yt-action-btn" onClick={() => setYtExpanded(false)} title="Minimize">
                                <Minimize2 size={16} />
                            </button>
                            <button className="yt-action-btn yt-close-btn" onClick={closeYt} title="Close">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                    {/* iframe fills here via the absolutely positioned container above */}
                    <div style={{ flex: 1, background: '#000' }} />
                </div>
            )}

            {/* ── Music Player Bar (always visible when not in fullscreen video) ── */}
            {!(isYtExpanded && showVideo) && (
                <div className="yt-music-player" id="ytMusicPlayer" ref={containerRef}>
                    {/* Progress Bar */}
                    <div className="yt-progress-track" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        seek(((e.clientX - rect.left) / rect.width) * 100);
                    }}>
                        <div className="yt-progress-fill" style={{ width: `${progress}%` }} />
                        <div className="yt-progress-thumb" style={{ left: `${progress}%` }} />
                    </div>

                    <div className="yt-music-player-inner">
                        {/* Thumbnail + Info */}
                        <div className="yt-music-info">
                            <div className="yt-music-thumb-wrap">
                                <img
                                    src={thumb}
                                    alt={title}
                                    className="yt-music-thumb"
                                    onError={e => { e.target.src = '/mehfil-logo.png'; }}
                                />
                                <div className="yt-badge">
                                    <Youtube size={10} color="#fff" />
                                </div>
                            </div>
                            <div className="yt-music-meta">
                                <div className="yt-music-title">{title}</div>
                                <div className="yt-music-artist">{artist}</div>
                                <div className="yt-music-time">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="yt-music-controls">
                            <button
                                className={`yt-ctrl-btn yt-play-btn ${!isReady ? 'loading' : ''}`}
                                onClick={togglePlay}
                                title={isPlaying ? 'Pause' : 'Play'}
                                disabled={!isReady}
                            >
                                {isPlaying
                                    ? <Pause size={22} fill="currentColor" />
                                    : <Play size={22} fill="currentColor" style={{ transform: 'translateX(1px)' }} />
                                }
                            </button>
                        </div>

                        {/* Volume + Actions */}
                        <div className="yt-music-actions">
                            <div className="yt-volume-row">
                                <button className="yt-action-btn-sm" onClick={toggleMute} title="Mute">
                                    {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                                <input
                                    type="range"
                                    className="yt-volume-slider"
                                    min="0" max="100"
                                    value={isMuted ? 0 : volume}
                                    onChange={e => handleVolume(Number(e.target.value))}
                                    title="Volume"
                                />
                            </div>
                            <div className="yt-action-row">
                                <button
                                    className={`yt-action-btn-sm ${showVideo ? 'active' : ''}`}
                                    onClick={() => {
                                        setShowVideo(v => !v);
                                        setYtExpanded(true);
                                    }}
                                    title="Show video"
                                >
                                    <Maximize2 size={13} />
                                </button>
                                <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="yt-action-btn-sm" title="Open on YouTube">
                                    <ExternalLink size={13} />
                                </a>
                                <button className="yt-action-btn-sm yt-close-sm" onClick={closeYt} title="Close">
                                    <X size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
