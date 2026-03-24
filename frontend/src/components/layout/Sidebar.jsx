import React, { useState, useEffect } from 'react';
import { Home, ListMusic, Heart, Settings, LogOut, Mic2, Download } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path ? 'active' : '';

    const handleLogout = () => {
        localStorage.removeItem('mehfilUser');
        window.location.reload();
    };

    const [canInstall, setCanInstall] = useState(!!window.__deferredPrompt);

    useEffect(() => {
        const handler = () => setCanInstall(true);
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
        // Close sidebar on mobile after navigation
        document.querySelector('.sidebar')?.classList.remove('open');
        document.querySelector('.mobile-overlay')?.classList.remove('visible');
    };

    return (
        <div className="sidebar">
            <div className="mlogo">
                <img src="/mehfil-logo.png" alt="Mehfil Logo" />
                <span style={{ fontFamily: "'Merienda', cursive" }}>Mehfil</span>
            </div>

            <ul>
                <li>
                    <Link to="/" className={`sidebar-link ${isActive('/')}`} onClick={handleLinkClick}>
                        <Home className="icon-svg" size={20} />
                        <span>Home</span>
                    </Link>
                </li>
                <li>
                    <Link to="/playlists" className={`sidebar-link ${isActive('/playlists')}`} onClick={handleLinkClick}>
                        <ListMusic className="icon-svg" size={20} />
                        <span>Playlists</span>
                    </Link>
                </li>
                <li>
                    <Link to="/favorites" className={`sidebar-link ${isActive('/favorites')}`} onClick={handleLinkClick}>
                        <Heart className="icon-svg" size={20} />
                        <span>Favorites</span>
                    </Link>
                </li>
                <li>
                    <Link to="/artists" className={`sidebar-link ${isActive('/artists')}`} onClick={handleLinkClick}>
                        <Mic2 className="icon-svg" size={20} />
                        <span>Artists</span>
                    </Link>
                </li>
                <li>
                    <Link to="/settings" className={`sidebar-link ${isActive('/settings')}`} onClick={handleLinkClick}>
                        <Settings className="icon-svg" size={20} />
                        <span>Settings</span>
                    </Link>
                </li>
            </ul>


            {canInstall && (
                <div style={{ padding: '0 1rem', marginTop: '1rem' }}>
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

            <div style={{ marginTop: 'auto', padding: 'var(--space-lg, 1rem) var(--space-lg, 1rem)' }}>
                <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '0.9rem', padding: '0.6rem 0',
                    width: '100%', transition: 'color 0.2s'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    <LogOut size={18} /> Logout
                </button>
            </div>
        </div>
    );
}
