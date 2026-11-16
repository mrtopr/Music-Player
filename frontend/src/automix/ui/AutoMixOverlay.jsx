import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from '../../components/common/LordIcon';
import BlendWaveform from './BlendWaveform.jsx';
import { usePlayerStore } from '../../store/usePlayerStore.js';
import { getImageUrl } from '../../api/client.js';
import { decodeEntities } from '../../utils/helpers.js';

/**
 * AutoMixOverlay — the full-screen AutoMix takeover.
 *
 * Deliberately minimal: one hero artwork for the track that is coming in, the
 * title, and a single symmetric waveform that doubles as the blend progress.
 * No BPM numbers, no key codes, no transition jargon — the motion tells the
 * story.
 *
 * Every state is driven by the engine:
 *   'scheduled' → the blend is armed
 *   'mixing'    → both decks are live
 *   'done'      → the handover finished
 */
export default function AutoMixOverlay({ visible = true }) {
    const automix = usePlayerStore((state) => state.automix);
    const currentSong = usePlayerStore((state) => state.currentSong);
    const mixAnalysis = usePlayerStore((state) => state.mixAnalysis);

    const phase = automix?.phase || 'idle';
    // The takeover appears a few seconds before the blend ('approaching') and
    // stays through the blend itself.
    const active = visible && (
        phase === 'approaching'
        || phase === 'scheduled'
        || phase === 'mixing'
        || phase === 'done'
    );
    const isBlending = phase === 'mixing' || phase === 'scheduled';
    const progress = Math.max(0, Math.min(1, automix?.progress ?? 0));

    const outgoingAnalysis = mixAnalysis?.[currentSong?.id] || null;
    const incomingAnalysis = (automix?.incoming?.id ? mixAnalysis?.[automix.incoming.id] : null) || null;

    const incoming = automix?.incoming || null;
    const outgoing = automix?.outgoing || null;

    const heroImage = incoming?.image || outgoing?.image || currentSong?.image;
    const heroTitle = incoming?.title || outgoing?.title || currentSong?.title || currentSong?.name || '';
    const heroArtist = incoming?.artist || outgoing?.artist || currentSong?.primaryArtists || '';

    const [viewport, setViewport] = useState(
        typeof window !== 'undefined'
            ? { width: window.innerWidth, height: window.innerHeight }
            : { width: 390, height: 844 },
    );
    useEffect(() => {
        const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
        };
    }, []);

    // The artwork is the hero: it scales with the *smaller* dimension so it
    // never pushes the text off a short screen.
    const artSize = Math.round(
        Math.max(132, Math.min(268, viewport.width * 0.62, viewport.height * 0.34)),
    );
    const waveHeight = Math.round(Math.max(44, Math.min(72, viewport.height * 0.075)));

    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    key="automix-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 150,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'clamp(0.9rem, 2.4vh, 1.6rem)',
                        padding: 'clamp(1rem, 3vh, 2rem) 1.25rem',
                        pointerEvents: 'none',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                    }}
                >
                    {/* ── Backdrop ── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                                'radial-gradient(115% 85% at 50% 34%, rgba(124,58,237,0.24) 0%, rgba(7,7,12,0.96) 56%, rgba(3,3,6,0.99) 100%)',
                            backdropFilter: 'blur(28px) saturate(115%)',
                        }}
                    />

                    {/* ── Wordmark ── */}
                    <motion.div
                        initial={{ y: -8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.04, duration: 0.4 }}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            letterSpacing: '0.28em',
                            textTransform: 'uppercase',
                        }}
                    >
                        <Sparkles size={12} />
                        Mix
                    </motion.div>

                    {/* ── Hero artwork ── */}
                    <div
                        style={{
                            position: 'relative',
                            display: 'grid',
                            placeItems: 'center',
                            width: artSize,
                            height: artSize,
                        }}
                    >
                        {/* The outgoing artwork drifts away and fades out. */}
                        {outgoing?.image && (
                            <motion.div
                                animate={{
                                    x: phase === 'mixing' ? -artSize * 0.5 : 0,
                                    opacity: phase === 'mixing' ? 0 : 0.3,
                                    scale: phase === 'mixing' ? 0.78 : 0.86,
                                }}
                                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                    position: 'absolute',
                                    width: artSize * 0.78,
                                    height: artSize * 0.78,
                                    borderRadius: Math.round(artSize * 0.09),
                                    overflow: 'hidden',
                                    filter: 'blur(1px)',
                                    boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
                                }}
                            >
                                <img
                                    src={getImageUrl(outgoing.image)}
                                    alt=""
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </motion.div>
                        )}

                        {/* Soft glow behind the hero artwork */}
                        <motion.div
                            animate={{
                                opacity: phase === 'mixing' ? 0.55 : 0.28,
                                scale: phase === 'mixing' ? 1.05 : 0.96,
                            }}
                            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                position: 'absolute',
                                inset: '-14%',
                                borderRadius: '50%',
                                background:
                                    'radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(16,185,129,0.22) 45%, transparent 70%)',
                                filter: 'blur(26px)',
                            }}
                        />

                        {/* The artwork itself */}
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0.65 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            style={{
                                position: 'relative',
                                width: artSize,
                                height: artSize,
                                borderRadius: Math.round(artSize * 0.075),
                                overflow: 'hidden',
                                boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
                                border: '1px solid rgba(255,255,255,0.09)',
                            }}
                        >
                            {heroImage && (
                                <img
                                    src={getImageUrl(heroImage)}
                                    alt=""
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                            )}
                        </motion.div>
                    </div>

                    {/* ── Track information ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.05 }}
                        style={{
                            position: 'relative',
                            width: 'min(420px, 88vw)',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.28rem',
                        }}
                    >
                        <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            letterSpacing: '0.24em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.32)',
                        }}>
                            {phase === 'done' ? 'Now playing' : 'Up next'}
                        </span>
                        <h2 style={{
                            margin: 0,
                            fontSize: 'clamp(1.1rem, 3.2vw, 1.5rem)',
                            fontWeight: 800,
                            letterSpacing: '-0.015em',
                            color: '#FAFAFA',
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {decodeEntities(heroTitle)}
                        </h2>
                        {heroArtist && (
                            <p style={{
                                margin: 0,
                                fontSize: 'clamp(0.78rem, 2.1vw, 0.9rem)',
                                color: 'rgba(255,255,255,0.46)',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {decodeEntities(heroArtist)}
                            </p>
                        )}
                    </motion.div>

                    {/* ── Waveform (also the blend progress) ── */}
                    <div style={{ position: 'relative', width: 'min(420px, 88vw)' }}>
                        <BlendWaveform
                            outgoing={outgoingAnalysis}
                            incoming={incomingAnalysis}
                            progress={phase === 'mixing' ? progress : 0}
                            height={waveHeight}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
