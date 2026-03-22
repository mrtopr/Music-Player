import { setSleepTimer, clearSleepTimer } from './sleepTimer.js';

export function initPremiumModals() {
    // ─── Sleep Timer ───
    const sleepBtn = document.getElementById('openSleepBtn');
    const sleepModal = document.getElementById('sleepTimerModal');
    const closeSleepModal = document.getElementById('closeSleepModal');

    sleepBtn?.addEventListener('click', () => {
        sleepModal.style.display = 'flex';
    });

    closeSleepModal?.addEventListener('click', () => {
        sleepModal.style.display = 'none';
    });

    document.querySelectorAll('.sleep-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const time = e.target.getAttribute('data-time');
            setSleepTimer(time);
            sleepModal.style.display = 'none';
        });
    });

    document.getElementById('turnOffSleepBtn')?.addEventListener('click', () => {
        clearSleepTimer();
        sleepModal.style.display = 'none';
    });

    // ─── Equalizer ───
    const eqBtn = document.getElementById('openEqBtn');
    const eqModal = document.getElementById('eqModal');
    const closeEqModal = document.getElementById('closeEqModal');

    eqBtn?.addEventListener('click', () => {
        eqModal.style.display = 'flex';
        syncEqUI();
    });

    closeEqModal?.addEventListener('click', () => {
        eqModal.style.display = 'none';
        saveEQ();
    });

    ['eqBass', 'eqMid', 'eqTreble'].forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener('input', applyEQ);
    });

    document.getElementById('resetEqBtn')?.addEventListener('click', () => {
        ['eqBass', 'eqMid', 'eqTreble'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 0;
        });
        applyEQ();
    });

    // ─── Share Button (Fullscreen) ───
    const fsShareBtn = document.getElementById('fullscreenShare');
    fsShareBtn?.addEventListener('click', () => {
        import('../player/state.js').then(m => {
            let active;
            if (m.state.songQueue.length > 0) active = m.state.songQueue[m.state.currentQueueIndex];
            else active = m.state.songs[m.state.currentSongIndex];
            shareSong(active);
        });
    });
}

function applyEQ() {
    if (!window.audioEQ) return; // Wait for playback matrix

    const bass = parseFloat(document.getElementById('eqBass').value);
    const mid = parseFloat(document.getElementById('eqMid').value);
    const treble = parseFloat(document.getElementById('eqTreble').value);

    window.audioEQ.bass.gain.value = bass;
    window.audioEQ.mid.gain.value = mid;
    window.audioEQ.treble.gain.value = treble;

    saveEQ();
}

function syncEqUI() {
    const saved = JSON.parse(localStorage.getItem('mehfilEQ') || '{"bass":0,"mid":0,"treble":0}');
    const b = document.getElementById('eqBass');
    const m = document.getElementById('eqMid');
    const t = document.getElementById('eqTreble');

    if (b) b.value = window.audioEQ ? window.audioEQ.bass.gain.value : saved.bass;
    if (m) m.value = window.audioEQ ? window.audioEQ.mid.gain.value : saved.mid;
    if (t) t.value = window.audioEQ ? window.audioEQ.treble.gain.value : saved.treble;
}

function saveEQ() {
    const bass = parseFloat(document.getElementById('eqBass').value);
    const mid = parseFloat(document.getElementById('eqMid').value);
    const treble = parseFloat(document.getElementById('eqTreble').value);
    localStorage.setItem('mehfilEQ', JSON.stringify({ bass, mid, treble }));
}

export async function shareSong(song) {
    if (!song) return;
    const title = song.title || song.name || 'Unknown Track';
    const artist = song.more_info?.artistMap?.primary_artists?.[0]?.name || song.subtitle || 'Unknown Artist';
    const url = window.location.href; // Deep link placeholder
    const text = `Check out "${title}" by ${artist} on Mehfil!\n${url}`;

    try {
        if (navigator.share) {
            await navigator.share({ title: 'Mehfil', text, url });
        } else {
            await navigator.clipboard.writeText(text);
            import('../ui/notifications.js').then(m => m.showNotification('Link copied to clipboard', 'success'));
        }
    } catch (e) {
        console.warn('Share/Clipboard failed:', e);
    }
}
