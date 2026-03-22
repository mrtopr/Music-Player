// ======== GLOBAL ELEMENTS ========
const audio = document.getElementById("audioElement");
const API_BASE_URL = (() => {
  const params = new URLSearchParams(window.location.search);
  const queryOverride = params.get('apiBase');
  if (queryOverride) return queryOverride.replace(/\/$/, '');

  try {
    const storedOverride = localStorage.getItem('mehfilApiBaseUrl');
    if (storedOverride) return storedOverride.replace(/\/$/, '');
  } catch (storageError) {
    console.warn('Unable to read API base from localStorage:', storageError);
  }

  if (window.location.protocol === 'file:') {
    return 'http://localhost:3000';
  }

  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const isPrivateIp = /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(host);

  if (isLocalHost || isPrivateIp) {
    return `${window.location.protocol}//${host}:3000`;
  }

  // In production, use same-origin and let reverse proxy handle /api.
  return '';
})();
const ENDPOINTS = {
  trendingSongs: "/api/search/songs?query=bollywood%20trending%202024%20hits&language=hindi",
  newReleasesAlbums: "/api/search/songs?query=new%20hindi%20songs&language=hindi",
  popularArtists: "/api/search/artists?query=arijit%20singh%20shreya%20ghoshal%20rahat%20fateh&language=hindi",
  featuredPlaylists: "/api/search/playlists?query=bollywood%20hits%20romantic&language=hindi",
  searchSongs: "/api/search/songs",
  searchAlbums: "/api/search/albums",
  searchArtists: "/api/search/artists",
  searchPlaylists: "/api/search/playlists",
  albumDetails: "/api/albums?id=",
  playlistDetails: "/api/playlists?id=",
  songDetails: "/api/songs?id=",
  artistDetails: "/api/artists?id="
};

// ======== LOGIN SYSTEM ========
let currentUser = null;

// ======== PAGINATION AND QUEUE SYSTEM ========
let trendingPage = 0;
let newReleasesPage = 0;
let songQueue = [];
let currentQueueIndex = 0;
let likedSongs = [];
let userPlaylists = [];
let songs = []; // Global songs array for playback
let currentSongIndex = 0; // Current song index in the songs array

// Bridge key playback state to window so helper scripts can read/write safely.
if (!Object.getOwnPropertyDescriptor(window, 'songs')) {
  Object.defineProperty(window, 'songs', {
    configurable: true,
    get: () => songs,
    set: (value) => {
      songs = Array.isArray(value) ? value : [];
    }
  });
}

if (!Object.getOwnPropertyDescriptor(window, 'currentSongIndex')) {
  Object.defineProperty(window, 'currentSongIndex', {
    configurable: true,
    get: () => currentSongIndex,
    set: (value) => {
      const parsed = Number(value);
      currentSongIndex = Number.isFinite(parsed) ? parsed : 0;
    }
  });
}

// Pagination state for dedicated pages
let trendingPageState = {
  currentPage: 0,
  isLoading: false,
  hasMorePages: true
};

let latestPageState = {
  currentPage: 0,
  isLoading: false,
  hasMorePages: true
};

let artistsPageState = {
  currentPage: 0,
  isLoading: false,
  hasMorePages: true,
  currentCategory: 'popular' // 'popular' or 'rappers'
};

// ======== PLAYING CARD HIGHLIGHT UTILITY ========
let currentlyPlayingCard = null;

/**
 * Highlights the currently playing song card with glow effect
 * @param {HTMLElement} cardElement - The card element that is now playing
 */
function highlightPlayingCard(cardElement) {
  // Remove playing/glow class from all cards
  document.querySelectorAll('.card, .song-card, .playlist-card').forEach(card => {
    card.classList.remove('playing', 'glow');
  });
  
  // Add playing class to current card
  if (cardElement) {
    currentlyPlayingCard = cardElement;
    cardElement.classList.add('playing');
    
    // Add glow effect for 2 seconds
    cardElement.classList.add('glow');
    setTimeout(() => {
      cardElement.classList.remove('glow');
    }, 2000);
  }
}

/**
 * Remove playing highlight from all cards (when paused/stopped)
 */
function clearPlayingHighlight() {
  document.querySelectorAll('.card, .song-card, .playlist-card').forEach(card => {
    card.classList.remove('playing', 'glow');
  });
  currentlyPlayingCard = null;
}

// Artist playlist pagination state
let artistPlaylistState = {
  currentPage: 0,
  isLoading: false,
  hasMorePages: true,
  currentArtistId: null,
  currentArtistName: '',
  currentCategory: 'popular'
};

// ======== PLAYBACK STATE ========
let isShuffleEnabled = false;
let repeatMode = 'off'; // 'off', 'all', 'one'
let originalQueue = []; // Store original order for shuffle toggle

// ======== MUSIC HISTORY & RECOMMENDATIONS ========
let musicHistory = {
  lastPlayed: null, // {song, currentTime, timestamp}
  playHistory: [], // Array of {song, playCount, lastPlayed, totalPlayTime}
  suggestions: [] // Array of suggested songs
};

// ======== MOOD-BASED FILTERING SYSTEM ========
const MOODS = [
  'all',
  'romantic',
  'dance',
  'sad',
  'party',
  'classical',
  'rock',
  'pop',
  'hiphop',
  'electronic',
  'jazz'
];

// Store original and filtered song lists
let allTrendingSongs = [];
let filteredTrendingSongs = [];
let allNewReleases = [];
let filteredNewReleases = [];

// Enrich song with mood based on title/artist analysis
function enrichSong(song) {
  const title = (song.name || song.title || '').toLowerCase();
  const artist = (song.primaryArtists || song.artist || '').toLowerCase();
  const searchText = `${title} ${artist}`;

  // Romantic mood detection
  if (searchText.includes('love') || searchText.includes('romantic') ||
    searchText.includes('pyaar') || searchText.includes('ishq') ||
    searchText.includes('dil') || searchText.includes('heart')) {
    return { ...song, mood: 'romantic' };
  }

  // Sad mood detection
  if (searchText.includes('sad') || searchText.includes('broken') ||
    searchText.includes('cry') || searchText.includes('pain') ||
    searchText.includes('gham') || searchText.includes('udas')) {
    return { ...song, mood: 'sad' };
  }

  // Dance/Party mood detection
  if (searchText.includes('party') || searchText.includes('dance') ||
    searchText.includes('beat') || searchText.includes('club') ||
    searchText.includes('thumka') || searchText.includes('nachde')) {
    return { ...song, mood: 'dance' };
  }

  // Rock mood detection
  if (searchText.includes('rock') || searchText.includes('metal') ||
    searchText.includes('guitar') || searchText.includes('band')) {
    return { ...song, mood: 'rock' };
  }

  // Pop mood detection
  if (searchText.includes('pop') || searchText.includes('catchy') ||
    searchText.includes('hit') || searchText.includes('chart')) {
    return { ...song, mood: 'pop' };
  }

  // Hip Hop mood detection
  if (searchText.includes('rap') || searchText.includes('hip hop') ||
    searchText.includes('hiphop') || searchText.includes('urban')) {
    return { ...song, mood: 'hiphop' };
  }

  // Electronic mood detection
  if (searchText.includes('electronic') || searchText.includes('edm') ||
    searchText.includes('techno') || searchText.includes('remix')) {
    return { ...song, mood: 'electronic' };
  }

  // Classical mood detection
  if (searchText.includes('classical') || searchText.includes('raag') ||
    searchText.includes('tabla') || searchText.includes('sitar')) {
    return { ...song, mood: 'classical' };
  }

  // Jazz mood detection
  if (searchText.includes('jazz') || searchText.includes('blues') ||
    searchText.includes('smooth') || searchText.includes('saxophone')) {
    return { ...song, mood: 'jazz' };
  }

  // Default to 'all' if no specific mood detected
  return { ...song, mood: 'all' };
}

// Apply mood filter to songs
function applyMoodFilter(mood) {
  console.log('🎭 Applying mood filter:', mood);

  // Filter trending songs
  if (mood === 'all') {
    filteredTrendingSongs = [...allTrendingSongs];
  } else {
    filteredTrendingSongs = allTrendingSongs.filter(song => song.mood === mood);
  }

  // Filter new releases
  if (mood === 'all') {
    filteredNewReleases = [...allNewReleases];
  } else {
    filteredNewReleases = allNewReleases.filter(song => song.mood === mood);
  }

  // Update UI
  renderFilteredSongs();

  // Show notification
  const count = filteredTrendingSongs.length + filteredNewReleases.length;
  if (mood === 'all') {
    showNotification(`Showing all songs (${count} total)`, 'info', 2000);
  } else {
    showNotification(`Found ${count} ${mood} songs`, 'info', 2000);
  }
}

// Render filtered songs to UI
function renderFilteredSongs() {
  const trendingContainer = document.getElementById('trending-songs-container');
  const newReleasesContainer = document.getElementById('new-releases-container');

  // Render trending songs
  if (trendingContainer) {
    if (filteredTrendingSongs.length === 0) {
      trendingContainer.innerHTML = `
        <div class="empty-mood-state">
          <i class="bi bi-music-note-beamed"></i>
          <p class="empty-msg">No trending songs found for this mood 🎵</p>
          <button class="btn-secondary" onclick="resetMoodFilter()">Show All Songs</button>
        </div>
      `;
    } else {
      renderTrendingSongs(filteredTrendingSongs);
    }
  }

  // Render new releases
  if (newReleasesContainer) {
    if (filteredNewReleases.length === 0) {
      newReleasesContainer.innerHTML = `
        <div class="empty-mood-state">
          <i class="bi bi-music-note-beamed"></i>
          <p class="empty-msg">No new releases found for this mood 🎵</p>
          <button class="btn-secondary" onclick="resetMoodFilter()">Show All Songs</button>
        </div>
      `;
    } else {
      renderNewReleases(filteredNewReleases);
    }
  }
}

// Reset mood filter to show all songs
function resetMoodFilter() {
  const allButton = document.querySelector('.category-scroll .btn[data-mood="all"]') ||
    document.querySelector('.category-scroll .btn:first-child');
  if (allButton) {
    // Remove active class from all buttons
    document.querySelectorAll('.category-scroll .btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to "All Music" button
    allButton.classList.add('active');

    // Apply filter
    applyMoodFilter('all');
  }
}

// ======== ENHANCED FULLSCREEN PLAYER IMPROVEMENTS ========

// Generate dynamic waveform bars
function generateWaveform() {
  const waveformContainer = document.getElementById('waveformContainer');
  if (!waveformContainer) return;

  waveformContainer.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar';
    waveformContainer.appendChild(bar);
  }

  console.log('🎵 Waveform generated with 10 bars');
}

// Update waveform animation based on playing state
function updateWaveformAnimation(isPlaying) {
  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  const bars = document.querySelectorAll('.waveform-bar');

  if (fullscreenPlayer) {
    if (isPlaying) {
      fullscreenPlayer.classList.add('playing');
      // Randomly activate bars for visual variety
      bars.forEach((bar, index) => {
        setTimeout(() => {
          if (Math.random() > 0.3) {
            bar.classList.add('active');
          }
          // Randomly toggle active state
          setInterval(() => {
            if (Math.random() > 0.5) {
              bar.classList.toggle('active');
            }
          }, 800 + (index * 100));
        }, index * 100);
      });
    } else {
      fullscreenPlayer.classList.remove('playing');
      bars.forEach(bar => bar.classList.remove('active'));
    }
  }
}

// Enhanced branding with song change animation
function updateBrandingOnSongChange() {
  const branding = document.querySelector('.fullscreen-branding');
  if (branding) {
    branding.classList.add('song-change');
    setTimeout(() => {
      branding.classList.remove('song-change');
    }, 600);
  }
}

// Update volume slider visual feedback
function updateVolumeVisualFeedback(volume) {
  const volumeSliders = document.querySelectorAll('.volume-control input[type="range"]');

  volumeSliders.forEach(slider => {
    const percentage = volume * 100;
    slider.style.setProperty('--volume-percent', `${percentage}%`);

    // Set data attribute for color feedback
    if (volume < 0.3) {
      slider.setAttribute('data-volume', 'low');
    } else if (volume < 0.7) {
      slider.setAttribute('data-volume', 'medium');
    } else {
      slider.setAttribute('data-volume', 'high');
    }
  });
}

// Enhanced context clarity - update playlist info
function updatePlaylistContext(playlistName = 'Trending Hits', songCount = 0) {
  const playlistInfo = document.querySelector('.mobile-playlist-info');
  if (playlistInfo) {
    playlistInfo.innerHTML = `
      <div class="mobile-playlist-text">PLAYING FROM PLAYLIST</div>
      <div class="playlist-name">${playlistName}</div>
    `;

    // Make it clickable
    playlistInfo.onclick = () => {
      showNotification(`Viewing ${playlistName} playlist`, 'info', 2000);
      // Could navigate to playlist page here
    };
  }
}

// Enhanced control button states
function updateControlButtonStates() {
  const shuffleBtn = document.getElementById('fullscreenShuffle');
  const repeatBtn = document.getElementById('fullscreenRepeat');
  const mobileShuffleBtn = document.getElementById('mobileShuffleBtn');
  const mobileRepeatBtn = document.getElementById('mobileRepeatBtn');

  // Update shuffle button
  [shuffleBtn, mobileShuffleBtn].forEach(btn => {
    if (btn) {
      if (isShuffleEnabled) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  // Update repeat button
  [repeatBtn, mobileRepeatBtn].forEach(btn => {
    if (btn) {
      btn.classList.remove('active', 'repeat-one');

      if (repeatMode === 'all') {
        btn.classList.add('active');
        btn.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
      } else if (repeatMode === 'one') {
        btn.classList.add('active', 'repeat-one');
        btn.innerHTML = '<i class="bi bi-repeat-1"></i>';
      } else {
        btn.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
      }
    }
  });
}

// Enhanced progress bar with smooth seeking
function enhanceProgressBarInteraction() {
  const progressBars = document.querySelectorAll('.fullscreen-progress-bar');

  progressBars.forEach(progressBar => {
    const progressElement = progressBar.querySelector('.fullscreen-progress');
    const input = progressBar.querySelector('input[type="range"]');

    if (input && progressElement) {
      // Add seeking class during interaction
      input.addEventListener('mousedown', () => {
        progressBar.classList.add('seeking');
      });

      input.addEventListener('mouseup', () => {
        setTimeout(() => {
          progressBar.classList.remove('seeking');
        }, 300);
      });

      // Enhanced visual feedback during hover
      progressBar.addEventListener('mouseenter', () => {
        progressElement.style.boxShadow = '0 0 15px rgba(255, 165, 59, 0.6)';
      });

      progressBar.addEventListener('mouseleave', () => {
        progressElement.style.boxShadow = '0 0 12px rgba(255, 165, 59, 0.4)';
      });
    }
  });
}

// Initialize all fullscreen player enhancements
function initializeFullscreenPlayerEnhancements() {
  console.log('🎨 Initializing fullscreen player enhancements...');

  // Generate waveform
  generateWaveform();

  // Enhance progress bar interactions
  enhanceProgressBarInteraction();

  // Update initial states
  updateControlButtonStates();
  updatePlaylistContext();

  // Set up audio event listeners for enhanced features
  const audio = document.getElementById('audioElement');
  if (audio) {
    audio.addEventListener('play', () => {
      updateWaveformAnimation(true);
      updateBrandingOnSongChange();
    });

    audio.addEventListener('pause', () => {
      updateWaveformAnimation(false);
    });

    audio.addEventListener('volumechange', () => {
      updateVolumeVisualFeedback(audio.volume);
    });
  }

  // Set up control button click handlers
  const shuffleBtn = document.getElementById('fullscreenShuffle');
  const repeatBtn = document.getElementById('fullscreenRepeat');
  const mobileShuffleBtn = document.getElementById('mobileShuffleBtn');
  const mobileRepeatBtn = document.getElementById('mobileRepeatBtn');

  [shuffleBtn, mobileShuffleBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        toggleShuffle();
        updateControlButtonStates();
      });
    }
  });

  [repeatBtn, mobileRepeatBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        toggleRepeat();
        updateControlButtonStates();
      });
    }
  });

  // Initialize volume visual feedback
  updateVolumeVisualFeedback(0.8);

  console.log('✅ Fullscreen player enhancements initialized');
}

// Initialize mood filtering system
function initializeMoodFilteringSystem() {
  console.log('🎭 Initializing mood filtering system...');

  const filterButtons = document.querySelectorAll('.category-scroll .btn');

  filterButtons.forEach((btn, index) => {
    // Map button text to mood values
    const buttonText = btn.textContent.trim();
    let mood = 'all';

    switch (buttonText) {
      case 'All Music': mood = 'all'; break;
      case 'Romantic': mood = 'romantic'; break;
      case 'Dance': mood = 'dance'; break;
      case 'Sad': mood = 'sad'; break;
      case 'Party': mood = 'dance'; break; // Map party to dance
      case 'Classical': mood = 'classical'; break;
      case 'Rock': mood = 'rock'; break;
      case 'Pop': mood = 'pop'; break;
      case 'Hip Hop': mood = 'hiphop'; break;
      case 'Electronic': mood = 'electronic'; break;
      case 'Jazz': mood = 'jazz'; break;
      default: mood = 'all';
    }

    // Set data attribute
    btn.setAttribute('data-mood', mood);

    // Add click listener
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Apply filter
      applyMoodFilter(mood);

      console.log(`🎭 Filter applied: ${buttonText} (${mood})`);
      console.log(`📊 Results: ${filteredTrendingSongs.length} trending + ${filteredNewReleases.length} new releases`);
    });
  });

  console.log('✅ Mood filtering initialized with', filterButtons.length, 'buttons');

  // Test the mood enrichment with sample data
  setTimeout(() => {
    console.log('🧪 Testing mood enrichment...');
    const testSongs = [
      { name: 'Tum Hi Ho', primaryArtists: 'Arijit Singh' },
      { name: 'Party Tonight', primaryArtists: 'DJ Mix' },
      { name: 'Sad Song', primaryArtists: 'Emotional Artist' },
      { name: 'Rock Anthem', primaryArtists: 'Rock Band' }
    ];

    testSongs.forEach(song => {
      const enriched = enrichSong(song);
      console.log(`🎵 "${song.name}" → mood: ${enriched.mood}`);
    });
  }, 2000);
}

// Load liked songs and playlists from localStorage
function loadUserData() {
  try {
    const savedLikedSongs = localStorage.getItem('mehfilLikedSongs');
    if (savedLikedSongs) {
      likedSongs = JSON.parse(savedLikedSongs);
    }

    const savedPlaylists = localStorage.getItem('mehfilUserPlaylists');
    if (savedPlaylists) {
      userPlaylists = JSON.parse(savedPlaylists);
    }
  } catch (e) {
    console.error('Error loading user data:', e);
  }
}

// Save user data to localStorage
function saveUserData() {
  try {
    localStorage.setItem('mehfilLikedSongs', JSON.stringify(likedSongs));
    localStorage.setItem('mehfilUserPlaylists', JSON.stringify(userPlaylists));
  } catch (e) {
    console.error('Error saving user data:', e);
  }
}

// Add song to queue
function addToQueue(song, playNext = false) {
  if (!song) return;

  // If this is the first song, set it as current
  if (songQueue.length === 0) {
    songQueue.push(song);
    currentQueueIndex = 0;
    showNotification(`Added "${song.title}" to queue`, 'info');
    updateQueueDisplay();
    return;
  }

  if (playNext) {
    // Add after current song
    songQueue.splice(currentQueueIndex + 1, 0, song);
    // Update original queue if shuffle is enabled
    if (isShuffleEnabled && originalQueue.length > 0) {
      originalQueue.splice(currentQueueIndex + 1, 0, song);
    }
  } else {
    // Add to end of queue
    songQueue.push(song);
    // Update original queue if shuffle is enabled
    if (isShuffleEnabled && originalQueue.length > 0) {
      originalQueue.push(song);
    }
  }

  showNotification(`Added "${song.title}" to queue`, 'info');
  updateQueueDisplay();
}

// Remove song from queue
function removeFromQueue(index) {
  if (index >= 0 && index < songQueue.length) {
    const removedSong = songQueue.splice(index, 1)[0];

    // Also remove from original queue if shuffle is enabled
    if (isShuffleEnabled && originalQueue.length > 0) {
      const originalIndex = originalQueue.findIndex(song => song.id === removedSong.id);
      if (originalIndex >= 0) {
        originalQueue.splice(originalIndex, 1);
      }
    }

    // Adjust current index if necessary
    if (index <= currentQueueIndex) {
      currentQueueIndex = Math.max(0, currentQueueIndex - 1);
    }

    showNotification(`Removed "${removedSong.title}" from queue`, 'info');
    updateQueueDisplay();

    // If we removed the current song and there are more songs, play the next one
    if (index === currentQueueIndex && songQueue.length > 0) {
      const nextSong = songQueue[currentQueueIndex] || songQueue[currentQueueIndex - 1];
      if (nextSong) {
        currentQueueIndex = songQueue.indexOf(nextSong);
        loadSong(nextSong).then(() => {
          // Don't auto-play, just load
          updateQueueDisplay();
        });
      }
    }
  }
}

// Play next song in queue
function playNextInQueue() {
  // Handle repeat one mode
  if (repeatMode === 'one') {
    const currentSong = songQueue[currentQueueIndex];
    if (currentSong) {
      loadSong(currentSong).then(() => {
        playSong();
      });
      return true;
    }
  }

  // Normal next song logic
  if (currentQueueIndex < songQueue.length - 1) {
    currentQueueIndex++;
    const nextSong = songQueue[currentQueueIndex];
    loadSong(nextSong).then(() => {
      playSong();
      updateQueueDisplay();
    });
    return true;
  }

  // Handle repeat all mode - go back to beginning
  if (repeatMode === 'all' && songQueue.length > 0) {
    currentQueueIndex = 0;
    const firstSong = songQueue[currentQueueIndex];
    loadSong(firstSong).then(() => {
      playSong();
      updateQueueDisplay();
    });
    return true;
  }

  return false;
}

// Play previous song in queue
function playPreviousInQueue() {
  if (currentQueueIndex > 0) {
    currentQueueIndex--;
    const prevSong = songQueue[currentQueueIndex];
    loadSong(prevSong).then(() => {
      playSong();
    });
    return true;
  }
  return false;
}

// Toggle like status of a song
function toggleLikeSong(song) {
  if (!song || !song.id) return;

  const existingIndex = likedSongs.findIndex(s => s.id === song.id);

  if (existingIndex >= 0) {
    // Unlike the song
    likedSongs.splice(existingIndex, 1);
    showNotification(`Removed "${song.title}" from liked songs`, 'info');
  } else {
    // Like the song
    likedSongs.push(song);
    showNotification(`Added "${song.title}" to liked songs`, 'info');
  }

  saveUserData();
  updateLikeButtons();

  // Update favorites display if on favorites page
  if (document.getElementById('favorites-page').style.display !== 'none') {
    displayFavorites();
  }
}

// Check if song is liked
function isSongLiked(songId) {
  return likedSongs.some(s => s.id === songId);
}

// Update like buttons throughout the UI
function updateLikeButtons() {
  const likeButtons = document.querySelectorAll('.like-btn');
  likeButtons.forEach(btn => {
    const songId = btn.dataset.songId;
    if (isSongLiked(songId)) {
      btn.classList.add('liked');
      btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
    } else {
      btn.classList.remove('liked');
      btn.innerHTML = '<i class="bi bi-heart"></i>';
    }
  });
}

// Toggle shuffle mode
function toggleShuffle() {
  isShuffleEnabled = !isShuffleEnabled;

  const shuffleButton = document.getElementById('fullscreenShuffle');
  if (shuffleButton) {
    if (isShuffleEnabled) {
      shuffleButton.classList.add('active');
      // Store original queue order
      originalQueue = [...songQueue];
      // Shuffle the queue (except current song)
      shuffleQueue();
      showNotification('Shuffle enabled', 'info');
    } else {
      shuffleButton.classList.remove('active');
      // Restore original order
      if (originalQueue.length > 0) {
        restoreOriginalQueue();
      }
      showNotification('Shuffle disabled', 'info');
    }
  }

  // Save state
  localStorage.setItem('mehfilShuffleEnabled', isShuffleEnabled);
}

// Shuffle the queue while keeping current song at current position
function shuffleQueue() {
  if (songQueue.length <= 1) return;

  const currentSong = songQueue[currentQueueIndex];
  const beforeCurrent = songQueue.slice(0, currentQueueIndex);
  const afterCurrent = songQueue.slice(currentQueueIndex + 1);

  // Shuffle the songs after current
  for (let i = afterCurrent.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [afterCurrent[i], afterCurrent[j]] = [afterCurrent[j], afterCurrent[i]];
  }

  // Rebuild queue
  songQueue = [...beforeCurrent, currentSong, ...afterCurrent];
  updateQueueDisplay();
}

// Restore original queue order
function restoreOriginalQueue() {
  if (originalQueue.length === 0) return;

  const currentSong = songQueue[currentQueueIndex];
  // Find current song in original queue
  const originalIndex = originalQueue.findIndex(song => song.id === currentSong.id);

  if (originalIndex >= 0) {
    songQueue = [...originalQueue];
    currentQueueIndex = originalIndex;
  }

  updateQueueDisplay();
}

// Toggle repeat mode
function toggleRepeat() {
  const modes = ['off', 'all', 'one'];
  const currentIndex = modes.indexOf(repeatMode);
  repeatMode = modes[(currentIndex + 1) % modes.length];

  const repeatButton = document.getElementById('fullscreenRepeat');
  if (repeatButton) {
    repeatButton.classList.remove('active', 'repeat-one');

    if (repeatMode === 'all') {
      repeatButton.classList.add('active');
      repeatButton.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
      showNotification('Repeat all enabled', 'info');
    } else if (repeatMode === 'one') {
      repeatButton.classList.add('active', 'repeat-one');
      repeatButton.innerHTML = '<i class="bi bi-repeat-1"></i>';
      showNotification('Repeat one enabled', 'info');
    } else {
      repeatButton.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
      showNotification('Repeat disabled', 'info');
    }
  }

  // Save state
  localStorage.setItem('mehfilRepeatMode', repeatMode);
}

// Track song play for history and recommendations
function trackSongPlay(song, playTime = 0) {
  if (!song || !song.id) return;

  try {
    // Get existing play history from localStorage
    let playHistory = [];
    const savedHistory = localStorage.getItem('mehfilPlayHistory');
    if (savedHistory) {
      playHistory = JSON.parse(savedHistory);
    }

    // Find existing entry for this song
    const existingIndex = playHistory.findIndex(item => item.id === song.id);

    if (existingIndex >= 0) {
      // Update existing entry
      playHistory[existingIndex].playCount = (playHistory[existingIndex].playCount || 0) + 1;
      playHistory[existingIndex].lastPlayed = Date.now();
      playHistory[existingIndex].totalPlayTime = (playHistory[existingIndex].totalPlayTime || 0) + playTime;
    } else {
      // Add new entry
      playHistory.push({
        ...song,
        playCount: 1,
        lastPlayed: Date.now(),
        totalPlayTime: playTime
      });
    }

    // Keep only the last 100 songs
    if (playHistory.length > 100) {
      playHistory = playHistory.slice(-100);
    }

    // Save back to localStorage
    localStorage.setItem('mehfilPlayHistory', JSON.stringify(playHistory));

    console.log('Tracked song play:', song.title, 'Play time:', playTime);
  } catch (error) {
    console.error('Error tracking song play:', error);
  }
}

// Load saved playback settings
function loadPlaybackSettings() {
  const savedShuffle = localStorage.getItem('mehfilShuffleEnabled');
  const savedRepeat = localStorage.getItem('mehfilRepeatMode');

  if (savedShuffle === 'true') {
    isShuffleEnabled = true;
    const shuffleButton = document.getElementById('fullscreenShuffle');
    if (shuffleButton) shuffleButton.classList.add('active');
  }

  if (savedRepeat) {
    repeatMode = savedRepeat;
    const repeatButton = document.getElementById('fullscreenRepeat');
    if (repeatButton) {
      repeatButton.classList.remove('active', 'repeat-one');

      if (repeatMode === 'all') {
        repeatButton.classList.add('active');
      } else if (repeatMode === 'one') {
        repeatButton.classList.add('active', 'repeat-one');
        repeatButton.innerHTML = '<i class="bi bi-repeat-1"></i>';
      }
    }
  }
}

// Enhanced queue display functionality
function updateQueueDisplay() {
  console.log('Current queue:', songQueue.length, 'songs');

  // Update the "Up Next" section in fullscreen player
  const upNextList = document.getElementById('upNextList');
  if (upNextList && songQueue.length > 0) {
    upNextList.innerHTML = '';

    // Show next 5 songs in queue
    const nextSongs = songQueue.slice(currentQueueIndex + 1, currentQueueIndex + 6);

    if (nextSongs.length === 0) {
      upNextList.innerHTML = '<div class="empty-queue"><p>No more songs in queue</p></div>';
      return;
    }

    nextSongs.forEach((song, index) => {
      const queueIndex = currentQueueIndex + 1 + index;
      const item = document.createElement('div');
      item.className = 'up-next-item';
      item.dataset.queueIndex = queueIndex;

      const imageUrl = getImageUrl(song.image) || '/music.png';

      item.innerHTML = `
        <img src="${imageUrl}" alt="${song.title}" onerror="this.src='/music.png'">
        <div class="up-next-item-info">
          <div class="up-next-item-title">${song.title || song.name || 'Unknown Title'}</div>
          <div class="up-next-item-artist">${song.artist || song.more_info?.artistMap?.primary_artists?.[0]?.name || 'Unknown Artist'}</div>
        </div>
        <button class="remove-from-queue" onclick="removeFromQueue(${queueIndex})" title="Remove from queue">
          <i class="bi bi-x"></i>
        </button>
      `;

      // Add click handler to jump to song
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-from-queue')) {
          jumpToQueueIndex(queueIndex);
        }
      });

      upNextList.appendChild(item);
    });
  }
}

// Jump to specific song in queue
function jumpToQueueIndex(index) {
  if (index >= 0 && index < songQueue.length) {
    currentQueueIndex = index;
    const song = songQueue[currentQueueIndex];
    loadSong(song).then(() => {
      playSong();
      updateQueueDisplay();
    });
  }
}

// Show/hide queue panel
function toggleQueuePanel() {
  const upNext = document.querySelector('.up-next');
  if (upNext) {
    const isVisible = upNext.classList.contains('visible');

    if (isVisible) {
      upNext.classList.remove('visible');
      upNext.style.display = 'none';
    } else {
      upNext.style.display = 'block';
      // Small delay to ensure display is applied before adding visible class
      setTimeout(() => {
        upNext.classList.add('visible');
      }, 10);
    }

    const playlistButton = document.getElementById('fullscreenPlaylist');
    if (playlistButton) {
      playlistButton.classList.toggle('active');
    }
  }
}

// ======== ENHANCED FETCH FUNCTIONS WITH PAGINATION ========

async function apiFetchJson(url, options = {}) {
  const { timeout = 12000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(fetchOptions.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchTrendingSongs(page = 0, append = false) {
  try {
    const url = `${API_BASE_URL}${ENDPOINTS.trendingSongs}&page=${page}&limit=10`;
    console.log('🎵 Fetching trending songs from:', url);
    const data = await apiFetchJson(url);
    console.log('📊 Trending songs API response:', data);

    if (data?.success && data?.data?.results) {
      console.log(`✅ Trending songs page ${page} loaded:`, data.data.results.length, 'songs');

      // Enrich songs with mood data
      const enrichedSongs = data.data.results.map(enrichSong);

      // Store in global arrays for filtering
      if (append) {
        allTrendingSongs = [...allTrendingSongs, ...enrichedSongs];
        filteredTrendingSongs = [...filteredTrendingSongs, ...enrichedSongs];
      } else {
        allTrendingSongs = enrichedSongs;
        filteredTrendingSongs = enrichedSongs;
      }

      console.log('🎭 Songs enriched with moods:', enrichedSongs.map(s => `${s.name} (${s.mood})`));

      // Render the enriched songs
      renderTrendingSongs(enrichedSongs, append);
      return enrichedSongs.length > 0;
    } else {
      console.warn('⚠️ Trending songs API returned no results or invalid format');
      console.log('Data structure:', data);
      return false;
    }
  } catch (error) {
    console.error("❌ Error fetching trending songs:", error);
    showNotification(`Error loading trending songs: ${error.message}`, "error");
    return false;
  }
}

async function fetchNewReleases(page = 0, append = false) {
  try {
    const data = await apiFetchJson(
      `${API_BASE_URL}${ENDPOINTS.newReleasesAlbums}&page=${page}&limit=10`
    );

    if (data?.success && data?.data?.results) {
      console.log(`New releases page ${page} loaded:`, data.data.results.length);

      // Enrich albums/songs with mood data
      const enrichedReleases = data.data.results.map(enrichSong);

      // Store in global arrays for filtering
      if (append) {
        allNewReleases = [...allNewReleases, ...enrichedReleases];
        filteredNewReleases = [...filteredNewReleases, ...enrichedReleases];
      } else {
        allNewReleases = enrichedReleases;
        filteredNewReleases = enrichedReleases;
      }

      console.log('🎭 New releases enriched with moods:', enrichedReleases.map(s => `${s.name} (${s.mood})`));

      // Render the enriched releases
      renderNewReleases(enrichedReleases, append);
      return enrichedReleases.length > 0;
    }
    return false;
  } catch (error) {
    console.error("Error fetching new releases:", error);
    showNotification(`Error loading new releases: ${error.message}`, "error");
    return false;
  }
}

// ======== PAGE NAVIGATION FUNCTIONS ========

function showHomePage() {
  console.log('Navigating to Home page');

  // Hide all page-content divs
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Show main content
  const mainContent = document.querySelector('.main-area > .mehfil-intro');
  if (mainContent) {
    mainContent.parentElement.style.display = 'block';
  }

  // Update sidebar navigation
  document.querySelectorAll('.sidebar ul li').forEach(item => {
    item.classList.remove('active');
  });
  const homeNav = document.getElementById('nav-home');
  if (homeNav) {
    homeNav.classList.add('active');
  }
}

function showTrendingPage() {
  console.log('Navigating to Trending page');

  // Hide all page-content divs and main content
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Hide main content sections
  const mainSections = ['.mehfil-intro', '.featured-playlists', '.trending', '.nrelease', '.artists', '.playlist'];
  mainSections.forEach(selector => {
    const section = document.querySelector(selector);
    if (section) section.style.display = 'none';
  });

  // Show trending page
  const trendingPage = document.getElementById('trending-page');
  if (trendingPage) {
    trendingPage.style.display = 'block';

    // Load trending songs if not already loaded
    if (trendingPageState.currentPage === 0) {
      loadTrendingPageSongs();
    }
  }
}

function showLatestPage() {
  console.log('Navigating to Latest page');

  // Hide all page-content divs and main content
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Hide main content sections
  const mainSections = ['.mehfil-intro', '.featured-playlists', '.trending', '.nrelease', '.artists', '.playlist'];
  mainSections.forEach(selector => {
    const section = document.querySelector(selector);
    if (section) section.style.display = 'none';
  });

  // Show latest page
  const latestPage = document.getElementById('latest-page');
  if (latestPage) {
    latestPage.style.display = 'block';

    // Load latest songs if not already loaded
    if (latestPageState.currentPage === 0) {
      loadLatestPageSongs();
    }
  }
}

function showArtistsPage() {
  console.log('Navigating to Artists page');

  // Hide all page-content divs and main content
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Hide main content sections
  const mainSections = ['.mehfil-intro', '.featured-playlists', '.trending', '.nrelease', '.artists', '.playlist'];
  mainSections.forEach(selector => {
    const section = document.querySelector(selector);
    if (section) section.style.display = 'none';
  });

  // Show artists page
  const artistsPage = document.getElementById('artists-page');
  if (artistsPage) {
    artistsPage.style.display = 'block';

    // Load artists if not already loaded
    if (artistsPageState.currentPage === 0) {
      loadArtistsPageSongs();
    }
  }
}

function showPlaylistsPage() {
  console.log('Navigating to Playlists page');

  // Hide all page-content divs and main content
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Hide main content sections
  const mainSections = ['.mehfil-intro', '.featured-playlists', '.trending', '.nrelease', '.artists', '.playlist'];
  mainSections.forEach(selector => {
    const section = document.querySelector(selector);
    if (section) section.style.display = 'none';
  });

  // Show playlists page
  const playlistsPage = document.getElementById('playlists-page');
  if (playlistsPage) {
    playlistsPage.style.display = 'block';

    // Load playlists content
    displaySuggestedSongs();
    displayUserPlaylists();
  }
}

function goBackToPreviousPage() {
  // For now, just go back to home
  showHomePage();
}

// ======== PAGE LOADING FUNCTIONS ========

async function loadTrendingPageSongs() {
  const container = document.getElementById('trending-page-container');
  const loading = document.getElementById('trending-loading');
  const pagination = document.getElementById('trending-pagination');

  if (!container) return;

  trendingPageState.isLoading = true;
  if (loading) loading.style.display = 'flex';

  try {
    const url = `${API_BASE_URL}${ENDPOINTS.trendingSongs}&page=${trendingPageState.currentPage}&limit=20`;
    console.log('Fetching trending page songs:', url);

    const data = await apiFetchJson(url);

    if (data?.success && data?.data?.results && data.data.results.length > 0) {
      renderSongsGrid(container, data.data.results);
      trendingPageState.hasMorePages = data.data.results.length >= 20;

      if (pagination) {
        pagination.style.display = 'flex';
        updatePaginationControls('trending', trendingPageState.currentPage, trendingPageState.hasMorePages);
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>No trending songs found</h3><p>Please try again later</p></div>';
    }
  } catch (error) {
    console.error('Error loading trending page:', error);
    container.innerHTML = '<div class="empty-state"><h3>Error loading songs</h3><p>Please try again</p></div>';
  } finally {
    trendingPageState.isLoading = false;
    if (loading) loading.style.display = 'none';
  }
}

async function loadLatestPageSongs() {
  const container = document.getElementById('latest-page-container');
  const loading = document.getElementById('latest-loading');
  const pagination = document.getElementById('latest-pagination');

  if (!container) return;

  latestPageState.isLoading = true;
  if (loading) loading.style.display = 'flex';

  try {
    const url = `${API_BASE_URL}${ENDPOINTS.newReleasesAlbums}&page=${latestPageState.currentPage}&limit=20`;
    console.log('=== DEBUG: Latest Songs API Request ===');
    console.log('URL:', url);

    const data = await apiFetchJson(url);

    console.log('=== DEBUG: Latest Songs API Response ===');
    console.log('Data:', data);

    if (data?.success && data?.data?.results && data.data.results.length > 0) {
      console.log('✅ Found', data.data.results.length, 'latest songs');
      renderSongsGrid(container, data.data.results);
      latestPageState.hasMorePages = data.data.results.length >= 20;

      if (pagination) {
        pagination.style.display = 'flex';
        updatePaginationControls('latest', latestPageState.currentPage, latestPageState.hasMorePages);
      }
    } else {
      console.warn('No results found in API response');
      container.innerHTML = '<div class="empty-state"><h3>No latest releases found</h3><p>Please try again later</p></div>';
    }
  } catch (error) {
    console.error('Error loading latest page:', error);
    container.innerHTML = '<div class="empty-state"><h3>Error loading songs</h3><p>Please try again</p></div>';
  } finally {
    latestPageState.isLoading = false;
    if (loading) loading.style.display = 'none';
  }
}

async function loadArtistsPageSongs() {
  const container = document.getElementById('artists-page-container');
  const loading = document.getElementById('artists-loading');
  const pagination = document.getElementById('artists-pagination');

  if (!container) return;

  artistsPageState.isLoading = true;
  if (loading) loading.style.display = 'flex';

  try {
    const query = artistsPageState.currentCategory === 'popular'
      ? 'arijit singh shreya ghoshal atif aslam'
      : 'badshah honey singh raftaar';

    const url = `${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(query)}&language=hindi&page=${artistsPageState.currentPage}&limit=20`;
    console.log('Fetching artists page songs:', url);

    const data = await apiFetchJson(url);

    if (data?.success && data?.data?.results && data.data.results.length > 0) {
      renderSongsGrid(container, data.data.results);
      artistsPageState.hasMorePages = data.data.results.length >= 20;

      if (pagination) {
        pagination.style.display = 'flex';
        updatePaginationControls('artists', artistsPageState.currentPage, artistsPageState.hasMorePages);
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>No artist songs found</h3><p>Please try again later</p></div>';
    }
  } catch (error) {
    console.error('Error loading artists page:', error);
    container.innerHTML = '<div class="empty-state"><h3>Error loading songs</h3><p>Please try again</p></div>';
  } finally {
    artistsPageState.isLoading = false;
    if (loading) loading.style.display = 'none';
  }
}

function renderSongsGrid(container, songs) {
  container.innerHTML = '';

  songs.forEach((song, index) => {
    const card = createSongCard(song, index, false, true);
    container.appendChild(card);
  });
}

function updatePaginationControls(pageType, currentPage, hasMore) {
  const prevBtn = document.getElementById(`${pageType}-prev-btn`);
  const nextBtn = document.getElementById(`${pageType}-next-btn`);
  const pageInfo = document.getElementById(`${pageType}-page-info`);

  if (prevBtn) {
    prevBtn.disabled = currentPage === 0;
    prevBtn.onclick = () => navigatePage(pageType, -1);
  }

  if (nextBtn) {
    nextBtn.disabled = !hasMore;
    nextBtn.onclick = () => navigatePage(pageType, 1);
  }

  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPage + 1}`;
  }
}

function navigatePage(pageType, direction) {
  const stateMap = {
    'trending': trendingPageState,
    'latest': latestPageState,
    'artists': artistsPageState
  };

  const loaderMap = {
    'trending': loadTrendingPageSongs,
    'latest': loadLatestPageSongs,
    'artists': loadArtistsPageSongs
  };

  const state = stateMap[pageType];
  const loader = loaderMap[pageType];

  if (!state || !loader) return;

  const newPage = state.currentPage + direction;
  if (newPage < 0) return;

  state.currentPage = newPage;
  loader();

  // Scroll to top of page
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// Load music history from localStorage
function loadMusicHistory() {
  const savedHistory = localStorage.getItem('mehfilMusicHistory');
  if (savedHistory) {
    try {
      musicHistory = { ...musicHistory, ...JSON.parse(savedHistory) };
      console.log('Music history loaded:', musicHistory);
    } catch (e) {
      console.error('Error parsing music history:', e);
    }
  }
}

// Save music history to localStorage
function saveMusicHistory() {
  try {
    localStorage.setItem('mehfilMusicHistory', JSON.stringify(musicHistory));
  } catch (e) {
    console.error('Error saving music history:', e);
  }
}

// Add song to play history
function addToPlayHistory(song, playTime = 0) {
  if (!song || !song.id) return;

  const existingIndex = musicHistory.playHistory.findIndex(item => item.song.id === song.id);

  if (existingIndex >= 0) {
    // Update existing entry
    musicHistory.playHistory[existingIndex].playCount++;
    musicHistory.playHistory[existingIndex].lastPlayed = Date.now();
    musicHistory.playHistory[existingIndex].totalPlayTime += playTime;
  } else {
    // Add new entry
    musicHistory.playHistory.push({
      song: song,
      playCount: 1,
      lastPlayed: Date.now(),
      totalPlayTime: playTime
    });
  }

  // Keep only last 100 songs in history
  if (musicHistory.playHistory.length > 100) {
    musicHistory.playHistory = musicHistory.playHistory
      .sort((a, b) => b.lastPlayed - a.lastPlayed)
      .slice(0, 100);
  }

  saveMusicHistory();
  updateSuggestions();
}

// Save last played song with current time
function saveLastPlayed(song, currentTime) {
  if (!song) return;

  musicHistory.lastPlayed = {
    song: song,
    currentTime: currentTime || 0,
    timestamp: Date.now()
  };

  saveMusicHistory();
}

// Get most frequent songs
function getMostFrequentSongs(limit = 10) {
  return musicHistory.playHistory
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);
}

// Update suggestions based on listening history
function updateSuggestions() {
  const frequentSongs = getMostFrequentSongs(5);
  const recentSongs = musicHistory.playHistory
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
    .slice(0, 5);

  // Combine and deduplicate
  const baseSongs = [...frequentSongs, ...recentSongs];
  const uniqueBaseSongs = baseSongs.filter((item, index, self) =>
    index === self.findIndex(t => t.song.id === item.song.id)
  );

  // For now, we'll use the user's listening history as suggestions
  // In a real app, this would call an API for similar songs
  musicHistory.suggestions = uniqueBaseSongs.map(item => item.song);

  saveMusicHistory();

  // Only update UI if we're on the relevant pages
  // Don't automatically show on homepage anymore
}

// Display favorites on the dedicated favorites page
function displayFavorites() {
  const container = document.getElementById('favorites-container');
  const emptyState = document.querySelector('.empty-favorites');

  console.log('displayFavorites called', { container, emptyState });

  if (!container) {
    console.log('Favorites container not found');
    return;
  }

  const frequentSongs = getMostFrequentSongs(20); // Show more on dedicated page
  console.log('Frequent songs for favorites:', frequentSongs);

  if (frequentSongs.length === 0) {
    console.log('No frequent songs, showing empty state');
    container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  console.log('Showing favorites with', frequentSongs.length, 'songs');
  container.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';
  container.innerHTML = '';

  frequentSongs.forEach((item, index) => {
    console.log(`Creating favorite card for song ${index}:`, item.song.title, 'URL:', item.song.url);
    const card = createSongCard(item.song, index, false, true);

    // Add play count badge
    const badge = document.createElement('div');
    badge.className = 'play-count-badge';
    badge.innerHTML = `<i class="bi bi-play-fill"></i> ${item.playCount}`;
    card.appendChild(badge);

    container.appendChild(card);
  });

  // Store reference for click handlers
  const sectionSongs = frequentSongs.map(item => item.song);
  container.dataset.sectionSongs = JSON.stringify(sectionSongs);
  console.log('Stored favorites songs:', sectionSongs.length);
}

// Display suggested songs on the playlists page
function displaySuggestedSongs() {
  const container = document.getElementById('suggested-container');

  console.log('displaySuggestedSongs called', { container });

  if (!container) {
    console.log('Suggested container not found');
    return;
  }

  const suggestions = musicHistory.suggestions || [];
  console.log('Suggestions:', suggestions);

  if (suggestions.length === 0) {
    console.log('No suggestions, hiding container');
    container.innerHTML = '<div class="empty-state"><i class="bi bi-magic"></i><h3>No Suggestions Yet</h3><p>Start listening to songs to get personalized recommendations!</p></div>';
    return;
  }

  console.log('Showing suggestions with', suggestions.length, 'songs');
  container.innerHTML = '';

  suggestions.slice(0, 15).forEach((song, index) => { // Show more on dedicated page
    const card = createSongCard(song, index, false, true);

    // Add suggestion badge
    const badge = document.createElement('div');
    badge.className = 'suggestion-badge';
    badge.innerHTML = `<i class="bi bi-magic"></i> Suggested`;
    card.appendChild(badge);

    container.appendChild(card);
  });

  // Store reference for click handlers
  container.dataset.sectionSongs = JSON.stringify(suggestions.slice(0, 15));
}

// Display user playlists (placeholder for now)
function displayUserPlaylists() {
  const container = document.getElementById('user-playlists-container');
  const emptyState = document.querySelector('.empty-playlists');

  if (!container) return;

  // For now, show empty state since we don't have user playlist functionality yet
  container.innerHTML = '';
  if (emptyState) emptyState.style.display = 'block';
}

// Restore last played song and position
function restoreLastPlayed() {
  if (musicHistory.lastPlayed && musicHistory.lastPlayed.song) {
    const lastSong = musicHistory.lastPlayed.song;
    const lastPosition = musicHistory.lastPlayed.currentTime || 0;

    console.log('Restoring last played song:', lastSong.title, 'at position:', lastPosition);

    // Add the last played song to the current songs array if not already there
    if (!songs.find(s => s.id === lastSong.id)) {
      songs.unshift(lastSong);
    }

    // Find the song index
    const songIndex = songs.findIndex(s => s.id === lastSong.id);
    if (songIndex >= 0) {
      currentSongIndex = songIndex;
      loadSong(songIndex).then(() => {
        // Set the audio position but don't auto-play
        if (audio && lastPosition > 0) {
          audio.currentTime = lastPosition;
        }
        updatePlayerUI(lastSong);
        showNotification(`Restored: "${lastSong.title}" - Click play to resume`, 'info');
      });
    }
  }
}

// Populate history with real songs from current session (for demo purposes)
function populateHistoryWithRealSongs() {
  console.log('populateHistoryWithRealSongs called');
  console.log('Current songs array:', songs ? songs.length : 'undefined', 'songs');
  console.log('Current history length:', musicHistory.playHistory.length);

  // Check if we have songs from any source
  let availableSongs = [];

  // Try to get songs from trending container
  const trendingContainer = document.getElementById('trending-songs-container');
  if (trendingContainer && trendingContainer.children.length > 0) {
    console.log('Found trending songs in DOM');
    // Get songs from the trending section
    for (let i = 0; i < Math.min(5, trendingContainer.children.length); i++) {
      const card = trendingContainer.children[i];
      if (card.dataset.url && card.dataset.url !== '#' && card.dataset.title) {
        availableSongs.push({
          id: `trending_${i}`,
          title: card.dataset.title,
          artist: card.dataset.artist || 'Unknown Artist',
          url: card.dataset.url,
          cover: card.querySelector('img')?.src || '/music.png'
        });
      }
    }
  }

  // If no trending songs, try from global songs array
  if (availableSongs.length === 0 && songs && songs.length > 0) {
    console.log('Using global songs array');
    availableSongs = songs.slice(0, 5).filter(song =>
      song && song.id && song.url && song.url !== '#'
    );
  }

  console.log('Available songs for history:', availableSongs.length);

  // Only populate if we have no history and we have available songs
  if (musicHistory.playHistory.length === 0 && availableSongs.length > 0) {
    console.log('Populating history with', availableSongs.length, 'real songs...');

    availableSongs.forEach((song, index) => {
      console.log(`Adding song ${index}:`, song.title, 'URL:', song.url);
      musicHistory.playHistory.push({
        song: song,
        playCount: Math.floor(Math.random() * 10) + 1, // Random play count 1-10
        lastPlayed: Date.now() - (index * 3600000), // Different hours ago
        totalPlayTime: Math.floor(Math.random() * 180) + 60 // Random play time 1-4 minutes
      });
    });

    // Set a last played song if we have any
    if (musicHistory.playHistory.length > 0) {
      musicHistory.lastPlayed = {
        song: musicHistory.playHistory[0].song,
        currentTime: Math.floor(Math.random() * 60), // Random position
        timestamp: Date.now()
      };
    }

    saveMusicHistory();
    updateSuggestions();

    console.log('Real song history created:', musicHistory.playHistory.length, 'songs');
  } else {
    console.log('Not populating history - either have history already or no available songs');
  }
}

// ======== MOOD FILTERING SYSTEM ========
let currentMoodFilter = 'all'; // Track current filter
let allSongs = []; // Store all songs for filtering

function setupMoodFilters() {
  const filterButtons = document.querySelectorAll('.category-scroll .btn');

  filterButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();

      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Get filter value from button text
      const filterText = button.textContent.trim();
      const filterValue = getMoodFilterValue(filterText);

      console.log('🎭 Filter clicked:', filterText, '→', filterValue);

      // Update current filter
      currentMoodFilter = filterValue;

      // Apply filter to current songs
      applyMoodFilter(filterValue);

      // Show notification
      showNotification(`Filtered by: ${filterText}`, 'info');
    });
  });

  console.log('🎭 Mood filters initialized with', filterButtons.length, 'buttons');
}

function getMoodFilterValue(buttonText) {
  const filterMap = {
    'All Bollywood': 'all',
    'Romantic': 'romantic',
    'Dance': 'dance',
    'Sad': 'sad',
    'Party': 'dance', // Map party to dance
    'Classical': 'classical',
    'Item Songs': 'item',
    'Devotional': 'devotional',
    'Sufi': 'sufi',
    '90s Hits': '90s',
    '2000s Hits': '2000s',
    'Latest 2024': 'latest2024'
  };

  return filterMap[buttonText] || 'all';
}

function applyMoodFilter(mood) {
  console.log('🎭 Applying mood filter:', mood);

  let totalVisible = 0;
  let totalSongs = 0;

  // Get all song containers on the homepage
  const trendingContainer = document.getElementById('trending-songs-container');
  const newReleasesContainer = document.getElementById('new-releases-container');

  if (trendingContainer) {
    const result = filterSongsInContainer(trendingContainer, mood);
    totalVisible += result.visible;
    totalSongs += result.total;
  }

  if (newReleasesContainer) {
    const result = filterSongsInContainer(newReleasesContainer, mood);
    totalVisible += result.visible;
    totalSongs += result.total;
  }

  // Also filter any other song containers that might be visible
  const songGrids = document.querySelectorAll('.song-grid');
  songGrids.forEach(grid => {
    if (grid.style.display !== 'none') {
      const result = filterSongsInContainer(grid, mood);
      totalVisible += result.visible;
      totalSongs += result.total;
    }
  });

  // Show filter results summary
  if (mood !== 'all' && totalSongs > 0) {
    showNotification(`Found ${totalVisible} ${mood} songs out of ${totalSongs} total`, 'info');
  }
}

function filterSongsInContainer(container, mood) {
  const cards = container.querySelectorAll('.card, .grid-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const songMood = card.dataset.mood || 'bollywood';

    if (mood === 'all' || songMood === mood) {
      card.style.display = 'block';
      card.style.opacity = '1';
      visibleCount++;
    } else {
      card.style.display = 'none';
      card.style.opacity = '0';
    }
  });

  console.log(`🎭 Filtered ${container.id}: ${visibleCount}/${cards.length} songs visible`);

  // Show empty state if no songs match
  if (visibleCount === 0 && mood !== 'all') {
    showEmptyFilterState(container, mood);
  } else {
    hideEmptyFilterState(container);
  }

  return { visible: visibleCount, total: cards.length };
}

function showEmptyFilterState(container, mood) {
  // Remove existing empty state
  const existingEmpty = container.querySelector('.filter-empty-state');
  if (existingEmpty) {
    existingEmpty.remove();
  }

  // Create empty state element
  const emptyState = document.createElement('div');
  emptyState.className = 'filter-empty-state';
  emptyState.innerHTML = `
    <div class="empty-state">
      <i class="bi bi-music-note-beamed"></i>
      <h3>No ${mood} songs found</h3>
      <p>Try a different mood or browse all Bollywood songs</p>
      <button class="btn-primary" onclick="resetMoodFilter()">
        <i class="bi bi-arrow-clockwise"></i> Show All Songs
      </button>
    </div>
  `;

  container.appendChild(emptyState);
}

function hideEmptyFilterState(container) {
  const emptyState = container.querySelector('.filter-empty-state');
  if (emptyState) {
    emptyState.remove();
  }
}

function resetMoodFilter() {
  // Reset to "All Bollywood" filter
  const allButton = document.querySelector('.category-scroll .btn');
  if (allButton) {
    allButton.click();
  }
}

// Test function to debug shuffle and repeat functionality
function testShuffleRepeat() {
  console.log('=== TESTING SHUFFLE & REPEAT FUNCTIONALITY ===');

  // First, add some test songs to the queue if it's empty
  if (songQueue.length === 0) {
    console.log('Adding test songs to queue...');
    const testSongs = [
      {
        id: 'test1',
        title: 'Test Song 1',
        artist: 'Test Artist 1',
        url: 'songs/ek-villain.mp3'
      },
      {
        id: 'test2',
        title: 'Test Song 2',
        artist: 'Test Artist 2',
        url: 'songs/kabir-singh.mp3'
      },
      {
        id: 'test3',
        title: 'Test Song 3',
        artist: 'Test Artist 3',
        url: 'songs/narayan.mp3'
      }
    ];

    testSongs.forEach(song => addToQueue(song));
  }

  console.log('Current queue:', songQueue.length, 'songs');
  console.log('Shuffle enabled:', isShuffleEnabled);
  console.log('Repeat mode:', repeatMode);
}

// ======== ENHANCED SIDEBAR FUNCTIONALITY ========
function enhanceSidebarInteractions() {
  const sidebarItems = document.querySelectorAll('.sidebar ul li');

  sidebarItems.forEach(item => {
    // Add pulsing animation for active items
    if (item.classList.contains('active')) {
      item.style.animation = 'glowPulse 2s ease-in-out infinite';
    }

    // Enhanced hover effects
    item.addEventListener('mouseenter', () => {
      if (!item.classList.contains('active')) {
        item.style.transform = 'translateX(8px)';
        item.style.background = 'rgba(255, 255, 255, 0.08)';
      }
    });

    item.addEventListener('mouseleave', () => {
      if (!item.classList.contains('active')) {
        item.style.transform = 'translateX(0)';
        item.style.background = '';
      }
    });
  });

  // Move logout to bottom with enhanced styling
  const logoutItem = document.getElementById('logout');
  if (logoutItem) {
    logoutItem.style.marginTop = 'auto';
    logoutItem.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
    logoutItem.style.paddingTop = '20px';
  }
}

// ======== ENHANCED SEARCH UX ========
function enhanceSearchExperience() {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');

  if (!searchInput || !searchButton) return;

  // Add focus glow effect
  searchInput.addEventListener('focus', () => {
    searchInput.parentElement.style.boxShadow = '0 0 20px rgba(255, 165, 59, 0.4)';
    searchInput.parentElement.style.transform = 'scale(1.02)';

    // Animate search icon
    const icon = searchButton.querySelector('i');
    if (icon) {
      icon.style.animation = 'searchIconPulse 0.6s ease';
    }
  });

  searchInput.addEventListener('blur', () => {
    searchInput.parentElement.style.boxShadow = '';
    searchInput.parentElement.style.transform = '';
  });

  // Enhanced placeholder animation
  searchInput.addEventListener('focus', () => {
    searchInput.style.color = 'rgba(255, 165, 59, 0.9)';
  });

  searchInput.addEventListener('blur', () => {
    searchInput.style.color = '';
  });
}

// ======== ENHANCED MINI PLAYER FEEDBACK ========
function enhanceMiniPlayerFeedback() {
  const miniPlayerImage = document.getElementById('miniPlayerImage');
  const miniPlayer = document.getElementById('miniPlayer');

  if (!miniPlayerImage || !miniPlayer) return;

  // Add album art rotation animation when playing
  const audio = document.getElementById('audioElement');
  if (audio) {
    audio.addEventListener('play', () => {
      miniPlayerImage.style.animation = 'spin 10s linear infinite';
      miniPlayer.classList.add('playing');
    });

    audio.addEventListener('pause', () => {
      miniPlayerImage.style.animation = '';
      miniPlayer.classList.remove('playing');
    });
  }

  // Add hover tooltips to controls
  const controls = miniPlayer.querySelectorAll('button');
  controls.forEach(button => {
    button.addEventListener('mouseenter', (e) => {
      const tooltip = document.createElement('div');
      tooltip.className = 'control-tooltip';
      tooltip.textContent = button.title || button.getAttribute('aria-label') || 'Control';
      tooltip.style.cssText = `
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        white-space: nowrap;
        z-index: 1000;
        opacity: 0;
        animation: tooltipFadeIn 0.3s ease forwards;
      `;

      button.style.position = 'relative';
      button.appendChild(tooltip);
    });

    button.addEventListener('mouseleave', () => {
      const tooltip = button.querySelector('.control-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    });
  });
}

// ======== ENHANCED CATEGORY FILTER INTERACTIONS ========
function enhanceCategoryFilters() {
  const filterButtons = document.querySelectorAll('.category-scroll .btn');

  filterButtons.forEach((button, index) => {
    // Add song count data attribute (mock data for demo)
    const songCounts = {
      'All Music': 150,
      'Romantic': 45,
      'Dance': 32,
      'Sad': 28,
      'Party': 35,
      'Classical': 18,
      'Rock': 22,
      'Pop': 38,
      'Hip Hop': 15,
      'Electronic': 12,
      'Jazz': 8,
      'Latest 2024': 42
    };

    const buttonText = button.textContent.trim();
    const count = songCounts[buttonText] || Math.floor(Math.random() * 50) + 10;
    button.setAttribute('data-count', `${count} songs`);

    // Enhanced hover effects with shimmer
    button.addEventListener('mouseenter', () => {
      if (!button.classList.contains('active')) {
        button.style.background = 'rgba(255, 165, 59, 0.15)';
        button.style.borderColor = 'var(--accent-primary)';
        button.style.color = 'var(--accent-primary)';
        button.style.transform = 'scale(1.05) translateY(-2px)';
        button.style.boxShadow = '0 4px 15px rgba(255, 165, 59, 0.3)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active')) {
        button.style.background = '';
        button.style.borderColor = '';
        button.style.color = '';
        button.style.transform = '';
        button.style.boxShadow = '';
      }
    });

    // Add glow effect for active button
    if (button.classList.contains('active')) {
      button.style.boxShadow = '0 6px 20px rgba(255, 165, 59, 0.5)';
      button.style.transform = 'scale(1.08) translateY(-3px)';
    }
  });
}

// ======== FULLSCREEN PLAYER CONTEXT IMPROVEMENTS ========
function enhanceFullscreenPlayerContext() {
  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  const fullscreenSongTitle = document.getElementById('fullscreenSongTitle');

  if (!fullscreenPlayer) return;

  // Add breadcrumb navigation
  const header = fullscreenPlayer.querySelector('.fullscreen-header');
  if (header && !header.querySelector('.player-breadcrumb')) {
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'player-breadcrumb';
    breadcrumb.innerHTML = `
      <span class="breadcrumb-item">Home</span>
      <i class="bi bi-chevron-right"></i>
      <span class="breadcrumb-item">Trending</span>
      <i class="bi bi-chevron-right"></i>
      <span class="breadcrumb-current">Now Playing</span>
    `;
    breadcrumb.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    header.insertBefore(breadcrumb, header.firstChild);
  }

  // Add smooth open/close animations
  const expandButton = document.getElementById('expandPlayer');
  const closeButton = document.getElementById('closeFullscreen');

  if (expandButton) {
    expandButton.addEventListener('click', () => {
      fullscreenPlayer.style.opacity = '0';
      fullscreenPlayer.style.transform = 'scale(0.9)';
      fullscreenPlayer.classList.add('active');

      // Animate in
      requestAnimationFrame(() => {
        fullscreenPlayer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        fullscreenPlayer.style.opacity = '1';
        fullscreenPlayer.style.transform = 'scale(1)';
      });
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      fullscreenPlayer.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      fullscreenPlayer.style.opacity = '0';
      fullscreenPlayer.style.transform = 'scale(0.95)';

      setTimeout(() => {
        fullscreenPlayer.classList.remove('active');
        fullscreenPlayer.style.transition = '';
        fullscreenPlayer.style.opacity = '';
        fullscreenPlayer.style.transform = '';
      }, 300);
    });
  }
}

// ======== LOADING STATES AND SKELETON LOADERS ========
function addLoadingStates() {
  // Add skeleton loader for song cards
  function createSkeletonCard() {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton-image"></div>
      <div class="skeleton-content">
        <div class="skeleton-title"></div>
        <div class="skeleton-artist"></div>
      </div>
    `;
    skeleton.style.cssText = `
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      overflow: hidden;
      animation: skeletonPulse 1.5s ease-in-out infinite;
    `;

    return skeleton;
  }

  // Show loading state when fetching songs
  const originalFetchTrendingSongs = window.fetchTrendingSongs;
  if (originalFetchTrendingSongs) {
    window.fetchTrendingSongs = async function (page = 0, append = false) {
      const container = document.getElementById('trending-songs-container');
      if (container && !append) {
        // Show skeleton loaders
        container.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          container.appendChild(createSkeletonCard());
        }
      }

      return await originalFetchTrendingSongs(page, append);
    };
  }
}

// ======== EMPTY STATE HANDLING ========
function handleEmptyStates() {
  // Check for empty containers and show appropriate messages
  const containers = [
    { id: 'trending-songs-container', message: 'No trending songs available', icon: 'bi-fire' },
    { id: 'new-releases-container', message: 'No new releases found', icon: 'bi-music-note-beamed' },
    { id: 'popular-artists-container', message: 'No artists found', icon: 'bi-mic' },
    { id: 'featured-playlists-container', message: 'No playlists available', icon: 'bi-music-note-list' }
  ];

  containers.forEach(({ id, message, icon }) => {
    const container = document.getElementById(id);
    if (container && container.children.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state-container';
      emptyState.innerHTML = `
        <div class="empty-state">
          <i class="bi ${icon}"></i>
          <h3>${message}</h3>
          <p>Try refreshing the page or check your connection</p>
          <button class="btn-secondary" onclick="location.reload()">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      `;
      container.appendChild(emptyState);
    }
  });
}

// ======== INITIALIZATION ========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎵 Initializing enhanced UI features...');

  // Initialize all enhancements
  setTimeout(() => {
    enhanceSidebarInteractions();
    enhanceSearchExperience();
    enhanceMiniPlayerFeedback();
    enhanceCategoryFilters();
    enhanceFullscreenPlayerContext();
    addLoadingStates();
    handleEmptyStates();

    console.log('✅ Enhanced UI features initialized');
  }, 1000);
});

// ======== ENHANCED NOTIFICATION SYSTEM ========
function showNotification(message, type = 'info', duration = 3000) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notif => notif.remove());

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;

  // Add icon based on type
  const icons = {
    'info': 'bi-info-circle',
    'success': 'bi-check-circle',
    'warning': 'bi-exclamation-triangle',
    'error': 'bi-x-circle'
  };

  notification.innerHTML = `
    <i class="bi ${icons[type] || icons.info}"></i>
    <span>${message}</span>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(28, 28, 35, 0.95);
    color: #fff;
    padding: 15px 20px;
    border-radius: 12px;
    z-index: 10000;
    transform: translateX(400px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    max-width: 350px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  // Type-specific styling
  const typeColors = {
    'info': '#4dabf7',
    'success': '#51cf66',
    'warning': '#ffa53b',
    'error': '#ff6b6b'
  };

  notification.style.borderLeftColor = typeColors[type] || typeColors.info;
  notification.style.borderLeftWidth = '4px';
  notification.style.borderLeftStyle = 'solid';

  document.body.appendChild(notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = 'translateX(0)';
  });

  // Auto-hide
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 400);
  }, duration);

  // Click to dismiss
  notification.addEventListener('click', () => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 400);
  });
}

// ======== ENHANCED KEYBOARD SHORTCUTS ========
function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    // Prevent shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Only allow Ctrl+K for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
          showNotification('Search focused - Start typing to search', 'info', 2000);
        }
      }
      return;
    }

    // Space bar for play/pause
    if (e.code === 'Space') {
      e.preventDefault();
      const playButton = document.getElementById('miniPlayButton') || document.getElementById('fullscreenPlay');
      if (playButton) {
        playButton.click();
        showNotification('Play/Pause toggled', 'info', 1500);
      }
    }

    // Arrow keys for next/previous
    if (e.code === 'ArrowRight') {
      e.preventDefault();
      const nextButton = document.getElementById('miniNextButton') || document.getElementById('fullscreenNext');
      if (nextButton) {
        nextButton.click();
        showNotification('Next song', 'info', 1500);
      }
    }

    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      const prevButton = document.getElementById('miniPrevButton') || document.getElementById('fullscreenPrev');
      if (prevButton) {
        prevButton.click();
        showNotification('Previous song', 'info', 1500);
      }
    }

    // Escape to close fullscreen player
    if (e.code === 'Escape') {
      const fullscreenPlayer = document.getElementById('fullscreenPlayer');
      if (fullscreenPlayer && fullscreenPlayer.classList.contains('active')) {
        const closeButton = document.getElementById('closeFullscreen') || document.getElementById('closeFullscreenDesktop');
        if (closeButton) {
          closeButton.click();
          showNotification('Fullscreen player closed', 'info', 1500);
        }
      }
    }

    // Number keys for quick filter selection
    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
      const filterButtons = document.querySelectorAll('.category-scroll .btn');
      const index = parseInt(e.code.replace('Digit', '')) - 1;
      if (filterButtons[index]) {
        filterButtons[index].click();
        showNotification(`Filter: ${filterButtons[index].textContent.trim()}`, 'info', 2000);
      }
    }
  });

  // Show keyboard shortcuts help
  console.log('🎹 Keyboard shortcuts initialized:');
  console.log('  • Space: Play/Pause');
  console.log('  • ← →: Previous/Next song');
  console.log('  • Ctrl+K: Focus search');
  console.log('  • Escape: Close fullscreen player');
  console.log('  • 1-9: Quick filter selection');
}

// ======== ENHANCED PERFORMANCE MONITORING ========
function initializePerformanceMonitoring() {
  // Monitor API response times
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const startTime = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (duration > 2000) {
        showNotification(`Slow API response: ${duration}ms`, 'warning', 3000);
      }

      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      console.error(`API request failed after ${duration}ms:`, error);
      throw error;
    }
  };

  // Monitor memory usage (if available)
  if (performance.memory) {
    setInterval(() => {
      const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
      if (memoryUsage > 100) { // More than 100MB
        console.warn(`High memory usage: ${memoryUsage.toFixed(2)}MB`);
      }
    }, 30000); // Check every 30 seconds
  }
}

// ======== ENHANCED ERROR HANDLING ========
function initializeErrorHandling() {
  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('An unexpected error occurred', 'error', 5000);
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('A network or loading error occurred', 'error', 5000);
  });

  // Audio error handling
  const audio = document.getElementById('audioElement');
  if (audio) {
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      showNotification('Audio playback error - trying next song', 'error', 4000);

      // Try to play next song automatically
      setTimeout(() => {
        const nextButton = document.getElementById('miniNextButton');
        if (nextButton) {
          nextButton.click();
        }
      }, 1000);
    });
  }
}

// ======== ENHANCED ACCESSIBILITY ========
function initializeAccessibility() {
  // Add ARIA labels to interactive elements
  const interactiveElements = document.querySelectorAll('button, [role="button"], .card, .grid-card');
  interactiveElements.forEach(element => {
    if (!element.getAttribute('aria-label') && !element.getAttribute('title')) {
      const text = element.textContent?.trim() || element.querySelector('img')?.alt || 'Interactive element';
      element.setAttribute('aria-label', text);
    }
  });

  // Add keyboard navigation for cards
  const cards = document.querySelectorAll('.card, .grid-card');
  cards.forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');

    card.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Announce page changes to screen readers
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target;
        if (target.classList.contains('page-content') && target.style.display !== 'none') {
          const pageTitle = target.querySelector('h1')?.textContent || 'Page';
          announceToScreenReader(`Navigated to ${pageTitle}`);
        }
      }
    });
  });

  // Observe page content changes
  const pageContents = document.querySelectorAll('.page-content');
  pageContents.forEach(page => {
    observer.observe(page, { attributes: true, attributeFilter: ['style'] });
  });
}

function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;
  announcement.textContent = message;

  document.body.appendChild(announcement);
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// ======== FINAL INITIALIZATION ========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎵 Mehfil Music Player - Enhanced UI Loading...');

  // Initialize all systems
  setTimeout(() => {
    try {
      enhanceSidebarInteractions();
      enhanceSearchExperience();
      enhanceMiniPlayerFeedback();
      enhanceCategoryFilters();
      enhanceFullscreenPlayerContext();
      addLoadingStates();
      handleEmptyStates();
      initializeKeyboardShortcuts();
      initializePerformanceMonitoring();
      initializeErrorHandling();
      initializeAccessibility();

      console.log('✅ All enhanced UI features initialized successfully');
      showNotification('🎵 Mehfil Enhanced UI Loaded!', 'success', 3000);

    } catch (error) {
      console.error('❌ Error initializing enhanced UI:', error);
      showNotification('Some UI enhancements failed to load', 'warning', 4000);
    }
  }, 1000);

  // Show loading complete message
  setTimeout(() => {
    console.log('🎉 Mehfil Music Player is ready!');
    console.log('💡 Tip: Use Ctrl+K to focus search, Space for play/pause, arrow keys for navigation');
  }, 2000);
});

// Test function to debug shuffle and repeat functionality
function testShuffleRepeat() {
  console.log('=== TESTING SHUFFLE & REPEAT FUNCTIONALITY ===');

  // First, add some test songs to the queue if it's empty
  if (songQueue.length === 0) {
    console.log('Adding test songs to queue...');
    const testSongs = [
      {
        id: 'test1',
        title: 'Test Song 1',
        artist: 'Test Artist 1',
        url: 'songs/ek-villain.mp3',
        image: '/music.png'
      },
      {
        id: 'test2',
        title: 'Test Song 2',
        artist: 'Test Artist 2',
        url: 'songs/kabir-singh.mp3',
        image: '/music.png'
      },
      {
        id: 'test3',
        title: 'Test Song 3',
        artist: 'Test Artist 3',
        url: 'songs/narayan.mp3',
        image: '/music.png'
      },
      {
        id: 'test4',
        title: 'Test Song 4',
        artist: 'Test Artist 4',
        url: 'songs/pushpa2.mp3',
        image: '/music.png'
      },
      {
        id: 'test5',
        title: 'Test Song 5',
        artist: 'Test Artist 5',
        url: 'songs/sahiba.mp3',
        image: '/music.png'
      }
    ];

    songQueue = [...testSongs];
    currentQueueIndex = 0;
    console.log('Test songs added. Queue length:', songQueue.length);
  }

  // Check if elements exist
  const shuffleBtn = document.getElementById('fullscreenShuffle');
  const repeatBtn = document.getElementById('fullscreenRepeat');
  const playlistBtn = document.getElementById('fullscreenPlaylist');

  console.log('Shuffle button exists:', !!shuffleBtn);
  console.log('Repeat button exists:', !!repeatBtn);
  console.log('Playlist button exists:', !!playlistBtn);

  // Check current states
  console.log('Current shuffle state:', isShuffleEnabled);
  console.log('Current repeat mode:', repeatMode);
  console.log('Current queue length:', songQueue.length);
  console.log('Current queue index:', currentQueueIndex);

  // Test functions
  if (shuffleBtn) {
    console.log('Testing shuffle...');
    toggleShuffle();
    console.log('Shuffle state after toggle:', isShuffleEnabled);
    console.log('Shuffle button classes:', shuffleBtn.className);
  }

  if (repeatBtn) {
    console.log('Testing repeat...');
    toggleRepeat();
    console.log('Repeat mode after toggle:', repeatMode);
    console.log('Repeat button classes:', repeatBtn.className);
  }

  // Test queue display
  console.log('Testing queue display...');
  updateQueueDisplay();

  const upNextList = document.getElementById('upNextList');
  console.log('Up Next list exists:', !!upNextList);
  if (upNextList) {
    console.log('Up Next list children:', upNextList.children.length);
    console.log('Up Next list innerHTML:', upNextList.innerHTML);
  }

  // Show fullscreen player for testing
  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  if (fullscreenPlayer) {
    fullscreenPlayer.classList.add('active');
    document.body.classList.add('fullscreen-active');
    document.body.style.overflow = 'hidden';
    console.log('Fullscreen player opened for testing');
  }
}

// Test fullscreen functionality
function testFullscreen() {
  console.log('🖥️ TESTING FULLSCREEN FUNCTIONALITY 🖥️');
  console.log('=====================================');

  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  const expandButton = document.getElementById('expandPlayer');
  const closeButton = document.getElementById('closeFullscreen');

  console.log('Fullscreen player exists:', !!fullscreenPlayer);
  console.log('Expand button exists:', !!expandButton);
  console.log('Close button exists:', !!closeButton);

  if (fullscreenPlayer) {
    console.log('Current fullscreen state:', fullscreenPlayer.classList.contains('active'));
    console.log('Body overflow:', document.body.style.overflow);
    console.log('Body classes:', document.body.className);

    // Test opening fullscreen
    console.log('Opening fullscreen...');
    fullscreenPlayer.classList.add('active');
    document.body.classList.add('fullscreen-active');
    document.body.style.overflow = 'hidden';

    console.log('Fullscreen opened. State:', fullscreenPlayer.classList.contains('active'));
    console.log('Body overflow after open:', document.body.style.overflow);
    console.log('Body classes after open:', document.body.className);

    // Test viewport coverage
    const rect = fullscreenPlayer.getBoundingClientRect();
    console.log('Fullscreen player dimensions:');
    console.log('  Width:', rect.width, '(viewport:', window.innerWidth, ')');
    console.log('  Height:', rect.height, '(viewport:', window.innerHeight, ')');
    console.log('  Top:', rect.top);
    console.log('  Left:', rect.left);
    console.log('  Covers full viewport:',
      rect.width >= window.innerWidth &&
      rect.height >= window.innerHeight &&
      rect.top <= 0 &&
      rect.left <= 0
    );
  }
}

// Make test function globally available
window.testFullscreen = testFullscreen;

// Comprehensive debug function to identify all issues
function debugAllIssues() {
  console.log('🔍 COMPREHENSIVE DEBUG - ALL ISSUES 🔍');
  console.log('=====================================');

  // 1. Check if elements exist
  console.log('1. ELEMENT EXISTENCE CHECK:');
  const elements = {
    fullscreenPlayer: document.getElementById('fullscreenPlayer'),
    fullscreenPlay: document.getElementById('fullscreenPlay'),
    fullscreenShuffle: document.getElementById('fullscreenShuffle'),
    fullscreenRepeat: document.getElementById('fullscreenRepeat'),
    fullscreenPlaylist: document.getElementById('fullscreenPlaylist'),
    upNextList: document.getElementById('upNextList'),
    audio: document.getElementById('audioElement')
  };

  Object.entries(elements).forEach(([name, element]) => {
    console.log(`  ${name}:`, !!element);
  });

  // 2. Check function existence
  console.log('\n2. FUNCTION EXISTENCE CHECK:');
  const functions = {
    togglePlay: typeof window.togglePlay || typeof togglePlay,
    toggleShuffle: typeof window.toggleShuffle || typeof toggleShuffle,
    toggleRepeat: typeof window.toggleRepeat || typeof toggleRepeat,
    updateQueueDisplay: typeof window.updateQueueDisplay || typeof updateQueueDisplay,
    toggleQueuePanel: typeof window.toggleQueuePanel || typeof toggleQueuePanel
  };

  Object.entries(functions).forEach(([name, type]) => {
    console.log(`  ${name}:`, type);
  });

  // 3. Check current state
  console.log('\n3. CURRENT STATE CHECK:');
  console.log('  isShuffleEnabled:', isShuffleEnabled);
  console.log('  repeatMode:', repeatMode);
  console.log('  songQueue length:', songQueue.length);
  console.log('  currentQueueIndex:', currentQueueIndex);
  console.log('  audio src:', elements.audio ? elements.audio.src : 'N/A');
  console.log('  audio paused:', elements.audio ? elements.audio.paused : 'N/A');

  // 4. Test button clicks
  console.log('\n4. TESTING BUTTON FUNCTIONALITY:');

  // Add test songs if queue is empty
  if (songQueue.length === 0) {
    console.log('  Adding test songs to queue...');
    const testSongs = [
      { id: 'test1', title: 'Test Song 1', artist: 'Test Artist 1', url: '#', image: '/music.png' },
      { id: 'test2', title: 'Test Song 2', artist: 'Test Artist 2', url: '#', image: '/music.png' },
      { id: 'test3', title: 'Test Song 3', artist: 'Test Artist 3', url: '#', image: '/music.png' }
    ];
    songQueue = [...testSongs];
    currentQueueIndex = 0;
    console.log('  Test songs added. Queue length:', songQueue.length);
  }

  // Test shuffle
  if (elements.fullscreenShuffle) {
    console.log('  Testing shuffle button...');
    try {
      const beforeState = isShuffleEnabled;
      elements.fullscreenShuffle.click();
      console.log(`    Shuffle: ${beforeState} → ${isShuffleEnabled}`);
      console.log('    Button classes:', elements.fullscreenShuffle.className);
    } catch (e) {
      console.error('    Shuffle test failed:', e);
    }
  }

  // Test repeat
  if (elements.fullscreenRepeat) {
    console.log('  Testing repeat button...');
    try {
      const beforeMode = repeatMode;
      elements.fullscreenRepeat.click();
      console.log(`    Repeat: ${beforeMode} → ${repeatMode}`);
      console.log('    Button classes:', elements.fullscreenRepeat.className);
    } catch (e) {
      console.error('    Repeat test failed:', e);
    }
  }

  // Test play/pause
  if (elements.fullscreenPlay) {
    console.log('  Testing play/pause button...');
    try {
      const beforePaused = elements.audio ? elements.audio.paused : 'unknown';
      elements.fullscreenPlay.click();
      setTimeout(() => {
        const afterPaused = elements.audio ? elements.audio.paused : 'unknown';
        console.log(`    Audio paused: ${beforePaused} → ${afterPaused}`);
        console.log('    Button icon:', elements.fullscreenPlay.innerHTML);
      }, 100);
    } catch (e) {
      console.error('    Play/pause test failed:', e);
    }
  }

  // Test queue display
  console.log('  Testing queue display...');
  try {
    updateQueueDisplay();
    if (elements.upNextList) {
      console.log('    Up Next children:', elements.upNextList.children.length);
      console.log('    Up Next HTML preview:', elements.upNextList.innerHTML.substring(0, 200));
    }
  } catch (e) {
    console.error('    Queue display test failed:', e);
  }

  // 5. Open fullscreen for visual inspection
  console.log('\n5. OPENING FULLSCREEN FOR VISUAL INSPECTION...');
  if (elements.fullscreenPlayer) {
    elements.fullscreenPlayer.classList.add('active');
    document.body.classList.add('fullscreen-active');
    document.body.style.overflow = 'hidden';
    console.log('  Fullscreen player opened. Check visually for issues.');
  }

  console.log('\n✅ DEBUG COMPLETE. Check results above.');
}

// Make debug function globally available
window.debugAllIssues = debugAllIssues;

// Make functions globally available
window.toggleShuffle = toggleShuffle;
window.toggleRepeat = toggleRepeat;
window.toggleQueuePanel = toggleQueuePanel;
window.jumpToQueueIndex = jumpToQueueIndex;
window.removeFromQueue = removeFromQueue;

// Check if user is logged in on page load
function checkLoginStatus() {
  const savedUser = localStorage.getItem('mehfilUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      hideLoginModal();
      updateProfileDisplay();
      console.log('User logged in:', currentUser.name);
    } catch (e) {
      console.error('Error parsing saved user:', e);
      showLoginModal();
    }
  } else {
    console.log('No saved user, showing login modal');
    showLoginModal();
  }
}

function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.remove('hidden');
    // Hide main content
    const screen = document.querySelector('.screen');
    if (screen) screen.style.filter = 'blur(5px)';
  }
}

function hideLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('hidden');
    // Show main content
    const screen = document.querySelector('.screen');
    if (screen) screen.style.filter = 'none';
  }
}

function updateProfileDisplay() {
  if (!currentUser) return;

  // Update profile name
  const profileName = document.querySelector('.profile-name');
  if (profileName) {
    profileName.textContent = currentUser.name;
  }

  // Update profile picture
  const profileImg = document.querySelector('.profile img');
  if (profileImg && currentUser.profilePicture) {
    profileImg.src = currentUser.profilePicture;
  }

  // Update welcome message
  const welcomeText = document.querySelector('.mehfil-intro h1');
  if (welcomeText) {
    welcomeText.textContent = `Welcome back, ${currentUser.name}!`;
  }
}

function setupLoginForm() {
  const loginButton = document.getElementById('loginButton');
  const userNameInput = document.getElementById('userName');
  const profilePictureInput = document.getElementById('profilePicture');
  const profilePreview = document.getElementById('profilePreview');
  const profileUploadDiv = document.querySelector('.profile-preview');

  // Profile picture upload
  if (profileUploadDiv && profilePictureInput) {
    profileUploadDiv.addEventListener('click', () => {
      profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showNotification('Image size should be less than 5MB', 'warning');
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          showNotification('Please select a valid image file', 'warning');
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          if (profilePreview) {
            profilePreview.src = event.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Real-time name validation
  if (userNameInput) {
    userNameInput.addEventListener('input', (e) => {
      const name = e.target.value.trim();
      const button = document.getElementById('loginButton');

      if (name.length < 2) {
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-music-note"></i> Enter your name';
      } else {
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-music-note"></i> Start Listening';
      }
    });
  }

  // Login button
  if (loginButton && userNameInput) {
    loginButton.addEventListener('click', () => {
      const name = userNameInput.value.trim();

      if (!name || name.length < 2) {
        showNotification('Please enter a valid name (at least 2 characters)', 'warning');
        userNameInput.focus();
        return;
      }

      // Show loading state
      loginButton.disabled = true;
      loginButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Setting up...';

      setTimeout(() => {
        // Create user object
        currentUser = {
          name: name,
          profilePicture: profilePreview ? profilePreview.src : '/dp.png',
          loginDate: new Date().toISOString(),
          id: Date.now().toString() // Simple ID generation
        };

        // Save to localStorage
        localStorage.setItem('mehfilUser', JSON.stringify(currentUser));

        // Update UI
        updateProfileDisplay();
        hideLoginModal();

        // Show welcome notification
        showNotification(`Welcome to Mehfil, ${name}! 🎵`, 'info');

        // Reset button
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="bi bi-music-note"></i> Start Listening';
      }, 800); // Small delay for better UX
    });

    // Allow Enter key to submit
    userNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !loginButton.disabled) {
        loginButton.click();
      }
    });
  }
}

// Initialize login system on page load
window.addEventListener('DOMContentLoaded', () => {
  setupLoginForm();
  checkLoginStatus();
  loadPlaybackSettings(); // Load saved shuffle/repeat settings

  // ======== MOOD FILTER SYSTEM ========
  setupMoodFilters();

  // Global image error handler
  document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
      console.warn('Image failed to load:', e.target.src);
      console.log('Image element:', e.target);
      console.log('Image parent:', e.target.parentElement);
      e.target.src = '/music.png';
    }
  }, true);

  // Test volume controller visibility
  setTimeout(() => {
    const volumeControl = document.getElementById('miniVolumeSlider');
    const volumeButton = document.getElementById('miniVolumeButton');
    console.log('Volume controller elements found:', {
      slider: !!volumeControl,
      button: !!volumeButton
    });

    if (volumeControl && volumeButton) {
      console.log('✅ Volume controller is properly initialized');
    } else {
      console.warn('⚠️ Volume controller elements missing');
    }

    // Test mini player visibility
    const miniPlayer = document.getElementById('miniPlayer');
    if (miniPlayer) {
      console.log('Mini player element found');
      // Force show mini player for testing
      miniPlayer.classList.add('show');
    } else {
      console.error('Mini player element not found');
    }
  }, 1000);
});

// Edit profile functionality
function showEditProfileModal() {
  if (!currentUser) return;

  const modal = document.getElementById('loginModal');
  const modalContent = modal.querySelector('.login-modal-content');

  // Update modal for editing
  modalContent.innerHTML = `
    <div class="login-header">
      <h2>Edit Profile</h2>
      <p>Update your information</p>
    </div>
    
    <div class="login-form">
      <div class="form-group">
        <label for="editUserName">Your Name</label>
        <input type="text" id="editUserName" placeholder="Enter your name" maxlength="50" value="${currentUser.name}">
      </div>
      
      <div class="form-group">
        <label for="editProfilePicture">Profile Picture</label>
        <div class="profile-upload">
          <div class="profile-preview">
            <img id="editProfilePreview" src="${currentUser.profilePicture}" alt="Profile Preview">
            <div class="upload-overlay">
              <i class="bi bi-camera"></i>
              <span>Change Photo</span>
            </div>
          </div>
          <input type="file" id="editProfilePicture" accept="image/*" style="display: none;">
        </div>
      </div>
      
      <div class="form-buttons">
        <button id="saveProfileButton" class="login-btn">
          <i class="bi bi-check-circle"></i>
          Save Changes
        </button>
        <button id="cancelEditButton" class="cancel-btn">
          Cancel
        </button>
      </div>
    </div>
  `;

  // Show modal
  modal.classList.remove('hidden');
  const screen = document.querySelector('.screen');
  if (screen) screen.style.filter = 'blur(5px)';

  // Setup edit form
  setupEditProfileForm();
}

function setupEditProfileForm() {
  const saveButton = document.getElementById('saveProfileButton');
  const cancelButton = document.getElementById('cancelEditButton');
  const userNameInput = document.getElementById('editUserName');
  const profilePictureInput = document.getElementById('editProfilePicture');
  const profilePreview = document.getElementById('editProfilePreview');
  const profileUploadDiv = document.querySelector('.profile-preview');

  // Profile picture upload
  if (profileUploadDiv && profilePictureInput) {
    profileUploadDiv.addEventListener('click', () => {
      profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (profilePreview) {
            profilePreview.src = event.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Save button
  if (saveButton && userNameInput) {
    saveButton.addEventListener('click', () => {
      const name = userNameInput.value.trim();

      if (!name) {
        showNotification('Please enter your name', 'warning');
        userNameInput.focus();
        return;
      }

      // Update user object
      currentUser.name = name;
      currentUser.profilePicture = profilePreview ? profilePreview.src : currentUser.profilePicture;

      // Save to localStorage
      localStorage.setItem('mehfilUser', JSON.stringify(currentUser));

      // Update UI
      updateProfileDisplay();
      hideLoginModal();

      // Show success notification
      showNotification('Profile updated successfully! 👤', 'info');
    });
  }

  // Cancel button
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      hideLoginModal();
    });
  }

  // Allow Enter key to save
  if (userNameInput) {
    userNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveButton.click();
      }
    });
  }
}

// Helper function to get user-friendly error messages
function getErrorMessage(error) {
  if (!error) return 'Unknown error';

  // Handle MediaError
  if (error.code) {
    switch (error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return 'Playback was aborted';
      case MediaError.MEDIA_ERR_NETWORK:
        return 'Network error occurred. Please check your connection.';
      case MediaError.MEDIA_ERR_DECODE:
        return 'Error decoding media. The format may not be supported.';
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'Media format not supported by your browser.';
      default:
        return 'Media playback error';
    }
  }

  // Handle regular Error objects
  return error.message || 'An error occurred';
}

// Note: showNotification function is defined above in the Enhanced Notification System section


// Audio URL construction helpers
// ======== ENHANCED AUDIO URL HANDLING ========

const getAudioUrl = (song) => {
  console.log('Getting audio URL for song:', song.title || song.name);

  // Validate input
  if (!song || typeof song !== 'object') {
    console.error('Invalid song object provided to getAudioUrl');
    return null;
  }

  // Check downloadUrl array first (most common for JioSaavn API)
  if (song.downloadUrl && Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
    console.log('Found downloadUrl array:', song.downloadUrl);

    // Sort by quality (highest first) and find the first valid link
    const sortedUrls = song.downloadUrl
      .filter(item => {
        // Ensure item is an object and has a valid URL
        if (!item || typeof item !== 'object') {
          console.warn('Invalid downloadUrl item (not object):', item);
          return false;
        }

        const url = item.link || item.url;
        if (!url || typeof url !== 'string') {
          console.warn('Invalid downloadUrl item (no valid URL):', item);
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const qualityA = parseInt(a.quality) || 0;
        const qualityB = parseInt(b.quality) || 0;
        return qualityB - qualityA;
      });

    if (sortedUrls.length > 0) {
      const bestUrlObj = sortedUrls[0];
      const bestUrl = bestUrlObj.link || bestUrlObj.url;

      // Triple-check we return a valid string URL
      if (typeof bestUrl === 'string' && bestUrl.startsWith('http') && !bestUrl.includes('undefined') && !bestUrl.includes('[object Object]')) {
        console.log('Selected best quality URL:', bestUrl, 'Quality:', bestUrlObj.quality);
        return bestUrl;
      } else {
        console.warn('Best URL is not a valid string:', bestUrl, 'Type:', typeof bestUrl);
      }
    }
  }

  // Try alternative URL fields - ensure they are strings
  if (song.url && typeof song.url === 'string' && song.url !== '#' && song.url.startsWith('http') && !song.url.includes('[object Object]')) {
    console.log('Using song.url:', song.url);
    return song.url;
  }

  if (song.media_url && typeof song.media_url === 'string' && song.media_url !== '#' && song.media_url.startsWith('http') && !song.media_url.includes('[object Object]')) {
    console.log('Using song.media_url:', song.media_url);
    return song.media_url;
  }

  // Check for nested media URLs
  if (song.more_info && song.more_info.media_url && typeof song.more_info.media_url === 'string' && song.more_info.media_url.startsWith('http') && !song.more_info.media_url.includes('[object Object]')) {
    console.log('Using song.more_info.media_url:', song.more_info.media_url);
    return song.more_info.media_url;
  }

  // Check for encrypted media URL (JioSaavn specific)
  if (song.encrypted_media_url && typeof song.encrypted_media_url === 'string' && song.encrypted_media_url.startsWith('http') && !song.encrypted_media_url.includes('[object Object]')) {
    console.log('Found encrypted_media_url:', song.encrypted_media_url);
    return song.encrypted_media_url;
  }

  console.warn(`No valid audio URL found for: ${song.title || song.name}`);
  console.log('Available song fields:', Object.keys(song));

  // Debug: log the actual values to see what we're getting
  if (song.downloadUrl) {
    console.log('downloadUrl content:', song.downloadUrl);
    song.downloadUrl.forEach((item, index) => {
      console.log(`downloadUrl[${index}]:`, item, 'Type:', typeof item);
      if (item && typeof item === 'object') {
        console.log(`  - link:`, item.link, 'Type:', typeof item.link);
        console.log(`  - url:`, item.url, 'Type:', typeof item.url);
        console.log(`  - quality:`, item.quality);
      }
    });
  }

  return null;
};

// ======== ENHANCED IMAGE URL HANDLING ========

const getImageUrl = (imageData, preferredQuality = '500x500') => {
  console.log('Getting image URL for:', imageData);

  // If no image data, return default
  if (!imageData) {
    console.log('No image data provided, using default');
    return '/music.png';
  }

  // Helper function to convert relative URLs to absolute
  const makeAbsoluteUrl = (url) => {
    if (!url || typeof url !== 'string') {
      console.warn('makeAbsoluteUrl received invalid input:', url, 'Type:', typeof url);
      return null;
    }

    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If it's a relative path starting with /, convert to JioSaavn CDN URL
    if (url.startsWith('/')) {
      return `https://c.saavncdn.com${url}`;
    }

    // If it's just a filename or relative path, try to construct CDN URL
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp')) {
      // If it doesn't start with http but contains image extension, assume it's a CDN path
      if (!url.startsWith('/')) {
        return `https://c.saavncdn.com/${url}`;
      }
    }

    return url; // Return as-is if we can't determine the format
  };

  // If it's already a string URL, process it
  if (typeof imageData === 'string') {
    const absoluteUrl = makeAbsoluteUrl(imageData);
    if (absoluteUrl && (absoluteUrl.startsWith('http') || absoluteUrl.startsWith('/'))) {
      console.log('Using processed string URL:', absoluteUrl);
      return absoluteUrl;
    }
    // If it's a relative path, return default
    console.log('String URL could not be processed, using default');
    return '/music.png';
  }

  // If it's an array of image objects
  if (Array.isArray(imageData) && imageData.length > 0) {
    console.log('Processing image array:', imageData);

    // Filter out invalid items first
    const validImages = imageData.filter(img => {
      if (!img || typeof img !== 'object') {
        console.warn('Invalid image item (not object):', img);
        return false;
      }

      const url = img.url || img.link;
      if (!url || typeof url !== 'string') {
        console.warn('Invalid image item (no valid URL):', img);
        return false;
      }

      return true;
    });

    if (validImages.length === 0) {
      console.warn('No valid images found in array, using default');
      return '/music.png';
    }

    // Try to find preferred quality first
    const preferredImage = validImages.find(img =>
      img.quality === preferredQuality || img.size === preferredQuality
    );

    if (preferredImage) {
      const rawUrl = preferredImage.url || preferredImage.link;
      const absoluteUrl = makeAbsoluteUrl(rawUrl);
      if (absoluteUrl) {
        console.log('Found preferred quality image:', absoluteUrl);
        return absoluteUrl;
      }
    }

    // Try to find highest quality available
    const sortedImages = validImages.sort((a, b) => {
      const qualityA = parseInt(a.quality) || parseInt(a.size) || 0;
      const qualityB = parseInt(b.quality) || parseInt(b.size) || 0;
      return qualityB - qualityA;
    });

    if (sortedImages.length > 0) {
      const bestImage = sortedImages[0];
      const rawUrl = bestImage.url || bestImage.link;
      const absoluteUrl = makeAbsoluteUrl(rawUrl);
      if (absoluteUrl) {
        console.log('Found best quality image:', absoluteUrl, 'Quality:', bestImage.quality || bestImage.size);
        return absoluteUrl;
      }
    }

    // Fallback to first available image
    const firstImage = validImages[0];
    if (firstImage) {
      const rawUrl = firstImage.url || firstImage.link;
      const absoluteUrl = makeAbsoluteUrl(rawUrl);
      if (absoluteUrl) {
        console.log('Using first available image:', absoluteUrl);
        return absoluteUrl;
      }
    }
  }

  // If it's an object with url/link properties
  if (typeof imageData === 'object' && (imageData.url || imageData.link)) {
    const rawUrl = imageData.url || imageData.link;
    const absoluteUrl = makeAbsoluteUrl(rawUrl);
    if (absoluteUrl) {
      console.log('Using object image URL:', absoluteUrl);
      return absoluteUrl;
    }
  }

  console.warn('No valid image URL found, using default. Image data was:', imageData);
  return '/music.png';
};

// Make getImageUrl globally available
window.getImageUrl = getImageUrl;

// Debug function to test thumbnail handling
window.debugThumbnails = function () {
  console.log('=== DEBUGGING THUMBNAILS ===');

  // Check current song
  if (songs && songs.length > 0 && currentSongIndex >= 0) {
    const currentSong = songs[currentSongIndex];
    console.log('Current song:', currentSong.title);
    console.log('  Raw image data:', currentSong.image);
    console.log('  Processed cover:', currentSong.cover);
    console.log('  getImageUrl result:', getImageUrl(currentSong.image));

    // Check mini player
    const miniImg = document.getElementById('miniPlayerImage');
    if (miniImg) {
      console.log('  Mini player src:', miniImg.src);
    }
  }

  // Check trending songs
  const trendingCards = document.querySelectorAll('#trending-songs-container .card');
  console.log('Trending cards found:', trendingCards.length);
  trendingCards.forEach((card, index) => {
    const img = card.querySelector('img');
    if (img && index < 3) { // Only log first 3
      console.log(`Trending card ${index}:`, card.dataset.title);
      console.log('  Card image src:', img.src);
    }
  });
};

const getCover = (cover) => cover || "https://via.placeholder.com/150";




// Control Bar Elements
const playButton = document.getElementById("playButton");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.querySelector(".current-time");
const durationEl = document.querySelector(".duration"); // Main control bar duration
const nowPlayingArt = document.getElementById("nowPlayingArt");
const trackTitle = document.querySelector(".track-title");
const trackArtist = document.querySelector(".track-artist");

// Mini Player Elements
const miniPlayer = document.getElementById("miniPlayer");
const miniPlayerImage = document.getElementById("miniPlayerImage");
const miniPlayerTitle = document.getElementById("miniPlayerTitle");
const miniPlayerArtist = document.getElementById("miniPlayerArtist");
const miniPlayButton = document.getElementById("miniPlayButton");
const miniNextButton = document.getElementById("miniNextButton");
const miniCurrentTimeEl = document.getElementById('currentTime'); // Mini player current time
const miniDurationEl = document.getElementById('duration');       // Mini player total duration
const expandPlayer = document.getElementById("expandPlayer");

// Fullscreen Player Elements
const fullscreenPlayer = document.getElementById("fullscreenPlayer");
const fullscreenPlay = document.getElementById("fullscreenPlay");
const fullscreenPrev = document.getElementById("fullscreenPrev");
const fullscreenNext = document.getElementById("fullscreenNext");
const fullscreenProgress = document.getElementById("fullscreenProgress");
const fullscreenCurrentTime = document.getElementById("fullscreenCurrentTime");
const fullscreenDuration = document.getElementById("fullscreenDuration");
const fullscreenAlbumArt = document.getElementById("fullscreenAlbumArt");
const fullscreenSongTitle = document.getElementById("fullscreenSongTitle");
const fullscreenArtist = document.getElementById("fullscreenArtist");
const closeFullscreen = document.getElementById("closeFullscreen");
const sidebar = document.querySelector('.sidebar');
const hamburgerToggle = document.getElementById('hamburgerToggle');
const mobileOverlay = document.getElementById('mobileOverlay');

const profileEdit = document.getElementById('profileEdit');

// Enhanced sidebar functionality with responsive features
let sidebarTouchStartX = 0;
let sidebarTouchCurrentX = 0;
let sidebarIsSwiping = false;

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add('open');
  if (mobileOverlay) mobileOverlay.classList.add('visible');

  // Prevent body scroll when sidebar is open on mobile
  if (window.innerWidth <= 1100) {
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('open');
  if (mobileOverlay) mobileOverlay.classList.remove('visible');

  // Restore body scroll
  document.body.style.overflow = '';
}

function toggleSidebar() {
  if (!sidebar) return;
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

// Enhanced click handler with haptic feedback (if available)
safeAddListener(hamburgerToggle, 'click', (e) => {
  e.stopPropagation();

  // Add haptic feedback for mobile devices
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }

  toggleSidebar();
});

safeAddListener(mobileOverlay, 'click', () => {
  closeSidebar();
});

// Touch/swipe support for sidebar
safeAddListener(document, 'touchstart', (e) => {
  if (window.innerWidth > 1100) return; // Only on mobile/tablet

  const touch = e.touches[0];
  sidebarTouchStartX = touch.clientX;

  // If touch starts near left edge, prepare for swipe
  if (sidebarTouchStartX < 20) {
    sidebarIsSwiping = true;
  }

  // If sidebar is open and touch starts on it, prepare for close swipe
  if (sidebar && sidebar.classList.contains('open') && sidebarTouchStartX < 280) {
    sidebarIsSwiping = true;
  }
});

safeAddListener(document, 'touchmove', (e) => {
  if (!sidebarIsSwiping || window.innerWidth > 1100) return;

  const touch = e.touches[0];
  sidebarTouchCurrentX = touch.clientX;
  const deltaX = sidebarTouchCurrentX - sidebarTouchStartX;

  // Swipe right to open (from left edge)
  if (!sidebar.classList.contains('open') && deltaX > 50 && sidebarTouchStartX < 20) {
    e.preventDefault();
    openSidebar();
    sidebarIsSwiping = false;
  }

  // Swipe left to close (when sidebar is open)
  if (sidebar.classList.contains('open') && deltaX < -50) {
    e.preventDefault();
    closeSidebar();
    sidebarIsSwiping = false;
  }
});

safeAddListener(document, 'touchend', () => {
  sidebarIsSwiping = false;
});

// Keyboard support for accessibility
safeAddListener(document, 'keydown', (e) => {
  // ESC key closes sidebar
  if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
    closeSidebar();
  }

  // Alt + M toggles sidebar (accessibility shortcut)
  if (e.altKey && e.key === 'm') {
    e.preventDefault();
    toggleSidebar();
  }
});

// Auto-close sidebar on window resize to desktop size
safeAddListener(window, 'resize', () => {
  if (window.innerWidth > 1100 && sidebar && sidebar.classList.contains('open')) {
    closeSidebar();
  }
});

// Close sidebar when a sidebar link is clicked (mobile)
safeAddListener(sidebar, 'click', (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === 'A' || tag === 'BUTTON' || e.target.closest('li')) {
    // Add visual feedback
    const clickedElement = e.target.closest('li');
    if (clickedElement) {
      clickedElement.style.transform = 'scale(0.95)';
      setTimeout(() => {
        clickedElement.style.transform = '';
      }, 150);
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 1100) {
      setTimeout(() => closeSidebar(), 100);
    }
  }
});

// Prevent sidebar from closing when clicking inside it
safeAddListener(sidebar, 'click', (e) => {
  e.stopPropagation();
});

// Sidebar navigation functionality
function setupSidebarNavigation() {
  const sidebarLinks = document.querySelectorAll('.sidebar ul li');

  // Set home as active by default
  const homeLink = document.getElementById('nav-home');
  if (homeLink) homeLink.classList.add('active');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Get the text content to determine which page to show
      const linkText = link.textContent.trim();

      // Remove active class from all navigation links (not logout)
      document.querySelectorAll('#nav-home, #nav-playlists, #nav-favorites, #nav-settings')
        .forEach(l => l.classList.remove('active'));

      // Add active class to clicked link
      if (linkText !== 'Logout') {
        link.classList.add('active');
      }

      // Handle navigation based on link text
      switch (linkText) {
        case 'Home':
          showHomePage();
          break;
        case 'Playlists':
          showPlaylistsPage();
          break;
        case 'Favorites':
          showFavoritesPage();
          break;
        case 'Settings':
          showSettingsPage();
          break;
        case 'Logout':
          handleLogout();
          break;
      }
    });
  });
}

// Page navigation functions
function showHomePage() {
  console.log('showHomePage called');

  // STEP 1: Force hide ALL page-content divs with !important via inline style
  const allPages = document.querySelectorAll('.page-content');
  console.log('Found page-content elements:', allPages.length);

  allPages.forEach(page => {
    page.style.cssText = 'display: none !important;';
    console.log('Force hiding page:', page.id, '- display:', window.getComputedStyle(page).display);
  });

  // STEP 2: Triple-check specific pages are hidden
  const pagesToHide = ['trending-page', 'latest-page', 'artists-page', 'album-page', 'favorites-page', 'playlists-page'];
  pagesToHide.forEach(pageId => {
    const page = document.getElementById(pageId);
    if (page) {
      page.style.cssText = 'display: none !important;';
      console.log(`Force hiding ${pageId} - computed display:`, window.getComputedStyle(page).display);
    }
  });

  // STEP 3: Hide search results if visible
  const searchResults = document.getElementById('search-results');
  if (searchResults) {
    searchResults.style.display = 'none';
    searchResults.innerHTML = '';
    console.log('Cleared search results');
  }

  // STEP 4: Show all main content sections
  const sectionsToShow = [
    '.top-bar',
    '.mehfil-intro',
    '.featured-playlists',
    '.trending',
    '.nrelease',
    '.artists',
    '.playlist'
  ];

  sectionsToShow.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = '';
      console.log(`Showing ${selector} - display:`, window.getComputedStyle(element).display);
    }
  });

  // STEP 5: Update active navigation
  document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
  const homeLink = document.getElementById('nav-home');
  if (homeLink) {
    homeLink.classList.add('active');
    console.log('Home nav activated');
  }

  // STEP 6: Verify final state
  console.log('=== FINAL STATE CHECK ===');
  allPages.forEach(page => {
    const computedDisplay = window.getComputedStyle(page).display;
    console.log(`${page.id}: display = ${computedDisplay}`);
    if (computedDisplay !== 'none') {
      console.warn(`⚠️ ${page.id} is still visible! Forcing hide again...`);
      page.style.cssText = 'display: none !important;';
    }
  });

  console.log('showHomePage completed');
}

// Make showHomePage globally accessible immediately
window.showHomePage = showHomePage;

function showTrendingPage() {
  console.log('showTrendingPage called');

  // Hide all other content
  document.querySelectorAll('.main-area > *:not(.page-content)').forEach(el => {
    if (!el.classList.contains('page-content')) {
      el.style.display = 'none';
    }
  });
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Show trending page
  const trendingPage = document.getElementById('trending-page');
  if (trendingPage) {
    trendingPage.style.display = 'block';
    // Reset pagination state and load first page
    trendingPageState.currentPage = 0;
    trendingPageState.hasMorePages = true;
    loadTrendingPage(0);
  }

  console.log('showTrendingPage completed');
}

// Make globally accessible
window.showTrendingPage = showTrendingPage;

function showLatestPage() {
  console.log('showLatestPage called');

  // Hide all other content
  document.querySelectorAll('.main-area > *:not(.page-content)').forEach(el => {
    if (!el.classList.contains('page-content')) {
      el.style.display = 'none';
    }
  });
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Show latest page
  const latestPage = document.getElementById('latest-page');
  if (latestPage) {
    latestPage.style.display = 'block';
    // Load first page
    loadLatestPage(0);
  }

  console.log('showLatestPage completed');
}

// Make globally accessible
window.showLatestPage = showLatestPage;
window.showArtistsPage = showArtistsPage;

// Load Latest Page with pagination
async function loadLatestPage(page = 0) {
  console.log(`Loading Latest page ${page}...`);

  const container = document.getElementById('latest-page-container');
  const loading = document.getElementById('latest-loading');
  const pagination = document.getElementById('latest-pagination');

  if (!container) {
    console.error('Latest page container not found');
    return;
  }

  // Show loading indicator
  if (loading) loading.style.display = 'flex';
  if (pagination) pagination.style.display = 'none';

  try {
    // Use the correct query from ENDPOINTS configuration
    const query = 'new hindi songs';  // This query returns results!
    const apiUrl = `${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(query)}&language=hindi&page=${page}&limit=20`;

    console.log('Fetching latest songs from:', apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    console.log('Latest songs API response:', data);

    if (data.success && data.data && data.data.results && data.data.results.length > 0) {
      const songs = data.data.results;
      console.log(`✅ Loaded ${songs.length} latest songs`);

      // Clear container if first page
      if (page === 0) {
        container.innerHTML = '';
      }

      // Render songs
      songs.forEach((song, index) => {
        const card = createLatestPageSongCard(song, index);
        container.appendChild(card);
      });

      // Update pagination
      if (pagination) {
        pagination.style.display = 'flex';
        const pageInfo = document.getElementById('latest-page-info');
        if (pageInfo) {
          pageInfo.textContent = `Page ${page + 1}`;
        }

        // Update prev/next buttons
        const prevBtn = document.getElementById('latest-prev-btn');
        const nextBtn = document.getElementById('latest-next-btn');

        if (prevBtn) {
          prevBtn.disabled = page === 0;
          prevBtn.onclick = () => loadLatestPage(page - 1);
        }

        if (nextBtn) {
          nextBtn.disabled = songs.length < 20;
          nextBtn.onclick = () => loadLatestPage(page + 1);
        }
      }

      // Hide loading
      if (loading) loading.style.display = 'none';

    } else {
      console.warn('No latest songs found');
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-music-note-beamed"></i>
          <h3>No latest releases found</h3>
          <p>Please try again later.</p>
        </div>
      `;
      if (loading) loading.style.display = 'none';
    }

  } catch (error) {
    console.error('Error loading latest songs:', error);
    container.innerHTML = `
      <div class="error-state">
        <i class="bi bi-exclamation-triangle"></i>
        <h3>Failed to load latest releases</h3>
        <p>${error.message}</p>
      </div>
    `;
    if (loading) loading.style.display = 'none';
  }
}

// Make globally accessible
window.loadLatestPage = loadLatestPage;

// Helper function to create song card for latest page
function createLatestPageSongCard(song, index) {
  const card = document.createElement('div');
  card.className = 'song-card';

  const imageUrl = getImageUrl(song.image);
  const title = song.name || song.title || 'Unknown Title';
  const artist = song.primaryArtists || song.artist || 'Unknown Artist';

  card.innerHTML = `
    <img src="${imageUrl}" alt="${title}" onerror="this.src='/music.png'">
    <div class="play-overlay">
      <i class="bi bi-play-circle-fill"></i>
    </div>
    <h3>${title}</h3>
    <p>${artist}</p>
  `;

  card.onclick = async () => {
    console.log('Latest page song clicked:', title);

    try {
      // Show loading state
      const overlay = card.querySelector('.play-overlay i');
      if (overlay) {
        overlay.className = 'bi bi-hourglass-split';
      }

      // Fetch full song details to get downloadUrl
      console.log('Fetching song details for:', song.id);
      const response = await fetch(`${API_BASE_URL}/api/songs?id=${encodeURIComponent(song.id)}`);
      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error('Failed to fetch song details');
      }

      const fullSongData = data.data[0]; // API returns array
      console.log('Full song data:', fullSongData);

      // Check if song already exists in songs array
      let songIndex = songs.findIndex(s => s.id === fullSongData.id);

      if (songIndex === -1) {
        // Add to songs array with full data including downloadUrl
        songs.push(fullSongData);
        songIndex = songs.length - 1;
      } else {
        // Update existing song with full data
        songs[songIndex] = fullSongData;
      }

      // Restore play icon
      if (overlay) {
        overlay.className = 'bi bi-play-circle-fill';
      }

      // Play the song
      currentSongIndex = songIndex;
      await loadSong(songIndex);
      await playSong();

    } catch (error) {
      console.error('Error playing song:', error);
      showNotification('Failed to play song: ' + error.message, 'error');

      // Restore play icon on error
      const overlay = card.querySelector('.play-overlay i');
      if (overlay) {
        overlay.className = 'bi bi-play-circle-fill';
      }
    }
  };

  return card;
}

// Test function for back button functionality
function testBackButton() {
  console.log('=== TESTING BACK BUTTON FUNCTIONALITY ===');
  console.log('showHomePage function exists:', typeof window.showHomePage);
  console.log('showTrendingPage function exists:', typeof window.showTrendingPage);
  console.log('showLatestPage function exists:', typeof window.showLatestPage);
  console.log('showArtistsPage function exists:', typeof window.showArtistsPage);

  // Test if elements exist
  const trendingBackBtn = document.querySelector('#trending-page .back-to-home');
  const latestBackBtn = document.querySelector('#latest-page .back-to-home');

  console.log('Trending page back button exists:', !!trendingBackBtn);
  console.log('Latest page back button exists:', !!latestBackBtn);

  if (trendingBackBtn) {
    console.log('Trending back button onclick:', trendingBackBtn.getAttribute('onclick'));
  }
  if (latestBackBtn) {
    console.log('Latest back button onclick:', latestBackBtn.getAttribute('onclick'));
  }

  // Test current page visibility
  console.log('=== CURRENT PAGE VISIBILITY ===');
  document.querySelectorAll('.page-content').forEach(page => {
    const computedDisplay = window.getComputedStyle(page).display;
    console.log(`${page.id}: computed display = ${computedDisplay} `);
  });
}

// Function to manually trigger back button
function manuallyTriggerBackButton() {
  console.log('=== MANUALLY TRIGGERING BACK BUTTON ===');
  try {
    showHomePage();
    console.log('✅ Manual trigger successful');

    // Verify the result
    setTimeout(() => {
      console.log('=== VERIFICATION AFTER 100ms ===');
      document.querySelectorAll('.page-content').forEach(page => {
        const computedDisplay = window.getComputedStyle(page).display;
        console.log(`${page.id}: computed display = ${computedDisplay} `);
        if (computedDisplay !== 'none') {
          console.warn(`⚠️ ${page.id} is still visible!`);
        }
      });
    }, 100);
  } catch (error) {
    console.error('❌ Manual trigger failed:', error);
  }
}

// Comprehensive test function
function testBackButtonFix() {
  console.log('=== COMPREHENSIVE BACK BUTTON TEST ===');

  // Step 1: Show trending page
  console.log('Step 1: Opening trending page...');
  showTrendingPage();

  setTimeout(() => {
    console.log('Step 2: Verifying trending page is visible...');
    const trendingPage = document.getElementById('trending-page');
    const trendingDisplay = window.getComputedStyle(trendingPage).display;
    console.log('Trending page display:', trendingDisplay);

    // Check if home sections are hidden
    const homeSections = ['.trending', '.nrelease', '.artists', '.playlist'];
    homeSections.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        const display = window.getComputedStyle(element).display;
        console.log(`Home section ${selector}: ${display} `);
      }
    });

    // Step 3: Click back button
    console.log('Step 3: Clicking back button...');
    showHomePage();

    setTimeout(() => {
      console.log('Step 4: Verifying home page is restored...');

      // Check all pages are hidden
      let allPagesHidden = true;
      document.querySelectorAll('.page-content').forEach(page => {
        const computedDisplay = window.getComputedStyle(page).display;
        console.log(`${page.id}: ${computedDisplay} `);
        if (computedDisplay !== 'none') {
          allPagesHidden = false;
          console.error(`❌ ${page.id} is still visible!`);
        }
      });

      // Check main sections are visible
      const mainSections = ['.trending', '.nrelease', '.artists', '.playlist'];
      let allSectionsVisible = true;
      mainSections.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          const computedDisplay = window.getComputedStyle(element).display;
          console.log(`${selector}: ${computedDisplay} `);
          if (computedDisplay === 'none') {
            allSectionsVisible = false;
            console.error(`❌ ${selector} is hidden!`);
          }
        }
      });

      if (allPagesHidden && allSectionsVisible) {
        console.log('✅ BACK BUTTON TEST PASSED!');
      } else {
        console.error('❌ BACK BUTTON TEST FAILED!');
      }
    }, 100);
  }, 100);
}

// Enhanced debugging function to check page states
function debugPageStates() {
  console.log('=== CURRENT PAGE STATES ===');

  // Check all page-content divs
  document.querySelectorAll('.page-content').forEach(page => {
    const computedDisplay = window.getComputedStyle(page).display;
    const inlineStyle = page.style.display;
    console.log(`${page.id}: `);
    console.log(`  Computed display: ${computedDisplay} `);
    console.log(`  Inline style: ${inlineStyle} `);
    console.log(`  CSS Text: ${page.style.cssText} `);
  });

  // Check main sections
  const mainSections = ['.top-bar', '.mehfil-intro', '.trending', '.nrelease', '.artists', '.playlist'];
  console.log('=== MAIN SECTIONS ===');
  mainSections.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      const computedDisplay = window.getComputedStyle(element).display;
      const inlineStyle = element.style.display;
      console.log(`${selector}: `);
      console.log(`  Computed display: ${computedDisplay} `);
      console.log(`  Inline style: ${inlineStyle} `);
    } else {
      console.log(`${selector}: NOT FOUND`);
    }
  });
}

// Function to debug current page state
function debugPageState() {
  console.log('=== CURRENT PAGE STATE ===');

  // Check page-content divs
  document.querySelectorAll('.page-content').forEach(page => {
    console.log(`${page.id}: display = ${page.style.display || 'default'} `);
  });

  // Check main sections
  const sections = [
    '.top-bar',
    '.mehfil-intro',
    '.featured-playlists',
    '.trending',
    '.nrelease',
    '.artists',
    '.playlist'
  ];

  sections.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`${selector}: display = ${element.style.display || 'default'} `);
    } else {
      console.log(`${selector}: NOT FOUND`);
    }
  });
}

function showArtistsPage() {
  console.log('showArtistsPage called');

  // Hide all other content
  document.querySelectorAll('.main-area > *:not(.page-content)').forEach(el => {
    if (!el.classList.contains('page-content')) {
      el.style.display = 'none';
    }
  });
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Show artists page
  const artistsPage = document.getElementById('artists-page');
  if (artistsPage) {
    artistsPage.style.display = 'block';
    // Reset pagination state and load first page
    artistsPageState.currentPage = 0;
    artistsPageState.hasMorePages = true;
    artistsPageState.currentCategory = 'popular';

    // Setup category buttons
    setupArtistCategoryButtons();

    // Load first page
    loadArtistsPage(0, 'popular');
  }

  console.log('showArtistsPage completed');
}

function showPlaylistsPage() {
  // Hide all other content
  document.querySelectorAll('.main-area > *:not(.page-content)').forEach(el => {
    if (!el.classList.contains('page-content')) {
      el.style.display = 'none';
    }
  });
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Show playlists page (this already exists)
  const playlistsPage = document.getElementById('playlists-page');
  if (playlistsPage) {
    playlistsPage.style.display = 'block';
    displaySuggestedSongs();
    displayUserPlaylists();
  }
}

function showFavoritesPage() {
  // Hide all other content
  document.querySelectorAll('.main-area > *:not(.page-content)').forEach(el => {
    if (!el.classList.contains('page-content')) {
      el.style.display = 'none';
    }
  });
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Show favorites page
  const favoritesPage = document.getElementById('favorites-page');
  if (favoritesPage) {
    favoritesPage.style.display = 'block';
    displayFavorites();
  }
}

function showPlaylistsPage() {
  // Hide all other content
  document.querySelectorAll('.main-area > *:not(.page-content)').forEach(el => {
    if (!el.classList.contains('page-content')) {
      el.style.display = 'none';
    }
  });
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Show playlists page
  const playlistsPage = document.getElementById('playlists-page');
  if (playlistsPage) {
    playlistsPage.style.display = 'block';
    displaySuggestedSongs();
    displayUserPlaylists();
  }
}

function showSettingsPage() {
  // Hide all other content
  document.querySelectorAll('.main-area > *:not(.page-content)').forEach(el => {
    if (!el.classList.contains('page-content')) {
      el.style.display = 'none';
    }
  });
  document.querySelectorAll('.page-content').forEach(page => {
    page.style.display = 'none';
  });

  // Show settings page (create if doesn't exist)
  let settingsPage = document.getElementById('settings-page');
  if (!settingsPage) {
    createSettingsPage();
    settingsPage = document.getElementById('settings-page');
  }
  if (settingsPage) {
    settingsPage.style.display = 'block';
  }
}

// Initialize sidebar navigation on load
safeAddListener(window, 'load', setupSidebarNavigation);

// Profile click to edit
safeAddListener(profileEdit, 'click', (e) => {
  e.stopPropagation();
  showEditProfileModal();
});



// Utility: attach event listeners only when element exists
function safeAddListener(el, event, handler, opts) {
  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener(event, handler, opts);
  }
}

// Initialize click handlers and build `songs` array from DOM cards
function initializeCardListeners() {
  // This function is now mostly for search results or manually added cards
  // Dynamic sections handle their own clicks
}

// Call at startup
safeAddListener(window, 'DOMContentLoaded', () => {
  fetchAllHomeData();
  loadMusicHistory(); // Load saved history
  // createSampleHistory(); // Disabled - will use real songs instead
  restoreLastPlayed(); // Restore last played song

  // Don't display history sections on homepage anymore
  // They will be shown on dedicated pages when navigated to
});

// Check if artist name indicates a collaboration
function isCollaboration(artistName) {
  if (!artistName) return false;

  const collabIndicators = [
    '&', ' and ', ' x ', ' X ', ' feat', ' ft', ' featuring',
    ',', ' with ', ' vs ', ' v/s ', ' collaboration'
  ];

  const name = artistName.toLowerCase();
  return collabIndicators.some(indicator => name.includes(indicator.toLowerCase()));
}

// ======== FAMOUS ARTISTS FETCHING ========
async function fetchFamousArtists() {
  // 🎤 Top Indian Rappers (Hip-Hop / Rap)
  const topRappers = [
    'Divine', 'Raftaar', 'Badshah', 'Emiway Bantai', 'KR$NA',
    'Naezy', 'MC Stan', 'Seedhe Maut', 'Ikka', 'Prabh Deep'
  ];

  // 🎶 Famous Indian Singers / Music Artists
  const famousSingers = [
    'Arijit Singh', 'Shreya Ghoshal', 'A. R. Rahman', 'Atif Aslam',
    'Sonu Nigam', 'Neha Kakkar', 'Jubin Nautiyal', 'Honey Singh',
    'King', 'Diljit Dosanjh'
  ];

  console.log('🎤 Fetching artists in parallel for faster loading...');

  // Create fetch functions for parallel execution
  const fetchArtist = async (artistName, category) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/search/artists?query=${encodeURIComponent(artistName)}&language=hindi&limit=3`
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.success && data?.data?.results) {
          const foundArtist = data.data.results.find(artist => {
            const artistNameLower = (artist.name || '').toLowerCase();
            const searchNameLower = artistName.toLowerCase();
            return artistNameLower.includes(searchNameLower) || searchNameLower.includes(artistNameLower);
          });

          if (foundArtist && foundArtist.id && !isCollaboration(foundArtist.name)) {
            foundArtist.category = category;
            foundArtist.priority = category === 'rappers' ? topRappers.indexOf(artistName) : famousSingers.indexOf(artistName);
            console.log(`✅ Found ${category}: ${foundArtist.name}`);
            return foundArtist;
          }
        }
      }

      // Create fallback if API fails or no match found
      console.log(`⚠️ Using fallback for: ${artistName}`);
      return {
        id: `${artistName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-search`,
        name: artistName,
        category: category,
        priority: category === 'rappers' ? topRappers.indexOf(artistName) : famousSingers.indexOf(artistName),
        image: '/music.png',
        isFallback: true
      };
    } catch (error) {
      console.error(`Error fetching ${artistName}:`, error);
      // Return fallback on error
      return {
        id: `${artistName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-search`,
        name: artistName,
        category: category,
        priority: category === 'rappers' ? topRappers.indexOf(artistName) : famousSingers.indexOf(artistName),
        image: '/music.png',
        isFallback: true
      };
    }
  };

  // Fetch all artists in parallel (much faster!)
  const rapperPromises = topRappers.map(rapper => fetchArtist(rapper, 'rappers'));
  const singerPromises = famousSingers.map(singer => fetchArtist(singer, 'popular'));

  // Wait for all requests to complete
  const [rapperResults, singerResults] = await Promise.all([
    Promise.all(rapperPromises),
    Promise.all(singerPromises)
  ]);

  // Combine and filter results
  const allArtists = [...rapperResults, ...singerResults].filter(Boolean);

  // Remove duplicates and sort by priority
  const uniqueArtists = allArtists.filter((artist, index, self) =>
    index === self.findIndex(a => a.id === artist.id || a.name === artist.name)
  ).sort((a, b) => (a.priority || 0) - (b.priority || 0));

  console.log(`🎵 Successfully fetched ${uniqueArtists.length} artists in parallel!`);
  console.log('Artists loaded:', uniqueArtists.map(a => `${a.name} (${a.category}) ${a.isFallback ? '[Fallback]' : '[API]'} `));

  return uniqueArtists.slice(0, 12); // Limit to 12 artists
}

// ======== FALLBACK ARTIST DATA ========
function createFallbackArtistData() {
  const fallbackRappers = [
    { id: 'divine-fallback', name: 'Divine', category: 'rappers', image: '/music.png' },
    { id: 'raftaar-fallback', name: 'Raftaar', category: 'rappers', image: '/music.png' },
    { id: 'badshah-fallback', name: 'Badshah', category: 'rappers', image: '/music.png' },
    { id: 'emiway-fallback', name: 'Emiway Bantai', category: 'rappers', image: '/music.png' },
    { id: 'krsna-fallback', name: 'KR$NA', category: 'rappers', image: '/music.png' }
  ];

  const fallbackSingers = [
    { id: 'arijit-fallback', name: 'Arijit Singh', category: 'popular', image: '/music.png' },
    { id: 'shreya-fallback', name: 'Shreya Ghoshal', category: 'popular', image: '/music.png' },
    { id: 'rahman-fallback', name: 'A. R. Rahman', category: 'popular', image: '/music.png' },
    { id: 'atif-fallback', name: 'Atif Aslam', category: 'popular', image: '/music.png' },
    { id: 'sonu-fallback', name: 'Sonu Nigam', category: 'popular', image: '/music.png' }
  ];

  return [...fallbackRappers, ...fallbackSingers];
}

// Show artist's songs in a separate page (like playlists)
// Show artist's songs exactly like playlists (using showSongGridWithPagination)
async function showArtistSongsPage(artistId, artistName, category = 'popular') {
  try {
    console.log(`🎵 Loading ${artistName}'s songs like playlists...`);

    let artistSongs = [];
    let apiSuccess = false;

    // Check if this is a fallback artist (has '-fallback' or '-search' in ID)
    const isFallbackArtist = artistId && (artistId.includes('-fallback') || artistId.includes('-search'));

    if (!isFallbackArtist && artistId) {
      // Try to fetch artist's songs with proper artist ID (limit to 20 for pagination)
      try {
        let response = await fetch(`${API_BASE_URL}/api/artists/${artistId}/songs?limit=20`);

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.songs && data.data.songs.length > 0) {
            artistSongs = data.data.songs;
            apiSuccess = true;
          } else if (data.data && data.data.results && data.data.results.length > 0) {
            artistSongs = data.data.results;
            apiSuccess = true;
          }
        }
      } catch (error) {
        console.log('Artist API failed, trying search fallback:', error);
      }
    }

    // If artist API failed or this is a fallback artist, search by name
    if (!apiSuccess) {
      console.log(`🔍 Searching for songs by artist name: ${artistName}`);

      try {
        const searchResponse = await fetch(
          `${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(artistName)}&language=hindi&page=0&limit=20`
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.success && searchData.data && searchData.data.results) {
            artistSongs = searchData.data.results;
            apiSuccess = true;
            console.log(`✅ Found ${artistSongs.length} songs for ${artistName}`);
          }
        }
      } catch (error) {
        console.error('Search API also failed:', error);
      }
    }

    // If still no songs found, try alternative search queries
    if (!apiSuccess || artistSongs.length === 0) {
      console.log(`🔍 Trying alternative search for: ${artistName}`);

      const alternativeQueries = [
        `${artistName} songs`,
        `${artistName} hindi songs`,
        `${artistName} bollywood`,
        artistName.split(' ')[0] // First name only
      ];

      for (const query of alternativeQueries) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(query)}&language=hindi&page=0&limit=20`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.results && data.data.results.length > 0) {
              artistSongs = data.data.results;
              console.log(`✅ Found ${artistSongs.length} songs with query: ${query}`);
              break;
            }
          }
        } catch (error) {
          console.log(`Failed query: ${query}`, error);
        }
      }
    }

    if (artistSongs.length === 0) {
      showNotification(`No songs found for ${artistName}. Try searching manually.`, 'warning');
      // Show empty grid with pagination like playlists do
      showSongGridWithPagination([], `${artistName} Songs`, 'artist', {
        currentPage: 0,
        hasNextPage: false,
        type: 'artist', // Add the type field for navigation
        artistId: artistId,
        artistName: artistName,
        category: category
      });
      return;
    }

    // Show songs using the same function as playlists - this replaces the current content
    // Always enable next page for first page to allow pagination
    showSongGridWithPagination(artistSongs, `🎤 ${artistName} Songs - Page 1`, 'artist', {
      currentPage: 0,
      hasNextPage: true, // Always enable next page for first page
      type: 'artist', // Add the type field for navigation
      artistId: artistId,
      artistName: artistName,
      category: category
    });

    showNotification(`Loaded ${artistSongs.length} songs by ${artistName}! 🎵`, 'success');

  } catch (error) {
    console.error('Error loading artist songs page:', error);
    showNotification(`Error loading ${artistName}'s songs. Please try again.`, 'error');
  }
}







// Load artist songs page with pagination (for artist songs pagination)
async function loadArtistSongsPage(artistId, artistName, page = 0) {
  try {
    console.log(`🎵 Loading ${artistName} songs page ${page + 1}...`);

    showNotification(`Loading ${artistName} songs (Page ${page + 1})...`, 'info');

    let artistSongs = [];

    // Try different search queries for pagination
    const searchQueries = [
      `${artistName}`,
      `${artistName} songs`,
      `${artistName} hindi`,
      `${artistName} bollywood`,
      `${artistName} latest`
    ];

    const query = searchQueries[page % searchQueries.length];

    const response = await fetch(
      `${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(query)}&language=hindi&page=${page}&limit=20`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data && data.data.results) {
        artistSongs = data.data.results;
      }
    }

    if (artistSongs.length === 0) {
      if (page === 0) {
        showNotification(`No songs found for ${artistName}`, 'warning');
        showSongGridWithPagination([], `${artistName} Songs`, 'artist', {
          currentPage: 0,
          hasNextPage: false,
          type: 'artist', // Add the type field for navigation
          artistId: artistId,
          artistName: artistName
        });
      } else {
        showNotification(`No more songs available (Page ${page + 1})`, 'warning');
        // Show previous page data with disabled next button
        showSongGridWithPagination([], `🎤 ${artistName} Songs - Page ${page + 1}`, 'artist', {
          currentPage: page,
          hasNextPage: false,
          type: 'artist', // Add the type field for navigation
          artistId: artistId,
          artistName: artistName
        });
      }
    } else {
      // Show songs with pagination controls
      showSongGridWithPagination(artistSongs, `🎤 ${artistName} Songs - Page ${page + 1}`, 'artist', {
        currentPage: page,
        hasNextPage: artistSongs.length >= 20, // If we got 20 songs, there might be more
        type: 'artist', // Add the type field for navigation
        artistId: artistId,
        artistName: artistName
      });

      showNotification(`Loaded ${artistSongs.length} songs from page ${page + 1}`, 'success');
    }

  } catch (error) {
    console.error(`Error loading artist songs page ${page}:`, error);
    showNotification(`Error loading page ${page + 1}`, 'error');
  }
}

async function fetchAllHomeData() {
  console.log('🚀 Starting fetchAllHomeData...');
  try {
    // Load user data first
    loadUserData();

    // Show loading skeletons immediately for better UX
    const artistContainer = document.getElementById("popular-artists-container");
    if (artistContainer) {
      renderPopularArtists([]); // This will show loading skeletons
    }

    // Fetch Trending Songs (first page)
    console.log('📈 Fetching trending songs...');
    const trendingSuccess = await fetchTrendingSongs(0, false);
    console.log('📈 Trending songs result:', trendingSuccess ? '✅ SUCCESS' : '❌ FAILED');

    // Fetch New Releases (first page)
    console.log('�  Fetching new releases...');
    const releasesSuccess = await fetchNewReleases(0, false);
    console.log('🆕 New releases result:', releasesSuccess ? '✅ SUCCESS' : '❌ FAILED');
    await fetchNewReleases(0, false);

    // Fetch Popular Artists with famous names (now much faster with parallel requests)
    console.log('🎤 Fetching popular artists...');
    try {
      const famousArtists = await fetchFamousArtists();
      console.log('🎤 Popular artists result: ✅ SUCCESS');
      renderPopularArtists(famousArtists);
    } catch (error) {
      console.error("Error fetching popular artists:", error);
      renderPopularArtists([]);
    }

    // Fetch Featured Playlists
    const featuredPlaylistsData = await apiFetchJson(
      `${API_BASE_URL}/api/search/playlists?query=bollywood%20romantic%20hits&page=0&limit=10`
    );

    if (
      featuredPlaylistsData?.success &&
      Array.isArray(featuredPlaylistsData?.data?.results)
    ) {
      renderFeaturedPlaylists(featuredPlaylistsData.data.results);
    } else {
      console.warn("Featured Playlists API returned empty results");
      renderFeaturedPlaylists([]);
    }

  } catch (error) {
    console.error("Error fetching home data:", error);
    showNotification(
      `Error loading home data: ${error.message}`,
      "error"
    );

    // Safe fallbacks
    if (!document.getElementById("trending-songs-container")?.children.length) {
      useFallbackTrendingSongs();
    }
  }

  // After all data is loaded, populate history with real songs for demo
  setTimeout(() => {
    populateHistoryWithRealSongs();
    displayFavorites();
    displaySuggestedSongs();
  }, 2000); // Increased delay to ensure DOM is ready
}


// ======== MAIN FUNCTIONS ========

// Track loading state to prevent race conditions
let isLoading = false;
let isWaitingToPlay = false;

async function loadSong(songOrIndex) {
  try {
    // Prevent multiple simultaneous loads
    if (isLoading) {
      console.log('Already loading a song, queuing this request');
      return false;
    }

    isLoading = true;
    isWaitingToPlay = false;

    // Handle both song object and index
    const song = typeof songOrIndex === 'number' ? songs[songOrIndex] : songOrIndex;

    if (!song) {
      console.error('Invalid song object:', song);
      showNotification('Error: Invalid song data', 'error');
      isLoading = false;
      return false;
    }

    // Update current index if we have a numeric index
    if (typeof songOrIndex === 'number') {
      currentSongIndex = songOrIndex;
    } else {
      // Find the song index in the songs array if we have a song object
      currentSongIndex = songs.findIndex(s => s.id === song.id);
    }

    // Check for required properties
    if (!song.url && (!song.downloadUrl || !song.downloadUrl.length)) {
      console.error('No playable URL found for song:', song);
      showNotification('This song is not available for playback', 'warning');
      isLoading = false;
      return false;
    }

    console.log('Loading song:', song.title || 'Unknown Title');

    // Pause current playback if any
    try {
      if (!audio.paused) {
        await audio.pause();
      }
      audio.currentTime = 0;
    } catch (e) {
      console.log('Error pausing current audio:', e);
    }

    // Clear previous source and reset audio element
    while (audio.firstChild) {
      audio.removeChild(audio.firstChild);
    }

    // Reset error state
    audio.removeAttribute('src');
    audio.load();

    // Get the best available URL from song data using the centralized function
    let audioUrl = getAudioUrl(song);

    if (!audioUrl) {
      throw new Error('No playable URL found for song');
    }

    console.log('Final audio URL:', audioUrl);

    // Validate the URL one more time before setting it
    if (typeof audioUrl !== 'string' || !audioUrl.startsWith('http') || audioUrl.includes('[object Object]')) {
      console.error('Invalid audio URL detected:', audioUrl, 'Type:', typeof audioUrl);
      throw new Error('Invalid audio URL format');
    }

    // Create new source element
    const source = document.createElement('source');
    source.src = audioUrl;

    // Try to determine the MIME type from the URL or content type
    const url = (audioUrl || '').toLowerCase();
    const contentType = song.type || '';

    // First try to determine from content type if available
    if (contentType.includes('mpeg') || contentType.includes('mp3')) {
      source.type = 'audio/mpeg';
    } else if (contentType.includes('wav')) {
      source.type = 'audio/wav';
    } else if (contentType.includes('ogg') || contentType.includes('oga') || contentType.includes('opus')) {
      source.type = 'audio/ogg';
    } else if (contentType.includes('mp4') || contentType.includes('m4a') || contentType.includes('aac')) {
      source.type = 'audio/mp4';
    }
    // Then try to determine from URL extension
    else if (url.endsWith('.mp3') || url.includes('.mp3?') || url.includes('mp3/')) {
      source.type = 'audio/mpeg';
    } else if (url.endsWith('.wav') || url.includes('.wav?')) {
      source.type = 'audio/wav';
    } else if (url.endsWith('.ogg') || url.endsWith('.oga') || url.endsWith('.opus') ||
      url.includes('.ogg?') || url.includes('.oga?') || url.includes('.opus?')) {
      source.type = 'audio/ogg';
    } else if (url.endsWith('.m4a') || url.endsWith('.aac') || url.endsWith('.mp4') ||
      url.includes('.m4a?') || url.includes('.aac?') || url.includes('.mp4?')) {
      source.type = 'audio/mp4';
    }
    // Fallback to generic types based on common patterns
    else if (url.includes('mp3') || url.includes('mpeg')) {
      console.log('Assuming MP3 format based on URL pattern');
      source.type = 'audio/mpeg';
    } else if (url.includes('aac') || url.includes('m4a') || url.includes('mp4')) {
      console.log('Assuming AAC/MP4 format based on URL pattern');
      source.type = 'audio/mp4';
    } else {
      console.warn(`Unknown audio format for URL: ${url}, defaulting to MP3`);
      source.type = 'audio/mpeg'; // Default fallback
    }

    audio.appendChild(source);


    // Force a reload of the audio element
    audio.load();

    // Create a promise that resolves when the audio is loaded
    const loadPromise = new Promise((resolve, reject) => {
      // Set a timeout for audio loading
      const timeout = setTimeout(() => {
        const error = new Error('Audio load timed out after 20 seconds');
        console.error('Audio load timed out. Current state:', {
          readyState: audio.readyState,
          networkState: audio.networkState,
          error: audio.error,
          src: audio.currentSrc || source.src,
          song: {
            id: song.id,
            title: song.title,
            url: song.url,
            downloadUrl: song.downloadUrl
          }
        });
        reject(error);
      }, 20000); // 20 second timeout

      const onCanPlay = () => {
        console.log('Audio can play, readyState:', audio.readyState);
        clearTimeout(timeout);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('stalled', onStalled);
        resolve();
      };

      const onError = (e) => {
        const errorDetails = {
          error: e,
          readyState: audio.readyState,
          networkState: audio.networkState,
          errorState: audio.error,
          src: audio.currentSrc || source.src,
          song: {
            id: song.id,
            title: song.title,
            url: song.url,
            downloadUrl: song.downloadUrl
          }
        };

        console.error('Audio error:', errorDetails);
        clearTimeout(timeout);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('stalled', onStalled);

        // Show user-friendly error message
        const errorMessage = audio.error ?
          `Playback error (${audio.error.code}): ${getErrorMessage(audio.error)}` :
          'Failed to load audio';
        showNotification(errorMessage, 'error');

        reject(new Error(errorMessage));
      };

      const onStalled = () => {
        console.warn('Audio loading stalled, retrying...');
        audio.load(); // Try to force a reload
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.addEventListener('stalled', onStalled);

      // For debugging
      audio.addEventListener('loadstart', () => console.log('Audio load started'));
      audio.addEventListener('progress', () => console.log('Audio loading progress'));
      audio.addEventListener('loadedmetadata', () => console.log('Audio metadata loaded'));
      audio.addEventListener('loadeddata', () => console.log('Audio data loaded'));
      audio.addEventListener('canplaythrough', () => console.log('Audio can play through'));
    });

    // Wait for either canplaythrough or error with a longer timeout
    const LOAD_TIMEOUT = 20000; // 20 seconds

    try {
      await Promise.race([
        loadPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Audio load timeout after ${LOAD_TIMEOUT / 1000} seconds`)), LOAD_TIMEOUT))
      ]);
    } catch (error) {
      console.error('Error during audio loading:', error);
      // Try to get more information about the audio element's state
      console.log('Audio element readyState:', audio.readyState);
      console.log('Audio element networkState:', audio.networkState);
      console.log('Audio element error:', audio.error);
      throw error;
    }

    // Update UI with enhanced image handling
    const songCover = song.cover || getImageUrl(song.image) || '/music.png';

    if (nowPlayingArt) nowPlayingArt.src = songCover;
    if (trackTitle) trackTitle.textContent = song.title || 'Unknown Title';
    if (trackArtist) trackArtist.textContent = song.artist || 'Unknown Artist';

    // Update Mini Player with enhanced image handling
    if (miniPlayerImage) {
      miniPlayerImage.src = songCover;
      console.log('Mini player image updated to:', songCover);
    }
    if (miniPlayerTitle) miniPlayerTitle.textContent = song.title || 'Not Playing';
    if (miniPlayerArtist) miniPlayerArtist.textContent = song.artist || '-';

    // Show mini player
    showMiniPlayer();

    // Update Fullscreen Player with enhanced image handling
    if (fullscreenAlbumArt) fullscreenAlbumArt.src = songCover;
    if (fullscreenSongTitle) fullscreenSongTitle.textContent = song.title || '-';
    if (fullscreenArtist) fullscreenArtist.textContent = song.artist || '-';

    // Reset progress bars
    if (progressBar) progressBar.value = 0;
    if (fullscreenProgress) fullscreenProgress.value = 0;

    console.log('Song loaded successfully:', song.title);

    // If there's a pending play request, play directly without calling playSong
    if (isWaitingToPlay) {
      console.log('Executing queued play request');
      isWaitingToPlay = false;

      // Play directly instead of calling playSong to avoid recursion
      try {
        await audio.play();
        isPlaying = true;
        if (playButton) playButton.innerHTML = '<i class="bi bi-pause-fill"></i>';
        if (fullscreenPlay) fullscreenPlay.innerHTML = '<i class="bi bi-pause-fill"></i>';
        if (miniPlayButton) miniPlayButton.innerHTML = '<i class="bi bi-pause-fill"></i>';
        console.log('Audio started playing from queued request');
      } catch (playError) {
        console.error('Error playing queued audio:', playError);
        isPlaying = false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error loading song:', error);
    // Update UI to show error state
    if (trackTitle) trackTitle.textContent = 'Error loading song';
    if (trackArtist) trackArtist.textContent = '';
    return false;
  } finally {
    isLoading = false;
  }
}

async function playSong() {
  try {
    if (!songs[currentSongIndex]) {
      console.error('No song to play at index:', currentSongIndex);
      return false;
    }

    const currentSong = songs[currentSongIndex];
    console.log('Attempting to play:', currentSong.title);

    // If we're currently loading a song, queue the play request
    if (isLoading) {
      console.log('Song is still loading, queuing play request');
      isWaitingToPlay = true;
      return false;
    }

    // If audio is not loaded or we have a pending load, load it first
    if (audio.readyState === 0 || audio.readyState === 1) { // HAVE_NOTHING or HAVE_METADATA
      console.log('Audio not ready, loading first');
      isWaitingToPlay = true;
      const loaded = await loadSong(currentSongIndex);
      if (!loaded) throw new Error('Failed to load song');
      // Don't call playSong again here - let loadSong handle the playing
      return true;
    }

    // If we're already playing, do nothing
    if (!audio.paused) {
      console.log('Audio is already playing');
      return true;
    }

    console.log('Playing audio...');

    try {
      // Play the audio and handle the promise
      await audio.play();

      isPlaying = true;

      // Update UI
      if (playButton) playButton.innerHTML = '<i class="bi bi-pause-fill"></i>';
      if (miniPlayButton) miniPlayButton.innerHTML = '<i class="bi bi-pause-fill"></i>';
      if (fullscreenPlay) fullscreenPlay.innerHTML = '<i class="bi bi-pause-fill"></i>';

      // Track song play for history and recommendations
      if (typeof trackSongPlay === 'function') {
        trackSongPlay(currentSong, 0);
      }

      // Show mini player when playing
      showMiniPlayer();

      console.log('Now playing:', currentSong.title);
      return true;

    } catch (playError) {
      console.error('Play error:', playError);

      // If the error is because the user hasn't interacted with the page yet
      if (playError.name === 'NotAllowedError' ||
        playError.message.includes('user gesture')) {
        console.log('Waiting for user interaction...');
        // We'll let the user click play again

        // Show a message to the user
        if (trackTitle) trackTitle.textContent = 'Click play to start';
        if (trackArtist) trackArtist.textContent = '';

        // Set up a one-time play on user interaction
        const playOnInteraction = () => {
          document.removeEventListener('click', playOnInteraction);
          document.removeEventListener('keydown', playOnInteraction);
          document.removeEventListener('touchstart', playOnInteraction);
          playSong().catch(console.error);
        };

        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('keydown', playOnInteraction, { once: true });
        document.addEventListener('touchstart', playOnInteraction, { once: true });

        return false;
      }

      throw playError; // Re-throw other errors
    }
  } catch (error) {
    console.error('Error in playSong:', error);
    isPlaying = false;

    // Reset UI
    if (playButton) {
      playButton.innerHTML = '<i class="bi bi-play-fill"></i>';
      playButton.setAttribute('aria-label', 'Play');
    }

    if (miniPlayButton) {
      miniPlayButton.innerHTML = '<i class="bi bi-play-fill"></i>';
      miniPlayButton.setAttribute('aria-label', 'Play');
    }

    if (fullscreenPlay) {
      fullscreenPlay.innerHTML = '<i class="bi bi-play-fill"></i>';
      fullscreenPlay.setAttribute('aria-label', 'Play');
    }

    // Show error to user
    const errorMessage = getErrorMessage(error);
    showNotification(`Playback failed: ${errorMessage}`, 'error');

    return false;
  }
}

function pauseSong() {
  console.log('pauseSong called. Audio paused:', audio ? audio.paused : 'no audio');

  if (audio && !audio.paused) {
    console.log('Pausing audio');
    audio.pause();
  }
  isPlaying = false;
  console.log('Set isPlaying to false');

  // Update Buttons
  if (playButton) playButton.innerHTML = `<i class="bi bi-play-fill"></i>`;
  if (miniPlayButton) miniPlayButton.innerHTML = `<i class="bi bi-play-fill"></i>`;
  if (fullscreenPlay) fullscreenPlay.innerHTML = `<i class="bi bi-play-fill"></i>`;
}

function togglePlay() {
  console.log('Main app togglePlay called. Audio paused:', audio ? audio.paused : 'no audio');

  if (!songs.length || !songs[currentSongIndex]) {
    showNotification('No song selected', 'warning');
    return;
  }

  // Check actual audio state instead of just relying on isPlaying variable
  const actuallyPlaying = audio && !audio.paused;
  console.log('Actually playing (audio state):', actuallyPlaying);

  if (actuallyPlaying) {
    console.log('Audio is actually playing, calling pauseSong()');
    pauseSong();
  } else {
    console.log('Audio is not playing, calling playSong()');
    playSong();
  }
}

async function nextSong() {
  currentSongIndex = (currentSongIndex + 1) % songs.length;
  await loadSong(currentSongIndex);
  playSong();
}

async function prevSong() {
  currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  await loadSong(currentSongIndex);
  playSong();
}

// Explicit exports keep helper scripts aligned with one playback source of truth.
window.togglePlay = togglePlay;
window.nextSong = nextSong;
window.prevSong = prevSong;
window.loadSong = loadSong;
window.playSong = playSong;
window.pauseSong = pauseSong;

// ======== TIME & PROGRESS UPDATES ========

// Function to show mini player
function showMiniPlayer() {
  console.log('Attempting to show mini player');
  if (miniPlayer) {
    miniPlayer.classList.add('show');
    console.log('Mini player shown successfully');

    // Ensure it's visible by forcing display
    miniPlayer.style.display = 'block';
    miniPlayer.style.opacity = '1';
    miniPlayer.style.transform = 'translateY(0)';
  } else {
    console.error('Mini player element not found');
  }
}

// Function to hide mini player
function hideMiniPlayer() {
  if (miniPlayer) {
    miniPlayer.classList.remove('show');
  }
}

// Function to update now playing display in all players
function updateNowPlaying(song) {
  if (!song) return;

  const title = song.title || song.name || 'Unknown Title';
  const artist = song.artist || song.primaryArtists || 'Unknown Artist';
  const cover = song.cover || getImageUrl(song.image) || '/music.png';

  console.log('updateNowPlaying called with cover:', cover);

  // Update main control bar
  if (trackTitle) trackTitle.textContent = title;
  if (trackArtist) trackArtist.textContent = artist;
  if (nowPlayingArt) nowPlayingArt.src = cover;

  // Update mini player
  if (miniPlayerTitle) miniPlayerTitle.textContent = title;
  if (miniPlayerArtist) miniPlayerArtist.textContent = artist;
  if (miniPlayerImage) {
    miniPlayerImage.src = cover;
    console.log('Mini player image updated via updateNowPlaying to:', cover);
  }

  // Update fullscreen player
  if (fullscreenSongTitle) fullscreenSongTitle.textContent = title;
  if (fullscreenArtist) fullscreenArtist.textContent = artist;
  if (fullscreenAlbumArt) fullscreenAlbumArt.src = cover;

  // Show mini player
  showMiniPlayer();
}

// Update progress bars
function updateProgressBars() {
  const { currentTime, duration } = audio;

  if (duration) {
    const progressPercent = (currentTime / duration) * 100;

    // Update main progress bar
    if (progressBar) progressBar.value = progressPercent;

    // Update mini player progress bar
    const miniProgressBar = document.getElementById('miniProgressBar');
    if (miniProgressBar) {
      miniProgressBar.style.width = `${progressPercent}%`;
    }

    // Update fullscreen progress bar
    if (fullscreenProgress) fullscreenProgress.value = progressPercent;

    // Update time displays
    if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
    if (durationEl) durationEl.textContent = formatTime(duration);

    if (miniCurrentTimeEl) miniCurrentTimeEl.textContent = formatTime(currentTime);
    if (miniDurationEl) miniDurationEl.textContent = formatTime(duration);

    if (fullscreenCurrentTime) fullscreenCurrentTime.textContent = formatTime(currentTime);
    if (fullscreenDuration) fullscreenDuration.textContent = formatTime(duration);
  }
}

if (audio) {
  safeAddListener(audio, 'timeupdate', updateProgressBars);
}

// Handle mini player progress input
const miniProgressInput = document.getElementById('miniProgressInput');
if (miniProgressInput) {
  safeAddListener(miniProgressInput, 'input', () => {
    if (audio.duration) {
      audio.currentTime = (miniProgressInput.value / 100) * audio.duration;
    }
  });
}

// Handle progress container click
const progressContainer = document.querySelector('.progress-container');
if (progressContainer) {
  safeAddListener(progressContainer, 'click', (e) => {
    if (audio.duration) {
      const rect = progressContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const clickPercent = (clickX / width) * 100;
      audio.currentTime = (clickPercent / 100) * audio.duration;
    }
  });
}

if (progressBar) safeAddListener(progressBar, 'input', () => {
  if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration;
});

if (fullscreenProgress) safeAddListener(fullscreenProgress, 'input', () => {
  if (audio.duration) audio.currentTime = (fullscreenProgress.value / 100) * audio.duration;
});

function formatTime(sec) {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

// ======== ENHANCED VOLUME CONTROLLER FUNCTIONS ========

function updateVolumeSliderAppearance(slider, volumeValue) {
  if (!slider) return;

  const percentage = volumeValue;

  // Update CSS custom property for gradient
  slider.style.setProperty('--volume-percent', `${percentage}%`);

  // Set volume level data attribute for styling
  let volumeLevel = 'medium';
  if (percentage === 0) {
    volumeLevel = 'muted';
  } else if (percentage < 30) {
    volumeLevel = 'low';
  } else if (percentage < 70) {
    volumeLevel = 'medium';
  } else {
    volumeLevel = 'high';
  }

  slider.setAttribute('data-volume', volumeLevel);

  // Update button data attribute if it exists
  const button = slider.parentElement?.querySelector('button');
  if (button) {
    button.setAttribute('data-volume', volumeLevel);
  }

  console.log(`🔊 Volume slider updated: ${percentage}% (${volumeLevel})`);
}

function createVolumeVisualization(container, volumeLevel) {
  // Remove existing visualization
  const existing = container.querySelector('.volume-bars');
  if (existing) existing.remove();

  // Create volume bars
  const volumeBars = document.createElement('div');
  volumeBars.className = 'volume-bars';

  for (let i = 0; i < 5; i++) {
    const bar = document.createElement('div');
    bar.className = 'volume-bar';

    // Activate bars based on volume level
    const threshold = (i + 1) * 20; // 20%, 40%, 60%, 80%, 100%
    if (volumeLevel >= threshold) {
      bar.classList.add('active');
      if (volumeLevel >= 80) {
        bar.classList.add('pulse');
      }
    }

    volumeBars.appendChild(bar);
  }

  container.appendChild(volumeBars);
}

// ======== CONTROL BUTTON EVENTS ========

// Initialize volume controls
function initializeVolumeControls() {
  console.log('Initializing volume controls');

  // Set initial volume
  if (audio) {
    audio.volume = 0.8; // 80% default volume
    console.log('Audio volume set to 80%');
  }

  // Mini player volume control
  const miniVolumeButton = document.getElementById('miniVolumeButton');
  const miniVolumeSlider = document.getElementById('miniVolumeSlider');

  console.log('Mini volume elements:', { button: !!miniVolumeButton, slider: !!miniVolumeSlider });

  if (miniVolumeSlider) {
    // Set initial volume appearance
    updateVolumeSliderAppearance(miniVolumeSlider, 80);

    safeAddListener(miniVolumeSlider, 'input', (e) => {
      const volume = e.target.value / 100;
      if (audio) audio.volume = volume;
      console.log('Volume changed to:', volume);

      // Update volume button icon
      updateVolumeIcon(miniVolumeButton, volume);

      // Update volume slider appearance
      updateVolumeSliderAppearance(miniVolumeSlider, e.target.value);
    });
  }

  if (miniVolumeButton) {
    safeAddListener(miniVolumeButton, 'click', () => {
      if (audio.volume > 0) {
        // Mute
        audio.volume = 0;
        if (miniVolumeSlider) {
          miniVolumeSlider.value = 0;
          updateVolumeSliderAppearance(miniVolumeSlider, 0);
        }
        updateVolumeIcon(miniVolumeButton, 0);
        console.log('Audio muted');
      } else {
        // Unmute
        audio.volume = 0.8;
        if (miniVolumeSlider) {
          miniVolumeSlider.value = 80;
          updateVolumeSliderAppearance(miniVolumeSlider, 80);
        }
        updateVolumeIcon(miniVolumeButton, 0.8);
        console.log('Audio unmuted');
      }
    });
  }

  // Fullscreen player volume control
  const fullscreenVolumeSlider = document.getElementById('fullscreenVolume');
  const fullscreenMuteButton = document.getElementById('fullscreenMute');

  if (fullscreenVolumeSlider) {
    // Set initial volume appearance
    updateVolumeSliderAppearance(fullscreenVolumeSlider, 80);

    safeAddListener(fullscreenVolumeSlider, 'input', (e) => {
      const volume = e.target.value / 100;
      if (audio) audio.volume = volume;

      // Sync with mini player
      if (miniVolumeSlider) {
        miniVolumeSlider.value = e.target.value;
        updateVolumeSliderAppearance(miniVolumeSlider, e.target.value);
      }

      // Update volume icons
      updateVolumeIcon(fullscreenMuteButton, volume);
      updateVolumeIcon(miniVolumeButton, volume);

      // Update fullscreen volume slider appearance
      updateVolumeSliderAppearance(fullscreenVolumeSlider, e.target.value);
    });
  }

  if (fullscreenMuteButton) {
    safeAddListener(fullscreenMuteButton, 'click', () => {
      if (audio.volume > 0) {
        // Mute
        audio.volume = 0;
        if (fullscreenVolumeSlider) {
          fullscreenVolumeSlider.value = 0;
          updateVolumeSliderAppearance(fullscreenVolumeSlider, 0);
        }
        if (miniVolumeSlider) {
          miniVolumeSlider.value = 0;
          updateVolumeSliderAppearance(miniVolumeSlider, 0);
        }
        updateVolumeIcon(fullscreenMuteButton, 0);
        updateVolumeIcon(miniVolumeButton, 0);
      } else {
        // Unmute
        audio.volume = 0.8;
        if (fullscreenVolumeSlider) {
          fullscreenVolumeSlider.value = 80;
          updateVolumeSliderAppearance(fullscreenVolumeSlider, 80);
        }
        if (miniVolumeSlider) {
          miniVolumeSlider.value = 80;
          updateVolumeSliderAppearance(miniVolumeSlider, 80);
        }
        updateVolumeIcon(fullscreenMuteButton, 0.8);
        updateVolumeIcon(miniVolumeButton, 0.8);
      }
    });
  }
}

// Helper function to update volume icon based on volume level
function updateVolumeIcon(button, volume) {
  if (!button) return;

  if (volume === 0) {
    button.innerHTML = '<i class="bi bi-volume-mute"></i>';
  } else if (volume < 0.5) {
    button.innerHTML = '<i class="bi bi-volume-down"></i>';
  } else {
    button.innerHTML = '<i class="bi bi-volume-up"></i>';
  }
}

// Initialize audio event listeners for better state management
function initializeAudioEvents() {
  if (!audio) return;

  // Handle audio play event
  safeAddListener(audio, 'play', () => {
    isPlaying = true;
    updatePlayButtonIcons(true);
  });

  // Handle audio pause event
  safeAddListener(audio, 'pause', () => {
    isPlaying = false;
    updatePlayButtonIcons(false);

    // Save current position for resume
    if (songs[currentSongIndex] && audio.currentTime > 0) {
      saveLastPlayed(songs[currentSongIndex], audio.currentTime);
    }
  });

  // Handle audio ended event
  safeAddListener(audio, 'ended', () => {
    isPlaying = false;
    updatePlayButtonIcons(false);

    // Track full song play and save position
    if (songs[currentSongIndex]) {
      trackSongPlay(songs[currentSongIndex], audio.duration || 0);
      saveLastPlayed(songs[currentSongIndex], 0); // Reset position for next play
    }

    nextSong();
  });

  // Handle audio error event
  safeAddListener(audio, 'error', (e) => {
    console.error('Audio error:', e);
    isPlaying = false;
    updatePlayButtonIcons(false);
    showNotification('Audio playback error', 'error');
  });
}

// Helper function to update all play button icons
function updatePlayButtonIcons(playing) {
  const icon = playing ? '<i class="bi bi-pause-fill"></i>' : '<i class="bi bi-play-fill"></i>';

  if (playButton) playButton.innerHTML = icon;
  if (miniPlayButton) miniPlayButton.innerHTML = icon;
  if (fullscreenPlay) fullscreenPlay.innerHTML = icon;
}

// Control Bar
safeAddListener(playButton, 'click', togglePlay);
safeAddListener(prevButton, 'click', prevSong);
safeAddListener(nextButton, 'click', nextSong);

// Mini Player
safeAddListener(miniPlayButton, 'click', togglePlay);
safeAddListener(miniNextButton, 'click', nextSong);
safeAddListener(miniPrevButton, 'click', prevSong);
safeAddListener(expandPlayer, 'click', () => {
  if (fullscreenPlayer) {
    fullscreenPlayer.classList.add('active');
    document.body.classList.add('fullscreen-active');
    document.body.style.overflow = 'hidden';
  }
});

// Fullscreen Player
// Note: Play/Prev/Next buttons are handled by fullscreen-player-enhancements.js
// safeAddListener(fullscreenPlay, 'click', togglePlay);
// safeAddListener(fullscreenNext, 'click', nextSong);
// safeAddListener(fullscreenPrev, 'click', prevSong);
safeAddListener(closeFullscreen, 'click', () => {
  if (fullscreenPlayer) {
    fullscreenPlayer.classList.remove('active');
    document.body.classList.remove('fullscreen-active');
    document.body.style.overflow = '';
  }
});

// Shuffle, Repeat, and Playlist buttons
const fullscreenShuffle = document.getElementById('fullscreenShuffle');
const fullscreenRepeat = document.getElementById('fullscreenRepeat');
const fullscreenPlaylist = document.getElementById('fullscreenPlaylist');

safeAddListener(fullscreenShuffle, 'click', toggleShuffle);
safeAddListener(fullscreenRepeat, 'click', toggleRepeat);
safeAddListener(fullscreenPlaylist, 'click', toggleQueuePanel);

// Add escape key listener to close fullscreen player
safeAddListener(document, 'keydown', (e) => {
  if (e.key === 'Escape' && fullscreenPlayer && fullscreenPlayer.classList.contains('active')) {
    fullscreenPlayer.classList.remove('active');
    document.body.classList.remove('fullscreen-active');
    document.body.style.overflow = '';
  }
});

// Initialize controls
initializeVolumeControls();
initializeAudioEvents();

// Keyboard shortcuts
safeAddListener(document, 'keydown', (e) => {
  // Don't trigger shortcuts when typing in input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      e.preventDefault();
      nextSong();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      prevSong();
      break;
    case 'ArrowUp':
      e.preventDefault();
      // Increase volume
      if (audio && audio.volume < 1) {
        const newVolume = Math.min(1, audio.volume + 0.1);
        audio.volume = newVolume;
        const volumePercent = Math.round(newVolume * 100);

        // Update sliders
        const miniVolumeSlider = document.getElementById('miniVolumeSlider');
        const fullscreenVolumeSlider = document.getElementById('fullscreenVolume');
        if (miniVolumeSlider) miniVolumeSlider.value = volumePercent;
        if (fullscreenVolumeSlider) fullscreenVolumeSlider.value = volumePercent;

        // Update icons
        updateVolumeIcon(document.getElementById('miniVolumeButton'), newVolume);
        updateVolumeIcon(document.getElementById('fullscreenMute'), newVolume);

        showNotification(`Volume: ${volumePercent}%`, 'info');
      }
      break;
    case 'ArrowDown':
      e.preventDefault();
      // Decrease volume
      if (audio && audio.volume > 0) {
        const newVolume = Math.max(0, audio.volume - 0.1);
        audio.volume = newVolume;
        const volumePercent = Math.round(newVolume * 100);

        // Update sliders
        const miniVolumeSlider = document.getElementById('miniVolumeSlider');
        const fullscreenVolumeSlider = document.getElementById('fullscreenVolume');
        if (miniVolumeSlider) miniVolumeSlider.value = volumePercent;
        if (fullscreenVolumeSlider) fullscreenVolumeSlider.value = volumePercent;

        // Update icons
        updateVolumeIcon(document.getElementById('miniVolumeButton'), newVolume);
        updateVolumeIcon(document.getElementById('fullscreenMute'), newVolume);

        showNotification(`Volume: ${volumePercent}%`, 'info');
      }
      break;
    case 'KeyM':
      e.preventDefault();
      // Toggle mute
      const miniVolumeButton = document.getElementById('miniVolumeButton');
      if (miniVolumeButton) miniVolumeButton.click();
      break;
  }
});

function renderTrendingSongs(songsData, append = false) {
  const container = document.getElementById("trending-songs-container");
  if (!container) return;

  console.log('=== RENDERING TRENDING SONGS ===');
  console.log('Songs data received:', songsData.length, 'songs');
  console.log('First song data:', songsData[0]);

  if (!append) {
    container.innerHTML = "";
    // Reset or initialize global songs array for sequential playback
    songs = [];
  }

  // Process and add songs to global array
  const processedSongs = songsData.map((s, index) => {
    console.log(`Processing trending song ${index}:`, s.title || s.name);
    console.log('  Raw image data:', s.image);
    const processed = processSongData(s);
    console.log('  Processed image URL:', processed.cover);
    return processed;
  });
  songs = append ? [...songs, ...processedSongs] : processedSongs;

  // For homepage, limit to 10 songs in horizontal scroll
  const songsToShow = processedSongs.slice(0, 10);

  // Create cards for new songs
  songsToShow.forEach((song, index) => {
    console.log(`Creating card for trending song ${index}:`, song.title, 'Cover:', song.cover);
    const globalIndex = append ? songs.length - processedSongs.length + index : index;
    const card = createSongCard(song, globalIndex, false, false, true); // Enable queue and like buttons
    container.appendChild(card);
  });

  console.log('Trending songs rendering complete');
}

function renderNewReleases(albumsData, append = false) {
  const container = document.getElementById("new-releases-container");
  if (!container) return;

  console.log('Rendering new releases on home page:', albumsData.length, 'albums');

  if (!append) {
    container.innerHTML = "";
  }

  // For homepage, limit to 10 albums in horizontal scroll
  const albumsToShow = albumsData.slice(0, 10);

  albumsToShow.forEach((album, index) => {
    console.log(`Home page album ${index}:`, album.title || album.name, 'Image data:', album.image);
    const card = createMediaCard(album, 'album');
    container.appendChild(card);
  });

  console.log('Home page new releases rendered successfully');
}

// Create or update "Show More" button for sections - REMOVED
// This functionality is now handled by dedicated pages

function renderPopularArtists(artistsData) {
  const container = document.getElementById("popular-artists-container");
  if (!container) return;

  // Clear any existing content
  container.innerHTML = "";

  // Show loading skeletons if no data
  if (!artistsData || artistsData.length === 0) {
    for (let i = 0; i < 6; i++) {
      const skeleton = createArtistLoadingSkeleton();
      container.appendChild(skeleton);
    }
    return;
  }

  // Add staggered animation for better visual effect
  artistsData.forEach((artist, index) => {
    // Create artist card using the new function
    const card = createArtistCard(artist, index, artist.category || 'popular');

    // Add priority class for top artists
    if (index < 5) {
      card.classList.add('priority-artist');
    }

    // Add staggered animation delay
    card.style.animationDelay = `${index * 0.1}s`;
    card.classList.add('fade-in-up');

    container.appendChild(card);
  });
}

// Create loading skeleton for artist cards
function createArtistLoadingSkeleton() {
  const skeleton = document.createElement('div');
  skeleton.className = 'artist-loading-skeleton artist-card-circular';

  skeleton.innerHTML = `
      <div class="circular-artist-container">
        <div class="circular-artist-image skeleton-circle">
          <div class="skeleton-shimmer"></div>
        </div>
        <div class="artist-info">
          <div class="skeleton-text skeleton-name"></div>
          <div class="skeleton-text skeleton-badge"></div>
        </div>
      </div>
    `;

  return skeleton;
}

function renderFeaturedPlaylists(playlistsData) {
  const container = document.getElementById("featured-playlists-container");
  if (!container) return;
  container.innerHTML = "";

  playlistsData.forEach(playlist => {
    const card = createMediaCard(playlist, 'playlist');
    container.appendChild(card);
  });
}

// ======== MOOD CLASSIFICATION SYSTEM ========
function classifySongMood(title, artist) {
  if (!title) return 'bollywood';

  const titleLower = title.toLowerCase();
  const artistLower = (artist || '').toLowerCase();

  // Romantic keywords
  const romanticKeywords = [
    'love', 'pyaar', 'ishq', 'mohabbat', 'dil', 'heart', 'romantic', 'romance',
    'tum', 'tu', 'tera', 'mera', 'saath', 'together', 'kiss', 'hug', 'valentine',
    'beloved', 'darling', 'jaan', 'jaanu', 'baby', 'sweetheart', 'crush',
    'tere', 'mere', 'hamara', 'tumhara', 'sanam', 'mehboob', 'dilbar'
  ];

  // Sad keywords
  const sadKeywords = [
    'sad', 'cry', 'tears', 'broken', 'pain', 'hurt', 'lonely', 'miss', 'goodbye',
    'alvida', 'judai', 'bichhda', 'gham', 'dukh', 'aansu', 'rona', 'udaas',
    'tanhai', 'bewafa', 'dhoka', 'farewell', 'separation', 'heartbreak'
  ];

  // Dance/Party keywords
  const danceKeywords = [
    'dance', 'party', 'celebration', 'festival', 'beat', 'rhythm', 'groove',
    'nachna', 'naach', 'thumka', 'jhatka', 'disco', 'club', 'dj', 'remix',
    'bass', 'drop', 'pump', 'energy', 'high', 'crazy', 'wild', 'fire'
  ];

  // Classical keywords
  const classicalKeywords = [
    'classical', 'raga', 'taal', 'tabla', 'sitar', 'flute', 'veena', 'santoor',
    'hindustani', 'carnatic', 'bhajan', 'kirtan', 'mantra', 'traditional',
    'folk', 'lok', 'geet', 'raag', 'sur', 'swara'
  ];

  // Item song keywords
  const itemKeywords = [
    'item', 'number', 'hot', 'sexy', 'bold', 'glamour', 'sizzling', 'steamy',
    'munni', 'sheila', 'katrina', 'malaika', 'bipasha', 'priyanka'
  ];

  // Devotional keywords
  const devotionalKeywords = [
    'bhajan', 'kirtan', 'aarti', 'mantra', 'god', 'bhagwan', 'allah', 'jesus',
    'ram', 'krishna', 'shiva', 'ganesh', 'hanuman', 'mata', 'devi', 'temple',
    'masjid', 'church', 'prayer', 'worship', 'divine', 'spiritual', 'sacred'
  ];

  // Sufi keywords
  const sufiKeywords = [
    'sufi', 'qawwali', 'nusrat', 'rahat', 'kailash', 'mystical', 'spiritual',
    'allah', 'khuda', 'ishq', 'divine', 'soul', 'rooh', 'junoon', 'wajd'
  ];

  // 90s keywords (artists and typical 90s song patterns)
  const nineties = [
    'kumar sanu', 'alka yagnik', 'udit narayan', 'anuradha paudwal', 'kavita krishnamurthy',
    'abhijeet', 'sadhana sargam', '90s', 'nineties', 'retro', 'classic', 'old'
  ];

  // 2000s keywords
  const twothousands = [
    'sonu nigam', 'shreya ghoshal', 'kk', 'shaan', 'sunidhi chauhan', 'rahat fateh',
    '2000s', 'millennium', 'early 2000', 'mid 2000'
  ];

  // Latest 2024 keywords
  const latest2024 = [
    '2024', '2023', 'latest', 'new', 'recent', 'fresh', 'current', 'trending',
    'viral', 'hit', 'chart', 'top'
  ];

  // Check for mood matches
  if (romanticKeywords.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return 'romantic';
  }

  if (sadKeywords.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return 'sad';
  }

  if (danceKeywords.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return 'dance';
  }

  if (classicalKeywords.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return 'classical';
  }

  if (itemKeywords.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return 'item';
  }

  if (devotionalKeywords.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return 'devotional';
  }

  if (sufiKeywords.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return 'sufi';
  }

  if (nineties.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return '90s';
  }

  if (twothousands.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return '2000s';
  }

  if (latest2024.some(keyword => titleLower.includes(keyword) || artistLower.includes(keyword))) {
    return 'latest2024';
  }

  // Default to general bollywood if no specific mood detected
  return 'bollywood';
}

function processSongData(s) {
  // Use the enhanced image URL extraction
  const imageUrl = getImageUrl(s.image);

  let downloadUrl = '';
  if (s.downloadUrl) {
    downloadUrl = Array.isArray(s.downloadUrl) ? s.downloadUrl[s.downloadUrl.length - 1].link : s.downloadUrl;
  }

  // Add mood classification based on song title and artist
  const mood = classifySongMood(s.name || s.title, s.primaryArtists || s.artists?.primary?.[0]?.name || 'Unknown');

  return {
    id: s.id,
    title: s.name || s.title,
    artist: s.primaryArtists || s.artists?.primary?.[0]?.name || 'Unknown',
    cover: imageUrl,
    url: downloadUrl,
    downloadUrl: s.downloadUrl || [],
    mood: mood // Add mood property
  };
}

function createMediaCard(data, type) {
  const card = document.createElement('div');
  card.className = type === 'artist' ? 'artist-card' : 'card';

  // Use the enhanced image URL extraction
  const imageUrl = getImageUrl(data.image);
  console.log(`Creating ${type} card for "${data.name || data.title}":`, 'Image data:', data.image, 'Extracted URL:', imageUrl);

  card.innerHTML = `
    <img src="${imageUrl}" alt="${data.name || data.title}" class="${type === 'artist' ? 'artist-cover' : 'song-cover'}">
    <div class="card-body">
      <p class="${type === 'artist' ? 'artist-name' : 'song-name'}">${data.name || data.title}</p>
      ${data.subtitle ? `<p class="song-artist">${data.subtitle}</p>` : ''}
    </div>
  `;

  card.addEventListener('click', async () => {
    // Check if it's a song card that has been wrapped as a media card (e.g. from artist page)
    if (data.downloadUrl && data.downloadUrl.length > 0) {
      // Treat this as a direct song playback request
      const song = processSongData(data);
      songs = [song]; // Overwrite playlist with single song
      currentSongIndex = 0;
      await loadSong(0);
      playSong();
    }
    else if (type === 'album') fetchAndPlayAlbum(data.id);
    else if (type === 'playlist') fetchAndPlayPlaylist(data.id);
    else if (type === 'artist') fetchAndPlayArtist(data.id);
  });

  return card;
}

async function fetchAndPlayAlbum(id) {
  try {
    // Albums typically have all songs, but let's implement pagination for consistency
    await loadAlbumSongsPage(id, 0);
  } catch (e) {
    console.error(e);
    showNotification("Error loading album details and songs.", 'error');
  }
}

// Function to load album songs (usually all in one page)
async function loadAlbumSongsPage(albumId, page = 0) {
  try {
    showNotification(`Loading album songs...`, 'info');

    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.albumDetails}${albumId}&page=${page}&limit=10`);
    const data = await response.json();

    if (data.success && data.data) {
      const albumName = data.data.name || 'Album Songs';

      if (data.data.songs && data.data.songs.length > 0) {
        // Take only first 10 songs from the response
        const pageSongs = data.data.songs.slice(0, 10);
        songs = pageSongs.map(s => processSongData(s));

        // Show songs with pagination controls
        showSongGridWithPagination(songs, `${albumName} - Page ${page + 1}`, 'album', {
          currentPage: page,
          hasNextPage: data.data.songs.length >= 10, // If we got 10 or more songs, there might be more
          albumId: albumId,
          albumName: albumName,
          type: 'album'
        });

        // Start playback of the first song if it's the first page
        if (page === 0) {
          currentSongIndex = 0;
          loadSong(0);
          playSong();
        }

        showNotification(`Loaded ${songs.length} songs from ${albumName}`, 'success');
      } else {
        showNotification(`No songs found in this album`, 'warning');
        showSongGridWithPagination([], albumName, 'album', {
          currentPage: 0,
          hasNextPage: false,
          albumId: albumId,
          albumName: albumName,
          type: 'album'
        });
      }
    }
  } catch (error) {
    console.error(`Error loading album songs:`, error);
    showNotification(`Error loading album songs`, 'error');
  }
}

async function fetchAndPlayPlaylist(id) {
  try {
    // Start with page 0 and show pagination
    await loadPlaylistSongsPage(id, 0);
  } catch (e) {
    console.error(e);
    showNotification("Error loading playlist details and songs.", 'error');
  }
}

// Function to load a specific page of playlist songs
async function loadPlaylistSongsPage(playlistId, page = 0) {
  try {
    showNotification(`Loading playlist songs (Page ${page + 1})...`, 'info');

    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.playlistDetails}${playlistId}&page=${page}&limit=10`);
    const data = await response.json();

    if (data.success && data.data) {
      const playlistName = data.data.name || 'Playlist Songs';

      if (data.data.songs && data.data.songs.length > 0) {
        // Take only first 10 songs from the response
        const pageSongs = data.data.songs.slice(0, 10);
        songs = pageSongs.map(s => processSongData(s));

        // Show songs with pagination controls
        showSongGridWithPagination(songs, `${playlistName} - Page ${page + 1}`, 'playlist', {
          currentPage: page,
          hasNextPage: data.data.songs.length >= 10, // If we got 10 or more songs, there might be more
          playlistId: playlistId,
          playlistName: playlistName,
          type: 'playlist'
        });

        // Start playback of the first song if it's the first page
        if (page === 0) {
          currentSongIndex = 0;
          loadSong(0);
          playSong();
        }

        showNotification(`Loaded ${songs.length} songs from ${playlistName}`, 'success');
      } else {
        if (page === 0) {
          showNotification(`No songs found in this playlist`, 'warning');
          showSongGridWithPagination([], playlistName, 'playlist', {
            currentPage: 0,
            hasNextPage: false,
            playlistId: playlistId,
            playlistName: playlistName,
            type: 'playlist'
          });
        } else {
          showNotification(`No more songs available (Page ${page + 1})`, 'warning');
        }
      }
    }
  } catch (error) {
    console.error(`Error loading playlist songs page ${page}:`, error);
    showNotification(`Error loading page ${page + 1}`, 'error');
  }
}

// Helper function to display songs in the search results area (expanding the view)
// Enhanced function to display songs in a grid/matrix layout with pagination
function showSongGridWithPagination(songsData, title, type = 'songs', paginationInfo = {}) {
  const mainArea = document.querySelector('.main-area');
  const searchResults = document.getElementById('search-results');

  // Hide home sections
  if (document.querySelector('.trending')) document.querySelector('.trending').style.display = 'none';
  if (document.querySelector('.nrelease')) document.querySelector('.nrelease').style.display = 'none';
  if (document.querySelector('.artists')) document.querySelector('.artists').style.display = 'none';
  if (document.querySelector('.playlist')) document.querySelector('.playlist').style.display = 'none';
  if (document.querySelector('.mehfil-intro')) document.querySelector('.mehfil-intro').style.display = 'none';
  if (document.querySelector('.featured-playlists')) document.querySelector('.featured-playlists').style.display = 'none';

  // Hide all dedicated pages
  const pages = [
    'favorites-page', 'playlists-page',
    'trending-page', 'latest-page', 'artists-page', 'album-page'
  ];
  pages.forEach(pageId => {
    const page = document.getElementById(pageId);
    if (page) page.style.display = 'none';
  });

  // Clear search results container for grid display
  if (!searchResults) return;

  const { currentPage = 0, hasNextPage = false, artistId, playlistId, artistName, playlistName } = paginationInfo;

  searchResults.innerHTML = `
      <button class="back-to-home" onclick="showHomePage()">
        <i class="bi bi-arrow-left"></i> Back to Home
      </button>
      <h2><i class="bi bi-${type === 'artist' ? 'person-circle' : type === 'playlist' ? 'music-note-list' : 'collection'}"></i> ${title}</h2>
      <div class="song-grid-container"></div>
      <div class="pagination-container">
        <button class="pagination-btn prev-btn" ${currentPage === 0 ? 'disabled' : ''} onclick="navigatePage('prev')">
          <i class="bi bi-chevron-left"></i> Previous
        </button>
        <span class="page-info">Page ${currentPage + 1}</span>
        <button class="pagination-btn next-btn" ${!hasNextPage ? 'disabled' : ''} onclick="navigatePage('next')">
          Next <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    `;
  searchResults.style.display = 'block';

  const songGridContainer = searchResults.querySelector('.song-grid-container');
  if (!songGridContainer) return;

  // Store pagination info globally for navigation
  window.currentPaginationInfo = paginationInfo;
  console.log('💾 Stored pagination info:', paginationInfo);

  songsData.forEach((song, index) => {
    const card = createSongCard(song, index, false, true); // true for grid layout
    songGridContainer.appendChild(card);
  });

  // Scroll to the top of the main content
  mainArea?.scrollTo(0, 0);
}

// Navigation function for pagination
window.navigatePage = function (direction) {
  console.log('🔄 navigatePage called with direction:', direction);

  const paginationInfo = window.currentPaginationInfo;
  console.log('📊 Current pagination info:', paginationInfo);

  if (!paginationInfo) {
    console.error('❌ No pagination info found!');
    return;
  }

  const { currentPage, type, artistId, playlistId, albumId, artistName, playlistName, albumName } = paginationInfo;
  let newPage = currentPage;

  if (direction === 'next') {
    newPage = currentPage + 1;
    console.log(`➡️ Going to next page: ${newPage}`);
  } else if (direction === 'prev' && currentPage > 0) {
    newPage = currentPage - 1;
    console.log(`⬅️ Going to previous page: ${newPage}`);
  }

  // Load the new page based on type
  if (type === 'artist' && artistId) {
    console.log(`🎤 Loading artist songs page: ${artistName}, page ${newPage}`);
    loadArtistSongsPage(artistId, artistName, newPage);
  } else if (type === 'playlist' && playlistId) {
    console.log(`🎵 Loading playlist songs page: ${playlistName}, page ${newPage}`);
    loadPlaylistSongsPage(playlistId, newPage);
  } else if (type === 'album' && albumId) {
    console.log(`💿 Loading album songs page: ${albumName}, page ${newPage}`);
    loadAlbumSongsPage(albumId, newPage);
  } else {
    console.error('❌ Unknown type or missing ID:', { type, artistId, playlistId, albumId });
  }
};

// Keep the original showSongList for backward compatibility (search results)
function showSongList(songsData, title) {
  const mainArea = document.querySelector('.main-area');
  const searchResults = document.getElementById('search-results');

  // Hide home sections
  if (document.querySelector('.trending')) document.querySelector('.trending').style.display = 'none';
  if (document.querySelector('.nrelease')) document.querySelector('.nrelease').style.display = 'none';
  if (document.querySelector('.artists')) document.querySelector('.artists').style.display = 'none';
  if (document.querySelector('.playlist')) document.querySelector('.playlist').style.display = 'none';
  if (document.querySelector('.mehfil-intro')) document.querySelector('.mehfil-intro').style.display = 'none';
  if (document.querySelector('.featured-playlists')) document.querySelector('.featured-playlists').style.display = 'none';

  // Clear search results container for list display
  if (!searchResults) return;
  searchResults.innerHTML = `
      <button class="back-to-home" onclick="showHomePage()">
        <i class="bi bi-arrow-left"></i> Back to Home
      </button>
      <h2>${title}</h2>
      <div class="song-list-container"></div>
    `;
  searchResults.style.display = 'block';

  const songListContainer = searchResults.querySelector('.song-list-container');
  if (!songListContainer) return;

  songsData.forEach((song, index) => {
    // Reusing the createSongCard function but forcing searchResult style for full width display
    const card = createSongCard(song, index, true);
    songListContainer.appendChild(card);
  });

  // Scroll to the top of the main content
  mainArea?.scrollTo(0, 0);
}


// Function to show favorites page
function showFavoritesPage() {
  hideAllPages();

  const favoritesPage = document.getElementById('favorites-page');
  if (favoritesPage) {
    favoritesPage.style.display = 'block';
    displayFavorites();
  }

  updateSidebarActive('nav-favorites');
}

// Function to show playlists page
function showPlaylistsPage() {
  hideAllPages();

  const playlistsPage = document.getElementById('playlists-page');
  if (playlistsPage) {
    playlistsPage.style.display = 'block';
    displaySuggestedSongs();
    displayUserPlaylists();
  }

  updateSidebarActive('nav-playlists');
}

// Function to show settings page
function showSettingsPage() {
  hideAllPages();

  // For now, just show a notification
  showNotification('Settings page coming soon!', 'info');
  showHomePage(); // Go back to home
}

// Helper function to hide all pages
function hideAllPages() {
  // Hide main content
  const content = document.querySelector('.content');
  if (content) content.style.display = 'none';

  // Hide all page content
  const pages = [
    'favorites-page', 'playlists-page',
    'trending-page', 'latest-page', 'artists-page', 'album-page'
  ];
  pages.forEach(pageId => {
    const page = document.getElementById(pageId);
    if (page) page.style.display = 'none';
  });

  // Hide search results
  const searchResults = document.getElementById('search-results');
  if (searchResults) searchResults.style.display = 'none';
}

// Helper function to update sidebar active state
function updateSidebarActive(activeId) {
  document.querySelectorAll('#nav-home, #nav-playlists, #nav-favorites, #nav-settings')
    .forEach(l => l.classList.remove('active'));
  const activeLink = document.getElementById(activeId);
  if (activeLink) activeLink.classList.add('active');
}

// Function to show playlists page
function showPlaylistsPage() {
  hideAllSections();
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;

  searchResults.style.display = 'block';
  searchResults.innerHTML = `
      <button class="back-to-home" onclick="showHomePage()">
        <i class="bi bi-arrow-left"></i> Back to Home
      </button>
      <h2><i class="bi bi-music-note-list"></i> My Playlists</h2>
      <div class="playlists-container">
        <div class="playlist-grid">
          <div class="create-playlist-card" onclick="createNewPlaylist()">
            <div class="create-playlist-icon">
              <i class="bi bi-plus-circle"></i>
            </div>
            <p>Create New Playlist</p>
          </div>
          <div class="playlist-card">
            <img src="/music.png" alt="Liked Songs">
            <div class="card-body">
              <p class="playlist-name">Liked Songs</p>
              <p class="song-artist">Your favorite tracks</p>
            </div>
          </div>
        </div>
      </div>
    `;
}

// Function to show favorites page
function showFavoritesPage() {
  hideAllSections();
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;

  searchResults.style.display = 'block';
  searchResults.innerHTML = `
      <button class="back-to-home" onclick="showHomePage()">
        <i class="bi bi-arrow-left"></i> Back to Home
      </button>
      <h2><i class="bi bi-hearts"></i> Favorite Songs</h2>
      <div class="favorites-container">
        <div class="empty-state">
          <i class="bi bi-heart"></i>
          <h3>No favorites yet</h3>
          <p>Songs you like will appear here. Start exploring and add some favorites!</p>
        </div>
      </div>
    `;
}

// Function to show settings page
function showSettingsPage() {
  hideAllSections();
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;

  searchResults.style.display = 'block';
  searchResults.innerHTML = `
      <button class="back-to-home" onclick="showHomePage()">
        <i class="bi bi-arrow-left"></i> Back to Home
      </button>
      <h2><i class="bi bi-gear"></i> Settings</h2>
      <div class="settings-container">
        <div class="settings-section">
          <h3>Audio Settings</h3>
          <div class="setting-item">
            <label for="volume-setting">Default Volume</label>
            <input type="range" id="volume-setting" min="0" max="100" value="80">
          </div>
          <div class="setting-item">
            <label for="quality-setting">Audio Quality</label>
            <select id="quality-setting">
              <option value="high">High (320kbps)</option>
              <option value="medium" selected>Medium (160kbps)</option>
              <option value="low">Low (96kbps)</option>
            </select>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Playback Settings</h3>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="autoplay-setting" checked>
              Autoplay next song
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="shuffle-setting">
              Shuffle by default
            </label>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>About</h3>
          <div class="about-info">
            <p><strong>Mehfil Music Player</strong></p>
            <p>Version 1.0.0</p>
            <p>दिल से सुनो - Listen from the heart</p>
          </div>
        </div>
      </div>
    `;

  // Add event listeners for settings
  setTimeout(() => {
    const volumeSetting = document.getElementById('volume-setting');
    const qualitySetting = document.getElementById('quality-setting');
    const autoplaySetting = document.getElementById('autoplay-setting');
    const shuffleSetting = document.getElementById('shuffle-setting');

    if (volumeSetting) {
      volumeSetting.addEventListener('input', (e) => {
        if (audio) audio.volume = e.target.value / 100;
        showNotification(`Volume set to ${e.target.value}%`, 'info');
      });
    }

    if (qualitySetting) {
      qualitySetting.addEventListener('change', (e) => {
        showNotification(`Audio quality set to ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
    }

    if (autoplaySetting) {
      autoplaySetting.addEventListener('change', (e) => {
        showNotification(`Autoplay ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
      });
    }

    if (shuffleSetting) {
      shuffleSetting.addEventListener('change', (e) => {
        showNotification(`Shuffle ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
      });
    }
  }, 100);
}

function createSettingsPage() {
  const mainArea = document.querySelector('.main-area');
  if (!mainArea) return;

  const settingsPage = document.createElement('div');
  settingsPage.id = 'settings-page';
  settingsPage.className = 'page-content';
  settingsPage.style.display = 'none';

  settingsPage.innerHTML = `
      <div class="page-header">
        <button class="back-to-home" onclick="showHomePage()">
          <i class="bi bi-arrow-left"></i> Back to Home
        </button>
        <h1><i class="bi bi-gear"></i> Settings</h1>
        <p>Customize your Mehfil experience</p>
      </div>
      
      <div class="settings-container">
        <div class="settings-section">
          <h3>Audio Settings</h3>
          <div class="setting-item">
            <label><i class="bi bi-volume-up"></i> Master Volume</label>
            <input type="range" min="0" max="100" value="80" id="masterVolume">
          </div>
          <div class="setting-item">
            <label><i class="bi bi-music-note"></i> Auto-play next song</label>
            <input type="checkbox" checked id="autoPlay">
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Display Settings</h3>
          <div class="setting-item">
            <label><i class="bi bi-palette"></i> Theme</label>
            <select id="themeSelect">
              <option value="dark">Dark (Default)</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>About</h3>
          <div class="about-info">
            <p><strong>Mehfil</strong> - दिल से सुनो</p>
            <p>Version: 1.0.0</p>
            <p>A beautiful music player for Bollywood enthusiasts</p>
          </div>
        </div>
      </div>
    `;

  mainArea.appendChild(settingsPage);
}

// Function to handle logout
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    // Pause any playing music
    if (audio && !audio.paused) {
      audio.pause();
    }

    // Clear user data
    currentUser = null;
    localStorage.removeItem('mehfilUser');

    // Reset profile display
    const profileName = document.querySelector('.profile-name');
    if (profileName) {
      profileName.textContent = 'Guest User';
    }

    const profileImg = document.querySelector('.profile img');
    if (profileImg) {
      profileImg.src = '/dp.png';
    }

    // Reset welcome message
    const welcomeText = document.querySelector('.mehfil-intro h1');
    if (welcomeText) {
      welcomeText.textContent = 'Welcome to Mehfil';
    }

    // Show logout message
    showNotification('Logged out successfully', 'info');

    // Show login modal
    setTimeout(() => {
      showLoginModal();
    }, 1000);

    // Reset to home page
    showHomePage();
  }
}

// Helper function to hide all main sections
function hideAllSections() {
  const sections = ['.trending', '.nrelease', '.artists', '.playlist', '.mehfil-intro', '.featured-playlists'];
  sections.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) element.style.display = 'none';
  });
}

// Function to create new playlist (placeholder)
function createNewPlaylist() {
  const playlistName = prompt('Enter playlist name:');
  if (playlistName && playlistName.trim()) {
    showNotification(`Playlist "${playlistName}" created!`, 'info');
    // Here you would typically save to localStorage or send to server
  }
}

// Make functions globally accessible
window.showHomePage = showHomePage;
window.showPlaylistsPage = showPlaylistsPage;
window.showFavoritesPage = showFavoritesPage;
window.showSettingsPage = showSettingsPage;
window.handleLogout = handleLogout;
window.createNewPlaylist = createNewPlaylist;
window.showEditProfileModal = showEditProfileModal;
window.showMiniPlayer = showMiniPlayer;
window.hideMiniPlayer = hideMiniPlayer;

async function fetchAndPlayArtist(id) {
  try {
    // First, get artist basic info
    const artistRes = await fetch(`${API_BASE_URL}${ENDPOINTS.artistDetails}${id}`);
    const artistData = await artistRes.json();

    if (artistData.success && artistData.data) {
      const artistName = artistData.data.name || 'Artist Songs';

      // Start with page 0 and show pagination
      await loadArtistSongsPage(id, artistName, 0);
    }
  } catch (e) {
    console.error(e);
    showNotification("Error loading artist details and songs.", 'error');
  }
}

// Function to load a specific page of artist songs
async function loadArtistSongsPage(artistId, artistName, page = 0) {
  try {
    showNotification(`Loading ${artistName} songs (Page ${page + 1})...`, 'info');

    const response = await fetch(`${API_BASE_URL}/api/artists/${artistId}/songs?page=${page}&sortBy=popularity&sortOrder=desc`);
    const data = await response.json();

    if (data.success && data.data && data.data.songs && data.data.songs.length > 0) {
      // Take only first 10 songs from the response
      const pageSongs = data.data.songs.slice(0, 10);
      songs = pageSongs.map(s => processSongData(s));

      // Show songs with pagination controls
      showSongGridWithPagination(songs, `${artistName} - Page ${page + 1}`, 'artist', {
        currentPage: page,
        hasNextPage: data.data.songs.length >= 10, // If we got 10 or more songs, there might be more pages
        artistId: artistId,
        artistName: artistName,
        type: 'artist'
      });

      // Start playback of the first song if it's the first page
      if (page === 0) {
        currentSongIndex = 0;
        loadSong(0);
        playSong();
      }

      showNotification(`Loaded ${songs.length} songs from ${artistName}`, 'success');
    } else {
      if (page === 0) {
        // Fallback to topSongs from artist details for first page
        const artistRes = await fetch(`${API_BASE_URL}${ENDPOINTS.artistDetails}${artistId}`);
        const artistData = await artistRes.json();
        const artistSongs = artistData.data?.topSongs || artistData.data?.songs || [];

        if (artistSongs.length > 0) {
          // Take only first 10 songs from fallback
          const pageSongs = artistSongs.slice(0, 10);
          songs = pageSongs.map(s => processSongData(s));
          showSongGridWithPagination(songs, `${artistName} - Top Songs`, 'artist', {
            currentPage: 0,
            hasNextPage: artistSongs.length > 10, // Check if there are more than 10 songs
            artistId: artistId,
            artistName: artistName,
            type: 'artist'
          });
          currentSongIndex = 0;
          loadSong(0);
          playSong();
        } else {
          showNotification(`No songs found for ${artistName}`, 'warning');
          showSongGridWithPagination([], artistName, 'artist', {
            currentPage: 0,
            hasNextPage: false,
            artistId: artistId,
            artistName: artistName,
            type: 'artist'
          });
        }
      } else {
        showNotification(`No more songs available (Page ${page + 1})`, 'warning');
      }
    }
  } catch (error) {
    console.error(`Error loading artist songs page ${page}:`, error);
    showNotification(`Error loading page ${page + 1}`, 'error');
  }
}

// Fallback function with local trending songs data
function useFallbackTrendingSongs() {
  const fallbackSongs = [
    {
      id: 'fallback1',
      name: 'Tum Hi Ho',
      primaryArtists: 'Arijit Singh',
      image: 'https://c.saavncdn.com/151/Aashiqui-2-Hindi-2013-150x150.jpg',
      downloadUrl: [{ link: 'songs/sahiba.mp3', quality: '320' }]
    },
    {
      id: 'fallback2',
      name: 'Kesariya',
      primaryArtists: 'Arijit Singh',
      image: 'https://c.saavncdn.com/191/Brahmastra-Hindi-2022-150x150.jpg',
      downloadUrl: [{ link: 'songs/ek-villain.mp3', quality: '320' }]
    },
    {
      id: 'fallback3',
      name: 'Raataan Lambiyan',
      primaryArtists: 'Tanishk Bagchi, Jubin Nautiyal',
      image: 'https://c.saavncdn.com/406/Shershaah-Hindi-2021-150x150.jpg',
      downloadUrl: [{ link: 'songs/shershaah.mp3', quality: '320' }]
    },
    {
      id: 'fallback4',
      name: 'Pushpa Pushpa',
      primaryArtists: 'Mika Singh',
      image: 'https://c.saavncdn.com/191/Pushpa-2-The-Rule-Hindi-2024-150x150.jpg',
      downloadUrl: [{ link: 'songs/pushpa2.mp3', quality: '320' }]
    },
    {
      id: 'fallback5',
      name: 'Kabir Singh',
      primaryArtists: 'Arijit Singh, Sachet Tandon',
      image: 'https://c.saavncdn.com/191/Kabir-Singh-Hindi-2019-150x150.jpg',
      downloadUrl: [{ link: 'songs/kabir-singh.mp3', quality: '320' }]
    }
  ];

  // Enrich fallback songs with mood data
  const enrichedFallbackSongs = fallbackSongs.map(enrichSong);

  // Store in global arrays for filtering
  allTrendingSongs = enrichedFallbackSongs;
  filteredTrendingSongs = enrichedFallbackSongs;

  console.log('🎭 Fallback songs enriched with moods:', enrichedFallbackSongs.map(s => `${s.name} (${s.mood})`));

  renderTrendingSongs(enrichedFallbackSongs);

  // Force show mini player with test data for debugging
  setTimeout(() => {
    const miniPlayer = document.getElementById('miniPlayer');
    if (miniPlayer) {
      updateNowPlaying({
        title: 'Test Song',
        artist: 'Test Artist',
        cover: '/music.png'
      });
      showMiniPlayer();
      console.log('Mini player shown with test data');
    }
  }, 2000);
}


// Search functionality
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

// Handle search button click
safeAddListener(searchButton, 'click', () => {
  const query = (searchInput && searchInput.value) ? searchInput.value.trim() : '';
  if (query) {
    fetchSongsBySearch(query);
  } else {
    showNotification('Please enter a search term', 'warning');
  }
});

// Handle Enter key in search input
safeAddListener(searchInput, 'keypress', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      fetchSongsBySearch(query);
    } else {
      showNotification('Please enter a search term', 'warning');
    }
  }
});

async function fetchSongsBySearch(query) {
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;

  try {
    // Hide home sections
    const sections = ['.trending', '.nrelease', '.artists', '.playlist', '.mehfil-intro', '.featured-playlists'];
    sections.forEach(selector => {
      const section = document.querySelector(selector);
      if (section) section.style.display = 'none';
    });

    searchResults.innerHTML = '<div class="loading">Searching...</div>';
    searchResults.style.display = 'block';

    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.searchSongs}?query=${encodeURIComponent(query)}&limit=20`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);

    let songsData = [];

    // Handle the response from /api/search/songs
    if (!data.success) {
      console.error('API Error:', data.error);
      throw new Error(data.error?.message || 'Failed to fetch search results');
    }

    if (data && data.data && data.data.results && Array.isArray(data.data.results)) {
      // Process the results array from the API response
      songsData = data.data.results.map(song => {
        // Get the best quality image using enhanced extraction
        const imageUrl = getImageUrl(song.image);

        // Get the highest quality download URL
        let mediaUrl = null;
        if (song.downloadUrl && Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
          // Sort by quality and get the highest one
          const sortedUrls = [...song.downloadUrl].sort((a, b) => {
            const qualityA = parseInt(a.quality) || 0;
            const qualityB = parseInt(b.quality) || 0;
            return qualityB - qualityA;
          });
          mediaUrl = sortedUrls[0].link || sortedUrls[0].url;
        }

        return {
          id: song.id,
          title: song.name || song.title || 'Unknown Title',
          artist: song.artists?.primary?.[0]?.name || song.primaryArtists || 'Unknown Artist',
          album: song.album?.name || 'Unknown Album',
          cover: imageUrl,
          url: mediaUrl,
          media_url: mediaUrl,
          duration: song.duration ? parseInt(song.duration) : 0,
          type: 'audio/mp4',
          downloadUrl: song.downloadUrl || [],
          explicit: song.explicitContent || false,
          language: song.language || 'hindi'
        };
      });

      console.log(`Found ${songsData.length} songs in response`);

      // Keep all songs to show in the UI, even if not playable
      const validSongs = songsData.filter(Boolean);

      if (validSongs.length === 0) {
        throw new Error('No songs found in the search results');
      }

      // Assign the valid songs to our global variable
      songs = validSongs;

      console.log('Processed songs:', songs);

      // Display search results without auto-playing
      displaySearchResults(songs, query);

    } else {
      throw new Error('Unexpected API response format');
    }

  } catch (error) {
    console.error('Search error:', error);
    const errorMessage = `
        <div class="error">
          <i class="bi bi-exclamation-triangle"></i>
          <h3>Search Error</h3>
          <p>${error.message}</p>
          <button class="retry-button" onclick="fetchSongsBySearch('${query}')">
            <i class="bi bi-arrow-clockwise"></i> Try Again
          </button>
        </div>
      `;
    searchResults.innerHTML = errorMessage;
  }
}

// Display search results on dedicated search page
function displaySearchResults(results, query) {
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;

  searchResults.innerHTML = `
      <div class="search-header">
        <button class="back-to-home" onclick="showHomePage()">
          <i class="bi bi-arrow-left"></i> Back to Home
        </button>
        <h2><i class="bi bi-search"></i> Search Results for "${query}" (${results.length})</h2>
      </div>
      <div class="search-results-grid"></div>
    `;

  searchResults.style.display = 'block';

  const resultsGrid = searchResults.querySelector('.search-results-grid');
  if (!resultsGrid) return;

  if (results.length === 0) {
    resultsGrid.innerHTML = `
        <div class="no-results">
          <i class="bi bi-music-note-beamed"></i>
          <h3>No songs found</h3>
          <p>Try searching with different keywords or check your spelling.</p>
        </div>
      `;
    return;
  }

  // Display results in a grid - user must click to play
  results.forEach((song, index) => {
    const card = createSongCard(song, index, false, true); // Grid layout
    resultsGrid.appendChild(card);
  });

  // Scroll to top
  const mainArea = document.querySelector('.main-area');
  if (mainArea) mainArea.scrollTo(0, 0);

  // Show success notification
  showNotification(`Found ${results.length} songs for "${query}"`, 'success');
}



// Global functions for testing and external access
window.playNextSong = function () {
  if (songs.length > 0) {
    nextSong();
  }
};

window.playPreviousSong = function () {
  if (songs.length > 0) {
    prevSong();
  }
};

window.clearMusicHistory = function () {
  localStorage.removeItem('mehfilMusicHistory');
  musicHistory = {
    lastPlayed: null,
    playHistory: [],
    suggestions: []
  };
  console.log('Music history cleared');
  // Hide sections
  const mostFrequent = document.querySelector('.most-frequent');
  const suggested = document.querySelector('.suggested-songs');
  if (mostFrequent) mostFrequent.style.display = 'none';
  if (suggested) suggested.style.display = 'none';
};

// Add current song to history manually
window.addCurrentSongToHistory = function () {
  if (songs[currentSongIndex]) {
    const currentSong = songs[currentSongIndex];
    trackSongPlay(currentSong, 30); // Add with 30 seconds play time
    console.log('Added current song to history:', currentSong.title);
    // Only update if we're on the relevant pages
    if (document.getElementById('favorites-page').style.display !== 'none') {
      displayFavorites();
    }
    if (document.getElementById('playlists-page').style.display !== 'none') {
      displaySuggestedSongs();
    }
  }
};

// Force populate history with trending songs
window.forcePopulateHistory = function () {
  // Clear existing history first
  musicHistory.playHistory = [];
  populateHistoryWithRealSongs();
  displayFavorites();
  displaySuggestedSongs();
};

// Debug function to check what songs are available
window.debugSongs = function () {
  console.log('=== DEBUGGING SONGS ===');
  console.log('Global songs array:', songs);
  console.log('Trending container:', document.getElementById('trending-songs-container'));
  console.log('Music history:', musicHistory);

  // Check trending songs in DOM
  const trendingContainer = document.getElementById('trending-songs-container');
  if (trendingContainer) {
    console.log('Trending songs in DOM:', trendingContainer.children.length);
    for (let i = 0; i < Math.min(3, trendingContainer.children.length); i++) {
      const card = trendingContainer.children[i];
      console.log(`Trending song ${i}:`, {
        title: card.dataset.title,
        url: card.dataset.url,
        hasValidUrl: card.dataset.url && card.dataset.url !== '#'
      });
    }
  }
};

// ======== ENHANCED PAGE NAVIGATION WITH DUPLICATE PREVENTION ========

// Global variables for tracking loaded content and preventing duplicates
let loadedSongIds = new Set();
let currentPageType = 'home';
let previousPage = 'home';

// Enhanced page navigation functions
function goBackToPreviousPage() {
  switch (previousPage) {
    case 'home':
      showHomePage();
      break;
    case 'trending':
      showTrendingPage();
      break;
    case 'latest':
      showLatestPage();
      break;
    case 'artists':
      showArtistsPage();
      break;
    case 'favorites':
      showFavoritesPage();
      break;
    case 'playlists':
      showPlaylistsPage();
      break;
    default:
      showHomePage();
  }
}

// Load Artists Page with trending Bollywood artists
async function loadArtistsPage() {
  const container = document.getElementById('artists-page-container');
  const loadMoreBtn = document.getElementById('load-more-artists');
  const loading = document.getElementById('artists-loading');

  if (!container) return;

  try {
    loading.style.display = 'block';
    container.innerHTML = '';

    // Clear previous loaded songs for this page
    loadedSongIds.clear();

    // Fetch songs from top Bollywood artists
    const artistQueries = [
      'arijit singh bollywood hits',
      'shreya ghoshal bollywood songs',
      'rahat fateh ali khan bollywood',
      'armaan malik bollywood',
      'neha kakkar bollywood hits',
      'atif aslam bollywood songs',
      'sonu nigam bollywood classics',
      'lata mangeshkar evergreen',
      'kishore kumar hits',
      'mohammed rafi classics',
      'raftaar bollywood rap',
      'badshah bollywood rap',
      'honey singh bollywood',
      'divine bollywood rap'
    ];

    let allSongs = [];

    // Fetch songs from multiple artists
    for (let i = 0; i < Math.min(6, artistQueries.length); i++) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(artistQueries[i])}&language=hindi&limit=8`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.results) {
            allSongs.push(...data.data.results);
          }
        }
      } catch (error) {
        console.error(`Error fetching songs for ${artistQueries[i]}:`, error);
      }
    }

    // Remove duplicates and filter songs
    const uniqueSongs = removeDuplicateSongs(allSongs);
    const filteredSongs = uniqueSongs.slice(0, 30); // Show 30 songs initially

    if (filteredSongs.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="bi bi-music-note"></i><h3>No artist songs found</h3><p>Please try again later.</p></div>';
      return;
    }

    // Display songs
    filteredSongs.forEach((song, index) => {
      const card = createArtistsPageSongCard(song, index);
      container.appendChild(card);
      loadedSongIds.add(song.id);
    });

    // Update global songs array
    songs = filteredSongs;

    loading.style.display = 'none';
    loadMoreBtn.style.display = 'block';

    showNotification(`Loaded ${filteredSongs.length} songs from top Bollywood artists! 🎤`, 'info');

  } catch (error) {
    console.error('Error loading artists page:', error);
    loading.style.display = 'none';
    container.innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><h3>Error loading artists</h3><p>Please try again later.</p></div>';
  }
}

// Show Album Page
function showAlbumPage(albumId, albumData) {
  console.log('Opening album page for:', albumId);
  // Use the paginated approach for consistency
  loadAlbumSongsPage(albumId, 0);
}

// Load Album Page
async function loadAlbumPage(albumId, albumData) {
  const container = document.getElementById('album-songs-container');
  const albumTitle = document.getElementById('album-title');
  const albumArtist = document.getElementById('album-artist');
  const albumCover = document.getElementById('album-cover');
  const albumName = document.getElementById('album-name');
  const albumArtistName = document.getElementById('album-artist-name');
  const albumYear = document.getElementById('album-year');
  const albumSongCount = document.getElementById('album-song-count');

  if (!container) return;

  try {
    // Update album info
    if (albumData) {
      albumTitle.textContent = albumData.title || albumData.name || 'Album';
      albumArtist.textContent = albumData.primaryArtists || albumData.artist || 'Various Artists';
      albumCover.src = getImageUrl(albumData.image);
      albumName.textContent = albumData.title || albumData.name || 'Album';
      albumArtistName.textContent = albumData.primaryArtists || albumData.artist || 'Various Artists';
      albumYear.textContent = albumData.year || 'Unknown Year';
    }

    container.innerHTML = '<div class="loading-spinner"><i class="bi bi-hourglass-split"></i> Loading album songs...</div>';

    // Fetch album details
    const response = await fetch(`${API_BASE_URL}/api/albums?id=${albumId}`);
    if (!response.ok) throw new Error('Failed to fetch album');

    const data = await response.json();
    if (!data.data || !data.data.songs) {
      container.innerHTML = '<div class="empty-state"><i class="bi bi-music-note"></i><h3>No songs found</h3><p>This album has no available songs.</p></div>';
      return;
    }

    const albumSongs = data.data.songs;
    albumSongCount.textContent = `${albumSongs.length} Songs`;

    // Clear container and display songs
    container.innerHTML = '';

    albumSongs.forEach((song, index) => {
      const songItem = document.createElement('div');
      songItem.className = 'album-song-item';
      songItem.innerHTML = `
        <div class="song-number">${index + 1}</div>
        <div class="song-info">
          <div class="song-title">${song.title || song.name}</div>
          <div class="song-artist">${song.primaryArtists || song.artist || 'Unknown Artist'}</div>
        </div>
        <div class="song-duration">${formatDuration(song.duration)}</div>
        <button class="play-song-btn" onclick="playAlbumSong(${index}, '${song.id}')">
          <i class="bi bi-play-fill"></i>
        </button>
      `;
      container.appendChild(songItem);
    });

    // Store album songs globally
    songs = albumSongs;

  } catch (error) {
    console.error('Error loading album:', error);
    container.innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><h3>Error loading album</h3><p>Please try again later.</p></div>';
  }
}

// Play song from album
function playAlbumSong(index, songId) {
  currentSongIndex = index;
  loadSong(index).then(() => {
    playSong();
    showNotification(`Playing: "${songs[index].title}"`, 'info');
  });
}

// Remove duplicate songs based on ID and title
function removeDuplicateSongs(songsArray) {
  const seen = new Set();
  return songsArray.filter(song => {
    const identifier = `${song.id}-${song.title?.toLowerCase()}`;
    if (seen.has(identifier) || loadedSongIds.has(song.id)) {
      return false;
    }
    seen.add(identifier);
    return true;
  });
}

// Enhanced createSongCard function to handle songs vs albums
function createSongCard(item, index, isSearchResult = false, isGridLayout = false) {
  const card = document.createElement('div');
  card.className = isGridLayout ? 'grid-card' : 'card';

  // Determine if this is a song or album
  const isAlbum = item.type === 'album' || (item.songCount && item.songCount > 1) || item.songs;
  const isSong = item.type === 'song' || item.downloadUrl || (!isAlbum && item.title);

  // Set appropriate data attributes
  card.dataset.id = item.id;
  card.dataset.type = isAlbum ? 'album' : 'song';
  card.dataset.title = item.title || item.name || 'Unknown';
  card.dataset.artist = item.primaryArtists || item.artist || 'Unknown Artist';

  // Add mood data attribute for filtering
  if (isSong && item.mood) {
    card.dataset.mood = item.mood;
  } else if (isSong) {
    // Classify mood if not already set
    const mood = classifySongMood(item.title || item.name, item.primaryArtists || item.artist);
    card.dataset.mood = mood;
  }

  if (isSong) {
    card.dataset.url = getAudioUrl(item) || '#';
  }

  // Get image URL - check processed cover first, then extract from raw image data
  const imageUrl = item.cover || getImageUrl(item.image);

  // Debug logging for trending songs
  if (item.title && item.title.includes('Trending')) {
    console.log(`Creating card for trending song: ${item.title}`);
    console.log('  item.cover:', item.cover);
    console.log('  item.image:', item.image);
    console.log('  final imageUrl:', imageUrl);
  }

  card.innerHTML = `
    <img src="${imageUrl}" alt="${item.title || item.name}" class="song-cover" loading="lazy">
    <div class="card-body">
      <h3 class="song-name">${item.title || item.name || 'Unknown Title'}</h3>
      <p class="song-artist">${item.primaryArtists || item.artist || 'Unknown Artist'}</p>
      ${isAlbum ? '<div class="album-indicator"><i class="bi bi-collection"></i> Album</div>' : ''}
    </div>
  `;

  // Add click handler based on type
  card.addEventListener('click', () => {
    if (isAlbum) {
      // Open album page
      showAlbumPage(item.id, item);
    } else {
      // Play song directly
      console.log(`🎵 Song clicked: ${item.title || item.name} (Index: ${index})`);

      if (isSearchResult || isGridLayout) {
        // For search results and grid layouts, add to songs array if not already there
        if (!songs.find(s => s.id === item.id)) {
          songs.push(item);
        }
        const songIndex = songs.findIndex(s => s.id === item.id);

        // Update queue system
        songQueue = [...songs];
        currentQueueIndex = songIndex;

        loadSong(item).then(() => {
          playSong();
          updateQueueDisplay();
        });
      } else {
        // For regular cards (like artist playlists), use queue system
        if (songQueue.length > 0 && songQueue[index]) {
          currentQueueIndex = index;
          loadSong(songQueue[index]).then(() => {
            playSong();
            updateQueueDisplay();
          });
        } else {
          // Fallback to direct song loading
          currentSongIndex = index;
          loadSong(item).then(() => {
            playSong();
          });
        }
      }
    }
  });

  return card;
}

// Format duration helper
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Enhanced load trending page with duplicate prevention
async function loadTrendingPage(page = 0) {
  const container = document.getElementById('trending-page-container');
  const loading = document.getElementById('trending-loading');
  const pagination = document.getElementById('trending-pagination');
  const prevBtn = document.getElementById('trending-prev-btn');
  const nextBtn = document.getElementById('trending-next-btn');
  const pageInfo = document.getElementById('trending-page-info');

  if (!container) return;

  // Prevent multiple simultaneous requests
  if (trendingPageState.isLoading) return;

  try {
    trendingPageState.isLoading = true;
    loading.style.display = 'block';
    container.innerHTML = '';

    // Update page state
    trendingPageState.currentPage = page;

    // Clear previous loaded songs for this page
    loadedSongIds.clear();

    const response = await fetch(`${API_BASE_URL}/api/search/songs?query=bollywood%20trending%202024%20hits&language=hindi&page=${page}&limit=20`);
    if (!response.ok) throw new Error('Failed to fetch trending songs');

    const data = await response.json();
    debugApiResponse(data, 'Trending Songs');

    if (!data.data || !data.data.results) {
      container.innerHTML = '<div class="empty-state"><i class="bi bi-music-note"></i><h3>No trending songs found</h3><p>Please try again later.</p></div>';
      trendingPageState.hasMorePages = false;
      return;
    }

    const trendingSongs = removeDuplicateSongs(data.data.results);

    if (trendingSongs.length === 0) {
      if (page === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-music-note"></i><h3>No trending songs found</h3><p>Please try again later.</p></div>';
      } else {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-music-note"></i><h3>No more songs available</h3><p>You\'ve reached the end of trending songs.</p></div>';
        trendingPageState.hasMorePages = false;
      }
      return;
    }

    // Update global songs array for this page
    songs = trendingSongs;

    // Display songs with proper click handlers
    trendingSongs.forEach((song, index) => {
      const card = createTrendingPageSongCard(song, index);
      container.appendChild(card);
      loadedSongIds.add(song.id);
    });

    // Update pagination controls
    updateTrendingPagination();

    showNotification(`Loaded ${trendingSongs.length} trending songs! 🔥`, 'info');

  } catch (error) {
    console.error('Error loading trending page:', error);
    container.innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><h3>Error loading trending songs</h3><p>Please try again later.</p></div>';
  } finally {
    trendingPageState.isLoading = false;
    loading.style.display = 'none';
  }
}

// Update trending pagination controls
function updateTrendingPagination() {
  const pagination = document.getElementById('trending-pagination');
  const prevBtn = document.getElementById('trending-prev-btn');
  const nextBtn = document.getElementById('trending-next-btn');
  const pageInfo = document.getElementById('trending-page-info');

  if (!pagination) return;

  // Show pagination
  pagination.style.display = 'flex';

  // Update page info
  pageInfo.textContent = `Page ${trendingPageState.currentPage + 1}`;

  // Update previous button
  prevBtn.disabled = trendingPageState.currentPage === 0;

  // Update next button (always enabled for unlimited pages)
  nextBtn.disabled = false;

  // Add event listeners if not already added
  if (!prevBtn.hasAttribute('data-listener-added')) {
    prevBtn.addEventListener('click', () => {
      if (trendingPageState.currentPage > 0) {
        loadTrendingPage(trendingPageState.currentPage - 1);
      }
    });
    prevBtn.setAttribute('data-listener-added', 'true');
  }

  if (!nextBtn.hasAttribute('data-listener-added')) {
    nextBtn.addEventListener('click', () => {
      loadTrendingPage(trendingPageState.currentPage + 1);
    });
    nextBtn.setAttribute('data-listener-added', 'true');
  }
}



// ======== ARTISTS PAGE FUNCTIONS ========

// Load artists page with pagination
async function loadArtistsPage(page = 0, category = 'popular') {
  const container = document.getElementById('artists-page-container');
  const loading = document.getElementById('artists-loading');
  const pagination = document.getElementById('artists-pagination');

  if (!container) return;

  // Prevent multiple simultaneous requests
  if (artistsPageState.isLoading) return;

  try {
    artistsPageState.isLoading = true;
    loading.style.display = 'block';
    container.innerHTML = '';

    // Update page state
    artistsPageState.currentPage = page;
    artistsPageState.currentCategory = category;

    // Clear previous loaded artists for this page
    loadedSongIds.clear();

    let artists = [];

    if (page === 0) {
      // For first page, use the same famous artists as homepage
      console.log(`🎤 Loading famous ${category} for artists page...`);
      const famousArtists = await fetchFamousArtists();

      // Filter by category and remove collaborations
      if (category === 'rappers') {
        artists = famousArtists.filter(artist => {
          const isRapper = artist.category === 'rappers';
          const isNotCollab = !isCollaboration(artist.name);
          return isRapper && isNotCollab;
        });
      } else {
        artists = famousArtists.filter(artist => {
          const isSinger = artist.category !== 'rappers';
          const isNotCollab = !isCollaboration(artist.name);
          return isSinger && isNotCollab;
        });
      }

      console.log(`✅ Filtered ${artists.length} solo ${category} artists`);
    } else {
      // For subsequent pages, search for more artists with collaboration filtering
      let searchQuery;
      if (category === 'rappers') {
        // 🎤 Top Indian Rappers (Hip-Hop / Rap)
        const rapperQueries = [
          'Divine rapper',
          'Raftaar rapper',
          'Badshah rapper',
          'Emiway Bantai',
          'KR$NA rapper',
          'Naezy rapper',
          'MC Stan',
          'Seedhe Maut',
          'Ikka rapper',
          'Prabh Deep'
        ];
        searchQuery = rapperQueries[page % rapperQueries.length];
      } else {
        // 🎶 Famous Indian Singers / Music Artists
        const artistQueries = [
          'Arijit Singh',
          'Shreya Ghoshal',
          'A. R. Rahman',
          'Atif Aslam',
          'Sonu Nigam',
          'Neha Kakkar',
          'Jubin Nautiyal',
          'Honey Singh',
          'King singer',
          'Diljit Dosanjh'
        ];
        searchQuery = artistQueries[page % artistQueries.length];
      }

      // Fetch artists from the API
      const response = await fetch(`${API_BASE_URL}/api/search/artists?query=${searchQuery}&language=hindi&page=${page}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch artists');

      const data = await response.json();
      if (!data.success || !data.data || !data.data.results) {
        throw new Error('Invalid API response format');
      }

      // Filter out collaborations and set category
      artists = data.data.results
        .filter(artist => !isCollaboration(artist.name))
        .map(artist => ({
          ...artist,
          category: category
        }));
    }


    // Display artists with proper click handlers
    artists.forEach((artist, index) => {
      const card = createArtistCard(artist, index, category);
      container.appendChild(card);
      if (artist.id) loadedSongIds.add(artist.id);
    });

    // Update pagination
    updateArtistsPagination(page, artists.length > 0);

    if (artists.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-person-x"></i>
          <h3>No ${category === 'rappers' ? 'Rappers' : 'Artists'} Found</h3>
          <p>Try switching to a different category or check back later.</p>
        </div>
      `;
    }

    showNotification(`Loaded ${artists.length} solo ${category === 'rappers' ? 'rappers' : 'artists'}`, 'success');

  } catch (error) {
    console.error('Error loading artists page:', error);
    container.innerHTML = `
      <div class="error-state">
        <i class="bi bi-exclamation-triangle"></i>
        <h3>Failed to Load Artists</h3>
        <p>Please check your connection and try again.</p>
        <button class="btn-primary" onclick="loadArtistsPage(${page}, '${category}')">
          <i class="bi bi-arrow-clockwise"></i> Retry
        </button>
      </div>
    `;
  } finally {
    artistsPageState.isLoading = false;
    loading.style.display = 'none';
  }
}

// Update artists pagination controls
function updateArtistsPagination() {
  const pagination = document.getElementById('artists-pagination');
  const prevBtn = document.getElementById('artists-prev-btn');
  const nextBtn = document.getElementById('artists-next-btn');
  const pageInfo = document.getElementById('artists-page-info');

  if (!pagination) return;

  // Show pagination
  pagination.style.display = 'flex';

  // Update page info
  pageInfo.textContent = `Page ${artistsPageState.currentPage + 1}`;

  // Update previous button
  prevBtn.disabled = artistsPageState.currentPage === 0;

  // Update next button (always enabled for unlimited pages)
  nextBtn.disabled = false;

  // Add event listeners if not already added
  if (!prevBtn.hasAttribute('data-listener-added')) {
    prevBtn.addEventListener('click', () => {
      if (artistsPageState.currentPage > 0) {
        loadArtistsPage(artistsPageState.currentPage - 1, artistsPageState.currentCategory);
      }
    });
    prevBtn.setAttribute('data-listener-added', 'true');
  }

  if (!nextBtn.hasAttribute('data-listener-added')) {
    nextBtn.addEventListener('click', () => {
      loadArtistsPage(artistsPageState.currentPage + 1, artistsPageState.currentCategory);
    });
    nextBtn.setAttribute('data-listener-added', 'true');
  }
}

// Setup artist category buttons
function setupArtistCategoryButtons() {
  const categoryButtons = document.querySelectorAll('.artist-category-btn');

  categoryButtons.forEach(button => {
    // Remove existing listeners
    button.removeAttribute('data-listener-added');

    button.addEventListener('click', () => {
      const category = button.dataset.category;

      // Update active state
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Reset pagination and load new category
      artistsPageState.currentPage = 0;
      artistsPageState.hasMorePages = true;
      loadArtistsPage(0, category);

      const categoryName = category === 'rappers' ? 'Popular Rappers' : 'Popular Artists';
      showNotification(`Switched to ${categoryName}`, 'info');
    });
  });
}

// Create song card specifically for artists page
function createArtistPageSongCard(song, index) {
  const card = document.createElement('div');
  card.className = 'card grid-card';

  // Extract title and artist using enhanced functions
  const title = extractTitleInfo(song);
  const artist = extractArtistInfo(song);

  // Set data attributes
  card.dataset.index = index;
  card.dataset.id = song.id;
  card.dataset.title = title;
  card.dataset.artist = artist;

  // Get audio URL
  const audioUrl = getAudioUrl(song);
  if (audioUrl) {
    card.dataset.url = audioUrl;
  }

  // Get image using enhanced extraction
  const imageUrl = song.cover || getImageUrl(song.image);

  card.innerHTML = `
    <img src="${imageUrl}" alt="${title}" class="song-cover" loading="lazy">
    <div class="card-body">
      <h3 class="song-name">${title}</h3>
      <p class="song-artist">${artist}</p>
      <div class="artist-badge">
        <i class="bi bi-mic-fill"></i> Artist Song
      </div>
    </div>
  `;

  // Add click handler for direct song playback
  card.addEventListener('click', () => {
    console.log('Artist page song clicked:', title, 'Index:', index);

    // Use safe loading method
    if (window.useSafeLoading) {
      playSafe(index);
    } else if (window.useDirectLoading) {
      playDirect(index);
    } else if (window.useRobustLoading) {
      playRobust(index);
    } else {
      playWithFallback(index);
    }
  });

  return card;
}

// Remove duplicate artists based on ID and name
function removeDuplicateArtists(artistsArray) {
  const seen = new Set();
  return artistsArray.filter(artist => {
    const identifier = artist.id || artist.name || artist.title;
    if (seen.has(identifier)) {
      return false;
    }
    seen.add(identifier);
    return true;
  });
}

// Create circular artist card for artists page and homepage
function createArtistCard(artist, index, category = 'popular') {
  const card = document.createElement('div');
  card.className = 'artist-card-circular';

  // Extract artist information
  const artistName = artist.name || artist.title || 'Unknown Artist';
  const artistImage = getImageUrl(artist.image) || '/music.png';
  const followerCount = artist.followerCount || artist.followers || 0;
  const songCount = artist.songCount || artist.songs?.length || 0;

  // Set data attributes
  card.dataset.index = index;
  card.dataset.id = artist.id;
  card.dataset.name = artistName;
  card.dataset.category = category;

  card.innerHTML = `
    <div class="circular-artist-container">
      <div class="circular-artist-image">
        <img src="${artistImage}" alt="${artistName}" loading="lazy" onerror="this.src='/music.png'">
        <div class="circular-overlay">
          <i class="bi bi-play-circle-fill"></i>
        </div>
      </div>
      <div class="artist-info">
        <h3 class="circular-artist-name">${artistName}</h3>
        <div class="artist-category-badge ${category}">
          <i class="bi bi-${category === 'rappers' ? 'mic' : 'person'}"></i>
          ${category === 'rappers' ? 'Rapper' : 'Artist'}
        </div>
      </div>
    </div>
  `;

  // Add click handler to show artist's songs in separate page
  card.addEventListener('click', () => {
    console.log('Artist clicked:', artistName, 'ID:', artist.id, 'Category:', category);

    // Show loading notification
    showNotification(`Loading ${artistName}'s songs...`, 'info');

    // Show artist songs in separate page like playlists
    showArtistSongsPage(artist.id, artistName, category);
  });

  return card;
}

// Format numbers for display (e.g., 1000 -> 1K)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}







// ======== ENHANCED CARD CREATION WITH SONG/ALBUM DIFFERENTIATION ========

// Wrapper function to handle song vs album differentiation
function createEnhancedSongCard(item, index, isSearchResult = false, isGridLayout = false) {
  // Determine if this is a song or album
  const isAlbum = item.type === 'album' || (item.songCount && item.songCount > 1) || item.songs;
  const isSong = item.type === 'song' || item.downloadUrl || (!isAlbum && item.title);

  // Use the existing createSongCard function but enhance it with click handling
  const card = createSongCard(item, index, isSearchResult, isGridLayout);

  // Add album indicator if it's an album
  if (isAlbum) {
    const albumIndicator = document.createElement('div');
    albumIndicator.className = 'album-indicator';
    albumIndicator.innerHTML = '<i class="bi bi-collection"></i> Album';
    card.querySelector('.card-body').appendChild(albumIndicator);
  }

  // Override the click handler to handle albums differently
  const existingClickHandler = card.onclick;
  card.onclick = null; // Remove existing handler

  card.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAlbum) {
      // Open album page
      showAlbumPage(item.id, item);
      showNotification(`Opening album: "${item.title || item.name}"`, 'info');
    } else {
      // Handle song click - use existing logic
      if (existingClickHandler) {
        existingClickHandler.call(card, e);
      } else {
        // Fallback song handling
        if (isSearchResult || isGridLayout) {
          if (!songs.find(s => s.id === item.id)) {
            songs.push(item);
          }
          const songIndex = songs.findIndex(s => s.id === item.id);
          currentSongIndex = songIndex;
          loadSong(songIndex).then(() => {
            playSong();
          });
        } else {
          currentSongIndex = index;
          loadSong(index).then(() => {
            playSong();
          });
        }
      }
    }
  });

  return card;
}

// Update the home page data fetching to use enhanced cards
function updateHomePageCards() {
  // Update trending songs
  const trendingContainer = document.getElementById('trending-songs-container');
  if (trendingContainer && trendingContainer.children.length > 0) {
    // Already loaded, no need to update
    return;
  }

  // The existing fetchAllHomeData function will handle this
}

// Enhanced search function with song/album differentiation
function performEnhancedSearch(query) {
  if (!query.trim()) return;

  const searchResults = document.getElementById('search-results');
  const resultsGrid = document.getElementById('search-results-grid');

  if (!searchResults || !resultsGrid) return;

  searchResults.innerHTML = `
    <h2><i class="bi bi-search"></i> Search Results for "${query}"</h2>
    <div id="search-results-grid" class="search-results-grid">
      <div class="loading-spinner">
        <i class="bi bi-hourglass-split"></i> Searching...
      </div>
    </div>
  `;

  searchResults.style.display = 'block';

  // Hide other sections
  document.querySelectorAll('.trending, .nrelease, .artists, .playlist').forEach(section => {
    section.style.display = 'none';
  });

  // Search for both songs and albums
  Promise.all([
    fetch(`${API_BASE_URL}/api/search/songs?query=${encodeURIComponent(query)}&language=hindi&limit=15`),
    fetch(`${API_BASE_URL}/api/search/albums?query=${encodeURIComponent(query)}&language=hindi&limit=10`)
  ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([songsData, albumsData]) => {
      const newResultsGrid = document.getElementById('search-results-grid');
      if (!newResultsGrid) return;

      newResultsGrid.innerHTML = '';

      let allResults = [];

      // Add songs
      if (songsData.data && songsData.data.results) {
        allResults.push(...songsData.data.results.map(item => ({ ...item, type: 'song' })));
      }

      // Add albums
      if (albumsData.data && albumsData.data.results) {
        allResults.push(...albumsData.data.results.map(item => ({ ...item, type: 'album' })));
      }

      if (allResults.length === 0) {
        newResultsGrid.innerHTML = '<div class="empty-state"><i class="bi bi-search"></i><h3>No results found</h3><p>Try searching with different keywords.</p></div>';
        return;
      }

      // Display results using enhanced card creation
      allResults.forEach((item, index) => {
        const card = createEnhancedSongCard(item, index, true, true);
        newResultsGrid.appendChild(card);
      });

      showNotification(`Found ${allResults.length} results for "${query}"`, 'info');
    })
    .catch(error => {
      console.error('Search error:', error);
      const newResultsGrid = document.getElementById('search-results-grid');
      if (newResultsGrid) {
        newResultsGrid.innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><h3>Search failed</h3><p>Please try again later.</p></div>';
      }
    });
}

// Override the existing search functionality
document.addEventListener('DOMContentLoaded', () => {
  const searchButton = document.getElementById('searchButton');
  const searchInput = document.getElementById('searchInput');

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        performEnhancedSearch(query);
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          performEnhancedSearch(query);
        }
      }
    });
  }
});
// ======== SPECIALIZED CARD CREATION FOR DEDICATED PAGES ========

// Create song card specifically for trending page
function createTrendingPageSongCard(song, index) {
  const card = document.createElement('div');
  card.className = 'card grid-card';

  // Extract title and artist using enhanced functions
  const title = extractTitleInfo(song);
  const artist = extractArtistInfo(song);

  // Set data attributes
  card.dataset.index = index;
  card.dataset.id = song.id;
  card.dataset.title = title;
  card.dataset.artist = artist;

  // Get audio URL
  const audioUrl = getAudioUrl(song);
  if (audioUrl) {
    card.dataset.url = audioUrl;
  }

  // Get image using enhanced extraction - check processed cover first
  const imageUrl = song.cover || getImageUrl(song.image);

  card.innerHTML = `
    <img src="${imageUrl}" alt="${title}" class="song-cover" loading="lazy">
    <div class="card-body">
      <h3 class="song-name">${title}</h3>
      <p class="song-artist">${artist}</p>
    </div>
  `;

  // Add click handler for direct song playback
  card.addEventListener('click', () => {
    console.log('Trending page song clicked:', title, 'Index:', index);

    // Use safe loading method
    if (window.useSafeLoading) {
      playSafe(index);
    } else if (window.useDirectLoading) {
      playDirect(index);
    } else if (window.useRobustLoading) {
      playRobust(index);
    } else {
      playWithFallback(index);
    }
  });

  return card;
}

// Create item card for latest page (handles both songs and albums)
function createLatestPageItemCard(item, index, songsArray) {
  const card = document.createElement('div');
  card.className = 'card grid-card';

  const isAlbum = item.type === 'album';
  const isSong = item.type === 'song';

  // Extract title and artist using enhanced functions
  const title = extractTitleInfo(item);
  const artist = extractArtistInfo(item);

  // Set data attributes
  card.dataset.index = index;
  card.dataset.id = item.id;
  card.dataset.type = item.type;
  card.dataset.title = title;
  card.dataset.artist = artist;

  if (isSong) {
    const audioUrl = getAudioUrl(item);
    if (audioUrl) {
      card.dataset.url = audioUrl;
    }
  }

  // Get image using enhanced extraction - check processed cover first
  const imageUrl = item.cover || getImageUrl(item.image);

  card.innerHTML = `
    <img src="${imageUrl}" alt="${title}" class="song-cover" loading="lazy">
    <div class="card-body">
      <h3 class="song-name">${title}</h3>
      <p class="song-artist">${artist}</p>
      ${isAlbum ? '<div class="album-indicator"><i class="bi bi-collection"></i> Album</div>' : ''}
    </div>
  `;

  // Add click handler
  card.addEventListener('click', () => {
    if (isAlbum) {
      // Open album page
      console.log('Album clicked:', title);
      showAlbumPage(item.id, item);
      showNotification(`Opening album: "${item.title || item.name}"`, 'info');
    } else {
      // Play song directly
      console.log('Latest page song clicked:', item.title, 'Index:', index);

      // Find the song index in the songs array (not the mixed array)
      const songIndex = songsArray.findIndex(s => s.id === item.id);
      if (songIndex === -1) {
        showNotification('Song not found in playlist', 'error');
        return;
      }

      // Validate song has playable URL
      const audioUrl = getAudioUrl(item);
      if (!audioUrl || audioUrl === '#') {
        showNotification('This song is not available for playback', 'warning');
        return;
      }

      // Set current song index and play
      currentSongIndex = songIndex;

      // Use safe loading method
      if (window.useSafeLoading) {
        playSafe(songIndex);
      } else if (window.useDirectLoading) {
        playDirect(songIndex);
      } else if (window.useRobustLoading) {
        playRobust(songIndex);
      } else {
        playWithFallback(songIndex);
      }
    }
  });

  return card;
}

// Create song card specifically for artists page
function createArtistsPageSongCard(song, index) {
  const card = document.createElement('div');
  card.className = 'card grid-card';

  // Extract title and artist using enhanced functions
  const title = extractTitleInfo(song);
  const artist = extractArtistInfo(song);

  // Set data attributes
  card.dataset.index = index;
  card.dataset.id = song.id;
  card.dataset.title = title;
  card.dataset.artist = artist;

  // Get audio URL
  const audioUrl = getAudioUrl(song);
  if (audioUrl) {
    card.dataset.url = audioUrl;
  }

  // Get image using enhanced extraction - check processed cover first
  const imageUrl = song.cover || getImageUrl(song.image);

  card.innerHTML = `
    <img src="${imageUrl}" alt="${title}" class="song-cover" loading="lazy">
    <div class="card-body">
      <h3 class="song-name">${title}</h3>
      <p class="song-artist">${artist}</p>
    </div>
  `;

  // Add click handler for direct song playback
  card.addEventListener('click', () => {
    console.log('Artists page song clicked:', title, 'Index:', index);

    // Use safe loading method
    if (window.useSafeLoading) {
      playSafe(index);
    } else if (window.useDirectLoading) {
      playDirect(index);
    } else if (window.useRobustLoading) {
      playRobust(index);
    } else {
      playWithFallback(index);
    }
  });

  return card;
}
// ======== ENHANCED SONG LOADING WITH FALLBACK MECHANISMS ========

// Enhanced song loading with better error handling and fallbacks
async function loadSongWithFallback(index) {
  console.log('Loading song with fallback, index:', index, 'Total songs:', songs.length);

  if (!songs || songs.length === 0) {
    console.error('No songs available');
    showNotification('No songs available', 'error');
    return false;
  }

  if (index < 0 || index >= songs.length) {
    console.error('Invalid song index:', index);
    showNotification('Invalid song selection', 'error');
    return false;
  }

  let song = songs[index];
  console.log('Loading song:', song.title, 'Song data:', song);

  if (!song) {
    console.error('Song not found at index:', index);
    showNotification('Song not found', 'error');
    return false;
  }

  // Try to get audio URL with multiple fallbacks
  let audioUrl = getAudioUrl(song);

  // If no URL found, try to fetch song details from API
  if (!audioUrl && song.id) {
    try {
      console.log('Fetching detailed song info for ID:', song.id);
      const response = await fetch(`${API_BASE_URL}/api/songs?id=${song.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0]) {
          const detailedSong = data.data[0];
          console.log('Received detailed song data:', detailedSong);

          // Merge the detailed data with existing song data
          song = {
            ...song,
            ...detailedSong,
            // Preserve original title and artist if they exist
            title: song.title || detailedSong.title || detailedSong.name,
            artist: song.artist || detailedSong.primaryArtists || detailedSong.artist
          };

          // Update the song in the global array
          songs[index] = song;

          // Try to get URL again with detailed data
          audioUrl = getAudioUrl(song);
          console.log('Updated song with detailed info, new URL:', audioUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching song details:', error);
    }
  }

  if (!audioUrl || audioUrl === '#') {
    console.error('No playable URL found for song:', song.title);
    showNotification(`"${song.title}" is not available for playback`, 'warning');
    return false;
  }

  console.log('Final audio URL for loading:', audioUrl);

  // Set current song index
  currentSongIndex = index;

  // Load the song using the original loadSong function with the updated song object
  try {
    const success = await loadSong(song);
    if (success) {
      console.log('Song loaded successfully with fallback');
      return true;
    } else {
      console.error('loadSong returned false');
      return false;
    }
  } catch (error) {
    console.error('Error in loadSong:', error);
    showNotification('Error loading song', 'error');
    return false;
  }
}

// Enhanced play function with better error handling
async function playWithFallback(index) {
  console.log('Playing with fallback, index:', index);

  const success = await loadSongWithFallback(index);
  if (success) {
    try {
      playSong();
      return true;
    } catch (error) {
      console.error('Error in playSong:', error);
      showNotification('Error playing song', 'error');
      return false;
    }
  }
  return false;
}

// ======== ENHANCED ARTIST INFORMATION EXTRACTION ========

// Enhanced function to extract artist information from various API response formats
function extractArtistInfo(item) {
  console.log('Extracting artist info for item:', item.title || item.name, 'Full item:', item);

  // Try different possible artist fields in order of preference
  const possibleArtistFields = [
    'primaryArtists',
    'artist',
    'artists',
    'featuredArtists',
    'singers',
    'more_info.artistMap.primary_artists',
    'more_info.artistMap.artists'
  ];

  for (const field of possibleArtistFields) {
    let artistValue = item;

    // Handle nested fields like 'more_info.artistMap.primary_artists'
    const fieldParts = field.split('.');
    for (const part of fieldParts) {
      if (artistValue && artistValue[part] !== undefined) {
        artistValue = artistValue[part];
      } else {
        artistValue = null;
        break;
      }
    }

    if (artistValue) {
      // Handle different data types
      if (typeof artistValue === 'string') {
        // Clean up the string (remove HTML entities, extra spaces, etc.)
        artistValue = artistValue
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();

        if (artistValue && artistValue !== 'Unknown Artist' && artistValue !== '' && artistValue !== 'null') {
          console.log(`Found artist in ${field}:`, artistValue);
          return artistValue;
        }
      } else if (Array.isArray(artistValue)) {
        // Handle array of artist objects or strings
        if (artistValue.length > 0) {
          const artistNames = artistValue
            .map(artist => {
              if (typeof artist === 'string') return artist;
              if (artist && artist.name) return artist.name;
              if (artist && artist.title) return artist.title;
              if (artist && artist.primary_artists) return artist.primary_artists;
              return null;
            })
            .filter(name => name && name !== 'Unknown Artist' && name !== 'null')
            .slice(0, 3) // Limit to first 3 artists to avoid too long names
            .join(', ');

          if (artistNames) {
            console.log(`Found artists in ${field} array:`, artistNames);
            return artistNames;
          }
        }
      } else if (typeof artistValue === 'object') {
        // Handle nested artist objects
        if (artistValue.primary && Array.isArray(artistValue.primary) && artistValue.primary.length > 0) {
          const artistNames = artistValue.primary
            .map(artist => artist.name || artist.title)
            .filter(name => name && name !== 'Unknown Artist' && name !== 'null')
            .slice(0, 3)
            .join(', ');

          if (artistNames) {
            console.log(`Found artists in ${field}.primary:`, artistNames);
            return artistNames;
          }
        }

        // Try other nested properties
        if (artistValue.name) {
          console.log(`Found artist in ${field}.name:`, artistValue.name);
          return artistValue.name;
        }
      }
    }
  }

  // Last resort: try to extract from URL or ID patterns
  if (item.perma_url || item.url) {
    const url = item.perma_url || item.url;
    const urlParts = url.split('/');
    if (urlParts.length > 2) {
      const potentialArtist = urlParts[urlParts.length - 2];
      if (potentialArtist && potentialArtist !== 'song' && potentialArtist !== 'album') {
        const cleanArtist = potentialArtist.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log('Extracted artist from URL:', cleanArtist);
        return cleanArtist;
      }
    }
  }

  console.log('No artist information found, using fallback');
  return 'Unknown Artist';
}

// Enhanced function to extract title information
function extractTitleInfo(item) {
  const possibleTitleFields = ['title', 'name', 'song', 'track'];

  for (const field of possibleTitleFields) {
    if (item[field] && typeof item[field] === 'string' && item[field].trim()) {
      let title = item[field].trim();

      // Clean up the title
      title = title
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      if (title && title !== 'Unknown Title') {
        return title;
      }
    }
  }

  return 'Unknown Title';
}
// ======== DEBUG FUNCTIONS FOR API RESPONSE ANALYSIS ========

// Debug function to analyze API response structure
function debugApiResponse(data, source = 'Unknown') {
  console.log(`=== DEBUG: ${source} API Response ===`);

  if (data && data.data && data.data.results && data.data.results.length > 0) {
    const firstItem = data.data.results[0];
    console.log('First item structure:', firstItem);
    console.log('Available fields:', Object.keys(firstItem));

    // Check for artist fields specifically
    const artistFields = ['primaryArtists', 'artist', 'artists', 'featuredArtists', 'singers'];
    artistFields.forEach(field => {
      if (firstItem[field]) {
        console.log(`${field}:`, firstItem[field]);
      }
    });

    // Check for title fields
    const titleFields = ['title', 'name', 'song', 'track'];
    titleFields.forEach(field => {
      if (firstItem[field]) {
        console.log(`${field}:`, firstItem[field]);
      }
    });
  } else {
    console.log('No results found in API response');
  }

  console.log('=== END DEBUG ===');
}

// Test function to check current songs array
window.debugCurrentSongs = function () {
  console.log('=== Current Songs Debug ===');
  console.log('Songs array length:', songs.length);

  if (songs.length > 0) {
    console.log('First song:', songs[0]);
    console.log('Extracted title:', extractTitleInfo(songs[0]));
    console.log('Extracted artist:', extractArtistInfo(songs[0]));
  }

  console.log('=== End Songs Debug ===');
};
// ======== DEBUGGING AND TESTING FUNCTIONS ========

// Test function to debug song loading issues
window.debugSongLoading = function (index = 0) {
  console.log('=== DEBUGGING SONG LOADING ===');
  console.log('Current songs array length:', songs.length);
  console.log('Requested index:', index);

  if (songs.length === 0) {
    console.error('No songs in array!');
    return;
  }

  if (index >= songs.length) {
    console.error('Index out of bounds!');
    return;
  }

  const song = songs[index];
  console.log('Song at index', index, ':', song);
  console.log('Song title:', song.title || song.name);
  console.log('Song artist:', extractArtistInfo(song));
  console.log('Song ID:', song.id);

  const audioUrl = getAudioUrl(song);
  console.log('Extracted audio URL:', audioUrl);

  if (!audioUrl) {
    console.error('No audio URL found! Available fields:', Object.keys(song));

    // Try to fetch detailed song info
    if (song.id) {
      console.log('Attempting to fetch detailed song info...');
      fetch(`${API_BASE_URL}/api/songs?id=${song.id}`)
        .then(response => response.json())
        .then(data => {
          console.log('Detailed song API response:', data);
          if (data.data && data.data[0]) {
            const detailedSong = data.data[0];
            console.log('Detailed song data:', detailedSong);
            console.log('Detailed song audio URL:', getAudioUrl(detailedSong));
          }
        })
        .catch(error => console.error('Error fetching detailed song:', error));
    }
  }

  console.log('=== END DEBUGGING ===');
};

// Test function to try playing a song with full debugging
window.testPlaySong = function (index = 0) {
  console.log('=== TESTING SONG PLAYBACK ===');
  debugSongLoading(index);

  setTimeout(() => {
    console.log('Attempting to play song...');
    playWithFallback(index);
  }, 1000);
};




// Enhanced play function using robust loading
async function playRobust(index) {
  console.log('Playing with robust method, index:', index);

  const success = await loadSongRobust(index);
  if (success) {
    try {
      playSong();
      showNotification(`Playing: "${songs[index].title || songs[index].name}"`, 'info');
      return true;
    } catch (error) {
      console.error('Error in playSong:', error);
      showNotification('Error starting playback', 'error');
      return false;
    }
  }
  return false;
}

// Update the card click handlers to use robust loading
window.useRobustLoading = true; // Flag to enable robust loading
// ======== DIRECT SONG LOADING APPROACH ========



// Simple play function
async function playDirect(index) {
  console.log('Playing directly, index:', index);

  try {
    const loaded = await loadSongDirect(index);

    if (loaded) {
      await audio.play();
      isPlaying = true;
      updatePlayButtonStates(true);
      showNotification(`Playing: "${songs[index].title || songs[index].name}"`, 'info');
      return true;
    }
  } catch (error) {
    console.error('Error in direct play:', error);
    showNotification('Error playing song', 'error');
  }

  return false;
}

// Update player UI
function updatePlayerUI(song) {
  const title = song.title || song.name || 'Unknown Title';
  const artist = extractArtistInfo(song);
  const cover = song.cover || getImageUrl(song.image) || '/music.png';

  // Update mini player
  if (miniPlayerImage) miniPlayerImage.src = cover;
  if (miniPlayerTitle) miniPlayerTitle.textContent = title;
  if (miniPlayerArtist) miniPlayerArtist.textContent = artist;

  // Update fullscreen player
  if (fullscreenAlbumArt) fullscreenAlbumArt.src = cover;
  if (fullscreenSongTitle) fullscreenSongTitle.textContent = title;
  if (fullscreenArtist) fullscreenArtist.textContent = artist;

  // Update control bar
  if (nowPlayingArt) nowPlayingArt.src = cover;
  if (trackTitle) trackTitle.textContent = title;
  if (trackArtist) trackArtist.textContent = artist;

  // Show mini player
  showMiniPlayer();
}

// Update play button states
function updatePlayButtonStates(playing) {
  const playIcon = playing ? '<i class="bi bi-pause-fill"></i>' : '<i class="bi bi-play-fill"></i>';

  if (playButton) playButton.innerHTML = playIcon;
  if (miniPlayButton) miniPlayButton.innerHTML = playIcon;
  if (fullscreenPlay) fullscreenPlay.innerHTML = playIcon;
}

// Enable direct loading by default
window.useDirectLoading = true;
// ======== SIMPLE TESTING FUNCTIONS ========

// Test if API is working and returning proper song data
window.testDirectPlay = async function (index = 0) {
  console.log('=== TESTING DIRECT PLAY ===');

  if (!songs || songs.length === 0) {
    console.error('No songs loaded!');
    return;
  }

  if (index >= songs.length) {
    console.error('Index out of bounds!');
    return;
  }

  const song = songs[index];
  console.log('Testing song:', song);

  // Test API call
  if (song.id) {
    try {
      console.log('Testing API call for song ID:', song.id);
      const response = await fetch(`${API_BASE_URL}/api/songs?id=${song.id}`);
      console.log('API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);

        if (data.data && data.data[0]) {
          const detailedSong = data.data[0];
          console.log('Detailed song:', detailedSong);

          const audioUrl = getAudioUrl(detailedSong);
          console.log('Extracted audio URL:', audioUrl);

          if (audioUrl) {
            console.log('✅ Audio URL found! Attempting to play...');
            playDirect(index);
          } else {
            console.error('❌ No audio URL found in detailed song data');
          }
        } else {
          console.error('❌ No song data in API response');
        }
      } else {
        console.error('❌ API request failed with status:', response.status);
      }
    } catch (error) {
      console.error('❌ API request error:', error);
    }
  } else {
    console.error('❌ Song has no ID');
  }
};

// Test basic API connectivity
window.testAPI = async function () {
  console.log('=== TESTING API CONNECTIVITY ===');

  try {
    const response = await fetch(`${API_BASE_URL}/api/search/songs?query=test&limit=1`);
    console.log('API Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API is working!');
      console.log('Sample response:', data);

      if (data.data && data.data.results && data.data.results.length > 0) {
        const sampleSong = data.data.results[0];
        console.log('Sample song:', sampleSong);
        console.log('Sample song audio URL:', getAudioUrl(sampleSong));
      }
    } else {
      console.error('❌ API returned error status:', response.status);
    }
  } catch (error) {
    console.error('❌ API connection failed:', error);
  }
};

// Quick play function for testing
window.quickPlay = function (index = 0) {
  console.log('Quick play test for index:', index);
  playDirect(index);
};
// ======== DEBUGGING AUDIO URL ISSUES ========

// Debug function to inspect downloadUrl structure
window.debugDownloadUrls = function (index = 0) {
  console.log('=== DEBUGGING DOWNLOAD URLS ===');

  if (!songs || songs.length === 0) {
    console.error('No songs loaded');
    return;
  }

  if (index >= songs.length) {
    console.error('Index out of bounds');
    return;
  }

  const song = songs[index];
  console.log('Song:', song.title || song.name);
  console.log('Song object keys:', Object.keys(song));

  if (song.downloadUrl) {
    console.log('downloadUrl exists, type:', typeof song.downloadUrl);
    console.log('downloadUrl is array:', Array.isArray(song.downloadUrl));
    console.log('downloadUrl length:', song.downloadUrl.length);
    console.log('downloadUrl content:', song.downloadUrl);

    if (Array.isArray(song.downloadUrl)) {
      song.downloadUrl.forEach((item, i) => {
        console.log(`downloadUrl[${i}]:`, item);
        console.log(`  - Type:`, typeof item);
        console.log(`  - Keys:`, Object.keys(item || {}));
        if (item) {
          console.log(`  - link:`, item.link, '(type:', typeof item.link, ')');
          console.log(`  - url:`, item.url, '(type:', typeof item.url, ')');
          console.log(`  - quality:`, item.quality);
        }
      });
    }
  } else {
    console.log('No downloadUrl found');
  }

  // Test URL extraction
  const extractedUrl = getAudioUrl(song);
  console.log('Extracted URL:', extractedUrl, '(type:', typeof extractedUrl, ')');

  console.log('=== END DEBUG ===');
};

// Simple function to test URL extraction without playing
window.testUrlExtraction = function (index = 0) {
  console.log('Testing URL extraction for song at index:', index);
  debugDownloadUrls(index);
};
// ======== SAFE AUDIO LOADING ========

// Ultra-safe audio loading function
async function loadAudioSafe(audioUrl, songTitle) {
  console.log('=== SAFE AUDIO LOADING ===');
  console.log('URL to load:', audioUrl);
  console.log('URL type:', typeof audioUrl);
  console.log('Song title:', songTitle);

  // Validate URL
  if (!audioUrl || typeof audioUrl !== 'string') {
    console.error('Invalid URL: not a string. Received:', audioUrl, 'Type:', typeof audioUrl);
    return false;
  }

  if (!audioUrl.startsWith('http')) {
    console.error('Invalid URL: does not start with http. URL:', audioUrl);
    return false;
  }

  if (audioUrl.includes('undefined') || audioUrl.includes('[object Object]') || audioUrl.includes('null')) {
    console.error('Invalid URL: contains invalid content. URL:', audioUrl);
    return false;
  }

  // Additional check for object-like strings
  if (audioUrl.startsWith('[object') || audioUrl.includes('},{')) {
    console.error('Invalid URL: appears to be stringified object. URL:', audioUrl);
    return false;
  }

  try {
    // Stop current playback
    if (!audio.paused) {
      audio.pause();
    }

    // Clear current source
    audio.src = '';
    audio.load();

    console.log('Setting audio source to:', audioUrl);

    // Set new source
    audio.src = audioUrl;

    // Wait for the audio to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('Audio load timeout for URL:', audioUrl);
        reject(new Error('Audio load timeout'));
      }, 10000); // 10 second timeout

      const onCanPlay = () => {
        console.log('Audio can play successfully');
        clearTimeout(timeout);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('loadstart', onLoadStart);
        audio.removeEventListener('loadeddata', onLoadedData);
        resolve(true);
      };

      const onError = (e) => {
        console.error('Audio loading error:', e);
        console.error('Audio error object:', audio.error);
        console.error('Failed URL:', audioUrl);
        clearTimeout(timeout);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('loadstart', onLoadStart);
        audio.removeEventListener('loadeddata', onLoadedData);
        reject(new Error('Audio loading failed'));
      };

      const onLoadStart = () => {
        console.log('Audio load started for:', audioUrl);
      };

      const onLoadedData = () => {
        console.log('Audio data loaded for:', audioUrl);
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.addEventListener('loadstart', onLoadStart, { once: true });
      audio.addEventListener('loadeddata', onLoadedData, { once: true });

      // Start loading
      console.log('Starting audio load...');
      audio.load();
    });

  } catch (error) {
    console.error('Error in safe audio loading:', error);
    return false;
  }
}

// Ultra-safe play function
async function playSafe(index) {
  console.log('=== SAFE PLAY ===');
  console.log('Playing song at index:', index);

  if (!songs || songs.length === 0) {
    showNotification('No songs available', 'error');
    return false;
  }

  if (index < 0 || index >= songs.length) {
    showNotification('Invalid song selection', 'error');
    return false;
  }

  const song = songs[index];
  console.log('Song to play:', song.title || song.name);

  // Get audio URL
  const audioUrl = getAudioUrl(song);
  console.log('Extracted audio URL:', audioUrl);

  if (!audioUrl) {
    showNotification(`No audio URL found for "${song.title || song.name}"`, 'warning');
    return false;
  }

  try {
    // Load audio safely
    const loaded = await loadAudioSafe(audioUrl, song.title || song.name);

    if (loaded) {
      // Update UI
      updatePlayerUI(song);

      // Play audio
      await audio.play();
      isPlaying = true;
      updatePlayButtonStates(true);

      showNotification(`Playing: "${song.title || song.name}"`, 'info');
      return true;
    } else {
      showNotification(`Failed to load "${song.title || song.name}"`, 'error');
      return false;
    }
  } catch (error) {
    console.error('Error in safe play:', error);
    showNotification('Error playing song', 'error');
    return false;
  }
}

// Enable safe loading
window.useSafeLoading = true;

// ======== DEBUGGING FUNCTIONS ========

// Function to test URL extraction on a sample song
function testUrlExtraction(song) {
  console.log('=== URL EXTRACTION TEST ===');
  console.log('Testing song:', song.title || song.name);
  console.log('Song object:', song);

  const url = getAudioUrl(song);
  console.log('Extracted URL:', url);
  console.log('URL type:', typeof url);
  console.log('URL valid:', url && typeof url === 'string' && url.startsWith('http'));

  return url;
}

// Function to validate all songs in the current array
function validateAllSongUrls() {
  console.log('=== VALIDATING ALL SONG URLS ===');
  if (!songs || songs.length === 0) {
    console.log('No songs to validate');
    return;
  }

  songs.forEach((song, index) => {
    console.log(`\n--- Song ${index}: ${song.title || song.name} ---`);
    const url = getAudioUrl(song);
    console.log('URL:', url);
    console.log('Valid:', url && typeof url === 'string' && url.startsWith('http'));

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      console.warn('⚠️ Invalid URL for song:', song.title || song.name);
      console.log('Song data:', song);
    }
  });
}

// Function to test safe loading with a specific song
function testSafeLoading(index) {
  console.log('=== TESTING SAFE LOADING ===');
  if (!songs || index >= songs.length) {
    console.error('Invalid song index');
    return;
  }

  const song = songs[index];
  console.log('Testing song:', song.title || song.name);

  const url = getAudioUrl(song);
  console.log('Extracted URL:', url);

  if (url) {
    loadAudioSafe(url, song.title || song.name)
      .then(success => {
        console.log('Safe loading result:', success);
      })
      .catch(error => {
        console.error('Safe loading error:', error);
      });
  }
}

// Make debugging functions available globally
window.testUrlExtraction = testUrlExtraction;
window.validateAllSongUrls = validateAllSongUrls;
window.testSafeLoading = testSafeLoading;

// ======== IMAGE DEBUGGING FUNCTIONS ========

// Function to test image extraction on a sample song
function testImageExtraction(song) {
  console.log('=== IMAGE EXTRACTION TEST ===');
  console.log('Testing song:', song.title || song.name);
  console.log('Song image data:', song.image);
  console.log('Song image type:', typeof song.image);

  if (Array.isArray(song.image)) {
    console.log('Image array contents:');
    song.image.forEach((img, index) => {
      console.log(`  [${index}]:`, img);
      console.log(`    - url:`, img.url);
      console.log(`    - link:`, img.link);
      console.log(`    - quality:`, img.quality);
    });
  }

  const imageUrl = getImageUrl(song.image);
  console.log('Extracted image URL:', imageUrl);
  console.log('Image URL valid:', imageUrl && typeof imageUrl === 'string' && (imageUrl.startsWith('http') || imageUrl.startsWith('/')));

  return imageUrl;
}

// Function to validate all song images in the current array
function validateAllSongImages() {
  console.log('=== VALIDATING ALL SONG IMAGES ===');
  if (!songs || songs.length === 0) {
    console.log('No songs to validate');
    return;
  }

  songs.forEach((song, index) => {
    console.log(`\n--- Song ${index}: ${song.title || song.name} ---`);
    console.log('Raw image data:', song.image);
    const imageUrl = getImageUrl(song.image);
    console.log('Extracted image URL:', imageUrl);
    console.log('Valid:', imageUrl && typeof imageUrl === 'string');

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.warn('⚠️ Invalid image URL for song:', song.title || song.name);
      console.log('Song data:', song);
    }
  });
}

// Function to test image loading
function testImageLoading(imageUrl) {
  console.log('=== TESTING IMAGE LOADING ===');
  console.log('Testing image URL:', imageUrl);

  const img = new Image();
  img.onload = () => {
    console.log('✅ Image loaded successfully:', imageUrl);
    console.log('Image dimensions:', img.width, 'x', img.height);
  };
  img.onerror = (e) => {
    console.error('❌ Image failed to load:', imageUrl);
    console.error('Error:', e);
  };
  img.src = imageUrl;
}

// Make image debugging functions available globally
window.testImageExtraction = testImageExtraction;
window.validateAllSongImages = validateAllSongImages;
window.testImageLoading = testImageLoading;

// Function to test API response format
async function testApiImageFormat() {
  console.log('=== TESTING API IMAGE FORMAT ===');
  try {
    const response = await fetch(`${API_BASE_URL}/api/search/songs?query=arijit%20singh&limit=1`);
    const data = await response.json();

    if (data.success && data.data && data.data.results && data.data.results.length > 0) {
      const sampleSong = data.data.results[0];
      console.log('Sample API response song:', sampleSong);
      console.log('Sample song image data:', sampleSong.image);
      console.log('Sample song image type:', typeof sampleSong.image);

      if (Array.isArray(sampleSong.image)) {
        console.log('Image array structure:');
        sampleSong.image.forEach((img, index) => {
          console.log(`  Image ${index}:`, img);
        });
      }

      const extractedUrl = getImageUrl(sampleSong.image);
      console.log('Extracted URL:', extractedUrl);

      // Test if the URL loads
      if (extractedUrl && extractedUrl.startsWith('http')) {
        testImageLoading(extractedUrl);
      }
    } else {
      console.error('No songs found in API response');
    }
  } catch (error) {
    console.error('Error testing API format:', error);
  }
}

window.testApiImageFormat = testApiImageFormat;

// Function to test latest page image extraction
async function testLatestPageImages() {
  console.log('=== TESTING LATEST PAGE IMAGES ===');
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.newReleasesAlbums}&page=0&limit=3`);
    const data = await response.json();

    if (data.success && data.data && data.data.results && data.data.results.length > 0) {
      console.log('Latest page API response:', data.data.results);

      data.data.results.forEach((item, index) => {
        console.log(`\n--- Latest Item ${index}: ${item.title || item.name} ---`);
        console.log('Type:', item.type);
        console.log('Raw image data:', item.image);
        console.log('Image type:', typeof item.image);

        if (Array.isArray(item.image)) {
          console.log('Image array contents:');
          item.image.forEach((img, imgIndex) => {
            console.log(`  [${imgIndex}]:`, img);
          });
        }

        const extractedUrl = getImageUrl(item.image);
        console.log('Extracted URL:', extractedUrl);

        // Test if the URL loads
        if (extractedUrl && extractedUrl.startsWith('http')) {
          testImageLoading(extractedUrl);
        }
      });
    } else {
      console.error('No items found in latest page API response');
    }
  } catch (error) {
    console.error('Error testing latest page images:', error);
  }
}

window.testLatestPageImages = testLatestPageImages;

// Function to test home page image extraction
async function testHomePageImages() {
  console.log('=== TESTING HOME PAGE IMAGES ===');
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.newReleasesAlbums}&page=0&limit=5`);
    const data = await response.json();

    if (data.success && data.data && data.data.results && data.data.results.length > 0) {
      console.log('Home page API response:', data.data.results);

      data.data.results.forEach((item, index) => {
        console.log(`\n--- Home Page Item ${index}: ${item.title || item.name} ---`);
        console.log('Type:', item.type);
        console.log('Raw image data:', item.image);
        console.log('Image type:', typeof item.image);

        if (Array.isArray(item.image)) {
          console.log('Image array contents:');
          item.image.forEach((img, imgIndex) => {
            console.log(`  [${imgIndex}]:`, img);
          });
        }

        const extractedUrl = getImageUrl(item.image);
        console.log('Extracted URL:', extractedUrl);

        // Test if the URL loads
        if (extractedUrl && extractedUrl.startsWith('http')) {
          testImageLoading(extractedUrl);
        }
      });
    } else {
      console.error('No items found in home page API response');
    }
  } catch (error) {
    console.error('Error testing home page images:', error);
  }
}

window.testHomePageImages = testHomePageImages;

// Function to test current home page data
function debugCurrentHomePageData() {
  console.log('=== DEBUGGING CURRENT HOME PAGE DATA ===');

  // Check if the home page containers have data
  const trendingContainer = document.getElementById('trending-songs-container');
  const newReleasesContainer = document.getElementById('new-releases-container');

  console.log('Trending container children:', trendingContainer?.children.length || 0);
  console.log('New releases container children:', newReleasesContainer?.children.length || 0);

  // Check the first few cards in new releases
  if (newReleasesContainer && newReleasesContainer.children.length > 0) {
    console.log('\n--- New Releases Cards ---');
    for (let i = 0; i < Math.min(3, newReleasesContainer.children.length); i++) {
      const card = newReleasesContainer.children[i];
      const img = card.querySelector('img');
      const title = card.querySelector('.song-name')?.textContent;

      console.log(`Card ${i}:`, title);
      console.log('  Image src:', img?.src);
      console.log('  Image alt:', img?.alt);
      console.log('  Image loaded:', img?.complete && img?.naturalWidth > 0);
    }
  }

  // Test the API endpoint directly
  console.log('\n--- Testing API Endpoint ---');
  fetch(`${API_BASE_URL}${ENDPOINTS.newReleasesAlbums}&page=0&limit=3`)
    .then(response => response.json())
    .then(data => {
      console.log('API Response:', data);
      if (data.success && data.data && data.data.results) {
        data.data.results.forEach((item, index) => {
          console.log(`\nAPI Item ${index}:`, item.title || item.name);
          console.log('  Raw image data:', item.image);
          console.log('  Processed image URL:', getImageUrl(item.image));
        });
      }
    })
    .catch(error => console.error('API Error:', error));
}

window.debugCurrentHomePageData = debugCurrentHomePageData;

// Function to debug song card images specifically
function debugSongCardImages() {
  console.log('=== DEBUGGING SONG CARD IMAGES ===');

  // Check all containers
  const containers = [
    { name: 'Trending', id: 'trending-songs-container' },
    { name: 'New Releases', id: 'new-releases-container' },
    { name: 'Artists', id: 'popular-artists-container' },
    { name: 'Playlists', id: 'featured-playlists-container' }
  ];

  containers.forEach(container => {
    const element = document.getElementById(container.id);
    if (element && element.children.length > 0) {
      console.log(`\n--- ${container.name} Container ---`);
      console.log(`Cards found: ${element.children.length}`);

      // Check first 2 cards
      for (let i = 0; i < Math.min(2, element.children.length); i++) {
        const card = element.children[i];
        const img = card.querySelector('img');
        const title = card.querySelector('.song-name, .artist-name')?.textContent;

        if (img) {
          console.log(`\nCard ${i}: ${title}`);
          console.log('  Image src:', img.src);
          console.log('  Image complete:', img.complete);
          console.log('  Image naturalWidth:', img.naturalWidth);
          console.log('  Image naturalHeight:', img.naturalHeight);
          console.log('  Image computed style:');

          const computedStyle = window.getComputedStyle(img);
          console.log('    background-image:', computedStyle.backgroundImage);
          console.log('    background-color:', computedStyle.backgroundColor);
          console.log('    opacity:', computedStyle.opacity);
          console.log('    display:', computedStyle.display);
          console.log('    visibility:', computedStyle.visibility);
        }
      }
    }
  });
}

window.debugSongCardImages = debugSongCardImages;

// Function to force refresh all images on the page
function forceRefreshImages() {
  console.log('=== FORCE REFRESHING ALL IMAGES ===');

  const allImages = document.querySelectorAll('img');
  console.log(`Found ${allImages.length} images on page`);

  allImages.forEach((img, index) => {
    if (img.src && img.src.includes('c.saavncdn.com')) {
      console.log(`Refreshing image ${index}:`, img.src);
      const originalSrc = img.src;
      img.src = '';
      setTimeout(() => {
        img.src = originalSrc;
      }, 100);
    }
  });
}

window.forceRefreshImages = forceRefreshImages;

// Function to test trending songs API
async function testTrendingSongsAPI() {
  console.log('=== TESTING TRENDING SONGS API ===');
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.trendingSongs}&page=0&limit=3`);
    const data = await response.json();

    console.log('Trending API Response:', data);

    if (data.success && data.data && data.data.results && data.data.results.length > 0) {
      data.data.results.forEach((song, index) => {
        console.log(`\n--- Trending Song ${index}: ${song.title || song.name} ---`);
        console.log('Raw song data:', song);
        console.log('Image data:', song.image);
        console.log('Image type:', typeof song.image);

        if (Array.isArray(song.image)) {
          console.log('Image array contents:');
          song.image.forEach((img, imgIndex) => {
            console.log(`  [${imgIndex}]:`, img);
          });
        }

        const extractedUrl = getImageUrl(song.image);
        console.log('Extracted image URL:', extractedUrl);

        const processedSong = processSongData(song);
        console.log('Processed song cover:', processedSong.cover);
      });
    } else {
      console.error('No trending songs found in API response');
    }
  } catch (error) {
    console.error('Error testing trending songs API:', error);
  }
}

window.testTrendingSongsAPI = testTrendingSongsAPI;
// ========== MOOD-BASED FILTERING SYSTEM ==========

// Define mood categories with their associated keywords
const moodCategories = {
  'All Music': [],
  'Romantic': ['love', 'romantic', 'heart', 'pyaar', 'ishq', 'mohabbat'],
  'Dance': ['dance', 'party', 'beat', 'remix', 'club', 'dj'],
  'Sad': ['sad', 'dukh', 'gam', 'tears', 'cry', 'broken'],
  'Party': ['party', 'celebration', 'festival', 'dance', 'beat', 'energy'],
  'Classical': ['classical', 'traditional', 'raag', 'instrumental'],
  'Rock': ['rock', 'metal', 'guitar', 'band'],
  'Pop': ['pop', 'popular', 'hit', 'chart'],
  'Hip Hop': ['hip hop', 'rap', 'urban'],
  'Electronic': ['electronic', 'edm', 'techno', 'house'],
  'Jazz': ['jazz', 'blues', 'smooth'],
  'Latest 2024': ['2024', '2023', 'latest', 'new']
};

// Use existing currentMoodFilter variable instead of redeclaring
// let currentMoodFilter = 'All Music'; // REMOVED - already declared above
// let allSongs = []; // REMOVED - already declared above

// Initialize mood filtering
function initializeMoodFiltering() {
  const categoryButtons = document.querySelectorAll('.category-scroll .btn');

  categoryButtons.forEach(button => {
    button.addEventListener('click', function () {
      const mood = this.textContent.trim();
      setActiveMoodFilter(mood);
      filterSongsByMood(mood);
    });
  });
}

// Set active mood filter
function setActiveMoodFilter(mood) {
  currentMoodFilter = mood;

  // Update button states
  const categoryButtons = document.querySelectorAll('.category-scroll .btn');
  categoryButtons.forEach(button => {
    button.classList.remove('active');
    if (button.textContent.trim() === mood) {
      button.classList.add('active');
    }
  });

  // Update filter info
  updateFilterInfo(mood);
}

// Filter songs by mood
function filterSongsByMood(mood) {
  const songContainers = [
    document.getElementById('trending-songs-container'),
    document.getElementById('new-releases-container'),
    document.getElementById('popular-artists-container'),
    document.getElementById('featured-playlists-container')
  ];

  songContainers.forEach(container => {
    if (container) {
      const cards = container.querySelectorAll('.card, .grid-card');
      let visibleCount = 0;

      cards.forEach(card => {
        const shouldShow = shouldShowCard(card, mood);

        if (shouldShow) {
          card.style.display = 'block';
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.8)';
        }
      });

      // Show/hide empty state
      showEmptyStateIfNeeded(container, visibleCount, mood);
    }
  });
}

// Check if card should be shown based on mood
function shouldShowCard(card, mood) {
  if (mood === 'All Music') return true;

  const songName = card.querySelector('.song-name, .artist-name, .playlist-name')?.textContent?.toLowerCase() || '';
  const artistName = card.querySelector('.song-artist')?.textContent?.toLowerCase() || '';
  const searchText = (songName + ' ' + artistName).toLowerCase();

  const keywords = moodCategories[mood] || [];
  return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
}

// Show empty state if no songs match filter
function showEmptyStateIfNeeded(container, visibleCount, mood) {
  let emptyState = container.querySelector('.filter-empty-state');

  if (visibleCount === 0 && mood !== 'All Music') {
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'filter-empty-state';
      emptyState.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-music-note-beamed"></i>
          <h3>No ${mood} songs found</h3>
          <p>Try a different mood or check back later for more songs in this category.</p>
          <button class="btn-secondary" onclick="setActiveMoodFilter('All Music'); filterSongsByMood('All Music');">
            <i class="bi bi-arrow-left"></i> Show All Music
          </button>
        </div>
      `;
      container.appendChild(emptyState);
    }
    emptyState.style.display = 'flex';
  } else if (emptyState) {
    emptyState.style.display = 'none';
  }
}

// Update filter info
function updateFilterInfo(mood) {
  // Add filter results counter if it doesn't exist
  let filterInfo = document.querySelector('.filter-results-info');
  if (!filterInfo && mood !== 'All Music') {
    filterInfo = document.createElement('div');
    filterInfo.className = 'filter-results-info';

    const categorySection = document.querySelector('.featured-playlists');
    if (categorySection) {
      categorySection.appendChild(filterInfo);
    }
  }

  if (filterInfo) {
    if (mood === 'All Music') {
      filterInfo.style.display = 'none';
    } else {
      const visibleCards = document.querySelectorAll('.card:not([style*="display: none"]), .grid-card:not([style*="display: none"])').length;
      filterInfo.innerHTML = `
        <span>Showing <span class="filter-results-count">${visibleCards}</span> ${mood.toLowerCase()} songs</span>
        <button class="clear-filter-btn" onclick="setActiveMoodFilter('All Music'); filterSongsByMood('All Music');">
          <i class="bi bi-x"></i> Clear Filter
        </button>
      `;
      filterInfo.style.display = 'flex';
    }
  }
}

// Hero CTA functionality
function initializeHeroCTA() {
  const startListeningBtn = document.getElementById('startListeningBtn');
  const playTrendingBtn = document.getElementById('playTrendingBtn');

  console.log('🎵 Initializing Hero CTA buttons...');
  console.log('Start Listening button found:', !!startListeningBtn);
  console.log('Play Trending button found:', !!playTrendingBtn);

  if (startListeningBtn) {
    startListeningBtn.addEventListener('click', function () {
      console.log('🎵 Start Listening button clicked');

      // Show home page first if not already visible
      showHomePage();

      // Wait for home page to load, then scroll to trending section
      setTimeout(() => {
        const trendingSection = document.querySelector('.trending');
        if (trendingSection) {
          trendingSection.scrollIntoView({ behavior: 'smooth' });

          // Try to play first trending song after scroll
          setTimeout(() => {
            const firstSong = document.querySelector('#trending-songs-container .card');
            if (firstSong) {
              console.log('🎵 Playing first trending song');
              firstSong.click();
            } else {
              console.log('⚠️ No trending songs found, fetching data...');
              // If no songs are loaded, fetch them first
              fetchAllHomeData().then(() => {
                setTimeout(() => {
                  const firstSong = document.querySelector('#trending-songs-container .card');
                  if (firstSong) {
                    firstSong.click();
                  }
                }, 500);
              });
            }
          }, 1000);
        }
      }, 300);
    });
  }

  if (playTrendingBtn) {
    playTrendingBtn.addEventListener('click', function () {
      console.log('🎵 Play Trending button clicked');

      // Show home page first if not already visible
      showHomePage();

      // Wait for home page to load, then play random trending song
      setTimeout(() => {
        const trendingSongs = document.querySelectorAll('#trending-songs-container .card');
        if (trendingSongs.length > 0) {
          const randomIndex = Math.floor(Math.random() * trendingSongs.length);
          console.log('🎵 Playing random trending song:', randomIndex);
          trendingSongs[randomIndex].click();
        } else {
          console.log('⚠️ No trending songs found, fetching data...');
          // If no songs are loaded, fetch them first
          fetchAllHomeData().then(() => {
            setTimeout(() => {
              const trendingSongs = document.querySelectorAll('#trending-songs-container .card');
              if (trendingSongs.length > 0) {
                const randomIndex = Math.floor(Math.random() * trendingSongs.length);
                trendingSongs[randomIndex].click();
              }
            }, 500);
          });
        }
      }, 300);
    });
  }
}

// Export functions for global access
window.setActiveMoodFilter = setActiveMoodFilter;
window.filterSongsByMood = filterSongsByMood;
// ========== KEYBOARD SHORTCUTS ==========

// Initialize keyboard shortcuts
function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    // Ctrl + K for search focus
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }

    // Space for play/pause (when not typing)
    if (e.code === 'Space' && !isTyping()) {
      e.preventDefault();
      const playButton = document.getElementById('miniPlayButton');
      if (playButton) {
        playButton.click();
      }
    }

    // Arrow keys for previous/next
    if (e.key === 'ArrowLeft' && !isTyping()) {
      e.preventDefault();
      const prevButton = document.getElementById('miniPrevButton');
      if (prevButton) {
        prevButton.click();
      }
    }

    if (e.key === 'ArrowRight' && !isTyping()) {
      e.preventDefault();
      const nextButton = document.getElementById('miniNextButton');
      if (nextButton) {
        nextButton.click();
      }
    }
  });
}

// Check if user is currently typing in an input field
function isTyping() {
  const activeElement = document.activeElement;
  return activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.contentEditable === 'true'
  );
}

// Add song count to category buttons
function updateCategoryButtonCounts() {
  const categoryButtons = document.querySelectorAll('.category-scroll .btn');

  categoryButtons.forEach(button => {
    const mood = button.textContent.trim();
    const count = countSongsForMood(mood);
    button.setAttribute('data-count', `${count} songs`);
  });
}

// Count songs for a specific mood
function countSongsForMood(mood) {
  if (mood === 'All Music') {
    return document.querySelectorAll('.card, .grid-card').length;
  }

  const allCards = document.querySelectorAll('.card, .grid-card');
  let count = 0;

  allCards.forEach(card => {
    if (shouldShowCard(card, mood)) {
      count++;
    }
  });

  return count;
}

// Enhanced initialization
document.addEventListener('DOMContentLoaded', function () {
  console.log('🎵 DOM Content Loaded - Initializing enhanced features...');

  // Debug: Check if button exists
  const startBtn = document.getElementById('startListeningBtn');
  console.log('🔍 Start Listening button found:', !!startBtn);
  if (startBtn) {
    console.log('🔍 Button element:', startBtn);
    console.log('🔍 Button classes:', startBtn.className);
    console.log('🔍 Button parent:', startBtn.parentElement);
  }

  try {
    initializeMoodFiltering();
    console.log('✅ Mood filtering initialized');
  } catch (e) {
    console.error('❌ Error initializing mood filtering:', e);
  }

  try {
    initializeHeroCTA();
    console.log('✅ Hero CTA initialized');
  } catch (e) {
    console.error('❌ Error initializing Hero CTA:', e);
  }

  try {
    initializeKeyboardShortcuts();
    console.log('✅ Keyboard shortcuts initialized');
  } catch (e) {
    console.error('❌ Error initializing keyboard shortcuts:', e);
  }

  try {
    initializeEnhancedFullscreenPlayer();
    console.log('✅ Enhanced fullscreen player initialized');
  } catch (e) {
    console.error('❌ Error initializing enhanced fullscreen player:', e);
  }

  // Update category counts after content loads
  setTimeout(() => {
    try {
      updateCategoryButtonCounts();
      console.log('✅ Category button counts updated');
    } catch (e) {
      console.error('❌ Error updating category counts:', e);
    }
  }, 2000);
});
// ======== ADDITIONAL FULLSCREEN PLAYER ENHANCEMENTS ========

// Enhanced waveform generation with more bars for better visual effect
function generateEnhancedWaveform() {
  const waveformContainer = document.getElementById('waveformContainer');
  if (!waveformContainer) return;

  waveformContainer.innerHTML = '';

  // Generate 20 bars for mobile, 10 for desktop
  const isMobile = window.innerWidth <= 768;
  const barCount = isMobile ? 20 : 10;

  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar';
    bar.style.animationDelay = `${i * 0.1}s`;
    waveformContainer.appendChild(bar);
  }

  console.log(`🎵 Enhanced waveform generated with ${barCount} bars`);
}

// Enhanced album art rotation with smooth transitions
function updateAlbumArtRotation(isPlaying) {
  const circularArtwork = document.querySelector('.circular-artwork img');
  const desktopArtwork = document.getElementById('fullscreenAlbumArtDesktop');

  [circularArtwork, desktopArtwork].forEach(artwork => {
    if (artwork) {
      if (isPlaying) {
        artwork.style.animationPlayState = 'running';
      } else {
        artwork.style.animationPlayState = 'paused';
      }
    }
  });
}

// Enhanced circular progress update with smooth animation
function updateCircularProgressSmooth(currentTime, duration) {
  if (duration > 0) {
    const progressAngle = (currentTime / duration) * 360;
    const circularProgress = document.querySelector('.circular-progress');
    const progressDot = document.querySelector('.progress-dot');

    if (circularProgress) {
      circularProgress.style.setProperty('--progress-angle', `${progressAngle}deg`);
    }
    if (progressDot) {
      progressDot.style.transform = `translate(-50%, -50%) rotate(${progressAngle}deg) translateY(-50px)`;
    }
  }
}

// Enhanced playlist context with dynamic updates
function updatePlaylistContextDynamic(currentSong) {
  const playlistInfo = document.querySelector('.mobile-playlist-info');
  if (playlistInfo && currentSong) {
    let playlistName = 'Trending Hits';

    // Determine playlist based on song mood or source
    if (currentSong.mood) {
      switch (currentSong.mood) {
        case 'romantic': playlistName = 'Romantic Collection'; break;
        case 'dance': playlistName = 'Dance Party'; break;
        case 'sad': playlistName = 'Melancholy Moods'; break;
        case 'rock': playlistName = 'Rock Anthems'; break;
        case 'pop': playlistName = 'Pop Hits'; break;
        default: playlistName = 'Trending Hits';
      }
    }

    playlistInfo.innerHTML = `
      <div class="mobile-playlist-text">PLAYING FROM PLAYLIST</div>
      <div class="playlist-name">${playlistName}</div>
    `;

    // Add click handler for playlist navigation
    playlistInfo.onclick = () => {
      showNotification(`Viewing ${playlistName} playlist`, 'info', 2000);
      // Could implement playlist page navigation here
    };
  }
}

// Enhanced error handling for fullscreen player
function handleFullscreenPlayerError(error) {
  console.error('Fullscreen player error:', error);

  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  if (fullscreenPlayer) {
    fullscreenPlayer.classList.add('error');

    // Remove error class after animation
    setTimeout(() => {
      fullscreenPlayer.classList.remove('error');
    }, 2000);
  }

  showNotification('Playback error occurred', 'error', 3000);
}

// Enhanced loading state management
function setFullscreenPlayerLoading(isLoading) {
  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  if (fullscreenPlayer) {
    if (isLoading) {
      fullscreenPlayer.classList.add('loading');
    } else {
      fullscreenPlayer.classList.remove('loading');
    }
  }
}

// Enhanced keyboard shortcuts for fullscreen player
function initializeFullscreenKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const fullscreenPlayer = document.getElementById('fullscreenPlayer');
    if (!fullscreenPlayer || !fullscreenPlayer.classList.contains('active')) return;

    // Prevent default behavior for our shortcuts
    const shortcuts = ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyM', 'KeyS', 'KeyR'];
    if (shortcuts.includes(e.code)) {
      e.preventDefault();
    }

    switch (e.code) {
      case 'Space':
        // Toggle play/pause
        if (window.playerControls && typeof window.playerControls.togglePlay === 'function') {
          window.playerControls.togglePlay();
        }
        break;

      case 'ArrowLeft':
        // Previous song
        if (typeof playPreviousInQueue === 'function') {
          playPreviousInQueue();
        }
        break;

      case 'ArrowRight':
        // Next song
        if (typeof playNextInQueue === 'function') {
          playNextInQueue();
        }
        break;

      case 'ArrowUp':
        // Volume up
        const audio = document.getElementById('audioElement');
        if (audio) {
          audio.volume = Math.min(1, audio.volume + 0.1);
          updateVolumeVisualFeedback(audio.volume);
        }
        break;

      case 'ArrowDown':
        // Volume down
        const audioDown = document.getElementById('audioElement');
        if (audioDown) {
          audioDown.volume = Math.max(0, audioDown.volume - 0.1);
          updateVolumeVisualFeedback(audioDown.volume);
        }
        break;

      case 'KeyM':
        // Toggle mute
        if (window.playerControls && typeof window.playerControls.toggleMute === 'function') {
          window.playerControls.toggleMute();
        }
        break;

      case 'KeyS':
        // Toggle shuffle
        toggleShuffle();
        updateControlButtonStates();
        break;

      case 'KeyR':
        // Toggle repeat
        toggleRepeat();
        updateControlButtonStates();
        break;

      case 'Escape':
        // Close fullscreen
        fullscreenPlayer.classList.remove('active');
        document.body.style.overflow = '';
        break;
    }
  });
}

// Enhanced responsive handling
function handleFullscreenResponsive() {
  const updateLayout = () => {
    const isMobile = window.innerWidth <= 768;
    const fullscreenPlayer = document.getElementById('fullscreenPlayer');

    if (fullscreenPlayer) {
      if (isMobile) {
        fullscreenPlayer.classList.add('mobile-layout');
        fullscreenPlayer.classList.remove('desktop-layout');
      } else {
        fullscreenPlayer.classList.add('desktop-layout');
        fullscreenPlayer.classList.remove('mobile-layout');
      }
    }

    // Regenerate waveform for new layout
    generateEnhancedWaveform();
  };

  // Initial layout update
  updateLayout();

  // Listen for resize events
  window.addEventListener('resize', debounce(updateLayout, 250));
}

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Enhanced initialization with all new features
function initializeEnhancedFullscreenPlayer() {
  console.log('🎨 Initializing enhanced fullscreen player...');

  // Initialize all enhancements
  generateEnhancedWaveform();
  enhanceProgressBarInteraction();
  updateControlButtonStates();
  updatePlaylistContext();
  handleFullscreenResponsive();
  initializeFullscreenKeyboardShortcuts();

  // Set up enhanced audio event listeners
  const audio = document.getElementById('audioElement');
  if (audio) {
    // Enhanced play event
    audio.addEventListener('play', () => {
      updateWaveformAnimation(true);
      updateAlbumArtRotation(true);
      updateBrandingOnSongChange();
      setFullscreenPlayerLoading(false);
    });

    // Enhanced pause event
    audio.addEventListener('pause', () => {
      updateWaveformAnimation(false);
      updateAlbumArtRotation(false);
    });

    // Enhanced volume change event
    audio.addEventListener('volumechange', () => {
      updateVolumeVisualFeedback(audio.volume);
    });

    // Enhanced time update event
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        updateCircularProgressSmooth(audio.currentTime, audio.duration);
      }
    });

    // Enhanced loading events
    audio.addEventListener('loadstart', () => {
      setFullscreenPlayerLoading(true);
    });

    audio.addEventListener('canplay', () => {
      setFullscreenPlayerLoading(false);
    });

    // Enhanced error handling
    audio.addEventListener('error', (e) => {
      handleFullscreenPlayerError(e);
      setFullscreenPlayerLoading(false);
    });
  }

  // Set up enhanced control button handlers
  setupEnhancedControlButtons();

  // Initialize volume visual feedback
  updateVolumeVisualFeedback(0.8);

  console.log('✅ Enhanced fullscreen player initialized');
}

// Enhanced control button setup
function setupEnhancedControlButtons() {
  const buttons = [
    { id: 'fullscreenShuffle', action: () => { toggleShuffle(); updateControlButtonStates(); } },
    { id: 'fullscreenRepeat', action: () => { toggleRepeat(); updateControlButtonStates(); } },
    { id: 'mobileShuffleBtn', action: () => { toggleShuffle(); updateControlButtonStates(); } },
    { id: 'mobileRepeatBtn', action: () => { toggleRepeat(); updateControlButtonStates(); } },
    { id: 'fullscreenPlaylist', action: toggleQueuePanel }
  ];

  buttons.forEach(({ id, action }) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', action);
    }
  });
}

// Override the original initialization function
if (typeof initializeFullscreenPlayerEnhancements === 'function') {
  // Replace with enhanced version
  window.initializeFullscreenPlayerEnhancements = initializeEnhancedFullscreenPlayer;
}
// ======== UNIFIED FULLSCREEN PLAYER CLOSE FUNCTION ========

function closeFullscreenPlayer() {
  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  if (fullscreenPlayer) {
    fullscreenPlayer.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('fullscreen-active');

    // Hide up next panel if visible
    const upNext = document.querySelector('.up-next');
    if (upNext) {
      upNext.classList.remove('visible');
      upNext.style.display = 'none';
    }

    // Reset playlist button state
    const playlistButton = document.getElementById('fullscreenPlaylist');
    if (playlistButton) {
      playlistButton.classList.remove('active');
    }

    console.log('Fullscreen player closed');
  }
}

// Set up unified close button handlers
function setupUnifiedCloseHandlers() {
  const closeButtons = [
    document.getElementById('closeFullscreen'),
    document.getElementById('closeFullscreenDesktop')
  ];

  closeButtons.forEach(button => {
    if (button) {
      // Remove existing listeners to avoid duplicates
      button.removeEventListener('click', closeFullscreenPlayer);
      // Add new listener
      button.addEventListener('click', closeFullscreenPlayer);
    }
  });

  // Also handle escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const fullscreenPlayer = document.getElementById('fullscreenPlayer');
      if (fullscreenPlayer && fullscreenPlayer.classList.contains('active')) {
        closeFullscreenPlayer();
      }
    }
  });
}

// Initialize unified close handlers
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    setupUnifiedCloseHandlers();
  }, 1000);
});
// ======== UNIFIED FULLSCREEN PLAYER OPEN FUNCTION ========

function openFullscreenPlayer() {
  const fullscreenPlayer = document.getElementById('fullscreenPlayer');
  if (fullscreenPlayer) {
    fullscreenPlayer.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('fullscreen-active');

    // Initialize enhancements if not already done
    if (typeof initializeEnhancedFullscreenPlayer === 'function') {
      initializeEnhancedFullscreenPlayer();
    }

    // Update waveform if playing
    const audio = document.getElementById('audioElement');
    if (audio && !audio.paused) {
      updateWaveformAnimation(true);
      updateAlbumArtRotation(true);
    }

    console.log('Fullscreen player opened');
  }
}

// Enhanced expand player functionality
function setupEnhancedExpandPlayer() {
  const expandButton = document.getElementById('expandPlayer');
  if (expandButton) {
    expandButton.removeEventListener('click', openFullscreenPlayer);
    expandButton.addEventListener('click', openFullscreenPlayer);
  }
}

// Initialize enhanced expand functionality
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    setupEnhancedExpandPlayer();
  }, 1000);
});