import React, { useState, useEffect, useRef } from 'react';
import { Moon, X, Clock } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export default function SleepTimerModal({ visible, onClose }) {
    const [activeTimer, setActiveTimer] = useState(null);
    const [remaining, setRemaining] = useState(0);
    const intervalRef = useRef(null);

    const startTimer = (minutes) => {
        clearInterval(intervalRef.current);
        const ms = minutes * 60 * 1000;
        const endTime = Date.now() + ms;
        setActiveTimer(minutes);

        intervalRef.current = setInterval(() => {
            const left = Math.max(0, endTime - Date.now());
            setRemaining(Math.ceil(left / 1000));
            if (left <= 0) {
                clearInterval(intervalRef.current);
                const audio = usePlayerStore.getState().audio;
                if (audio) { audio.pause(); }
                usePlayerStore.setState({ isPlaying: false });
                setActiveTimer(null);
                setRemaining(0);
            }
        }, 1000);
        onClose();
    };

    const cancelTimer = () => {
        clearInterval(intervalRef.current);
        setActiveTimer(null);
        setRemaining(0);
    };

    useEffect(() => {
        return () => clearInterval(intervalRef.current);
    }, []);

    const formatRemaining = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (!visible) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card, #1a1a1a)', padding: 'var(--space-2xl, 2rem)', borderRadius: 'var(--radius-lg, 16px)', width: '350px', maxWidth: '90vw', border: '1px solid var(--border-medium, rgba(255,255,255,0.1))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl, 1.5rem)' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Moon size={20} /> Sleep Timer
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {activeTimer && (
                    <div style={{ background: 'rgba(255,165,59,0.1)', border: '1px solid rgba(255,165,59,0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                        <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            Timer active: {formatRemaining(remaining)} remaining
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md, 0.8rem)' }}>
                    {[
                        { label: '15 Minutes', time: 15 },
                        { label: '30 Minutes', time: 30 },
                        { label: '45 Minutes', time: 45 },
                        { label: '1 Hour', time: 60 },
                        { label: '2 Hours', time: 120 },
                    ].map(({ label, time }) => (
                        <button
                            key={time}
                            className={`btn-outline-primary ${activeTimer === time ? 'active' : ''}`}
                            onClick={() => startTimer(time)}
                            style={{ padding: '0.7rem', borderRadius: '8px', textAlign: 'center' }}
                        >
                            {label}
                        </button>
                    ))}

                    {activeTimer && (
                        <button className="btn-primary" onClick={cancelTimer} style={{ marginTop: '0.5rem', padding: '0.7rem' }}>
                            Turn Off Timer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
