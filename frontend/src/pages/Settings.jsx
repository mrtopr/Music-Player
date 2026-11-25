import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Settings as SettingsIcon, User, Palette, Volume2, Info, Trash2, LogOut, 
    ShieldAlert, Check, CheckCircle2, Mic, ExternalLink, Sparkles, Download, 
    Smartphone, Upload, SlidersHorizontal, RefreshCw, HardDrive
} from '../components/common/LordIcon';
import { getPreferredGenres, savePreferredGenres, getGenreCounts } from '../utils/history.js';
import { ALL_GENRES, GENRE_PROFILES } from '../utils/genreProfiles.js';
import { usePlayerStore } from '../store/usePlayerStore.js';
import { useAuthStore } from '../store/useAuthStore';
import CraftedBySignature from '../components/common/CraftedBySignature';
import { getAvailableProviders, clearCache as clearLyricsCache } from '../utils/lyricsProvider.js';
import { THEMES, themeManager } from '../utils/themeManager.js';

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

const SETTINGS_CATEGORIES = [
    { id: 'all', label: 'All Settings', icon: SlidersHorizontal },
    { id: 'appearance', label: 'Themes & Visuals', icon: Palette },
    { id: 'account', label: 'Account Profile', icon: User },
    { id: 'playback', label: 'Playback & Audio', icon: Volume2 },
    { id: 'lyrics', label: 'Lyrics & ID', icon: Mic },
    { id: 'storage', label: 'Storage & App', icon: HardDrive },
];

export default function Settings() {
    // ── Store hooks ──
    const musicSource = usePlayerStore(state => state.musicSource);
    const setMusicSource = usePlayerStore(state => state.setMusicSource);
    const isAutoMixEnabled = usePlayerStore(state => state.isAutoMixEnabled);
    const toggleAutoMix = usePlayerStore(state => state.toggleAutoMix);
    const { user, token, logout, login } = useAuthStore();

    // ── Local states ──
    const [activeCategory, setActiveCategory] = useState('all');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [selectedTheme, setSelectedTheme] = useState(() => themeManager.getTheme());
    const fileInputRef = useRef(null);

    // Audio Quality & Normalizer
    const [audioQuality, setAudioQuality] = useState(() => {
        try { return localStorage.getItem('mehfil_audio_quality') || '320'; } catch { return '320'; }
    });
    const [audioNormalizer, setAudioNormalizer] = useState(() => {
        try { return localStorage.getItem('mehfil_audio_normalizer') === 'true'; } catch { return true; }
    });

    // Crossfade duration
    const [crossfadeSec, setCrossfadeSec] = useState(() => {
        try { return localStorage.getItem('mehfil_crossfade_sec') || '5'; } catch { return '5'; }
    });

    // Recognition & Lyrics
    const [auddToken, setAuddToken] = useState(() => {
        try { return localStorage.getItem('audd_api_token') || ''; } catch { return ''; }
    });
    const [lyricsProvider, setLyricsProvider] = useState(() => {
        try { return localStorage.getItem('mehfil_lyrics_provider') || 'auto'; } catch { return 'auto'; }
    });

    // Genre preferences
    const [preferredGenres, setPreferredGenres] = useState(getPreferredGenres);
    const [genreCounts, setGenreCounts] = useState(getGenreCounts);
    const [editingGenres, setEditingGenres] = useState(false);
    const [tempGenres, setTempGenres] = useState([]);

    // PWA & Standalone
    const [canInstall, setCanInstall] = useState(!!window.__deferredPrompt);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    // Storage estimation in KB
    const [storageUsageKb, setStorageUsageKb] = useState(0);

    const calculateStorage = () => {
        try {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    total += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
                }
            }
            setStorageUsageKb(Math.round(total / 1024));
        } catch {
            setStorageUsageKb(48);
        }
    };

    useEffect(() => {
        calculateStorage();
        return themeManager.subscribe((id) => setSelectedTheme(id));
    }, []);

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

    const showNotification = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleThemeSelect = (themeId) => {
        setSelectedTheme(themeId);
        themeManager.applyTheme(themeId);
        const name = themeManager.getThemeConfig(themeId)?.name || 'theme';
        showNotification(`Switched theme to ${name}`);
    };

    const handleAudioQualityChange = (q) => {
        setAudioQuality(q);
        try { localStorage.setItem('mehfil_audio_quality', q); } catch {}
        showNotification(`Audio streaming set to ${q === '320' ? '320 kbps (Lossless HQ)' : q === '160' ? '160 kbps (Standard)' : '96 kbps (Data Saver)'}`);
    };

    const handleNormalizerToggle = () => {
        const next = !audioNormalizer;
        setAudioNormalizer(next);
        try { localStorage.setItem('mehfil_audio_normalizer', String(next)); } catch {}
        showNotification(`Audio Leveler ${next ? 'enabled' : 'disabled'}`);
    };

    const handleCrossfadeChange = (sec) => {
        setCrossfadeSec(sec);
        try { localStorage.setItem('mehfil_crossfade_sec', sec); } catch {}
        showNotification(`Crossfade set to ${sec}s`);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('File too large. Maximum size is 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => setEditAvatar(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleInstallApp = async () => {
        const promptEvent = window.__deferredPrompt;
        if (!promptEvent) return;
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        window.__deferredPrompt = null;
        setCanInstall(false);
    };

    const handleClearTempCache = () => {
        try {
            clearLyricsCache();
            if ('caches' in window) {
                caches.keys().then((keys) => {
                    keys.forEach((key) => {
                        if (key.includes('lyrics') || key.includes('audio') || key.includes('image')) {
                            caches.delete(key);
                        }
                    });
                });
            }
            calculateStorage();
            showNotification('Temporary audio & lyrics cache cleared.');
        } catch {
            showNotification('Cache cleaned.');
        }
    };

    const handleResetAllData = () => {
        if (confirm('Are you sure? This will delete all your locally saved playlists, liked songs, and listening history.')) {
            try {
                localStorage.removeItem('likedSongs');
                localStorage.removeItem('mehfilPlaylists');
                localStorage.removeItem('mehfilHistory');
                localStorage.removeItem('mehfil_recent_queries');
            } catch {}
            calculateStorage();
            showNotification('All local data cleared. Refreshing in 1s...');
            setTimeout(() => window.location.reload(), 1200);
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
                showNotification('Profile updated successfully!');
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
        try { localStorage.setItem('audd_api_token', val); } catch {}
    };

    // Filter cards visibility based on selected tab
    const shouldShow = (cat) => activeCategory === 'all' || activeCategory === cat;

    return (
        <div className="settings-page-wrapper">
            <div className="settings-container">
                {/* ── Page Header ── */}
                <header className="settings-header">
                    <h1 className="settings-title">
                        <SettingsIcon size={32} className="spin-slow" /> Settings
                    </h1>
                    <p className="settings-subtitle">Customize your listening experience, sound, and appearance</p>
                </header>

                {/* ── Toast Notification ── */}
                {successMsg && (
                    <div className="settings-toast">
                        <CheckCircle2 size={18} /> {successMsg}
                    </div>
                )}

                {/* ── Quick Category Navigation Tabs ── */}
                <nav className="settings-nav-tabs" aria-label="Settings Categories">
                    {SETTINGS_CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                className={`settings-tab-pill ${isActive ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                            >
                                <Icon size={15} />
                                <span>{cat.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="settings-cards-stack">
                    {/* ════ 1. APPEARANCE & THEMES ════ */}
                    {shouldShow('appearance') && (
                        <section className="settings-card">
                            <div className="settings-card-header">
                                <h3 className="settings-card-title">
                                    <Palette size={22} /> Color Themes & Visuals
                                </h3>
                                <span className="settings-card-badge">
                                    {THEMES.length} Curated Themes
                                </span>
                            </div>
                            <p className="settings-card-desc">
                                Choose your aesthetic atmosphere. Color themes apply dynamically across the entire app, navigation, glowing audio wave ripples, and fullscreen player.
                            </p>

                            <div className="settings-theme-grid">
                                {THEMES.map(t => {
                                    const isSelected = selectedTheme === t.id;
                                    return (
                                        <div
                                            key={t.id}
                                            className={`settings-theme-card ${isSelected ? 'active' : ''}`}
                                            style={{
                                                '--theme-color-primary': t.primary,
                                                '--theme-color-glow': t.glow
                                            }}
                                            onClick={() => handleThemeSelect(t.id)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', letterSpacing: '-0.2px' }}>
                                                    {t.name}
                                                </div>
                                                {isSelected && (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: t.primary,
                                                        color: '#000',
                                                        fontSize: '0.68rem',
                                                        fontWeight: 800,
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        letterSpacing: '0.5px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        <Check size={11} strokeWidth={3} /> Active
                                                    </span>
                                                )}
                                            </div>

                                            <div className="settings-theme-palette-bar" style={{ background: t.base }}>
                                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: t.primary, boxShadow: `0 0 8px ${t.primary}88` }} title="Primary" />
                                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: t.secondary, boxShadow: `0 0 8px ${t.secondary}88` }} title="Secondary" />
                                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: t.card, border: '1px solid rgba(255,255,255,0.15)' }} title="Surface Card" />
                                                <div style={{ flex: 1, height: '4px', borderRadius: '999px', background: `linear-gradient(90deg, ${t.primary}, ${t.secondary})`, marginLeft: '4px' }} />
                                            </div>

                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                                                {t.tagline}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ════ 2. USER ACCOUNT & PROFILE ════ */}
                    {shouldShow('account') && (
                        <section className="settings-card">
                            <div className="settings-card-header">
                                <h3 className="settings-card-title">
                                    <User size={22} /> My Account
                                </h3>
                                {user && (
                                    <span className="settings-card-badge">
                                        Active Session
                                    </span>
                                )}
                            </div>

                            {user ? (
                                isEditingProfile ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <img
                                                src={editAvatar || user.profileImageUrl || '/dp.png'}
                                                alt="Preview"
                                                style={{
                                                    width: '84px', height: '84px', borderRadius: '50%',
                                                    border: '3px solid var(--accent-primary)',
                                                    boxShadow: '0 0 20px var(--shadow-accent)',
                                                    background: '#fff', objectFit: 'cover'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '6px' }}>Display Name</label>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                                                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                                                    color: '#fff', boxSizing: 'border-box', fontSize: '0.95rem'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '10px' }}>Choose Avatar</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                                                {PRESET_AVATARS.map((url, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => setEditAvatar(url)}
                                                        style={{
                                                            cursor: 'pointer', borderRadius: '50%', overflow: 'hidden',
                                                            padding: '3px',
                                                            background: editAvatar === url ? 'var(--gradient-brand)' : 'transparent',
                                                            border: editAvatar === url ? 'none' : '2px solid rgba(255,255,255,0.12)',
                                                            transform: editAvatar === url ? 'scale(1.08)' : 'scale(1)',
                                                            transition: 'all 0.2s ease', aspectRatio: '1/1'
                                                        }}
                                                    >
                                                        <img src={url} alt={`Avatar ${i + 1}`} style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block', background: '#fff' }} />
                                                    </div>
                                                ))}
                                            </div>

                                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                                            <button
                                                className="settings-btn settings-btn-outline"
                                                style={{ width: '100%', borderStyle: 'dashed' }}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Upload size={16} /> Upload Custom Photo
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                                            <button
                                                className="settings-btn settings-btn-primary"
                                                style={{ flex: 1 }}
                                                onClick={handleSaveProfile}
                                                disabled={savingProfile}
                                            >
                                                {savingProfile ? 'Saving…' : 'Save Changes'}
                                            </button>
                                            <button
                                                className="settings-btn settings-btn-outline"
                                                style={{ flex: 1 }}
                                                onClick={() => setIsEditingProfile(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                        <div style={{ position: 'relative' }}>
                                            <img
                                                src={user.profileImageUrl || '/dp.png'}
                                                alt="Profile"
                                                style={{
                                                    width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover',
                                                    border: '3px solid var(--accent-primary)',
                                                    boxShadow: '0 0 20px var(--shadow-accent)'
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute', bottom: 0, right: 0,
                                                background: 'var(--accent-primary)', borderRadius: '50%',
                                                width: '24px', height: '24px', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', color: '#000',
                                                border: '2px solid var(--bg-card)'
                                            }}>
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: '180px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.35rem', color: '#fff' }}>{user.name}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '3px' }}>
                                                {user.email} &bull; Verified Member
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.8rem', marginLeft: 'auto' }}>
                                            <button
                                                className="settings-btn settings-btn-outline"
                                                onClick={() => { setEditName(user.name); setEditAvatar(user.profileImageUrl); setIsEditingProfile(true); }}
                                            >
                                                Edit Profile
                                            </button>
                                            <button className="settings-btn settings-btn-danger" onClick={handleLogout}>
                                                <LogOut size={16} /> Logout
                                            </button>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div style={{ textAlign: 'center', padding: '1.5rem', border: '2px dashed var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '18px' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                                        You are currently browsing as a guest. Sign in to synchronize your playlists and favorites across devices.
                                    </p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ════ 3. PLAYBACK & SOUND OPTIMIZATIONS ════ */}
                    {shouldShow('playback') && (
                        <section className="settings-card">
                            <div className="settings-card-header">
                                <h3 className="settings-card-title">
                                    <Volume2 size={22} /> Playback & Audio Engine
                                </h3>
                                <span className="settings-card-badge">Hi-Fi</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
                                {/* Music Source */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginBottom: '3px' }}>Music Source Provider</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            Auto mode orchestrates JioSaavn and YouTube Music simultaneously for maximal track availability.
                                        </div>
                                    </div>
                                    <div className="settings-segmented-group">
                                        {[
                                            { id: 'auto', label: '✨ Auto (Dual)' },
                                            { id: 'saavn', label: '🎵 JioSaavn' },
                                            { id: 'youtube', label: '📺 YouTube' }
                                        ].map(src => (
                                            <button
                                                key={src.id}
                                                type="button"
                                                className={`settings-segmented-item ${musicSource === src.id ? 'active' : ''}`}
                                                onClick={() => setMusicSource(src.id)}
                                            >
                                                {src.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ height: '1px', background: 'var(--border-subtle, rgba(255,255,255,0.06))' }} />

                                {/* Streaming Quality */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginBottom: '3px' }}>Streaming Bitrate Quality</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            Higher bitrates produce lossless studio fidelity.
                                        </div>
                                    </div>
                                    <div className="settings-segmented-group">
                                        {[
                                            { id: '320', label: '320 kbps (Lossless)' },
                                            { id: '160', label: '160 kbps (Standard)' },
                                            { id: '96', label: '96 kbps (Data Saver)' }
                                        ].map(q => (
                                            <button
                                                key={q.id}
                                                type="button"
                                                className={`settings-segmented-item ${audioQuality === q.id ? 'active' : ''}`}
                                                onClick={() => handleAudioQualityChange(q.id)}
                                            >
                                                {q.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ height: '1px', background: 'var(--border-subtle, rgba(255,255,255,0.06))' }} />

                                {/* AutoMix & DJ Transitions */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ marginRight: '1rem' }}>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginBottom: '3px' }}>Intelligent AutoMix (DJ Mode)</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            Analyzes BPM and musical key to calculate seamless harmonic deck transitions.
                                        </div>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input
                                            type="checkbox"
                                            checked={isAutoMixEnabled}
                                            onChange={toggleAutoMix}
                                        />
                                        <span className="settings-switch-track">
                                            <span className="settings-switch-knob" />
                                        </span>
                                    </label>
                                </div>

                                <div style={{ height: '1px', background: 'var(--border-subtle, rgba(255,255,255,0.06))' }} />

                                {/* Audio Level Normalizer */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ marginRight: '1rem' }}>
                                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginBottom: '3px' }}>Volume Normalizer (EBU R128)</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            Maintains consistent loudness across tracks to avoid sudden volume spikes.
                                        </div>
                                    </div>
                                    <label className="settings-switch-label">
                                        <input
                                            type="checkbox"
                                            checked={audioNormalizer}
                                            onChange={handleNormalizerToggle}
                                        />
                                        <span className="settings-switch-track">
                                            <span className="settings-switch-knob" />
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ════ 4. MUSIC PREFERENCES & GENRES ════ */}
                    {shouldShow('playback') && (
                        <section className="settings-card">
                            <div className="settings-card-header">
                                <h3 className="settings-card-title">
                                    <Sparkles size={22} /> Music Preferences & Vibes
                                </h3>
                                <button
                                    className="settings-btn settings-btn-outline"
                                    onClick={() => { setEditingGenres(!editingGenres); setTempGenres([...preferredGenres]); }}
                                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                >
                                    {editingGenres ? 'Cancel' : 'Edit Genres'}
                                </button>
                            </div>
                            <p className="settings-card-desc">
                                Selected genres tune your personalized home feed, jump-back cards, and ML auto-queue.
                            </p>

                            {!editingGenres ? (
                                <div>
                                    {preferredGenres.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.2rem' }}>
                                            {preferredGenres.map(g => {
                                                const p = GENRE_PROFILES[g] || {};
                                                return (
                                                    <span key={g} style={{
                                                        padding: '6px 14px', borderRadius: '50px',
                                                        background: `${p.color || 'var(--accent-primary)'}22`,
                                                        border: `1.5px solid ${p.color || 'var(--accent-primary)'}`,
                                                        color: p.color || 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600
                                                    }}>
                                                        {p.emoji} {g}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                            No explicit genre preferences set. Mehfil is learning passively from your listening history!
                                        </div>
                                    )}
                                    {Object.keys(genreCounts).length > 0 && (
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>Passively tracked from your listening:</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {Object.entries(genreCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([g, c]) => (
                                                    <span key={g} style={{
                                                        padding: '4px 10px', borderRadius: '50px',
                                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                                                        color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem'
                                                    }}>
                                                        {g} &bull; {c} {c === 1 ? 'play' : 'plays'}
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
                                                <button
                                                    key={genre}
                                                    type="button"
                                                    onClick={() => setTempGenres(prev => sel ? prev.filter(g => g !== genre) : [...prev, genre])}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '50px', cursor: 'pointer',
                                                        fontSize: '0.85rem', fontWeight: 600,
                                                        border: `2px solid ${sel ? profile.color : 'rgba(255,255,255,0.1)'}`,
                                                        background: sel ? `${profile.color}22` : 'rgba(255,255,255,0.03)',
                                                        color: sel ? profile.color : 'rgba(255,255,255,0.5)',
                                                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    {profile.emoji} {genre} {sel && <Check size={12} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        className="settings-btn settings-btn-primary"
                                        onClick={() => {
                                            savePreferredGenres(tempGenres);
                                            setPreferredGenres(tempGenres);
                                            setEditingGenres(false);
                                            showNotification('Genre preferences saved! Home feed updated.');
                                        }}
                                    >
                                        Save Preferences
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ════ 5. LYRICS & MUSIC IDENTIFICATION ════ */}
                    {shouldShow('lyrics') && (
                        <section className="settings-card">
                            <div className="settings-card-header">
                                <h3 className="settings-card-title">
                                    <Mic size={22} /> Lyrics & Song Recognition
                                </h3>
                                <span className="settings-card-badge">5 Providers</span>
                            </div>

                            <p className="settings-card-desc">
                                Lyrics are fetched simultaneously across five synchronized backends (LRCLIB, NetEase, QQ Music, Kugou, and lyrics.ovh) with automatic zero-downtime failover.
                            </p>

                            <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.8rem' }}>
                                {getAvailableProviders().map(p => {
                                    const isSelected = lyricsProvider === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                setLyricsProvider(p.id);
                                                try { localStorage.setItem('mehfil_lyrics_provider', p.id); } catch {}
                                                clearLyricsCache();
                                                const activeSong = usePlayerStore.getState().currentSong;
                                                if (activeSong) usePlayerStore.getState().fetchLyricsForSong(activeSong, true);
                                                showNotification(`Lyrics provider set to ${p.name}`);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                background: isSelected ? 'var(--accent-primary-soft)' : 'rgba(255,255,255,0.03)',
                                                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                                color: '#fff', borderRadius: '14px', padding: '0.9rem 1.2rem',
                                                cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '0.9rem'
                                            }}
                                        >
                                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                                            {isSelected && <Check size={16} color="var(--accent-primary)" strokeWidth={3} />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* AudD Recognition Token */}
                            <div style={{ borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', paddingTop: '1.4rem' }}>
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
                                    AudD Audio Recognition Token
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
                                    Identify real-world ambient music playing near you. Leave blank to utilize the default server proxy, or provide your personal key from <a href="https://audd.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>audd.io <ExternalLink size={12} /></a>
                                </div>
                                <input
                                    type="password"
                                    value={auddToken}
                                    onChange={handleAuddTokenChange}
                                    placeholder="Enter your private AudD API token..."
                                    style={{
                                        width: '100%', padding: '12px 16px', borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                                        color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </section>
                    )}

                    {/* ════ 6. APP INSTALLATION & PWA ════ */}
                    {shouldShow('storage') && (
                        <section className="settings-card">
                            <div className="settings-card-header">
                                <h3 className="settings-card-title">
                                    <Smartphone size={22} /> App Installation & PWA
                                </h3>
                                <span className="settings-card-badge">{isStandalone ? 'Installed Native' : 'PWA Ready'}</span>
                            </div>

                            {!isStandalone ? (
                                <div>
                                    <p className="settings-card-desc">
                                        Install Mehfil on your home screen for instantaneous loading, hardware media key integration, background audio playback, and immersive full screen controls.
                                    </p>

                                    {canInstall ? (
                                        <button
                                            className="settings-btn settings-btn-primary"
                                            onClick={handleInstallApp}
                                        >
                                            <Download size={16} /> Install Mehfil App
                                        </button>
                                    ) : isIOS ? (
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                            borderRadius: '16px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '10px'
                                        }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.85rem', color: '#fff' }}>
                                                <span style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>1</span>
                                                <span>Open Mehfil in <strong>Safari</strong> on iOS.</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.85rem', color: '#fff' }}>
                                                <span style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>2</span>
                                                <span>Tap the <strong>Share</strong> button <span style={{ fontSize: '1.1rem' }}>⎋</span>.</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.85rem', color: '#fff' }}>
                                                <span style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>3</span>
                                                <span>Tap <strong>Add to Home Screen</strong>.</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                                            Open in Chrome, Edge, or Safari, then tap your browser options menu and click <strong>Install App</strong>.
                                        </p>
                                    )}

                                    {/* Android Package Option */}
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div>
                                            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Direct Android APK</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Installable package for offline side-loading</div>
                                        </div>
                                        <a href="/mehfil.apk" download="mehfil.apk" className="settings-btn settings-btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                            <Download size={14} /> Download APK
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={18} /> Running inside native standalone PWA container
                                </div>
                            )}
                        </section>
                    )}

                    {/* ════ 7. STORAGE, CACHE & SYSTEM ════ */}
                    {shouldShow('storage') && (
                        <section className="settings-card">
                            <div className="settings-card-header">
                                <h3 className="settings-card-title">
                                    <HardDrive size={22} /> Storage & Cache Management
                                </h3>
                                <span className="settings-card-badge">
                                    ~{storageUsageKb} KB Local Storage
                                </span>
                            </div>
                            <p className="settings-card-desc">
                                Manage offline cache, temporary stream buffers, and application state.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                                {/* Safe Cache Clean */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                    borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px'
                                }}>
                                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>Clear Temporary Cache</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4, flex: 1 }}>
                                        Removes cached lyrics and audio wave assets. Keeps your playlists, liked songs, and account intact.
                                    </div>
                                    <button className="settings-btn settings-btn-outline" onClick={handleClearTempCache} style={{ alignSelf: 'flex-start' }}>
                                        <RefreshCw size={14} /> Flush Cache
                                    </button>
                                </div>

                                {/* Factory Reset */}
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)',
                                    borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px'
                                }}>
                                    <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ShieldAlert size={16} /> Reset All Local Data
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4, flex: 1 }}>
                                        Permanently deletes all saved offline playlists, liked songs, and listening history.
                                    </div>
                                    <button className="settings-btn settings-btn-danger" onClick={handleResetAllData} style={{ alignSelf: 'flex-start' }}>
                                        <Trash2 size={14} /> Wipe All Data
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ════ 8. ABOUT & BUILD INFO ════ */}
                    {shouldShow('storage') && (
                        <section className="settings-card" style={{ padding: '1.6rem 2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem' }}>Mehfil Pro Studio</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                                        Version 3.4.2 &bull; React 18 &bull; Vite 5 &bull; FastML Engine
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span className="settings-card-badge" style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>
                                        Stable Release
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                <footer style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <CraftedBySignature />
                    <div style={{ opacity: 0.5, marginTop: '6px' }}>
                        &copy; 2026 Mehfil Music &bull; Designed with Passion
                    </div>
                </footer>
            </div>
        </div>
    );
}
