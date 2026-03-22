import React, { useState, useEffect } from 'react';
import { Mic2, Play, ArrowLeft, Loader2 } from 'lucide-react';
import { apiFetch, getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { useNavigate } from 'react-router-dom';

const CURATED_SINGERS = [
    'Arijit Singh', 'Shreya Ghoshal', 'Sonu Nigam', 'Jubin Nautiyal',
    'Neha Kakkar', 'Mohit Chauhan'
];

const CURATED_RAPPERS = [
    'Badshah', 'Divine', 'Raftaar', 'Emiway Bantai', 'MC Stan', 'KR$NA'
];

function ArtistCard({ artist, onClick }) {
    const imageUrl = getImageUrl(artist.image);
    return (
        <div className="card artist-card" onClick={onClick} style={{ minWidth: '150px', textAlign: 'center', padding: '1rem', cursor: 'pointer', flex: '0 0 auto' }}>
            <div style={{ width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 0.8rem', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.4)' }}>
                {imageUrl ? (
                    <img src={imageUrl} alt={artist.title || artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                ) : (
                    <Mic2 size={36} color="var(--text-muted)" />
                )}
            </div>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                {artist.title?.replace(/&quot;/g, '"') || artist.name?.replace(/&quot;/g, '"') || 'Unknown Artist'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Artist</p>
        </div>
    );
}

function SectionHeader({ icon: Icon, title, emoji }) {
    return (
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, marginTop: '2.5rem' }}>
            {emoji && <span style={{ fontSize: '1.4rem' }}>{emoji}</span>}
            {!emoji && Icon && <Icon size={24} color="var(--accent-primary)" />}
            {title}
        </h2>
    );
}

function SongRow({ song, index, onPlay }) {
    return (
        <div
            onClick={() => onPlay(song)}
            style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s',
                background: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
            <img src={getImageUrl(song.image) || '/music.png'} alt={song.title || song.name} style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} loading="lazy" />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title?.replace(/&quot;/g, '"') || song.name?.replace(/&quot;/g, '"') || 'Unknown Song'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.subtitle || song.primaryArtists || song.artist || 'Unknown Artist'}
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onPlay(song); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <Play size={18} />
            </button>
        </div>
    );
}

export default function Artists() {
    const [topSingers, setTopSingers] = useState([]);
    const [topRappers, setTopRappers] = useState([]);
    const [trendingArtists, setTrendingArtists] = useState([]);
    
    const [loadingCurated, setLoadingCurated] = useState(true);
    const [loadingTrending, setLoadingTrending] = useState(true);
    
    const [page, setPage] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [selectedArtist, setSelectedArtist] = useState(null);
    const [songs, setSongs] = useState([]);
    const [loadingSongs, setLoadingSongs] = useState(false);

    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const navigate = useNavigate();

    const fetchCurated = async () => {
        setLoadingCurated(true);
        try {
            const singerPromises = CURATED_SINGERS.map(name => apiFetch('/api/search/artists', { query: name, limit: 1 }));
            const rapperPromises = CURATED_RAPPERS.map(name => apiFetch('/api/search/artists', { query: name, limit: 1 }));
            
            const [singerResults, rapperResults] = await Promise.all([
                Promise.all(singerPromises),
                Promise.all(rapperPromises)
            ]);
            
            setTopSingers(singerResults.map(r => r.results?.[0]).filter(Boolean));
            setTopRappers(rapperResults.map(r => r.results?.[0]).filter(Boolean));
        } catch (err) {
            console.error('Failed to fetch curated artists:', err);
        } finally {
            setLoadingCurated(false);
        }
    };

    const fetchTrending = async (pageNum = 0) => {
        if (pageNum === 0) setLoadingTrending(true);
        else setLoadingMore(true);

        try {
            if (pageNum === 0) {
                // Initial load: Extraction-based "Truly Trendy"
                const TRENDY_BASE = [
                    'Diljit Dosanjh', 'Karan Aujla', 'AP Dhillon', 'King', 
                    'MC Stan', 'Seedhe Maut', 'Talwiinder', 'Shubh', 
                    'Sidhu Moose Wala', 'Anuv Jain', 'Prateek Kuhad', 'Jasleen Royal'
                ];

                const modules = await apiFetch('/api/modules', { language: 'hindi,english' });
                let extractedNames = [...TRENDY_BASE];
                const seenNames = new Set(TRENDY_BASE.map(n => n.toLowerCase()));
                
                if (modules) {
                    const trendingItems = [
                        ...(modules.trending?.songs || []),
                        ...(modules.trending?.albums || []),
                        ...(modules.albums || [])
                    ];
                    
                    trendingItems.forEach(item => {
                        const artistsStr = item.primaryArtists || '';
                        if (!artistsStr) return;
                        const artistsArr = artistsStr.split(',').map(s => s.trim());
                        
                        artistsArr.forEach(name => {
                            const lowName = name.toLowerCase();
                            const isGeneric = ['various artists', 'indie', 'bollywood', 'singer', 'singers', 'pop', 'rock', 'hits', 'phonk', 'chill', 'lounge', 'gym', 'phonk', 'songs', 'playlist', 'hits'].some(g => lowName.includes(g));
                            const hasYear = /\d{4}/.test(name);
                            if (name && !seenNames.has(lowName) && name.length > 2 && !isGeneric && !hasYear) {
                                seenNames.add(lowName);
                                extractedNames.push(name);
                            }
                        });
                    });
                }

                const detailPromises = extractedNames.slice(0, 24).map(async (name) => {
                    const res = await apiFetch('/api/search/artists', { query: name, limit: 1 });
                    if (res?.results?.[0]) return res.results[0];
                    return { id: '', name: name, title: name, type: 'artist', image: '' };
                });
                
                const initialArtists = (await Promise.all(detailPromises)).filter(Boolean);
                setTrendingArtists(initialArtists);
                setHasMore(true); // Allow subsequent discovery via search
            } else {
                // Subsequent pages: Discovery via refined search query
                const res = await apiFetch('/api/search/artists', { 
                    query: 'Top Hindi Singers and Rappers 2024', 
                    page: pageNum, 
                    limit: 18 
                });
                const loaded = res.results || [];
                setTrendingArtists(prev => [...prev, ...loaded]);
                if (loaded.length < 18) setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to load trending artists:', error);
            if (pageNum === 0) {
                const res = await apiFetch('/api/search/artists', { query: 'Top Hindi Artists 2024', limit: 15 });
                setTrendingArtists(res.results || []);
            }
        } finally {
            setLoadingTrending(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchCurated();
        fetchTrending(0);
    }, []);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTrending(nextPage);
    };

    const loadArtistSongs = async (artist) => {
        if (artist.id) {
            navigate(`/artist/${artist.id}`);
            return;
        }

        setSelectedArtist(artist);
        setLoadingSongs(true);
        try {
            const queryName = artist.title || artist.name;
            const res = await apiFetch('/api/search/songs', { query: queryName, limit: 30 });
            setSongs(res.results || []);
        } catch (err) {
            console.error('Failed to load artist songs:', err);
        } finally {
            setLoadingSongs(false);
        }
    };

    const goBack = () => {
        if (selectedArtist) {
            setSelectedArtist(null);
            setSongs([]);
        } else {
            navigate('/');
        }
    };

    return (
        <div style={{ display: 'block', paddingBottom: '100px' }}>
            <div style={{ padding: 'var(--space-xl, 1.5rem) 1rem' }}>

                {!selectedArtist ? (
                    <>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-xl, 1.5rem)' }}>
                            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <ArrowLeft size={24} />
                            </button>
                            <h1 style={{ fontSize: 'var(--text-3xl, 2rem)', fontWeight: 800, letterSpacing: '-0.5px' }}>
                                Discover Artists
                            </h1>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>
                            Explore top singers, rappers, and rising talents from across India.
                        </p>

                        {loadingCurated ? (
                            <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                                <Loader2 className="spin" size={32} color="var(--accent-primary)" />
                                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
                            </div>
                        ) : (
                            <>
                                {/* Curated Singers section */}
                                <SectionHeader title="Top Hindi Singers (Bollywood & Indie)" emoji="🎤" />
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '1.2rem', 
                                    overflowX: 'auto', 
                                    paddingBottom: '1rem',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}>
                                    {topSingers.map(artist => (
                                        <ArtistCard key={artist.id} artist={artist} onClick={() => loadArtistSongs(artist)} />
                                    ))}
                                </div>

                                {/* Curated Rappers section */}
                                <SectionHeader title="Top Indian Rappers / Hip-Hop Artists" emoji="🎧" />
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '1.2rem', 
                                    overflowX: 'auto', 
                                    paddingBottom: '1rem',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}>
                                    {topRappers.map(artist => (
                                        <ArtistCard key={artist.id} artist={artist} onClick={() => loadArtistSongs(artist)} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Trending/More Section */}
                        <SectionHeader title="Trending Artists" icon={Flame} />
                        {loadingTrending && trendingArtists.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <Loader2 className="spin" size={24} />
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1.2rem' }}>
                                    {trendingArtists.map(artist => (
                                        <ArtistCard key={artist.id} artist={artist} onClick={() => loadArtistSongs(artist)} />
                                    ))}
                                </div>

                                {hasMore && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                                        <button
                                            className="secondary-cta-btn"
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            style={{
                                                padding: '0.8rem 2rem',
                                                borderRadius: '50px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                cursor: loadingMore ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {loadingMore ? <Loader2 className="spin" size={18} /> : null}
                                            {loadingMore ? 'Loading more...' : 'Discover More Artists'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {/* Artist Detail View (Fallback mechanism) */}
                        <div style={{ marginBottom: 'var(--space-2xl, 2rem)' }}>
                            <button onClick={goBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                                <ArrowLeft size={20} /> Back to Artists
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                                <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                    {getImageUrl(selectedArtist.image) ? (
                                        <img src={getImageUrl(selectedArtist.image)} alt={selectedArtist.title || selectedArtist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <Mic2 size={60} color="var(--bg-main, #0a0a0a)" />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', marginBottom: '0.5rem', fontWeight: 800 }}>{selectedArtist.title || selectedArtist.name}</h1>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>{songs.length} top tracks</p>
                                    <button
                                        className="primary-cta-btn"
                                        onClick={() => playQueue(songs, 0)}
                                        style={{ borderRadius: 'var(--radius-pill, 50px)', padding: '0.8rem 2rem', fontSize: '1rem', fontWeight: 600 }}
                                    >
                                        <Play size={20} fill="currentColor" /> Play All Tracks
                                    </button>
                                </div>
                            </div>

                            {loadingSongs ? (
                                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                    <Loader2 className="spin" size={40} color="var(--accent-primary)" />
                                    <p style={{ marginTop: '1rem' }}>Loading top tracks...</p>
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {songs.map((song, i) => (
                                        <SongRow key={song.id} song={song} index={i} onPlay={playSong} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Add these to make it work
const Flame = ({ size, color, style }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
);
