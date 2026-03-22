import { extractDominantColor } from '../utils/color.js';
import { getImageUrl } from '../api/client.js';

// Default Gold
const DEFAULT_COLOR = [212, 175, 55];

/**
 * Maps a song's image to the global CSS accent variables
 * @param {Object} song 
 */
export async function applyDynamicTheme(song) {
    if (!song) return resetTheme();

    // Attempt high quality image extract, falling back to basic extraction
    const imgUrl = getImageUrl(song.image, 'high') || getImageUrl(song.image);
    if (!imgUrl) return resetTheme();

    try {
        const [r, g, b] = await extractDominantColor(imgUrl);
        setTheme(r, g, b);
    } catch (e) {
        console.warn('Dynamic theme extraction failed:', e);
        resetTheme(); // fallback to default
    }
}

function setTheme(r, g, b) {
    const root = document.documentElement;
    root.style.setProperty('--accent-primary', `rgb(${r}, ${g}, ${b})`);
    root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
    root.style.setProperty('--accent-glow-strong', `rgba(${r}, ${g}, ${b}, 0.6)`);
}

function resetTheme() {
    setTheme(DEFAULT_COLOR[0], DEFAULT_COLOR[1], DEFAULT_COLOR[2]);
}
