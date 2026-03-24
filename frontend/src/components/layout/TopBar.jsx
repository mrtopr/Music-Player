import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Moon, Mic, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';



export default function TopBar({ user, onOpenEq, onOpenSleep }) {
    const navigate = useNavigate();
    const location = useLocation();
    const playSong = usePlayerStore(state => state.playSong);
    const [isListening, setIsListening] = useState(false);
    const [localQuery, setLocalQuery] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
            const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') ? 'audio/ogg' : 'audio/webm';
            const mediaRecorder = new MediaRecorder(stream, { mimeType });

            const chunks = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: mimeType });
                const formData = new FormData();
                formData.append('file', blob, `recognize.${mimeType.split('/')[1]}`);
                formData.append('api_token', 'test'); 

                console.info('[Shazam] Uploading sample for identification...');

                try {
                    // Use relative URL to leverage Vite's proxy
                    console.info('[Shazam] Uploading sample for identification...');
                    const res = await fetch('/api/recognize', {
                        method: 'POST',
                        body: formData
                    });

                    
                    if (!res.ok) throw new Error(`Server returned ${res.status}`);
                    
                    const data = await res.json();
                    if (data.status === 'success' && data.result) {
                        const songTitle = `${data.result.title} ${data.result.artist}`;
                        console.info(`[Shazam] Result: ${songTitle}`);
                        
                        const searchRes = await apiFetch('/api/search/songs', { query: songTitle, limit: 1 });
                        
                        if (searchRes.results?.length > 0) {
                            playSong(searchRes.results[0]);
                        } else {
                            alert(`Identified as: "${songTitle}", but it's not available for streaming.`);
                        }
                    } else {
                        alert("Couldn't identify that song. Make sure the music is loud enough!");
                    }
                } catch (err) {
                    console.error('[Shazam] Identification failed:', err);
                    alert("Music recognition temporary unavailable. Please try again later.");
                } finally {
                    setIsListening(false);
                    stream.getTracks().forEach(t => t.stop());
                }
            };



            mediaRecorder.start();
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') mediaRecorder.stop();
            }, 7000); // 7 sec recording
        } catch (err) {
            console.error('Permission/Mic error:', err);
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
        <div className="top-bar">
            <div className="search">
                <Search className="search-field-icon" size={16} style={{ color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input
                    type="text"
                    id="searchInput"
                    value={localQuery}
                    onChange={handleSearchChange}
                    placeholder={isMobile ? "Search..." : "Search for songs, favorite artists, or albums..."}
                    onFocus={handleSearchFocus}


                />

                <button type="button" id="searchButton" onClick={handleSearchFocus}>
                    <Search className="icon-svg" size={18} />
                </button>
            </div>


            <div className="premium-tools">
                <button 
                  className={`icon-btn mic-btn ${isListening ? 'listening' : ''}`} 
                  onClick={startRecognition}
                  title="Identify Song"
                >
                  {isListening ? <Loader2 className="spin" size={20} /> : <Mic size={20} />}
                </button>
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
