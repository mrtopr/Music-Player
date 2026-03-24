import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search as SearchIcon, PlayCircle, X, Play, Pause, TrendingUp, Loader2, Music, Disc3, ListMusic, User } from 'lucide-react';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import AddToPlaylist from '../components/common/AddToPlaylist';

const TRENDING_SEARCHES = [
    'Arijit Singh', 'Kesariya', 'Tum Hi Ho', 'Raataan Lambiyan',
    'Dil Diyaan Gallan', 'Chaleya', 'Apna Bana Le', 'Phir Aur Kya Chahiye'
];

const decodeEntities = (text) => {
    if (!text) return '';
    return text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'");
};

export default function SearchPage() {
    const location = useLocation();
    const query = new URLSearchParams(location.search).get('q') || '';

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

    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const currentSong = usePlayerStore(s => s.currentSong);
    const isPlaying = usePlayerStore(s => s.isPlaying);

    const doSearch = useCallback(async (q, type, p = 1) => {
        if (!q || q.length < 2) return;
        if (p === 1) setLoading(true);
        else setLoadingMore(true);

        setSearched(true);
        try {
            const endpoint = `/api/search/${type}`;
            const res = await apiFetch(endpoint, { query: q, limit: 20, page: p });
            const newResults = res.results || [];

            if (p === 1) setResults(newResults);
            else setResults(prev => {
                // simple deduplication just in case
                const existIds = new Set(prev.map(i => i.id));
                return [...prev, ...newResults.filter(i => !existIds.has(i.id))];
            });

            setHasMore(newResults.length > 0);
        } catch (err) {
            console.error(`Search ${type} failed:`, err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && query.length >= 2) {
                setPage(prevPage => {
                    const next = prevPage + 1;
                    doSearch(query, searchType, next);
                    return next;
                });
            }
        }, { threshold: 0.1 });

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, query, searchType, doSearch]);

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

    // Navigate to deep context pages
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

            <div style={{ padding: 'var(--space-2xl, 2rem) 1rem' }}>
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
                            <TrendingUp size={20} color="var(--accent-primary)" /> Trending Searches
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {TRENDING_SEARCHES.map(term => (
                                <button
                                    key={term}
                                    className="btn btn-outline-primary"
                                    onClick={() => handleQuickSearch(term)}
                                    style={{
                                        fontSize: '0.9rem', padding: '0.6rem 1.2rem',
                                        borderRadius: 'var(--radius-pill)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'rgba(255,255,255,0.03)',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'var(--accent-primary)';
                                        e.currentTarget.style.color = '#fff';
                                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 165, 0, 0.4)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading && page === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem' }}>
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
                        <div className={searchType === 'songs' ? 'song-list-view' : 'results-grid'}>
                            {results.map((item, i) => {
                                const isSong = searchType === 'songs';
                                const isCurrent = isSong && currentSong?.id === item.id;
                                const isArtist = searchType === 'artists';

                                if (isSong) {
                                    return (
                                        <div 
                                            key={item.id + '-' + i} 
                                            className={`song-list-item ${isCurrent ? 'playing' : ''}`} 
                                            onClick={() => handleContextClick(item)}
                                        >
                                            <div className="song-art-container">
                                                <img src={getImageUrl(item.image) || '/mehfil-logo.png'} alt="" />
                                                <div className="song-play-overlay">
                                                    {isCurrent && isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
                                                </div>
                                            </div>
                                            <div className="song-details">
                                                <div className="song-name">{decodeEntities(item.title || item.name)}</div>
                                                <div className="song-meta">{decodeEntities(item.primaryArtists || item.subtitle || (isSong ? 'Various' : ''))}</div>
                                            </div>
                                            <div className="song-actions">
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
                                            <button className="play-btn" onClick={(e) => { e.stopPropagation(); handleContextClick(item); }} style={{ boxShadow: '0 4px 12px rgba(255,165,0,0.3)', position: 'relative', bottom: 'auto', right: 'auto', left: 'auto' }}>
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
                
                .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1.25rem; }
                .song-list-view { display: flex; flex-direction: column; gap: 8px; }
                
                .song-list-item { 
                    display: flex; align-items: center; gap: 12px; padding: 10px 14px; 
                    background: rgba(255,255,255,0.03); border-radius: 12px; cursor: pointer; 
                    transition: all 0.2s ease; border: 1px solid transparent;
                }
                .song-list-item:hover { background: rgba(255,255,255,0.08); transform: translateX(5px); }
                .song-list-item.playing { background: rgba(var(--accent-primary-rgb), 0.1); border-color: rgba(var(--accent-primary-rgb), 0.2); }
                
                .song-art-container { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; position: relative; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
                .song-art-container img { width: 100%; height: 100%; object-fit: cover; }
                .song-play-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: none; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
                .song-list-item:hover .song-play-overlay { display: flex; }
                .song-list-item.playing .song-play-overlay { display: flex; background: rgba(var(--accent-primary-rgb), 0.3); }
                
                .song-details { flex: 1; min-width: 0; }
                .song-name { color: #fff; font-weight: 600; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .song-meta { color: rgba(255,255,255,0.5); font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
                
                .song-actions { opacity: 0.5; transition: opacity 0.2s; }
                .song-list-item:hover .song-actions { opacity: 1; }
                
                @media (max-width: 768px) {
                    .results-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
                    .song-list-item { padding: 8px 10px; }
                    .song-art-container { width: 44px; height: 44px; }
                    .song-name { font-size: 0.95rem; }
                    .song-meta { font-size: 0.8rem; }
                }
            `}</style>
        </div>
    );
}
