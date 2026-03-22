import { addToQueue } from '../player/engine.js';
import { toggleLike } from '../features/favorites.js';
import { showNotification } from './notifications.js';

let activeSong = null;
let menuElement = null;

export function initContextMenu() {
    menuElement = document.getElementById('contextMenu');

    document.getElementById('cmAddToQueue')?.addEventListener('click', () => {
        if (activeSong) {
            addToQueue(activeSong);
            showNotification('Added to Up Next Queue', 'success');
        }
        closeContextMenu();
    });

    document.getElementById('cmLike')?.addEventListener('click', () => {
        if (activeSong) {
            toggleLike(activeSong);
        }
        closeContextMenu();
    });

    document.getElementById('cmAddToPlaylist')?.addEventListener('click', () => {
        showNotification('Playlists feature coming soon!', 'info');
        closeContextMenu();
    });

    document.getElementById('cmShare')?.addEventListener('click', () => {
        if (activeSong) {
            import('../features/premium.js').then(m => m.shareSong(activeSong));
        }
        closeContextMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (menuElement && e.target.closest('#contextMenu') === null && e.target.closest('.more-btn') === null) {
            closeContextMenu();
        }
    });

    // Close menu on scroll
    window.addEventListener('scroll', closeContextMenu, { passive: true });
}

export function showContextMenu(event, song) {
    if (!menuElement) menuElement = document.getElementById('contextMenu');

    event.stopPropagation();
    event.preventDefault();

    activeSong = song;
    menuElement.style.display = 'flex';

    // Position the menu
    const btnRect = event.currentTarget.getBoundingClientRect();
    const menuRect = menuElement.getBoundingClientRect();

    let top = btnRect.bottom + window.scrollY;
    let left = btnRect.left + window.scrollX - menuRect.width + btnRect.width;

    // Boundary checks
    if (left < 0) left = 10;
    if (top + menuRect.height > window.innerHeight + window.scrollY) {
        top = btnRect.top + window.scrollY - menuRect.height;
    }

    menuElement.style.top = `${top}px`;
    menuElement.style.left = `${left}px`;
}

export function closeContextMenu() {
    if (menuElement) {
        menuElement.style.display = 'none';
    }
}
