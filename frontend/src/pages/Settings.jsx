import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Palette, Volume2, Info, Trash2, LogOut, ShieldAlert, Check, CheckCircle2, Mic, ExternalLink, Sparkles } from 'lucide-react';
import { themeManager } from '../utils/themeManager';
import { moodThemes } from '../utils/moodThemes';
import { getPreferredGenres, savePreferredGenres, getGenreCounts } from '../utils/history.js';
import { ALL_GENRES, GENRE_PROFILES } from '../utils/genreProfiles.js';

export default function Settings() {
    const [user, setUser] = useState(null);
    const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('mehfil_current_mood') || 'default');
    const [successMsg, setSuccessMsg] = useState('');
    const [auddToken, setAuddToken] = useState(localStorage.getItem('audd_api_token') || '');
    const [preferredGenres, setPreferredGenres] = useState(getPreferredGenres());
    const [genreCounts, setGenreCounts] = useState(getGenreCounts());
    const [editingGenres, setEditingGenres] = useState(false);
    const [tempGenres, setTempGenres] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem('mehfilUser');
        if (saved) setUser(JSON.parse(saved));

        const handleThemeChange = (e) => {
            setCurrentTheme(e.detail.category || 'default');
        };
        window.addEventListener('themeChanged', handleThemeChange);
        return () => window.removeEventListener('themeChanged', handleThemeChange);
    }, []);

    const handleThemeSelect = (themeKey) => {
        themeManager.applyTheme(themeKey);
        setSuccessMsg(`Theme set to ${themeKey}!`);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const clearData = () => {
        if (confirm('Are you sure? This will permanently delete all your liked songs, playlists, and history. This cannot be undone.')) {
            localStorage.removeItem('likedSongs');
            localStorage.removeItem('mehfilPlaylists');
            localStorage.removeItem('mehfilHistory');
            setSuccessMsg('All local data cleared successfully.');
            setTimeout(() => window.location.reload(), 1500);
        }
    };

    const logout = () => {
        if (confirm('Logout from Mehfil?')) {
            localStorage.removeItem('mehfilUser');
            window.location.reload();
        }
    };

    const handleAuddTokenChange = (e) => {
        const val = e.target.value;
        setAuddToken(val);
        localStorage.setItem('audd_api_token', val);
    };

    return (
        <div style={{ display: 'block', paddingBottom: '160px', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
                
                <header className="settings-header">
                    <h1 className="settings-title">
                        <SettingsIcon size={32} className="spin-slow" /> Settings
                    </h1>
                    <p className="settings-subtitle">Customize your listening experience</p>
                </header>

                {successMsg && (
                    <div style={{ 
                        position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--accent-primary)', color: '#000', padding: '0.8rem 1.5rem',
                        borderRadius: '50px', fontWeight: 600, zIndex: 10000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideDown 0.3s ease'
                    }}>
                        <CheckCircle2 size={18} /> {successMsg}
                    </div>
                )}

                <div style={{ display: 'grid', gap: '2rem' }}>
                    
                    {/* User Profile Card */}
                    <section className="settings-card" style={{ 
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                        borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: 'var(--shadow-medium)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                <User size={20} /> My Account
                            </h3>
                            {user && (
                                <button onClick={logout} style={{ 
                                    background: 'rgba(255,255,255,0.05)', border: 'none', color: '#ff6b6b', 
                                    padding: '0.5rem 1rem', borderRadius: '12px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}>
                                    <LogOut size={16} /> Logout
                                </button>
                            )}
                        </div>
                        
                        {user ? (
                            <div className="profile-info-row">
                                <div style={{ position: 'relative' }}>
                                    <img src={user.profilePicture || '/dp.png'} alt="Profile" className="profile-image" />
                                    <div className="profile-verified-badge">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                </div>
                                <div className="profile-text">
                                    <div className="profile-name-text">{user.name}</div>
                                    <div className="profile-meta-text">
                                        Premium Listener &bull; Joined {new Date(user.loginDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Log in to sync your library across devices.</p>
                            </div>
                        )}
                    </section>

                    {/* Appearance / Themes Card */}
                    <section className="settings-card" style={{ 
                        background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                            <Palette size={20} /> Personalization
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Select a mood-based theme to transform the entire interface.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                            {Object.entries(moodThemes).map(([key, theme]) => (
                                <button
                                    key={key}
                                    onClick={() => handleThemeSelect(key)}
                                    style={{
                                        position: 'relative', overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.02)', border: `2px solid ${currentTheme === key ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'}`,
                                        borderRadius: '16px', padding: '1rem', cursor: 'pointer', textAlign: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                                    }}
                                >
                                    <div style={{ display: 'flex', width: '100%', height: '40px', borderRadius: '8px', overflow: 'hidden' }}>
                                        <div style={{ flex: 1, background: theme.colors.primary }} />
                                        <div style={{ flex: 1, background: theme.colors.background }} />
                                        <div style={{ flex: 1, background: theme.colors.accent }} />
                                    </div>
                                    <span style={{ fontWeight: 600, color: currentTheme === key ? 'var(--accent-primary)' : '#fff', textTransform: 'capitalize' }}>
                                        {theme.name}
                                    </span>
                                    {currentTheme === key && (
                                        <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--accent-primary)' }}>
                                            <CheckCircle2 size={16} fill="var(--bg-card)" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Music Preferences Card */}
                    <section className="settings-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                <Sparkles size={20} /> Music Preferences
                            </h3>
                            <button
                                onClick={() => { setEditingGenres(!editingGenres); setTempGenres([...preferredGenres]); }}
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                {editingGenres ? 'Cancel' : 'Edit'}
                            </button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
                            Genres that power your personalized home page. Your listening habits also tune these automatically.
                        </p>

                        {!editingGenres ? (
                            <div>
                                {preferredGenres.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
                                        {preferredGenres.map(g => {
                                            const p = GENRE_PROFILES[g] || {};
                                            return (
                                                <span key={g} style={{ padding: '6px 14px', borderRadius: '50px', background: `${p.color || '#C6A15B'}22`, border: `1.5px solid ${p.color || '#C6A15B'}`, color: p.color || '#C6A15B', fontSize: '0.85rem', fontWeight: 600 }}>
                                                    {p.emoji} {g}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                        No genre preferences set yet. Go to Home and pick your vibes!
                                    </div>
                                )}
                                {Object.keys(genreCounts).length > 0 && (
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>Passively tracked from your listening:</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {Object.entries(genreCounts).sort(([,a],[,b]) => b-a).slice(0, 6).map(([g, c]) => (
                                                <span key={g} style={{ padding: '4px 10px', borderRadius: '50px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                                                    {g} · {c} {c === 1 ? 'play' : 'plays'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.2rem' }}>
                                    {ALL_GENRES.map(genre => {
                                        const profile = GENRE_PROFILES[genre] || {};
                                        const sel = tempGenres.includes(genre);
                                        return (
                                            <button key={genre} onClick={() => setTempGenres(prev => sel ? prev.filter(g => g !== genre) : [...prev, genre])} style={{
                                                padding: '6px 14px', borderRadius: '50px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                                border: `2px solid ${sel ? profile.color : 'rgba(255,255,255,0.1)'}`,
                                                background: sel ? `${profile.color}22` : 'rgba(255,255,255,0.03)',
                                                color: sel ? profile.color : 'rgba(255,255,255,0.5)',
                                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                                            }}>
                                                {profile.emoji} {genre} {sel && <Check size={12} />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button onClick={() => { savePreferredGenres(tempGenres); setPreferredGenres(tempGenres); setEditingGenres(false); setSuccessMsg('Genre preferences saved! Your home feed will update.'); setTimeout(() => setSuccessMsg(''), 3000); }}
                                    style={{ padding: '10px 24px', borderRadius: '50px', background: 'var(--accent-primary)', color: '#000', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                                    Save Preferences
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Audio & Performance */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <section className="settings-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                <Mic size={20} /> Music Recognition
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                Identify songs playing around you. Get your token at <a href="https://audd.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>audd.io <ExternalLink size={12} /></a>
                            </p>
                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                <label style={{ color: '#fff', fontSize: '0.85rem' }}>AudD API Token</label>
                                <input 
                                    type="password"
                                    value={auddToken}
                                    onChange={handleAuddTokenChange}
                                    placeholder="Enter your API token..."
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        padding: '0.8rem 1rem',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        width: '100%'
                                    }}
                                />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Leave empty to use the default server token.</span>
                            </div>
                        </section>

                        <section className="settings-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                <Volume2 size={20} /> Audio Quality
                            </h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff' }}>Streaming Quality</span>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700, background: 'rgba(255,165,0,0.1)', padding: '4px 12px', borderRadius: '30px' }}>320kbps</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff' }}>Optimizer</span>
                                    <span style={{ color: 'var(--text-muted)' }}>Enabled</span>
                                </div>
                            </div>
                        </section>

                        <section className="settings-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                <Info size={20} /> About
                            </h3>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Mehfil Pro</div>
                                <div>Version 3.4.0</div>
                                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>Stable</span>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>React 18</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Danger Zone */}
                    <section className="settings-card" style={{ 
                        background: 'rgba(255,50,50,0.02)', borderRadius: '24px', padding: '2rem', 
                        border: '1px solid rgba(255,50,50,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.2rem' }}>
                            <ShieldAlert size={20} /> Storage
                        </h3>
                        <button onClick={clearData} style={{ 
                            padding: '0.8rem 1.5rem', borderRadius: '16px', 
                            background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', 
                            color: '#ff6b6b', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <Trash2 size={18} /> Wipe Cache
                        </button>
                    </section>
                </div>
                
                <footer style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.3, fontSize: '0.8rem' }}>
                    &copy; 2024 Mehfil Music.
                </footer>
            </div>
            
            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin-slow { animation: spin-slow 12s linear infinite; }
                
                .settings-header { margin-bottom: 2.5rem; }
                .settings-title { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 1rem; color: #fff; }
                .settings-subtitle { color: var(--text-muted); font-size: 1.1rem; }
                .profile-info-row { display: flex; align-items: center; gap: 1.5rem; }
                .profile-image { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-primary); box-shadow: 0 0 20px rgba(var(--accent-primary-rgb), 0.2); }
                .profile-verified-badge { position: absolute; bottom: 0; right: 0; background: var(--accent-primary); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #000; border: 3px solid var(--bg-card); }
                .profile-name-text { font-weight: 700; font-size: 1.4rem; color: #fff; }
                .profile-meta-text { color: var(--text-muted); font-size: 0.95rem; margin-top: 4px; }

                @media (max-width: 768px) {
                    .settings-title { font-size: 2rem; }
                    .settings-subtitle { font-size: 1rem; }
                    .profile-info-row { flex-direction: column; text-align: center; gap: 1rem; }
                    .profile-image { width: 100px; height: 100px; }
                    .settings-card { padding: 1.5rem !important; }
                    .profile-name-text { font-size: 1.6rem; }
                    .settings-header { text-align: center; }
                    .settings-title { justify-content: center; }
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }

                .settings-card { transition: all 0.3s ease; }
                .settings-card:hover { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.15) !important; }
            `}</style>
        </div>
    );
}
