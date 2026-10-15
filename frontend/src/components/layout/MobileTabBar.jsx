import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Music, User, Headphones, Disc, Play } from '../common/LordIcon';
import { usePlayerStore } from '../../store/usePlayerStore';

export default function MobileTabBar() {
    const location = useLocation();
    const currentSong = usePlayerStore(state => state.currentSong);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const setFullScreen = usePlayerStore(state => state.setFullScreen);

    return (
        <div className="mobile-tab-bar">
            {/* 1. Browser */}
            <Link 
                to="/search" 
                className={`tab-item ${location.pathname === '/search' ? 'active' : ''}`} 
                aria-label="Browser"
            >
                <Compass size={22} strokeWidth={location.pathname === '/search' ? 2.4 : 1.8} />
                <span>Browser</span>
            </Link>

            {/* 2. Genres */}
            <Link 
                to="/genres" 
                className={`tab-item ${location.pathname === '/genres' ? 'active' : ''}`} 
                aria-label="Genres"
            >
                <Music size={22} strokeWidth={location.pathname === '/genres' ? 2.4 : 1.8} />
                <span>Genres</span>
            </Link>

            {/* 3. Center Elevated Home Button */}
            <Link 
                to="/" 
                className={`tab-item-center ${location.pathname === '/' ? 'active-home' : ''} ${isPlaying ? 'playing' : ''}`}
                title="Home"
                aria-label="Home"
            >
                <Home size={26} strokeWidth={2.4} color="#fff" />
            </Link>

            {/* 4. Artists */}
            <Link 
                to="/artists" 
                className={`tab-item ${location.pathname === '/artists' ? 'active' : ''}`} 
                aria-label="Artists"
            >
                <User size={22} strokeWidth={location.pathname === '/artists' ? 2.4 : 1.8} />
                <span>Artists</span>
            </Link>

            {/* 5. My Studio */}
            <Link 
                to="/library" 
                className={`tab-item ${['/library', '/playlists', '/favorites', '/downloads'].includes(location.pathname) ? 'active' : ''}`} 
                aria-label="My Studio"
            >
                <Headphones size={22} strokeWidth={['/library', '/playlists', '/favorites', '/downloads'].includes(location.pathname) ? 2.4 : 1.8} />
                <span>My Studio</span>
            </Link>
        </div>
    );
}
