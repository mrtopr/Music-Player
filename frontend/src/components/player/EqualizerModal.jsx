import React, { useState } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';

const PRESETS = {
    flat: { bass: 0, mid: 0, treble: 0 },
    bass: { bass: 8, mid: 2, treble: -2 },
    vocal: { bass: -2, mid: 6, treble: 2 },
    treble: { bass: -2, mid: 0, treble: 8 },
    rock: { bass: 5, mid: -1, treble: 4 },
    pop: { bass: 2, mid: 4, treble: 3 },
};

export default function EqualizerModal({ visible, onClose }) {
    const [bass, setBass] = useState(0);
    const [mid, setMid] = useState(0);
    const [treble, setTreble] = useState(0);
    const [activePreset, setActivePreset] = useState('flat');

    const applyPreset = (name) => {
        const p = PRESETS[name];
        setBass(p.bass);
        setMid(p.mid);
        setTreble(p.treble);
        setActivePreset(name);
    };

    const reset = () => applyPreset('flat');

    if (!visible) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card, #1a1a1a)', padding: 'var(--space-2xl, 2rem)', borderRadius: 'var(--radius-lg, 16px)', width: '420px', maxWidth: '90vw', border: '1px solid var(--border-medium, rgba(255,255,255,0.1))' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl, 1.5rem)' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <SlidersHorizontal size={20} /> Equalizer
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Presets */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 'var(--space-xl, 1.5rem)', flexWrap: 'wrap' }}>
                    {Object.keys(PRESETS).map(name => (
                        <button
                            key={name}
                            className={`btn btn-outline-primary ${activePreset === name ? 'active' : ''}`}
                            onClick={() => applyPreset(name)}
                            style={{ textTransform: 'capitalize', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                {/* Sliders */}
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'space-around', alignItems: 'center', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Bass', value: bass, setter: setBass },
                        { label: 'Mid', value: mid, setter: setMid },
                        { label: 'Treble', value: treble, setter: setTreble },
                    ].map(({ label, value, setter }) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{value > 0 ? `+${value}` : value} dB</span>
                            <input
                                type="range"
                                min="-12"
                                max="12"
                                value={value}
                                onChange={(e) => { setter(Number(e.target.value)); setActivePreset(''); }}
                                style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '150px', cursor: 'pointer' }}
                            />
                            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</label>
                        </div>
                    ))}
                </div>

                {/* Reset */}
                <div style={{ textAlign: 'center' }}>
                    <button className="btn-outline-primary" onClick={reset} style={{ padding: '0.5rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <RotateCcw size={14} /> Reset Flat
                    </button>
                </div>
            </div>
        </div>
    );
}
