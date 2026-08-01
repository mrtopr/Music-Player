/**
 * Mehfil Offline Storage & Download Manager (IndexedDB + Blob Cache)
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides offline track downloading, storage space tracking, and offline playback URLs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DB_NAME = 'mehfil_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            return reject(new Error('IndexedDB not supported'));
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Saves a track, audio blob, and image blob to IndexedDB for offline playback.
 */
export async function saveTrackOffline(song, downloadUrl, imageUrl) {
    if (!song || !song.id) throw new Error('Invalid song object');
    const db = await openDB();

    // 1. Fetch audio blob
    const audioRes = await fetch(downloadUrl);
    if (!audioRes.ok) throw new Error('Audio download failed');
    const audioBlob = await audioRes.blob();

    // 2. Fetch image blob (optional)
    let imageBlob = null;
    if (imageUrl) {
        try {
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) imageBlob = await imgRes.blob();
        } catch (e) { }
    }

    const payload = {
        id: song.id,
        song: { ...song },
        audioBlob,
        imageBlob,
        downloadedAt: Date.now(),
        sizeBytes: audioBlob.size + (imageBlob ? imageBlob.size : 0)
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(payload);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Retrieves all offline saved tracks metadata.
 */
export async function getOfflineTracks() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const results = req.result || [];
                const tracks = results.map(item => ({
                    ...item.song,
                    isOfflineSaved: true,
                    sizeBytes: item.sizeBytes,
                    downloadedAt: item.downloadedAt,
                    offlineAudioUrl: item.audioBlob ? URL.createObjectURL(item.audioBlob) : null,
                    offlineImageUrl: item.imageBlob ? URL.createObjectURL(item.imageBlob) : null,
                }));
                resolve(tracks);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (err) {
        return [];
    }
}

/**
 * Checks if a song is downloaded offline.
 */
export async function isTrackOffline(songId) {
    if (!songId) return false;
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(songId);
            req.onsuccess = () => resolve(!!req.result);
            req.onerror = () => resolve(false);
        });
    } catch (err) {
        return false;
    }
}

/**
 * Deletes a track from IndexedDB.
 */
export async function removeTrackOffline(songId) {
    if (!songId) return false;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(songId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Computes total offline storage used in Megabytes.
 */
export async function getOfflineStorageStats() {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const results = req.result || [];
                const totalBytes = results.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
                const count = results.length;
                const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
                resolve({ count, totalMb, totalBytes });
            };
            req.onerror = () => resolve({ count: 0, totalMb: '0', totalBytes: 0 });
        });
    } catch (err) {
        return { count: 0, totalMb: '0', totalBytes: 0 };
    }
}
