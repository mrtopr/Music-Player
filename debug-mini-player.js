// Debug script for mini player
console.log('🔧 Mini Player Debug Script Loaded');

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    console.log('🔍 Debugging mini player state...');
    
    // Check global variables
    console.log('window.songs:', window.songs ? window.songs.length : 'undefined');
    console.log('window.currentSongIndex:', window.currentSongIndex);
    
    // Check audio element
    const audio = document.getElementById('audioElement');
    console.log('Audio element:', !!audio);
    console.log('Audio src:', audio?.src || 'No source');
    console.log('Audio paused:', audio?.paused);
    
    // Check mini play button
    const miniPlayButton = document.getElementById('miniPlayButton');
    console.log('Mini play button:', !!miniPlayButton);
    console.log('Mini play button HTML:', miniPlayButton?.innerHTML);
    
    // Check playerControls
    console.log('window.playerControls:', !!window.playerControls);
    if (window.playerControls) {
      console.log('togglePlay function:', typeof window.playerControls.togglePlay);
      console.log('updatePlayButtons function:', typeof window.playerControls.updatePlayButtons);
    }
    
    // Add a test click handler
    if (miniPlayButton) {
      miniPlayButton.addEventListener('click', () => {
        console.log('🖱️ Mini play button clicked - Debug info:');
        console.log('  - Songs available:', window.songs ? window.songs.length : 0);
        console.log('  - Current song index:', window.currentSongIndex);
        console.log('  - Audio src before:', audio?.src || 'No source');
        
        setTimeout(() => {
          console.log('  - Audio src after:', audio?.src || 'No source');
          console.log('  - Audio paused after:', audio?.paused);
          console.log('  - Button HTML after:', miniPlayButton.innerHTML);
        }, 1000);
      });
    }
    
  }, 3000);
});