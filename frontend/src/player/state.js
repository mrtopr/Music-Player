/**
 * Global playback state — single source of truth
 * Import and mutate this object from any module.
 * Never create separate local copies of these values.
 */
export const state = {
    // Current song array and index
    songs: [],
    currentSongIndex: 0,

    // Queue
    songQueue: [],
    currentQueueIndex: 0,
    originalQueue: [], // Preserved for shuffle toggle

    // Playback modes
    isShuffleEnabled: false,
    repeatMode: 'off', // 'off' | 'all' | 'one'

    // Pagination
    trendingPageState: { currentPage: 0, isLoading: false, hasMorePages: true },
    latestPageState: { currentPage: 0, isLoading: false, hasMorePages: true },
    artistsPageState: { currentPage: 0, isLoading: false, hasMorePages: true, currentCategory: 'popular' },
    artistPlaylistState: {
        currentPage: 0,
        isLoading: false,
        hasMorePages: true,
        currentArtistId: null,
        currentArtistName: '',
        currentCategory: 'popular'
    },

    // Filtered/all song lists for mood filtering
    allTrendingSongs: [],
    filteredTrendingSongs: [],
    allNewReleases: [],
    filteredNewReleases: [],

    // User
    currentUser: null,
    likedSongs: [],
    userPlaylists: [],

    // Music history & recommendations
    musicHistory: {
        lastPlayed: null,
        playHistory: [],
        suggestions: []
    },

    // UI state
    currentlyPlayingCard: null,
    currentMood: 'all',
};
