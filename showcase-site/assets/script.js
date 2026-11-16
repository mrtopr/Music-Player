/* Mehfil — interactions */
(function () {
    'use strict';

    // Gate JS-dependent styles (reveal animations) — content stays visible without JS
    document.documentElement.classList.add('js');

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Nav: scrolled state ── */
    var nav = document.querySelector('.nav');
    function onScroll() {
        nav.classList.toggle('is-scrolled', window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ── Nav: mobile menu ── */
    var toggle = document.getElementById('nav-toggle');
    var menu = document.getElementById('nav-menu');
    function closeMenu() {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }
    toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeMenu);
    });
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
    });

    /* ── Reveal on scroll ── */
    var revealEls = document.querySelectorAll('.reveal');
    if (prefersReduced || !('IntersectionObserver' in window)) {
        revealEls.forEach(function (el) { el.classList.add('is-in'); });
    } else {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
        revealEls.forEach(function (el) { io.observe(el); });
    }

    /* ── FAQ accordion (accessible) ── */
    var faqButtons = document.querySelectorAll('.faq__q');
    faqButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var expanded = btn.getAttribute('aria-expanded') === 'true';
            // Close all
            faqButtons.forEach(function (other) {
                other.setAttribute('aria-expanded', 'false');
                document.getElementById(other.getAttribute('aria-controls')).hidden = true;
                other.closest('.faq__item').classList.remove('open');
            });
            // Open current if it was closed
            if (!expanded) {
                btn.setAttribute('aria-expanded', 'true');
                document.getElementById(btn.getAttribute('aria-controls')).hidden = false;
                btn.closest('.faq__item').classList.add('open');
            }
        });
    });
})();