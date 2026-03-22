import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, ListMusic, Music } from 'lucide-react';
import { usePlaylistStore } from '../../store/usePlaylistStore';

export default function AddToPlaylist({ song, className = "" }) {
    const [isOpen, setIsOpen] = useState(false);
    const { playlists, addSongToPlaylist } = usePlaylistStore();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAdd = (plId) => {
        addSongToPlaylist(plId, song);
        setIsOpen(false);
    };

    return (
        <div className={`add-to-playlist ${className}`} style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
                className="add-pl-trigger-btn" 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
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
                    width: '240px', zIndex: 1000, 
                    background: 'rgba(20,24,36,0.92)', backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', 
                    boxShadow: '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.1)',
                    padding: '8px', overflow: 'hidden',
                    animation: 'slideUpBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                    <div style={{ 
                        padding: '12px 14px', fontSize: '0.8rem', color: '#fff', 
                        fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px' 
                    }}>
                        <Music size={14} color="var(--accent-primary)" /> Add to Playlist
                    </div>
                    
                    <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                        {playlists.length === 0 ? (
                            <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                                <ListMusic size={32} strokeWidth={1} style={{ opacity: 0.2, marginBottom: '8px' }} />
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-disabled)' }}>No collections yet</p>
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
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '10px 14px', background: 'none', border: 'none',
                                            borderRadius: '16px', color: isAdded ? 'var(--accent-primary)' : 'rgba(255,255,255,0.8)',
                                            fontSize: '0.9rem', cursor: isAdded ? 'default' : 'pointer',
                                            textAlign: 'left', transition: 'all 0.2s', marginBottom: '4px',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ 
                                            width: '32px', height: '32px', borderRadius: '8px', 
                                            background: 'rgba(255,255,255,0.05)', display: 'flex', 
                                            alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                                        }}>
                                            <ListMusic size={16} />
                                        </div>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isAdded ? 600 : 400 }}>
                                            {pl.name}
                                        </span>
                                        {isAdded && <Check size={16} strokeWidth={3} />}
                                    </button>
                                );
                            })
                        )}
                    </div>
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
                    transform: translateX(4px);
                    color: #fff !important;
                }
                .pl-item.added {
                    background: rgba(var(--accent-primary-rgb), 0.05) !important;
                }
                @keyframes slideUpBounce {
                    from { opacity: 0; transform: translateY(15px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}
