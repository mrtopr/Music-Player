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
            {/* Top Micro Progress Bar */}
            <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress || 0}%` }}></div>
                <input
                    type="range"
                    id="miniProgressInput"
                    min="0"
                    max="100"
                    value={progress || 0}
                    onChange={(e) => seek(Number(e.target.value))}
                    aria-label="Song progress"
                />
            </div>

            <div className="mini-player-content">
                {/* 1. LEFT: Track Details */}
                <div className="mini-player-left" id="miniPlayerInfo" onClick={onExpand}>
                    <img id="miniPlayerImage" src={imageUrl} alt="Album Art" />
                    <div className="mini-player-titles">
                        <div id="miniPlayerTitle" title={title}>{title}</div>
                        <div id="miniPlayerArtist" title={artist}>
                            {artist}
                            {currentSong.mlQueued && (
                                <span style={{ marginLeft: '6px', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px' }} title="Queued via Taste Profile">
                                    <SparklesIcon size={14} style={{ color: 'var(--mehfil-gold-primary)' }} />
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. CENTER: Playback Controls & Interactive Timeline */}
                <div className="mini-player-center">
                    <div className="mini-center-controls">
                        <Tooltip content="Previous">
                            <button id="miniPrevButton" onClick={prevSong} aria-label="Previous">
                                <SkipBack size={18} />
                            </button>
                        </Tooltip>
                        <Tooltip content={isPlaying ? "Pause" : "Play"}>
                            <button id="miniPlayButton" onClick={togglePlay} aria-label="Play/Pause">
                                {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
                            </button>
                        </Tooltip>
                        <Tooltip content="Next">
                            <button id="miniNextButton" onClick={nextSong} aria-label="Next">
                                <SkipForward size={18} />
                            </button>
                        </Tooltip>
                    </div>

                    <div className="mini-center-timeline">
                        <span className="time-display-current">{formatTime(currentTime)}</span>
                        <div className="mini-seekbar-wrapper">
                            <div className="mini-seekbar-filled" style={{ width: `${progress || 0}%` }}></div>
                            <input
                                type="range"
                                className="mini-center-slider"
                                min="0"
                                max="100"
                                value={progress || 0}
                                onChange={(e) => seek(Number(e.target.value))}
                                aria-label="Seek progress"
                            />
                        </div>
                        <span className="time-display-duration">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* 3. RIGHT: Actions, Volume & Expand */}
                <div className="mini-player-right">
                    {/* YouTube Video Mode Button */}
                    {isYtSong && (
                        <button
                            onClick={() => setVideoMode(!isVideoMode)}
                            title={isVideoMode ? 'Switch to Audio Mode' : 'Switch to Video Mode'}
                            className="video-toggle-btn"
                        >
                            <Tv size={14} /> <span>Video</span>
                        </button>
                    )}

                    <Tooltip content="Queue">
                        <button id="miniQueueBtn" onClick={onQueue} aria-label="Queue">
                            <ListMusic size={18} />
                        </button>
                    </Tooltip>

                    <div className="mini-volume-control">
                        <Tooltip content={isMuted ? "Unmute" : "Mute"}>
                            <button id="miniVolumeButton" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                                <VolumeToggleIcon size={18} isMuted={isMuted} />
                            </button>
                        </Tooltip>
                        <Tooltip content={`Volume: ${isMuted ? 0 : Math.round(volume * 100)}%`}>
                            <div className="volume-slider-wrapper">
                                <input
                                    type="range"
                                    id="miniVolumeSlider"
                                    min="0"
                                    max="100"
                                    value={isMuted ? 0 : volume * 100}
                                    style={{ '--volume-percent': `${isMuted ? 0 : Math.round(volume * 100)}%` }}
                                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                                    aria-label="Volume"
                                />
                            </div>
                        </Tooltip>
                    </div>

                    <Tooltip content="Expand (Fullscreen)">
                        <button id="expandPlayer" onClick={onExpand} aria-label="Expand player">
                            <ChevronUpIcon size={20} />
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
