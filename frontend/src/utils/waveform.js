/**
 * Utility: generateWaveform — single canonical 20-bar waveform generator
 * Extracted from js/player.js (was also in index.js with 10 bars — merged to 20)
 */

/**
 * Generate waveform bars in a container element
 * @param {HTMLElement|string} container - element or selector
 * @param {number} barCount - number of bars (default 20)
 */
export function generateWaveform(container, barCount = 20) {
    const el = typeof container === 'string'
        ? document.querySelector(container)
        : container;
    if (!el) return;

    el.innerHTML = '';
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'waveform-bar';
        el.appendChild(bar);
    }
}
