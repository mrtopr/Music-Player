const cases = [
  { label: 'providers', url: 'http://localhost:3001/api/lyrics/providers' },
  { label: 'ui-query/auto', title: 'Tum Hi Ho', artist: 'Mithoon, Arijit Singh', album: 'Aashiqui 2', duration: 262 },
  { label: 'ui-query/qq', title: 'Tum Hi Ho', artist: 'Mithoon, Arijit Singh', album: 'Aashiqui 2', duration: 262, provider: 'qq' },
  { label: 'ui-query/netease', title: 'Tum Hi Ho', artist: 'Mithoon, Arijit Singh', album: 'Aashiqui 2', duration: 262, provider: 'netease' },
  { label: 'ui-query/lrclib', title: 'Tum Hi Ho', artist: 'Mithoon, Arijit Singh', album: 'Aashiqui 2', duration: 262, provider: 'lrclib' },
  { label: 'kesariya/auto', title: 'Kesariya', artist: 'Arijit Singh', album: 'Brahmastra', duration: 268 },
  { label: 'channa/auto', title: 'Channa Mereya', artist: 'Arijit Singh', duration: 289 },
  { label: 'obscure/auto', title: 'Zindagi Ka Safar Remix 2019', artist: 'DJ Chetas' },
]

for (const c of cases) {
  const label = c.label
  let target = c.url
  if (!target) {
    const qs = new URLSearchParams()
    for (const key of ['title', 'artist', 'album', 'duration', 'provider']) {
      if (c[key] !== undefined) qs.set(key, String(c[key]))
    }
    target = 'http://localhost:3001/api/lyrics?' + qs.toString()
  }

  const t0 = Date.now()
  try {
    const res = await fetch(target)
    const json = await res.json()
    if (label === 'providers') {
      console.log('providers:', json.data.map((p) => p.id + (p.supportsSynced ? '(synced)' : '')).join(', '))
      continue
    }
    const d = json.data
    const text = d.syncedLyrics || d.plainLyrics || ''
    const lines = text.split('\n').filter((line) => line.trim())
    const cjk = /[\u4e00-\u9fff]/.test(text)
    console.log(
      label.padEnd(17),
      '| found:', String(d.found).padEnd(5),
      '| src:', String(d.provider).padEnd(9),
      '| synced:', String(d.isSynced).padEnd(5),
      '| lines:', String(lines.length).padStart(3),
      '| cjk:', cjk ? 'YES' : 'no ',
      '|', String(Date.now() - t0).padStart(5) + 'ms',
    )
    if (d.found) {
      console.log('     match:', d.matchedTitle, '—', d.matchedArtist)
      console.log('     head :', lines.slice(0, 3).map((l) => l.slice(0, 50)).join(' | '))
    }
  } catch (err) {
    console.log(label, 'ERR', err.message)
  }
}
