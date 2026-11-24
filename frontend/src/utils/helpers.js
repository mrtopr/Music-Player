import { getImageUrl } from '../api/client.js';

export function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function decodeEntities(text) {
    if (!text) return '';
    if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        let decoded = textarea.value;
        if (decoded && decoded.includes('&')) {
            textarea.innerHTML = decoded;
            decoded = textarea.value;
        }
        return decoded;
    }
    return text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

export function cleanTrackTitle(title) {
    if (!title) return '';
    const decoded = decodeEntities(title);
    return decoded
        .replace(/\s*[\(\[](?:From\s+[^)\]]+|Original Motion Picture Soundtrack|Soundtrack Version|Lyrical Video|Official Video|Audio Song|Video Song)[\)\]]/gi, '')
        .replace(/^["'“”«»]+|["'“”«»]+$/g, '')
        .trim() || decoded;
}

export function getSafeImage(image, getImageUrlFn) {
    if (!image) return '/music.png';
    const url = getImageUrlFn ? getImageUrlFn(image) : getImageUrl(image);
    return url || '/music.png';
}

export function parseLrc(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const result = [];
    const timeReg = /^\[(\d+):(\d+)(?:\.(\d+))?\](.*)/;
    
    for (let line of lines) {
        line = line.trim();
        const match = timeReg.exec(line);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const msStr = match[3] || '0';
            // Standard LRC uses centiseconds (1–2 digits); extended uses milliseconds (3 digits).
            const ms = msStr.length <= 2
                ? parseInt(msStr, 10) / 100   // centiseconds → seconds
                : parseInt(msStr, 10) / 1000; // milliseconds → seconds
            const time = min * 60 + sec + ms;
            const text = match[4].trim();
            result.push({ time, text });
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

