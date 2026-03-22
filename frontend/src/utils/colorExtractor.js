import { Vibrant } from 'node-vibrant/browser';

/**
 * Extracts a palette of colors from an image URL, optionally biased by the track's mood.
 * @param {string} imageUrl 
 * @param {string} trackTitle 
 * @returns {Promise<{dominant: string, secondary: string, accent: string, muted: string}>}
 */
export async function extractAlbumColors(imageUrl, trackTitle = '') {
    if (!imageUrl) return null;
    
    // Default fallback colors
    let colors = {
        dominant: '#1a1a1a', dominantRGB: '26,26,26',
        secondary: '#0a0a0a',
        accent: '#f59e0b', accentRGB: '245,158,11',
        muted: '#151515'
    };

    try {
        // Use an anonymous crossorigin request to avoid silent failures in the browser
        const palette = await Vibrant.from(imageUrl).useImageValue(true).getPalette();
        
        // Pick the most vibrant available color for the 'dominant' role
        const v = palette.Vibrant || palette.Muted || palette.DarkVibrant || palette.LightVibrant;
        const a = palette.LightVibrant || palette.Vibrant || palette.Muted;
        
        colors = {
            dominant: v?.getHex() || '#1a1a1a',
            secondary: palette.DarkVibrant?.getHex() || '#0a0a0a',
            accent: a?.getHex() || '#f59e0b',
            muted: palette.Muted?.getHex() || '#151515',
            dominantRGB: v ? v.getRgb().join(',') : '26,26,26',
            accentRGB: a ? a.getRgb().join(',') : '245,158,11'
        };

        // Mood-based biasing (as requested: romantic=red/pink, sad=blue, party=purple)
        const title = trackTitle.toLowerCase();
        let moodColor = null;
        let moodRGB = null;

        if (title.includes('romantic') || title.includes('love') || title.includes('ishq') || title.includes('heart')) {
            moodColor = '#ff3b30'; // Premium Red
            moodRGB = '255,59,48';
        } else if (title.includes('sad') || title.includes('dard') || title.includes('broken') || title.includes('alone')) {
            moodColor = '#007aff'; // Premium Blue
            moodRGB = '0,122,255';
        } else if (title.includes('party') || title.includes('dance') || title.includes('remix') || title.includes('club')) {
            moodColor = '#af52de'; // Premium Purple
            moodRGB = '175,82,222';
        }

        if (moodColor) {
            // Blend the extracted accent with the mood color (70% mood, 30% accent)
            colors.accent = moodColor;
            colors.accentRGB = moodRGB;
            // Also slightly shift dominance if it's very dark
            if (colors.dominant === '#1a1a1a') {
                colors.dominant = moodColor;
                colors.dominantRGB = moodRGB;
            }
        }
        
        return colors;
    } catch (error) {
        console.error('Color extraction failed:', error);
        return colors;
    }
}
