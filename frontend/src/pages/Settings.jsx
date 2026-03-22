import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Palette, Volume2, Info, Trash2, LogOut, ShieldAlert, Check, CheckCircle2 } from 'lucide-react';
import { themeManager } from '../utils/themeManager';
import { moodThemes } from '../utils/moodThemes';

export default function Settings() {
    const [user, setUser] = useState(null);
    const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('mehfil_current_mood') || 'default');
    const [successMsg, setSuccessMsg] = useState('');

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

    return (
        <div style={{ display: 'block', paddingBottom: '120px', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
                
                <header style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff' }}>
                        <SettingsIcon size={32} className="spin-slow" /> Settings
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Customize your listening experience</p>
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
                                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                                    <LogOut size={16} /> Logout
                                </button>
                            )}
                        </div>
                        
                        {user ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <img src={user.profilePicture || '/dp.png'} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-primary)' }} />
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--accent-primary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', border: '3px solid var(--bg-card)' }}>
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.4rem', color: '#fff' }}>{user.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
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
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
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
                                    onMouseEnter={e => { if(currentTheme !== key) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                    onMouseLeave={e => { if(currentTheme !== key) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    {/* Color Swatch */}
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

                    {/* Audio & Performance */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <section style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                <Volume2 size={20} /> Audio Quality
                            </h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff' }}>Streaming Quality</span>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700, background: 'rgba(255,165,0,0.1)', padding: '4px 12px', borderRadius: '30px' }}>320kbps</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff' }}>Crossfade</span>
                                    <span style={{ color: 'var(--text-muted)' }}>12s (Default)</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff' }}>Equalizer</span>
                                    <span style={{ color: 'var(--text-muted)' }}>Dolby Atmos</span>
                                </div>
                            </div>
                        </section>

                        <section style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                <Info size={20} /> About Mehfil
                            </h3>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Mehfil — दिल से सुनो</div>
                                <div>Professional Build v3.4.0-pro</div>
                                <div>Powered by JioSaavn Enterprise API</div>
                                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>OSS</span>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>React 18</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Danger Zone */}
                    <section style={{ 
                        background: 'rgba(255,50,50,0.02)', borderRadius: '24px', padding: '2rem', 
                        border: '1px solid rgba(255,50,50,0.1)', marginTop: '1rem'
                    }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.2rem' }}>
                            <ShieldAlert size={20} /> Storage & Data
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Managing local data will affect your playlists, favorites, and listening history.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button onClick={clearData} style={{ 
                                padding: '0.8rem 1.5rem', borderRadius: '16px', 
                                background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', 
                                color: '#ff6b6b', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <Trash2 size={18} /> Wipe Local Cache
                            </button>
                        </div>
                    </section>
                </div>
                
                <footer style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.3, fontSize: '0.8rem' }}>
                    &copy; 2024 Mehfil Music. Made with ❤️ for Indian Music Lovers.
                </footer>
            </div>
            
            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin-slow { animation: spin-slow 12s linear infinite; }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }

                .settings-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
                .settings-card:hover { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(0,0,0,0.4); }
            `}</style>
        </div>
    );
}
