import { Vibrant } from 'node-vibrant/browser';

/**
 * Extracts a palette of colors from an image URL, optionally biased by the track's mood.
 */
export async function extractAlbumColors(imageUrl, trackTitle = '') {
    // Default fallback colors
    const fallback = {
        dominant: '#1a1a1a', dominantRGB: '26,26,26',
        secondary: '#0a0a0a',
        accent: '#f59e0b', accentRGB: '245,158,11',
        muted: '#151515'
    };

    if (!imageUrl || imageUrl === 'favicon.ico') return fallback;

    console.group(`[ColorExtractor] Extracting for: ${trackTitle}`);
    console.log('Image URL:', imageUrl);

    try {
        // node-vibrant can fail on CORS if not handled. 
        // Typically image servers for music (saavn) have CORS headers.
        const vBuilder = Vibrant.from(imageUrl);
        const palette = await vBuilder.getPalette();

        console.log('Extracted Palette:', palette);

        const safeHex = (swatch, d) => (swatch && typeof swatch.getHex === 'function' ? swatch.getHex() : d);
        const safeRGB = (swatch, d) => {
            if (swatch && typeof swatch.getRgb === 'function') {
                const rgb = swatch.getRgb();
                return Array.isArray(rgb) ? rgb.join(',') : d;
            }
            return d;
        };

        const v = palette.Vibrant || palette.DarkVibrant || palette.Muted || palette.LightVibrant;
        const a = palette.LightVibrant || palette.Vibrant || palette.Muted;

        const colors = {
            dominant: safeHex(v, '#1a1a1a'),
            secondary: safeHex(palette.DarkVibrant, '#0a0a0a'),
            accent: safeHex(a, '#f59e0b'),
            muted: safeHex(palette.Muted, '#151515'),
            dominantRGB: safeRGB(v, '26,26,26'),
            accentRGB: safeRGB(a, '245,158,11')
        };

        // Mood-based biasing from Unified Config
        const { detectMood, MOOD_CATEGORIES } = await import('./moodConfig.js');
        const mood = detectMood(trackTitle);
        const config = mood ? MOOD_CATEGORIES[mood] : null;

        if (config) {
            console.log(`[ColorExtractor] Applying biased theme from mood: ${mood}`);
            colors.accent = config.colorFallback;
            colors.accentRGB = config.rgbFallback;
            if (colors.dominant === '#1a1a1a') {
                colors.dominant = config.colorFallback;
                colors.dominantRGB = config.rgbFallback;
            }
        }

        console.log('Final Palette:', colors);
        console.groupEnd();
        return colors;

    } catch (error) {
        console.error('[ColorExtractor] Failed:', error);
        console.groupEnd();
        return fallback;
    }
}
