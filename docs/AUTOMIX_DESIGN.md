# AutoMix Engine — Technical Design

An independently developed AutoMix engine for Mehfil, inspired by Spotify Premium's
AutoMix (iOS). Built *on top of* the existing player — no existing integration is replaced.

---

## 1. Audit summary (existing code)

| Area | Finding | Consequence for AutoMix |
|---|---|---|
| `frontend/src/utils/audioEngine.js` | Two Web Audio chains (`gain → shared EQ → out`) fed by `createMediaElementSource` of two `<audio>` elements (deck A/B) | Decks already exist, but the EQ is shared → per-deck EQ needed for bass-swap/EQ-fade transitions |
| `frontend/src/store/usePlayerStore.js` | All playback orchestration lives in the store; `playSong` picks the next channel and crossfades | Mixing logic must move *out* of the store into an engine that emits events |
| `frontend/src/components/player/YouTubeHiddenPlayer.jsx` | YouTube playback uses the **YT IFrame API** inside a cross-origin iframe | YouTube audio is **not routable to Web Audio** and its bytes are **not retrievable** → YouTube tracks are not analysable or mixable. Falls back to a plain handover. |
| `frontend/src/components/player/FullscreenPlayer.jsx` | "Waveform" scrubber is a **static fake array** (`WAVEFORM_HEIGHTS`) | Must be replaced with an audio-reactive / analysis-driven waveform |
| `frontend/src/utils/audioAnalysis.js` | FFT onset-envelope, autocorrelation tempo, chroma + Krumhansl key, waveform peaks — runs on the **main thread** (~8 s/track) | Must move to a Worker (hard requirement: no expensive analysis on the UI thread) |
| `backend-fresh/src/modules/audio` | `GET /api/audio/proxy` streams allow-listed CDN audio with Range support | Provides same-origin bytes for analysis + WSOLA rendering |
| deps | `motion` (Framer Motion) already installed; `zustand` for state | No new runtime dependencies needed |

## 2. Reference repository findings (what was actually implemented)

- **`bhdrdemir/Spotify-AutoMix`** — real Camelot tables + a rule-cascade key scorer
  (`8A→8A`=100, `8A→9A`/`8A→7A`=90, `8A→8B`=85 relative), and a BPM scorer that tries
  ×1/×½/×2 with a 2 %–6 % ramp, capped at 85 for half/double.
  **It contains no audio code at all** — `mixer.py` is a CLI; it only *orders* a Spotify
  playlist and delegates playback to Spotify. Its "mix" is metadata ordering.
  → We adopt the scoring cascade, and go further: real audio.
- **`aryancodesit/AUTOMIX`** / **`solo6760/Seamless-DJ`** — reference for librosa/TarsosDSP
  analysis (beat tracking, chroma, RMS energy, onset) and for dual-deck + EQ/filter/echo
  transitions. Their time-stretching is offline (librosa/phase-vocoder), which suits a
  server-side player, not a streaming browser player.
- **`snjvkthrvn/automix-playlistgenerator`** — UI/UX patterns for presenting a mix.
- **`techiesanjeet/automix-tweak`** — patches Spotify's client; platform-specific, not reusable.

**Conclusion:** the references supply *scoring models* and *interaction ideas*. The audio
engine itself (beatmatching, real time-stretching, phrase-aware scheduling) is written here.

## 3. Architecture

### The takeover UI (redesigned for clarity)

The first version of the takeover was technically informative but visually noisy —
two competing artwork cards, BPM/key chips, the transition style name, the reason
("Clashing keys — short slam…"), the tempo ratio, and two rows of waveform bars.
It was redesigned around one idea: **show what is happening, not how it is computed.**

| Removed | Kept / Added |
|---|---|
| BPM and Camelot-key chips | one hero artwork (the track coming in) |
| "AUTO MIX" pill **and** "AUTO" label (duplicated) | a single small "Mix" wordmark |
| "Clashing keys — short slam to hide the dissonance" | a progress ring around the artwork |
| "Tempo 137 → 122 BPM · pitch preserved" | "Up next" + title + artist |
| "Mixing / Both tracks are live" | one quiet waveform strip with a moving seam |
| two rows of chunky waveform bars | the outgoing artwork drifting away and fading |

The technical data is still computed by the engine and still drives the *result* —
it is simply no longer printed on screen.


```
Playlist page --> [ Mix ]  -->  plays track 1 of the playlist
                                  AutoMix on, full-screen player opens
                                  |
                                  +- shuffle OFF -> next = the next track in order
                                  +- shuffle ON  -> next = the track that mixes best
                                                       (BPM + key + energy scored;
                                                        already-played tracks excluded)
```

There is no separate Mix screen: the playlist toolbar carries a single **Mix**
button, exactly like Spotify. The per-transition editor was removed from the UI
(the engine still honours a saved transition spec, so an override still wins
over the automatic plan - there is simply no tab to edit it).

### Engine layout
```
frontend/src/automix/
├── engine/
│   ├── AutoMixEngine.js     orchestrator: decks, scheduling, state machine, events
│   ├── Deck.js              one deck: element→source→gain→EQ→filter→master
│   ├── stateMachine.js      explicit FSM (idle→preparing→analyzing→syncing→ready→…)
│   └── events.js            minimal typed event emitter
├── analysis/
│   ├── analysis.worker.js   FFT/chroma/onset off the main thread
│   └── phrases.js           intro/outro/drop/breakdown + bar-phrase boundaries
├── scoring/
│   ├── camelot.js           wheel + compatibility score
│   └── compatibility.js     BPM / key / energy / phrase scoring → transition score
├── stretch/
│   ├── wsola.js             WSOLA pitch-preserving time stretcher
│   └── wsola.worker.js      renders off the main thread
├── providers/
│   ├── index.js             MusicProvider adapter registry
│   ├── jiosaavn.js          direct CDN audio → processable
│   └── youtube.js           iframe playback → NOT processable (honest fallback)
|-- ui/
    |-- AutoMixOverlay.jsx    full-screen preparing -> mixing -> completed experience
    |-- AutoMixVisualizer.jsx audio-reactive canvas (real AnalyserNode data)
    -- MixWaveform.jsx      the measured waveforms around the blend
```

### Provider adapter interface

```ts
interface MusicProvider {
  id: string
  isProcessable(track): boolean        // can we get routable bytes?
  getArtwork(track): string
  getPlaybackSource(track): Promise<{ url, quality }>
  getTrackMetadata(track): { id, title, artist, album, duration }
}
```

## 4. Transition state machine

```
        ┌──────────────┐
        │     idle     │
        └──────┬───────┘
               │ next track resolved
        ┌──────▼───────┐   deck:loading   (fetching audio bytes)
        │  preparing   │
        └──────┬───────┘
               │ bytes ready
        ┌──────▼───────┐   deck:analyzing (FFT / tempo / key in a Worker)
        │  analyzing   │
        └──────┬───────┘
               │ analysis ready
        ┌──────▼───────┐   deck:syncing   (WSOLA tempo match + beat alignment)
        │   syncing    │
        └──────┬───────┘
               │ deck B armed
        ┌──────▼───────┐   transition:starting (deck B starts, gains automate)
        │ transitioning │
        └──────┬───────┘
               │ both decks audible
        ┌──────▼───────┐   transition:mixing   (progress 0→1)
        │    mixing    │
        └──────┬───────┘
               │ blend complete
        ┌──────▼───────┐   transition:complete (deck A released)
        │  completed   │
        └──────┬───────┘
               └────────► preparing (next cycle)

any stage ──error──► failed ──► ready (fallback to plain handover)
```

Every UI state maps to an engine event — no timers drive the visuals.

## 5. Time stretching — why WSOLA, and the hybrid design

Web Audio has **no** native time-stretch. `playbackRate` changes pitch *and* tempo
(illegal for DJ use), `detune` changes pitch only. A **phase vocoder / WSOLA** is required
for pitch-preserving tempo change.

Browser constraints: `decodeAudioData` gives us an `AudioBuffer`; we can render any
derivation of it. We cannot time-stretch a *streaming* `<audio>` element.

**Hybrid design (chosen):**
1. Deck B fetches the incoming track's audio through the backend proxy.
2. It is decoded into an `AudioBuffer`.
3. WSOLA renders the first `T` seconds at the **target tempo** (ratio `r = bpmA / bpmB`),
   pitch preserved.
4. The rendered buffer is played through deck B's `AudioBufferSourceNode`, scheduled so the
   incoming track's **first downbeat lands exactly on the outgoing track's transition
   downbeat** → true beatmatching.
5. When the rendered window ends, deck B's `<audio>` element takes over at the matching
   input position with `playbackRate = r` for the remainder.

*Honest limitation:* the remainder of the track uses `playbackRate` (pitch shifts by
`1200·log2(r)` cents — e.g. r=1.03 → 51 cents, ≈ half a semitone). Only the transition
window itself is professionally stretched. For |ΔBPM| < 1.5 % no stretching is needed at
all and the plain streaming path is used.

## 6. Data flow

```
track list ──▶ PlaylistOptimizer (scoring) ──▶ order
                        │
                        ▼
              AutoMixEngine.prepare(deckB, track)
                 ├─ provider.getPlaybackSource()   → bytes
                 ├─ analysis worker                → bpm, key, camelot, energy, beats, sections
                 ├─ phrases.js                     → intro/outro/drop, bar boundaries
                 ├─ scoring/compatibility          → transition style + duration + alignment
                 ├─ wsola worker                   → pitch-preserving rendered buffer
                 └─ deckB.arm(at, offset)          → scheduled, silent
                        │
   timeupdate ────────┴──▶ engine.tick()  → deck A fade-out + deck B fade-in (gain automation)
                                │
                                └─▶ events ──▶ store ──▶ AutoMixOverlay (React)
```

## 7. Track metadata schema

```ts
interface TrackAnalysis {
  bpm: number
  bpmConfidence: number
  key: string | null            // "D minor"
  camelot: string | null        // "7A"
  keyConfidence: number
  energy: number                // 0..1 RMS
  loudness: number              // dBFS
  danceability: number          // 0..1 (onset density + tempo + energy)
  beats: number[]               // beat times (s)
  downbeats: number[]           // bar starts (s)
  phrases: { start, end, bars }[]
  sections: { type: 'intro'|'outro'|'drop'|'breakdown'|'body', start, end }[]
  waveform: number[]            // peak buckets
  energyCurve: number[]         // per-second RMS
  duration: number
}
```

## 8. Provider limitations (stated honestly)

| Provider | Analysable | Routable to Web Audio | Mixable |
|---|---|---|---|
| JioSaavn (direct CDN MP4/AAC) | ✅ via `/api/audio/proxy` | ✅ | ✅ |
| YouTube Music (IFrame API) | ❌ bytes not retrievable | ❌ cross-origin iframe | ❌ → plain handover |

Playback is never broken by this: the engine falls back to the existing crossfade path
for non-processable tracks.

---

## 9. Alignment with Spotify's actual Mix model

Research (Spotify's support/community threads, the johannesgiani.de and
lettmusic.com teardowns of the iOS editor, and the Reddit megathread) gave the
following model. Note that Spotify has **never published** its Mix timing
algorithm, so the "Auto" rules below are inferred from user observation.

| Aspect | Spotify | This engine |
|---|---|---|
| Transition length | **bars** — 2/4/8/12/16, default **8** | same (`BAR_OPTIONS`), default **8** |
| Bar options gated by | BPM similarity (a mismatched pair gets the "short snippet") | same, except we can really time-stretch, so a mismatched pair still gets 4 bars |
| Alignment | **bar / downbeat grid** ("snap to a position where the beats of both tracks overlap"), ±10 ms nudge | same — snapped to a bar line, ±10 ms nudge supported |
| Tempo | key-locked, slowed to match during the blend, then **gradually** back to its own tempo | WSOLA (pitch preserved) + an 8 s ramp back to 1.0× |
| Transposition | never (Camelot is display-only) | never |
| Minimum track length | **30 s** (confirmed by Spotify staff) | 30 s |
| Volume options | none · smooth crossfade · crossfade · centre cut · overlap | same |
| EQ options | none · 3-band fade · centre bass swap · quick bass cut | same |
| Effect options | none · low-pass filter out · high-pass filter in | same (real parametric filters) |
| Presets | Auto · Custom · Fade · Rise · Blend · Wave · Melt · Slam | same |

**Two corrections to an earlier version of this engine** (both found by checking
the case study rather than guessing):

1. The default length is **8 bars**, not 2. The blend was 3.9 s at the very end
   of a 269 s track (1 % of the track); it is now 8–16 s (7 % of the track) and
   it starts on a bar line.
2. The *style* and the *length* are independent. The key decides **how** the
   tracks blend (melt / wave / blend / rise / fade); the tempo decides **how
   long** it lasts. Spotify couples them; separating them lets a clashing-key
   pair still get a proper 4-bar dissolve instead of a hard 2-bar slam.

The takeover also gained an **anticipation** state: the AutoMix screen appears
~6 s before the blend starts (`approaching`), so the handover is signposted
rather than arriving suddenly at the last second.

### Bugs found while wiring this up

- The blend never completed when the outgoing track ended first: the store only
  called `engine.tick()` for the *active* channel, and the outgoing element stops
  firing `timeupdate` when it ends. The engine is now ticked for both decks.
- The player was briefly marked as stopped during the handover (the outgoing
  deck is paused before the new one is committed) — `commitMixHandover` now
  asserts the incoming deck is playing.
- **The incoming track entered at 0:00**, i.e. inside its ambient intro, so the
  blend was heard as "the old track fades out" and the new one then starts. The
  entry point is now the first downbeat whose energy reaches the track's own
  median (measured at 23.5 s for one of the test tracks) — the track drops in
  where the music actually is.
- The incoming deck was not guaranteed to be **buffered** before the blend, so
  it could start late and sound like a dropout. The engine now waits for
  `canplaythrough` (and falls back to a normal handover if it cannot be
  primed in time).
- The engine's master volume was never synced with the player's volume, so the
  blend could be louder than the rest of the session.



## 10. Verification

### Automated tests — 70 tests, `npm test` (vitest)

`src/automix/__tests__/scoring.test.js`
- Camelot reference pairs (8A→8A = 100, 8A→9A/7A = 90, 8A→8B = 85), symmetry,
  distant keys, unknown keys, and the full pitch-class → wheel table.
- BPM scoring: identical = 100, ≤2 % compatible, ≥6 % incompatible, half/double capped at 85.
- `tempoRatio`: no stretch below ±1.5 %, correct ratio above it.
- Energy / danceability / phrase scoring and the weighted total.
- Planner: beat lock for near-identical tempo, short cut for clashing keys, EQ fade for
  compatible keys, tempo ratio reporting.
- Curves: **equal-power law** (out² + in² = 1 across the blend), **correct bass hand-over**
  (outgoing low end leaves before the incoming arrives), real filter-frequency sweeps,
  clamping, all eight styles present, echo send ramp.
- Playlist optimisation keeps compatible tracks adjacent.

`src/automix/__tests__/audio.test.js`
- Tempo detection on a synthetic 128 BPM click track (within 2 BPM), beat + downbeat grid,
  short tracks, empty input, and a real A-major triad detected as **11B**.
- **WSOLA**: output length follows the ratio, **pitch is preserved within 3 %** (a naive
  resample would shift it by the stretch factor), energy preserved, stereo channels share
  one frame plan.
- Structure detection: a real drop is located, bar phrases are grouped, the transition
  point snaps to a bar line.

`src/automix/__tests__/engine.test.js`
- Provider adapters: JioSaavn processable, YouTube not (with the reason), tracks without
  downloadable audio not.
- Preparation emits `loading → analyzing → syncing → ready`.
- **Network interruption** during preparation → `deck:failed`, no half-prepared deck.
- Non-mixable track → `deck:failed` with a readable reason.
- Transition scheduling, **real progress** (read from the audio clock), completion releases
  the outgoing deck and swaps the decks.
- **User skipping during a transition** cancels the scheduled blend.
- **User disabling AutoMix mid-playback** cancels everything and returns to idle.
- The state machine rejects illegal transitions.

### Live verification in the browser

- A full cycle was observed end-to-end on a 30-track playlist:
  `preparing → analyzing → syncing → ready → transitioning → mixing → completed`,
  with the store committing the handover (track advanced, deck swapped) and no console errors.
- The plan was produced from **measured** data: *"Clashing keys — short slam to hide the
  dissonance"* (2 bars / 3.5 s) with a tempo ratio of **1.122** (137.2 → 122.3 BPM) and a
  successful WSOLA render (1.5 s for a 9.5 s window).
- The now-playing takeover was measured for overlapping text boxes: **0 overlaps** (the
  player's own content fades out and blurs behind the takeover).
- The playlist Mix view shows 29 transition rows (one between each pair) with the
  measured BPM/key chips, and the full-screen editor renders its waveform canvas with the
  three coloured curves, the bar dropdown and the ±10 ms nudge.

### Bugs found while wiring the Spotify model (all fixed)

1. **The Krumhansl-Schmuckler profile rotation was inverted** — the tonic landed on the
   wrong pitch class, so *every* key detection was wrong. Now validated against a clean chord.
2. **The Camelot minor table had C♯/F♯ swapped** (11A/6A).
3. **The WSOLA ratio maths was inverted** — a 1.25× stretch produced a *shorter* buffer.
4. **The chroma smeared across pitch classes** (2048-point FFT bins are wider than a semitone
   at A3) — replaced with a 4096-point log-frequency band sum plus harmonic-overtone
   reinforcement.
5. **The tempo octave was unstable** between recordings of the same song — the tempo prior
   was sharpened (90–150 BPM band).
6. **A non-finite transition time** reached `AudioParam.cancelScheduledValues`.
7. **The WSOLA similarity search was ~4 billion operations** for a 45 s window — replaced
   with a decimated search (16× cheaper) and the window is now sized to the blend
   (9.5 s instead of 45 s → 1.5 s render).
8. **The audio was downloaded and decoded twice** (once for the analysis, once for the
   stretch) — the decoded buffer is now reused.
9. **A stale preparation** could arm a deck with a track that was already playing (the
   analysis finished after the transition) — the engine now discards it.
10. **The overlay was rendered inside the player content**, so the two overlapped — it is
    now a full-screen takeover at the player level, with the content fading out behind it.
11. **`decodeEntities` was missing** in the overlay, which crashed the whole player tree.

### The "endless flickering" bug (reported from the running app)

Symptoms: the AutoMix screen appeared, a track ended, another track started, and the
app kept switching between two screens forever. The console showed
`illegal transition preparing -> completed` and
`deck B play blocked: The play() request was interrupted by a new load request`.

Three defects combined:

1. **The engine never cleared the finished transition.** `this.active` stayed set after
   `tick()` completed a blend, so the engine believed a blend was still running and
   blocked every later preparation → the loop.
2. **The store and the engine disagreed about the active deck.** The engine swapped its
   decks internally on completion, but the store's `activeChannel` was never updated, so
   `handleTimeUpdate` / `handleEnded` kept watching the *released* element: the progress
   bar froze at 0:03, the `ended` event of the real track was ignored, and a new
   preparation re-sourced the deck that was about to play (the "play blocked" warning).
   Fixed with `engine.setActiveDeck()` / `commitMixHandover` keeping the two in sync.
3. **A new preparation could start while a blend was running**, re-sourcing a busy deck.
   The engine now refuses to prepare while `this.active` is set.

Plus a UI fix: the takeover now appears **only during the actual blend**
(`scheduled` → `mixing` → `done`). The preparation happens in the background with the
normal player visible, exactly like Spotify — previously the takeover was shown for the
whole 30-second preparation window, which read as a stuck screen.

Regression tests added for all three (deck sync, no preparation during a blend, stale
preparation dropped).


## 10a. The mobile "taps behave like full screen" bug

**Symptom (reported from a phone):** the song plays, the screen shows the *mini* player,
but tapping the screen behaves as if the full-screen player were open. The user saw the
mini player while the invisible full-screen overlay was intercepting every tap.

**Cause.** `FullscreenPlayer` is always mounted (`App.jsx`) so it can animate in and out.
When closed it was only made invisible with `opacity: 0` plus `pointer-events: none` on
the container. But `pointer-events` is an **inherited** property, and the overlay's
children override it with inline `pointer-events: auto` (the artwork wrapper, the
control buttons, the progress bar, …). Those descendants therefore stayed hit-testable
inside a fully transparent, full-viewport `position: fixed; z-index: 2000` element.

Measured proof (`document.elementFromPoint` at the centre of a 568 × 656 viewport):

| State | Top element at the centre | Tap reaches the page? |
|---|---|---|
| Before the fix | `fs-artwork-img` (inside the overlay) | ❌ swallowed |
| After the fix | `H1` / the playlist row's `<img>` | ✅ |

**Fix (two parts).**

1. `visibility: hidden` on the closed container. Unlike `opacity`, it removes the whole
   subtree from hit-testing — a descendant cannot re-enable itself with
   `pointer-events: auto`. `visibility` is part of the transition, so the 0.6 s
   open/close animation still plays: it flips to `visible` immediately when opening and
   only becomes `hidden` once the fade-out has finished.
2. `styles.css` — `.fullscreen-player-v3:not(.active), .fullscreen-player-v3:not(.active) * { pointer-events: none !important; }`.
   The `!important` is required to beat the inline `pointer-events: auto`, and it makes
   the overlay inert **the moment the close starts**, so taps are not swallowed during
   the fade-out.

`QueuePanel` got the same `visibility` treatment (it is also always mounted).

**Verified after the fix**

| State | Container | Tap at the centre | Mini player |
|---|---|---|---|
| closed | `visibility: hidden`, `opacity: 0` | reaches the page | visible |
| open | `visibility: visible`, `opacity → 1` | reaches the overlay | unmounted |
| closing (0 ms) | `visibility: visible`, `opacity 0.07` | **reaches the page** | visible |
| closed (after 1.5 s) | `visibility: hidden` | reaches the page | visible |

A tap on a playlist row now actually plays that row (song changed
"Khwaab Dekhoon" → "Ek Din Title Track"), where before the tap was swallowed by the
invisible overlay. The AutoMix takeover is unaffected — it lives inside the same
container, but the mix always opens the full-screen player, so the container is
`visible` while the takeover runs (measured during a live blend: container
`opacity 1.00`, takeover `opacity 1.00`, `z-index 150`, `position: absolute`).


## 11. Known limitations (honest)

| # | Limitation | Why | Mitigation |
|---|---|---|---|
| 1 | **YouTube tracks are never mixed** | The IFrame API delivers audio from a cross-origin iframe; the bytes cannot be fetched and the stream cannot be routed into a Web Audio graph | The engine detects this and hands over normally — playback never breaks |
| 2 | **Only the transition window is professionally stretched** | A full time-stretched render of a 4-minute track costs ~85 MB of PCM, which is unsafe on iOS Safari | The transition window is WSOLA-rendered (pitch preserved, sample accurate); the remainder of the track continues on the streaming element at `playbackRate` (≈51 cents of pitch shift for a 3 % tempo change) |
| 3 | **Element starts are not sample accurate** | `HTMLMediaElement.play()` has no scheduling API | The engine schedules the *automation* sample-accurately and seeks the element to the incoming downbeat; the residual jitter is the browser's start latency (~10–40 ms) |
| 4 | **Key detection on dense film mixes is approximate** | Percussion and non-harmonic content dominate the spectrum | Harmonic-overtone reinforcement + a mid-range chroma; results are consistent across recordings, which is what the mixer needs |
| 5 | **Analysis is not instant** | Fetch + decode + FFT over 75 s of audio | It runs in a Worker, is cached per track for the session, and is prepared ~30 s before the transition while the current track still plays |
| 6 | **Shared "mixed playlist" collaboration is not implemented** | It needs a server-side playlist revision protocol | The engine exposes `plan`/`score` per transition, so the UI can show compatibility; the transport layer (Listen Together via PieSocket) already exists and could carry the mix plan |
| 7 | **Not tested on a physical iPhone** | No device available in this environment | The implementation avoids APIs unavailable in iOS Safari (`AudioWorklet` is not used, `OfflineAudioContext` is not required, `decodeAudioData` is used for AAC/MP4 which Safari supports), and `prefers-reduced-motion` is respected by the overlay — but this needs a real device pass |


