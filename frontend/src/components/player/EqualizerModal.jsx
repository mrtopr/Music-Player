import React from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

const PRESETS = {
    flat: { bass: 0, mid: 0, treble: 0 },
    bass: { bass: 8, mid: 2, treble: -2 },
    vocal: { bass: -2, mid: 6, treble: 2 },
    treble: { bass: -2, mid: 0, treble: 8 },
    rock: { bass: 5, mid: -1, treble: 4 },
    pop: { bass: 2, mid: 4, treble: 3 },
};

export default function EqualizerModal({ visible, onClose }) {
    const { equalizer, setEqualizer, setEqualizerAll } = usePlayerStore();
    const { bass, mid, treble } = equalizer;
    
    // Determine active preset by comparing current values
    const activePreset = Object.entries(PRESETS).find(([_, vals]) => 
        vals.bass === bass && vals.mid === mid && vals.treble === treble
    )?.[0] || '';

    const applyPreset = (name) => {
        setEqualizerAll(PRESETS[name]);
    };

    const reset = () => applyPreset('flat');

    if (!visible) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(5, 5, 8, 0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#12141C', padding: '2rem', borderRadius: '24px', width: '400px', maxWidth: '92vw', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem', color: '#fff' }}>
                        <SlidersHorizontal size={24} color="#fff" /> Equalizer
                    </h3>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Presets */}
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {Object.keys(PRESETS).map(name => (
                        <button
                            key={name}
                            onClick={() => applyPreset(name)}
                            style={{ 
                                textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 600,
                                padding: '0.5rem 1.2rem', borderRadius: '12px', cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                background: activePreset === name ? '#fff' : 'rgba(255,255,255,0.05)',
                                color: activePreset === name ? '#12141C' : 'rgba(255,255,255,0.6)',
                                border: 'none'
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                {/* Sliders */}
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', height: '220px' }}>
                    {[
                        { label: 'Bass', value: bass, key: 'bass' },
                        { label: 'Mid', value: mid, key: 'mid' },
                        { label: 'Treble', value: treble, key: 'treble' },
                    ].map(({ label, value, key }) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            <span style={{ fontSize: '0.9rem', color: '#FFD700', fontWeight: 700 }}>{value} dB</span>
                            <div style={{ 
                                position: 'relative', height: '160px', width: '6px', 
                                background: 'rgba(255,255,255,0.1)', borderRadius: '3px',
                                display: 'flex', justifyContent: 'center'
                            }}>
                                <input
                                    type="range"
                                    min="-12"
                                    max="12"
                                    value={value}
                                    onChange={(e) => setEqualizer(key, Number(e.target.value))}
                                    style={{ 
                                        WebkitAppearance: 'slider-vertical',
                                        width: '40px', height: '160px', cursor: 'pointer',
                                        position: 'absolute', opacity: 0, zIndex: 2
                                    }}
                                />
                                <div style={{ 
                                    position: 'absolute', bottom: 0, left: 0, width: '100%', 
                                    height: `${((value + 12) / 24) * 100}%`, 
                                    background: 'linear-gradient(to top, #9D50BB, #6E48AA)',
                                    borderRadius: '3px', transition: 'height 0.1s ease',
                                    boxShadow: '0 0 15px rgba(157, 80, 187, 0.5)'
                                }} />
                                <div style={{ 
                                    position: 'absolute', bottom: `calc(${((value + 12) / 24) * 100}% - 10px)`,
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    background: '#D4B4FE', border: '3px solid #12141C',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)', zIndex: 1,
                                    transition: 'bottom 0.1s ease'
                                }} />
                            </div>
                            <label style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>{label}</label>
                        </div>
                    ))}
                </div>

                {/* Reset */}
                <div style={{ textAlign: 'center' }}>
                    <button onClick={reset} style={{ 
                        padding: '0.8rem 2.5rem', borderRadius: '15px', 
                        background: '#fff', color: '#12141C', border: 'none',
                        fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                        boxShadow: '0 10px 20px rgba(255,255,255,0.1)'
                    }}>
                        <RotateCcw size={18} /> Reset Flat
                    </button>
                </div>
            </div>
        </div>
    );
}
