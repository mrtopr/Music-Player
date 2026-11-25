import React, { useState, useRef, useEffect } from 'react';
import { UNIVERSE_LIST } from '../../config/universes';
import { useUniverseStore } from '../../store/useUniverseStore';

export default function UniverseSwitcher({ compact = false }) {
    const [open, setOpen] = useState(false);
    const activeUniverseId = useUniverseStore(s => s.activeUniverseId);
    const activeUniverse = useUniverseStore(s => s.activeUniverse);
    const setUniverse = useUniverseStore(s => s.setUniverse);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const handleSelect = (id) => {
        setUniverse(id);
        setOpen(false);
    };

    return (
        <div
            ref={containerRef}
            className="universe-switcher"
            style={{ position: 'relative', flexShrink: 0, zIndex: 1100 }}
        >
            <button
                type="button"
                data-testid="universe-switcher-btn"
                aria-label={`Switch music universe (current: ${activeUniverse.label})`}
                aria-expanded={open}
                onClick={() => setOpen(prev => !prev)}
                className="universe-switcher-pill"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: compact ? '6px' : '8px',
                    height: compact ? '34px' : '42px',
                    padding: compact ? '0 10px' : '0 14px',
                    borderRadius: '12px',
                    background: open
                        ? 'var(--accent-primary-soft)'
                        : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: open
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--border-accent)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: compact ? '0.78rem' : '0.85rem',
                    fontWeight: 700,
                    boxShadow: open
                        ? '0 4px 14px rgba(0, 0, 0, 0.35)'
                        : '0 2px 8px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    whiteSpace: 'nowrap'
                }}
            >
                <span style={{ fontSize: compact ? '0.95rem' : '1.05rem', lineHeight: 1 }} aria-hidden="true">
                    {activeUniverse.emoji}
                </span>
                <span className="universe-pill-label">
                    {compact ? activeUniverse.shortLabel : activeUniverse.label}
                </span>
                <span className="universe-pill-short-label">
                    {activeUniverse.shortLabel}
                </span>
                <span
                    className="universe-live-dot"
                    style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: activeUniverse.theme.accentPrimary,
                        boxShadow: `0 0 8px ${activeUniverse.theme.accentPrimary}`,
                        flexShrink: 0
                    }}
                />
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.65)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        flexShrink: 0
                    }}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {open && (
                <div
                    role="menu"
                    data-testid="universe-dropdown"
                    className="universe-dropdown-panel"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 10px)',
                        right: 0,
                        width: '272px',
                        background: 'var(--bg-card)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid var(--border-accent)',
                        borderRadius: '18px',
                        padding: '10px',
                        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        zIndex: 2000,
                        animation: 'universeDropIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    <div style={{
                        padding: '4px 8px 6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'rgba(255, 255, 255, 0.5)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Select Vibe Universe</span>
                        <span style={{ color: activeUniverse.theme.accentSecondary }}>Live</span>
                    </div>

                    {UNIVERSE_LIST.map((u) => {
                        const isActive = u.id === activeUniverseId;
                        return (
                            <button
                                key={u.id}
                                type="button"
                                role="menuitem"
                                data-testid={`universe-option-${u.id}`}
                                onClick={() => handleSelect(u.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    border: isActive
                                        ? `1px solid ${u.theme.accentPrimary}`
                                        : '1px solid transparent',
                                    background: isActive
                                        ? u.theme.accentSoft
                                        : 'rgba(255, 255, 255, 0.02)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    boxShadow: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                        e.currentTarget.style.borderColor = 'transparent';
                                    }
                                }}
                            >
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: `linear-gradient(135deg, ${u.theme.accentPrimary}33, ${u.theme.accentSecondary}22)`,
                                    border: `1px solid ${u.theme.accentPrimary}55`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.15rem',
                                    flexShrink: 0
                                }}>
                                    {u.emoji}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '0.88rem',
                                        fontWeight: isActive ? 800 : 600,
                                        color: isActive ? '#fff' : 'rgba(255,255,255,0.9)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {u.label}
                                    </div>
                                    <div style={{
                                        fontSize: '0.72rem',
                                        color: isActive ? u.theme.accentSecondary : 'rgba(255,255,255,0.5)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {u.tagline}
                                    </div>
                                </div>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: u.theme.accentPrimary,
                                    opacity: isActive ? 1 : 0.45,
                                    flexShrink: 0
                                }} />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
