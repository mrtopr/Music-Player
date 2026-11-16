export interface AddonManifest {
  id: string
  name: string
  version: string
  description: string
  endpoints: {
    search: string
    stream: string
  }
  capabilities: {
    lossless: boolean
    atmos: boolean
  }
}

export interface AddonTrack {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  image: string
  url: string
  source: string
}

export class AddonsService {
  private readonly manifest: AddonManifest = {
    id: 'mehfil-default',
    name: 'Mehfil Default Source',
    version: '1.0.0',
    description: 'Default JioSaavn-backed music source',
    endpoints: {
      search: '/api/addons/search',
      stream: '/api/addons/stream/{id}',
    },
    capabilities: {
      lossless: false,
      atmos: false,
    },
  }

  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  async getManifest(): Promise<AddonManifest> {
    return this.manifest
  }

  async search(query: string, source?: string): Promise<AddonTrack[]> {
    if (!query || !query.trim()) return []

    const cacheKey = `search:${source || 'default'}:${query.toLowerCase()}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      const { useFetch } = await import('#common/helpers')
      const { data } = await useFetch<{ songs: any[] }>({
        endpoint: 'search.getResults' as any,
        params: { q: query, p: 0, n: 20 },
      })

      const tracks: AddonTrack[] = (data.songs || []).map((song: any) => ({
        id: song.id,
        title: song.title,
        artist: song.more_info?.primary_artists || 'Unknown Artist',
        album: song.more_info?.album || 'Unknown Album',
        duration: song.more_info?.duration ? Number(song.more_info.duration) : 0,
        image: song.image || '',
        url: song.perma_url || '',
        source: source || 'default',
      }))

      this.cache.set(cacheKey, { data: tracks, timestamp: Date.now() })
      return tracks
    } catch (error) {
      console.warn('[Addons] Search failed:', error)
      return []
    }
  }

  async resolveStream(id: string, quality?: string, atmos?: string): Promise<any | null> {
    const cacheKey = `stream:${id}:${quality || 'default'}:${atmos || 'auto'}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data
    }

    try {
      const { useFetch } = await import('#common/helpers')
      const { data } = await useFetch<{ songs: any[] }>({
        endpoint: 'song.getDetails' as any,
        params: { pids: id },
      })

      const song = data.songs?.[0]
      if (!song) return null

      const result = {
        url: song.more_info?.encrypted_media_url || song.perma_url || '',
        codec: 'aac',
        manifest: 'none',
        encrypted: true,
        sampleRate: 44100,
        bitDepth: 16,
        bitrate: 320000,
      }

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    } catch (error) {
      console.warn('[Addons] Stream resolve failed:', error)
      return null
    }
  }
}
