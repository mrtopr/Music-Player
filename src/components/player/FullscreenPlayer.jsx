import React, { useState, useEffect } from 'react';
import {
    ChevronDown, Play, Pause, SkipBack, SkipForward,
    Shuffle, Repeat, Repeat1, Volume2, VolumeX, Heart, Share2, MoreHorizontal, Radio, Airplay, ListMusic, X, Cast, Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getImageUrl } from '../../api/client.js';
import { extractAlbumColors } from '../../utils/colorExtractor.js';

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FullscreenPlayer({ visible, onClose }) {
    const {
        currentSong, isPlaying, progress, currentTime, duration,
        volume, isMuted, shuffle, repeat, likedSongs, queue, queueIndex,
        togglePlay, nextSong, prevSong, seek, setVolume, toggleMute,
        toggleShuffle, cycleRepeat, toggleLike, addToQueue, playSong
    } = usePlayerStore();

    const navigate = useNavigate();

    const liked = currentSong ? likedSongs.some(s => s.id === currentSong.id) : false;

    const [showMenu, setShowMenu] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [albumColors, setAlbumColors] = useState({
        dominant: '#1a1a1a', dominantRGB: '26,26,26',
        accent: '#f59e0b', accentRGB: '245,158,11',
        secondary: '#0a0a0a'
    });

    useEffect(() => {
        if (currentSong?.image) {
            extractAlbumColors(getImageUrl(currentSong.image), currentSong.title)
                .then(colors => setAlbumColors(colors));
        }
    }, [currentSong?.id]); // Re-extract when song ID changes

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape' && visible) onClose();
            if (e.key === 'q' && visible) setShowQueue(curr => !curr);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [visible, onClose]);

    if (!currentSong) return null;

    const imageUrl = getImageUrl(currentSong.image) || '/mehfil-logo.png';
    const title = currentSong.title?.replace(/&quot;/g, '"') || 'Unknown';
    const artist = currentSong.primaryArtists || currentSong.subtitle || 'Unknown';

    const handleShare = () => {
        setShowMenu(false);
        if (navigator.share) {
            navigator.share({
                title: title,
                text: `Listen to ${title} by ${artist} on Mehfil!`,
                url: window.location.href
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    return (
        <div
            className={`fullscreen-player ${visible ? 'active' : ''} ${isPlaying ? 'playing' : ''}`}
            style={{
                '--album-dominant': albumColors.dominant,
                '--album-dominant-rgb': albumColors.dominantRGB,
                '--album-accent': albumColors.accent,
                '--album-accent-rgb': albumColors.accentRGB,
                '--album-secondary': albumColors.secondary,
                position: 'fixed', inset: 0, zIndex: 9999,
                transition: 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.6s',
                transform: visible ? 'translateY(0)' : 'translateY(100%)',
                opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
                background: '#0a0a0a', fontFamily: "'Inter', sans-serif",
                color: '#fff', overflow: 'hidden'
            }}
        >
            {/* Massive Blurred Dynamic Light Background */}
            <div className="fs-dynamic-bg">
                <div className="bg-orb orb-1"></div>
                <div className="bg-orb orb-2"></div>
                <div className="bg-orb orb-3"></div>
                {/* Particle Effects */}
                <div className="particle p-1"></div>
                <div className="particle p-2"></div>
                <div className="particle p-3"></div>
                <div className="particle p-4"></div>
            </div>

            {/* Main Layout */}
            <div className="fs-desktop-container" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', padding: 'clamp(1rem, 4vh, 2rem) 2rem', boxSizing: 'border-box', margin: '0 auto', justifyContent: 'center', width: '100%' }}>

                {/* Top Navigation Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', paddingBottom: '1rem', width: '100%', zIndex: 10 }}>
                    <button onClick={onClose} className="fs-top-btn"><ChevronDown size={28} /></button>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.7rem', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '4px' }}>Now Playing</div>
                        <div className="fs-top-badge">Lossless Source</div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowMenu(!showMenu)} className="fs-top-btn"><MoreHorizontal size={24} /></button>
                        {showMenu && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowMenu(false)}></div>
                                <div className="fs-dropdown-menu">
                                    <div className="fs-menu-item" onClick={() => { setShowMenu(false); addToQueue(currentSong); }}>
                                        <ListMusic size={18} /> Add to Queue
                                    </div>
                                    <div className="fs-menu-item" onClick={() => { setShowMenu(false); onClose(); navigate('/settings'); }}>
                                        <SettingsIcon size={18} /> Player Settings
                                    </div>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }}></div>
                                    <div className="fs-menu-item" onClick={handleShare} style={{ color: 'var(--album-accent)' }}>
                                        <Share2 size={18} /> Share track
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Core Area: Artwork + Controls */}
                <div className="fs-desktop-columns">
                    {/* Left Column: Breathtaking 3D Art */}
                    <div className="fs-left-col">
                        <div className="album-art-perspective">
                            <div className={`album-art-canvas ${isPlaying ? 'playing' : ''}`}>
                                <img src={imageUrl} alt="Cover" />
                                <div className="art-reflection"></div>
                                <div className="art-glare"></div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Info & Actions */}
                    <div className="fs-right-col">
                        <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '3vh' }}>
                            <div className="fs-info-row" style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
                                <div className="fs-text-info" style={{ overflow: 'hidden', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <h2 className="premium-title" title={title}>{title}</h2>
                                        <button onClick={() => toggleLike(currentSong)} className={`premium-action-btn-inline ${liked ? 'liked' : ''}`}>
                                            <Heart size={28} fill={liked ? 'currentColor' : 'none'} />
                                        </button>
                                    </div>
                                    <p className="premium-artist">{artist}</p>
                                    {currentSong.album?.name && <p className="premium-album">{currentSong.album.name}</p>}
                                </div>
                            </div>

                            {/* Waveform Progress Bar */}
                            <div className="fs-progress-zone" style={{ width: '100%' }}>
                                <div className="premium-progress-container">
                                    <span style={{ minWidth: '40px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{formatTime(currentTime)}</span>
                                    <div className="fs-progress-bar" onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        seek(((e.clientX - rect.left) / rect.width) * 100);
                                    }}>
                                        <div className="fs-progress-bg"></div>
                                        <div className="fs-progress-fill" style={{ width: `${progress}%` }}>
                                            <div className="fs-progress-handle"></div>
                                        </div>
                                    </div>
                                    <span style={{ minWidth: '40px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textAlign: 'right' }}>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Glass Control Hub */}
                            <div className="fs-control-hub" style={{ width: '100%', maxWidth: '800px' }}>
                                <button className={`ctrl-btn-small ${shuffle ? 'active' : ''}`} onClick={toggleShuffle}>
                                    <Shuffle size={26} />
                                </button>

                                <div className="fs-main-btns">
                                    <button className="ctrl-btn-med" onClick={prevSong}><SkipBack fill="currentColor" size={40} /></button>
                                    <button className="ctrl-btn-mega" onClick={togglePlay}>
                                        {isPlaying ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" style={{ marginLeft: '4px' }} />}
                                    </button>
                                    <button className="ctrl-btn-med" onClick={nextSong}><SkipForward fill="currentColor" size={40} /></button>
                                </div>

                                <button className={`ctrl-btn-small ${repeat !== 'off' ? 'active' : ''}`} onClick={cycleRepeat}>
                                    {repeat === 'one' ? <Repeat1 size={26} /> : <Repeat size={26} />}
                                    {repeat !== 'off' && <span className="repeat-badge" style={{ bottom: '-8px', right: '-8px' }}>{repeat === 'one' ? '1' : ''}</span>}
                                </button>
                            </div>

                            {/* Footer Utilities */}
                            <div className="fs-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', width: '100%', maxWidth: '800px' }}>
                                <div onClick={() => setShowQueue(!showQueue)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', opacity: 0.8, color: showQueue ? 'var(--album-accent)' : 'inherit' }}>
                                    <ListMusic size={22} /> <span style={{ fontSize: '1rem', fontWeight: 600 }}>Queue</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: 'clamp(150px, 40vw, 300px)' }}>
                                    <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                                        {isMuted ? <VolumeX size={24} className="icon-small" /> : <Volume2 size={24} className="icon-small" />}
                                    </button>
                                    <div style={{ position: 'relative', width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', cursor: 'pointer' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${isMuted ? 0 : volume * 100}%`, background: '#fff', borderRadius: '3px', boxShadow: '0 0 5px #fff' }}></div>
                                        <input type="range" min="0" max="100" value={isMuted ? 0 : volume * 100} onChange={(e) => setVolume(Number(e.target.value) / 100)}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Queue Overlay Sidebar */}
            {showQueue && (
                <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(400px, 90%)',
                    background: 'rgba(10,10,12,0.85)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                    zIndex: 1000, borderLeft: '1px solid rgba(255,255,255,0.1)',
                    padding: '2rem 1.5rem', boxSizing: 'border-box',
                    animation: 'slideLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>Next Up</h3>
                        <button onClick={() => setShowQueue(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7 }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                        {queue && queue.length > 0 ? queue.map((song, i) => (
                            <div
                                key={`${song.id}-${i}`}
                                className={`queue-item ${i === queueIndex ? 'active' : ''}`}
                                onClick={() => { playSong(song, false); }}
                                style={{
                                    display: 'flex', gap: '12px', alignItems: 'center', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                    border: '1px solid transparent', marginBottom: '8px',
                                    background: i === queueIndex ? 'rgba(var(--album-accent-rgb), 0.15)' : 'transparent',
                                    borderColor: i === queueIndex ? 'rgba(var(--album-accent-rgb), 0.3)' : 'transparent'
                                }}
                            >
                                <img src={getImageUrl(song.image)} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} alt="" />
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ color: i === queueIndex ? 'var(--album-accent)' : '#fff', fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title?.replace(/&quot;/g, '"')}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.primaryArtists || song.subtitle}</div>
                                </div>
                            </div>
                        )) : (
                            <div style={{ color: 'rgba(255,255,255,0.3)', padding: '2rem', textAlign: 'center' }}>Queue is empty</div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .fs-dynamic-bg { 
                    position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; 
                    background: #000;
                }
                .fs-dynamic-bg::before {
                    content: ''; position: absolute; inset: 0;
                    background: 
                        radial-gradient(circle at 85% 30%, rgba(var(--album-accent-rgb), 0.35) 0%, transparent 60%),
                        radial-gradient(circle at 100% 100%, rgba(var(--album-dominant-rgb), 0.25) 0%, transparent 60%),
                        linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(var(--album-dominant-rgb), 0.15) 100%);
                    transition: all 1.5s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .fs-dynamic-bg::after {
                    content: ''; position: absolute; inset: 0;
                    background: radial-gradient(circle at 10% 90%, rgba(var(--album-dominant-rgb), 0.1) 0%, transparent 50%);
                    opacity: 0.5;
                }

                .bg-orb, .particle { display: none !important; }
                
                .bg-orb { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.3; transition: all 2s ease-in-out; }
                .orb-1 { width: 80vw; height: 80vw; top: -20%; left: -20%; background: var(--album-dominant); animation: floatOrb 25s infinite alternate; }
                .orb-2 { width: 70vw; height: 70vw; bottom: -10%; right: -10%; background: var(--album-accent); animation: floatOrb 20s infinite alternate-reverse; }
                .orb-3 { width: 60vw; height: 60vw; top: 30%; left: 40%; background: var(--album-secondary); animation: floatOrb 30s infinite alternate; opacity: 0.2; }

                @keyframes bgPulse {
                    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
                    50% { transform: scale(1.1) rotate(2deg); opacity: 1; }
                }

                @keyframes floatOrb {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(10%, 10%) scale(1.1); }
                }

                .particle { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.3); pointer-events: none; animation: particleFloat 15s infinite linear; }
                .p-1 { width: 4px; height: 4px; left: 10%; animation-delay: 0s; }
                .p-2 { width: 6px; height: 6px; left: 80%; background: rgba(var(--album-accent-rgb), 0.4); animation-delay: 2s; }
                .p-3 { width: 3px; height: 3px; left: 40%; animation-delay: 5s; }
                .p-4 { width: 5px; height: 5px; left: 60%; animation-delay: 8s; }

                @keyframes particleFloat {
                    0% { transform: translateY(110vh) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-10vh) translateX(100px); opacity: 0; }
                }

                .fs-top-btn {
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center;
                    justify-content: center; color: #fff; cursor: pointer; backdrop-filter: blur(15px);
                    transition: all 0.3s ease;
                }
                .fs-top-btn:hover { background: rgba(255,255,255,0.15); transform: scale(1.1); border-color: rgba(255,255,255,0.2); }
                
                .fs-top-badge {
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
                    padding: 4px 16px; border-radius: 20px; color: rgba(255,255,255,0.6);
                    font-size: 0.75rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
                    backdrop-filter: blur(10px);
                }

                .fs-dropdown-menu {
                    position: absolute; top: 60px; right: 0; width: 220px;
                    background: rgba(20,20,22,0.95); backdrop-filter: blur(30px);
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 18px;
                    padding: 8px; box-shadow: 0 15px 40px rgba(0,0,0,0.6);
                    z-index: 100; animation: slideDownSmall 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .fs-menu-item {
                    display: flex; align-items: center; gap: 12px;
                    padding: 12px 16px; border-radius: 12px; color: #fff;
                    font-size: 0.95rem; font-weight: 500; cursor: pointer;
                    transition: all 0.2s;
                }
                .fs-menu-item:hover { background: rgba(255,255,255,0.08); color: var(--album-accent); }
                
                @keyframes slideDownSmall { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

                .album-art-perspective { perspective: 1200px; width: clamp(320px, 80vw, 620px); height: clamp(320px, 80vw, 620px); display: flex; align-items: center; justify-content: center; }
                .album-art-canvas {
                    width: 100%; height: 100%; position: relative; border-radius: 32px; overflow: hidden;
                    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.7), 0 0 100px rgba(var(--album-dominant-rgb), 0.4);
                    transform: perspective(1000px) rotateY(-5deg) scale(0.95);
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    animation: albumFloat 6s ease-in-out infinite;
                }
                .album-art-canvas:hover { transform: perspective(1000px) rotateY(0deg) scale(1.04) translateY(-15px); box-shadow: 0 60px 120px rgba(0,0,0,0.8), 0 0 150px rgba(var(--album-dominant-rgb), 0.6); }
                .album-art-canvas img { width: 100%; height: 100%; object-fit: cover; }
                
                @keyframes albumFloat {
                    0%, 100% { transform: perspective(1000px) rotateY(-5deg) translateY(0) scale(0.95); }
                    50% { transform: perspective(1000px) rotateY(-5deg) translateY(-20px) scale(0.95); }
                }

                .premium-title { 
                    font-size: clamp(2.5rem, 6vw, 4.2rem); font-weight: 900; margin: 0; line-height: 1; letter-spacing: -3px; 
                    text-shadow: 0 15px 40px rgba(0,0,0,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
                    background: linear-gradient(to bottom, #ffffff 30%, rgba(255,255,255,0.7) 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                    animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .premium-artist { 
                    font-size: clamp(1.2rem, 3.5vw, 1.8rem); font-weight: 600; color: rgba(255,255,255,0.9); margin: 0.6rem 0 0 0; 
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    opacity: 0.8; animation: slideUp 1s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .premium-album { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 4px; color: var(--album-accent); margin-top: 15px; opacity: 0.6; }

                .premium-action-btn-inline {
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.4); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); flex-shrink: 0;
                }
                .premium-action-btn-inline:hover { background: rgba(255,255,255,0.12); transform: scale(1.15); color: #fff; }
                .premium-action-btn-inline.liked { color: var(--album-accent); background: rgba(var(--album-accent-rgb), 0.1); border-color: rgba(var(--album-accent-rgb), 0.2); animation: heartBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }

                .premium-action-btn {
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
                    color: #fff; width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); backdrop-filter: blur(10px);
                }
                .premium-action-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.1) rotate(5deg); border-color: rgba(255,255,255,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                .premium-action-btn.liked { color: var(--album-accent); background: rgba(var(--album-accent-rgb), 0.1); border-color: rgba(var(--album-accent-rgb), 0.2); animation: heartBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
                
                @keyframes heartBounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }

                .premium-progress-container { width: 100%; display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.5); font-variant-numeric: tabular-nums; }
                .fs-progress-bar { flex: 1; height: 32px; position: relative; cursor: pointer; display: flex; align-items: center; }
                .fs-progress-bg { width: 100%; height: 2px; background: rgba(255,255,255,0.08); border-radius: 1px; }
                .fs-progress-fill { 
                    position: absolute; left: 0; top: 50%; height: 2.5px; background: var(--album-accent); 
                    border-radius: 1px; transform: translateY(-50%); 
                    box-shadow: 0 0 10px rgba(var(--album-accent-rgb), 0.3);
                    transition: width 0.1s linear;
                }
                .fs-progress-handle {
                    position: absolute; right: -6px; top: 50%; width: 12px; height: 12px; background: #fff; border-radius: 50%;
                    transform: translateY(-50%); box-shadow: 0 0 10px rgba(255,255,255,0.8); opacity: 0; transition: opacity 0.2s, transform 0.2s;
                }
                .fs-progress-bar:hover .fs-progress-handle { opacity: 1; transform: translateY(-50%) scale(1.2); }
                .fs-progress-bar:hover .fs-progress-bg { height: 6px; background: rgba(255,255,255,0.15); }

                .fs-control-hub {
                    width: 100%; max-width: 650px; display: flex; align-items: center; justify-content: space-between;
                    background: rgba(var(--album-dominant-rgb), 0.12); padding: 2rem 3rem; border-radius: 45px;
                    border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(30px);
                    box-shadow: 0 25px 50px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1);
                }
                .fs-main-btns { display: flex; align-items: center; gap: clamp(1.5rem, 4vw, 3rem); }
                .ctrl-btn-small { 
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); 
                    width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                    cursor: pointer; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); 
                }
                .ctrl-btn-small:hover { background: rgba(255,255,255,0.15); transform: scale(1.1) translateY(-3px); color: #fff; border-color: rgba(255,255,255,0.15); }
                .ctrl-btn-small.active { color: var(--album-accent); background: rgba(var(--album-accent-rgb), 0.1); border-color: rgba(var(--album-accent-rgb), 0.2); box-shadow: 0 0 20px rgba(var(--album-accent-rgb), 0.2); }
                
                .ctrl-btn-med { background: none; border: none; color: #fff; opacity: 0.7; cursor: pointer; transition: all 0.3s; }
                .ctrl-btn-med:hover { transform: scale(1.25); opacity: 1; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
                
                .ctrl-btn-mega {
                    width: 100px; height: 100px; border-radius: 50%; background: #fff; color: #000;
                    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 50px rgba(255,255,255,0.2); 
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .ctrl-btn-mega:hover { transform: scale(1.1); box-shadow: 0 25px 60px rgba(255,255,255,0.3); }
                .ctrl-btn-mega:active { transform: scale(0.9); }

                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slideLeft { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                
                .fs-desktop-columns {
                    flex: 1; 
                    display: flex; 
                    flex-direction: row !important; 
                    align-items: center; 
                    justify-content: space-between; 
                    gap: 3vw; 
                    width: 100%; 
                    min-height: 80vh;
                    padding: 2vh 0;
                    box-sizing: border-box;
                    overflow: visible;
                }
                .fs-left-col {
                    flex: 1;
                    max-width: 48%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .fs-right-col {
                    flex: 1;
                    max-width: 52%;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    text-align: left;
                    padding-left: 3vw;
                    box-sizing: border-box;
                }
                .album-art-perspective {
                    width: 100%;
                    max-width: 600px;
                }
                
                @media (max-width: 800px) {
                    .fs-desktop-columns { 
                        flex-direction: column !important; 
                        justify-content: flex-start;
                        gap: 2vh;
                        min-height: auto;
                    }
                    .fs-left-col, .fs-right-col {
                        max-width: 100%;
                        width: 100%;
                        align-items: center;
                        text-align: center;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
}
