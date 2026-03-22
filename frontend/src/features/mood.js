/**
 * Mood-based filtering system
 * Extracted from index.js enrichSong / applyMoodFilter
 */
import { state } from '../player/state.js';

export const MOODS = ['all', 'romantic', 'dance', 'sad', 'party', 'classical', 'rock', 'pop', 'hiphop', 'electronic', 'jazz'];

/**
 * Enrich a song object with a detected mood
 * @param {Object} song
 * @returns {Object} song with .mood property
 */
export function enrichSong(song) {
    const text = `${song.name || song.title || ''} ${song.primaryArtists || song.artist || ''}`.toLowerCase();

    if (/love|romantic|pyaar|ishq|dil|heart/.test(text)) return { ...song, mood: 'romantic' };
    if (/sad|broken|cry|pain|gham|udas/.test(text)) return { ...song, mood: 'sad' };
    if (/party|dance|beat|club|thumka|nachde/.test(text)) return { ...song, mood: 'dance' };
    if (/rock|metal|guitar/.test(text)) return { ...song, mood: 'rock' };
    if (/pop|catchy|hit|chart/.test(text)) return { ...song, mood: 'pop' };
    if (/rap|hip hop|hiphop|urban/.test(text)) return { ...song, mood: 'hiphop' };
    if (/electronic|edm|techno|remix/.test(text)) return { ...song, mood: 'electronic' };
    if (/classical|raag|tabla|sitar/.test(text)) return { ...song, mood: 'classical' };
    if (/jazz|blues|smooth|saxophone/.test(text)) return { ...song, mood: 'jazz' };

    return { ...song, mood: 'all' };
}

/**
 * Apply a mood filter to stored song lists
 * @param {string} mood - one of MOODS
 */
export function applyMoodFilter(mood) {
    state.currentMood = mood;

    state.filteredTrendingSongs = mood === 'all'
        ? state.allTrendingSongs
        : state.allTrendingSongs.filter(s => s.mood === mood || s.mood === 'all');

    state.filteredNewReleases = mood === 'all'
        ? state.allNewReleases
        : state.allNewReleases.filter(s => s.mood === mood || s.mood === 'all');
}

/** Initialize mood filter UI buttons */
export function initMoodFilter() {
    document.querySelectorAll('[data-mood]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-mood]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyMoodFilter(btn.dataset.mood);
        });
    });
}

// Expose for legacy compatibility
window.enrichSong = enrichSong;
window.applyMoodFilter = applyMoodFilter;
