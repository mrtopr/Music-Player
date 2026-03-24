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

// ── Service Worker Registration ──
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker: Registered (Scope: %s)', reg.scope))
            .catch(err => console.error('Service Worker: Error during registration:', err));
    });
}

// ── PWA Install Prompt Handler ──
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    window.__deferredPrompt = e;
    // Notify components that the "Install" button can be shown
    window.dispatchEvent(new Event('pwa-can-install'));
});
