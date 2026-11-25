import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Flame, ListMusic, Sparkles, Disc3, PlayCircle } from '../components/common/LordIcon';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { useUniverseStore } from '../store/useUniverseStore';
import { getRecommendations } from '../utils/recommendations.js';
import AddToPlaylist from '../components/common/AddToPlaylist';
import Card3D from '../components/common/Card3D';

const dedupeById = (items = []) => {
    const seen = new Set();
    return items.filter(item => {
        if (!item || !item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
};

const SECTION_CONFIG = {
    trending: {
        title: 'Trending Now',
        subtitle: 'The hottest tracks in your active universe',
        icon: Flame,
        kind: 'songs',
        fetch: async (universe) => {
            if (universe.id === 'bollywood') {
                const modules = await apiFetch('/api/modules', { language: universe.moduleLanguages });
                const moduleSongs = modules?.trending?.songs || [];
                if (moduleSongs.length >= 12) return dedupeById(moduleSongs);
            }
            const res = await apiFetch('/api/search/songs', {
                query: universe.trendingQuery,
                language: universe.language,
                limit: 30
            });
            return dedupeById(res?.results || []);
        }
    },
    newReleases: {
        title: 'New Albums',
        subtitle: 'Fresh albums & curated releases',
        icon: Disc3,
        kind: 'albums',
        fetch: async (universe) => {
            if (universe.id === 'bollywood') {
                const modules = await apiFetch('/api/modules', { language: universe.moduleLanguages });
                const albums = dedupeById([
                    ...(modules?.newReleases?.albums || []),
                    ...(modules?.trending?.albums || [])
                ]);
                if (albums.length > 0) return albums;
            }
            const res = await apiFetch('/api/search/albums', {
                query: universe.albumQuery,
                language: universe.language,
                limit: 24
            });
            return dedupeById(res?.results || []);
        }
    },
    playlists: {
        title: 'Featured Playlists',
        subtitle: 'Curated playlists for your current vibe',
        icon: ListMusic,
        kind: 'playlists',
        fetch: async (universe) => {
            if (universe.id === 'bollywood') {
                const modules = await apiFetch('/api/modules', { language: universe.moduleLanguages });
                const modulePlaylists = dedupeById(modules?.playlists || []);
                if (modulePlaylists.length > 0) return modulePlaylists;
            }
            const res = await apiFetch('/api/search/playlists', {
                query: universe.playlistQuery,
                language: universe.language,
                limit: 24
            });
            return dedupeById(res?.results || []);
        }
    },
    recommendations: {
        title: 'Made For You',
        subtitle: 'Personalized picks based on your taste',
        icon: Sparkles,
        kind: 'songs',
        fetch: async (universe) => {
            const recs = await getRecommendations(50);
            if (recs.length >= 20) return recs;
            const extra = await apiFetch('/api/search/songs', {
                query: universe.trendingQuery,
                language: universe.language,
                limit: 30
            });
            return dedupeById([...recs, ...(extra?.results || [])]).slice(0, 50);
        }
    }
};

function SongRow({ song, index, onPlay, isCurrentSong, isPlaying }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => onPlay(song)}
            style={{
                display: 'grid',
                gridTemplateColumns: '40px 56px 1fr auto',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 14px',
                borderRadius: '12px',
                cursor: 'pointer',
                background: isCurrentSong
                    ? 'rgba(var(--accent-primary-rgb), 0.12)'
                    : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: isCurrentSong ? '1px solid rgba(var(--accent-primary-rgb), 0.25)' : '1px solid transparent',
                transition: 'all 0.15s ease',
            }}
        >
            <div style={{ textAlign: 'center', color: isCurrentSong ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                {isCurrentSong && isPlaying
                    ? <Pause size={16} color="var(--accent-primary)" fill="var(--accent-primary)" />
                    : hovered
                        ? <Play size={16} color="var(--accent-primary)" fill="var(--accent-primary)" />
                        : index + 1
                }
            </div>

            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <img
                    src={getImageUrl(song.image) || '/mehfil-logo.png'}
                    alt={song.title || song.name}
                    loading="lazy"
                    style={{ width: '56px', height: '56px', objectFit: 'cover', display: 'block' }}
                />
                {isCurrentSong && isPlaying && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{
                                    width: '3px', background: 'var(--accent-primary)', borderRadius: '2px',
                                    animation: `eqBar 0.${4 + i}s ease-in-out infinite alternate`
                                }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontSize: '0.92rem', fontWeight: 600,
                    color: isCurrentSong ? 'var(--accent-primary)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                    {(song.title || song.name || '').replace(/&quot;/g, '"')}
                </div>
                <div style={{
                    fontSize: '0.78rem', color: 'var(--text-muted)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginTop: '3px'
                }}>
                    {song.subtitle || song.primaryArtists || 'Various Artists'}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: hovered || isCurrentSong ? 1 : 0, transition: 'opacity 0.2s' }}>
                <AddToPlaylist song={song} />
            </div>
        </div>
    );
}

function SkeletonRow() {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '40px 56px 1fr', gap: '14px', padding: '10px 14px', alignItems: 'center' }}>
            <div className="skeleton-pulse" style={{ width: '24px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} />
            <div className="skeleton-pulse" style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }} />
            <div>
                <div className="skeleton-pulse" style={{ height: '13px', width: '60%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '8px' }} />
                <div className="skeleton-pulse" style={{ height: '11px', width: '40%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} />
            </div>
        </div>
    );
}

export default function SectionPage() {
    const { type } = useParams();
    const navigate = useNavigate();
    const config = SECTION_CONFIG[type];
    const activeUniverse = useUniverseStore(s => s.activeUniverse);

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const currentSong = usePlayerStore(s => s.currentSong);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const currentId = currentSong?.id;

    useEffect(() => {
        if (!config) { navigate('/'); return; }
        let cancelled = false;
        setLoading(true);
        setError(false);
        config.fetch(activeUniverse)
            .then(data => { if (!cancelled) setItems(data || []); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [type, activeUniverse, config, navigate]);

    const handlePlayAll = useCallback(() => {
        if (items.length && config?.kind === 'songs') playQueue(items, 0);
    }, [items, playQueue, config]);

    const handleItemClick = useCallback((item) => {
        if (config?.kind === 'albums' || item.type === 'album') navigate(`/album/${item.id}`);
        else if (config?.kind === 'playlists' || item.type === 'playlist') navigate(`/playlist/${item.id}`);
        else playSong(item);
    }, [playSong, navigate, config]);

    if (!config) return null;
    const Icon = config.icon;
    const isCollectionGrid = config.kind === 'albums' || config.kind === 'playlists';
    const countLabel = config.kind === 'albums' ? 'albums' : config.kind === 'playlists' ? 'playlists' : 'songs';

    return (
        <div style={{ paddingBottom: '120px', animation: 'fadeIn 0.4s ease' }}>
            <div style={{
                position: 'relative',
                padding: '2rem 1.5rem 2.5rem',
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.14) 0%, rgba(var(--accent-secondary-rgb), 0.06) 50%, transparent 100%)',
                borderBottom: '1px solid rgba(var(--accent-primary-rgb), 0.12)',
                borderRadius: '0 0 24px 24px',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: '-40px', right: '-40px',
                    width: '200px', height: '200px',
                    background: 'radial-gradient(circle, rgba(var(--accent-primary-rgb), 0.18) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />

                <button
                    onClick={() => navigate(-1)}
                    title="Go Back"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff', borderRadius: '50%',
                        width: '40px', height: '40px', cursor: 'pointer',
                        marginBottom: '1.5rem', transition: 'all 0.2s',
                        backdropFilter: 'blur(12px)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-primary-soft)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                    <ArrowLeft size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '16px',
                            background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.24), rgba(var(--accent-secondary-rgb), 0.08))',
                            border: '1px solid var(--border-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 24px rgba(var(--accent-primary-rgb), 0.2)'
                        }}>
                            <Icon size={28} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                                {config.title} · {activeUniverse.shortLabel}
                            </h1>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {loading ? 'Loading...' : `${items.length} ${countLabel} · ${config.subtitle}`}
                            </p>
                        </div>
                    </div>

                    {!loading && items.length > 0 && !isCollectionGrid && (
                        <button
                            onClick={handlePlayAll}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                background: 'var(--gradient-brand)',
                                color: 'var(--text-on-accent, #fff)', border: 'none', borderRadius: '50px',
                                padding: '12px 24px', cursor: 'pointer', fontWeight: 700,
                                fontSize: '0.95rem', boxShadow: '0 4px 16px var(--shadow-accent)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <PlayCircle size={20} /> Play All
                        </button>
                    )}
                </div>
            </div>

            <div style={{ padding: '0 1rem' }}>
                {loading ? (
                    <div>
                        {[...Array(10)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <p>Couldn't load {countLabel}. Please try again.</p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                marginTop: '1rem', padding: '8px 20px', borderRadius: '50px',
                                background: 'var(--accent-primary)', color: 'var(--text-on-accent, #fff)',
                                border: 'none', cursor: 'pointer', fontWeight: 600
                            }}
                        >Retry</button>
                    </div>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <p>No {countLabel} found right now.</p>
                    </div>
                ) : isCollectionGrid ? (
                    <div className="cover-grid">
                        {items.map((item, i) => (
                            <Card3D
                                key={item.id || i}
                                className={`cover-card ${config.kind === 'albums' ? 'album-card' : 'playlist-card'}`}
                                onClick={() => handleItemClick(item)}
                                elevation={2}
                            >
                                <div className="cover-art">
                                    <img src={getImageUrl(item.image) || '/mehfil-logo.png'} alt={item.name || item.title} loading="lazy" />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 100%)', borderRadius: 'inherit' }} />
                                </div>
                                <h3 className="cover-title">
                                    {(item.name || item.title || '').replace(/&quot;/g, '"')}
                                </h3>
                                <p className="cover-sub">
                                    {config.kind === 'albums'
                                        ? (item.year ? `${item.year} • Album` : 'Album')
                                        : (item.songCount ? `${item.songCount} songs` : 'Playlist')}
                                </p>
                            </Card3D>
                        ))}
                    </div>
                ) : (
                    <div>
                        {items.map((song, i) => (
                            <SongRow
                                key={song.id || i}
                                song={song}
                                index={i}
                                onPlay={handleItemClick}
                                isCurrentSong={currentId === song.id}
                                isPlaying={isPlaying}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
