import { loadSong, formatTime } from '../player/engine.js';
import { state } from '../player/state.js';
import { showContextMenu } from './contextMenu.js';
import { getImageUrl } from '../api/client.js';
import { observeImage } from '../utils/lazyLoad.js';

export function initLibrary() {
    const libraryTab = document.querySelector('.tab-item[onclick="showLibraryPage()"]');
    const sidebarLibraryBtn = document.querySelector('[onclick="showLibraryPage()"]');
    const hero = document.getElementById('likedSongsHero');
    const playBtn = document.getElementById('playLikedBtn');

    // Make sure we expose global window functions for HTML onclick attributes
    window.showLibraryPage = () => {
        document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
        document.getElementById('playlistsPage').style.display = 'block';
        updateHeroCount();
    };

    if (hero) {
        hero.addEventListener('click', showLikedSongsPage);
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            const songs = state.likedSongs;
            if (songs.length > 0) {
                state.songs = songs;
                state.currentSongIndex = 0;
                loadSong(songs[0]);
            }
        });
    }
}

function updateHeroCount() {
    const countEl = document.getElementById('likedSongsCount');
    if (countEl) {
        const c = state.likedSongs.length;
        countEl.innerText = `${c} song${c !== 1 ? 's' : ''}`;
    }
}

function showLikedSongsPage() {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    document.getElementById('likedSongsPage').style.display = 'block';

    renderLikedSongsList();
}

function renderLikedSongsList() {
    const body = document.getElementById('likedSongsBody');
    const songs = state.likedSongs || [];

    if (songs.length === 0) {
        body.innerHTML = '<p class="text-muted text-center" style="margin-top: 2rem;">No liked songs yet. Go find some music!</p>';
        return;
    }

    const html = songs.map((song, i) => {
        const img = getImageUrl(song.image) || 'favicon.ico';
        const title = song.name || song.title || 'Unknown';
        const artist = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || '-';
        const duration = song.duration ? formatTime(song.duration) : '';

        return `
            <div class="track-list-item" data-index="${i}" style="gap: var(--space-md);">
                <div class="track-num">${i + 1}</div>
                <img data-src="${img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="lazy-load" style="width: 40px; height: 40px; border-radius: var(--radius-sm); object-fit: cover;">
                <div class="track-info">
                    <div class="track-title">${title}</div>
                    <div class="track-artist">${artist}</div>
                </div>
                <div class="track-time" style="margin-right: var(--space-md);">${duration}</div>
                <button class="more-btn" style="position:static; opacity:1; background:none; color:var(--text-secondary); width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
                    <i data-lucide="more-horizontal" class="lucide-icon"></i>
                </button>
            </div>
        `;
    }).join('');

    body.innerHTML = `<div class="track-list">${html}</div>`;

    // Attach listeners
    body.querySelectorAll('.track-list-item').forEach((row, i) => {
        const song = songs[i];

        row.addEventListener('click', (e) => {
            if (e.target.closest('.more-btn')) return;
            state.songs = songs;
            state.currentSongIndex = i;
            loadSong(song);
        });

        const moreBtn = row.querySelector('.more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showContextMenu(e, song);
            });
        }
    });

    body.querySelectorAll('img.lazy-load').forEach(observeImage);

    if (window.lucide) window.lucide.createIcons({ root: body });
}
