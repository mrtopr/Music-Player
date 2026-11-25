import React from 'react';

/**
 * CraftedBySignature - Style B · Mrs Saint Delafield Victorian Calligraphy
 * Automatically adapts its accent color and glow to the active Mehfil universe theme.
 */
export default function CraftedBySignature({
    isExpanded = true,
    role = 'Crafted by',
    name = 'Sachin',
    accentColor = 'var(--accent-primary)',
    compact = false,
    className = ''
}) {
    return (
        <div
            className={`crafted-by-signature sachin-signature-container ${className}`}
            style={{
                borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                padding: isExpanded ? (compact ? '0.85rem 1rem 0.65rem' : '1rem 1rem 0.85rem') : '0.5rem',
                transition: 'all 0.25s ease'
            }}
        >
            {!isExpanded ? (
                <div
                    title={`${role} ${name}`}
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: 'default'
                    }}
                >
                    <span
                        style={{
                            fontFamily: "'Mrs Saint Delafield', cursive",
                            fontSize: '1.45rem',
                            color: accentColor,
                            lineHeight: 1,
                            transform: 'rotate(-2deg)'
                        }}
                    >
                        {name.charAt(0)}
                    </span>
                    <span
                        style={{
                            position: 'absolute',
                            bottom: '3px',
                            right: '3px',
                            width: '3.5px',
                            height: '3.5px',
                            borderRadius: '50%',
                            background: accentColor,
                            boxShadow: `0 0 4px ${accentColor}`
                        }}
                    />
                </div>
            ) : (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center'
                    }}
                >
                    <span
                        style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.6rem',
                            letterSpacing: '0.32em',
                            color: 'rgba(255, 255, 255, 0.42)',
                            textTransform: 'uppercase',
                            marginBottom: '0.1rem',
                            paddingLeft: '0.32em'
                        }}
                    >
                        {role}
                    </span>

                    <span
                        className="sachin-signature-name"
                        style={{
                            fontFamily: "'Mrs Saint Delafield', cursive",
                            fontSize: compact ? '2.05rem' : '2.2rem',
                            color: '#ffffff',
                            lineHeight: 0.95,
                            transform: 'rotate(-3deg)',
                            display: 'inline-block',
                            letterSpacing: '0.03em',
                            padding: '0.15rem 0 0.25rem',
                            cursor: 'default',
                            transition: 'all 0.25s ease'
                        }}
                    >
                        {name}
                    </span>

                    {/* Tail Flourish Underline with Centered 4px Accent Signal Dot */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '2px',
                            opacity: 0.8
                        }}
                    >
                        <span style={{ width: '22px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
                        <span
                            style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                background: accentColor,
                                boxShadow: `0 0 6px ${accentColor}`
                            }}
                        />
                        <span style={{ width: '22px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
                    </div>
                </div>
            )}
        </div>
    );
}
