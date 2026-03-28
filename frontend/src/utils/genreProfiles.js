/**
 * Genre Profiles — Maps genre labels to search queries and metadata.
 * Used by the recommendation engine to personalize home sections.
 */

export const GENRE_PROFILES = {
    'Romantic': {
        label: 'Romantic',
        emoji: '💕',
        queries: ['romantic hindi love songs', 'best love songs bollywood'],
        color: '#E91E63',
        gradient: 'linear-gradient(135deg, #E91E63, #9C27B0)'
    },
    'Dance': {
        label: 'Dance',
        emoji: '🕺',
        queries: ['bollywood dance party songs', 'best dance hits 2024'],
        color: '#FF9800',
        gradient: 'linear-gradient(135deg, #FF9800, #FF5722)'
    },
    'Sad': {
        label: 'Sad',
        emoji: '😔',
        queries: ['sad hindi songs emotional', 'heartbreak hindi songs'],
        color: '#5C6BC0',
        gradient: 'linear-gradient(135deg, #5C6BC0, #283593)'
    },
    'Party': {
        label: 'Party',
        emoji: '🎉',
        queries: ['bollywood party songs 2024', 'party anthem hits india'],
        color: '#F44336',
        gradient: 'linear-gradient(135deg, #F44336, #FF9800)'
    },
    'Classical': {
        label: 'Classical',
        emoji: '🪕',
        queries: ['indian classical music', 'raga fusion classical india'],
        color: '#8D6E63',
        gradient: 'linear-gradient(135deg, #8D6E63, #4E342E)'
    },
    'Rock': {
        label: 'Rock',
        emoji: '🎸',
        queries: ['hindi rock songs', 'indian rock indie music'],
        color: '#607D8B',
        gradient: 'linear-gradient(135deg, #607D8B, #263238)'
    },
    'Pop': {
        label: 'Pop',
        emoji: '🎵',
        queries: ['hindi pop songs 2024', 'bollywood pop hits'],
        color: '#00BCD4',
        gradient: 'linear-gradient(135deg, #00BCD4, #0097A7)'
    },
    'Hip Hop': {
        label: 'Hip Hop',
        emoji: '🎤',
        queries: ['desi hip hop rap', 'desi hiphop 2024 songs'],
        color: '#9C27B0',
        gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)'
    },
    'Devotional': {
        label: 'Devotional',
        emoji: '🪔',
        queries: ['hindi devotional songs bhajans', 'spiritual bhakti songs'],
        color: '#FFA000',
        gradient: 'linear-gradient(135deg, #FFA000, #FF8F00)'
    },
    'Chill': {
        label: 'Chill',
        emoji: '🌊',
        queries: ['chill hindi songs relax lofi', 'peaceful indian music lofi'],
        color: '#26A69A',
        gradient: 'linear-gradient(135deg, #26A69A, #00897B)'
    },
    'Latest 2024': {
        label: 'Latest 2024',
        emoji: '🔥',
        queries: ['latest bollywood 2024', 'new hindi songs 2024'],
        color: '#FF5722',
        gradient: 'linear-gradient(135deg, #FF5722, #BF360C)'
    },
};

export const ALL_GENRES = Object.keys(GENRE_PROFILES);

export function getGenreProfile(genre) {
    return GENRE_PROFILES[genre] || {
        label: genre,
        emoji: '🎶',
        queries: [genre + ' hindi songs'],
        color: '#C6A15B',
        gradient: 'linear-gradient(135deg, #C6A15B, #8B6914)'
    };
}
