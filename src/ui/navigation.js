/**
 * Page navigation — show/hide page sections
 */

const PAGES = {
    home: '.main-area',
    trending: '#trending-page',
    latest: '#latest-page',
    artists: '#artists-page',
    album: '#album-page',
    favorites: '#favorites-page',
    playlists: '#playlists-page',
};

let _currentPage = 'home';

function hideAll() {
    Object.values(PAGES).forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.style.display = 'none';
    });
}

function show(pageKey) {
    hideAll();
    const sel = PAGES[pageKey];
    if (!sel) return;
    const el = document.querySelector(sel);
    if (el) el.style.display = '';
    _currentPage = pageKey;

    // Update sidebar active state
    document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
    const activeLink = document.querySelector(`[data-page="${pageKey}"]`);
    if (activeLink) activeLink.closest('li')?.classList.add('active');
}

export function showHomePage() { show('home'); }
export function showTrendingPage() { show('trending'); }
export function showLatestPage() { show('latest'); }
export function showArtistsPage() { show('artists'); }
export function showAlbumPage() { show('album'); }
export function showFavoritesPage() { show('favorites'); }
export function showPlaylistsPage() { show('playlists'); }
export function getCurrentPage() { return _currentPage; }

export function initNavigation() {
    // Wire sidebar links via data-page attribute
    document.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const page = el.dataset.page;
            if (PAGES[page]) show(page);
        });
    });

    // Back buttons
    document.querySelectorAll('[data-action="back"]').forEach(btn => {
        btn.addEventListener('click', () => showHomePage());
    });
}

// Expose globally for legacy inline onclick handlers in index.html
window.showHomePage = showHomePage;
window.showTrendingPage = showTrendingPage;
window.showLatestPage = showLatestPage;
window.showArtistsPage = showArtistsPage;
window.showAlbumPage = showAlbumPage;
window.showFavoritesPage = showFavoritesPage;
window.showPlaylistsPage = showPlaylistsPage;
