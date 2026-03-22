import React, { useState, useCallback } from 'react';
import { Search, SlidersHorizontal, Moon, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TopBar({ user, onOpenEq, onOpenSleep }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [localQuery, setLocalQuery] = useState('');

    React.useEffect(() => {
        if (location.pathname === '/search') {
            const q = new URLSearchParams(location.search).get('q') || '';
            setLocalQuery(q);
        } else {
            setLocalQuery('');
        }
    }, [location.pathname, location.search]);

    const handleSearchFocus = () => {
        if (location.pathname !== '/search') {
            navigate('/search');
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setLocalQuery(val);
        if (location.pathname !== '/search') {
            navigate(`/search?q=${encodeURIComponent(val)}`);
        } else {
            navigate(`/search?q=${encodeURIComponent(val)}`, { replace: true });
        }
    };

    const toggleSidebar = useCallback(() => {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('visible');
        setSidebarOpen(prev => !prev);
    }, []);

    return (
        <div className="top-bar">
            <button id="hamburgerToggle" className="hamburger" aria-label="Toggle menu" onClick={toggleSidebar}>
                <Menu className="icon-svg" size={22} />
            </button>

            <div className="search">
                <input
                    type="text"
                    id="searchInput"
                    value={localQuery}
                    onChange={handleSearchChange}
                    placeholder="Search for songs, artists, or albums..."
                    onFocus={handleSearchFocus}
                />
                <button type="button" id="searchButton" onClick={handleSearchFocus}>
                    <Search className="icon-svg" size={18} />
                </button>
            </div>

            <div className="premium-tools" style={{ display: 'flex', gap: 'var(--space-md, 0.8rem)', marginRight: 'var(--space-xl, 1.5rem)', position: 'relative' }}>
                <button id="openEqBtn" className="icon-btn tooltip-btn" aria-label="Equalizer" onClick={onOpenEq} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <SlidersHorizontal size={20} />
                </button>
                <button id="openSleepBtn" className="icon-btn tooltip-btn" aria-label="Sleep Timer" onClick={onOpenSleep} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}>
                    <Moon size={20} />
                </button>
            </div>

            <div className="profile" id="profileEdit" onClick={() => navigate('/settings')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={user?.profilePicture || '/dp.png'} alt="Profile" className="icon-svg" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                <span className="profile-name">{user?.name || 'Guest'}</span>
            </div>
        </div>
    );
}
