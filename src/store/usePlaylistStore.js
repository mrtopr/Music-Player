import { create } from 'zustand';

export const usePlaylistStore = create((set, get) => ({
    playlists: (() => {
        try {
            return JSON.parse(localStorage.getItem('mehfilPlaylists') || '[]');
        } catch {
            return [];
        }
    })(),

    createPlaylist: (name) => {
        if (!name?.trim()) return;
        const newPlaylist = {
            id: Date.now().toString(),
            name: name.trim(),
            songs: [],
            createdAt: new Date().toISOString()
        };
        
        set(state => {
            const updated = [...state.playlists, newPlaylist];
            localStorage.setItem('mehfilPlaylists', JSON.stringify(updated));
            return { playlists: updated };
        });
        console.log('Playlist created:', name);
    },

    deletePlaylist: (id) => {
        set(state => {
            const updated = state.playlists.filter(p => p.id !== id);
            localStorage.setItem('mehfilPlaylists', JSON.stringify(updated));
            return { playlists: updated };
        });
    },

    addSongToPlaylist: (playlistId, song) => {
        if (!song) return;
        set(state => {
            const updated = state.playlists.map(p => {
                if (p.id === playlistId) {
                    const exists = p.songs.some(s => s.id === song.id);
                    if (exists) return p;
                    return { ...p, songs: [song, ...p.songs] };
                }
                return p;
            });
            localStorage.setItem('mehfilPlaylists', JSON.stringify(updated));
            return { playlists: updated };
        });
    },

    removeSongFromPlaylist: (playlistId, songId) => {
        set(state => {
            const updated = state.playlists.map(p => {
                if (p.id === playlistId) {
                    return { ...p, songs: p.songs.filter(s => s.id !== songId) };
                }
                return p;
            });
            localStorage.setItem('mehfilPlaylists', JSON.stringify(updated));
            return { playlists: updated };
        });
    }
}));
