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

function decodeEntities(text) {
    if (!text) return '';
    return text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'");
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
    const title = decodeEntities(currentSong.title) || 'Unknown';
    const artist = decodeEntities(currentSong.primaryArtists || currentSong.subtitle) || 'Unknown';
    const albumName = decodeEntities(currentSong.album?.name || '');

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
            <div className="fs-desktop-container" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', padding: '1rem', boxSizing: 'border-box', margin: '0 auto', width: '100%' }}>

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
                                    {albumName && <p className="premium-album">{albumName}</p>}
                                </div>
                            </div>

                            <div className="fs-progress-zone" style={{ width: '100%' }}>
                                <div className="premium-progress-container">
                                    <span style={{ minWidth: '40px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{formatTime(currentTime)}</span>
                                    <div className="fs-progress-bar" style={{ position: 'relative', flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                                        <div className="fs-progress-fill" style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: '#fff', borderRadius: '4px', boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
                                            <div className="fs-progress-handle" style={{ position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', background: '#fff', borderRadius: '50%' }}></div>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={progress || 0} 
                                            onChange={(e) => seek(Number(e.target.value))}
                                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} 
                                        />
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

            {/* Enhanced Queue Overlay Sidebar */}
            {showQueue && (
                <div className="fs-queue-overlay">
                    <div className="fs-queue-header">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>Up Next</h3>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{queue?.length || 0} tracks in queue</span>
                        </div>
                        <button onClick={() => setShowQueue(false)} className="fs-close-queue">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="fs-queue-list">
                        {queue && queue.length > 0 ? queue.map((song, i) => (
                            <div
                                key={`${song.id}-${i}`}
                                className={`fs-queue-item ${i === queueIndex ? 'active' : ''}`}
                                onClick={() => { playSong(song, false); }}
                            >
                                <div className="queue-art-box">
                                    <img src={getImageUrl(song.image)} alt="" />
                                    {i === queueIndex && isPlaying && (
                                        <div className="playing-bars">
                                            <span></span><span></span><span></span>
                                        </div>
                                    )}
                                </div>
                                <div className="queue-song-info">
                                    <div className="queue-song-title">{decodeEntities(song.title || song.name)}</div>
                                    <div className="queue-song-artist">{decodeEntities(song.primaryArtists || song.subtitle || 'Various Artists')}</div>
                                </div>
                                {i === queueIndex && <div className="now-playing-dot"></div>}
                            </div>
                        )) : (
                            <div className="empty-queue">Your queue is empty</div>
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
                    font-size: clamp(1.6rem, 5vw, 2.5rem); font-weight: 800; color: #fff; margin: 0; 
                    line-height: 1.1; letter-spacing: -0.5px;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .premium-artist { 
                    font-size: clamp(0.95rem, 4vw, 1.4rem); font-weight: 500; color: rgba(255,255,255,0.6); margin: 0.5rem 0 0 0; 
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .premium-album { 
                    font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--album-accent); margin-top: 8px; opacity: 1; line-height: 1.4; filter: drop-shadow(0 0 5px rgba(var(--album-accent-rgb), 0.3));
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }

                .premium-action-btn-inline {
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.4); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.3s ease; flex-shrink: 0;
                }
                .premium-action-btn-inline.liked { color: #ff3b3b; background: rgba(255, 59, 59, 0.1); border-color: rgba(255, 59, 59, 0.2); }

                .fs-progress-zone { margin: 1vh 0; }
                .premium-progress-container { width: 100%; display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,0.4); font-size: 0.75rem; font-weight: 700; }
                .fs-progress-bar { flex: 1; height: 16px; position: relative; cursor: pointer; display: flex; align-items: center; }
                .fs-progress-bg { width: 100%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 4px; }
                .fs-progress-fill { 
                    position: absolute; left: 0; top: 50%; height: 3px; background: #fff; 
                    border-radius: 4px; transform: translateY(-50%); 
                    box-shadow: 0 0 10px rgba(255,255,255,0.5);
                    transition: width 0.1s linear;
                }
                .fs-progress-handle {
                    position: absolute; right: -6px; top: 50%; width: 10px; height: 10px; background: #fff; border-radius: 50%;
                    transform: translateY(-50%); opacity: 0; transition: opacity 0.2s;
                }
                .fs-progress-bar:hover .fs-progress-handle { opacity: 1; }

                .fs-control-hub {
                    width: 100%; display: flex; align-items: center; justify-content: space-between;
                    background: rgba(255,255,255,0.03); padding: 1.4rem 2.5rem; border-radius: 40px;
                    border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(20px);
                }
                .fs-main-btns { display: flex; align-items: center; gap: 2.5rem; }
                .ctrl-btn-small { 
                    background: none; border: none; color: rgba(255,255,255,0.3); 
                    padding: 8px; display: flex; align-items: center; justify-content: center; 
                    cursor: pointer; transition: all 0.2s; position: relative;
                    outline: none !important;
                }
                .ctrl-btn-small.active { color: var(--album-accent); }
                .ctrl-btn-small.active::after { content: ''; position: absolute; bottom: -2px; width: 4px; height: 4px; background: currentColor; border-radius: 50%; }
                
                .ctrl-btn-med { background: none; border: none; color: #fff; cursor: pointer; transition: transform 0.2s; outline: none !important; }
                .ctrl-btn-med:active { transform: scale(0.9); }
                
                .ctrl-btn-mega {
                    width: 80px; height: 80px; border-radius: 50%; background: #fff; color: #000;
                    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 10px 30px rgba(255,255,255,0.2); transition: transform 0.2s; outline: none !important;
                }
                .ctrl-btn-mega:active { transform: scale(0.95); }

                /* Queue Styling */
                .fs-queue-overlay {
                    position: absolute; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(60px);
                    z-index: 1000; display: flex; flex-direction: column; padding: 2.5rem 2rem;
                    animation: fadeIn 0.3s ease;
                }
                .fs-queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
                .fs-close-queue { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; outline: none !important; }
                .fs-queue-list { flex: 1; overflow-y: auto; padding-right: 4px; }
                .fs-queue-item { display: flex; gap: 15px; align-items: center; padding: 14px; border-radius: 18px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
                .fs-queue-item:hover { background: rgba(255,255,255,0.05); }
                .fs-queue-item.active { background: rgba(var(--album-accent-rgb), 0.1); border-color: rgba(var(--album-accent-rgb), 0.2); }
                .queue-art-box { position: relative; width: 56px; height: 56px; border-radius: 12px; overflow: hidden; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
                .queue-art-box img { width: 100%; height: 100%; object-fit: cover; }
                .playing-bars { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; justify-content: center; gap: 3px; padding-bottom: 12px; }
                .playing-bars span { width: 3px; height: 12px; background: var(--album-accent); animation: barBounce 0.6s infinite alternate; }
                .playing-bars span:nth-child(2) { animation-delay: 0.2s; }
                .playing-bars span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes barBounce { from { height: 4px; } to { height: 18px; } }
                .queue-song-info { flex: 1; overflow: hidden; }
                .queue-song-title { color: #fff; font-weight: 700; font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .queue-song-artist { color: rgba(255,255,255,0.4); font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; }
                .now-playing-dot { width: 8px; height: 8px; background: var(--album-accent); border-radius: 50%; box-shadow: 0 0 12px var(--album-accent); margin-left: auto; }

                @media (max-width: 800px) {
                    .fs-desktop-container { padding: 1.2rem 1.2rem 2.5rem 1.2rem !important; }
                    .fs-desktop-columns { flex-direction: column !important; gap: 1.5vh; flex: none !important; padding: 0 !important; }
                    .fs-left-col { flex: 0 0 auto; margin-bottom: 1.5vh; }
                    .fs-right-col { flex: 0 0 auto; gap: 1vh !important; }
                    .album-art-perspective { width: min(75vw, 300px); height: min(75vw, 300px); margin: 0 auto; }
                    .premium-title { font-size: 1.2rem !important; margin-bottom: 2px !important; }
                    .premium-artist { font-size: 0.95rem !important; }
                    .fs-control-hub { padding: 0.8rem 1.2rem !important; border-radius: 30px !important; }
                    .fs-main-btns { gap: 1.2rem; }
                    .ctrl-btn-mega { width: 64px; height: 64px; }
                    .ctrl-btn-med svg { width: 30px; height: 30px; }
                    .ctrl-btn-small { width: 40px; height: 40px; }
                    .fs-footer { margin-top: 2vh; padding-bottom: 1.5vh; }
                }
            `}</style>
        </div>
    );
}
