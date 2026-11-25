import React from 'react';

export default function CraftedBySignature({ compact = false }) {
    return (
        <div
            className="crafted-by-signature"
            style={{
                borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                padding: compact ? '14px 12px 10px' : '18px 16px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                userSelect: 'none',
                gap: '4px'
            }}
        >
            <span
                style={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    letterSpacing: '0.36em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    paddingLeft: '0.36em'
                }}
            >
                Crafted By
            </span>

            <span
                style={{
                    fontFamily: "'Great Vibes', 'Merienda', cursive",
                    fontSize: compact ? '1.65rem' : '1.9rem',
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: 'var(--mehfil-text-primary, #F4F4F5)',
                    textShadow: '0 0 18px rgba(var(--accent-primary-rgb), 0.28)',
                    letterSpacing: '0.02em',
                    marginTop: '2px'
                }}
            >
                Sachin
            </span>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '110px',
                    marginTop: '4px'
                }}
            >
                <span
                    style={{
                        flex: 1,
                        height: '1px',
                        background: 'linear-gradient(to right, transparent, var(--border-medium, rgba(255, 255, 255, 0.18)))'
                    }}
                />
                <span
                    style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        boxShadow: '0 0 10px var(--accent-primary), 0 0 18px var(--shadow-accent)',
                        flexShrink: 0
                    }}
                />
                <span
                    style={{
                        flex: 1,
                        height: '1px',
                        background: 'linear-gradient(to left, transparent, var(--border-medium, rgba(255, 255, 255, 0.18)))'
                    }}
                />
            </div>
        </div>
    );
}
