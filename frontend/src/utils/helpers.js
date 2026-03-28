import { getImageUrl } from '../api/client.js';

export function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function decodeEntities(text) {
    if (!text) return '';
    return text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'");
}

export function getSafeImage(image, getImageUrlFn) {
    if (!image) return '/music.png';
    const url = getImageUrlFn ? getImageUrlFn(image) : getImageUrl(image);
    return url || '/music.png';
}
