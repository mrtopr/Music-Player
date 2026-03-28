import React from 'react';
import { Moon, X, Clock } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export default function SleepTimerModal({ visible, onClose }) {
    const { sleepTimer, startSleepTimer, stopSleepTimer } = usePlayerStore();
    const { active: activeTimer, remaining } = sleepTimer;

    const startTimer = (minutes) => {
        startSleepTimer(minutes);
        onClose();
    };

    const cancelTimer = () => {
        stopSleepTimer();
    };

    const formatRemaining = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (!visible) return null;

    return (
        <div className="modal-overlay" style={{ 
            display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'rgba(5, 5, 10, 0.4)', backdropFilter: 'blur(20px)', zIndex: 9999, 
            justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.3s ease' 
        }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
                background: 'rgba(25, 25, 35, 0.35)', backdropFilter: 'blur(40px) saturate(200%)',
                padding: '2.5rem', borderRadius: '32px', width: '380px', maxWidth: '92vw', 
                border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                animation: 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem', color: '#fff' }}>
                        <Moon size={24} color="#fff" /> Sleep Timer
                    </h3>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                {activeTimer && (
                    <div style={{ background: 'rgba(255,165,59,0.1)', border: '1px solid rgba(255,165,59,0.2)', borderRadius: '15px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center', color: '#FFA53B' }}>
                        <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {formatRemaining(remaining)} remaining
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {[
                        { label: '15 Minutes', time: 15 },
                        { label: '30 Minutes', time: 30 },
                        { label: '45 Minutes', time: 45 },
                        { label: '1 Hour', time: 60 },
                        { label: '2 Hours', time: 120 },
                    ].map(({ label, time }) => (
                        <button
                            key={time}
                            onClick={() => startTimer(time)}
                            style={{ 
                                padding: '1rem', borderRadius: '15px', textAlign: 'center',
                                background: remaining / 60 === time ? '#fff' : 'rgba(255,255,255,0.05)',
                                color: remaining / 60 === time ? '#12141C' : '#fff',
                                border: 'none', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                fontSize: '1rem'
                            }}
                        >
                            {label}
                        </button>
                    ))}

                    {activeTimer && (
                        <button onClick={cancelTimer} style={{ 
                            marginTop: '0.5rem', padding: '1rem', borderRadius: '15px',
                            background: '#EF4444', color: '#fff', border: 'none',
                            fontWeight: 700, cursor: 'pointer', fontSize: '1rem'
                        }}>
                            Turn Off Timer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
