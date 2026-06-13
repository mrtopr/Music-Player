import React from 'react';
import { Home, Search, Heart, Mic2, ListMusic } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function MobileTabBar() {
    const location = useLocation();

    const tabs = [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/search', icon: Search, label: 'Search' },
        { path: '/playlists', icon: ListMusic, label: 'Library' },
        { path: '/artists', icon: Mic2, label: 'Artists' },
    ];

    return (
        <div className="mobile-tab-bar" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
            display: 'none', justifyContent: 'space-around', alignItems: 'center',
            background: 'var(--bg-card, #1a1a1a)', borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        }}>
            {tabs.map(({ path, icon: Icon, label }) => {
                const active = location.pathname === path;
                return (
                    <Link key={path} to={path} className={`tab-item ${active ? 'active' : ''}`} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                        textDecoration: 'none', color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                        fontSize: '0.7rem', fontWeight: active ? 600 : 400, transition: 'all 0.2s',
                    }}>
                        <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                        <span>{label}</span>
                    </Link>
                );
            })}
            <style>{`
        @media (max-width: 768px) {
          .mobile-tab-bar { display: flex !important; }
          .mini-player.visible { bottom: 60px !important; }
        }
      `}</style>
        </div>
    );
}
