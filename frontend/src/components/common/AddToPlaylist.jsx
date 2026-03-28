import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, ListMusic, Music, ListPlus, FolderPlus, X } from 'lucide-react';
import { usePlaylistStore } from '../../store/usePlaylistStore';
import { usePlayerStore } from '../../store/usePlayerStore';

export default function AddToPlaylist({ song, className = "" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const newPlaylistInputRef = useRef(null);

    const { playlists, addSongToPlaylist, createPlaylist } = usePlaylistStore();
    const addToQueue = usePlayerStore(state => state.addToQueue);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsCreating(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isCreating && newPlaylistInputRef.current) {
            newPlaylistInputRef.current.focus();
        }
    }, [isCreating]);

    const handleAdd = (plId) => {
        addSongToPlaylist(plId, song);
        setIsOpen(false);
    };

    const handleAddToQueue = (e) => {
        e.stopPropagation();
        addToQueue(song);
        setIsOpen(false);
    };

    const handleCreatePlaylist = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (newPlaylistName.trim()) {
            createPlaylist(newPlaylistName.trim());
            setNewPlaylistName('');
            setIsCreating(false);
        }
    };

    return (
        <div className={`add-to-playlist ${className}`} style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
                className="add-pl-trigger-btn" 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); setIsCreating(false); }}
                title="Add to Playlist"
                style={{ 
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', 
                    color: 'var(--text-muted)', cursor: 'pointer', 
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <Plus size={18} />
            </button>

            {isOpen && (
                <div className="playlist-dropdown-glass" style={{
                    position: 'absolute', bottom: '110%', right: '0', 
                    width: '210px', zIndex: 1000, 
                    background: 'rgba(20,24,36,0.92)', backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', 
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)',
                    padding: '6px', overflow: 'hidden',
                    animation: 'slideUpBounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                    <button
                        onClick={handleAddToQueue}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 10px', background: 'none', border: 'none',
                            borderRadius: '10px', color: 'rgba(255,255,255,0.85)',
                            fontSize: '0.8rem', cursor: 'pointer',
                            textAlign: 'left', transition: 'all 0.2s', marginBottom: '4px',
                        }}
                        className="pl-item"
                    >
                        <ListPlus size={16} color="var(--accent-primary)" style={{ opacity: 0.9 }} />
                        <span style={{ flex: 1, fontWeight: 500 }}>Add to Queue</span>
                    </button>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '2px 6px 4px 6px' }}></div>

                    <div style={{ padding: '4px 10px 4px 10px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                        Add to Playlist
                    </div>

                    <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '2px' }} className="custom-scrollbar">
                        {playlists.length === 0 ? (
                            <div style={{ padding: '16px 8px', textAlign: 'center' }}>
                                <ListMusic size={24} strokeWidth={1} style={{ opacity: 0.2, marginBottom: '6px' }} />
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-disabled)' }}>No collections</p>
                            </div>
                        ) : (
                            playlists.map(pl => {
                                const isAdded = pl.songs.some(s => s.id === song.id);
                                return (
                                    <button
                                        key={pl.id}
                                        onClick={(e) => { e.stopPropagation(); if (!isAdded) handleAdd(pl.id); }}
                                        className={`pl-item ${isAdded ? 'added' : ''}`}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '8px 10px', background: 'none', border: 'none',
                                            borderRadius: '10px', color: isAdded ? 'var(--accent-primary)' : 'rgba(255,255,255,0.8)',
                                            fontSize: '0.8rem', cursor: isAdded ? 'default' : 'pointer',
                                            textAlign: 'left', transition: 'all 0.2s', marginBottom: '2px',
                                        }}
                                    >
                                        <ListMusic size={14} style={{ opacity: isAdded ? 1 : 0.6 }} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isAdded ? 600 : 400 }}>
                                            {pl.name}
                                        </span>
                                        {isAdded && <Check size={14} strokeWidth={3} />}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 6px 4px 6px' }}></div>

                    {isCreating ? (
                        <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px', margin: '4px 0' }}>
                            <input
                                ref={newPlaylistInputRef}
                                type="text"
                                placeholder="Name..."
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!newPlaylistName.trim()}
                                style={{
                                    background: newPlaylistName.trim() ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                    border: 'none', color: newPlaylistName.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                                    width: '24px', height: '24px', borderRadius: '6px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', cursor: newPlaylistName.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Check size={14} strokeWidth={3} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsCreating(false); setNewPlaylistName(''); }}
                                style={{
                                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    padding: '2px'
                                }}
                            >
                                <X size={14} />
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsCreating(true); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 10px', background: 'none', border: 'none',
                                borderRadius: '10px', color: 'var(--accent-primary)',
                                fontSize: '0.8rem', cursor: 'pointer',
                                textAlign: 'left', transition: 'all 0.2s',
                            }}
                            className="pl-item"
                        >
                            <FolderPlus size={16} />
                            <span style={{ flex: 1, fontWeight: 500 }}>Create New Playlist</span>
                        </button>
                    )}

                </div>
            )}
            
            <style>{`
                .add-pl-trigger-btn:hover {
                    background: var(--accent-primary-soft) !important;
                    border-color: rgba(var(--accent-primary-rgb), 0.3) !important;
                    color: var(--accent-primary) !important;
                    transform: scale(1.1);
                }
                .pl-item:not(.added):hover {
                    background: rgba(255,255,255,0.08) !important;
                    color: #fff !important;
                }
                .pl-item.added {
                    background: rgba(var(--accent-primary-rgb), 0.05) !important;
                }
                @keyframes slideUpBounce {
                    from { opacity: 0; transform: translateY(10px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
            `}</style>
        </div>
    );
}
