import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, SlidersHorizontal, ChevronUp, ChevronDown, Play, Music, Sparkles } from '../components/common/LordIcon';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { apiFetch } from '../api/client';

const GENRES_DATA = [
    {
        id: 'pop',
        name: 'POP',
        count: '20,831 Music',
        bg: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
        color: '#a855f7',
        tags: [
            { id: 'happy', label: 'Happy' },
            { id: 'sad', label: 'Sad' },
            { id: 'love', label: 'Love', active: true },
            { id: 'film', label: 'Film Movie' },
            { id: 'party', label: 'Party' },
            { id: 'chill', label: 'Chill' },
            { id: 'dance', label: 'Dance' },
            { id: 'acoustic', label: 'Acoustic' }
        ]
    },
    {
        id: 'rock',
        name: 'Rock',
        count: '15,631 Music',
        bg: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&auto=format&fit=crop&q=80',
        color: '#ec4899',
        tags: [
            { id: 'classic-rock', label: 'Classic Rock' },
            { id: 'hard-rock', label: 'Hard Rock' },
            { id: 'indie-rock', label: 'Indie' },
            { id: 'punk', label: 'Punk' },
            { id: 'alternative', label: 'Alternative' }
        ]
    },
    {
        id: 'metal',
        name: 'Metal',
        count: '6,485 Music',
        bg: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
        color: '#8b5cf6',
        tags: [
            { id: 'heavy-metal', label: 'Heavy Metal' },
            { id: 'thrash', label: 'Thrash' },
            { id: 'deathcore', label: 'Deathcore' },
            { id: 'progressive', label: 'Progressive' }
        ]
    },
    {
        id: 'jazz',
        name: 'Jazz',
        count: '8,451 Music',
        bg: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
        color: '#06b6d4',
        tags: [
            { id: 'smooth-jazz', label: 'Smooth Jazz' },
            { id: 'blues', label: 'Blues' },
            { id: 'soul', label: 'Soul' },
            { id: 'bossa-nova', label: 'Bossa Nova' }
        ]
    },
    {
        id: 'bollywood',
        name: 'Bollywood & Sufi',
        count: '34,210 Music',
        bg: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
        color: '#f43f5e',
        tags: [
            { id: 'romantic', label: 'Romantic Hits' },
            { id: 'sufi', label: 'Sufi & Ghazal' },
            { id: 'item-songs', label: 'Bollywood Dance' },
            { id: 'retro', label: 'Retro 90s' }
        ]
    }
];

export default function Genres() {
    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);
    const playQueue = usePlayerStore(state => state.playQueue);
    const playSong = usePlayerStore(state => state.playSong);

    // Default 'pop' is expanded as in the design screenshot
    const [expandedGenre, setExpandedGenre] = useState('pop');
    const [selectedTag, setSelectedTag] = useState('love');
    const [loadingGenre, setLoadingGenre] = useState(null);

    React.useEffect(() => {
        document.body.classList.add('on-genres-page');
        return () => document.body.classList.remove('on-genres-page');
    }, []);

    const toggleExpand = (genreId) => {
        setExpandedGenre(prev => prev === genreId ? null : genreId);
    };

    const handleTagClick = async (e, genre, tag) => {
        e.stopPropagation();
        setSelectedTag(tag.id);
        const searchTerm = `${genre.name} ${tag.label}`;
        navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    };

    const handlePlayGenre = async (e, genre) => {
        e.stopPropagation();
        setLoadingGenre(genre.id);
        try {
            const res = await apiFetch('/api/search/songs', { query: genre.name, limit: 15 });
            if (res && res.results && res.results.length > 0) {
                playQueue(res.results, 0);
            } else {
                navigate(`/search?q=${encodeURIComponent(genre.name)}`);
            }
        } catch (err) {
            navigate(`/search?q=${encodeURIComponent(genre.name)}`);
        } finally {
            setLoadingGenre(null);
        }
    };

    const openSidebar = () => {
        document.querySelector('.sidebar')?.classList.add('open');
        document.querySelector('.mobile-overlay')?.classList.add('visible');
    };

    return (
        <div className="genres-page-container">
            <style>{`
                .genres-page-container {
                    padding: 0 0 100px 0;
                    width: 100%;
                    max-width: 900px;
                    margin: 0 auto;
                    color: #fff;
                    position: relative;
                }

                /* Subtle Tech Grid pattern matching reference */
                .genres-page-container::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background-image: 
                        linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
                    background-size: 34px 34px;
                    pointer-events: none;
                    z-index: 0;
                }

                .genres-mobile-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 4px 20px 4px;
                    position: relative;
                    z-index: 10;
                }

                .genres-burger-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.09);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .genres-burger-btn:active {
                    transform: scale(0.92);
                    background: rgba(255, 255, 255, 0.12);
                }

                .genres-brand-title {
                    font-size: 1.35rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    background: linear-gradient(135deg, #ffffff 0%, #d8b4fe 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin: 0;
                }

                .genres-header-right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .genres-icon-round-btn {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .genres-icon-round-btn:active {
                    transform: scale(0.92);
                }

                .genres-avatar-wrap {
                    position: relative;
                    cursor: pointer;
                }

                .genres-avatar-img {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid rgba(168, 85, 247, 0.6);
                    box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
                    display: block;
                }

                .genres-online-dot {
                    position: absolute;
                    top: 1px;
                    right: 1px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #f43f5e;
                    border: 2px solid #080914;
                    box-shadow: 0 0 6px #f43f5e;
                }

                /* Capsule Cards list */
                .genres-capsules-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: relative;
                    z-index: 10;
                }

                .genre-capsule-card {
                    position: relative;
                    border-radius: 36px;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
                    cursor: pointer;
                    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
                    background: #111424;
                }

                .genre-capsule-card:active {
                    transform: scale(0.985);
                }

                .genre-capsule-bg {
                    position: absolute;
                    inset: 0;
                    background-size: cover;
                    background-position: center;
                    filter: saturate(140%) brightness(0.6);
                    transition: filter 0.3s ease;
                }

                .genre-capsule-gradient {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, rgba(20, 14, 40, 0.92) 0%, rgba(35, 18, 65, 0.75) 50%, rgba(10, 8, 20, 0.88) 100%);
                }

                .genre-capsule-inner {
                    position: relative;
                    z-index: 5;
                    padding: 22px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .genre-capsule-main-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .genre-capsule-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .genre-capsule-title {
                    font-size: 1.5rem;
                    font-weight: 800;
                    letter-spacing: -0.3px;
                    color: #fff;
                    margin: 0;
                    text-transform: capitalize;
                }

                .genre-capsule-count {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.65);
                    font-weight: 500;
                    margin: 0;
                }

                .genre-capsule-toggle-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(18, 14, 34, 0.75);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.4);
                }

                .genre-capsule-toggle-btn:hover {
                    background: rgba(168, 85, 247, 0.3);
                    border-color: rgba(168, 85, 247, 0.5);
                }

                /* Sub-tags Pill Cloud */
                .genre-subtags-cloud {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding-top: 6px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    animation: fadeInTags 0.3s ease-out;
                }

                @keyframes fadeInTags {
                    from { opacity: 0; transform: translateY(-6px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .genre-subtag-pill {
                    padding: 8px 18px;
                    border-radius: 9999px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: rgba(20, 24, 40, 0.75);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: rgba(255, 255, 255, 0.8);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    user-select: none;
                }

                .genre-subtag-pill:hover {
                    background: rgba(255, 255, 255, 0.12);
                    color: #fff;
                    transform: translateY(-1px);
                }

                .genre-subtag-pill:active {
                    transform: scale(0.94);
                }

                .genre-subtag-pill.active {
                    background: #f43f5e !important;
                    color: #fff !important;
                    border-color: transparent !important;
                    box-shadow: 0 4px 16px rgba(244, 63, 94, 0.55) !important;
                }
            `}</style>

            {/* Mobile Header matching Screenshot 3 */}
            <div className="genres-mobile-header">
                <button className="genres-burger-btn" onClick={openSidebar} aria-label="Open menu">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="4" y1="7" x2="20" y2="7"></line>
                        <line x1="4" y1="12" x2="20" y2="12"></line>
                        <line x1="4" y1="17" x2="20" y2="17"></line>
                    </svg>
                </button>

                <h1 className="genres-brand-title">QENARA</h1>

                <div className="genres-header-right">
                    <button className="genres-icon-round-btn" onClick={() => navigate('/search')} aria-label="Search">
                        <SearchIcon size={20} />
                    </button>
                    <div className="genres-avatar-wrap" onClick={() => user ? navigate('/settings') : navigate('/auth')}>
                        <img 
                            src={user?.profileImageUrl || '/dp.png'} 
                            alt={user?.name || 'User'} 
                            className="genres-avatar-img" 
                        />
                        <span className="genres-online-dot"></span>
                    </div>
                </div>
            </div>

            {/* Capsule Accordion List matching Screenshot 3 */}
            <div className="genres-capsules-list">
                {GENRES_DATA.map((genre) => {
                    const isExpanded = expandedGenre === genre.id;
                    return (
                        <div 
                            key={genre.id} 
                            className="genre-capsule-card"
                            onClick={() => toggleExpand(genre.id)}
                        >
                            <div 
                                className="genre-capsule-bg" 
                                style={{ backgroundImage: `url(${genre.bg})` }} 
                            />
                            <div className="genre-capsule-gradient" />

                            <div className="genre-capsule-inner">
                                <div className="genre-capsule-main-row">
                                    <div className="genre-capsule-info">
                                        <h2 className="genre-capsule-title">{genre.name}</h2>
                                        <p className="genre-capsule-count">{genre.count}</p>
                                    </div>

                                    <div className="genre-capsule-toggle-btn" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                                        {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                                    </div>
                                </div>

                                {/* Expanded Tag Cloud */}
                                {isExpanded && (
                                    <div className="genre-subtags-cloud" onClick={(e) => e.stopPropagation()}>
                                        {genre.tags.map((tag) => {
                                            const isActive = selectedTag === tag.id;
                                            return (
                                                <button
                                                    key={tag.id}
                                                    className={`genre-subtag-pill ${isActive ? 'active' : ''}`}
                                                    onClick={(e) => handleTagClick(e, genre, tag)}
                                                >
                                                    {tag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
