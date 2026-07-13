import React, { useState, useEffect } from 'react';
import { 
  Home, ListMusic, Heart, Settings, LogOut, Mic2, Download, BarChart2, LogIn,
  Disc3, Radio, Grid, Plus, Music
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { usePlaylistStore } from '../../store/usePlaylistStore';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path ? 'active' : '';

    const logout = useAuthStore(s => s.logout);
    const isAuthenticated = useAuthStore(s => s.isAuthenticated);
    
    // Get user playlists from the playlist store
    const playlists = usePlaylistStore(s => s.playlists);
    const createPlaylist = usePlaylistStore(s => s.createPlaylist);

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const checkStandalone = () => {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    };

    const [canInstall, setCanInstall] = useState(!!window.__deferredPrompt && !checkStandalone());

    useEffect(() => {
        const handler = () => {
            if (!checkStandalone()) {
                setCanInstall(true);
            }
        };
        window.addEventListener('pwa-can-install', handler);
        return () => window.removeEventListener('pwa-can-install', handler);
    }, []);

    const handleInstall = async () => {
        const promptEvent = window.__deferredPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        window.__deferredPrompt = null;
        setCanInstall(false);
    };

    const handleLinkClick = () => {
        document.querySelector('.sidebar')?.classList.remove('open');
        document.querySelector('.mobile-overlay')?.classList.remove('visible');
    };

    const handleCreatePlaylist = (e) => {
        e.stopPropagation();
        const name = prompt("Enter playlist name:");
        if (name?.trim()) {
            const playlistId = createPlaylist(name);
            if (playlistId) {
                navigate(`/playlist/${playlistId}`);
            }
        }
    };

    // Default seed playlists to match mockup if user has none
    const displayedPlaylists = playlists.length > 0 ? playlists : [
        { id: 'chill-vibes', name: 'Chill Vibes', songs: Array(25) },
        { id: 'late-night-drive', name: 'Late Night Drive', songs: Array(18) },
        { id: 'workout-mix', name: 'Workout Mix', songs: Array(32) },
        { id: 'heartbreak-hits', name: 'Heartbreak Hits', songs: Array(21) },
    ];

    return (
        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Logo */}
            <div className="mlogo">
                <img src="/mehfil-logo.png" alt="Mehfil Logo" />
                <span style={{ fontFamily: "'Merienda', cursive" }}>Mehfil</span>
            </div>

            {/* Navigation links */}
            <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                <li className={isActive('/')}>
                    <Link to="/" className="sidebar-link" onClick={handleLinkClick}>
                        <Home className="icon-svg" size={20} />
                        <span>Home</span>
                    </Link>
                </li>
                <li className={isActive('/playlists')}>
                    <Link to="/playlists" className="sidebar-link" onClick={handleLinkClick}>
                        <ListMusic className="icon-svg" size={20} />
                        <span>Playlists</span>
                    </Link>
                </li>
                <li className={isActive('/favorites')}>
                    <Link to="/favorites" className="sidebar-link" onClick={handleLinkClick}>
                        <Heart className="icon-svg" size={20} />
                        <span>Favorites</span>
                    </Link>
                </li>
                <li className={isActive('/artists')}>
                    <Link to="/artists" className="sidebar-link" onClick={handleLinkClick}>
                        <Mic2 className="icon-svg" size={20} />
                        <span>Artists</span>
                    </Link>
                </li>
                <li className={isActive('/section/newReleases')}>
                    <Link to="/section/newReleases" className="sidebar-link" onClick={handleLinkClick}>
                        <Disc3 className="icon-svg" size={20} />
                        <span>Albums</span>
                    </Link>
                </li>
                <li className={isActive('/genres')}>
                    <Link to="/" className="sidebar-link" onClick={(e) => { handleLinkClick(); window.scrollTo({ top: 380, behavior: 'smooth' }); }}>
                        <Grid className="icon-svg" size={20} />
                        <span>Genres</span>
                    </Link>
                </li>
                <li className={isActive('/radio')}>
                    <Link to="/section/recommendations" className="sidebar-link" onClick={handleLinkClick}>
                        <Radio className="icon-svg" size={20} />
                        <span>Radio</span>
                    </Link>
                </li>
                <li className={isActive('/stats')}>
                    <Link to="/stats" className="sidebar-link" onClick={handleLinkClick}>
                        <BarChart2 className="icon-svg" size={20} />
                        <span>Stats</span>
                    </Link>
                </li>
                <li className={isActive('/settings')}>
                    <Link to="/settings" className="sidebar-link" onClick={handleLinkClick}>
                        <Settings className="icon-svg" size={20} />
                        <span>Settings</span>
                    </Link>
                </li>
            </ul>

            {/* Playlists section - matched to mockup */}
            <div className="sidebar-section" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Playlists</span>
                    <button 
                        onClick={handleCreatePlaylist}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                        title="Create Playlist"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                
                {/* Scrollable list of playlists */}
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                        {displayedPlaylists.map((p) => (
                            <li key={p.id} style={{ opacity: 1, padding: '6px 12px', margin: '4px 0' }}>
                                <Link 
                                    to={`/playlist/${p.id}`} 
                                    onClick={handleLinkClick}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit', width: '100%' }}
                                >
                                    {/* Thumbnail */}
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', flexShrink: 0
                                    }}>
                                        <Music size={14} />
                                    </div>
                                    {/* Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {p.name}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                            {p.songs?.length || 0} songs
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Install PWA Button */}
            {canInstall && (
                <div style={{ padding: '0 1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                    <button 
                        onClick={handleInstall}
                        style={{
                            width: '100%', padding: '0.8rem', borderRadius: '12px',
                            background: 'var(--accent-primary)', color: '#000',
                            border: 'none', fontWeight: 700, fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            cursor: 'pointer', boxShadow: '0 4px 15px rgba(var(--accent-primary-rgb), 0.3)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Download size={16} /> Install App
                    </button>
                </div>
            )}

            {/* Sign in / Sign out bottom bar */}
            {isAuthenticated ? (
                <div style={{ marginTop: 'auto', padding: '15px 12px 0' }}>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '0.9rem', padding: '0.6rem 0',
                        width: '100%', transition: 'color 0.2s', outline: 'none'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            ) : (
                <div style={{ marginTop: 'auto', padding: '15px 12px 0' }}>
                    <button onClick={() => navigate('/auth')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        background: 'none', border: 'none', color: 'var(--accent-primary)',
                        cursor: 'pointer', fontSize: '0.9rem', padding: '0.6rem 0',
                        width: '100%', transition: 'opacity 0.2s', fontWeight: 600, outline: 'none'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        <LogIn size={18} /> Sign In
                    </button>
                </div>
            )}
        </div>
    );
}
