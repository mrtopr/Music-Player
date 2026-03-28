export const MOOD_CATEGORIES = {
    romantic: { keywords: ['romantic', 'love', 'ishq', 'heart', 'romance'], colorFallback: '#ff3b30', rgbFallback: '255,59,48', themeKey: 'romantic' },
    sad: { keywords: ['sad', 'dard', 'broken', 'alone', 'cry', 'melancholy'], colorFallback: '#007aff', rgbFallback: '0,122,255', themeKey: 'sad' },
    party: { keywords: ['party', 'dance', 'remix', 'club', 'beat'], colorFallback: '#af52de', rgbFallback: '175,82,222', themeKey: 'party' },
    classical: { keywords: ['classical', 'instrumental', 'gazal', 'sufi'], colorFallback: '#e8aa00', rgbFallback: '232,170,0', themeKey: 'classical' },
    rock: { keywords: ['rock', 'metal', 'heavy'], colorFallback: '#ff9500', rgbFallback: '255,149,0', themeKey: 'rock' }
};

export function detectMood(text) {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    for (const [mood, config] of Object.entries(MOOD_CATEGORIES)) {
        if (config.keywords.some(kw => lowerText.includes(kw))) return mood;
    }
    return null;
}
