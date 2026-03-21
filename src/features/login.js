/**
 * Login / user profile (local, no server auth)
 */
import { state } from '../player/state.js';
import { showNotification } from '../ui/notifications.js';

const STORAGE_KEY = 'userProfile';

export function loadUser() {
    try {
        state.currentUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
        state.currentUser = null;
    }
    updateUserUI();
}

function saveUser(user) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
        console.warn('Failed to save user:', e);
    }
}

function updateUserUI() {
    const nameEl = document.getElementById('userNameDisplay');
    const avatarEl = document.getElementById('userAvatar');

    if (state.currentUser) {
        if (nameEl) nameEl.textContent = state.currentUser.name || 'User';
        if (avatarEl && state.currentUser.photoUrl) {
            avatarEl.src = state.currentUser.photoUrl;
        }
    }
}

export function initLogin() {
    loadUser();

    const loginForm = document.getElementById('loginForm');
    const loginModal = document.getElementById('loginModal');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('loginName');
            const name = nameInput?.value?.trim();
            if (!name) return;

            state.currentUser = { name, photoUrl: null, loginTime: Date.now() };

            // Handle profile photo upload
            const photoInput = document.getElementById('profilePhoto');
            const file = photoInput?.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    state.currentUser.photoUrl = ev.target.result;
                    saveUser(state.currentUser);
                    updateUserUI();
                };
                reader.readAsDataURL(file);
            } else {
                saveUser(state.currentUser);
                updateUserUI();
            }

            loginModal?.classList.remove('active');
            showNotification(`Welcome, ${name}! 🎵`, 'success');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            state.currentUser = null;
            localStorage.removeItem(STORAGE_KEY);
            updateUserUI();
            showNotification('Logged out', 'info');
        });
    }

    // Show modal if not logged in
    if (!state.currentUser && loginModal) {
        setTimeout(() => loginModal.classList.add('active'), 500);
    }
}
