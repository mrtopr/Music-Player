/**
 * Scroll Progress Indicator
 * Thin gold line at top showing scroll position
 */

document.addEventListener('DOMContentLoaded', () => {
    // Create scroll progress element
    const scrollProgress = document.createElement('div');
    scrollProgress.className = 'scroll-progress';
    scrollProgress.style.width = '0%';
    document.body.appendChild(scrollProgress);

    // Update on scroll
    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        scrollProgress.style.transform = `scaleX(${scrolled / 100})`;
    }, { passive: true });

    console.log('✨ Scroll progress indicator initialized');
});
