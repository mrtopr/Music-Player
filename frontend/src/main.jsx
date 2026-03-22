import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import all stylesheets in the correct order
import '../styles.css';
import '../styles/brand-identity.css';
import '../styles/noir-gold-theme.css';
import '../styles/player.css';
import '../styles/mini-player.css';
import '../styles/fullscreen-player.css';
import '../styles/audio-visualizer.css';
import '../styles/premium-fullscreen.css';
import '../styles/unified-cards.css';
import '../styles/card-hover-fix.css';
import '../styles/micro-delights.css';
import '../styles/moodThemes.css';
import '../styles/moodAnimations.css';
import '../styles/react-polish.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
