import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronUp, ListMusic } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getImageUrl } from '../../api/client.js';
import { formatTime, decodeEntities, getSafeImage } from '../../utils/helpers.js';

export default function MiniPlayer({ onExpand, onQueue }) {
    const { currentSong, isPlaying, progress, currentTime, duration, volume, isMuted,
        togglePlay, nextSong, prevSong, seek, setVolume, toggleMute } = usePlayerStore();

    if (!currentSong) return null;

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
                        <div id="miniPlayerArtist">{artist}</div>
                    </div>
                </div>

                {/* Controls */}
                <div className="mini-player-controls">
                    <button id="miniPrevButton" onClick={prevSong} title="Previous">
                        <SkipBack size={16} />
                    </button>
                    <button id="miniPlayButton" onClick={togglePlay} title="Play/Pause">
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button id="miniNextButton" onClick={nextSong} title="Next">
                        <SkipForward size={16} />
                    </button>

                    <button id="miniQueueBtn" onClick={onQueue} title="Queue" style={{ marginLeft: '4px' }}>
                        <ListMusic size={16} />
                    </button>

                    <div className="mini-volume-control">
                        <button id="miniVolumeButton" onClick={toggleMute} title="Volume">
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <input
                            type="range"
                            id="miniVolumeSlider"
                            min="0"
                            max="100"
                            value={isMuted ? 0 : volume * 100}
                            onChange={(e) => setVolume(Number(e.target.value) / 100)}
                            title="Volume"
                        />
                    </div>

                    <button id="expandPlayer" onClick={onExpand} title="Expand" style={{ marginLeft: '4px' }}>
                        <ChevronUp size={16} />
                    </button>
                </div>

                {/* Time & Branding */}
                <div className="mini-player-expand">
                    <div className="time-display">
                        <span id="currentTime">{formatTime(currentTime)}</span>
                        <span id="duration">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="mini-player-branding">
                    <span className="brand-text">Mehfil</span>
                    <span className="brand-tagline">दिल से सुनो</span>
                </div>
            </div>
        </div>
    );
}
