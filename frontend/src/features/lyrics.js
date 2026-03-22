import { apiFetch, ENDPOINTS } from '../api/client.js';
import { state } from '../player/state.js';

let container;

export function initLyrics() {
    container = document.getElementById('lyricsContainer');

    document.getElementById('fsLyricsToggle')?.addEventListener('click', () => {
        document.getElementById('fsQueuePane').style.display = 'none';
        document.getElementById('fsLyricsPane').style.display = 'block';
    });
}

export async function fetchAndRenderLyrics(song) {
    if (!container) return;

    // Reset state
    container.innerHTML = '<div class="loading-spinner" style="margin: 2rem 0; width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>';

    // Actually the JioSaavn API often provides lyrics per /songs/id?lyrics=true
    try {
        const id = song.id || song._id;
        const res = await apiFetch(ENDPOINTS.songDetails + id + '&lyrics=true');

        let lyricsRaw = null;

        // Structure varies deeply based on API version. Sometimes it's inside -> data[0].lyrics.snippet
        if (res.data && res.data[0] && res.data[0].lyrics) {
            lyricsRaw = res.data[0].lyrics.snippet || res.data[0].lyrics;
        } else if (song.lyrics) {
            lyricsRaw = song.lyrics;
        }

        if (!lyricsRaw) {
            container.innerHTML = '<p class="text-muted" style="margin-top:2rem;">Lyrics not available for this track.</p>';
            return;
        }

        // Clean up `<br>` into arrays
        const lines = lyricsRaw.replace(/<br\s*\/?>/gi, '\n').split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const html = lines.map((line, i) => {
            return `<div class="lyrics-line" data-index="${i}">${line}</div>`;
        }).join('');

        container.innerHTML = html;

    } catch (e) {
        console.error('Lyrics fetch failed:', e);
        container.innerHTML = '<p class="text-muted" style="margin-top:2rem;">Unable to load lyrics.</p>';
    }
}
