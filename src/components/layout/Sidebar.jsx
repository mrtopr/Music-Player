import React from 'react';
import { Home, ListMusic, Heart, Settings, LogOut, Mic2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path ? 'active' : '';

    const handleLogout = () => {
        localStorage.removeItem('mehfilUser');
        window.location.reload();
    };

    const handleNavigate = (path) => {
        navigate(path);
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
                <li className={isActive('/')} onClick={() => handleNavigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Home className="icon-svg" size={20} />
                    <Link to="/" onClick={(e) => e.preventDefault()} style={{ pointerEvents: 'none' }}>Home</Link>
                </li>
                <li className={isActive('/playlists')} onClick={() => handleNavigate('/playlists')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ListMusic className="icon-svg" size={20} />
                    <Link to="/playlists" onClick={(e) => e.preventDefault()} style={{ pointerEvents: 'none' }}>Playlists</Link>
                </li>
                <li className={isActive('/favorites')} onClick={() => handleNavigate('/favorites')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Heart className="icon-svg" size={20} />
                    <Link to="/favorites" onClick={(e) => e.preventDefault()} style={{ pointerEvents: 'none' }}>Favorites</Link>
                </li>
                <li className={isActive('/artists')} onClick={() => handleNavigate('/artists')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Mic2 className="icon-svg" size={20} />
                    <Link to="/artists" onClick={(e) => e.preventDefault()} style={{ pointerEvents: 'none' }}>Artists</Link>
                </li>
                <li className={isActive('/settings')} onClick={() => handleNavigate('/settings')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Settings className="icon-svg" size={20} />
                    <Link to="/settings" onClick={(e) => e.preventDefault()} style={{ pointerEvents: 'none' }}>Settings</Link>
                </li>
            </ul>

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
