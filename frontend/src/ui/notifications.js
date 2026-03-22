/**
 * Notification / toast system
 * Replaces global showNotification from index.js
 */

let _container = null;

function getContainer() {
    if (!_container) {
        _container = document.getElementById('notification-container');
        if (!_container) {
            _container = document.createElement('div');
            _container.id = 'notification-container';
            _container.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
            document.body.appendChild(_container);
        }
    }
    return _container;
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} type
 * @param {number} duration - ms before auto-dismiss
 */
export function showNotification(message, type = 'info', duration = 3000) {
    const colors = {
        info: '#6c63ff',
        success: '#00d68f',
        error: '#ff3d71',
        warning: '#ffaa00'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
    background: rgba(18, 18, 28, 0.95);
    border-left: 3px solid ${colors[type] || colors.info};
    color: #f0f0f0;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    max-width: 320px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    transform: translateX(120%);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto;
    cursor: pointer;
    backdrop-filter: blur(12px);
  `;
    toast.textContent = message;

    getContainer().appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    const dismiss = () => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    };

    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
}

// Expose globally for legacy code compatibility
window.showNotification = showNotification;
