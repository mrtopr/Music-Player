import { state } from '../player/state.js';
import { getImageUrl } from '../api/client.js';
import { loadSong, formatTime } from '../player/engine.js';

let isQueueOpen = false;

export function initQueue() {
    const miniQueueBtn = document.getElementById('miniQueueBtn');
    const fullscreenQueueBtn = document.getElementById('fullscreenQueueBtn');
    const closeQueueBtn = document.getElementById('closeQueueBtn');
    const clearQueueBtn = document.getElementById('clearQueueBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn'); // For mobile fullscreen
    const queuePanel = document.getElementById('queuePanel');

    if (miniQueueBtn) miniQueueBtn.addEventListener('click', toggleQueuePanel);
    if (fullscreenQueueBtn) fullscreenQueueBtn.addEventListener('click', toggleQueuePanel);
    if (closeQueueBtn) closeQueueBtn.addEventListener('click', closeQueuePanel);
    if (clearQueueBtn) clearQueueBtn.addEventListener('click', handleClearQueue);

    // On mobile, the 3 dots in fullscreen configures queue / options
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleQueuePanel);
}

function toggleQueuePanel() {
    isQueueOpen = !isQueueOpen;
    const queuePanel = document.getElementById('queuePanel');
    if (isQueueOpen) {
        queuePanel.classList.add('open');
        renderQueue();
    } else {
        queuePanel.classList.remove('open');
    }
}

function closeQueuePanel() {
    isQueueOpen = false;
    document.getElementById('queuePanel').classList.remove('open');
}

export function renderQueue() {
    if (!isQueueOpen) return;

    const nowPlayingContainer = document.getElementById('nowPlayingContainer');
    const upNextContainer = document.getElementById('upNextContainer');

    nowPlayingContainer.innerHTML = '';
    upNextContainer.innerHTML = '';

    // Render Now Playing
    const currentSong = state.songs[state.currentSongIndex] || state.songQueue[state.currentQueueIndex];
    if (currentSong) {
        nowPlayingContainer.appendChild(createQueueCard(currentSong, true, 0, 'playing'));
    } else {
        nowPlayingContainer.innerHTML = '<p class="text-muted text-sm px-3">No music playing.</p>';
    }

    // Render Up Next
    let nextItems = [];

    // 1. Items physically in the queue
    if (state.songQueue && state.songQueue.length > state.currentQueueIndex + 1) {
        const queued = state.songQueue.slice(state.currentQueueIndex + 1);
        nextItems = [...nextItems, ...queued.map(s => ({ ...s, _source: 'queue' }))];
    }

    // 2. Items remaining in the auto-list (if not purely playing from queue)
    if (state.songs && state.songs.length > 0 && state.currentSongIndex !== undefined) {
        const remaining = state.songs.slice(state.currentSongIndex + 1);
        nextItems = [...nextItems, ...remaining.map(s => ({ ...s, _source: 'auto' }))];
    }

    if (nextItems.length === 0) {
        upNextContainer.innerHTML = '<p class="text-muted text-sm px-3">Queue is empty.</p>';
    } else {
        nextItems.forEach((song, idx) => {
            upNextContainer.appendChild(createQueueCard(song, false, idx, song._source));
        });
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function createQueueCard(song, isPlaying, index, source) {
    const div = document.createElement('div');
    div.className = `queue-item ${isPlaying ? 'playing' : ''}`;

    const imageUrl = getImageUrl(song.image) || 'favicon.ico';
    const title = song.name || song.title || 'Unknown Title';
    const artist = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || song.artist || '-';

    let duration = '';
    if (song.duration) {
        duration = `<span>${formatTime(song.duration)}</span>`;
    }

    div.innerHTML = `
        <img src="${imageUrl}" alt="Cover">
        <div class="info">
            <div class="title">${title}</div>
            <div class="artist">${artist}</div>
        </div>
        <div class="actions">
            ${duration}
            ${!isPlaying ? '<button class="remove-btn" title="Remove"><i data-lucide="x" class="lucide-icon"></i></button>' : ''}
        </div>
    `;

    // Click to play immediately
    div.addEventListener('click', (e) => {
        if (e.target.closest('.remove-btn')) return; // Ignore if clicking remove
        if (!isPlaying) {
            if (source === 'queue') {
                state.currentQueueIndex += (index + 1);
                loadSong(state.songQueue[state.currentQueueIndex]);
            } else if (source === 'auto') {
                state.currentSongIndex += (index + 1);
                loadSong(state.songs[state.currentSongIndex]);
                // Wipe explicit queue if dropping into library
                state.songQueue = [];
                state.currentQueueIndex = 0;
            }
            renderQueue();
        }
    });

    // Remove logic
    const rmBtn = div.querySelector('.remove-btn');
    if (rmBtn) {
        rmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (source === 'queue') {
                state.songQueue.splice(state.currentQueueIndex + 1 + index, 1);
            } else if (source === 'auto') {
                state.songs.splice(state.currentSongIndex + 1 + index, 1);
            }
            renderQueue();
        });
    }

    return div;
}

function handleClearQueue() {
    state.songQueue = [];
    state.currentQueueIndex = 0;
    renderQueue();
}
