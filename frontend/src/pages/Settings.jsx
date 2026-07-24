import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Palette, Volume2, Info, Trash2, LogOut, ShieldAlert, Check, CheckCircle2, Mic, ExternalLink, Sparkles, Download, Smartphone } from 'lucide-react';
import { getPreferredGenres, savePreferredGenres, getGenreCounts } from '../utils/history.js';
import { ALL_GENRES, GENRE_PROFILES } from '../utils/genreProfiles.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import { useAuthStore } from '../store/useAuthStore';
import { Upload } from 'lucide-react';

// Static list — defined outside component to avoid re-creation on every render
const PRESET_AVATARS = [
    'https://api.dicebear.com/7.x/notionists/svg?seed=Felix',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Sam',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Bella',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Leo',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Ravi',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Priya',
];

export default function Settings() {
    const isAutoMixEnabled = usePlayerStore(state => state.isAutoMixEnabled);
    const toggleAutoMix = usePlayerStore(state => state.toggleAutoMix);
    const { user, token, logout, login } = useAuthStore();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState(''); // URL or base64
    const [savingProfile, setSavingProfile] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const fileInputRef = React.useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('File too large. Maximum size is 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => setEditAvatar(ev.target.result); // base64 for local preview
            reader.readAsDataURL(file);
        }
    };
    const [auddToken, setAuddToken] = useState(localStorage.getItem('audd_api_token') || '');
    const [preferredGenres, setPreferredGenres] = useState(getPreferredGenres());
    const [genreCounts, setGenreCounts] = useState(getGenreCounts());
    const [editingGenres, setEditingGenres] = useState(false);
    const [tempGenres, setTempGenres] = useState([]);

    const [canInstall, setCanInstall] = useState(!!window.__deferredPrompt);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {

        const checkInstallState = () => {
            const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            setIsStandalone(standalone);
            
            const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            setIsIOS(ios);
        };
        checkInstallState();

        const handler = () => setCanInstall(true);
        window.addEventListener('pwa-can-install', handler);
        return () => window.removeEventListener('pwa-can-install', handler);
    }, []);

    const handleInstallApp = async () => {
        const promptEvent = window.__deferredPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        window.__deferredPrompt = null;
        setCanInstall(false);
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

    const handleLogout = () => {
        if (confirm('Logout from Mehfil?')) {
            logout();
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: editName, profileImageUrl: editAvatar })
            });
            const data = await res.json();
            if (data.success) {
                login(data.user, token);
                setIsEditingProfile(false);
                setSuccessMsg('Profile updated successfully!');
                setTimeout(() => setSuccessMsg(''), 3000);
            } else {
                alert('Error updating profile: ' + data.message);
            }
        } catch (e) {
            alert('Network error while updating profile');
        } finally {
            setSavingProfile(false);
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
                <style>{`
                    .settings-btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        padding: 10px 20px;
                        border-radius: 12px;
                        font-size: 0.95rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        border: 1px solid transparent;
                        outline: none;
                        font-family: inherit;
                        text-decoration: none;
                    }
                    .settings-btn:hover {
                        transform: translateY(-2px);
                    }
                    .settings-btn:active {
                        transform: translateY(0);
                    }
                    .settings-btn.edit-btn {
                        background: rgba(255, 255, 255, 0.06);
                        color: #fff;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .settings-btn.edit-btn:hover {
                        background: rgba(255, 255, 255, 0.12);
                        border-color: rgba(255, 255, 255, 0.2);
                    }
                    .settings-btn.logout-btn {
                        background: rgba(239, 68, 68, 0.1);
                        color: #ef4444;
                        border: 1px solid rgba(239, 68, 68, 0.2);
                    }
                    .settings-btn.logout-btn:hover {
                        background: rgba(239, 68, 68, 0.15);
                        border-color: rgba(239, 68, 68, 0.3);
                        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
                    }
                    .theme-swatch {
                        width: 24px; height: 24px; border-radius: 50%;
                        display: inline-block; cursor: pointer;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                        border: 2px solid rgba(255,255,255,0.1);
                    }
                    .theme-swatch:hover {
                        transform: scale(1.15);
                    }
                `}</style>
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
                        </div>
                        
                        {user ? (
                            isEditingProfile ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    {/* Live Preview */}
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <img
                                            src={editAvatar || user.profileImageUrl || '/dp.png'}
                                            alt="Preview"
                                            style={{
                                                width: '80px', height: '80px', borderRadius: '50%',
                                                border: '3px solid var(--accent-primary)',
                                                boxShadow: '0 0 20px rgba(168,85,247,0.4)',
                                                background: '#fff', objectFit: 'cover',
                                                transition: 'all 0.3s ease'
                                            }}
                                        />
                                    </div>

                                    {/* Name Input */}
                                    <div>
                                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>Display Name</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            style={{
                                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff', boxSizing: 'border-box', fontSize: '0.95rem'
                                            }}
                                        />
                                    </div>

                                    {/* Avatar Grid */}
                                    <div>
                                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Choose an Avatar</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                                            {PRESET_AVATARS.map((url, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setEditAvatar(url)}
                                                    title={`Avatar ${i + 1}`}
                                                    style={{
                                                        cursor: 'pointer', borderRadius: '50%', overflow: 'hidden',
                                                        padding: '3px',
                                                        background: editAvatar === url
                                                            ? 'linear-gradient(135deg, #a855f7, #6366f1)'
                                                            : 'transparent',
                                                        border: editAvatar === url
                                                            ? 'none'
                                                            : '2px solid rgba(255,255,255,0.12)',
                                                        transition: 'all 0.25s ease',
                                                        transform: editAvatar === url ? 'scale(1.08)' : 'scale(1)',
                                                        aspectRatio: '1/1',
                                                    }}
                                                >
                                                    <img src={url} alt={`Avatar ${i + 1}`} style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f5f5f5', display: 'block' }} />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Upload from Gallery */}
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                                        <button
                                            className="settings-btn"
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', border: '1px dashed rgba(255,255,255,0.25)', justifyContent: 'center', gap: '8px' }}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload size={15} /> Upload from Gallery
                                        </button>
                                        {editAvatar?.startsWith('data:') && (
                                            <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CheckCircle2 size={13} /> Custom image selected — preview above
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            className="settings-btn"
                                            style={{ background: 'var(--accent-primary)', color: '#000', flex: 1, fontWeight: 700, justifyContent: 'center' }}
                                            onClick={handleSaveProfile}
                                            disabled={savingProfile}
                                        >
                                            {savingProfile ? 'Saving…' : 'Save Profile'}
                                        </button>
                                        <button
                                            className="settings-btn"
                                            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', flex: 1, justifyContent: 'center' }}
                                            onClick={() => setIsEditingProfile(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ position: 'relative' }}>
                                        <img src={user.profileImageUrl || '/dp.png'} alt="Profile" className="profile-image" />
                                        <div className="profile-verified-badge">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                    <div className="profile-text" style={{ flex: 1 }}>
                                        <div className="profile-name-text">{user.name}</div>
                                        <div className="profile-meta-text">
                                            {user.email} &bull; Joined Recently
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.8rem', marginLeft: 'auto' }}>
                                        <button className="settings-btn edit-btn" onClick={() => { setEditName(user.name); setEditAvatar(user.profileImageUrl); setIsEditingProfile(true); }}>
                                            Edit
                                        </button>
                                        <button className="settings-btn logout-btn" onClick={handleLogout}>
                                            <LogOut size={16} /> Logout
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Log in to sync your library across devices.</p>
                            </div>
                        )}
                    </section>

                    {/* Brand Identity Card */}
                    <section className="settings-card" style={{ 
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(192, 132, 252, 0.04) 100%)',
                        borderRadius: '24px', padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                            <Palette size={20} /> Appearance
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <img src="/mehfil-logo.png" alt="Mehfil" style={{ width: '56px', height: '56px', objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.5))' }} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginBottom: '4px' }}>Mehfil Purple Theme</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>A consistent brand experience across the entire app</div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <span className="theme-swatch" style={{ background: '#7C3AED', boxShadow: '0 0 12px rgba(124,58,237,0.6)' }} title="Deep Purple"></span>
                                    <span className="theme-swatch" style={{ background: '#8B5CF6', boxShadow: '0 0 12px rgba(139,92,246,0.6)' }} title="Purple"></span>
                                    <span className="theme-swatch" style={{ background: '#A78BFA', boxShadow: '0 0 12px rgba(167,139,250,0.6)' }} title="Violet"></span>
                                    <span className="theme-swatch" style={{ background: '#C084FC', boxShadow: '0 0 12px rgba(192,132,252,0.6)' }} title="Lavender"></span>
                                </div>
                            </div>
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
                                                <span key={g} style={{ padding: '6px 14px', borderRadius: '50px', background: `${p.color || '#8B5CF6'}22`, border: `1.5px solid ${p.color || '#8B5CF6'}`, color: p.color || '#8B5CF6', fontSize: '0.85rem', fontWeight: 600 }}>
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
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700, background: 'rgba(139,92,246,0.15)', padding: '4px 12px', borderRadius: '30px' }}>320kbps</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff' }}>Optimizer</span>
                                    <span style={{ color: 'var(--text-muted)' }}>Enabled</span>
                                </div>
                            </div>
                        </section>

                        <section className="settings-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                <Sparkles size={20} /> Playback Settings
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ marginRight: '1rem' }}>
                                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>AutoMix</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                                        Crossfade seamlessly between songs with DJ-style transitions.
                                    </div>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0 }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isAutoMixEnabled} 
                                        onChange={toggleAutoMix}
                                        style={{ opacity: 0, width: 0, height: 0 }} 
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', inset: 0,
                                        background: isAutoMixEnabled ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)',
                                        transition: '.3s ease', borderRadius: '34px',
                                        boxShadow: isAutoMixEnabled ? '0 0 10px rgba(139,92,246,0.3)' : 'none'
                                    }}>
                                        <span style={{
                                            position: 'absolute', content: '""', height: '18px', width: '18px',
                                            left: isAutoMixEnabled ? '24px' : '4px', bottom: '3px',
                                            background: isAutoMixEnabled ? '#000' : '#fff', transition: '.3s ease', borderRadius: '50%'
                                        }}></span>
                                    </span>
                                </label>
                            </div>
                        </section>

                        {!isStandalone && (
                            <section className="settings-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>
                                    <Smartphone size={20} /> App Installation
                                </h3>
                                
                                {canInstall ? (
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem', lineHeight: 1.5 }}>
                                            Install Mehfil on your home screen for quick access, full screen playback, and an immersive native experience.
                                        </p>
                                        <button 
                                            onClick={handleInstallApp}
                                            style={{
                                                padding: '10px 24px', borderRadius: '50px', 
                                                background: 'var(--accent-primary)', color: '#000', 
                                                border: 'none', fontWeight: 700, cursor: 'pointer', 
                                                fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px',
                                                boxShadow: '0 4px 15px rgba(var(--accent-primary-rgb), 0.3)',
                                                transition: 'transform 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <Download size={16} /> Install Mehfil App
                                        </button>
                                    </div>
                                ) : isIOS ? (
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                                            Install Mehfil on your iPhone or iPad for an app-like fullscreen experience:
                                        </p>
                                        <div style={{ 
                                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '16px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '10px'
                                        }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                                                <span style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '0.75rem' }}>1</span>
                                                <span style={{ color: '#fff' }}>Open Mehfil in the <strong>Safari</strong> browser.</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                                                <span style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '0.75rem' }}>2</span>
                                                <span style={{ color: '#fff' }}>Tap the <strong>Share</strong> button <span style={{ fontSize: '1.1rem', verticalAlign: 'middle' }}>⎋</span> (at the bottom or top of the screen).</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                                                <span style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, fontSize: '0.75rem' }}>3</span>
                                                <span style={{ color: '#fff' }}>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                                            To download and install Mehfil as an app:
                                        </p>
                                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                            Open this site in a compatible mobile browser like <strong>Google Chrome</strong> or <strong>Safari</strong>, open the browser options menu, and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
                                        </p>
                                    </div>
                                )}

                                {/* Android APK Download Option */}
                                <div style={{ 
                                    marginTop: '1.5rem', 
                                    paddingTop: '1.5rem', 
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Android APK</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
                                        Alternatively, you can directly download the Android package (APK) file to install Mehfil on your Android device.
                                    </p>
                                    <a 
                                        href="/mehfil.apk" 
                                        download="mehfil.apk"
                                        style={{
                                            alignSelf: 'flex-start',
                                            padding: '8px 18px', 
                                            borderRadius: '50px', 
                                            background: 'rgba(255,255,255,0.06)', 
                                            color: '#fff', 
                                            border: '1px solid rgba(255,255,255,0.1)', 
                                            fontWeight: 600, 
                                            cursor: 'pointer', 
                                            fontSize: '0.85rem', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px',
                                            textDecoration: 'none',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    >
                                        <Download size={14} /> Download APK
                                    </a>
                                </div>
                            </section>
                        )}

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
