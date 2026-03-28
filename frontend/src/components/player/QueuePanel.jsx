import React from 'react';
import { X, Play, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getImageUrl } from '../../api/client.js';
import { decodeEntities, getSafeImage } from '../../utils/helpers.js';

export default function QueuePanel({ visible, onClose }) {
    const { queue, queueIndex, currentSong, jumpInQueue, playSong } = usePlayerStore();

    if (!visible) return null;

    const upNext = queue.slice(queueIndex + 1);

    return (
        <div className="queue-panel" style={{ position: 'fixed', top: 0, right: 0, width: '350px', maxWidth: '90vw', height: '100vh', background: 'var(--bg-card, #1a1a1a)', borderLeft: '1px solid var(--border-medium, rgba(255,255,255,0.1))', zIndex: 5000, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)', transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease' }}>

            {/* Header */}
            <div className="queue-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: 0 }}>Queue</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </div>

            {/* Now Playing */}
            {currentSong && (
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-primary)', marginBottom: '0.8rem' }}>Now Playing</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <img src={getSafeImage(currentSong.image, getImageUrl)} alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--accent-primary)' }}>
                                {decodeEntities(currentSong.title || currentSong.name)}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {decodeEntities(currentSong.primaryArtists || currentSong.subtitle || 'Various Artists')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Up Next */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', margin: 0 }}>
                        Next In Queue ({upNext.length})
                    </h4>
                </div>

                {upNext.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <p>Queue is empty</p>
                        <p style={{ fontSize: '0.85rem' }}>Play more songs to fill the queue</p>
                    </div>
                ) : (
                    upNext.map((song, i) => (
                        <div
                            key={`${song.id}-${i}`}
                            onClick={() => {
                                if (jumpInQueue) {
                                    jumpInQueue(queueIndex + 1 + i);
                                } else {
                                    playSong(song, true, true);
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0',
                                cursor: 'pointer', borderRadius: '6px', transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <span style={{ color: 'var(--text-muted)', width: '24px', textAlign: 'center', fontSize: '0.8rem' }}>{i + 1}</span>
                            <img src={getSafeImage(song.image, getImageUrl)} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} loading="lazy" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {decodeEntities(song.title || song.name)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {decodeEntities(song.primaryArtists || song.subtitle || 'Various Artists')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
