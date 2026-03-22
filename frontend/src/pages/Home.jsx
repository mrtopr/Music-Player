import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Flame, ChevronRight, ListMusic, Mic2, Play, Pause, Music, History, Sparkles } from 'lucide-react';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { themeManager } from '../utils/themeManager.js';
import { getRecentlyPlayed } from '../utils/history.js';
import { getRecommendations } from '../utils/recommendations.js';
import AddToPlaylist from '../components/common/AddToPlaylist';

const CATEGORIES = [
    { label: 'All Music', query: 'bollywood trending 2024 hits' },
    { label: 'Romantic', query: 'romantic hindi songs' },
    { label: 'Dance', query: 'bollywood dance party songs' },
    { label: 'Sad', query: 'sad hindi songs emotional' },
    { label: 'Party', query: 'bollywood party songs 2024' },
    { label: 'Classical', query: 'indian classical music' },
    { label: 'Rock', query: 'hindi rock songs' },
    { label: 'Pop', query: 'hindi pop songs 2024' },
    { label: 'Hip Hop', query: 'desi hip hop rap' },
    { label: 'Latest 2024', query: 'latest bollywood 2024' },
];

function SongCard({ song, onPlay, isCurrentSong, isPlaying }) {
    const active = isCurrentSong ? 'playing' : '';
    return (
        <div className={`card song-card ${active}`} onClick={() => onPlay(song)} style={{ minWidth: '180px', maxWidth: '200px', flex: '0 0 auto' }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
                <img src={getImageUrl(song.image) || '/mehfil-logo.png'} alt={song.title || song.name} loading="lazy" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
                {isCurrentSong && isPlaying && (
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ width: '3px', background: 'var(--accent-primary)', borderRadius: '2px', animation: `eqBar 0.${4 + i}s ease-in-out infinite alternate` }} />
                        ))}
                    </div>
                )}
            </div>
            <h3 style={{ marginTop: '0.5rem', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.title?.replace(/&quot;/g, '"') || song.name?.replace(/&quot;/g, '"')}
            </h3>
            <p style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                {song.subtitle || song.primaryArtists || 'Various Artists'}
            </p>
            <div className="card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto' }}>
                <button className="play-btn" onClick={(e) => { e.stopPropagation(); onPlay(song); }} aria-label={`Play ${song.title}`}>
                    {isCurrentSong && isPlaying ? <Pause size={20} fill="var(--mehfil-dark-base)" color="var(--mehfil-dark-base)" /> : <Play size={20} fill="var(--mehfil-dark-base)" color="var(--mehfil-dark-base)" />}
                </button>
                <AddToPlaylist song={song} />
            </div>
        </div>
    );
}

function SectionHeader({ icon: Icon, title, onShowMore }) {
    return (
        <div className="section-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1><Icon className="icon-svg" size={24} color="var(--accent-primary)" style={{ marginRight: '12px' }} /> {title}</h1>
            {onShowMore && (
                <button
                    className="show-more-btn"
                    onClick={onShowMore}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-secondary)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                >
                    Show More <ChevronRight size={14} />
                </button>
            )}
        </div>
    );
}

function HorizontalScroll({ songs, onPlay, currentId, isPlaying }) {
    return (
        <div className="horizontal-scroll" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1.5rem', scrollbarWidth: 'thin' }}>
            {songs.map(song => (
                <SongCard key={song.id || song.title} song={song} onPlay={onPlay} isCurrentSong={currentId === song.id} isPlaying={isPlaying} />
            ))}
        </div>
    );
}

function ArtistCard({ artist, onPlay }) {
    return (
        <div className="card artist-card" style={{ minWidth: '150px', maxWidth: '170px', flex: '0 0 auto', textAlign: 'center', cursor: 'pointer' }} onClick={() => onPlay(artist)}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '50%', marginBottom: '1rem', boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }}>
                <img src={getImageUrl(artist.image) || '/mehfil-logo.png'} alt={artist.title || artist.name} loading="lazy" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
            </div>
            <h3 style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                {artist.title || artist.name?.replace(/&quot;/g, '"')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Artist</p>
        </div>
    );
}

function ArtistHorizontalScroll({ artists, onPlay }) {
    return (
        <div className="horizontal-scroll" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1.5rem', scrollbarWidth: 'thin' }}>
            {artists.map(artist => (
                <ArtistCard key={artist.id} artist={artist} onPlay={onPlay} />
            ))}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {[...Array(6)].map((_, i) => (
                <div key={i} style={{ minWidth: '180px', flex: '0 0 auto' }}>
                    <div className="skeleton-pulse" style={{ width: '100%', aspectRatio: '1/1', background: 'rgba(255,255,255,0.06)', borderRadius: '8px' }} />
                    <div className="skeleton-pulse" style={{ marginTop: '0.5rem', height: '14px', width: '80%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                    <div className="skeleton-pulse" style={{ marginTop: '0.3rem', height: '12px', width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                </div>
            ))}
        </div>
    );
}

export default function Home() {
    const [trending, setTrending] = useState([]);
    const [newReleases, setNewReleases] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [artists, setArtists] = useState([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(0);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categorySongs, setCategorySongs] = useState([]);

    const navigate = useNavigate();

    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const currentSong = usePlayerStore(s => s.currentSong);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const currentId = currentSong?.id;

    useEffect(() => {
        async function fetchHome() {
            setLoading(true);
            try {
                // Fetch dynamic trending songs from JioSaavn playlists like Spotify
                const artistNames = ['Arijit Singh', 'Shreya Ghoshal', 'Badshah', 'Divine', 'Jubin Nautiyal', 'Sonu Nigam', 'Raftaar', 'MC Stan'];
                const [modules, ...artistResps] = await Promise.all([
                    apiFetch('/api/modules', { language: 'hindi,english' }),
                    ...artistNames.map(name => apiFetch('/api/search/artists', { query: name, limit: 1 }))
                ]);

                const popularArtists = artistResps.map(r => r.results?.[0]).filter(Boolean);

                if (modules) {
                    setTrending(modules.trending?.songs || []);
                    setNewReleases(modules.trending?.albums || modules.albums || []);
                    setArtists(popularArtists || []);
                    setPlaylists(modules.playlists || []);
                }

                // Load History & Recommendations
                setRecentlyPlayed(getRecentlyPlayed(10));
                getRecommendations(12).then(setRecommendations);

            } catch (err) {
                console.error('Failed to load dynamic home data', err);
            } finally {
                setLoading(false);
            }
        }
        fetchHome();
    }, []);

    const handlePlayMedia = (item) => {
        if (!item) return;

        if (item.type === 'artist' || item.role === 'artist') {
            navigate(`/artist/${item.id}`);
        } else if (item.type === 'album') {
            navigate(`/album/${item.id}`);
        } else if (item.type === 'playlist') {
            navigate(`/playlist/${item.id}`);
        } else if (item.type === 'song') {
            playSong(item);
        } else {
            // Unidentified type, assume search
            navigate(`/search?q=${encodeURIComponent(item.title || item.name || item.id)}`);
        }
    };

    const handleCategory = useCallback(async (index) => {
        const category = CATEGORIES[index].label;
        setActiveCategory(index);
        
        // Apply dynamic theme based on category
        themeManager.applyTheme(category);

        if (index === 0) { setCategorySongs([]); return; }
        setCategoryLoading(true);
        try {
            const res = await apiFetch('/api/search/songs', { query: CATEGORIES[index].query, language: 'hindi', limit: 15 });
            setCategorySongs(res.results || []);
        } catch (err) {
            console.error('Category fetch failed:', err);
        } finally {
            setCategoryLoading(false);
        }
    }, []);

    const handlePlayAll = (songs) => {
        if (songs.length) playQueue(songs, 0);
    };

    return (
        <div style={{ display: 'block', paddingBottom: '100px' }}>
            {/* Intro Hero */}
            <section className="mehfil-intro">
                <div className="hero-glow"></div>
                <div className="intro-text">
                    <h1>Welcome to Mehfil</h1>
                    <p>
                        Experience the magic of music! From soulful melodies to energetic beats,
                        discover curated playlists and find your next favorite song. दिल से सुनो 🎵
                    </p>
                    <div className="hero-cta">
                        <button className="primary-cta-btn" onClick={() => handlePlayAll(trending)}>
                            <PlayCircle size={20} />
                            🎧 Start Listening
                        </button>
                        <button className="secondary-cta-btn" onClick={() => handlePlayAll(trending)}>
                            <Flame size={20} />
                            Play Trending
                        </button>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <div className="featured-playlists">
                <h2>Select Category</h2>
                <div className="category-scroll">
                    {CATEGORIES.map((cat, i) => (
                        <button
                            key={cat.label}
                            type="button"
                            className={`btn btn-outline-primary ${activeCategory === i ? 'active' : ''}`}
                            onClick={() => handleCategory(i)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category Results */}
            {activeCategory > 0 && (
                <div className="trending" style={{ marginBottom: 'var(--space-xl, 1.5rem)' }}>
                    <SectionHeader icon={Music} title={CATEGORIES[activeCategory].label} />
                    {categoryLoading ? <LoadingSkeleton /> : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                            {categorySongs.map(song => (
                                <SongCard key={song.id} song={song} onPlay={playSong} isCurrentSong={currentId === song.id} isPlaying={isPlaying} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Trending Now */}
            {activeCategory === 0 && (
                <>
                    {recentlyPlayed.length > 0 && (
                        <div className="trending" style={{ marginBottom: '1.5rem' }}>
                            <SectionHeader icon={History} title="Recently Played" />
                            <HorizontalScroll songs={recentlyPlayed} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    )}

                    <div className="trending">
                        <SectionHeader
                            icon={Flame}
                            title="Trending Now"
                            onShowMore={() => navigate('/search?q=trending+hits')}
                        />
                        {loading ? <LoadingSkeleton /> : <HorizontalScroll songs={trending} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />}
                    </div>

                    {recommendations.length > 0 && (
                        <div className="recommendations" style={{ marginTop: '1.5rem' }}>
                            <SectionHeader
                                icon={Sparkles}
                                title="Made For You"
                                onShowMore={() => navigate('/search?q=recommended')}
                            />
                            <HorizontalScroll songs={recommendations} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    )}

                    <div className="artists-section" style={{ marginTop: '1.5rem' }}>
                        <SectionHeader icon={Mic2} title="Popular Artists" onShowMore={() => navigate('/artists')} />
                        {loading ? <LoadingSkeleton /> : <ArtistHorizontalScroll artists={artists} onPlay={handlePlayMedia} />}
                    </div>

                    <div className="nrelease" style={{ marginTop: '1.5rem' }}>
                        <SectionHeader
                            icon={ListMusic}
                            title="New Releases"
                            onShowMore={() => navigate('/search?q=new+releases')}
                        />
                        {loading ? <LoadingSkeleton /> : <HorizontalScroll songs={newReleases} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />}
                    </div>

                    <div className="playlist" style={{ marginTop: '1.5rem' }}>
                        <SectionHeader icon={Music} title="Popular Albums" />
                        {loading ? <LoadingSkeleton /> : <HorizontalScroll songs={playlists} onPlay={handlePlayMedia} currentId={currentId} isPlaying={isPlaying} />}
                    </div>
                </>
            )}
        </div>
    );
}
