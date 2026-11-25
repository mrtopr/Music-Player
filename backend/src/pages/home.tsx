import { Hono } from 'hono'

export const Home = new Hono()

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mehfil API — Music Streaming Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Mrs+Saint+Delafield&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #070a08;
      --card: rgba(14, 23, 18, 0.78);
      --border: rgba(16, 185, 129, 0.2);
      --accent: #10b981;
      --accent-2: #34d399;
      --text: #f4f4f5;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background:
        radial-gradient(ellipse 700px 420px at 15% 15%, rgba(16, 185, 129, 0.14), transparent 65%),
        radial-gradient(ellipse 600px 380px at 85% 80%, rgba(52, 211, 153, 0.08), transparent 65%),
        var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.25rem;
    }
    .shell {
      width: 100%;
      max-width: 820px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 2.5rem;
      backdrop-filter: blur(20px);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-2);
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--accent-2);
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid var(--border);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }
    .subtitle {
      color: var(--muted);
      font-size: 0.98rem;
      line-height: 1.6;
      margin-bottom: 1.75rem;
      max-width: 620px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 2rem;
    }
    .card {
      display: block;
      text-decoration: none;
      color: inherit;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 1rem 1.1rem;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }
    .card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }
    .method {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--accent-2);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .path {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.88rem;
      font-weight: 500;
      margin: 4px 0;
      color: #fff;
    }
    .desc {
      font-size: 0.8rem;
      color: var(--muted);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 12px;
      font-size: 0.88rem;
      font-weight: 700;
      text-decoration: none;
      transition: opacity 0.2s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #04120b;
    }
    .btn-ghost {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .btn:hover { opacity: 0.9; }
    .sig {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .sig-role {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.6rem;
      letter-spacing: 0.32em;
      color: rgba(255, 255, 255, 0.42);
      text-transform: uppercase;
      padding-left: 0.32em;
    }
    .sig-name {
      font-family: 'Mrs Saint Delafield', cursive;
      font-size: 2.15rem;
      color: #fff;
      line-height: 0.95;
      transform: rotate(-3deg);
      margin: 2px 0 4px;
    }
    .sig-flourish {
      display: flex;
      align-items: center;
      gap: 6px;
      opacity: 0.8;
    }
    .sig-line { width: 22px; height: 1px; background: rgba(255, 255, 255, 0.18); }
    .sig-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 6px var(--accent); }
  </style>
</head>
<body>
  <main class="shell">
    <div class="top">
      <div class="brand">
        <div class="logo-badge" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div>
          <h1>Mehfil API</h1>
        </div>
      </div>
      <div class="status"><span class="dot"></span> Operational &middot; v1.0.0</div>
    </div>

    <p class="subtitle">
      High-fidelity music streaming, multi-universe discovery, synchronized playback, and authentication backend powering Mehfil.
    </p>

    <div class="grid">
      <a class="card" href="/api/health">
        <div class="method">GET</div>
        <div class="path">/api/health</div>
        <div class="desc">Database connectivity &amp; latency check</div>
      </a>
      <a class="card" href="/api/modules?language=hindi">
        <div class="method">GET</div>
        <div class="path">/api/modules</div>
        <div class="desc">Trending tracks, albums &amp; playlists</div>
      </a>
      <a class="card" href="/api/search/songs?query=arijit&limit=5">
        <div class="method">GET</div>
        <div class="path">/api/search/songs</div>
        <div class="desc">Scoped music &amp; artist search</div>
      </a>
      <a class="card" href="/docs">
        <div class="method">DOCS</div>
        <div class="path">/docs</div>
        <div class="desc">Interactive OpenAPI 3.1 reference</div>
      </a>
    </div>

    <div class="actions">
      <a class="btn btn-primary" href="/docs">Open API Docs</a>
      <a class="btn btn-ghost" href="/api/health">Check DB Health</a>
      <a class="btn btn-ghost" href="https://playmehfil.vercel.app" target="_blank" rel="noreferrer">Launch Mehfil App</a>
    </div>

    <footer class="sig">
      <span class="sig-role">Crafted by</span>
      <span class="sig-name">Sachin</span>
      <div class="sig-flourish">
        <span class="sig-line"></span>
        <span class="sig-dot"></span>
        <span class="sig-line"></span>
      </div>
    </footer>
  </main>
</body>
</html>`

Home.get('/', (c) => {
  const accept = c.req.header('accept') || ''
  if (accept.includes('application/json') && !accept.includes('text/html')) {
    return c.json({
      success: true,
      name: 'Mehfil API',
      message: 'Mehfil Music Backend is running',
      craftedBy: 'Sachin',
      health: '/api/health',
      docs: '/docs',
      version: '1.0.0',
    })
  }
  return c.html(LANDING_HTML)
})
