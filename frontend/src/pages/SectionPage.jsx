import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Flame, ListMusic, Sparkles, Loader2, PlayCircle } from 'lucide-react';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { getRecommendations } from '../utils/recommendations.js';
import AddToPlaylist from '../components/common/AddToPlaylist';

// Section metadata config
const SECTION_CONFIG = {
    trending: {
        title: 'Trending Now',
        subtitle: 'The hottest songs right now',
        icon: Flame,
        color: '#F97316',
        fetch: async () => {
            const [m1, m2] = await Promise.all([
                apiFetch('/api/search/songs', { query: 'bollywood top hits 2024', language: 'hindi', limit: 30 }),
                apiFetch('/api/search/songs', { query: 'hindi trending songs 2025', language: 'hindi', limit: 30 }),
            ]);
            const combined = [...(m1.results || []), ...(m2.results || [])];
            const seen = new Set();
            return combined.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
        }
    },
    newReleases: {
        title: 'New Releases',
        subtitle: 'Fresh drops and latest albums',
        icon: ListMusic,
        color: '#8B5CF6',
        fetch: async () => {
            const [m1, m2] = await Promise.all([
                apiFetch('/api/search/albums', { query: 'new hindi album 2025', language: 'hindi', limit: 20 }),
                apiFetch('/api/search/songs', { query: 'latest bollywood 2025', language: 'hindi', limit: 40 }),
            ]);
            const combined = [...(m1.results || []), ...(m2.results || [])];
            const seen = new Set();
            return combined.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
        }
    },
    recommendations: {
        title: 'Made For You',
        subtitle: 'Personalized picks based on your taste',
        icon: Sparkles,
        color: '#A78BFA',
        fetch: async () => {
            const recs = await getRecommendations(50);
            if (recs.length >= 20) return recs;
            // Pad with popular songs if not enough personalized
            const extra = await apiFetch('/api/search/songs', { query: 'bollywood popular songs', language: 'hindi', limit: 40 });
            const existIds = new Set(recs.map(s => s.id));
            const extraFiltered = (extra.results || []).filter(s => !existIds.has(s.id));
            return [...recs, ...extraFiltered].slice(0, 50);
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
                    ? 'rgba(139, 92, 246, 0.12)'
                    : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: isCurrentSong ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent',
                transition: 'all 0.15s ease',
            }}
        >
            {/* Index / Play Icon */}
            <div style={{ textAlign: 'center', color: isCurrentSong ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                {isCurrentSong && isPlaying
                    ? <Pause size={16} color="var(--accent-primary)" fill="var(--accent-primary)" />
                    : hovered
                        ? <Play size={16} color="var(--accent-primary)" fill="var(--accent-primary)" />
                        : index + 1
                }
            </div>

            {/* Thumbnail */}
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

            {/* Title + Artist */}
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

            {/* Actions */}
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

    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const currentSong = usePlayerStore(s => s.currentSong);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const currentId = currentSong?.id;

    useEffect(() => {
        if (!config) { navigate('/'); return; }
        setLoading(true);
        setError(false);
        config.fetch()
            .then(data => setSongs(data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [type]);

    const handlePlayAll = useCallback(() => {
        if (songs.length) playQueue(songs, 0);
    }, [songs, playQueue]);

    const handlePlaySong = useCallback((song) => {
        if (song.type === 'album') navigate(`/album/${song.id}`);
        else if (song.type === 'playlist') navigate(`/playlist/${song.id}`);
        else playSong(song);
    }, [playSong, navigate]);

    if (!config) return null;
    const Icon = config.icon;

    return (
        <div style={{ paddingBottom: '120px', animation: 'fadeIn 0.4s ease' }}>

            {/* Hero Header */}
            <div style={{
                position: 'relative',
                padding: '2rem 1.5rem 2.5rem',
                marginBottom: '0.5rem',
                background: `linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(192,132,252,0.05) 50%, transparent 100%)`,
                borderBottom: '1px solid rgba(139,92,246,0.1)',
                borderRadius: '0 0 24px 24px',
                overflow: 'hidden',
            }}>
                {/* Decorative background glow */}
                <div style={{
                    position: 'absolute', top: '-40px', right: '-40px',
                    width: '200px', height: '200px',
                    background: `radial-gradient(circle, ${config.color}22 0%, transparent 70%)`,
                    pointerEvents: 'none'
                }} />

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-secondary)', borderRadius: '50px',
                        padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem',
                        marginBottom: '1.5rem', transition: 'all 0.2s',
                        width: 'fit-content'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <ArrowLeft size={16} /> Back
                </button>

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '16px',
                            background: `linear-gradient(135deg, ${config.color}33, ${config.color}11)`,
                            border: `1px solid ${config.color}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 8px 24px ${config.color}22`
                        }}>
                            <Icon size={28} color={config.color} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                                {config.title}
                            </h1>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {loading ? 'Loading...' : `${songs.length} songs · ${config.subtitle}`}
                            </p>
                        </div>
                    </div>

                    {/* Play All button */}
                    {!loading && songs.length > 0 && (
                        <button
                            onClick={handlePlayAll}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                background: 'linear-gradient(135deg, #7C3AED, #9333EA)',
                                color: '#fff', border: 'none', borderRadius: '50px',
                                padding: '12px 24px', cursor: 'pointer', fontWeight: 700,
                                fontSize: '0.95rem', boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,92,246,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,92,246,0.4)'; }}
                        >
                            <PlayCircle size={20} /> Play All
                        </button>
                    )}
                </div>
            </div>

            {/* Song List */}
            <div style={{ padding: '0 0.5rem' }}>
                {loading ? (
                    <div>
                        {[...Array(12)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
                        <p>Couldn't load songs. Please try again.</p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                marginTop: '1rem', padding: '8px 20px', borderRadius: '50px',
                                background: 'var(--accent-primary)', color: '#fff',
                                border: 'none', cursor: 'pointer', fontWeight: 600
                            }}
                        >Retry</button>
                    </div>
                ) : songs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎵</div>
                        <p>No songs found right now.</p>
                    </div>
                ) : (
                    <div>
                        {songs.map((song, i) => (
                            <SongRow
                                key={song.id || i}
                                song={song}
                                index={i}
                                onPlay={handlePlaySong}
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
