/**
 * Host allow-list for the audio proxy.
 *
 * The proxy exists so the browser can read audio bytes for DSP analysis
 * (BPM / key / waveform) without CORS restrictions. Only known music CDNs
 * are allowed, otherwise the endpoint would be an open proxy for SSRF.
 */

const ALLOWED_HOST_SUFFIXES = [
  'saavncdn.com',
  'jiosaavn.com',
  'jioqsaavn.com',
  'saavn.com',
  'music.163.com',
  'kugou.com',
  'y.qq.com',
]

const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
]

export function isAllowedAudioHost(hostname: string): boolean {
  if (!hostname) return false
  const host = hostname.toLowerCase()

  if (ALLOWED_HOSTS.includes(host)) return true

  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
}

export function extractAllowedUrl(rawUrl: string): URL | null {
  if (!rawUrl) return null

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (!isAllowedAudioHost(parsed.hostname)) return null

  return parsed
}
