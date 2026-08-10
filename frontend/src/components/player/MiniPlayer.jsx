import React from 'react';
import { SkipBack, SkipForward, ListMusic, Tv } from 'lucide-react';
import { PlayIcon } from '../icons/PlayIcon';
import { PauseIcon } from '../icons/PauseIcon';
import { ChevronUpIcon } from '../icons/ChevronUpIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { VolumeToggleIcon } from '../icons/VolumeToggleIcon';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getImageUrl } from '../../api/client.js';
import { formatTime, decodeEntities, getSafeImage } from '../../utils/helpers.js';
import Tooltip from '../common/Tooltip';

export default function MiniPlayer({ onExpand, onQueue }) {
    const currentSong = usePlayerStore(state => state.currentSong);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const progress = usePlayerStore(state => state.progress);
    const currentTime = usePlayerStore(state => state.currentTime);
    const duration = usePlayerStore(state => state.duration);
    const volume = usePlayerStore(state => state.volume);
    const isMuted = usePlayerStore(state => state.isMuted);
    const togglePlay = usePlayerStore(state => state.togglePlay);
    const nextSong = usePlayerStore(state => state.nextSong);
    const prevSong = usePlayerStore(state => state.prevSong);
    const seek = usePlayerStore(state => state.seek);
    const setVolume = usePlayerStore(state => state.setVolume);
    const toggleMute = usePlayerStore(state => state.toggleMute);
    const isVideoMode = usePlayerStore(state => state.isVideoMode);
    const setVideoMode = usePlayerStore(state => state.setVideoMode);

    if (!currentSong) return null;

    const isYtSong = currentSong.id?.startsWith('yt_');
    const imageUrl = getSafeImage(currentSong.image, getImageUrl);
    const title = decodeEntities(currentSong.title || 'Unknown');
    const artist = decodeEntities(currentSong.primaryArtists || currentSong.subtitle || 'Unknown');

    return (
        <div className={`mini-player visible ${isPlaying ? 'playing' : ''}`} id="miniPlayer">
            {/* Progress Bar */}
            <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                <input
                    type="range"
                    id="miniProgressInput"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => seek(Number(e.target.value))}
                    aria-label="Song progress"
                />
            </div>

            <div className="mini-player-content">
                {/* Song Info - click to expand */}
                <div className="mini-player-info" id="miniPlayerInfo" onClick={onExpand}>
                    <img id="miniPlayerImage" src={imageUrl} alt="Album Art" />
                    <div>
                        <div id="miniPlayerTitle">{title}</div>
                        <div id="miniPlayerArtist">
                            {artist}
                            {currentSong.mlQueued && (
                                <span style={{ marginLeft: '6px', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px' }} title="Queued via Taste Profile">
                                    <SparklesIcon size={14} style={{ color: 'var(--mehfil-gold-primary)' }} />
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="mini-player-controls">
                    {/* YouTube Video Mode Button */}
                    {isYtSong && (
                        <button
                            onClick={() => setVideoMode(!isVideoMode)}
                            title={isVideoMode ? 'Switch to Audio Mode' : 'Switch to Video Mode'}
                            style={{
                                background: isVideoMode ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)',
                                border: '1px solid ' + (isVideoMode ? '#a855f7' : 'rgba(255,255,255,0.12)'),
                                color: isVideoMode ? '#c084fc' : 'rgba(255,255,255,0.7)',
                                borderRadius: '8px',
                                padding: '5px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginRight: '4px'
                            }}
                        >
                            <Tv size={14} /> Video
                        </button>
                    )}

                    <Tooltip content="Previous">
                        <button id="miniPrevButton" onClick={prevSong} aria-label="Previous">
                            <SkipBack size={16} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Play/Pause">
                        <button id="miniPlayButton" onClick={togglePlay} aria-label="Play/Pause">
                            {isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                        </button>
                    </Tooltip>
                    <Tooltip content="Next">
                        <button id="miniNextButton" onClick={nextSong} aria-label="Next">
                            <SkipForward size={16} />
                        </button>
                    </Tooltip>

                    <Tooltip content="Queue">
                        <button id="miniQueueBtn" onClick={onQueue} aria-label="Queue" style={{ marginLeft: '4px' }}>
                            <ListMusic size={16} />
                        </button>
                    </Tooltip>

                    <div className="mini-volume-control">
                        <Tooltip content={isMuted ? "Unmute" : "Mute"}>
                            <button id="miniVolumeButton" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                                <VolumeToggleIcon size={16} isMuted={isMuted} />
                            </button>
                        </Tooltip>
                        <Tooltip content={`Volume: ${isMuted ? 0 : Math.round(volume * 100)}%`}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="range"
                                    id="miniVolumeSlider"
                                    min="0"
                                    max="100"
                                    value={isMuted ? 0 : volume * 100}
                                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                                    aria-label="Volume"
                                />
                            </div>
                        </Tooltip>
                    </div>

                </div>

                {/* Time & Branding */}
                <div className="mini-player-expand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="time-display">
                        <span id="currentTime">{formatTime(currentTime)}</span>
                        <span id="duration">{formatTime(duration)}</span>
                    </div>
                    
                    <Tooltip content="Expand player (Full Screen)">
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <button id="expandPlayer" onClick={onExpand} aria-label="Expand player" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
                                <ChevronUpIcon size={20} />
                            </button>
                        </div>
                    </Tooltip>
                </div>

                <div className="mini-player-branding">
                    <span className="brand-text">Mehfil</span>
                    <span className="brand-tagline">Suno Dil se</span>
                </div>
            </div>
        </div>
    );
}
