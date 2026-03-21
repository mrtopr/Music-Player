/**
 * Lucide icon system — replaces Bootstrap Icons CDN + local SVG files
 * Provides icon() factory, setIcon() utility, and replaceBootstrapIcons() runtime migration
 */

import {
    Play, Pause, SkipBack, SkipForward,
    Volume2, Volume1, VolumeX,
    Heart, Shuffle, Repeat, Repeat1,
    Music, ListMusic, Search, Maximize2, Minimize2,
    ChevronDown, ChevronLeft, ChevronRight, X,
    Flame, Mic, Mic2, Menu,
    ArrowLeft, ArrowRight,
    Home, Settings, LogOut,
    Plus, Check, Clock, Share2,
    Star, MoreHorizontal, Library,
    History, Radio, Download, Info,
    Moon, SlidersHorizontal
} from 'lucide';

/**
 * Create a Lucide SVG icon element
 * @param {Function} IconFn - Lucide icon constructor
 * @param {Object} opts - { size, strokeWidth, className }
 * @returns {SVGElement}
 */
export function icon(IconFn, opts = {}) {
    const { size = 24, strokeWidth = 2, className = '' } = opts;
    return IconFn({
        width: size,
        height: size,
        'stroke-width': strokeWidth,
        class: `lucide-icon${className ? ' ' + className : ''}`
    });
}

/** Named icon map — import from here anywhere in the app */
export const Icons = {
    play: (o) => icon(Play, o),
    pause: (o) => icon(Pause, o),
    skipBack: (o) => icon(SkipBack, o),
    skipForward: (o) => icon(SkipForward, o),
    volumeHigh: (o) => icon(Volume2, o),
    volumeLow: (o) => icon(Volume1, o),
    volumeMute: (o) => icon(VolumeX, o),
    heart: (o) => icon(Heart, o),
    shuffle: (o) => icon(Shuffle, o),
    repeat: (o) => icon(Repeat, o),
    repeat1: (o) => icon(Repeat1, o),
    music: (o) => icon(Music, o),
    listMusic: (o) => icon(ListMusic, o),
    search: (o) => icon(Search, o),
    maximize: (o) => icon(Maximize2, o),
    minimize: (o) => icon(Minimize2, o),
    chevronDown: (o) => icon(ChevronDown, o),
    chevronLeft: (o) => icon(ChevronLeft, o),
    chevronRight: (o) => icon(ChevronRight, o),
    close: (o) => icon(X, o),
    flame: (o) => icon(Flame, o),
    mic: (o) => icon(Mic, o),
    mic2: (o) => icon(Mic2, o),
    menu: (o) => icon(Menu, o),
    arrowLeft: (o) => icon(ArrowLeft, o),
    arrowRight: (o) => icon(ArrowRight, o),
    home: (o) => icon(Home, o),
    settings: (o) => icon(Settings, o),
    logOut: (o) => icon(LogOut, o),
    plus: (o) => icon(Plus, o),
    check: (o) => icon(Check, o),
    clock: (o) => icon(Clock, o),
    share: (o) => icon(Share2, o),
    more: (o) => icon(MoreHorizontal, o),
    library: (o) => icon(Library, o),
    history: (o) => icon(History, o),
    radio: (o) => icon(Radio, o),
    download: (o) => icon(Download, o),
    info: (o) => icon(Info, o),
    moon: (o) => icon(Moon, o),
    equalizer: (o) => icon(SlidersHorizontal, o),
    star: (o) => icon(Star, o),
};

/**
 * Set element's icon content, replacing any prior content
 * @param {HTMLElement} el
 * @param {string} iconName - key in Icons
 * @param {Object} opts
 */
export function setIcon(el, iconName, opts = {}) {
    if (!el) return;
    el.innerHTML = '';
    const iconEl = Icons[iconName]?.(opts);
    if (iconEl) el.appendChild(iconEl);
}

/** Bootstrap Icons class → Lucide name mapping */
const BI_TO_LUCIDE = {
    'bi-play-fill': 'play',
    'bi-pause-fill': 'pause',
    'bi-skip-start-fill': 'skipBack',
    'bi-skip-end-fill': 'skipForward',
    'bi-volume-up': 'volumeHigh',
    'bi-volume-down': 'volumeLow',
    'bi-volume-mute': 'volumeMute',
    'bi-heart': 'heart',
    'bi-heart-fill': 'heart',
    'bi-shuffle': 'shuffle',
    'bi-arrow-repeat': 'repeat',
    'bi-repeat-1': 'repeat1',
    'bi-music-note': 'music',
    'bi-music-note-list': 'listMusic',
    'bi-collection-play': 'listMusic',
    'bi-collection-play-fill': 'listMusic',
    'bi-search': 'search',
    'bi-arrows-angle-expand': 'maximize',
    'bi-fullscreen': 'maximize',
    'bi-chevron-down': 'chevronDown',
    'bi-chevron-left': 'chevronLeft',
    'bi-chevron-right': 'chevronRight',
    'bi-x-lg': 'close',
    'bi-x': 'close',
    'bi-fire': 'flame',
    'bi-mic-fill': 'mic2',
    'bi-mic': 'mic',
    'bi-three-dots': 'more',
    'bi-three-dots-vertical': 'more',
    'bi-arrow-left': 'arrowLeft',
    'bi-arrow-right': 'arrowRight',
    'bi-house-fill': 'home',
    'bi-house': 'home',
    'bi-gear': 'settings',
    'bi-gear-fill': 'settings',
    'bi-box-arrow-right': 'logOut',
    'bi-list': 'menu',
    'bi-plus-circle': 'plus',
    'bi-plus': 'plus',
    'bi-clock': 'clock',
    'bi-star-fill': 'star',
    'bi-camera': 'plus',
    'bi-music-player': 'music',
};

/**
 * Replace all remaining <i class="bi bi-*"> elements in the DOM with Lucide SVGs
 * Safe to call multiple times — skips elements already processed
 */
export function replaceBootstrapIcons(root = document) {
    root.querySelectorAll('i[class*="bi-"]').forEach(el => {
        if (el.dataset.lucideReplaced) return;
        const classes = Array.from(el.classList);
        for (const cls of classes) {
            const lucideName = BI_TO_LUCIDE[cls];
            if (lucideName) {
                const size = parseInt(el.dataset.iconSize || '20', 10);
                setIcon(el, lucideName, { size });
                el.classList.remove('bi', cls);
                el.dataset.lucideReplaced = '1';
                break;
            }
        }
    });
}
