/**
 * Generic IntersectionObserver to defer loading high-res images
 */
const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;

            // Standard Image replacement
            if (el.dataset.src) {
                el.src = el.dataset.src;
                el.removeAttribute('data-src');
                el.classList.add('loaded');
            }

            // Background image replacement (optional support)
            if (el.dataset.bg) {
                el.style.backgroundImage = `url('${el.dataset.bg}')`;
                el.removeAttribute('data-bg');
                el.classList.add('loaded');
            }

            obs.unobserve(el);
        }
    });
}, {
    rootMargin: '100px 0px', // start loading slightly before hitting viewport
    threshold: 0.01
});

/**
 * Attaches the native observer to a DOM node
 * @param {HTMLElement} element 
 */
export function observeImage(element) {
    if (!element) return;
    observer.observe(element);
}
