import { apiFetch, ENDPOINTS, getImageUrl } from '../api/client.js';
import { loadSong } from '../player/engine.js';
import { state } from '../player/state.js';
import { showContextMenu } from './contextMenu.js';
import { showNotification } from './notifications.js';
import { observeImage } from '../utils/lazyLoad.js';

let currentQuery = '';
let currentTab = 'all';
let searchTimeout = null;

const searchState = {
    songs: [],
    albums: [],
    artists: [],
    playlists: []
};

// UI Elements
let searchInput, searchTabs, clearSearchBtn, searchResultsContainer;

export function initSearch() {
    searchInput = document.getElementById('searchInput');
    searchTabs = document.getElementById('searchTabs');
    clearSearchBtn = document.getElementById('clearSearchBtn');
    searchResultsContainer = document.getElementById('searchResults') || createTempContainer();

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const q = searchInput.value.trim();

            if (q.length > 0) {
                clearSearchBtn.style.display = 'block';
            } else {
                clearSearchBtn.style.display = 'none';
                clearResults();
                return;
            }

            if (q.length < 2) return;
            searchTimeout = setTimeout(() => executeSearch(q), 500);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            clearResults();
            searchInput.focus();
        });
    }

    // Tab bindings
    document.querySelectorAll('.search-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.dataset.tab;
            renderResults();
        });
    });
}

function createTempContainer() {
    const page = document.getElementById('searchPage');
    const container = document.createElement('div');
    container.id = 'searchResults';
    container.className = 'search-results-grid';
    container.style.marginTop = 'var(--space-md)';
    page.appendChild(container);
    return container;
}

function clearResults() {
    currentQuery = '';
    searchState.songs = [];
    searchState.albums = [];
    searchState.artists = [];
    searchState.playlists = [];
    searchTabs.style.display = 'none';
    searchResultsContainer.innerHTML = '';
}

async function executeSearch(query) {
    if (currentQuery === query) return;
    currentQuery = query;
    searchResultsContainer.innerHTML = '<div class="loading-spinner" style="margin: 2rem auto; width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>';

    try {
        const queryStr = '&query=' + encodeURIComponent(query);
        const [songsRes, albumsRes, artistsRes, playlistsRes] = await Promise.allSettled([
            apiFetch(ENDPOINTS.searchSongs + queryStr),
            apiFetch(ENDPOINTS.searchAlbums + queryStr),
            apiFetch(ENDPOINTS.searchArtists + queryStr),
            apiFetch(ENDPOINTS.searchPlaylists + queryStr)
        ]);

        searchState.songs = songsRes.status === 'fulfilled' ? (songsRes.value.data?.results || []) : [];
        searchState.albums = albumsRes.status === 'fulfilled' ? (albumsRes.value.data?.results || []) : [];
        searchState.artists = artistsRes.status === 'fulfilled' ? (artistsRes.value.data?.results || []) : [];
        searchState.playlists = playlistsRes.status === 'fulfilled' ? (playlistsRes.value.data?.results || []) : [];

        searchTabs.style.display = 'flex';
        renderResults();

    } catch (err) {
        console.error('Search failed:', err);
        showNotification('Search failed. Please try again.', 'error');
        searchResultsContainer.innerHTML = '<p class="text-muted text-center" style="margin-top:2rem;">Could not load results.</p>';
    }
}

function renderResults() {
    if (!currentQuery) return;
    searchResultsContainer.innerHTML = '';

    if (currentTab === 'all') {
        renderSection('Songs', searchState.songs, 'song-card', true);
        renderSection('Albums', searchState.albums, 'album-card', false);
        renderSection('Artists', searchState.artists, 'artist-card', false);
        renderSection('Playlists', searchState.playlists, 'playlist-card', false);
    } else if (currentTab === 'songs') {
        renderGrid(searchState.songs, 'song-card');
    } else if (currentTab === 'albums') {
        renderGrid(searchState.albums, 'album-card');
    } else if (currentTab === 'artists') {
        renderGrid(searchState.artists, 'artist-card');
    } else if (currentTab === 'playlists') {
        renderGrid(searchState.playlists, 'playlist-card');
    }
}

function renderSection(title, items, cardClass, isSongs) {
    if (!items || items.length === 0) return;

    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = 'var(--space-2xl)';
    wrapper.innerHTML = `<h2 style="font-size: var(--text-xl); margin-bottom: var(--space-md);">${title}</h2>`;

    const grid = document.createElement('div');
    grid.className = 'song-grid'; // Use the standard horizontal scrolling grid
    grid.innerHTML = _generateHtml(items.slice(0, 10), cardClass);
    _attachListeners(grid, items, cardClass);

    wrapper.appendChild(grid);
    searchResultsContainer.appendChild(wrapper);
}

function renderGrid(items, cardClass) {
    if (!items || items.length === 0) {
        searchResultsContainer.innerHTML = '<p class="text-muted text-center" style="margin-top:2rem;">No results found in this category.</p>';
        return;
    }

    const grid = document.createElement('div');
    // For single tab mode, we want a wrap grid
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
    grid.style.gap = 'var(--space-md)';
    grid.style.paddingBottom = 'var(--space-2xl)';

    grid.innerHTML = _generateHtml(items, cardClass);
    _attachListeners(grid, items, cardClass);

    searchResultsContainer.appendChild(grid);
}

function _generateHtml(items, cardClass) {
    return items.map((item, i) => {
        const img = getImageUrl(item.image);
        const title = item.name || item.title || 'Unknown';
        const subtitle = item.primaryArtists || item.role || (cardClass.replace('-card', '').toUpperCase());

        return `
      <div class="${cardClass}" data-index="${i}">
        <div class="song-card-img">
          <img data-src="${img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="lazy-load" alt="${title}" onerror="this.src='favicon.ico'">
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
}

function _attachListeners(container, items, cardClass) {
    container.querySelectorAll(`.${cardClass}`).forEach((card, i) => {
        const item = items[i];

        card.addEventListener('click', () => {
            if (cardClass === 'song-card') {
                state.songs = items;
                state.currentSongIndex = i;
                loadSong(item);
            } else if (cardClass === 'artist-card') {
                if (window.showArtistDetail) window.showArtistDetail(item.id, item);
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

    container.querySelectorAll('img.lazy-load').forEach(observeImage);

    if (window.lucide) window.lucide.createIcons({ root: container });
}
