export interface YouTubeSongItem {
  id: string
  name: string
  title: string
  type: string
  album: { id: string; name: string; url: string }
  year: string
  releaseDate: string
  duration: number
  label: string
  primaryArtists: string
  primaryArtistsId: string
  featuredArtists: string
  featuredArtistsId: string
  explicitContent: boolean
  playCount: number
  language: string
  hasLyrics: boolean
  url: string
  copyright: string
  image: { quality: string; url: string; link: string }[]
  downloadUrl: { quality: string; url: string; link: string }[]
  source: 'youtube'
}

export class YouTubeService {
  private invidiousInstances = [
    'https://inv.tux.pizza',
    'https://yewtu.be',
    'https://invidious.nerdvpn.de',
    'https://inv.nadeko.net'
  ]

  private pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.video',
    'https://pipedapi.adminforge.de'
  ]

  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  }

  async searchSongs(query: string, limit = 20): Promise<YouTubeSongItem[]> {
    if (!query || !query.trim()) return []

    const makeItem = (videoId: string, title: string, author: string, duration = 0, viewCount = 0): YouTubeSongItem => {
      const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      const streamEndpoint = `/api/youtube/stream?v=${videoId}`
      return {
        id: `yt_${videoId}`,
        name: title, title, type: 'song',
        album: { id: '', name: 'YouTube Music', url: '' },
        year: '', releaseDate: '', duration,
        label: 'YouTube Music',
        primaryArtists: author, primaryArtistsId: '',
        featuredArtists: '', featuredArtistsId: '',
        explicitContent: false, playCount: viewCount,
        language: 'unknown', hasLyrics: false,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        copyright: '',
        image: [
          { quality: '500x500', url: thumb, link: thumb },
          { quality: '150x150', url: thumb, link: thumb },
          { quality: '50x50', url: thumb, link: thumb }
        ],
        downloadUrl: [
          { quality: '320kbps', url: streamEndpoint, link: streamEndpoint },
          { quality: '160kbps', url: streamEndpoint, link: streamEndpoint }
        ],
        source: 'youtube' as const
      }
    }

    const searchViaPiped = async (): Promise<YouTubeSongItem[]> => {
      for (const instance of this.pipedInstances) {
        try {
          const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, {
            headers: { ...this.headers, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000)
          })
          if (!res.ok) continue
          const data: any = await res.json()
          const items: any[] = data.items || []
          if (items.length === 0) continue
          const results = items.slice(0, limit)
            .filter((item: any) => item.url && item.title)
            .map((item: any) => {
              const videoId = item.url?.replace('/watch?v=', '') || ''
              return makeItem(videoId, item.title, item.uploaderName || 'YouTube Artist', item.duration || 0, item.views || 0)
            })
          if (results.length > 0) return results
        } catch { /* try next */ }
      }
      throw new Error('Piped search failed')
    }

    const searchViaInvidious = async (): Promise<YouTubeSongItem[]> => {
      for (const instance of this.invidiousInstances) {
        try {
          const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
            headers: this.headers,
            signal: AbortSignal.timeout(3000)
          })
          if (!res.ok) continue
          const items: any = await res.json()
          if (!Array.isArray(items) || items.length === 0) continue
          const results = items.slice(0, limit).map((item: any) =>
            makeItem(item.videoId, item.title || 'Unknown', item.author || 'YouTube Artist', item.lengthSeconds || 0, item.viewCount || 0)
          )
          if (results.length > 0) return results
        } catch { /* try next */ }
      }
      throw new Error('Invidious search failed')
    }

    const searchViaYouTubeHTML = async (): Promise<YouTubeSongItem[]> => {
      const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' song')}`, {
        headers: {
          ...this.headers,
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(5000)
      })
      const html = await res.text()
      const match = html.match(/var ytInitialData = ({.+?});<\/script>/)
      if (!match) throw new Error('No ytInitialData')
      const data = JSON.parse(match[1])
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || []
      const results: YouTubeSongItem[] = []
      for (const c of contents) {
        if (results.length >= limit) break
        const video = c.videoRenderer
        if (!video?.videoId) continue
        results.push(makeItem(
          video.videoId,
          video.title?.runs?.[0]?.text || 'Unknown',
          video.ownerText?.runs?.[0]?.text || 'YouTube Artist',
          0, 0
        ))
      }
      if (results.length === 0) throw new Error('No results from YouTube HTML')
      return results
    }

    // Race all three search methods simultaneously — return whichever resolves first
    try {
      const results = await Promise.any([
        searchViaPiped(),
        searchViaInvidious(),
        searchViaYouTubeHTML()
      ])
      return results
    } catch {
      console.warn('[YT Search] All search methods failed for:', query)
      return []
    }
  }

  async searchPlaylists(query: string, limit = 20): Promise<any[]> {
    if (!query || !query.trim()) return []
    try {
      for (const instance of this.pipedInstances) {
        try {
          const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=playlists`, {
            headers: { ...this.headers, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000)
          })
          if (!res.ok) continue
          const data: any = await res.json()
          const items: any[] = data.items || []
          if (items.length > 0) {
            return items.slice(0, limit).map((item: any) => ({
              id: `yt_pl_${item.url?.replace('/playlist?list=', '') || Math.random().toString()}`,
              title: item.title,
              name: item.title,
              type: 'playlist',
              image: item.thumbnail ? [{ quality: '500x500', url: item.thumbnail, link: item.thumbnail }] : [],
              subtitle: `${item.videos || 0} songs • YouTube Playlist`,
              songCount: item.videos || 0,
              source: 'youtube'
            }))
          }
        } catch {}
      }
    } catch {}
    return []
  }

  async searchArtists(query: string, limit = 20): Promise<any[]> {
    if (!query || !query.trim()) return []
    try {
      for (const instance of this.pipedInstances) {
        try {
          const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=channels`, {
            headers: { ...this.headers, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000)
          })
          if (!res.ok) continue
          const data: any = await res.json()
          const items: any[] = data.items || []
          if (items.length > 0) {
            return items.slice(0, limit).map((item: any) => ({
              id: `yt_ar_${item.url?.replace('/channel/', '').replace('/user/', '') || Math.random().toString()}`,
              title: item.name || item.title,
              name: item.name || item.title,
              type: 'artist',
              image: item.thumbnail ? [{ quality: '500x500', url: item.thumbnail, link: item.thumbnail }] : [],
              subtitle: 'YouTube Artist',
              role: 'Artist',
              source: 'youtube'
            }))
          }
        } catch {}
      }
    } catch {}
    return []
  }

  async searchAlbums(query: string, limit = 20): Promise<any[]> {
    if (!query || !query.trim()) return []
    // Search albums on YouTube via music_albums filter
    try {
      for (const instance of this.pipedInstances) {
        try {
          const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_albums`, {
            headers: { ...this.headers, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000)
          })
          if (!res.ok) continue
          const data: any = await res.json()
          const items: any[] = data.items || []
          if (items.length > 0) {
            return items.slice(0, limit).map((item: any) => ({
              id: `yt_al_${item.url?.replace('/playlist?list=', '') || Math.random().toString()}`,
              title: item.title,
              name: item.title,
              type: 'album',
              image: item.thumbnail ? [{ quality: '500x500', url: item.thumbnail, link: item.thumbnail }] : [],
              subtitle: `${item.uploaderName || 'YouTube'} • Album`,
              year: '',
              source: 'youtube'
            }))
          }
        } catch {}
      }
    } catch {}
    return []
  }

  /** TIER 1A: Piped API — returns direct proxied audio URLs instantly */
  private async getPipedStream(videoId: string): Promise<string | null> {
    for (const instance of this.pipedInstances) {
      try {
        const res = await fetch(`${instance}/streams/${videoId}`, {
          headers: { ...this.headers, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(4000)
        })
        if (!res.ok) continue
        const data: any = await res.json()

        const audioStreams: any[] = data.audioStreams || []
        if (audioStreams.length === 0) continue

        // Prefer m4a/mp4a (widest browser support), sort by bitrate
        const m4aStreams = audioStreams.filter((s: any) =>
          s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('m4a') || s.mimeType?.includes('mp4a')
        )
        const candidates = m4aStreams.length > 0 ? m4aStreams : audioStreams
        candidates.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))

        const url = candidates[0]?.url
        if (url) {
          console.log(`[YT Stream] ✅ Piped (${instance}) resolved ${videoId} — ${candidates[0].mimeType} @ ${candidates[0].bitrate}bps`)
          return url
        }
      } catch (e) {
        console.warn(`[Piped] ${instance} failed:`, (e as Error).message)
      }
    }
    return null
  }

  /** TIER 1B: JioSaavn Audio Matcher — matches YouTube title → 320kbps JioSaavn audio */
  private async getJioSaavnFallbackStream(videoId: string): Promise<string | null> {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: AbortSignal.timeout(2500) }
      )
      if (!oembedRes.ok) return null

      const meta: any = await oembedRes.json()
      const title = meta.title
      if (!title) return null

      const cleanTitle = title
        .replace(/\(official (music )?video\)|\(lyric(s)? video\)|\(lyrics\)|official (music )?video|lyric(s)? video|karaoke|full (song|video)|audio only/gi, '')
        .trim()

      const searchRes = await fetch(
        `https://saavn.dev/api/search/songs?query=${encodeURIComponent(cleanTitle)}&limit=1`,
        { signal: AbortSignal.timeout(3000) }
      )
      if (!searchRes.ok) return null

      const data: any = await searchRes.json()
      const songs = data?.data?.results || data?.results || []
      if (songs.length > 0) {
        const song = songs[0]
        const downloadUrl = song.downloadUrl || song.download_url
        if (typeof downloadUrl === 'string') return downloadUrl
        if (Array.isArray(downloadUrl) && downloadUrl.length > 0) {
          const high = downloadUrl.find((d: any) => d.quality === '320kbps') ||
            downloadUrl.find((d: any) => d.quality === '160kbps') ||
            downloadUrl[downloadUrl.length - 1]
          const url = high?.url || high?.link
          if (url) {
            console.log(`[YT Stream] ✅ JioSaavn matched "${cleanTitle}" for ${videoId}`)
            return url
          }
        }
      }
    } catch { /* silent */ }
    return null
  }

  /** TIER 2: Invidious API — community YouTube proxy */
  private async getInvidiousStream(videoId: string): Promise<string | null> {
    for (const instance of this.invidiousInstances) {
      try {
        const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
          headers: this.headers,
          signal: AbortSignal.timeout(3000)
        })
        if (!res.ok) continue
        const data: any = await res.json()

        const adaptive: any[] = data.adaptiveFormats || []
        // Prefer mp4/m4a for browser compatibility
        const audioStreams = adaptive.filter((f: any) =>
          f.type?.includes('audio/mp4') || f.type?.includes('audio/webm') || f.type?.includes('audio/mpeg')
        )
        if (audioStreams.length === 0) continue

        audioStreams.sort((a: any, b: any) => (parseInt(b.bitrate || 0)) - (parseInt(a.bitrate || 0)))
        const url = audioStreams[0].url
        if (url) {
          console.log(`[YT Stream] ✅ Invidious (${instance}) resolved ${videoId}`)
          return url
        }
      } catch { /* try next */ }
    }
    return null
  }

  async getStreamUrl(videoId: string): Promise<string | null> {
    const cleanId = videoId.replace('yt_', '')

    // RACE Tier 1A vs 1B simultaneously — return whichever resolves first
    const raceResult = await Promise.any([
      this.getPipedStream(cleanId),
      this.getJioSaavnFallbackStream(cleanId)
    ]).catch(() => null)

    if (raceResult) return raceResult

    // Tier 2: Invidious (slower, but reliable)
    const invUrl = await this.getInvidiousStream(cleanId)
    if (invUrl) return invUrl

    console.warn(`[YT Stream] ❌ All tiers failed for ${cleanId}`)
    return null
  }
}
