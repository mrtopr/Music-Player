import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search as SearchIcon, PlayCircle, X, Play, Pause, TrendingUp, Loader2, Music, Disc3, ListMusic, User } from '../components/common/LordIcon';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { useUniverseStore } from '../store/useUniverseStore';
import AddToPlaylist from '../components/common/AddToPlaylist';
import { decodeEntities } from '../utils/helpers.js';
import { rankByRelativeSimilarity } from '../utils/relativeSearch.js';


export default function SearchPage() {
    const location = useLocation();
    const query = new URLSearchParams(location.search).get('q') || '';
    const activeUniverse = useUniverseStore(s => s.activeUniverse);

    const [searchType, setSearchType] = useState('songs'); // 'songs', 'albums', 'playlists', 'artists'
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadingContext, setLoadingContext] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searched, setSearched] = useState(false);

    const navigate = useNavigate();
    const inputRef = useRef(null);
    const loaderRef = useRef(null);
    const fetchingRef = useRef(false); // prevents IntersectionObserver double-fire

    const musicSource = usePlayerStore(s => s.musicSource);
    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const currentSong = usePlayerStore(s => s.currentSong);
    const isPlaying = usePlayerStore(s => s.isPlaying);

    const doSearch = useCallback(async (q, type, p = 1) => {
        if (!q || q.length < 2) return;
        if (p === 1) setLoading(true);
        else setLoadingMore(true);
        fetchingRef.current = true;

        setSearched(true);
        try {
            let combined = [];

            const promises = [];

            // 1. Fetch from JioSaavn if source is auto or saavn
            if (musicSource === 'auto' || musicSource === 'saavn') {
                const endpoint = `/api/search/${type}`;
                promises.push(
                    apiFetch(endpoint, { query: q, language: activeUniverse.language, limit: 20, page: p })
                        .then(res => (res.results || []).map(item => ({ ...item, source: 'saavn' })))
                        .catch(e => { console.warn('JioSaavn search failed:', e); return []; })
                );
            }

            // 2. Fetch from YouTube if source is auto or youtube
            if (musicSource === 'auto' || musicSource === 'youtube') {
                promises.push(
                    apiFetch('/api/youtube/search', { query: q, type, limit: 20 })
                        .then(res => (res?.results || []).map(item => ({ ...item, source: 'youtube' })))
                        .catch(e => { console.warn('YouTube search failed:', e); return []; })
                );
            }

            const searchOutputs = await Promise.all(promises);
            combined = searchOutputs.flat();


            const newResults = rankByRelativeSimilarity(q, combined);

            if (p === 1) setResults(newResults);
            else setResults(prev => {
                const existIds = new Set(prev.map(i => i.id));
                const filteredNew = newResults.filter(i => !existIds.has(i.id));
                return rankByRelativeSimilarity(q, [...prev, ...filteredNew]);
            });

            setHasMore(newResults.length >= 10);

        } catch (err) {
            console.error(`Search ${type} failed:`, err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            fetchingRef.current = false;
        }
    }, [musicSource, activeUniverse.language]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !fetchingRef.current && query.length >= 2) {
                const next = page + 1;
                setPage(next);
                doSearch(query, searchType, next);
            }
        }, { threshold: 0.1 });

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, page, query, searchType, doSearch]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setSearched(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            setResults([]);
            setPage(1);
            setHasMore(true);
            doSearch(query, searchType, 1);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [query, searchType, doSearch]);

    const handleTabChange = (type) => {
        setSearchType(type);
        setPage(1);
        setResults([]);
        setHasMore(true);
        if (query.length >= 2) doSearch(query, type, 1);
    };

    const handleQuickSearch = (term) => {
        navigate(`/search?q=${encodeURIComponent(term)}`);
    };

    // Navigate to deep context pages — all songs now go through playSong
    const handleContextClick = (item) => {
        if (searchType === 'songs') {
            playSong(item);
        } else if (searchType === 'albums') {
            navigate(`/album/${item.id}`);
        } else if (searchType === 'playlists') {
            navigate(`/playlist/${item.id}`);
        } else if (searchType === 'artists') {
            navigate(`/artist/${item.id}`);
        }
    };

    const getIconForTab = (type) => {
        switch (type) {
            case 'songs': return <Music size={16} />;
            case 'albums': return <Disc3 size={16} />;
            case 'playlists': return <ListMusic size={16} />;
            case 'artists': return <User size={16} />;
            default: return null;
        }
    };

    return (
        <div style={{ display: 'block', paddingBottom: '100px' }}>
            {loadingContext && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--accent-primary)', fontSize: '1.2rem', fontWeight: 600 }}>
                        <Loader2 className="spin" size={48} /> Fetching Tracks...
                    </div>
                </div>
            )}

            <div style={{ padding: '1rem 1rem 6rem 1rem' }}>
                <style>{`
                    .mobile-only-search { display: none; margin-bottom: 1.5rem; }
                    @media (max-width: 768px) {
                        .mobile-only-search { display: block; }
                    }
                `}</style>

                {/* Mobile Search Bar (Only visible on small screens where TopBar is hidden) */}
                <div className="mobile-only-search">
                    <form onSubmit={(e) => { e.preventDefault(); handleQuickSearch(e.target.search.value); }} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: '14px', padding: '0.7rem 1.2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <SearchIcon size={20} style={{ color: 'rgba(255,255,255,0.6)', marginRight: '12px' }} />
                        <input
                            name="search"
                            type="text"
                            placeholder="Search songs, artists, albums..."
                            defaultValue={query}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '1.05rem', outline: 'none' }}
                        />
                    </form>
                </div>

                {/* Context Tabs */}
                <div className="search-tabs-container" style={{ 

                    display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', 
                    overflowX: 'auto', padding: '0.2rem 0.2rem 0.8rem 0.2rem', 
                    scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
                }}>
                    {['songs', 'albums', 'playlists', 'artists'].map(type => (
                        <button
                            key={type}
                            onClick={() => handleTabChange(type)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 600,
                                cursor: 'pointer', whiteSpace: 'nowrap',
                                borderRadius: '50px', transition: 'all 0.3s ease',
                                background: searchType === type ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                                color: searchType === type ? '#000' : 'rgba(255,255,255,0.6)',
                                border: 'none',
                                flexShrink: 0
                            }}
                        >
                            {getIconForTab(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Trending Searches */}
                {!searched && (
                    <div style={{ marginBottom: 'var(--space-2xl, 2rem)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                            <TrendingUp size={20} color="var(--accent-primary)" /> Trending in {activeUniverse.label}
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {activeUniverse.trendingSearches.map(term => (
                                <button
                                    key={term}
                                    className="trending-search-pill"
                                    onClick={() => handleQuickSearch(term)}
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading && page === 1 && (
                    <div className="results-grid">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} style={{ borderRadius: '12px', padding: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                                <div className="skeleton-pulse" style={{ aspectRatio: searchType === 'artists' ? '1/1' : '1/1', background: 'rgba(255,255,255,0.06)', borderRadius: searchType === 'artists' ? '50%' : '8px' }} />
                                <div className="skeleton-pulse" style={{ marginTop: '0.75rem', height: '16px', width: '80%', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && searched && results.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                        <SearchIcon size={64} strokeWidth={1} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No {searchType} found for "{query}"</h2>
                        <p style={{ fontSize: '1rem' }}>Please make sure your words are spelled correctly or use different keywords.</p>
                    </div>
                )}

                {results.length > 0 && (
                    <>
                        <div className={searchType === 'songs' ? 'list-view' : 'results-grid'}>
                            {results.map((item, i) => {
                                const isSong = searchType === 'songs';
                                const isCurrent = isSong && currentSong?.id === item.id;
                                const isCurrentlyPlaying = isCurrent && isPlaying;
                                const isArtist = searchType === 'artists';

                                if (isSong) {
                                    return (
                                        <div 
                                            key={item.id + '-' + i} 
                                            className={`list-row ${isCurrent ? 'playing' : ''}`} 
                                            onClick={() => handleContextClick(item)}
                                        >
                                            <div className="list-art">
                                                <img src={getImageUrl(item.image) || '/mehfil-logo.png'} alt="" />
                                                <div className="list-art-overlay">
                                                    {isCurrentlyPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
                                                </div>
                                            </div>
                                            <div className="list-info">
                                                <div className="list-title">{decodeEntities(item.title || item.name)}</div>
                                                <div className="list-sub">
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{decodeEntities(item.primaryArtists || item.subtitle || (isSong ? 'Various' : ''))}</span>
                                                    {item.source && (
                                                        <span style={{
                                                            fontSize: '0.6rem',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px',
                                                            flexShrink: 0,
                                                            background: item.source === 'youtube' ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent-primary-soft)',
                                                            color: item.source === 'youtube' ? '#ef4444' : 'var(--accent-primary)',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            {item.source === 'youtube' ? 'YT' : 'JS'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="list-actions">
                                                <AddToPlaylist song={item} />
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={item.id + '-' + i} className={`card ${isArtist ? 'artist-card' : 'song-card'} ${isCurrent ? 'playing' : ''}`} onClick={() => handleContextClick(item)} style={{ cursor: 'pointer', textAlign: isArtist ? 'center' : 'left' }}>
                                        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: isArtist ? '50%' : '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', aspectRatio: '1/1' }}>
                                            <img src={getImageUrl(item.image) || '/mehfil-logo.png'} alt={item.title || item.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            {isCurrent && isPlaying && (
                                                <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', alignItems: 'flex-end', gap: '3px', height: '16px' }}>
                                                    {[1, 2, 3, 4].map(idx => (
                                                        <div key={idx} style={{ width: '3px', background: 'var(--accent-primary)', borderRadius: '2px', animation: `eqBar 0.${4 + idx}s ease-in-out infinite alternate`, boxShadow: '0 0 4px var(--accent-primary)' }} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <h3 style={{ marginTop: '0.75rem', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                            {decodeEntities(item.title || item.name)}
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                                            {decodeEntities(item.subtitle || item.primaryArtists || item.role || (isArtist ? 'Artist' : 'Various'))}
                                        </p>
                                        <div className="card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto' }}>
                                            <button className="play-btn" onClick={(e) => { e.stopPropagation(); handleContextClick(item); }} style={{ boxShadow: '0 4px 12px var(--shadow-accent)', position: 'relative', bottom: 'auto', right: 'auto', left: 'auto' }}>
                                                {isCurrent && isPlaying ? <Pause size={22} fill="var(--mehfil-dark-base)" color="var(--mehfil-dark-base)" /> : <Play size={22} fill="var(--mehfil-dark-base)" color="var(--mehfil-dark-base)" style={{ transform: 'translateX(1px)' }} />}
                                            </button>
                                            {!isArtist && <AddToPlaylist song={item} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Intersection Observer target div */}
                        <div ref={loaderRef} style={{ padding: '2rem 0', textAlign: 'center' }}>
                            {loadingMore ? (
                                <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Loader2 className="spin" size={24} /> Loading more results...
                                </div>
                            ) : hasMore ? (
                                <div style={{ height: '40px' }} /> // Spacer when waiting to scroll
                            ) : (
                                <p style={{ color: 'var(--text-muted)' }}>You've reached the end of the results.</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
                .search-tabs-container::-webkit-scrollbar { display: none; }
                .trending-search-pill {
                    font-size: 0.9rem;
                    padding: 0.6rem 1.2rem;
                    border-radius: 9999px;
                    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
                    background: rgba(255, 255, 255, 0.04);
                    color: var(--text-primary, #ffffff);
                    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                    cursor: pointer;
                    user-select: none;
                }
                .trending-search-pill:hover {
                    background: var(--gradient-brand, var(--accent-primary));
                    color: #000000;
                    font-weight: 700;
                    border-color: transparent;
                    box-shadow: 0 4px 14px var(--shadow-accent);
                    transform: translateY(-2px);
                }
                .trending-search-pill:active {
                    transform: scale(0.96);
                }
            `}</style>
        </div>
    );
}
