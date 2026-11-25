import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    PlayCircle, Flame, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, ListMusic, Mic2, Play, Pause, Music,
    History, Sparkles, Heart, Compass, Check, Users, SlidersHorizontal, Download, X, Smartphone, Activity, Frown, Award, Zap, Star, Mic, Calendar, Disc3
} from '../components/common/LordIcon';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUniverseStore } from '../store/useUniverseStore';
import { getRecentlyPlayed } from '../utils/history.js';
import { getUserProfile, savePreferredGenres } from '../utils/history.js';
import { getRecommendations, getPersonalizedSections, getDiscoverSongs } from '../utils/recommendations.js';
import { GENRE_PROFILES, ALL_GENRES } from '../utils/genreProfiles.js';
import AddToPlaylist from '../components/common/AddToPlaylist';
import BackgroundAnimation from '../components/common/BackgroundAnimation';
import Card3D from '../components/common/Card3D';
import { decodeEntities, cleanTrackTitle } from '../utils/helpers.js';

const CATEGORY_ICONS = {
    Music, Heart, Activity, Frown, Sparkles, Award, Zap, Star, Mic, Calendar, Disc3, Flame
};

function getCleanGreeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Night owl mode';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
}

function SongCard3D({ song, onPlay, isCurrentSong, isPlaying }) {
    const active = isCurrentSong ? 'playing' : '';
    return (
        <Card3D className={`cover-card song-card ${active}`} onClick={() => onPlay(song)} elevation={2}>
            <div className="cover-art">
                <img src={getImageUrl(song.image) || '/mehfil-logo.png'} alt={song.title || song.name} loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 100%)', borderRadius: 'inherit' }} />
                {isCurrentSong && isPlaying && (
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px', zIndex: 3 }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ width: '3px', background: 'var(--accent-primary, #8B5CF6)', borderRadius: '2px', animation: `eqBar 0.${4 + i}s ease-in-out infinite alternate` }} />
                        ))}
                    </div>
                )}
                <button
                    className="card-play-btn"
                    onClick={(e) => { e.stopPropagation(); onPlay(song); }}
                    title={isCurrentSong && isPlaying ? "Pause" : "Play"}
                >
                    {isCurrentSong && isPlaying ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" />}
                </button>
            </div>
            <h3 className="cover-title">
                {song.title?.replace(/&quot;/g, '"') || song.name?.replace(/&quot;/g, '"')}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '2px' }}>
                <p className="cover-sub" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                    {song.subtitle || song.primaryArtists || 'Various Artists'}
                </p>
                <AddToPlaylist song={song} />
            </div>
        </Card3D>
    );
}

function AlbumCard3D({ album, onOpen }) {
    return (
        <Card3D className="cover-card album-card" onClick={() => onOpen(album)} elevation={2}>
            <div className="cover-art">
                <img src={getImageUrl(album.image) || '/mehfil-logo.png'} alt={album.name || album.title} loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 100%)', borderRadius: 'inherit' }} />
            </div>
            <h3 className="cover-title">
                {(album.name || album.title || '').replace(/&quot;/g, '"')}
            </h3>
            <p className="cover-sub">
                {album.year ? `${album.year} • Album` : 'Album'}
            </p>
        </Card3D>
    );
}

function PlaylistCard3D({ playlist, onOpen }) {
    return (
        <Card3D className="cover-card playlist-card" onClick={() => onOpen(playlist)} elevation={2}>
            <div className="cover-art">
                <img src={getImageUrl(playlist.image) || '/mehfil-logo.png'} alt={playlist.name || playlist.title} loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 100%)', borderRadius: 'inherit' }} />
            </div>
            <h3 className="cover-title">
                {(playlist.name || playlist.title || '').replace(/&quot;/g, '"')}
            </h3>
            <p className="cover-sub">
                {playlist.songCount ? `${playlist.songCount} songs` : 'Playlist'}
            </p>
        </Card3D>
    );
}

function SectionHeader3D({ title, onShowMore }) {
    return (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingLeft: '0.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #fff 0%, var(--accent-secondary, #C084FC) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {title}
            </h2>
            {onShowMore && (
                <button
                    onClick={onShowMore}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        letterSpacing: '1px',
                        padding: '6px 16px',
                        borderRadius: '50px',
                        transition: 'all 0.2s',
                        textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--accent-secondary, #C084FC)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                >
                    See All
                </button>
            )}
        </div>
    );
}

function HorizontalScroll3D({ songs, onPlay, currentId, isPlaying, sectionClass, renderItem }) {
    const scrollRef = React.useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 10);
        }
    };

    const scroll = (dir) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir * (window.innerWidth > 768 ? 650 : 320), behavior: 'smooth' });
        }
    };

    useEffect(() => {
        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [songs]);

    return (
        <div style={{ position: 'relative' }} className={`horizontal-scroll-container ${sectionClass || ''}`}>
            {canScrollLeft && (
                <button onClick={() => scroll(-1)} style={{
                    position: 'absolute', top: '50%', left: '0', transform: 'translateY(-50%)',
                    zIndex: 10, width: '44px', height: '44px', borderRadius: '50%',
                    background: 'rgba(20, 20, 30, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s'
                }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30, 30, 40, 0.9)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(20, 20, 30, 0.8)'}>
                    <ChevronLeft size={24} />
                </button>
            )}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="cover-row"
            >
                {songs.map(song => (
                    renderItem
                        ? renderItem(song)
                        : <SongCard3D key={song.id || song.title} song={song} onPlay={onPlay} isCurrentSong={currentId === song.id} isPlaying={isPlaying} />
                ))}
            </div>
            <div style={{
                position: 'absolute', right: 0, top: 0, bottom: '2rem', width: '70px',
                background: 'linear-gradient(to left, var(--bg-main) 0%, transparent)',
                pointerEvents: 'none', zIndex: 2, borderRadius: '0 16px 16px 0',
                opacity: canScrollRight ? 1 : 0, transition: 'opacity 0.3s'
            }} />
            {canScrollRight && (
                <button onClick={() => scroll(1)} style={{
                    position: 'absolute', top: '50%', right: '0', transform: 'translateY(-50%)',
                    zIndex: 10, width: '44px', height: '44px', borderRadius: '50%',
                    background: 'rgba(20, 20, 30, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s'
                }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30, 30, 40, 0.9)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(20, 20, 30, 0.8)'}>
                    <ChevronRight size={24} />
                </button>
            )}
        </div>
    );
}

function ArtistCard3D({ artist, onPlay }) {
    return (
        <Card3D className="cover-card artist-card" onClick={() => onPlay(artist)} elevation={2} style={{ textAlign: 'center' }}>
            <div className="cover-art" style={{ borderRadius: '50%', margin: '0 auto 10px auto', maxWidth: '160px' }}>
                <img src={getImageUrl(artist.image) || '/mehfil-logo.png'} alt={artist.title || artist.name} loading="lazy" style={{ borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            </div>
            <h3 className="cover-title" style={{ textAlign: 'center' }}>
                {artist.title || artist.name?.replace(/&quot;/g, '"')}
            </h3>
            <p className="cover-sub" style={{ textAlign: 'center' }}>Artist</p>
        </Card3D>
    );
}

function ArtistHorizontalScroll3D({ artists, onPlay }) {
    const scrollRef = React.useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 10);
        }
    };

    const scroll = (dir) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir * (window.innerWidth > 768 ? 650 : 320), behavior: 'smooth' });
        }
    };

    useEffect(() => {
        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [artists]);

    return (
        <div style={{ position: 'relative' }}>
            {canScrollLeft && (
                <button onClick={() => scroll(-1)} style={{
                    position: 'absolute', top: '50%', left: '0', transform: 'translateY(-50%)',
                    zIndex: 10, width: '44px', height: '44px', borderRadius: '50%',
                    background: 'rgba(20, 20, 30, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s'
                }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30, 30, 40, 0.9)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(20, 20, 30, 0.8)'}>
                    <ChevronLeft size={24} />
                </button>
            )}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="cover-row"
            >
                {artists.map(artist => (
                    <ArtistCard3D key={artist.id} artist={artist} onPlay={onPlay} />
                ))}
            </div>
            <div style={{
                position: 'absolute', right: 0, top: 0, bottom: '2rem', width: '70px',
                background: 'linear-gradient(to left, var(--bg-main) 0%, transparent)',
                pointerEvents: 'none', zIndex: 2, borderRadius: '0 16px 16px 0',
                opacity: canScrollRight ? 1 : 0, transition: 'opacity 0.3s'
            }} />
            {canScrollRight && (
                <button onClick={() => scroll(1)} style={{
                    position: 'absolute', top: '50%', right: '0', transform: 'translateY(-50%)',
                    zIndex: 10, width: '44px', height: '44px', borderRadius: '50%',
                    background: 'rgba(20, 20, 30, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s'
                }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30, 30, 40, 0.9)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(20, 20, 30, 0.8)'}>
                    <ChevronRight size={24} />
                </button>
            )}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '2rem' }}>
            {[...Array(6)].map((_, i) => (
                <div key={i} style={{ minWidth: '200px', flex: '0 0 auto' }}>
                    <div className="skeleton-pulse" style={{ width: '100%', aspectRatio: '1/1', background: 'rgba(255,255,255,0.06)', borderRadius: '16px' }} />
                    <div className="skeleton-pulse" style={{ marginTop: '0.75rem', height: '16px', width: '70%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                    <div className="skeleton-pulse" style={{ marginTop: '0.25rem', height: '14px', width: '50%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                </div>
            ))}
        </div>
    );
}

function HeroBackdrop({ recentTracks }) {
    const albums = recentTracks && recentTracks.length > 0 ? recentTracks.slice(0, 6) : [];

    if (albums.length === 0) {
        return (
            <div
                style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: `
                radial-gradient(ellipse 800px 500px at 20% 20%, rgba(var(--accent-primary-rgb), 0.18), transparent 60%),
                radial-gradient(ellipse 600px 400px at 80% 60%, rgba(var(--accent-secondary-rgb), 0.10), transparent 60%),
                var(--bg-main)
              `
                }}
            />
        );
    }

    const displayAlbums = [];
    while (displayAlbums.length < 6) {
        displayAlbums.push(...albums);
    }
    const finalAlbums = displayAlbums.slice(0, 6);

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', borderRadius: 'inherit' }}>
            <div style={{
                position: 'absolute', right: 0, top: 0, height: '100%', width: '66.666667%',
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)',
                opacity: 0.35, filter: 'blur(90px)', transform: 'scale(1.5)', gap: '10px'
            }}>
                {finalAlbums.map((track, i) => (
                    <img
                        key={`${track.id}-${i}`}
                        src={getImageUrl(track.image) || '/mehfil-logo.png'}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                ))}
            </div>
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to right, var(--bg-main) 0%, color-mix(in srgb, var(--bg-main) 60%, transparent) 40%, transparent 100%)'
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, var(--bg-main) 0%, transparent 40%, color-mix(in srgb, var(--bg-main) 60%, transparent) 100%)'
            }} />
        </div>
    );
}

export default function Home() {
    const user = useAuthStore(s => s.user);
    const userName = user?.name || '';
    const activeUniverseId = useUniverseStore(s => s.activeUniverseId);
    const activeUniverse = useUniverseStore(s => s.activeUniverse);
    const categories = activeUniverse.categories;

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
    const [selectedGenres, setSelectedGenres] = useState(['Romantic', 'Dance', 'Pop']);
    const [userProfile, setUserProfile] = useState(null);

    const [canInstall, setCanInstall] = useState(!!window.__deferredPrompt);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    const navigate = useNavigate();

    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const togglePlay = usePlayerStore(s => s.togglePlay);
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

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('pwa-can-install', handler);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setActiveCategory(0);
        setCategorySongs([]);
        setLoading(true);

        const modulesPromise = apiFetch('/api/modules', { language: activeUniverse.moduleLanguages })
            .catch(err => {
                console.error('Failed to load modules', err);
                return null;
            });

        const trendingSearchPromise = activeUniverseId !== 'bollywood'
            ? apiFetch('/api/search/songs', {
                query: activeUniverse.trendingQuery,
                language: activeUniverse.language,
                limit: 15
            }).catch(err => {
                console.error('Failed to load universe trending songs', err);
                return null;
            })
            : Promise.resolve(null);

        Promise.all([modulesPromise, trendingSearchPromise]).then(([modules, universeTrending]) => {
            if (cancelled) return;
            const universeSongs = universeTrending?.results || [];
            if (universeSongs.length > 0) {
                setTrending(universeSongs);
            } else if (modules) {
                setTrending(modules.trending?.songs || []);
            } else {
                setTrending([]);
            }

            if (modules) {
                const albumIds = new Set();
                setNewReleases([
                    ...(modules.newReleases?.albums || []),
                    ...(modules.trending?.albums || []),
                ].filter(album => {
                    if (albumIds.has(album.id)) return false;
                    albumIds.add(album.id);
                    return true;
                }));
                setPlaylists(modules.playlists || []);
            }
            setLoading(false);
        });

        Promise.all(
            activeUniverse.artists.map(name => apiFetch('/api/search/artists', { query: name, limit: 1 }))
        )
            .then(artistResps => {
                if (cancelled) return;
                const popularArtists = artistResps.map(r => r.results?.[0]).filter(Boolean);
                setArtists(popularArtists || []);
            })
            .catch(err => console.error('Failed to load artists', err));

        setRecentlyPlayed(getRecentlyPlayed(10));
        getRecommendations(12).then(res => { if (!cancelled) setRecommendations(res); }).catch(() => {});
        getPersonalizedSections().then(res => { if (!cancelled) setPersonalizedSections(res); }).catch(() => {});
        getDiscoverSongs(10).then(res => { if (!cancelled) setDiscoverSongs(res); }).catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [activeUniverseId, activeUniverse]);

    const handleOnboardingComplete = async (genres = selectedGenres) => {
        savePreferredGenres(genres || []);
        setShowOnboarding(false);
        setLoading(true);
        try {
            const [sections] = await Promise.all([getPersonalizedSections()]);
            setPersonalizedSections(sections);
        } catch (e) {
            console.error('Personalized section refresh failed:', e);
        } finally {
            setLoading(false);
        }
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
        const category = categories[index];
        if (!category) return;
        setActiveCategory(index);
        // "All Music" / first category is the trending list that is already loaded — no need
        // for a second request, and it keeps the page from being empty.
        if (index === 0) { setCategorySongs([]); return; }
        setCategoryLoading(true);
        try {
            const res = await apiFetch('/api/search/songs', {
                query: category.query,
                language: activeUniverse.language,
                limit: 15
            });
            setCategorySongs(res.results || []);
        } catch (err) {
            console.error('Category fetch failed:', err);
            setCategorySongs([]);
        } finally {
            setCategoryLoading(false);
        }
    }, [categories, activeUniverse.language]);

    const handlePlayAll = (songs) => {
        if (songs.length) playQueue(songs, 0);
    };

    return (
        <div style={{ display: 'block', paddingBottom: '100px', position: 'relative', zIndex: 1, minHeight: '100vh' }}>
            <BackgroundAnimation />

            {showOnboarding && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(5,5,10,0.92)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ position: 'relative', background: 'rgba(20, 20, 30, 0.95)', border: '1px solid var(--border-accent, rgba(255,255,255,0.12))', borderRadius: '24px', padding: '2.5rem', maxWidth: '560px', width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,0.85)', backdropFilter: 'blur(30px)' }}>
                        <button
                            onClick={() => handleOnboardingComplete([])}
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            title="Skip for now"
                            aria-label="Close onboarding"
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        >
                            <X size={18} />
                        </button>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎵</div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>Pick Your Vibe</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Select the genres you love and we'll personalize your home feed just for you.</p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '2rem' }}>
                            {ALL_GENRES.map(genre => {
                                const profile = GENRE_PROFILES[genre];
                                const isSelected = selectedGenres.includes(genre);
                                return (
                                    <button
                                        key={genre}
                                        type="button"
                                        onClick={() => {
                                            setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
                                        }}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '50px',
                                            border: isSelected ? '2px solid var(--accent-primary, #10B981)' : '2px solid rgba(255,255,255,0.1)',
                                            background: isSelected ? 'var(--accent-primary-soft, rgba(16, 185, 129, 0.2))' : 'rgba(255,255,255,0.04)',
                                            color: isSelected ? 'var(--accent-secondary, #34D399)' : 'rgba(255,255,255,0.7)',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: isSelected ? 700 : 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                            boxShadow: isSelected ? '0 0 16px var(--accent-primary-soft, rgba(16, 185, 129, 0.3))' : 'none'
                                        }}
                                    >
                                        {profile.emoji} {genre} {isSelected ? '✓' : ''}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleOnboardingComplete(selectedGenres)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '50px',
                                background: 'linear-gradient(135deg, var(--accent-primary, #10B981) 0%, var(--accent-secondary, #34D399) 100%)',
                                color: '#000',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 800,
                                transition: 'all 0.3s ease',
                                boxShadow: '0 8px 25px var(--accent-primary-soft, rgba(16, 185, 129, 0.4))'
                            }}
                        >
                            Continue ({selectedGenres.length} selected)
                        </button>
                    </div>
                </div>
            )}

            {!isMobile && showBanner && (
                <div style={{
                    margin: '1rem',
                    background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.25) 0%, rgba(192, 132, 252, 0.1) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(var(--accent-primary-rgb), 0.3)',
                    borderRadius: '20px',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    boxShadow: '0 8px 32px 0 rgba(var(--accent-primary-rgb), 0.15)',
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
                            background: 'var(--accent-primary-soft, rgba(var(--accent-primary-rgb), 0.2))',
                            color: 'var(--accent-primary, #8B5CF6)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 0 15px rgba(var(--accent-primary-rgb), 0.2)'
                        }}>
                            <Smartphone size={20} />
                        </div>
                        <div style={{ paddingRight: '20px' }}>
                            <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>Get Mehfil Mobile App</h4>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary, rgba(255,255,255,0.7))', fontSize: '0.8rem', lineHeight: 1.4 }}>
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
                                    background: 'var(--accent-primary, #8B5CF6)',
                                    color: '#000',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(var(--accent-primary-rgb), 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                <Download size={14} /> Install Now
                            </button>
                        ) : isIOS ? (
                            <Link
                                to="/settings"
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '50px',
                                    background: 'var(--accent-primary, #8B5CF6)',
                                    color: '#000',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textDecoration: 'none'
                                }}
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
                                    textDecoration: 'none'
                                }}
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

            {isMobile && (
                <div className="mobile-hero-banner" style={{
                    position: 'relative',
                    borderRadius: '24px',
                    padding: '1.5rem',
                    margin: '0 0.85rem 1rem',
                    background: 'var(--hero-gradient)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-accent)'
                }}>
                    <div className="universe-badge-pill">
                        {activeUniverse.badge}
                    </div>
                    <div>
                        <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.9rem)', fontWeight: 'var(--heading-weight, 800)', color: '#fff', margin: '0 0 0.5rem 0', lineHeight: 1.2 }}>
                            {activeUniverse.heroTitle} · <span style={{ color: 'var(--accent-secondary)' }}>{activeUniverse.shortLabel}</span>
                        </h2>
                        <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.45, margin: 0, maxWidth: '300px' }}>
                            {activeUniverse.heroSubtitle}
                        </p>
                    </div>
                    <button
                        style={{
                            marginTop: '1.15rem',
                            background: 'var(--gradient-brand, var(--accent-primary))',
                            border: 'none',
                            color: 'var(--text-on-accent, #fff)',
                            borderRadius: '14px',
                            padding: '11px 22px',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 18px rgba(var(--accent-primary-rgb), 0.45)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        onClick={() => {
                            if (trending && trending.length > 0) playQueue(trending, 0);
                        }}
                    >
                        <Play size={14} fill="currentColor" /> Listen Now
                    </button>
                </div>
            )}

            {!isMobile && (
            <section className="mehfil-intro" style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                padding: '24px 2rem 24px',
                gap: '1.5rem',
                flexWrap: 'wrap',
                position: 'relative',
                width: '100%',
                minHeight: '210px',
                overflow: 'hidden',
                borderRadius: '24px',
                marginBottom: '10px',
                background: 'var(--hero-gradient, rgba(255,255,255,0.02))',
                border: '1px solid var(--border-accent, rgba(255,255,255,0.06))',
                backdropFilter: 'blur(10px)'
            }}>
                <HeroBackdrop recentTracks={recentlyPlayed} />

                <div className="intro-text" style={{ flex: '1 1 300px', maxWidth: '100%', zIndex: 3, position: 'relative' }}>
                    <div className="universe-badge-pill" data-testid="hero-universe-badge">
                        {activeUniverse.badge}
                    </div>
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.6rem)', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem 0', lineHeight: 1.15, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        {getCleanGreeting()},{' '}
                        <span style={{
                            color: 'var(--accent-secondary, var(--accent-primary))',
                            textShadow: '0 0 30px var(--shadow-accent, rgba(16, 185, 129, 0.45))'
                        }}>
                            {userName ? (userName.charAt(0).toUpperCase() + userName.slice(1)) : 'Friend'}
                        </span>
                    </h1>
                    <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, margin: '0 0 1.2rem 0', textShadow: '0 1px 5px rgba(0,0,0,0.5)', maxWidth: '480px' }}>
                        <strong style={{ color: 'var(--accent-secondary, var(--accent-primary))' }}>{activeUniverse.heroTitle}:</strong>{' '}
                        {activeUniverse.heroSubtitle}
                    </p>
                    <div className="hero-cta" style={{ display: 'flex', gap: '0.8rem' }}>
                        <button onClick={() => {
                            if (currentSong) {
                                if (!isPlaying) togglePlay();
                            } else {
                                const recent = getRecentlyPlayed(1);
                                if (recent && recent.length > 0) {
                                    playSong(recent[0]);
                                } else {
                                    handlePlayAll(recommendations.length ? recommendations : trending);
                                }
                            }
                        }} style={{
                            background: 'var(--gradient-brand, var(--accent-primary))',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '12px',
                            padding: '10px 20px',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 18px var(--shadow-accent, rgba(16, 185, 129, 0.45))',
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
                </div>

                {recentlyPlayed.length > 0 && (
                    <div style={{ flex: '1 1 340px', maxWidth: '100%', zIndex: 3, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h3 style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', marginTop: 0 }}>Jump back in</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {recentlyPlayed.slice(0, 4).map((track, i) => {
                                const cleanTitle = cleanTrackTitle(track.title || track.name || '');
                                const cleanArtist = decodeEntities(track.artist || track.primaryArtists || 'Unknown Artist');
                                return (
                                    <div key={i} onClick={() => playSong(track)} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        background: 'rgba(25, 25, 30, 0.65)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '12px', padding: '10px',
                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(40, 40, 45, 0.9)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'var(--border-accent, rgba(255,255,255,0.15))'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(25, 25, 30, 0.65)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                    >
                                        <img src={getImageUrl(track.image) || '/music.png'} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
                                        <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                                            <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', marginBottom: '2px' }} title={cleanTitle}>{cleanTitle}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={cleanArtist}>{cleanArtist}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>
            )}

            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.5px' }}>Browse by Category</h2>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingTop: '4px', paddingBottom: '0.5rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none' }}>
                    {categories.map((cat, i) => {
                        const Icon = CATEGORY_ICONS[cat.iconName] || Music;
                        const active = activeCategory === i;
                        return (
                            <button
                                key={cat.label}
                                type="button"
                                onClick={() => handleCategory(i)}
                                style={{
                                    flex: '0 0 auto',
                                    borderRadius: '50px',
                                    background: active ? 'var(--accent-primary-soft, rgba(16, 185, 129, 0.18))' : 'rgba(255,255,255,0.04)',
                                    border: active ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                                    color: active ? 'var(--accent-secondary, #fff)' : 'rgba(255,255,255,0.7)',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: active ? '0 0 18px var(--shadow-accent, rgba(16, 185, 129, 0.35))' : 'none',
                                    padding: '9px 18px',
                                    outline: 'none'
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
                                <Icon size={16} style={{ color: active ? 'var(--accent-secondary, var(--accent-primary))' : 'var(--text-secondary)' }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '-0.1px', whiteSpace: 'nowrap' }}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeCategory >= 0 && categories[activeCategory] && (
                <div style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                    <SectionHeader3D
                        title={activeCategory === 0 ? `Trending in ${activeUniverse.shortLabel}` : categories[activeCategory].label}
                        onShowMore={activeCategory === 0 ? undefined : () => navigate(`/search?q=${encodeURIComponent(categories[activeCategory].query)}`)}
                    />
                    {activeCategory === 0 ? (
                        trending.length > 0 ? (
                            <div className="cover-grid">
                                {trending.slice(0, 12).map(song => (
                                    <SongCard3D key={song.id} song={song} onPlay={playSong} isCurrentSong={currentId === song.id} isPlaying={isPlaying} />
                                ))}
                            </div>
                        ) : (
                            <LoadingSkeleton />
                        )
                    ) : categoryLoading ? <LoadingSkeleton /> : (
                        categorySongs.length > 0 ? (
                            <div className="cover-grid">
                                {categorySongs.map(song => (
                                    <SongCard3D key={song.id} song={song} onPlay={playSong} isCurrentSong={currentId === song.id} isPlaying={isPlaying} />
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No songs found for this category right now.</p>
                        )
                    )}
                </div>
            )}

            {trending.length > 0 && (
                <div style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                    <SectionHeader3D title="Hot Right Now" onShowMore={() => navigate('/section/trending')} />
                    <HorizontalScroll3D songs={trending} onPlay={playSong} currentId={currentId} isPlaying={isPlaying} />
                </div>
            )}

            {newReleases.length > 0 && (
                <div style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                    <SectionHeader3D title="New Albums" onShowMore={() => navigate('/section/newReleases')} />
                    <HorizontalScroll3D
                        songs={newReleases}
                        renderItem={album => (
                            <AlbumCard3D key={album.id} album={album} onOpen={item => navigate(`/album/${item.id}`)} />
                        )}
                    />
                </div>
            )}

            {playlists.length > 0 && (
                <div style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                    <SectionHeader3D title="Featured Playlists" onShowMore={() => navigate('/playlists')} />
                    <HorizontalScroll3D
                        songs={playlists}
                        renderItem={playlist => (
                            <PlaylistCard3D key={playlist.id} playlist={playlist} onOpen={item => navigate(`/playlist/${item.id}`)} />
                        )}
                    />
                </div>
            )}

            {artists.length > 0 && (
                <div style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                    <SectionHeader3D title="Popular Artists" onShowMore={() => navigate('/artists')} />
                    <ArtistHorizontalScroll3D artists={artists} onPlay={handlePlayMedia} />
                </div>
            )}
        </div>
    );
}
