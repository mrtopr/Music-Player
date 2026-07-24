import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDown, Play, Pause, SkipBack, SkipForward,
    Shuffle, Repeat, Repeat1, Volume2, VolumeX, Heart,
    MoreHorizontal, Monitor, ListMusic, Sparkles,
    User, Disc, Share2, Download, Plus, Check, Loader2,
    SlidersHorizontal, Mic
} from 'lucide-react';

import { usePlayerStore } from '../../store/usePlayerStore';
import { getImageUrl, getAudioUrl } from '../../api/client.js';
import { useNavigate } from 'react-router-dom';
import { formatTime, decodeEntities, getSafeImage } from '../../utils/helpers.js';
import '../../../styles/fullscreen-player.css';

function OptionItem({ icon, label, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500,
                pointerEvents: 'auto'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
        >
            <span style={{ display: 'flex', opacity: 0.7 }}>{icon}</span>
            <span>{label}</span>
        </div>
    );
}

// ── Synced Lyrics Sub-component (Subscribed to currentTime to prevent parent re-renders) ──
function FullscreenLyricsPanel() {
    const lyrics = usePlayerStore(state => state.lyrics);
    const lyricsLoading = usePlayerStore(state => state.lyricsLoading);
    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);
    const seek = usePlayerStore(state => state.seek);
    const lyricsContainerRef = useRef(null);

    let activeIndex = -1;
    if (lyrics && lyrics.isSynced && lyrics.synced.length > 0) {
        for (let i = 0; i < lyrics.synced.length; i++) {
            if (currentTime >= lyrics.synced[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }
    }

    useEffect(() => {
        if (lyricsContainerRef.current) {
            const activeElement = lyricsContainerRef.current.querySelector('.fs-lyric-line.active');
            if (activeElement) {
                const containerHeight = lyricsContainerRef.current.clientHeight;
                const elementTop = activeElement.offsetTop;
                const elementHeight = activeElement.clientHeight;
                lyricsContainerRef.current.scrollTo({
                    top: elementTop - containerHeight / 2 + elementHeight / 2,
                    behavior: 'smooth'
                });
            }
        }
    }, [activeIndex]);

    if (lyricsLoading) {
        return (
            <div className="glass-morphism" style={{
                width: '100%', height: '380px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '24px', padding: '20px', boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--accent-primary)' }}>
                    <Loader2 className="spin" size={36} />
                    <span>Fetching lyrics...</span>
                </div>
            </div>
        );
    }

    if (!lyrics) {
        return (
            <div className="glass-morphism" style={{
                width: '100%', height: '380px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '24px', padding: '20px', boxSizing: 'border-box'
            }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                    <Mic size={36} style={{ marginBottom: '10px', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>Lyrics not found for this song.</p>
                </div>
            </div>
        );
    }

    if (lyrics.instrumental) {
        return (
            <div className="glass-morphism" style={{
                width: '100%', height: '380px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '24px', padding: '20px', boxSizing: 'border-box'
            }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                    ♫ Instrumental ♫
                </div>
            </div>
        );
    }

    return (
        <div className="glass-morphism" style={{
            width: '100%', height: '380px', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '24px', padding: '20px', boxSizing: 'border-box', overflow: 'hidden',
            position: 'relative'
        }}>
            {lyrics.isSynced ? (
                <div 
                    ref={lyricsContainerRef}
                    className="fs-lyrics-container" 
                    style={{
                        height: '100%', width: '100%', overflowY: 'auto', padding: '140px 0',
                        display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center',
                        maskImage: 'linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)',
                        scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none'
                    }}
                >
                    {lyrics.synced.map((line, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                            <div 
                                key={idx} 
                                className={`fs-lyric-line ${isActive ? 'active' : ''}`}
                                onClick={() => duration > 0 && seek((line.time / duration) * 100)}
                                style={{
                                    fontSize: isActive ? '1.8rem' : '1.4rem',
                                    fontWeight: 700, textAlign: 'center',
                                    color: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                                    textShadow: isActive ? '0 0 20px rgba(255,255,255,0.5)' : 'none',
                                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                    cursor: 'pointer', padding: '4px 10px', borderRadius: '8px'
                                }}
                                onMouseEnter={e => { if(!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                                onMouseLeave={e => { if(!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                            >
                                {line.text}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{
                    width: '100%', height: '100%', overflowY: 'auto', padding: '10px',
                    fontSize: '1.2rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.85)',
                    whiteSpace: 'pre-wrap', textAlign: 'center', scrollbarWidth: 'none', msOverflowStyle: 'none'
                }}>
                    {lyrics.plain}
                </div>
            )}
        </div>
    );
}

// ── Progress & Time Section (Handles drag-to-seek, click-to-seek, and real-time updates) ──
function FullscreenProgressSection() {
    const progress = usePlayerStore(state => state.progress);
    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);
    const seek = usePlayerStore(state => state.seek);

    const [dragPct, setDragPct] = useState(null); // null means not dragging
    const trackRef = useRef(null);

    const calculatePct = (clientX) => {
        if (!trackRef.current) return 0;
        const rect = trackRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        return Math.max(0, Math.min(100, (x / rect.width) * 100));
    };

    const handleTouchStart = (e) => {
        const pct = calculatePct(e.touches[0].clientX);
        setDragPct(pct);
    };

    const handleTouchMove = (e) => {
        const pct = calculatePct(e.touches[0].clientX);
        setDragPct(pct);
    };

    const handleTouchEnd = () => {
        if (dragPct !== null) {
            seek(dragPct);
            setDragPct(null);
        }
    };

    // Mouse support for desktop drag-to-seek
    const handleMouseDown = (e) => {
        const pct = calculatePct(e.clientX);
        setDragPct(pct);

        const handleMouseMove = (moveEvent) => {
            const movePct = calculatePct(moveEvent.clientX);
            setDragPct(movePct);
        };

        const handleMouseUp = (upEvent) => {
            const finalPct = calculatePct(upEvent.clientX);
            seek(finalPct);
            setDragPct(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleTrackClick = (e) => {
        // Only seek if not drag-seeking
        if (dragPct === null) {
            const pct = calculatePct(e.clientX);
            seek(pct);
        }
    };

    const displayProgress = dragPct !== null ? dragPct : progress;
    const displayTime = dragPct !== null ? (dragPct / 100) * duration : currentTime;

    return (
        <div className="fs-progress-area" style={{ position: 'relative', zIndex: 70 }}>
            {/* Progress Track */}
            <div 
                ref={trackRef}
                className="fs-progress-track"
                onClick={handleTrackClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                style={{ 
                    pointerEvents: 'auto', 
                    cursor: 'pointer',
                    height: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.12)',
                    borderRadius: '4px',
                    transition: 'height 0.2s ease',
                    position: 'relative'
                }}
            >
                <div 
                    className="fs-progress-fill" 
                    style={{ 
                        width: `${displayProgress}%`,
                        height: '100%',
                        background: 'var(--accent-primary)',
                        borderRadius: '4px',
                        position: 'relative'
                    }}
                >
                    {/* Premium Thumb Indicator that shows on hover or drag */}
                    <div style={{
                        position: 'absolute',
                        right: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        opacity: dragPct !== null ? 1 : 0,
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                        pointerEvents: 'none'
                    }} 
                    className="fs-progress-thumb"
                    />
                </div>
            </div>
            
            {/* Time Row */}
            <div className="fs-time-row" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <span>{formatTime(displayTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>

            {/* Custom thumb hover style */}
            <style>{`
                .fs-progress-track:hover {
                    height: 8px !important;
                }
                .fs-progress-track:hover .fs-progress-thumb {
                    opacity: 1 !important;
                    transform: translateY(-50%) scale(1.1) !important;
                }
            `}</style>
        </div>
    );
}

// ── Interactive Artwork Section (Handles swipe-to-skip & double-tap-to-seek) ──
function FullscreenArtworkSection({ currentSong, title, prevSong, nextSong }) {
    const seek = usePlayerStore(state => state.seek);
    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);

    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [showIndicator, setShowIndicator] = useState(null); // 'rewind' | 'forward' | null

    const touchStartX = useRef(0);
    const hasDraggedRef = useRef(false);
    const lastTap = useRef(0);

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        setIsDragging(true);
        hasDraggedRef.current = false;
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diffX = currentX - touchStartX.current;
        
        if (Math.abs(diffX) > 10) {
            hasDraggedRef.current = true;
        }

        // Limit maximum drag to 150px for elastic feel
        const limitedDiffX = Math.max(-150, Math.min(150, diffX));
        setDragOffset(limitedDiffX);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        
        // Swipe threshold: 80px
        if (dragOffset > 80) {
            prevSong();
        } else if (dragOffset < -88) {
            nextSong();
        }

        // Snap back to 0
        setDragOffset(0);
    };

    const handleArtworkClick = (e) => {
        // Prevent double tap seek if the user was just dragging/swiping
        if (hasDraggedRef.current) return;

        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            
            // Check if left or right half was clicked
            if (clickX < width / 2) {
                // Rewind 10 seconds
                const targetTime = Math.max(0, currentTime - 10);
                seek((targetTime / duration) * 100);
                triggerIndicator('rewind');
            } else {
                // Fast-forward 10 seconds
                const targetTime = Math.min(duration, currentTime + 10);
                seek((targetTime / duration) * 100);
                triggerIndicator('forward');
            }
        }
        lastTap.current = now;
    };

    const triggerIndicator = (type) => {
        setShowIndicator(type);
        setTimeout(() => setShowIndicator(null), 800);
    };

    const rotation = dragOffset / 12; // Max ~12.5 degrees rotation
    const scale = 1 - Math.abs(dragOffset) / 1000; // Slight scale down during drag

    return (
        <div className="fs-artwork-section" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', minHeight: '380px' }}>
            <div 
                className="fs-artwork-wrapper" 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleArtworkClick}
                style={{ 
                    cursor: 'pointer',
                    transform: `translateX(${dragOffset}px) rotate(${rotation}deg) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Elastic snap
                    position: 'relative',
                    userSelect: 'none'
                }}
            >
                <img 
                    src={getSafeImage(currentSong.image, getImageUrl)} 
                    alt={title} 
                    className="fs-artwork-img" 
                    draggable="false"
                />

                {/* Double Tap Visual Indicator overlay */}
                {showIndicator && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.55)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '24px',
                        animation: 'fadeInOut 0.8s ease',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}>
                        {showIndicator === 'rewind' ? (
                            <div style={{ textAlign: 'center', color: '#fff' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>-10s</div>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Rewind</div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#fff' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>+10s</div>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Fast Forward</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function FullscreenPlayer({ visible, onClose }) {
    const navigate = useNavigate();

    // Select actions and states separately to avoid re-rendering the parent on progress/time updates
    const currentSong = usePlayerStore(state => state.currentSong);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const togglePlay = usePlayerStore(state => state.togglePlay);
    const nextSong = usePlayerStore(state => state.nextSong);
    const prevSong = usePlayerStore(state => state.prevSong);
    const volume = usePlayerStore(state => state.volume);
    const setVolume = usePlayerStore(state => state.setVolume);
    const shuffle = usePlayerStore(state => state.shuffle);
    const toggleShuffle = usePlayerStore(state => state.toggleShuffle);
    const repeat = usePlayerStore(state => state.repeat);
    const cycleRepeat = usePlayerStore(state => state.cycleRepeat);
    const albumColors = usePlayerStore(state => state.albumColors);
    const isAutoMixEnabled = usePlayerStore(state => state.isAutoMixEnabled);
    const isPrepared = usePlayerStore(state => state.isPrepared);
    const setQueueOpen = usePlayerStore(state => state.setQueueOpen);
    const setEqualizerOpen = usePlayerStore(state => state.setEqualizerOpen);
    const setFullScreen = usePlayerStore(state => state.setFullScreen);
    const likedSongs = usePlayerStore(state => state.likedSongs);
    const toggleLike = usePlayerStore(state => state.toggleLike);
    const toggleAutoMix = usePlayerStore(state => state.toggleAutoMix);

    const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [mlFeatures, setMlFeatures] = useState(null);

    // Fetch ML features for generative UI
    useEffect(() => {
        if (!currentSong) return;
        const fetchFeatures = async () => {
            try {
                const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';
                const res = await fetch(`${ML_API_URL}/api/ml/features/${currentSong.id}`);
                const data = await res.json();
                if (data.success) {
                    setMlFeatures(data);
                } else {
                    setMlFeatures(null);
                }
            } catch (e) {
                setMlFeatures(null);
            }
        };
        fetchFeatures();
    }, [currentSong?.id]);

    const handleDownload = async () => {
        if (!currentSong) return;
        setDownloading(true);
        try {
            const url = getAudioUrl(currentSong.downloadUrl);
            if (!url) throw new Error("No download URL available");

            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${decodeEntities(currentSong.title)}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            setOptionsOpen(false);
        } catch (err) {
            console.error('Download failed:', err);
            alert('Download failed. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const handleNavigate = (path) => {
        setOptionsOpen(false);
        setFullScreen(false); // Close fullscreen to see the new page
        navigate(path);
    };

    const handleTouchStart = (e) => {
        setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };

    const handleTouchEnd = (e) => {
        const deltaX = e.changedTouches[0].clientX - touchStart.x;
        const deltaY = e.changedTouches[0].clientY - touchStart.y;

        // Only handle swipe down to close
        if (deltaY > 120 && Math.abs(deltaX) < 100) {
            onClose();
        }
    };

    if (!currentSong) return null;

    const liked = likedSongs.some(s => s.id === (currentSong?.id || ''));
    const title = currentSong ? decodeEntities(currentSong.title) : '';
    const artist = currentSong ? decodeEntities(currentSong.primaryArtists || currentSong.subtitle) : '';

    return (
        <div className={`fullscreen-player-v3 ${visible ? 'active' : ''}`}
            id="fullscreenPlayerV3"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: '#050508',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)',
                pointerEvents: visible ? 'auto' : 'none',
                color: '#fff', overflow: 'hidden'
            }}>

            {/* Blurred song cover background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${getSafeImage(currentSong.image, getImageUrl)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(80px) saturate(140%) brightness(0.35)',
                transform: 'scale(1.15)',
                zIndex: 0,
                opacity: 0.85,
                transition: 'background-image 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
                pointerEvents: 'none'
            }}></div>

            {/* High-density atmospheric overlay - Reacts to Music Energy */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(circle at 20% 30%, rgba(${albumColors.accentRGB}, ${mlFeatures?.energy > 0.6 ? 0.35 : 0.15}) 0%, transparent ${mlFeatures?.energy > 0.6 ? '60%' : '50%'})`,
                zIndex: 1, pointerEvents: 'none',
                transition: 'all 2s ease-in-out',
                animation: mlFeatures?.energy > 0.6 ? `pulse-energy ${1.5 / mlFeatures.energy}s infinite alternate` : 'none'
            }}></div>
            <style>{`
                @keyframes pulse-energy {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(1.1); opacity: 1; }
                }
            `}</style>

            {/* Header Area */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '2rem 4rem', position: 'relative', zIndex: 100
            }}>
                <button onClick={onClose} style={{
                    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                    width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
                }}>
                    <ChevronDown size={24} />
                </button>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', opacity: 0.5, textTransform: 'uppercase', marginBottom: '4px' }}>Now Playing</div>
                    {currentSong.mlQueued && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: 'rgba(198, 161, 91, 0.15)', color: 'var(--accent-primary)',
                            padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                            border: '1px solid rgba(198, 161, 91, 0.3)'
                        }}>
                            <Sparkles size={10} /> Queued via Taste Profile
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setOptionsOpen(!optionsOpen)}
                        style={{
                            background: optionsOpen ? 'rgba(198, 161, 91, 0.2)' : 'rgba(255,255,255,0.1)',
                            border: optionsOpen ? '1px solid var(--accent-primary)' : 'none',
                            color: optionsOpen ? 'var(--accent-primary)' : '#fff',
                            width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <MoreHorizontal size={24} />
                    </button>

                    {optionsOpen && (
                        <>
                            <div 
                                className="options-overlay" 
                                onClick={() => setOptionsOpen(false)} 
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    width: '100vw',
                                    height: '100vh',
                                    background: 'transparent',
                                    zIndex: 499
                                }}
                            />
                            <div style={{
                                position: 'absolute', top: '120%', right: 0, width: '240px',
                                background: 'rgba(20, 24, 36, 0.95)', backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                                padding: '12px', zIndex: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                                animation: 'fadeIn 0.2s ease-out'
                            }}>
                                <OptionItem 
                                    icon={<Heart size={18} fill={liked ? '#EF4444' : 'none'} color={liked ? '#EF4444' : '#fff'} />} 
                                    label={liked ? "Liked in Library" : "Add to Favorites"} 
                                    onClick={() => { toggleLike(currentSong); setOptionsOpen(false); }} 
                                />

                                {currentSong.album?.id && (
                                    <OptionItem icon={<Disc size={18} />} label="Go to Album" onClick={() => handleNavigate(`/album/${currentSong.album.id}`)} />
                                )}

                                {currentSong.artists?.primary?.[0]?.id && (
                                    <OptionItem icon={<User size={18} />} label="Go to Artist" onClick={() => handleNavigate(`/artist/${currentSong.artists.primary[0].id}`)} />
                                )}

                                <OptionItem 
                                    icon={<Sparkles size={18} />} 
                                    label={isAutoMixEnabled ? "Disable AutoMix" : "Enable AutoMix"} 
                                    onClick={() => { toggleAutoMix(); setOptionsOpen(false); }} 
                                />

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }}></div>

                                <OptionItem
                                    icon={downloading ? <Loader2 className="spin" size={18} /> : <Download size={18} />}
                                    label={downloading ? "Downloading..." : "Download Original"}
                                    onClick={handleDownload}
                                />

                                <OptionItem icon={<Share2 size={18} />} label="Copy Share Link" onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin + `/song/${currentSong.id}`);
                                    setOptionsOpen(false);
                                    alert('Link copied!');
                                }} />

                            </div>
                        </>
                    )}
                </div>

            </header>

            {/* Content Body */}
            <main className="fs-content-body" style={{ position: 'relative', zIndex: 50 }}>
                {/* Left: Artwork or Synced Lyrics */}
                {!showLyrics ? (
                    <FullscreenArtworkSection 
                        currentSong={currentSong} 
                        title={title} 
                        prevSong={prevSong} 
                        nextSong={nextSong} 
                    />
                ) : (
                    <div className="fs-artwork-section" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', minHeight: '380px' }}>
                        <FullscreenLyricsPanel />
                    </div>
                )}

                {/* Right: Info & Controls */}
                <div className="fs-controls-section" style={{ position: 'relative', zIndex: 60 }}>
                    <div className="fs-badge-row">
                        {isAutoMixEnabled && (
                            <div className={`fs-automix-badge ${isPrepared ? 'active' : ''}`}>
                                <Sparkles size={14} className="sparkle-icon" />
                                <span>{isPrepared ? 'AutoMix Prepped' : 'AutoMix Active'}</span>
                            </div>
                        )}

                        <div className="fs-source-badge">
                            <span className="source-dot"></span>
                            <span>Hi-Fi Audio</span>
                        </div>
                    </div>

                    <div className="fs-info-row">
                        <div className="fs-meta">
                            <h1 className="fs-title" title={title}>{title}</h1>
                            <p className="fs-artist">{artist}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleLike(currentSong); }}
                            className={`fs-like-btn ${liked ? 'liked' : ''}`}
                            style={{ cursor: 'pointer', pointerEvents: 'auto', padding: '10px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            aria-label={liked ? "Unlike song" : "Like song"}
                        >
                            <Heart 
                                size={32} 
                                fill={liked ? '#EF4444' : 'none'} 
                                color={liked ? '#EF4444' : 'rgba(255, 255, 255, 0.75)'} 
                            />
                        </button>
                    </div>

                    {/* Progress Bar Area */}
                    <FullscreenProgressSection />

                    {/* Main Controls Overlay */}
                    <div className="fs-main-controls" style={{ position: 'relative', zIndex: 80 }}>
                        <button onClick={toggleShuffle} className={`fs-ctrl-btn ${shuffle ? 'active' : ''}`}>
                            <Shuffle size={20} />
                        </button>
                        <button onClick={prevSong} className="fs-ctrl-btn large">
                            <SkipBack size={32} fill="currentColor" />
                        </button>
                        <button onClick={togglePlay} className="fs-play-btn" style={{ transform: 'scale(1.1)' }}>
                            {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" style={{ marginLeft: '4px' }} />}
                        </button>
                        <button onClick={nextSong} className="fs-ctrl-btn large">
                            <SkipForward size={32} fill="currentColor" />
                        </button>
                        <button onClick={cycleRepeat} className={`fs-ctrl-btn ${repeat !== 'off' ? 'active' : ''}`}>
                            {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                        </button>
                    </div>

                    {/* Bottom Utility Bar */}
                    <div className="fs-utility-bar" style={{ position: 'relative', zIndex: 90, marginTop: '3.5rem' }}>
                        <div className="fs-utility-left" style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setQueueOpen(true)}
                                className="fs-util-btn"
                                style={{ cursor: 'pointer', pointerEvents: 'auto', padding: '12px' }}
                            >
                                <ListMusic size={22} /> <span>Queue</span>
                            </button>
                            <button
                                onClick={() => setEqualizerOpen(true)}
                                className="fs-util-btn"
                                style={{ cursor: 'pointer', pointerEvents: 'auto', padding: '12px' }}
                            >
                                <SlidersHorizontal size={22} /> <span>EQ</span>
                              </button>
                              <button
                                  onClick={() => setShowLyrics(!showLyrics)}
                                  className={`fs-util-btn ${showLyrics ? 'active' : ''}`}
                                  style={{ 
                                      cursor: 'pointer', 
                                      pointerEvents: 'auto', 
                                      padding: '12px',
                                      color: showLyrics ? 'var(--accent-primary)' : '#fff',
                                      background: showLyrics ? 'rgba(212,160,83,0.15)' : 'transparent',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                  }}
                                  title="Lyrics"
                              >
                                  <Mic size={22} /> <span>Lyrics</span>
                              </button>
                          </div>

                        <div className="fs-utility-right">
                            <Volume2 size={20} opacity={0.6} />
                            <div className="fs-volume-track" style={{ pointerEvents: 'auto', marginLeft: '10px' }}>
                                <div className="fs-volume-fill" style={{ width: `${volume * 100}%` }}></div>
                                <input
                                    type="range" min="0" max="1" step="0.01"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    style={{ cursor: 'pointer', width: '160px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
}
