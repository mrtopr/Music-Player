import { apiFetch, ENDPOINTS, getImageUrl } from '../../api/client.js';
import { loadSong, formatTime, clearQueue, addToQueue } from '../../player/engine.js';
import { state } from '../../player/state.js';
import { showContextMenu } from '../contextMenu.js';
import { showNotification } from '../notifications.js';

function showDetailPage() {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    document.getElementById('detailPage').style.display = 'block';
    document.getElementById('detailPage').scrollTop = 0;
}

function renderHeader(title, subtitle, imageUrl, isArtist = false) {
    const header = document.getElementById('detailHeader');
    header.innerHTML = `
        <img src="${getImageUrl(imageUrl)}" alt="${title}" class="${isArtist ? 'is-artist' : ''}" onerror="this.src='favicon.ico'">
        <div class="detail-info">
            <p>${subtitle}</p>
            <h1>${title}</h1>
        </div>
    `;
}

function renderTrackList(songs) {
    const body = document.getElementById('detailBody');
    if (!songs || songs.length === 0) {
        body.innerHTML = '<p class="text-muted">No tracks found.</p>';
        return;
    }

    const html = songs.map((song, i) => {
        const title = song.name || song.title || 'Unknown';
        const artist = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || '-';
        const duration = song.duration ? formatTime(song.duration) : '';

        return `
            <div class="track-list-item" data-index="${i}">
                <div class="track-num">${i + 1}</div>
                <div class="track-info">
                    <div class="track-title">${title}</div>
                    <div class="track-artist">${artist}</div>
                </div>
                <div class="track-time">${duration}</div>
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

    if (window.lucide) window.lucide.createIcons({ root: body });

    // Wire Play All button
    const playAllBtn = document.getElementById('detailPlayAll');
    playAllBtn.onclick = () => {
        state.songs = songs;
        state.currentSongIndex = 0;
        loadSong(songs[0]);
    };
}

export async function showAlbumDetail(id) {
    try {
        const res = await apiFetch(ENDPOINTS.albumDetails + id);
        if (res.success && res.data) {
            showDetailPage();
            const data = res.data;
            renderHeader(data.name || data.title, `${data.year || ''} • ${data.songCount || 0} Songs`, data.image);
            renderTrackList(data.songs);
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to load album', 'error');
    }
}

export async function showPlaylistDetail(id) {
    try {
        const res = await apiFetch(ENDPOINTS.playlistDetails + id);
        if (res.success && res.data) {
            showDetailPage();
            const data = res.data;
            const songCount = data.songCount || (data.songs ? data.songs.length : 0);
            renderHeader(data.name || data.title, `Playlist • ${songCount} Songs`, data.image);
            renderTrackList(data.songs);
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to load playlist', 'error');
    }
}

export async function showArtistDetail(id, artistObj = null) {
    try {
        const res = await apiFetch(ENDPOINTS.artistDetails + id);
        if (res.success && res.data) {
            showDetailPage();
            const data = res.data;

            // JioSaavn artist details usually have topSongs
            let songs = data.topSongs || [];

            // Sometime topSongs is empty and we have to rely on search
            if (songs.length === 0 && artistObj && artistObj.name) {
                const sRes = await apiFetch(ENDPOINTS.searchSongs, { query: artistObj.name });
                if (sRes.success && sRes.data?.results) songs = sRes.data.results;
            }

            renderHeader(data.name || data.title, `Artist • ${data.followerCount ? data.followerCount + ' Followers' : ''}`, data.image, true);

            document.getElementById('detailBody').innerHTML = `
                <h2 style="margin-bottom: 1rem; font-size: 1.25rem;">Popular Songs</h2>
                <div id="artistSongsContainer"></div>
            `;

            // Divert renderTrackList to the inner container
            const originalBody = document.getElementById('detailBody');
            const innerContainer = document.getElementById('artistSongsContainer');

            // Temporarily replace detailBody ID to trick renderTrackList into rendering inside the inner container
            originalBody.id = 'tempOriginalBody';
            innerContainer.id = 'detailBody';

            renderTrackList(songs);

            // Restore IDs
            innerContainer.id = 'artistSongsContainer';
            originalBody.id = 'detailBody';
        }
    } catch (err) {
        console.error(err);
        showNotification('Failed to load artist', 'error');
    }
}
