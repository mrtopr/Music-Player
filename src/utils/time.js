/**
 * Utility: formatTime — single canonical time formatter
 * Extracted from index.js and js/player.js (was duplicated in both)
 */

/**
 * Format seconds to MM:SS string
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);
    return `${minutes}:${remaining < 10 ? '0' : ''}${remaining}`;
}
