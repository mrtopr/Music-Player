import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    PlayCircle, Flame, ChevronRight, ListMusic, Mic2, Play, Pause, Music,
    History, Sparkles, Heart, Compass, Check, Users, SlidersHorizontal,
    Download, X, Smartphone, Activity, Frown, Award, Zap, Star, Mic, Calendar, Disc3
} from 'lucide-react';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { themeManager } from '../utils/themeManager.js';
import { getRecentlyPlayed } from '../utils/history.js';
import { getUserProfile, savePreferredGenres } from '../utils/history.js';
import { getRecommendations, getPersonalizedSections, getDiscoverSongs } from '../utils/recommendations.js';
import { GENRE_PROFILES, ALL_GENRES } from '../utils/genreProfiles.js';
import AddToPlaylist from '../components/common/AddToPlaylist';

const CATEGORIES = [
    { label: 'All Music', query: 'bollywood trending 2024 hits', icon: Music },
    { label: 'Romantic', query: 'romantic hindi songs', icon: Heart },
    { label: 'Dance', query: 'bollywood dance party songs', icon: Activity },
    { label: 'Sad', query: 'sad hindi songs emotional', icon: Frown },
    { label: 'Party', query: 'bollywood party songs 2024', icon: Sparkles },
    { label: 'Classical', query: 'indian classical music', icon: Award },
    { label: 'Rock', query: 'hindi rock songs', icon: Zap },
    { label: 'Pop', query: 'hindi pop songs 2024', icon: Star },
    { label: 'Hip Hop', query: 'desi hip hop rap', icon: Mic },
    { label: 'Latest 2024', query: 'latest bollywood 2024', icon: Calendar },
];

function getCleanGreeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Night owl mode';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
}

function SongCard({ song, onPlay, isCurrentSong, isPlaying }) {
    const active = isCurrentSong ? 'playing' : '';
    return (
        <div className={`card song-card ${active}`} onClick={() => onPlay(song)} style={{ minWidth: '180px', maxWidth: '200px', flex: '0 0 auto' }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', aspectRatio: '1/1', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', marginBottom: '12px' }}>
                <img src={getImageUrl(song.image) || '/mehfil-logo.png'} alt={song.title || song.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', marginBottom: 0, boxShadow: 'none' }} />
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

function SectionHeader({ title, onShowMore }) {
    return (
        <div className="section-header" style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                {title}
            </h2>
            {onShowMore && (
                <button
                    onClick={onShowMore}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '1.5px',
                        padding: 0,
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#7c6ff7'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'; }}
                >
                    SEE ALL
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

function Footer() {
    return (
        <footer style={{ marginTop: '4rem', padding: '2rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', fontWeight: 500, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/about" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>About</Link>
                    <Link to="/legal/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>Terms & Conditions</Link>
                    <Link to="/legal/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>Privacy Policy</Link>
                    <Link to="/legal/contact" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>Contact Us</Link>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        Crafted with <Heart size={14} color="#ef4444" fill="#ef4444" style={{ verticalAlign: 'middle', margin: '0 4px' }} /> by <span style={{ color: '#fff' }}>h3y.Sam</span>
                    </p>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', maxWidth: '500px', lineHeight: 1.5 }}>
                    Mehfil is an educational, non-commercial project. Audio streaming is powered by third-party APIs. We do not host any copyrighted media files. By using this platform, you agree to our terms of service.
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                    &copy; {new Date().getFullYear()} Mehfil Music Player. All rights reserved.
                </p>
            </div>
        </footer>
    );
}

export default function Home() {
    const user = useAuthStore(s => s.user);
    const userName = user?.name || '';

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

    const [canInstall, setCanInstall] = useState(!!window.__deferredPrompt);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

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

        const checkInstallState = () => {
            const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            setIsStandalone(standalone);

            const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            setIsIOS(ios);

            const dismissed = localStorage.getItem('mehfil-pwa-banner-dismissed') === 'true';
            if (window.innerWidth < 768 && !standalone && !dismissed) {
                setShowBanner(true);
            }
        };
        checkInstallState();

        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setShowBanner(false);
            } else {
                const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
                const dismissed = localStorage.getItem('mehfil-pwa-banner-dismissed') === 'true';
                if (!standalone && !dismissed) {
                    setShowBanner(true);
                }
            }
        };
        window.addEventListener('resize', handleResize);

        const handler = () => {
            setCanInstall(true);
            const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            const dismissed = localStorage.getItem('mehfil-pwa-banner-dismissed') === 'true';
            if (window.innerWidth < 768 && !standalone && !dismissed) {
                setShowBanner(true);
            }
        };
        window.addEventListener('pwa-can-install', handler);

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

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('pwa-can-install', handler);
        };
    }, []);


    const handleOnboardingComplete = async (selectedGenres) => {
        setShowOnboarding(false);
        setLoading(true);
        const [sections] = await Promise.all([getPersonalizedSections()]);
        setPersonalizedSections(sections);
        setLoading(false);
    };

    const handleDismissBanner = () => {
        localStorage.setItem('mehfil-pwa-banner-dismissed', 'true');
        setShowBanner(false);
    };

    const handleInstallApp = async () => {
        const promptEvent = window.__deferredPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        window.__deferredPrompt = null;
        setCanInstall(false);
        setShowBanner(false);
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

    return (
        <div style={{ display: 'block', paddingBottom: '100px' }}>
            {showOnboarding && (
                <GenreOnboarding onComplete={handleOnboardingComplete} />
            )}

            {showBanner && (
                <div style={{
                    margin: '1rem',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(192, 132, 252, 0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '20px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.15)',
                    animation: 'fadeIn 0.5s ease',
                    zIndex: 10
                }}>
                    <button
                        onClick={handleDismissBanner}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={16} />
                    </button>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                            background: 'var(--accent-primary-soft)',
                            color: 'var(--accent-primary)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)'
                        }}>
                            <Smartphone size={20} />
                        </div>
                        <div style={{ paddingRight: '20px' }}>
                            <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>Get Mehfil Mobile App</h4>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                Install Mehfil for full-screen mode, smoother playback, and offline app support.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {canInstall ? (
                            <button
                                onClick={handleInstallApp}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '50px',
                                    background: 'var(--accent-primary)',
                                    color: '#000',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <Download size={14} /> Install Now
                            </button>
                        ) : isIOS ? (
                            <Link
                                to="/settings"
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '50px',
                                    background: 'var(--accent-primary)',
                                    color: '#000',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textDecoration: 'none',
                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <Smartphone size={14} /> How to Install
                            </Link>
                        ) : (
                            <Link
                                to="/settings"
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '50px',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textDecoration: 'none',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                                <Smartphone size={14} /> View Guide
                            </Link>
                        )}
                        <button
                            onClick={handleDismissBanner}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '50px',
                                background: 'transparent',
                                color: 'rgba(255,255,255,0.6)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        >
                            Not Now
                        </button>
                    </div>
                </div>
            )}

            {/* Personalized Hero */}
            {/* Personalized Hero with Graphic Background */}
            <section className="mehfil-intro" style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                padding: '30px 2rem 35px',
                gap: '1.5rem',
                flexWrap: 'wrap',
                position: 'relative',
                width: '100%',
                minHeight: '260px',
                overflow: 'hidden',
                borderRadius: '24px',
                backgroundImage: 'url("/ChatGPT%20Image%20Jul%2013,%202026,%2004_39_34%20PM.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                marginBottom: '10px'
            }}>
                {/* A subtle dark overlay to ensure text remains readable and to feather all edges seamlessly into the background */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(to right, #09080F 0%, rgba(9, 8, 15, 0.6) 45%, transparent 100%)',
                    boxShadow: 'inset 0 0 120px 80px #09080F',
                    zIndex: 1,
                    pointerEvents: 'none'
                }}></div>

                {/* Left column - Content */}
                <div className="intro-text" style={{ flex: '1 1 450px', maxWidth: '600px', zIndex: 3, position: 'relative' }}>
                    <h1 style={{ fontSize: '2.6rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem 0', lineHeight: 1.15, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        {getCleanGreeting()},{' '}
                        <span style={{
                            background: 'linear-gradient(135deg, #10B981, #34D399)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
                        }}>
                            {userName ? (userName.charAt(0).toUpperCase() + userName.slice(1)) : 'Friend'}
                        </span>
                    </h1>
                    <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, margin: '0 0 1.2rem 0', textShadow: '0 1px 5px rgba(0,0,0,0.5)', maxWidth: '450px' }}>
                        {(userProfile?.preferredGenres?.length > 0 || userProfile?.topGenres?.length > 0)
                            ? `Your mix of ${[...(userProfile.preferredGenres || []), ...(userProfile.topGenres || [])].slice(0, 3).join(' · ')} is ready`
                            : 'Experience the magic of music! From soulful melodies to energetic beats, Suno Dil se'
                        }
                    </p>
                    <div className="hero-cta" style={{ display: 'flex', gap: '0.8rem' }}>
                        <button onClick={() => handlePlayAll(recommendations.length ? recommendations : trending)} style={{
                            background: 'linear-gradient(135deg, #059669, #10B981)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                            cursor: 'pointer'
                        }}>
                            <PlayCircle size={18} />
                            Start Listening
                        </button>
                        <button onClick={() => handlePlayAll(trending)} style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fff',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                        >
                            <Flame size={18} />
                            Play Trending
                        </button>
                    </div>

                    {/* Stats widgets */}
                    <div className="hero-stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '1.5rem' }}>
                        {[
                            { label: 'Songs', val: '12.4K', icon: Music, color: '#10B981' },
                            { label: 'Artists', val: '8.2K', icon: Users, color: '#34D399' },
                            { label: 'Albums', val: '2.4K', icon: Disc3, color: '#059669' },
                            { label: 'Playlists', val: '98', icon: ListMusic, color: '#10B981' },
                        ].map((stat, i) => {
                            const StatIcon = stat.icon;
                            return (
                                <div key={i} style={{
                                    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px',
                                    padding: '10px 16px', borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    minWidth: '115px', flex: '1 1 auto',
                                    backdropFilter: 'blur(12px)',
                                    transition: 'background 0.2s ease',
                                    cursor: 'default'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                >
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: `${stat.color}25`, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        color: stat.color,
                                    }}>
                                        <StatIcon size={16} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{stat.val}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.5px' }}>{stat.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Categories */}
            <div style={{ marginTop: '2.8rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '1.2rem' }}>Browse by Category</h2>
                <div className="category-scroll-grid" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingTop: '4px', paddingBottom: '0.5rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none' }}>
                    {CATEGORIES.map((cat, i) => {
                        const Icon = cat.icon || Music;
                        const active = activeCategory === i;
                        return (
                            <button
                                key={cat.label}
                                type="button"
                                onClick={() => handleCategory(i)}
                                style={{
                                    flex: '0 0 auto',
                                    borderRadius: '50px',
                                    background: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
                                    border: active ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
                                    color: active ? '#10B981' : 'rgba(255,255,255,0.7)',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: active ? '0 0 16px rgba(16, 185, 129, 0.25)' : 'none',
                                    padding: '9px 18px',
                                    outline: 'none',
                                }}
                                onMouseEnter={e => {
                                    if (!active) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                                        e.currentTarget.style.color = '#fff';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!active) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                }}
                            >
                                <Icon size={16} style={{ color: active ? '#10B981' : 'var(--text-secondary)' }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '-0.1px', whiteSpace: 'nowrap' }}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Category Results */}
            {activeCategory > 0 && (
                <div className="trending" style={{ marginBottom: '1.5rem' }}>
                    <SectionHeader title={CATEGORIES[activeCategory].label} />
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
                    {/* Trending Picks (Moved to top) */}
                    <div className="trending" style={{ marginBottom: '1.5rem' }}>
                        <SectionHeader
                            title="Trending Picks"
                            onShowMore={() => navigate('/section/trending')}
                        />
                        {loading ? <LoadingSkeleton /> : <HorizontalScroll songs={trending} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />}
                    </div>

                    {/* Recently Played */}
                    {recentlyPlayed.length > 0 && (
                        <div className="trending" style={{ marginBottom: '1.5rem' }}>
                            <SectionHeader title="Recently played" />
                            <HorizontalScroll songs={recentlyPlayed} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    )}

                    {/* Personalized Sections */}
                    {personalizedSections.map((section, i) => (
                        <div key={i} className="trending" style={{ marginBottom: '1.5rem' }}>
                            <SectionHeader
                                title={section.title}
                            />
                            <HorizontalScroll songs={section.songs} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    ))}

                    {/* Discover New Music */}
                    {discoverSongs.length > 0 && (
                        <div className="trending" style={{ marginBottom: '1.5rem' }}>
                            <SectionHeader title="Discover new music" />
                            <HorizontalScroll songs={discoverSongs} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                        </div>
                    )}

                    {/* Popular Artists */}
                    <div className="artists-section" style={{ marginBottom: '1.5rem' }}>
                        <SectionHeader title="Popular artists" onShowMore={() => navigate('/artists')} />
                        {loading ? <LoadingSkeleton /> : <ArtistHorizontalScroll artists={artists} onPlay={handlePlayMedia} />}
                    </div>

                    {/* New Releases */}
                    <div className="nrelease" style={{ marginBottom: '1.5rem' }}>
                        <SectionHeader
                            title="New releases"
                            onShowMore={() => navigate('/section/newReleases')}
                        />
                        {loading ? <LoadingSkeleton /> : <HorizontalScroll songs={newReleases} onPlay={handlePlayMedia} currentId={currentId} isPlaying={isPlaying} />}
                    </div>

                    {/* Popular Albums */}
                    <div className="playlist" style={{ marginTop: '1.5rem' }}>
                        <SectionHeader title="Popular albums" />
                        {loading ? <LoadingSkeleton /> : <HorizontalScroll songs={playlists} onPlay={handlePlayMedia} currentId={currentId} isPlaying={isPlaying} />}
                    </div>
                </>
            )}

            <Footer />
        </div>
    );
}

