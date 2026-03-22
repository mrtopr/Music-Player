import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Shuffle, ArrowLeft, Heart, MoreHorizontal, Clock, Loader2, Music } from 'lucide-react';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import AddToPlaylist from '../components/common/AddToPlaylist';

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

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore || type === 'album') return; // albums generally don't paginate infinitely
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
                // Check if it's a local custom playlist first
                if (type === 'playlist') {
                    const localPlaylists = JSON.parse(localStorage.getItem('mehfilPlaylists') || '[]');
                    const local = localPlaylists.find(p => p.id === id);
                    if (local) {
                        setData({
                            name: local.name,
                            subtitle: 'Custom Playlist',
                            image: local.songs[0]?.image || null, // Use first song image as cover
                            year: new Date(local.createdAt).getFullYear(),
                            songs: local.songs
                        });
                        setTracks(local.songs);
                        setHasMore(false); // Local playlists are fully loaded
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', color: 'var(--accent-primary)' }}>
                <Loader2 className="spin" size={48} />
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading {type}...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <h2>Content not found.</h2>
                <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '20px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>Go Back</button>
            </div>
        );
    }

    const title = data.name || data.title?.replace(/&quot;/g, '"');
    const subtitle = data.subtitle || data.primaryArtists || (type === 'artist' ? 'Artist' : 'Collection');
    const image = getImageUrl(data.image);
    const isArtist = type === 'artist';

    const handlePlayAll = () => {
        if (tracks?.length > 0) playQueue(tracks);
    };

    const handleShuffle = () => {
        if (tracks?.length > 0) {
            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
            playQueue(shuffled);
        }
    };

    // Format duration from seconds
    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div style={{ paddingBottom: '100px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Immersive Hero Header */}
            <div style={{
                position: 'relative',
                padding: 'var(--space-2xl, 2rem) 1.5rem',
                paddingTop: '3rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                minHeight: '40vh'
            }}>
                {/* Blurred Background */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${image})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'blur(50px) brightness(0.4)',
                    zIndex: -1,
                    transform: 'scale(1.1)' // Prevent blurred edges from leaking
                }}></div>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, #09090b 100%)',
                    zIndex: -1
                }}></div>

                <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                    <ArrowLeft size={24} />
                </button>

                <div className="hero-content" style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem', zIndex: 1, flexWrap: 'wrap' }}>
                    <img src={image} alt={title} style={{
                        width: 'clamp(150px, 20vw, 250px)',
                        height: 'clamp(150px, 20vw, 250px)',
                        objectFit: 'cover',
                        borderRadius: isArtist ? '50%' : '12px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                    }} />

                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>
                            {type}
                        </div>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 5vw, 4rem)',
                            fontWeight: 800,
                            lineHeight: 1.1,
                            marginBottom: '1rem',
                            color: '#fff',
                            textShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}>
                            {title}
                        </h1>
                        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: '1rem' }}>
                            {subtitle}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                            <Music size={14} /> {tracks?.length || 0} tracks
                            {data.year && <>&nbsp;&bull;&nbsp;{data.year}</>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative', zIndex: 10 }}>
                <button onClick={handlePlayAll} style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'var(--accent-primary)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,165,0,0.4)',
                    transition: 'transform 0.2s'
                }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <Play size={28} fill="#000" color="#000" style={{ transform: 'translateX(2px)' }} />
                </button>

                <button onClick={handleShuffle} style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
                }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}>
                    <Shuffle size={20} />
                </button>

                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                    <Heart size={28} />
                </button>

                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginLeft: 'auto' }}>
                    <MoreHorizontal size={28} />
                </button>
            </div>

            {/* Tracks List */}
            <div style={{ padding: '0 1.5rem', flex: 1 }}>
                {tracks && tracks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {tracks.map((track, idx) => {
                            const isCurrent = currentSong?.id === track.id;
                            return (
                                <div key={track.id + idx} onClick={() => playSong(track)} style={{
                                    display: 'flex', alignItems: 'center', padding: '0.8rem 1rem',
                                    borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s',
                                    background: isCurrent ? 'rgba(255,165,0,0.1)' : 'transparent',
                                    border: isCurrent ? '1px solid rgba(255,165,0,0.2)' : '1px solid transparent'
                                }} onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }} onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}>

                                    <div style={{ position: 'relative', width: '48px', height: '48px', marginRight: '1rem', flexShrink: 0 }}>
                                        <img src={getImageUrl(track.image)} alt="" style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'cover' }} />
                                        {isCurrent && isPlaying && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2px', paddingBottom: '10px', borderRadius: '4px' }}>
                                                {[1, 2, 3].map(i => <div key={i} style={{ width: '3px', background: 'var(--accent-primary)', borderRadius: '2px', animation: `eqBar 0.${4 + i}s ease-in-out infinite alternate` }} />)}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ color: isCurrent ? 'var(--accent-primary)' : '#fff', fontWeight: 500, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {(track.title || track.name || 'Unknown Track')?.replace(/&quot;/g, '"')}
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {track.primaryArtists || track.subtitle}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                                        <AddToPlaylist song={track} />
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', width: '50px', textAlign: 'right' }}>
                                            {formatTime(track.duration)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                        No tracks available in this collection.
                    </div>
                )}
            </div>

            <div ref={loaderRef} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {loadingMore ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', color: 'var(--accent-primary)' }}>
                        <Loader2 className="spin" size={24} /> Loading more awesome tracks...
                    </div>
                ) : !hasMore && tracks?.length > 0 && type !== 'album' ? (
                    <p style={{ opacity: 0.5 }}>You've reached the end of the collection.</p>
                ) : null}
            </div>

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
