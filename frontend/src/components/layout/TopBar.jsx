import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Moon, Mic, Loader2, Radio, Users } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch, API_BASE_URL } from '../../api/client.js';



function ListenTogetherPanel({ sessionCode, sessionRole, createSession, joinSession, leaveSession, onClose }) {
    const participants = usePlayerStore(state => state.participants);
    const kickUser = usePlayerStore(state => state.kickUser);
    const [joinCode, setJoinCode] = useState('');

    const handleCreate = () => {
        const code = createSession();
        alert(`Session created! Code: ${code}. Share the invite link with your friends.`);
    };

    const handleJoin = () => {
        if (!joinCode.trim()) return;
        joinSession(joinCode.trim());
        alert(`Joined session: ${joinCode.trim()}`);
        setJoinCode('');
    };

    const handleCopyLink = () => {
        if (!sessionCode) return;
        const link = `${window.location.origin}/#listen=${sessionCode}`;
        navigator.clipboard.writeText(link);
        alert('Invite link copied to clipboard!');
    };

    return (
        <div style={{
            position: 'absolute',
            top: '50px',
            right: '0px',
            width: '280px',
            zIndex: 1000,
            background: 'rgba(15, 12, 28, 0.96)',
            backdropFilter: 'blur(25px)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            color: '#fff',
            pointerEvents: 'auto'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(90deg, #c084fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Radio size={18} color="#c084fc" /> Listen Together
                </h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>&times;</button>
            </div>

            {sessionCode ? (
                // Active Session State
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.15)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {sessionRole === 'host' ? 'Hosting Room' : 'Joined Room'}
                        </span>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c084fc', margin: '6px 0', fontFamily: 'monospace', letterSpacing: '2px' }}>
                            {sessionCode}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                            Everyone in this room can control playback.
                        </p>
                    </div>

                    {/* Participants List */}
                    {participants && participants.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Connected Users ({participants.length})</span>
                            <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {participants.map(p => (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <img src={p.profilePicture || '/dp.png'} alt={p.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                            <span style={{ fontSize: '0.85rem', color: '#fff' }}>{p.name || 'Guest'}</span>
                                        </div>
                                        {sessionRole === 'host' && (
                                            <button 
                                                onClick={() => { if(window.confirm(`Remove ${p.name || 'this user'} from the room?`)) kickUser(p.id); }}
                                                style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#ef4444', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                            >
                                                Kick
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={handleCopyLink} 
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'background 0.2s',
                                fontSize: '0.85rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        >
                            Copy Link
                        </button>

                        <button 
                            onClick={leaveSession} 
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                fontSize: '0.85rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                        >
                            Leave Room
                        </button>
                    </div>
                </div>
            ) : (
                // Offline State
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button 
                            onClick={handleCreate} 
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '12px',
                                background: 'linear-gradient(90deg, #a855f7, #6366f1)',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                              onMouseLeave={e => e.currentTarget.style.opacity = 1}
                        >
                            Start a Session
                        </button>
                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                            Become the host and sync with other tabs.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>OR</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                placeholder="Enter Room Code" 
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    outline: 'none',
                                    fontSize: '0.9rem',
                                    width: '100px'
                                }}
                            />
                            <button 
                                onClick={handleJoin}
                                disabled={!joinCode.trim()}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    background: '#fff',
                                    border: 'none',
                                    color: '#000',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    opacity: joinCode.trim() ? 1 : 0.5
                                }}
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TopBar({ user, onOpenEq, onOpenSleep }) {
    const navigate = useNavigate();
    const location = useLocation();
    const playSong = usePlayerStore(state => state.playSong);
    const sessionCode = usePlayerStore(state => state.sessionCode);
    const sessionRole = usePlayerStore(state => state.sessionRole);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const sleepTimer = usePlayerStore(state => state.sleepTimer);
    const createSession = usePlayerStore(state => state.createSession);
    const joinSession = usePlayerStore(state => state.joinSession);
    const leaveSession = usePlayerStore(state => state.leaveSession);
    const [isListening, setIsListening] = useState(false);
    const [localQuery, setLocalQuery] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [syncPanelOpen, setSyncPanelOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const startRecognition = async () => {
        if (isListening) return;
        setIsListening(true);
        console.info('[Shazam] Starting microphone...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Cross-browser supported MIME type detection
            const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac'];
            const mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
            const options = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, options);

            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                if (chunks.length === 0) {
                    alert("No audio data captured. Please check your microphone permissions.");
                    setIsListening(false);
                    return;
                }

                const recType = mediaRecorder.mimeType || mimeType || 'audio/webm';
                const blob = new Blob(chunks, { type: recType });
                
                if (blob.size < 1000) {
                    alert("Recording too short or silent. Please try again.");
                    setIsListening(false);
                    return;
                }

                const fileExt = recType.includes('mp4') ? 'mp4' : recType.includes('ogg') ? 'ogg' : 'webm';
                const formData = new FormData();
                formData.append('file', blob, `recognize.${fileExt}`);
                
                // Use custom AudD token if provided in Settings
                const customToken = localStorage.getItem('audd_api_token');
                if (customToken) {
                    formData.append('api_token', customToken);
                } else {
                    formData.append('api_token', 'test'); 
                }

                console.info('[Shazam] Uploading sample for identification...');

                try {
                    const recognizeUrl = `${API_BASE_URL}/api/recognize`;
                    const res = await fetch(recognizeUrl, {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.message || `Server returned ${res.status}`);
                    }
                    
                    const data = await res.json();
                    
                    if (data.status === 'success' && data.result) {
                        const songTitle = `${data.result.title} ${data.result.artist}`;
                        console.info(`[Shazam] Result: ${songTitle}`);
                        
                        const searchRes = await apiFetch('/api/search/songs', { query: songTitle, limit: 1 });
                        
                        if (searchRes.results?.length > 0) {
                            playSong(searchRes.results[0]);
                        } else {
                            alert(`Identified as: "${data.result.title}" by ${data.result.artist}, but it's not available in our library.`);
                        }
                    } else if (data.status === 'error') {
                        const msg = data.error?.error_message || data.message || "Recognition error. AudD test token only supports sample audio from their docs. Add your free AudD API token in Settings!";
                        alert(msg);
                    } else {
                        alert("Couldn't identify that song. Make sure the music is playing clearly near your microphone!");
                    }
                } catch (err) {
                    console.error('[Shazam] Identification failed:', err);
                    alert(`Music recognition error: ${err.message || "Please try again later."}`);
                } finally {
                    setIsListening(false);
                    stream.getTracks().forEach(t => t.stop());
                }
            };

            // Start recording with timeslice
            mediaRecorder.start(1000); 
            
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') mediaRecorder.stop();
            }, 6000); // 6 sec audio sample
        } catch (err) {
            console.error('Permission/Mic error:', err);
            alert(`Microphone access error: ${err.message || 'Please grant microphone permissions in browser settings.'}`);
            setIsListening(false);
        }
    };

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
        <div className="top-bar glass-morphism" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '2rem' }}>
            <div className="search" style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '480px' }}>
                <div className="search-box" style={{ 
                    position: 'relative', 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: 'rgba(255, 255, 255, 0.04)', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '12px', 
                    padding: '0 16px', 
                    width: '100%',
                    height: '42px',
                    transition: 'all 0.3s'
                }}>
                    <input
                        type="text"
                        id="searchInput"
                        value={localQuery}
                        onChange={handleSearchChange}
                        placeholder="Search songs, artists, albums..."
                        onFocus={handleSearchFocus}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '0.9rem',
                            width: '100%',
                            outline: 'none',
                        }}
                    />
                    <Search className="search-icon" size={18} style={{ color: 'rgba(255, 255, 255, 0.4)', marginLeft: '10px' }} />
                </div>
            </div>

            <div className="nav-right-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className={`icon-btn mic-btn ${isListening ? 'listening' : ''}`} 
                  onClick={startRecognition}
                  title="Identify Song"
                  style={{
                      background: isListening ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: isListening ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isListening ? '#10B981' : 'var(--text-secondary)',
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      cursor: 'pointer'
                  }}
                >
                  {isListening ? <Loader2 className="spin" size={20} /> : <Mic size={20} />}
                </button>
                
                <button 
                    id="openEqBtn" 
                    className="icon-btn tooltip-btn" 
                    aria-label="Equalizer" 
                    onClick={onOpenEq}
                    style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        cursor: 'pointer'
                    }}
                >
                    <SlidersHorizontal size={20} />
                </button>
                
                <button 
                  id="openSleepBtn" 
                  className={`icon-btn tooltip-btn ${sleepTimer?.active ? 'active' : ''}`} 
                  aria-label="Sleep Timer" 
                  onClick={onOpenSleep}
                  style={{
                      borderColor: sleepTimer?.active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.08)',
                      background: sleepTimer?.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
                      color: sleepTimer?.active ? '#10B981' : 'var(--text-secondary)',
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      cursor: 'pointer'
                  }}
                >
                    <img 
                        src={`https://img.icons8.com/?size=40&id=10772&format=png&color=${sleepTimer?.active ? '10B981' : 'FFFFFF'}`} 
                        alt="Sleep Timer" 
                        style={{ 
                            width: '18px', 
                            height: '18px',
                            opacity: sleepTimer?.active ? 1 : 0.7,
                            transition: 'opacity 0.2s'
                        }} 
                    />
                </button>

                {/* Listen Together Tool */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button 
                      className={`icon-btn sync-btn ${sessionCode ? 'active' : ''}`}
                      onClick={() => setSyncPanelOpen(!syncPanelOpen)}
                      title="Listen Together"
                      style={{
                          background: sessionCode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
                          border: sessionCode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                          color: sessionCode ? '#10B981' : 'var(--text-secondary)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          cursor: 'pointer'
                      }}
                    >
                      <Users size={20} className={sessionCode && isPlaying ? 'mehfil-active-pulse' : ''} />
                    </button>
                    
                    {syncPanelOpen && (
                        <ListenTogetherPanel 
                            sessionCode={sessionCode}
                            sessionRole={sessionRole}
                            createSession={createSession}
                            joinSession={joinSession}
                            leaveSession={leaveSession}
                            onClose={() => setSyncPanelOpen(false)}
                        />
                    )}
                </div>

                {/* User Profile */}
                <div className="profile" id="profileEdit" onClick={() => user ? navigate('/settings') : navigate('/auth')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '6px 14px', height: '42px', marginLeft: '4px' }}>
                    <img src={user?.profileImageUrl || '/dp.png'} alt="Profile" className="icon-svg" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{user ? user.name.split(' ')[0] : 'Sign In'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            </div>
        </div>
    );
}
