import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Flame, ChevronRight, ListMusic, Mic2, Play, Pause, Music, History, Sparkles, Heart, Compass, Check } from 'lucide-react';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { themeManager } from '../utils/themeManager.js';
import { getRecentlyPlayed } from '../utils/history.js';
import { getUserProfile, savePreferredGenres } from '../utils/history.js';
import { getRecommendations, getPersonalizedSections, getDiscoverSongs } from '../utils/recommendations.js';
import { GENRE_PROFILES, ALL_GENRES } from '../utils/genreProfiles.js';
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

function getGreeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Night Owl Mode 🦉';
    if (h < 12) return 'Good Morning ☀️';
    if (h < 17) return 'Good Afternoon 🎵';
    if (h < 21) return 'Good Evening 🌆';
    return 'Good Night 🌙';
}

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

function SectionHeader({ icon: Icon, title, onShowMore, accentColor }) {
    return (
        <div className="section-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={24} color={accentColor || 'var(--accent-primary)'} />
                {title}
            </h1>
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
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
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

// ── Genre Onboarding Modal ──
function GenreOnboarding({ onComplete }) {
    const [selected, setSelected] = useState([]);

    const toggle = (genre) => {
        setSelected(prev =>
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const handleDone = () => {
        if (selected.length === 0) return;
        savePreferredGenres(selected);
        onComplete(selected);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 5000,
            background: 'rgba(5,5,10,0.85)', backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{
                background: 'rgba(20, 20, 30, 0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '2.5rem',
                maxWidth: '560px', width: '100%',
                boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
                backdropFilter: 'blur(30px)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎵</div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>Pick Your Vibe</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
                        Select the genres you love and we'll personalize your home feed just for you.
                    </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '2rem' }}>
                    {ALL_GENRES.map(genre => {
                        const profile = GENRE_PROFILES[genre];
                        const isSelected = selected.includes(genre);
                        return (
                            <button
                                key={genre}
                                onClick={() => toggle(genre)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '50px',
                                    border: `2px solid ${isSelected ? profile.color : 'rgba(255,255,255,0.1)'}`,
                                    background: isSelected ? `${profile.color}22` : 'rgba(255,255,255,0.04)',
                                    color: isSelected ? profile.color : 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                                }}
                            >
                                {profile.emoji} {genre}
                                {isSelected && <Check size={14} />}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={handleDone}
                    disabled={selected.length === 0}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '50px',
                        background: selected.length > 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                        color: selected.length > 0 ? '#000' : 'rgba(255,255,255,0.3)',
                        border: 'none',
                        cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
                        fontSize: '1rem',
                        fontWeight: 700,
                        transition: 'all 0.3s ease'
                    }}
                >
                    {selected.length > 0 ? `Let's Go! (${selected.length} selected)` : 'Select at least one genre'}
                </button>
            </div>
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
    const [personalizedSections, setPersonalizedSections] = useState([]);
    const [discoverSongs, setDiscoverSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(0);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categorySongs, setCategorySongs] = useState([]);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    const navigate = useNavigate();

    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const currentSong = usePlayerStore(s => s.currentSong);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const currentId = currentSong?.id;

    useEffect(() => {
        const profile = getUserProfile();
        setUserProfile(profile);
        if (profile.isNewUser) {
            setShowOnboarding(true);
        }

        async function fetchHome() {
            setLoading(true);
            try {
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

                setRecentlyPlayed(getRecentlyPlayed(10));

                // Load all personalization data in parallel
                const [recs, sections, discover] = await Promise.all([
                    getRecommendations(12),
                    getPersonalizedSections(),
                    getDiscoverSongs(10)
                ]);
                setRecommendations(recs);
                setPersonalizedSections(sections);
                setDiscoverSongs(discover);

            } catch (err) {
                console.error('Failed to load home data', err);
            } finally {
                setLoading(false);
            }
        }
        fetchHome();
    }, []);

    const handleOnboardingComplete = async (selectedGenres) => {
        setShowOnboarding(false);
        setLoading(true);
        const [sections] = await Promise.all([getPersonalizedSections()]);
        setPersonalizedSections(sections);
        setLoading(false);
    };

    const handlePlayMedia = (item) => {
        if (!item) return;
        if (item.type === 'artist' || item.role === 'artist') navigate(`/artist/${item.id}`);
        else if (item.type === 'album') navigate(`/album/${item.id}`);
        else if (item.type === 'playlist') navigate(`/playlist/${item.id}`);
        else if (item.type === 'song') playSong(item);
        else navigate(`/search?q=${encodeURIComponent(item.title || item.name || item.id)}`);
    };

    const handleCategory = useCallback(async (index) => {
        const category = CATEGORIES[index].label;
        setActiveCategory(index);
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

    const userName = (() => {
        try { return JSON.parse(localStorage.getItem('mehfilUser') || '{}').name?.split(' ')[0]; } catch { return null; }
    })();

    return (
        <div style={{ display: 'block', paddingBottom: '100px' }}>
            {showOnboarding && (
                <GenreOnboarding onComplete={handleOnboardingComplete} />
            )}

            {/* Personalized Hero */}
            <section className="mehfil-intro">
                <div className="hero-glow"></div>
                <div className="intro-text">
                    <div style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '0.5rem', opacity: 0.8 }}>
                        {getGreeting()}
                    </div>
                    <h1>
                        {userName ? `Hey ${userName}, ready to vibe?` : 'Welcome to Mehfil'}
                    </h1>
                    <p>
                        {(userProfile?.preferredGenres?.length > 0 || userProfile?.topGenres?.length > 0)
                            ? `Your personalized mix of ${[...(userProfile.preferredGenres || []), ...(userProfile.topGenres || [])].slice(0, 3).join(', ')} is ready 🎵`
                            : 'Experience the magic of music! From soulful melodies to energetic beats, दिल से सुनो 🎵'
                        }
                    </p>
                    <div className="hero-cta">
                        <button className="primary-cta-btn" onClick={() => handlePlayAll(recommendations.length ? recommendations : trending)}>
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

            {/* Main Feed (only when All Music is active) */}
            {activeCategory === 0 && (
                <>
                    {/* Recently Played */}
                    {recentlyPlayed.length > 0 && (
                        <div className="trending" style={{ marginBottom: '1.5rem' }}>
                            <SectionHeader icon={History} title="Recently Played" />
                            <HorizontalScroll songs={recentlyPlayed} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    )}

                    {/* Personalized Sections (Artist Radio + Genre Mixes + Liked Songs Radio) */}
                    {personalizedSections.map((section, i) => (
                        <div key={i} className="trending" style={{ marginBottom: '1.5rem' }}>
                            <SectionHeader
                                icon={section.icon === 'heart' ? Heart : section.icon === 'genre' ? Music : Sparkles}
                                title={section.title}
                                accentColor={section.color}
                            />
                            <HorizontalScroll songs={section.songs} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    ))}

                    {/* Made For You (based on top artists) */}
                    {recommendations.length > 0 && (
                        <div className="recommendations" style={{ marginTop: '1.5rem' }}>
                            <SectionHeader
                                icon={Sparkles}
                                title={userProfile?.topArtists?.length > 0 ? `Made For You ✨` : 'Trending Picks'}
                                onShowMore={() => navigate('/search?q=recommended')}
                            />
                            <HorizontalScroll songs={recommendations} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    )}

                    {/* Discover New Music */}
                    {discoverSongs.length > 0 && (
                        <div className="trending" style={{ marginTop: '1.5rem' }}>
                            <SectionHeader icon={Compass} title="Discover New Music 🌎" accentColor="#26A69A" />
                            <HorizontalScroll songs={discoverSongs} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    )}

                    {/* Trending Now */}
                    <div className="trending">
                        <SectionHeader
                            icon={Flame}
                            title="Trending Now"
                            onShowMore={() => navigate('/search?q=trending+hits')}
                        />
                        {loading ? <LoadingSkeleton /> : <HorizontalScroll songs={trending} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />}
                    </div>

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
