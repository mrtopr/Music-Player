import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Shuffle, ArrowLeft, Heart, MoreHorizontal, Clock, Loader2, Music, Share2, CheckCircle2 } from 'lucide-react';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import AddToPlaylist from '../components/common/AddToPlaylist';
import { formatTime, decodeEntities } from '../utils/helpers.js';

export default function CollectionDetails({ type }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const loaderRef = useRef(null);

    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const currentSong = usePlayerStore(s => s.currentSong);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const likedSongs = usePlayerStore(s => s.likedSongs);
    const toggleLike = usePlayerStore(s => s.toggleLike);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || type === 'album') return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            let newTracks = [];

            if (type === 'artist') {
                const res = await apiFetch(`/api/artists/${id}/songs`, { page: nextPage });
                newTracks = res.songs || [];
            } else if (type === 'playlist') {
                const res = await apiFetch(`/api/playlists`, { id, page: nextPage, limit: 50 });
                newTracks = res.songs || res.list || [];
            }

            if (newTracks.length > 0) {
                setTracks(prev => {
                    const existIds = new Set(prev.map(t => t.id));
                    return [...prev, ...newTracks.filter(t => !existIds.has(t.id))];
                });
                setPage(nextPage);
                setHasMore(newTracks.length >= 10);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to load more tracks:', err);
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    }, [page, hasMore, loadingMore, id, type]);

    useEffect(() => {
        window.scrollTo(0, 0);
        setLoading(true);
        setTracks([]);
        setPage(0);
        setHasMore(true);

        const fetchInitial = async () => {
            try {
                if (type === 'playlist') {
                    const localPlaylists = JSON.parse(localStorage.getItem('mehfilPlaylists') || '[]');
                    const local = localPlaylists.find(p => p.id === id);
                    if (local) {
                        setData({
                            name: local.name,
                            subtitle: 'Custom Playlist',
                            image: local.songs[0]?.image || null,
                            year: new Date(local.createdAt).getFullYear(),
                            songs: local.songs
                        });
                        setTracks(local.songs);
                        setHasMore(false);
                        setLoading(false);
                        return;
                    }
                }

                const endpoint = `/api/${type}s`;
                const res = await apiFetch(endpoint, { id, page: 0, limit: 50 });
                setData(res);

                let initialTracks = [];
                if (type === 'artist') {
                    try {
                        const songRes = await apiFetch(`/api/artists/${id}/songs`, { page: 0 });
                        initialTracks = songRes.songs || res.topSongs || [];
                    } catch (e) {
                        initialTracks = res.topSongs || [];
                    }
                } else {
                    initialTracks = res.songs || res.list || [];
                }

                setTracks(initialTracks);
                setHasMore(initialTracks.length >= 10 && type !== 'album');
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitial();
    }, [id, type]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                loadMore();
            }
        }, { threshold: 0.1 });

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, loadMore]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '1rem', color: 'var(--accent-primary, #10B981)' }}>
                <Loader2 className="spin" size={44} />
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading {type}...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <h2>Content not found.</h2>
                <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', padding: '0.6rem 1.4rem', borderRadius: '50px', background: 'var(--accent-primary, #10B981)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Go Back</button>
            </div>
        );
    }

    const title = decodeEntities(data.name || data.title || '');
    const isArtist = type === 'artist';
    const subtitle = isArtist ? 'Top Indian Artist' : (data.subtitle || data.primaryArtists || 'Collection');
    const image = getImageUrl(data.image);

    const handlePlayAll = () => {
        if (tracks?.length > 0) playQueue(tracks);
    };

    const handleShuffle = () => {
        if (tracks?.length > 0) {
            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
            playQueue(shuffled);
        }
    };

    return (
        <div style={{ paddingBottom: '120px', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main, #0A0A0B)' }}>
            {/* Immersive Hero Header */}
            <div style={{
                position: 'relative',
                padding: '2.5rem 2rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                minHeight: '320px',
                background: 'transparent',
                borderBottom: 'none'
            }}>
                {/* Background Ambient Glow - Organic Radial Fade with Zero Box Edges */}
                <div style={{
                    position: 'absolute',
                    top: '-60px', left: '-60px', right: '-60px', bottom: '-60px',
                    backgroundImage: `url(${image})`,
                    backgroundSize: 'cover', backgroundPosition: 'center 30%',
                    filter: 'blur(100px) brightness(0.18)',
                    opacity: 0.4,
                    maskImage: 'radial-gradient(circle at 25% 50%, black 15%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(circle at 25% 50%, black 15%, transparent 70%)',
                    zIndex: 0,
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute',
                    top: '-60px', left: '-60px', right: '-60px', bottom: '-60px',
                    background: 'radial-gradient(circle at 25% 50%, rgba(16, 185, 129, 0.12) 0%, transparent 65%)',
                    zIndex: 1,
                    pointerEvents: 'none'
                }} />

                {/* Top Floating Back Nav */}
                <button 
                    onClick={() => navigate(-1)} 
                    style={{ 
                        position: 'absolute', top: '1.5rem', left: '1.5rem', 
                        background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '50%', width: '42px', height: '42px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: '#fff', cursor: 'pointer', backdropFilter: 'blur(12px)',
                        zIndex: 10, transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="hero-content" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', zIndex: 5, flexWrap: 'wrap' }}>
                    {/* Avatar / Cover */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={image} alt={title} style={{
                            width: 'clamp(140px, 18vw, 210px)',
                            height: 'clamp(140px, 18vw, 210px)',
                            objectFit: 'cover',
                            borderRadius: isArtist ? '50%' : '16px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                            border: isArtist ? '3px solid rgba(255,255,255,0.1)' : 'none'
                        }} />
                    </div>

                    <div style={{ flex: 1, minWidth: '240px' }}>
                        {isArtist ? (
                            <div style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '6px', 
                                padding: '4px 12px', borderRadius: '50px', 
                                background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#10B981', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.8rem' 
                            }}>
                                <CheckCircle2 size={14} /> Verified Artist
                            </div>
                        ) : (
                            <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                {type}
                            </div>
                        )}

                        <h1 style={{
                            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                            fontWeight: 800,
                            lineHeight: 1.1,
                            marginBottom: '0.8rem',
                            color: '#F4F4F5',
                            letterSpacing: '-1px'
                        }}>
                            {title}
                        </h1>

                        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.8rem' }}>
                            {subtitle}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                            <Music size={14} color="var(--accent-primary, #10B981)" /> {tracks?.length || 0} tracks
                            {data.year && <>&nbsp;&bull;&nbsp;{data.year}</>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1.2rem', position: 'relative', zIndex: 10 }}>
                {/* Big Primary Play All Button */}
                <button 
                    onClick={handlePlayAll} 
                    style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #059669, #10B981)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)',
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} 
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'} 
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title="Play All"
                >
                    <Play size={26} fill="#000" color="#000" style={{ transform: 'translateX(2px)' }} />
                </button>

                <button 
                    onClick={handleShuffle} 
                    style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s'
                    }} 
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }} 
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    title="Shuffle Play"
                >
                    <Shuffle size={18} />
                </button>

                {type === 'playlist' && (
                    <button 
                        onClick={() => {
                            try {
                                const payload = { name: title, songs: tracks };
                                const jsonString = JSON.stringify(payload);
                                const base64 = btoa(unescape(encodeURIComponent(jsonString)));
                                const shareUrl = `${window.location.origin}/playlists#share=${base64}`;
                                navigator.clipboard.writeText(shareUrl);
                                alert(`Playlist share link copied to clipboard!`);
                            } catch (err) {
                                console.error(err);
                                alert('Could not generate share link.');
                            }
                        }} 
                        style={{
                            width: '42px', height: '42px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s'
                        }} 
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }} 
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        title="Share Playlist"
                    >
                        <Share2 size={18} />
                    </button>
                )}
            </div>

            {/* Tracks Table Header */}
            <div style={{ padding: '0 2rem', flex: 1 }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '40px 1fr 140px', 
                    padding: '0 1rem 0.8rem', 
                    borderBottom: '1px solid rgba(255,255,255,0.06)', 
                    color: 'var(--text-muted)', 
                    fontSize: '0.78rem', 
                    fontWeight: 700, 
                    letterSpacing: '1px', 
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem'
                }}>
                    <div>#</div>
                    <div>Title</div>
                    <div style={{ textAlign: 'right', paddingRight: '1rem' }}><Clock size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /></div>
                </div>

                {/* Tracks List */}
                {tracks && tracks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {tracks.map((track, idx) => {
                            const isCurrent = currentSong?.id === track.id;
                            const isLiked = likedSongs.some(s => s.id === track.id);
                            return (
                                <div 
                                    key={track.id + idx} 
                                    onClick={() => playSong(track)} 
                                    style={{
                                        display: 'grid', 
                                        gridTemplateColumns: '40px 1fr 140px',
                                        alignItems: 'center', 
                                        padding: '0.7rem 1rem',
                                        borderRadius: '10px', 
                                        cursor: 'pointer', 
                                        transition: 'all 0.15s ease',
                                        background: isCurrent ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                                        borderLeft: isCurrent ? '3px solid #10B981' : '3px solid transparent'
                                    }} 
                                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }} 
                                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {/* Track Index / Play Indicator */}
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isCurrent ? '#10B981' : 'var(--text-muted)' }}>
                                        {isCurrent && isPlaying ? (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} style={{ width: '2px', background: '#10B981', borderRadius: '1px', animation: `eqBar 0.${4 + i}s ease-in-out infinite alternate` }} />
                                                ))}
                                            </div>
                                        ) : (
                                            idx + 1
                                        )}
                                    </div>

                                    {/* Track Info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                                        <img src={getImageUrl(track.image)} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <div style={{ color: isCurrent ? '#10B981' : '#F4F4F5', fontWeight: 600, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {decodeEntities(track.title || track.name || 'Unknown Track')}
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {track.primaryArtists || track.subtitle || subtitle}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Duration & Like Button */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: isLiked ? '#EF4444' : 'var(--text-muted)' }}
                                            title={isLiked ? "Unlike" : "Like"}
                                        >
                                            <Heart size={18} fill={isLiked ? '#EF4444' : 'none'} color={isLiked ? '#EF4444' : 'currentColor'} />
                                        </button>
                                        <AddToPlaylist song={track} />
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: '40px', textAlign: 'right' }}>
                                            {formatTime(track.duration)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No tracks available in this collection.
                    </div>
                )}
            </div>

            <div ref={loaderRef} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {loadingMore ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', color: 'var(--accent-primary, #10B981)' }}>
                        <Loader2 className="spin" size={22} /> Loading more tracks...
                    </div>
                ) : !hasMore && tracks?.length > 0 && type !== 'album' ? (
                    <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>You've reached the end of the collection.</p>
                ) : null}
            </div>
        </div>
    );
}
