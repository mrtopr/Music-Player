const url =
  'https://aac.saavncdn.com/430/5c5ea5cc00e3bff45616013226f376fe_160.mp4'
const proxy = 'http://localhost:3001/api/audio/proxy?url=' + encodeURIComponent(url)

async function check(label, init) {
  const res = await fetch(proxy, init)
  const buf = await res.arrayBuffer()
  console.log(
    label.padEnd(22),
    '| status:', res.status,
    '| bytes:', buf.byteLength,
    '| type:', res.headers.get('content-type'),
    '| range:', res.headers.get('content-range'),
    '| accept-ranges:', res.headers.get('accept-ranges'),
  )
  return { res, buf }
}

// 1. Full head request
const head = await check('head (first 512KB)', { headers: { Range: 'bytes=0-524287' } })

// 2. Tail request (last 512KB) — needed to analyse the end of a track
const tail = await check('tail (last 512KB)', { headers: { Range: 'bytes=-524288' } })

// 3. Blocked host
const bad = await fetch(
  'http://localhost:3001/api/audio/proxy?url=' + encodeURIComponent('https://example.com/x.mp3'),
)
console.log('blocked host          | status:', bad.status, '|', (await bad.text()).slice(0, 80))

// 4. Verify the head bytes look like an audio container (ftyp / ID3 / mpeg sync)
const bytes = new Uint8Array(head.buf.slice(0, 16))
console.log('head magic bytes      :', Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(' '))
const tailBytes = new Uint8Array(tail.buf.slice(0, 16))
console.log('tail magic bytes      :', Array.from(tailBytes).map((b) => b.toString(16).padStart(2, '0')).join(' '))
