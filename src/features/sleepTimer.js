import { forcePause } from '../player/engine.js';
import { showNotification } from '../ui/notifications.js';

let timerId = null;
let countdownInterval = null;
let targetEndTime = null;

/**
 * Starts or modifies the sleep timer
 * @param {string|number} value - 'end', 15, 30, 60
 */
export function setSleepTimer(value) {
    clearSleepTimer();

    if (value === 'end') {
        window.sleepTimerAtEndOfTrack = true;
        showNotification('Sleep timer set to end of track', 'info');
        updateBadge('END');
        return;
    }

    const minutes = parseInt(value, 10);
    if (!minutes || isNaN(minutes)) return;

    window.sleepTimerAtEndOfTrack = false;
    const ms = minutes * 60 * 1000;
    targetEndTime = Date.now() + ms;

    timerId = setTimeout(() => {
        forcePause();
        clearSleepTimer();
        showNotification('Sleep timer ended. Playback paused.', 'info');
    }, ms);

    countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
    showNotification(`Sleep timer set for ${minutes} minutes`, 'info');
}

export function clearSleepTimer() {
    if (timerId) clearTimeout(timerId);
    if (countdownInterval) clearInterval(countdownInterval);
    timerId = null;
    countdownInterval = null;
    targetEndTime = null;
    window.sleepTimerAtEndOfTrack = false;
    updateBadge('');
}

function updateCountdown() {
    if (!targetEndTime) return;
    const remainingSeconds = Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));

    if (remainingSeconds <= 0) {
        updateBadge('');
        return;
    }

    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    updateBadge(`${m}:${s.toString().padStart(2, '0')}`);
}

function updateBadge(text) {
    const badge = document.getElementById('sleepTimerBadge');
    if (badge) {
        if (text) {
            badge.textContent = text;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}
