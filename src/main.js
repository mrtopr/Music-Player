/**
 * Mehfil Music Player — Vite Entry Point
 * Replaces: js/audio-fix.js, index.js, js/player.js,
 *           js/mini-player-enhancements.js, js/fullscreen-player-enhancements.js,
 *           js/audio-visualizer.js, js/scroll-progress.js
 */

// CSS — loaded via Vite
import './styles/main.css';

// Core modules
import { initAudioEngine, togglePlay, playNext, playPrev, toggleShuffle, cycleRepeat, setVolume, loadSong } from './player/engine.js';
import { initNavigation } from './ui/navigation.js';
import { initMiniPlayer, updateMiniPlayer } from './ui/miniPlayer.js';
import { initFullscreen, updateFullscreenPlayer } from './ui/fullscreen.js';
import { showNotification } from './ui/notifications.js';
import { replaceBootstrapIcons, setIcon, Icons } from './ui/icons.js';

// Features
import { loadUserData } from './features/favorites.js';
import { initMoodFilter } from './features/mood.js';
import { initLogin } from './features/login.js';
import { loadHistory } from './features/history.js';
import { loadPlaylists } from './features/playlists.js';

// State
import { state } from './player/state.js';

// API
import { apiFetch, ENDPOINTS, getImageUrl, getAudioUrl } from './api/client.js';

// ─── Init ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // 1. Audio engine (includes audio-init-fix.js logic)
    initAudioEngine();

    // 2. User data
    loadUserData();
    loadPlaylists();
    loadHistory();

    // 3. Login modal
    initLogin();

    // 4. Navigation
    initNavigation();

    // 5. Player UI
    initMiniPlayer();
    initFullscreen();

    // 6. Mood filters
    initMoodFilter();

    // 7. Icon migration (replace remaining bi-* in HTML)
    replaceBootstrapIcons();

    // 8. Wire play/pause buttons
    _wirePlayerControls();

    // 9. Wire search
    _wireSearch();

    // 10. Load home page data
    _loadHomeData();

    console.log('✅ Mehfil initialized');
});

// ─── Player Controls Wiring ──────────────────────────────

function _wirePlayerControls() {
    // Mini player play button
    const miniPlay = document.getElementById('miniPlayButton');
    if (miniPlay) miniPlay.addEventListener('click', togglePlay);

    // Fullscreen play button
    const fsPlay = document.getElementById('fullscreenPlay');
    if (fsPlay) fsPlay.addEventListener('click', togglePlay);

    // Mobile play button
    const mobilePlay = document.getElementById('mobilePlayBtn');
    if (mobilePlay) mobilePlay.addEventListener('click', togglePlay);

    // Next / Prev
    document.querySelectorAll('[data-action="next"]').forEach(btn => btn.addEventListener('click', playNext));
    document.querySelectorAll('[data-action="prev"]').forEach(btn => btn.addEventListener('click', playPrev));

    // Shuffle
    const shuffleBtn = document.getElementById('shuffleBtn') || document.querySelector('[data-action="shuffle"]');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            const on = toggleShuffle();
            shuffleBtn.classList.toggle('active', on);
        });
    }

    // Repeat
    const repeatBtn = document.getElementById('repeatBtn') || document.querySelector('[data-action="repeat"]');
    if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
            const mode = cycleRepeat();
            repeatBtn.dataset.repeatMode = mode;
            repeatBtn.classList.toggle('active', mode !== 'off');
        });
    }
}

// ─── Search ───────────────────────────────────────────────

function _wireSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout = null;

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const q = searchInput.value.trim();
            if (q.length < 2) return;
            searchTimeout = setTimeout(() => _runSearch(q), 400);
        });
    }
}

async function _runSearch(query) {
    try {
        const data = await apiFetch(ENDPOINTS.searchSongs + '&query=' + encodeURIComponent(query));
        const songs = data?.data?.results || [];
        _renderSearchResults(songs);
    } catch (err) {
        console.error('Search error:', err);
    }
}

function _renderSearchResults(songs) {
    // Delegate to cards module (will be implemented in Phase 2/4)
    window._searchResults = songs;
    console.log('Search results:', songs.length, 'songs');
}

// ─── Home Data ────────────────────────────────────────────

async function _loadHomeData() {
    try {
        const [trending, newReleases, artists] = await Promise.allSettled([
            apiFetch(ENDPOINTS.trendingSongs),
            apiFetch(ENDPOINTS.newReleasesAlbums),
            apiFetch(ENDPOINTS.popularArtists),
        ]);

        if (trending.status === 'fulfilled') {
            const songs = trending.value?.data?.results || [];
            state.allTrendingSongs = songs;
            state.filteredTrendingSongs = songs;
            state.songs = songs;
            window.songs = songs;
            _renderHomeSection('#trending-songs-container', songs);
        }

        if (newReleases.status === 'fulfilled') {
            const songs = newReleases.value?.data?.results || [];
            state.allNewReleases = songs;
            state.filteredNewReleases = songs;
            _renderHomeSection('#new-releases-container', songs);
        }

    } catch (err) {
        console.error('Home data error:', err);
        showNotification('Failed to load songs — is the API server running?', 'error');
    }
}

/**
 * Render a basic song card list into a container selector
 * Full card design will be replaced in Phase 2
 */
function _renderHomeSection(selector, songs) {
    const container = document.querySelector(selector);
    if (!container || !songs.length) return;

    container.innerHTML = songs.slice(0, 12).map((song, i) => {
        const img = getImageUrl(song.image);
        const title = song.name || song.title || 'Unknown';
        const artist = song.primaryArtists || song.artist || 'Unknown Artist';
        return `
      <div class="song-card" data-song-index="${i}" onclick="window._playSongByIndex(${i})">
        <div class="song-card-img">
          <img src="${img}" alt="${title}" loading="lazy" onerror="this.src='favicon.ico'">
          <button class="card-play-btn" onclick="event.stopPropagation(); window._playSongByIndex(${i})">
            <i class="bi bi-play-fill"></i>
          </button>
        </div>
        <div class="song-card-info">
          <p class="song-title">${title}</p>
          <p class="song-artist">${artist}</p>
        </div>
      </div>
    `.trim();
    }).join('');

    replaceBootstrapIcons(container);
}

// ─── Global play bridge ───────────────────────────────────

window._playSongByIndex = async (index) => {
    const song = state.songs[index];
    if (!song) return;
    state.currentSongIndex = index;

    // Fetch full song details to get download URL
    try {
        const id = song.id || song._id;
        const detail = await apiFetch(ENDPOINTS.songDetails + id);
        const fullSong = detail?.data?.[0] || song;
        await loadSong(fullSong);
    } catch {
        await loadSong(song);
    }
};

window.loadSong = loadSong;

// ─── Async init fix for top-level await ──────────────────
// We use a self-invoking async inside DOMContentLoaded via Promise chaining
// to avoid top-level await issues in some Vite setups
document.addEventListener('DOMContentLoaded', async () => {
    // Already handled above — this is a no-op guard
});
