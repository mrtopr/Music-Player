import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import all stylesheets in the correct order
import '../styles.css';
import '../styles/brand-identity.css';
import '../styles/noir-gold-theme.css';
import '../styles/mini-player.css';
import '../styles/fullscreen-player.css';
import '../styles/audio-visualizer.css';
import '../styles/micro-delights.css';
import '../styles/mobile-redesign.css';
import '../styles/settings.css';
import '../styles/universes.css';



ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// ── Service Worker Registration ──
// IMPORTANT: never run the SW in dev. It is cache-first for JS/CSS, which makes
// Vite serve stale modules and hides every code change behind an old cache.
if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => {
                    reg.update();
                    console.log('Service Worker: Registered & Updated (Scope: %s)', reg.scope);
                })
                .catch(err => console.error('Service Worker: Error during registration:', err));
        });
    } else {
        // Dev: drop any previously installed worker + its caches so edits show up.
        navigator.serviceWorker.getRegistrations()
            .then(regs => Promise.all(regs.map(reg => reg.unregister())))
            .then(async () => {
                if (window.caches) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
                console.log('Service Worker: unregistered in dev (cache cleared)');
            })
            .catch(() => {});
    }
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
