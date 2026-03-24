import React, { useState } from 'react';
import { Search, SlidersHorizontal, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TopBar({ user, onOpenEq, onOpenSleep }) {
    const navigate = useNavigate();
    const location = useLocation();
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

    return (
        <div className="top-bar">
            <div className="search">
                <input
                    type="text"
                    id="searchInput"
                    value={localQuery}
                    onChange={handleSearchChange}
                    placeholder="Search for songs..."
                    onFocus={handleSearchFocus}
                />
                <button type="button" id="searchButton" onClick={handleSearchFocus}>
                    <Search className="icon-svg" size={18} />
                </button>
            </div>

            <div className="premium-tools">
                <button id="openEqBtn" className="icon-btn tooltip-btn" aria-label="Equalizer" onClick={onOpenEq}>
                    <SlidersHorizontal size={20} />
                </button>
                <button id="openSleepBtn" className="icon-btn tooltip-btn" aria-label="Sleep Timer" onClick={onOpenSleep}>
                    <Moon size={20} />
                </button>
            </div>

            <div className="profile" id="profileEdit" onClick={() => navigate('/settings')}>
                <img src={user?.profilePicture || '/dp.png'} alt="Profile" className="icon-svg" />
                <span className="profile-name">{user?.name || 'Guest'}</span>
            </div>
        </div>
    );
}
