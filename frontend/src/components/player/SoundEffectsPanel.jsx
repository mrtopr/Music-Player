import React, { useState } from 'react';
import {
    X, ChevronDown, ChevronUp, SlidersHorizontal,
    Waves, Sliders
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

// ── Preset icon map ──────────────────────────────────────────────────────────
const PRESET_META = {
    normal:      { icon: '🎵', label: 'Normal',       color: 'rgba(255,255,255,0.7)' },
    bassBoost:   { icon: '🔊', label: 'Bass Boost',   color: '#f59e0b' },
    deepBass:    { icon: '💥', label: 'Deep Bass',    color: '#ef4444' },
    dj:          { icon: '🔥', label: 'DJ',           color: '#ff6b35' },
    club:        { icon: '🪩', label: 'Club',         color: '#a855f7' },
    headphones:  { icon: '🎧', label: 'Headphones',  color: '#06b6d4' },
    homeTheater: { icon: '🏠', label: 'Home Theater', color: '#10b981' },
    cinema:      { icon: '🎬', label: 'Cinema',       color: '#6366f1' },
    spatial:     { icon: '🌌', label: 'Spatial',      color: '#8b5cf6' },
    vocal:       { icon: '🎤', label: 'Vocal',        color: '#ec4899' },
    clear:       { icon: '✨', label: 'Clear',        color: '#fbbf24' },
};

const ROOM_OPTIONS = [
    { value: 'off',    label: 'Off',    icon: '🔇' },
    { value: 'studio', label: 'Studio', icon: '🎙️' },
    { value: 'club',   label: 'Club',   icon: '🪩' },
    { value: 'cinema', label: 'Cinema', icon: '🎬' },
    { value: 'hall',   label: 'Hall',   icon: '🏛️' },
];

// ── Reusable horizontal slider ───────────────────────────────────────────────
function EnhancementSlider({ label, value, min = 0, max = 100, step = 1, onChange, unit = '', accentColor = 'var(--accent-primary)' }) {
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{label}</span>
                <span style={{
                    fontSize: '0.78rem', fontWeight: 800,
                    color: accentColor,
                    background: `${accentColor}18`,
                    border: `1px solid ${accentColor}33`,
                    padding: '2px 9px', borderRadius: '10px', minWidth: '40px', textAlign: 'center'
                }}>
                    {value}{unit}
                </span>
            </div>
            <div style={{ position: 'relative', height: '18px', display: 'flex', alignItems: 'center' }}>
                {/* Track background */}
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    {/* Fill */}
                    <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${accentColor}aa, ${accentColor})`,
                        borderRadius: '4px',
                        transition: 'width 0.05s linear',
                        boxShadow: `0 0 10px ${accentColor}66`,
                    }} />
                </div>
                {/* Thumb Dot Indicator */}
                <div style={{
                    position: 'absolute',
                    left: `calc(${pct}% - 8px)`,
                    width: '16px', height: '16px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: `0 0 10px ${accentColor}, 0 2px 6px rgba(0,0,0,0.5)`,
                    pointerEvents: 'none',
                    transition: 'left 0.05s linear'
                }} />
                {/* Native range (invisible touch overlay) */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    style={{
                        position: 'absolute', inset: 0,
                        opacity: 0, cursor: 'pointer',
                        width: '100%', height: '100%',
                        margin: 0,
                    }}
                />
            </div>
        </div>
    );
}


// ── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, accentColor = 'var(--accent-primary)' }) {
    return (
        <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => onChange(!value)}
        >
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{label}</span>
            <div style={{
                width: '44px', height: '24px', borderRadius: '12px',
                background: value ? accentColor : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.3s ease',
                boxShadow: value ? `0 0 10px ${accentColor}55` : 'none',
                flexShrink: 0,
            }}>
                <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: value ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }} />
            </div>
        </div>
    );
}

// ── Room Effect pill selector ─────────────────────────────────────────────────
function RoomSelector({ value, onChange }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Room Effect</span>
                {value !== 'off' && (
                    <span style={{
                        fontSize: '0.72rem', fontWeight: 800,
                        color: '#a78bfa',
                        background: 'rgba(167,139,250,0.15)',
                        padding: '2px 9px', borderRadius: '10px',
                        border: '1px solid rgba(167,139,250,0.3)'
                    }}>
                        {ROOM_OPTIONS.find(o => o.value === value)?.icon} {ROOM_OPTIONS.find(o => o.value === value)?.label}
                    </span>
                )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ROOM_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', borderRadius: '14px',
                            fontSize: '0.78rem', fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            background: value === opt.value
                                ? 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(109,40,217,0.25))'
                                : 'rgba(255,255,255,0.05)',
                            color: value === opt.value ? '#ffffff' : 'rgba(255,255,255,0.6)',
                            boxShadow: value === opt.value ? '0 4px 14px rgba(139,92,246,0.35)' : 'none',
                            border: value === opt.value ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                        }}
                        onMouseEnter={e => {
                            if (value !== opt.value) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                                e.currentTarget.style.color = '#ffffff';
                            }
                        }}
                        onMouseLeave={e => {
                            if (value !== opt.value) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                            }
                        }}
                    >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}


// ── DJ Mode quick-launch badge ────────────────────────────────────────────────
function ActivePresetBadge({ preset }) {
    const meta = PRESET_META[preset];
    if (!meta || preset === 'normal') return null;
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}40`,
            color: meta.color,
            padding: '4px 12px', borderRadius: '20px',
            fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.5px',
            animation: 'fadeIn 0.3s ease',
        }}>
            <span>{meta.icon}</span>
            <span>{meta.label} Active</span>
        </div>
    );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function SoundEffectsPanel({ visible, onClose }) {
    const soundEnhancement = usePlayerStore(s => s.soundEnhancement);
    const applySoundPreset = usePlayerStore(s => s.applySoundPreset);
    const setSoundParam = usePlayerStore(s => s.setSoundParam);
    const setEqualizerOpen = usePlayerStore(s => s.setEqualizerOpen);

    const [showAdvanced, setShowAdvanced] = useState(false);

    if (!visible) return null;

    const { preset, bass, subBass, punch, stereoWidth, spatialEnabled, loudness, room } = soundEnhancement;

    const handlePreset = (name) => applySoundPreset(name);
    const handleParam = (key) => (val) => setSoundParam(key, val);

    return (
        <div
            className="sep-overlay"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(20px)',
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1rem',
                animation: 'sep-in 0.25s ease',
            }}
        >
            <div
                className="sep-panel"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(165deg, rgba(22, 25, 40, 0.96) 0%, rgba(12, 14, 24, 0.99) 100%)',
                    backdropFilter: 'blur(40px) saturate(200%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '28px',
                    width: '100%',
                    maxWidth: '520px',
                    margin: 'auto',
                    padding: '1.5rem',
                    boxShadow: '0 30px 90px rgba(0,0,0,0.8), 0 0 50px rgba(var(--accent-primary-rgb), 0.12)',
                    animation: 'sep-slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    boxSizing: 'border-box'
                }}
            >
                {/* Drag Handle indicator for touch */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
                </div>

                <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '14px',
                                background: 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 6px 18px rgba(var(--accent-primary-rgb), 0.45)',
                            }}>
                                <Waves size={20} color="#000" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>Sound Effects</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.8px' }}>MEHFIL AUDIO ENGINE</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ActivePresetBadge preset={preset} />
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.8)',
                                    width: '34px', height: '34px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s ease'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* ── PRESET GRID ────────────────────────────────── */}
                    <div style={{ marginBottom: '1.4rem' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                            Sound Presets
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {Object.keys(PRESET_META).map(name => {
                                const meta = PRESET_META[name];
                                const isActive = preset === name;
                                return (
                                    <button
                                        key={name}
                                        onClick={() => handlePreset(name)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 14px', borderRadius: '16px',
                                            border: isActive ? `1px solid ${meta.color}` : '1px solid rgba(255,255,255,0.08)',
                                            background: isActive ? `linear-gradient(135deg, ${meta.color}33, ${meta.color}15)` : 'rgba(255,255,255,0.05)',
                                            color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                                            fontSize: '0.8rem', fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                            boxShadow: isActive ? `0 4px 16px ${meta.color}40, inset 0 1px 0 rgba(255,255,255,0.2)` : 'none',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                                                e.currentTarget.style.color = '#ffffff';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                                            }
                                        }}
                                    >
                                        <span style={{ fontSize: '0.88rem' }}>{meta.icon}</span>
                                        <span>{meta.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 -0.5rem 1.2rem' }} />

                    {/* ── SIMPLE CONTROLS ───────────────────────────── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                            Quick Controls
                        </p>

                        <EnhancementSlider
                            label="Bass Boost"
                            value={bass}
                            min={-4}
                            max={12}
                            step={0.5}
                            onChange={handleParam('bass')}
                            unit=" dB"
                            accentColor="#f59e0b"
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Toggle
                                label="Spatial Audio (Mehfil Surround)"
                                value={spatialEnabled}
                                onChange={v => setSoundParam('spatialEnabled', v)}
                                accentColor="#8b5cf6"
                            />
                            {spatialEnabled && (
                                <div style={{ paddingLeft: '0.5rem' }}>
                                    <EnhancementSlider
                                        label="Stereo Width"
                                        value={stereoWidth}
                                        min={0}
                                        max={100}
                                        onChange={handleParam('stereoWidth')}
                                        unit="%"
                                        accentColor="#8b5cf6"
                                    />
                                </div>
                            )}
                        </div>

                        <EnhancementSlider
                            label="Loudness"
                            value={loudness}
                            min={0}
                            max={100}
                            onChange={handleParam('loudness')}
                            unit="%"
                            accentColor="#10b981"
                        />

                        {/* Room Effect — always visible */}
                        <RoomSelector value={room} onChange={handleParam('room')} />
                    </div>

                    {/* ── ADVANCED SECTION TOGGLE ───────────────────── */}
                    <button
                        onClick={() => setShowAdvanced(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                            padding: '10px 14px', borderRadius: '14px',
                            fontSize: '0.82rem', fontWeight: 700,
                            marginTop: '1.2rem',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sliders size={16} />
                            Advanced Controls
                        </span>
                        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {/* ── ADVANCED CONTROLS ─────────────────────────── */}
                    {showAdvanced && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: '1rem',
                            marginTop: '1rem',
                            padding: '1.2rem',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '20px',
                            animation: 'sep-in 0.25s ease',
                        }}>
                            <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                Bass Shaping
                            </p>

                            <EnhancementSlider
                                label="Sub Bass (25–80 Hz)"
                                value={subBass}
                                min={0}
                                max={10}
                                step={0.5}
                                onChange={handleParam('subBass')}
                                unit=" dB"
                                accentColor="#ef4444"
                            />

                            <EnhancementSlider
                                label="Bass Punch (70–140 Hz)"
                                value={punch}
                                min={0}
                                max={10}
                                step={0.5}
                                onChange={handleParam('punch')}
                                unit=" dB"
                                accentColor="#f97316"
                            />

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                            <p style={{ margin: '4px 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                Spatial Width
                            </p>

                            {!spatialEnabled && (
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                                    Enable Spatial Audio above to adjust width
                                </p>
                            )}
                            {spatialEnabled && (
                                <EnhancementSlider
                                    label="Stereo Width"
                                    value={stereoWidth}
                                    min={0}
                                    max={100}
                                    onChange={handleParam('stereoWidth')}
                                    unit="%"
                                    accentColor="#8b5cf6"
                                />
                            )}
                        </div>
                    )}

                    {/* ── OPEN EQUALIZER LINK ───────────────────────── */}
                    <button
                        onClick={() => { onClose(); setEqualizerOpen(true); }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '8px', width: '100%',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.85)',
                            padding: '12px 16px', borderRadius: '16px',
                            fontSize: '0.85rem', fontWeight: 700,
                            cursor: 'pointer', marginTop: '1.2rem',
                            transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.2), rgba(139,92,246,0.15))';
                            e.currentTarget.style.borderColor = 'rgba(var(--accent-primary-rgb), 0.4)';
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--accent-primary-rgb), 0.25)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                        }}
                    >
                        <SlidersHorizontal size={18} style={{ color: 'var(--accent-primary)' }} />
                        Open 3-Band Equalizer (EQ)
                    </button>


                    {/* Info footer */}
                    <p style={{
                        textAlign: 'center', margin: '1rem 0 0',
                        fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px'
                    }}>
                        Mehfil Audio Engine · 3D Sound · Not affiliated with Dolby®
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes sep-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes sep-slide-up {
                    from { transform: translateY(60px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .sep-panel::-webkit-scrollbar { display: none; }
                @media (max-width: 640px) {
                    .sep-overlay {
                        align-items: flex-end !important;
                        padding: 0 !important;
                    }
                    .sep-panel {
                        border-radius: 28px 28px 0 0 !important;
                        max-height: 86vh !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                    }
                }
            `}</style>

        </div>
    );
}
