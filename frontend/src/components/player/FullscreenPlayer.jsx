import React, { useState } from 'react';
import { 
    ChevronDown, Play, Pause, SkipBack, SkipForward, 
    Shuffle, Repeat, Repeat1, Volume2, VolumeX, Heart, 
    MoreHorizontal, Monitor, ListMusic, Sparkles,
    User, Disc, Share2, Download, Plus, Check, Loader2
} from 'lucide-react';





import { usePlayerStore } from '../../store/usePlayerStore';
import { getImageUrl, getAudioUrl } from '../../api/client.js';
import { useNavigate } from 'react-router-dom';
import '../../../styles/premium-fullscreen.css';




function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function decodeEntities(text) {
    if (!text) return '';
    return text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

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

export default function FullscreenPlayer({ visible, onClose }) {
    const navigate = useNavigate();

    const {
        currentSong, isPlaying, togglePlay, nextSong, prevSong, 
        volume, setVolume, progress, seek, currentTime, duration,
        shuffle, toggleShuffle, repeat, cycleRepeat, albumColors,
        isAutoMixEnabled, isPrepared, setQueueOpen,
        setFullScreen,
        likedSongs, toggleLike
    } = usePlayerStore();

    const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);

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

        if (deltaY > 120 && Math.abs(deltaX) < 100) onClose();
        else if (Math.abs(deltaX) > 100 && Math.abs(deltaY) < 80) {
            if (deltaX > 0) prevSong();
            else nextSong();
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
                background: `linear-gradient(135deg, ${albumColors.dominant} 0%, #050505 100%)`,
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)',
                pointerEvents: visible ? 'auto' : 'none',
                color: '#fff', overflow: 'hidden'
            }}>

            
            {/* High-density atmospheric overlay */}
            <div style={{ 
                position: 'absolute', inset: 0, 
                background: `radial-gradient(circle at 20% 30%, rgba(${albumColors.accentRGB}, 0.15) 0%, transparent 50%)`,
                zIndex: 1, pointerEvents: 'none'
            }}></div>

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
                        <div style={{
                            position: 'absolute', top: '120%', right: 0, width: '240px',
                            background: 'rgba(20, 24, 36, 0.95)', backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                            padding: '12px', zIndex: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            <OptionItem icon={<Plus size={18} />} label="Add to Library" onClick={() => { toggleLike(currentSong); setOptionsOpen(false); }} />
                            
                            {currentSong.album?.id && (
                                <OptionItem icon={<Disc size={18} />} label="Go to Album" onClick={() => handleNavigate(`/album/${currentSong.album.id}`)} />
                            )}
                            
                            {currentSong.artists?.primary?.[0]?.id && (
                                <OptionItem icon={<User size={18} />} label="Go to Artist" onClick={() => handleNavigate(`/artist/${currentSong.artists.primary[0].id}`)} />
                            )}

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
                    )}
                </div>

            </header>

            {/* Content Body */}
            <main className="fs-content-body" style={{ position: 'relative', zIndex: 50 }}>
                {/* Left: Artwork */}
                <div className="fs-artwork-section">
                    <div className="fs-artwork-wrapper">
                        <img src={getImageUrl(currentSong.image)} alt={title} className="fs-artwork-img" />
                    </div>
                </div>

                {/* Right: Info & Controls */}
                <div className="fs-controls-section" style={{ position: 'relative', zIndex: 60 }}>
                    <div className="fs-badge-row">
                        <div className="fs-badge">
                            <div className="fs-badge-dot"></div>
                            <span>NOW PLAYING</span>
                        </div>
                        {isAutoMixEnabled && (
                            <div className={`fs-automix-badge ${isPrepared ? 'active' : ''}`}>
                                <Sparkles size={14} className="sparkle-icon" />
                                <span>{isPrepared ? 'AutoMix Prepped' : 'AutoMix Active'}</span>
                            </div>
                        )}

                        <div className="fs-source-badge">
                            <span className="source-dot"></span>
                            <span>Lossless Source</span>
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
                            style={{ cursor: 'pointer', pointerEvents: 'auto', padding: '10px' }}
                        >
                            <Heart size={36} fill={liked ? 'currentColor' : 'none'} color={liked ? '#FFB800' : '#fff'} />
                        </button>
                    </div>

                    {/* Progress Bar Area */}
                    <div className="fs-progress-area" style={{ position: 'relative', zIndex: 70 }}>
                        <div className="fs-progress-track"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                seek((x / rect.width) * 100);
                            }}
                            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                        >
                            <div className="fs-progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="fs-time-row">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

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
                        <div className="fs-utility-left">
                            <button 
                                onClick={() => setQueueOpen(true)} 
                                className="fs-util-btn"
                                style={{ cursor: 'pointer', pointerEvents: 'auto', padding: '12px' }}
                            >
                                <ListMusic size={22} /> <span>Queue</span>
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
