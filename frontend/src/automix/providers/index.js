/**
 * Provider registry.
 *
 * The AutoMix engine never talks to JioSaavn or YouTube directly — it asks a
 * provider adapter. That keeps the mixing engine independent of any specific
 * music service and makes non-processable providers a first-class case.
 */

import { jiosaavnProvider } from './jiosaavn.js';
import { youtubeProvider } from './youtube.js';

const PROVIDERS = [jiosaavnProvider, youtubeProvider];

/** Finds the adapter that can handle a track. */
export function resolveProvider(track) {
    if (youtubeProvider.isYouTube(track)) return youtubeProvider;
    return jiosaavnProvider;
}

/** @returns {import('./jiosaavn.js')} */
export function getProvider(id) {
    return PROVIDERS.find((provider) => provider.id === id) || jiosaavnProvider;
}

/**
 * True when the engine can fetch, analyse and mix this track.
 * @returns {{ processable: boolean, reason?: string }}
 */
export function canProcess(track) {
    const provider = resolveProvider(track);
    if (provider.isProcessable(track)) return { processable: true };

    return {
        processable: false,
        reason:
            provider.id === 'youtube'
                ? 'YouTube audio cannot be routed to the audio engine — using a standard handover for this track.'
                : 'No downloadable audio source for this track — using a standard handover.',
    };
}

export { jiosaavnProvider, youtubeProvider };
