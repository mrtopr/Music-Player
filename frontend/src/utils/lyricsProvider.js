/**
 * lyricsProvider.js — multi-source lyrics with automatic fallback.
 *
 * Resolution order:
 *   1. Backend aggregator  GET /api/lyrics  (LRCLIB → Kugou → NetEase → lyrics.ovh,
 *      scored server-side, CORS-free because it runs on our own origin)
 *   2. Direct browser fallback: LRCLIB search  (CORS-enabled)
 *   3. Direct browser fallback: lyrics.ovh     (CORS-enabled, plain text)
 *
 * The first source that returns usable lyrics wins, so a single dead provider
 * never leaves the panel empty.
 */

import { parseLrc, decodeEntities } from './helpers.js';
import { apiFetch } from '../api/client.js';

// Session cache: songId -> result | null
const lyricsCache = new Map();

export const LYRICS_PROVIDERS = [
  { id: 'auto', name: 'Auto — try every source', supportsSynced: true },
  { id: 'lrclib', name: 'LRCLIB', supportsSynced: true },
  { id: 'netease', name: 'NetEase Cloud Music', supportsSynced: true },
  { id: 'qq', name: 'QQ Music', supportsSynced: true },
  { id: 'kugou', name: 'Kugou', supportsSynced: true },
  { id: 'lyrics-ovh', name: 'lyrics.ovh (plain)', supportsSynced: false },
];

export function getAvailableProviders() {
  return LYRICS_PROVIDERS.map(({ id, name, supportsSynced }) => ({ id, name, supportsSynced }));
}

/** Record labels that JioSaavn sometimes puts in the artist slot. */
const LABEL_NAMES = [
  't-series', 'tseries', 'sony music', 'zee music', 'saregama', 'tips', 'yrf',
  'universal', 'warner', 'emi', 'speed records', 'desi music factory', 'aditya music',
  'lahari', 'think music', 'eros', 'shemaroo', 'pen studios', 'junglee music',
  'divo', 'ishtar', 'believe', 'orchard', 'venus', 'times music', 'wave music',
  'ultra', 'b4u', 'srk music', 'various artists',
  // JioSaavn labels compilations as "Various" — not a usable artist name.
  'various',
];

function isLabel(name = '') {
  const n = name.toLowerCase().trim();
  return !n || LABEL_NAMES.some((label) => n === label || n.startsWith(label));
}

/** Extract title/artist/album/duration from any of our song shapes. */
export function buildSongMeta(song = {}) {
  const title = decodeEntities(song.title || song.name || song.song || '').trim();

  const artistCandidates = [
    song.primaryArtists,
    Array.isArray(song.artists?.primary)
      ? song.artists.primary.map((a) => a?.name).filter(Boolean).join(', ')
      : null,
    song.subtitle,
    song.artist,
  ]
    .filter(Boolean)
    .map((value) => decodeEntities(String(value)));

  let artist = '';
  for (const candidate of artistCandidates) {
    const first = candidate
      .split(/\s*(?:,|&|\bfeat\.?\b|\bft\.?\b)\s*/i)
      .map((part) => part.trim())
      .filter((part) => part.length > 1 && !isLabel(part))[0];
    if (first) {
      artist = first;
      break;
    }
  }

  const albumRaw = song.album?.name || (typeof song.album === 'string' ? song.album : '') || song.moreInfo?.album || '';
  const album = decodeEntities(String(albumRaw)).trim();

  let duration = Number(song.duration || song.durationSeconds || 0);
  if (!duration && song.durationMs) duration = Number(song.durationMs) / 1000;
  if (!Number.isFinite(duration) || duration <= 0) duration = 0;

  return { title, artist, album, duration };
}

function toResult(data) {
  const synced = data.syncedLyrics ? parseLrc(data.syncedLyrics) : [];
  return {
    plain: data.plainLyrics || null,
    synced,
    isSynced: synced.length > 0,
    instrumental: !!data.instrumental,
    source: data.provider || 'unknown',
    sourceName: data.providerName || data.provider || 'Unknown',
    matchedTitle: data.matchedTitle || null,
    matchedArtist: data.matchedArtist || null,
  };
}

/* ────────────────────────── Direct browser fallbacks ───────────────────────── */

const LYRCLIB = 'https://lrclib.net/api/search';

async function directLrclib(meta) {
  const queries = [];
  if (meta.artist) queries.push(`${meta.title} ${meta.artist}`);
  queries.push(meta.title);

  for (const query of queries) {
    if (!query.trim()) continue;
    try {
      const res = await fetch(`${LYRCLIB}?q=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const list = await res.json();
      const best = Array.isArray(list)
        ? list.find((item) => item.syncedLyrics || item.plainLyrics)
        : null;
      if (!best) continue;

      const synced = best.syncedLyrics ? parseLrc(best.syncedLyrics) : [];
      return {
        plain: best.plainLyrics || null,
        synced,
        isSynced: synced.length > 0,
        instrumental: !!best.instrumental,
        source: 'lrclib-direct',
        sourceName: 'LRCLIB (direct)',
        matchedTitle: best.trackName || null,
        matchedArtist: best.artistName || null,
      };
    } catch {
      // try the next query
    }
  }
  return null;
}

async function directLyricsOvh(meta) {
  if (!meta.artist) return null;
  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(meta.artist)}/${encodeURIComponent(meta.title)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.lyrics) return null;
    return {
      plain: String(data.lyrics).trim(),
      synced: [],
      isSynced: false,
      instrumental: false,
      source: 'lyrics-ovh-direct',
      sourceName: 'lyrics.ovh (direct)',
      matchedTitle: meta.title,
      matchedArtist: meta.artist,
    };
  } catch {
    return null;
  }
}

/* ───────────────────────────────── Public API ─────────────────────────────── */

/**
 * @param {object} song
 * @param {string} [preferredProvider] provider id, or 'auto'
 * @param {{ force?: boolean }} [options] force=true bypasses every cache (Retry)
 */
export async function fetchLyrics(song, preferredProvider = 'auto', options = {}) {
  if (!song) return null;

  const meta = buildSongMeta(song);
  if (!meta.title) return null;

  const cacheKey = song.id || `${meta.title}|${meta.artist}`;
  if (!options.force && lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  // 1. Backend aggregator — handles the full provider chain server-side.
  try {
    const params = { title: meta.title };
    if (meta.artist) params.artist = meta.artist;
    if (meta.album) params.album = meta.album;
    if (meta.duration) params.duration = String(Math.round(meta.duration));
    if (preferredProvider && preferredProvider !== 'auto') params.provider = preferredProvider;

    const data = await apiFetch('/api/lyrics', params);
    if (data?.found) {
      const result = toResult(data);
      lyricsCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[Lyrics] Backend aggregator unavailable, trying direct providers:', err?.message);
  }

  // 2 + 3. Direct provider fallbacks (work even without the backend).
  const direct = (await directLrclib(meta)) || (await directLyricsOvh(meta));
  lyricsCache.set(cacheKey, direct || null);
  return direct || null;
}

/** Remove one song (or everything) from the session cache. */
export function clearCache(songId) {
  if (songId) lyricsCache.delete(songId);
  else lyricsCache.clear();
}

export function getCacheSize() {
  return lyricsCache.size;
}
