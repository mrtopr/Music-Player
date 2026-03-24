import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { usePlayerStore } from './store/usePlayerStore';
import { themeManager } from './utils/themeManager';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import MiniPlayer from './components/player/MiniPlayer';
import FullscreenPlayer from './components/player/FullscreenPlayer';
import EqualizerModal from './components/player/EqualizerModal';
import SleepTimerModal from './components/player/SleepTimerModal';
import QueuePanel from './components/player/QueuePanel';
import MobileTabBar from './components/layout/MobileTabBar';
import LoginModal from './components/layout/LoginModal';
import Home from './pages/Home';
import SearchPage from './pages/Search';
import Library from './pages/Library';
import Artists from './pages/Artists';
import Settings from './pages/Settings';
import CollectionDetails from './pages/CollectionDetails';

function AppContent() {
    const [user, setUser] = useState(null);
    const fsVisible = usePlayerStore(state => state.isFullScreen);
    const setFsVisible = usePlayerStore(state => state.setFullScreen);
    const queueVisible = usePlayerStore(state => state.isQueueOpen);
    const setQueueVisible = usePlayerStore(state => state.setQueueOpen);
    const [eqVisible, setEqVisible] = useState(false);
    const [sleepVisible, setSleepVisible] = useState(false);


    const colors = usePlayerStore(state => state.albumColors);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--album-dominant', colors.dominant);
        root.style.setProperty('--album-dominant-rgb', colors.dominantRGB);
        root.style.setProperty('--album-accent', colors.accent);
        root.style.setProperty('--album-accent-rgb', colors.accentRGB);
        root.style.setProperty('--album-secondary', colors.secondary);
    }, [colors]);

    useEffect(() => {
        const saved = localStorage.getItem('mehfilUser');
        if (saved) setUser(JSON.parse(saved));

        const handleLogin = () => {
            const data = localStorage.getItem('mehfilUser');
            if (data) setUser(JSON.parse(data));
        };
        window.addEventListener('mehfil-login', handleLogin);
        
        // Initialize Theme Manager
        themeManager.init();
        
        return () => window.removeEventListener('mehfil-login', handleLogin);
    }, []);

    return (
        <>
            <LoginModal />
            <div className="screen">
                <div className="mobile-overlay" id="sidebarOverlay" onClick={() => {
                    document.querySelector('.sidebar')?.classList.remove('open');
                    document.querySelector('.mobile-overlay')?.classList.remove('visible');
                }}></div>
                <Sidebar />
                <div className="main-area">
                    <TopBar
                        user={user}
                        onOpenEq={() => setEqVisible(true)}
                        onOpenSleep={() => setSleepVisible(true)}
                    />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/playlists" element={<Library />} />
                        <Route path="/favorites" element={<Library />} />
                        <Route path="/artists" element={<Artists />} />
                        <Route path="/artist/:id" element={<CollectionDetails type="artist" />} />
                        <Route path="/album/:id" element={<CollectionDetails type="album" />} />
                        <Route path="/playlist/:id" element={<CollectionDetails type="playlist" />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </div>
            </div>

            {!fsVisible && (
                <MiniPlayer
                    onExpand={() => setFsVisible(true)}
                    onQueue={() => setQueueVisible(true)}
                />
            )}

            <FullscreenPlayer visible={fsVisible} onClose={() => setFsVisible(false)} />
            <EqualizerModal visible={eqVisible} onClose={() => setEqVisible(false)} />
            <SleepTimerModal visible={sleepVisible} onClose={() => setSleepVisible(false)} />
            <QueuePanel visible={queueVisible} onClose={() => setQueueVisible(false)} />
            <MobileTabBar />
        </>
    );
}

export default function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}
