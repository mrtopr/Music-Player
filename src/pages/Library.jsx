import React, { useState, useEffect } from 'react';
import { Heart, ListMusic, Plus, Play, Pause, Music, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getImageUrl } from '../api/client.js';
import { usePlayerStore } from '../store/usePlayerStore';
import { usePlaylistStore } from '../store/usePlaylistStore';
import AddToPlaylist from '../components/common/AddToPlaylist';

function SongRow({ song, index, onPlay, isCurrent, isPlaying }) {
    return (
        <div
            onClick={() => onPlay(song)}
            style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                background: isCurrent ? 'rgba(212,160,83,0.08)' : 'transparent',
                borderLeft: isCurrent ? '3px solid var(--accent-primary)' : '3px solid transparent',
            }}
            onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
        >
            <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                <img src={getImageUrl(song.image) || '/music.png'} alt={song.title} style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' }} loading="lazy" />
                {isCurrent && isPlaying && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2px', paddingBottom: '10px', borderRadius: '6px' }}>
                        {[1, 2, 3].map(i => <div key={i} style={{ width: '3px', background: 'var(--accent-primary)', borderRadius: '2px', animation: `eqBar 0.${4 + i}s ease-in-out infinite alternate` }} />)}
                    </div>
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title?.replace(/&quot;/g, '"')}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.subtitle || song.primaryArtists}
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onPlay(song); }} style={{ background: 'none', border: 'none', color: isCurrent ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                {isCurrent && isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <AddToPlaylist song={song} />
        </div>
    );
}

function LikedSongsSection() {
    const playSong = usePlayerStore(s => s.playSong);
    const playQueue = usePlayerStore(s => s.playQueue);
    const currentSong = usePlayerStore(s => s.currentSong);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const likedSongs = usePlayerStore(s => s.likedSongs);
    const toggleLike = usePlayerStore(s => s.toggleLike);

    const removeSong = (id) => {
        const songToUnlike = likedSongs.find(s => s.id === id);
        if (songToUnlike) toggleLike(songToUnlike);
    };

    if (likedSongs.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Heart size={48} strokeWidth={1} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                <h3>No Liked Songs Yet</h3>
                <p style={{ fontSize: '0.9rem' }}>Like songs from the fullscreen player to build your collection!</p>
            </div>
        );
    }

    return (
        <div>
            {/* Hero banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(80,50,150,0.6), rgba(40,20,100,0.6))',
                padding: 'var(--space-xl, 1.5rem)', borderRadius: '16px',
                marginBottom: 'var(--space-xl, 1.5rem)', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>♥ Liked Songs</h2>
                    <p style={{ margin: '0.3rem 0 0', color: 'rgba(255,255,255,0.7)' }}>{likedSongs.length} songs</p>
                </div>
                <button className="primary-cta-btn" onClick={() => playQueue(likedSongs, 0)} style={{ borderRadius: 'var(--radius-pill, 50px)', padding: '0.7rem 1.5rem' }}>
                    <Play size={18} /> Play All
                </button>
            </div>

            {/* Song List */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', overflow: 'hidden' }}>
                {likedSongs.map((song, i) => (
                    <SongRow key={song.id} song={song} index={i} onPlay={playSong} isCurrent={currentSong?.id === song.id} isPlaying={isPlaying} />
                ))}
            </div>
        </div>
    );
}

function PlaylistsSection() {
    const { playlists, createPlaylist, deletePlaylist } = usePlaylistStore();
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const navigate = useNavigate();
    
    const handleCreate = () => {
        if (!newName.trim()) return;
        createPlaylist(newName.trim());
        setNewName('');
        setShowModal(false);
    };

    return (
        <div style={{ marginTop: 'var(--space-2xl, 2rem)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg, 1.25rem)' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Music size={22} color="var(--accent-primary)" /> My Playlists
                </h2>
                <button className="secondary-cta-btn" onClick={() => setShowModal(true)} style={{ borderRadius: 'var(--radius-pill, 50px)', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    <Plus size={16} /> New Playlist
                </button>
            </div>

            {/* Premium Create Modal */}
            {showModal && (
                <div style={{ 
                    position: 'fixed', inset: 0, zIndex: 10000, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{ 
                        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '32px',
                        width: 'min(450px, 90%)', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                        animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}>
                        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.8rem' }}>
                            <ListMusic size={28} color="var(--accent-primary)" /> Create Playlist
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Give your collection a memorable name.</p>
                        
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="e.g. Chill Vibes"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            style={{ 
                                width: '100%', padding: '1rem 1.2rem', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff',
                                fontSize: '1.1rem', marginBottom: '2rem', outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => { setShowModal(false); setNewName(''); }} style={{ 
                                flex: 1, padding: '1rem', borderRadius: '16px', 
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600
                            }}>Cancel</button>
                            <button onClick={handleCreate} disabled={!newName.trim()} style={{ 
                                flex: 1, padding: '1rem', borderRadius: '16px', 
                                background: 'var(--accent-primary)', border: 'none',
                                color: '#000', cursor: 'pointer', fontWeight: 700,
                                opacity: !newName.trim() ? 0.5 : 1
                            }}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {playlists.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <Music size={48} strokeWidth={1} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                    <h3>No Playlists Yet</h3>
                    <p style={{ fontSize: '0.9rem' }}>Create your first playlist to organize your music!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {playlists.map(pl => (
                        <div key={pl.id} className="card playlist-card" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/playlist/${pl.id}`)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--accent-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Music size={20} color="var(--accent-primary)" />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{pl.songs.length} songs</p>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete this playlist?')) deletePlaylist(pl.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5 }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Library() {
    const location = useLocation();
    const isFavorites = location.pathname.includes('/favorites');
    const isPlaylists = location.pathname.includes('/playlists');

    return (
        <div style={{ display: 'block', paddingBottom: '100px' }}>
            <div style={{ padding: 'var(--space-xl, 1.5rem) 1rem' }}>
                <h1 style={{ fontSize: 'var(--text-3xl, 1.875rem)', marginBottom: 'var(--space-2xl, 2rem)' }}>
                    {isFavorites ? 'Your Favorites' : isPlaylists ? 'Your Playlists' : 'Your Library'}
                </h1>

                {isFavorites && <LikedSongsSection />}
                {isPlaylists && <PlaylistsSection />}

                {/* Fallback if somehow just /library */}
                {!isFavorites && !isPlaylists && (
                    <>
                        <LikedSongsSection />
                        <PlaylistsSection />
                    </>
                )}
            </div>
        </div>
    );
}
