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
import { initQueue } from './ui/queue.js';
import { initContextMenu, showContextMenu } from './ui/contextMenu.js';
import { initSearch } from './ui/search.js';
import { initLibrary } from './ui/library.js';
import { initLyrics } from './features/lyrics.js';
import { showAlbumDetail, showArtistDetail, showPlaylistDetail } from './ui/pages/details.js';
import { showNotification } from './ui/notifications.js';
import { replaceBootstrapIcons, setIcon, Icons } from './ui/icons.js';

// Features
import { loadUserData } from './features/favorites.js';
import { initMoodFilter } from './features/mood.js';
import { initLogin } from './features/login.js';
import { getRecentlyPlayed, clearLegacyHistory } from './utils/history.js';
import { getRecommendations } from './utils/recommendations.js';
import { loadPlaylists } from './features/playlists.js';
import { initPremiumModals } from './features/premium.js';

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
    clearLegacyHistory(); // Clean up old storage if it exists

    // 3. Login modal
    initLogin();

    // 4. Navigation
    initNavigation();

    // 5. Player UI
    initMiniPlayer();
    initFullscreen();
    initQueue();
    initContextMenu();
    initSearch();
    initLibrary();
    initLyrics();
    initPremiumModals();

    // 6. Mood filters
    initMoodFilter();

    // 7. Icon migration (replace remaining bi-* in HTML)
    replaceBootstrapIcons();

    // 8. Wire play/pause buttons
    _wirePlayerControls();

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

async function _loadHomeData() {
    try {
        // Recently Played
        const history = getRecentlyPlayed(10);
        if (history && history.length > 0) {
            const histSection = document.getElementById('recently-played-section');
            if (histSection) histSection.style.display = 'block';
            _renderHomeSection('#recently-played-container', history, 'song-card');
        }

        // Made For You (Recommendations)
        const recommendations = await getRecommendations(12);
        if (recommendations && recommendations.length > 0) {
            const recSection = document.getElementById('recommendations-section');
            if (recSection) {
                recSection.style.display = 'block';
                _renderHomeSection('#recommendations-container', recommendations, 'song-card');
            }
        }

        const [trending, newReleases, artists] = await Promise.allSettled([
            apiFetch(ENDPOINTS.trendingSongs),
            apiFetch(ENDPOINTS.newReleasesAlbums),
            apiFetch(ENDPOINTS.popularArtists),
        ]);

        if (trending.status === 'fulfilled') {
            const songs = trending.value?.songs || [];
            state.allTrendingSongs = songs;
            state.filteredTrendingSongs = songs;
            state.songs = songs;
            window.songs = songs;
            _renderHomeSection('#trending-songs-container', songs, 'song-card');
        }

        if (newReleases.status === 'fulfilled') {
            const albums = newReleases.value?.albums || [];
            state.allNewReleases = albums;
            state.filteredNewReleases = albums;
            _renderHomeSection('#new-releases-container', albums, 'song-card');
        }

        if (artists.status === 'fulfilled') {
            const artistList = artists.value?.data?.results || [];
            _renderHomeSection('#popular-artists-container', artistList, 'artist-card');
        }

    } catch (err) {
        console.error('Home data error:', err);
        showNotification('Failed to load songs — is the API server running?', 'error');
    }
}

/**
 * Render a basic media card list into a container selector
 */
function _renderHomeSection(selector, items, cardClass = 'song-card') {
    const container = document.querySelector(selector);
    if (!container || !items.length) return;

    container.innerHTML = items.slice(0, 12).map((item, i) => {
        const img = getImageUrl(item.image);
        const title = item.name || item.title || 'Unknown';
        const subtitle = item.primaryArtists ? item.primaryArtists : (item.role || 'Artist');

        return `
      <div class="${cardClass}" data-index="${i}">
        <div class="song-card-img">
          <img src="${img}" alt="${title}" loading="lazy" onerror="this.src='favicon.ico'">
          ${cardClass === 'song-card' ? `
          <button class="play-btn" title="Play">
            <i data-lucide="play" class="lucide-icon"></i>
          </button>
          <button class="more-btn" title="More options">
            <i data-lucide="more-vertical" class="lucide-icon"></i>
          </button>` : ''}
        </div>
        <div class="song-card-info">
          <h3 class="song-title" title="${title}">${title}</h3>
          <p class="song-artist" title="${subtitle}">${subtitle}</p>
        </div>
      </div>
    `.trim();
    }).join('');

    // Attach event listeners safely using closures
    container.querySelectorAll(`.${cardClass}`).forEach((card, i) => {
        const item = items[i];

        card.addEventListener('click', () => {
            if (cardClass === 'song-card') {
                state.songs = items;
                state.currentSongIndex = i;
                loadSong(item);
            } else if (cardClass === 'artist-card') {
                if (window.showArtistDetail) window.showArtistDetail(item.id);
            } else if (cardClass === 'album-card') {
                if (window.showAlbumDetail) window.showAlbumDetail(item.id);
            } else if (cardClass === 'playlist-card') {
                if (window.showPlaylistDetail) window.showPlaylistDetail(item.id);
            }
        });

        const playBtn = card.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                state.songs = items;
                state.currentSongIndex = i;
                loadSong(item);
            });
        }

        const moreBtn = card.querySelector('.more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showContextMenu(e, item);
            });
        }
    });

    if (window.lucide) {
        window.lucide.createIcons({ root: container });
    } else {
        replaceBootstrapIcons(container);
    }
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
window.showArtistDetail = showArtistDetail;
window.showAlbumDetail = showAlbumDetail;
window.showPlaylistDetail = showPlaylistDetail;

// ─── Async init fix for top-level await ──────────────────
// We use a self-invoking async inside DOMContentLoaded via Promise chaining
// to avoid top-level await issues in some Vite setups
document.addEventListener('DOMContentLoaded', async () => {
    // Already handled above — this is a no-op guard
});
