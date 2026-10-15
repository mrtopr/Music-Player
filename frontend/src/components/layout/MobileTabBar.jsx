import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, ListMusic, User, Play, Pause, Disc } from '../common/LordIcon';
import { usePlayerStore } from '../../store/usePlayerStore';

export default function MobileTabBar() {
    const location = useLocation();
    const currentSong = usePlayerStore(state => state.currentSong);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const togglePlay = usePlayerStore(state => state.togglePlay);
    const setFullScreen = usePlayerStore(state => state.setFullScreen);

    const handleCenterClick = (e) => {
        e.preventDefault();
        if (currentSong) {
            setFullScreen(true);
        } else {
            // If no song, trigger play or open search
            togglePlay();
        }
    };

    return (
        <div className="mobile-tab-bar">
            {/* 1. Home */}
            <Link to="/" className={`tab-item ${location.pathname === '/' ? 'active' : ''}`} aria-label="Home">
                <Home size={22} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
                <span>Home</span>
            </Link>

            {/* 2. Explore / Search */}
            <Link to="/search" className={`tab-item ${location.pathname === '/search' ? 'active' : ''}`} aria-label="Explore">
                <Compass size={22} strokeWidth={location.pathname === '/search' ? 2.5 : 2} />
                <span>Explore</span>
            </Link>

            {/* 3. Center Elevated Glowing Action Button */}
            <div 
                className={`tab-item-center ${isPlaying ? 'playing' : ''}`}
                onClick={handleCenterClick}
                title={currentSong ? (isPlaying ? 'Now Playing (Tap to view)' : 'Play / View Player') : 'Explore Music'}
                aria-label="Now Playing"
            >
                {currentSong ? (
                    isPlaying ? <Disc size={26} className="center-btn-icon spin-icon" /> : <Play size={24} fill="#fff" style={{ marginLeft: '3px' }} />
                ) : (
                    <Disc size={26} className="center-btn-icon" />
                )}
            </div>

            {/* 4. Library */}
            <Link to="/library" className={`tab-item ${['/library', '/playlists', '/favorites', '/downloads'].includes(location.pathname) ? 'active' : ''}`} aria-label="Library">
                <ListMusic size={22} strokeWidth={['/library', '/playlists', '/favorites', '/downloads'].includes(location.pathname) ? 2.5 : 2} />
                <span>Library</span>
            </Link>

            {/* 5. Profile / Settings */}
            <Link to="/settings" className={`tab-item ${location.pathname === '/settings' ? 'active' : ''}`} aria-label="Profile">
                <User size={22} strokeWidth={location.pathname === '/settings' ? 2.5 : 2} />
                <span>Profile</span>
            </Link>
        </div>
    );
}
